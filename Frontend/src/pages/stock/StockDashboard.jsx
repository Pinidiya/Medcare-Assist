import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import {
  LayoutDashboard, Package,
  AlertTriangle, Calendar,
  Plus, Search, Loader2, X, AlertCircle, CheckCircle, ChevronLeft, ChevronRight, MessageSquare, Hash, Clock, Trash2,
  TrendingDown, ShieldAlert, Layers, ArrowRight, Settings, BadgeCheck
} from 'lucide-react';
import pharmacyImage from '../../assets/pharmcy image.png';
import SettingsView from '../../components/SettingsView';
import { dashboardApi } from '../../services/stockApi';
import { getMedicineUnit } from '../../utils/medicineUnit';

const API = import.meta.env.VITE_API_BASE_URL;

const sidebarItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/stock/dashboard' },
  { label: 'Inventory', icon: Package, path: '/stock/inventory' },
  { label: 'Expiries', icon: Calendar, path: '/stock/expiries' },
  { label: 'Settings', icon: Settings, path: '/stock/settings' },
];

/* ─── Toast ──────────────────────────────────────────────────────────── */
function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl animate-fadeIn text-white text-sm font-medium ${type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
      {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      {message}
      <button onClick={onClose}><X className="w-4 h-4 ml-2 opacity-70" /></button>
    </div>
  );
}

function StockBadge({ status }) {
  if (status === 'out_of_stock') return <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-semibold">Out of Stock</span>;
  if (status === 'low_stock') return <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold">Low Stock</span>;
  return <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-semibold">In Stock</span>;
}

function QtyDisplay({ qty, item }) {
  const color = qty === 0 ? 'text-red-600 font-bold' : qty < 20 ? 'text-indigo-600 font-bold' : 'text-green-600 font-semibold';
  const unit = getMedicineUnit(item, qty);
  return <span className={`text-sm ${color}`}>{qty} {unit}</span>;
}

/* ═════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═════════════════════════════════════════════════════════════════════════ */
export default function StockDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const isInventoryView = currentPath.startsWith('/stock/inventory');
  const isExpiriesView = currentPath.startsWith('/stock/expiries');
  const isSettingsView = currentPath.startsWith('/stock/settings');
  const isDashboardView = !isInventoryView && !isExpiriesView && !isSettingsView;

  // ── Data state ──────────────────────────────────────────────────────
  const [aggregatedInventory, setAggregatedInventory] = useState([]);
  const [batches, setBatches] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [masterMeds, setMasterMeds] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // ── Inventory table state ───────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  // ── Inventory sub-tab: 'inventory' or 'batches' ────────────────────
  const [activeTab, setActiveTab] = useState('inventory');

  // ── Batches table state ─────────────────────────────────────────────
  const [batchSearch, setBatchSearch] = useState('');

  // ── Add Medicine (Inventory) Modal state ────────────────────────────
  const [showAddMedicineModal, setShowAddMedicineModal] = useState(false);
  const [addingMedicine, setAddingMedicine] = useState(false);

  // ── Add Batch Modal state ───────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [masterSearch, setMasterSearch] = useState('');
  const [selectedMed, setSelectedMed] = useState(null);
  const [addForm, setAddForm] = useState({ price: '', quantity: '', expiry_date: '', supplier_name: '' });
  const [addingItem, setAddingItem] = useState(false);

  // ── Request Medicine Modal state ────────────────────────────────────
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({ medicine_name: '', category: '', description: '', requires_prescription: false });
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const [dashboardMetrics, setDashboardMetrics] = useState({ total_items: 0, total_quantity: 0, low_stock_alerts: 0, expiring_soon: 0, total_value: 0 });

  /* ── Fetch all data ──────────────────────────────────────────────── */
  const fetchAllData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/stock/get_medicine_inventory.php`, { credentials: 'include' }).then(r => r.json()).catch(() => ({})),
      fetch(`${API}/stock/get_low_stock.php`, { credentials: 'include' }).then(r => r.json()).catch(() => ({})),
      fetch(`${API}/stock/get_master_medicines.php`, { credentials: 'include' }).then(r => r.json()).catch(() => ({})),
      fetch(`${API}/stock/get_batches.php`, { credentials: 'include' }).then(r => r.json()).catch(() => ({})),
      fetch(`${API}/stock/get_suppliers.php`, { credentials: 'include' }).then(r => r.json()).catch(() => ({})),
      dashboardApi.get().catch(() => ({ data: { metrics: {}, alerts: [] } }))
    ]).then(([inv, low, master, batch, sup, dash]) => {
      setAggregatedInventory(inv.data || []);
      setLowStock(low.data || []);
      setMasterMeds(master.data || []);
      setBatches(batch.data || []);
      setSuppliers(sup.data || []);
      if (dash.data && dash.data.metrics) {
        setDashboardMetrics(dash.data.metrics);
      }
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  /* ── Aggregated inventory filtering & pagination ─────────────────── */
  const filtered = aggregatedInventory.filter(m =>
    m.brand_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.generic_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.category?.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  /* ── Master medicines filtering (for Add Medicine modal) ─────────── */
  const filteredMaster = masterMeds.filter(m =>
    m.brand_name?.toLowerCase().includes(masterSearch.toLowerCase()) ||
    m.generic_name?.toLowerCase().includes(masterSearch.toLowerCase()) ||
    m.category?.toLowerCase().includes(masterSearch.toLowerCase())
  );

  /* ── Inventory filtering (for Add Batch modal) ───────────────────── */
  const filteredBatchMeds = aggregatedInventory.filter(m =>
    m.brand_name?.toLowerCase().includes(masterSearch.toLowerCase()) ||
    m.generic_name?.toLowerCase().includes(masterSearch.toLowerCase()) ||
    m.category?.toLowerCase().includes(masterSearch.toLowerCase())
  );

  /* ── Filtered batches ────────────────────────────────────────────── */
  const filteredBatches = batches.filter(b =>
    b.brand_name?.toLowerCase().includes(batchSearch.toLowerCase()) ||
    b.batch_number?.toLowerCase().includes(batchSearch.toLowerCase()) ||
    b.generic_name?.toLowerCase().includes(batchSearch.toLowerCase())
  );

  /* ── Add Medicine handler (Inventory only) ───────────────────────── */
  const handleAddMedicine = async (e) => {
    e.preventDefault();
    if (!selectedMed) { showToast('Please select a medicine first', 'error'); return; }
    
    setAddingMedicine(true);
    try {
      const res = await fetch(`${API}/stock/add_medicine.php`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicine_id: selectedMed.medicine_id }),
      });
      const d = await res.json();
      if (d.status === 'success') {
        showToast(d.message || 'Medicine added to inventory successfully!');
        closeAddMedicineModal();
        fetchAllData();
      } else {
        showToast(d.message || 'Failed to add medicine', 'error');
      }
    } catch { showToast('Connection error.', 'error'); }
    setAddingMedicine(false);
  };

  const closeAddMedicineModal = () => {
    setShowAddMedicineModal(false);
    setSelectedMed(null);
    setMasterSearch('');
  };

  /* ── Add Medicine Batch handler ──────────────────────────────────── */
  const handleAddBatch = async (e) => {
    e.preventDefault();
    if (!selectedMed) { showToast('Please select a medicine first', 'error'); return; }
    if (!addForm.price || parseFloat(addForm.price) < 0) { showToast('Please enter a valid price', 'error'); return; }
    if (!addForm.quantity || parseInt(addForm.quantity) <= 0) { showToast('Please enter a valid quantity', 'error'); return; }
    if (!addForm.expiry_date) { showToast('Please select an expiry date', 'error'); return; }

    setAddingItem(true);
    try {
      const res = await fetch(`${API}/stock/add_medicine_batch.php`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicine_id: selectedMed.medicine_id,
          selling_price: parseFloat(addForm.price),
          quantity_in_stock: parseInt(addForm.quantity),
          expiry_date: addForm.expiry_date,
          supplier_name: addForm.supplier_name,
        }),
      });
      const d = await res.json();
      if (d.status === 'success') {
        showToast(d.message || 'Medicine batch added successfully!');
        closeAddModal();
        fetchAllData();
      } else {
        showToast(d.message || 'Failed to add batch', 'error');
      }
    } catch { showToast('Connection error. Please check your server.', 'error'); }
    setAddingItem(false);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setSelectedMed(null);
    setMasterSearch('');
    setAddForm({ price: '', quantity: '', expiry_date: '', supplier_name: '' });
  };

  /* ── Request Medicine handler ────────────────────────────────────── */
  const handleRequestMedicine = async (e) => {
    e.preventDefault();
    setSubmittingRequest(true);
    try {
      const res = await fetch(`${API}/stock/request_medicine.php`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestForm),
      });
      const d = await res.json();
      if (d.status === 'success') {
        showToast('Medicine request submitted! Admin will review it.');
        setShowRequestModal(false);
        setRequestForm({ medicine_name: '', category: '', description: '', requires_prescription: false });
      } else { showToast(d.message || 'Failed to submit request', 'error'); }
    } catch { showToast('Connection error', 'error'); }
    setSubmittingRequest(false);
  };

  /* ── Remove Medicine handler ─────────────────────────────────────── */
  const handleRemoveMedicine = async (medicineId, brandName) => {
    if (!window.confirm(`Are you sure you want to remove ${brandName} from your inventory?\n\nThis will permanently delete ALL batches associated with this medicine!`)) return;

    try {
      const res = await fetch(`${API}/stock/remove_medicine_inventory.php`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicine_id: medicineId }),
      });
      const d = await res.json();
      if (d.status === 'success') {
        showToast(d.message || 'Medicine removed successfully!');
        fetchAllData();
      } else { showToast(d.message || 'Failed to remove medicine', 'error'); }
    } catch { showToast('Connection error', 'error'); }
  };

  /* ── Remove Batch handler ────────────────────────────────────────── */
  const handleRemoveBatch = async (batchId, batchNumber) => {
    if (!window.confirm(`Are you sure you want to delete batch ${batchNumber}?`)) return;

    try {
      const res = await fetch(`${API}/stock/remove_batch.php`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch_id: batchId }),
      });
      const d = await res.json();
      if (d.status === 'success') {
        showToast(d.message || 'Batch removed successfully!');
        fetchAllData();
      } else { showToast(d.message || 'Failed to remove batch', 'error'); }
    } catch { showToast('Connection error', 'error'); }
  };

  /* ── Dashboard computed stats ────────────────────────────────────── */
  const totalMeds = aggregatedInventory.length;
  const totalItems = dashboardMetrics.total_items || 0;
  const totalBatches = batches.length;
  const outOfStockCount = aggregatedInventory.filter(m => m.status === 'out_of_stock').length;
  const totalQty = dashboardMetrics.total_quantity || 0;
  const lowStockCount = dashboardMetrics.low_stock_alerts || 0;
  const expiringCount = dashboardMetrics.expiring_soon || 0;

  const now = new Date();
  const expiringSoonBatches = batches.filter(b => {
    const exp = new Date(b.expiry_date);
    const days = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 30;
  });
  const expiredBatches = batches.filter(b => new Date(b.expiry_date) < now);

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════ */
  const pageTitle = isDashboardView ? 'Stock Dashboard' : isInventoryView ? 'Inventory Management' : isExpiriesView ? 'Expiry Management' : 'Settings';

  return (
    <DashboardLayout sidebarItems={sidebarItems} colorScheme="blue" title={pageTitle}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-10 h-10 text-blue-500 spin" />
        </div>
      ) : (
        <>
          {/* ═══════════════════════════════════════════════════════════
              DASHBOARD VIEW
              ═══════════════════════════════════════════════════════════ */}
          {isDashboardView && (
            <div className="space-y-6 animate-fadeIn">

              {/* Welcome Banner */}
              <div className="flex items-start justify-between mb-8 mt-2">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#64748B] font-normal">Home</span>
                    <ChevronRight className="w-[12px] h-[12px] text-[#64748B]" strokeWidth={2.5} />
                    <span className="text-xs text-[#004AC6] font-bold">Stock Dashboard</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <h1 className="text-[#004AC6] text-[32px] font-extrabold leading-[38.4px]">{user?.pharmacy_name || 'Pharmacy'}</h1>
                    <BadgeCheck className="w-[22px] h-[21px] text-[#16A34A]" strokeWidth={2.5} />
                  </div>

                  <p className="text-[#64748B] text-base font-normal leading-[25.6px]">
                    Welcome {user?.full_name?.split(' ')[0] || 'Manager'}
                  </p>
                </div>

                <img
                  src={pharmacyImage}
                  alt="City Pharmacy"
                  style={{ width: 314, height: 209 }}
                  className="object-contain shrink-0 hidden md:block -mt-10 -mr-4"
                />
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Medicines', value: totalMeds, icon: Package, color: 'from-blue-500 to-indigo-500', sub: 'In inventory' },
                  { label: 'Total Batches', value: totalBatches, icon: Layers, color: 'from-blue-500 to-indigo-500', sub: 'Recorded' },
                  { label: 'Low Stock', value: lowStockCount, icon: TrendingDown, color: 'from-indigo-500 to-yellow-500', sub: 'Need restocking' },
                  { label: 'Out of Stock', value: outOfStockCount, icon: ShieldAlert, color: 'from-red-500 to-rose-500', sub: 'Urgent attention' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-10 h-10 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center`}>
                        <stat.icon className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm font-semibold text-gray-700 mt-0.5">{stat.label}</p>
                    <p className="text-xs text-gray-400">{stat.sub}</p>
                  </div>
                ))}
              </div>

              {/* Low Stock Alert */}
              {lowStock.length > 0 && (
                <div className="bg-gradient-to-r from-indigo-50 to-red-50 border border-indigo-200 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-indigo-900 text-sm">Low Stock Alert — {lowStock.length} medicine{lowStock.length !== 1 ? 's' : ''} need restocking</p>
                        <p className="text-indigo-700 text-xs mt-0.5">Take action to prevent stockouts</p>
                      </div>
                    </div>
                    <button onClick={() => navigate('/stock/inventory')}
                      className="flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 transition-colors">
                      View Inventory <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {lowStock.map((item, idx) => {
                      const qty = item.stock_quantity ?? 0;
                      const cc = qty === 0 ? 'bg-red-100 text-red-700 border-red-200' : 'bg-indigo-100 text-indigo-700 border-indigo-200';
                      return (
                        <div key={idx} className={`flex items-center gap-2 px-3 py-1.5 border rounded-xl text-xs font-semibold ${cc}`}>
                          <Package className="w-3.5 h-3.5" /> {item.brand_name} <span className="font-bold">({qty} left)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Expiry Alert */}
              {(expiringSoonBatches.length > 0 || expiredBatches.length > 0) && (
                <div className="bg-gradient-to-r from-red-50 to-blue-50 border border-red-200 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-red-500 rounded-xl flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-red-900 text-sm">
                        Expiry Alert — {expiredBatches.length} expired, {expiringSoonBatches.length} expiring within 30 days
                      </p>
                      <p className="text-red-700 text-xs mt-0.5">Review and remove expired batches</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {expiredBatches.slice(0, 5).map((b, i) => (
                      <div key={`exp-${i}`} className="flex items-center gap-2 px-3 py-1.5 border rounded-xl text-xs font-semibold bg-red-100 text-red-700 border-red-200">
                        <Calendar className="w-3.5 h-3.5" /> {b.brand_name} <span className="font-bold">Expired</span>
                      </div>
                    ))}
                    {expiringSoonBatches.slice(0, 5).map((b, i) => {
                      const days = Math.ceil((new Date(b.expiry_date) - now) / (1000 * 60 * 60 * 24));
                      return (
                        <div key={`soon-${i}`} className="flex items-center gap-2 px-3 py-1.5 border rounded-xl text-xs font-semibold bg-indigo-100 text-indigo-700 border-indigo-200">
                          <Calendar className="w-3.5 h-3.5" /> {b.brand_name} <span className="font-bold">{days}d left</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button onClick={() => { navigate('/stock/inventory'); setTimeout(() => setShowAddMedicineModal(true), 100); }}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-blue-200 transition-all text-left group">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-500 transition-colors">
                    <Plus className="w-5 h-5 text-blue-600 group-hover:text-white transition-colors" />
                  </div>
                  <p className="font-bold text-gray-900 text-sm">Add Medicine</p>
                  <p className="text-xs text-gray-400 mt-0.5">Add medicine to track in inventory</p>
                </button>
                <button onClick={() => navigate('/stock/inventory')}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-blue-200 transition-all text-left group">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-500 transition-colors">
                    <Package className="w-5 h-5 text-blue-600 group-hover:text-white transition-colors" />
                  </div>
                  <p className="font-bold text-gray-900 text-sm">View Inventory</p>
                  <p className="text-xs text-gray-400 mt-0.5">Browse all medicines & batches</p>
                </button>
                <button onClick={() => setShowRequestModal(true)}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-purple-200 transition-all text-left group">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-purple-500 transition-colors">
                    <MessageSquare className="w-5 h-5 text-purple-600 group-hover:text-white transition-colors" />
                  </div>
                  <p className="font-bold text-gray-900 text-sm">Request Medicine</p>
                  <p className="text-xs text-gray-400 mt-0.5">Ask admin to add new medicine</p>
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              INVENTORY VIEW
              ═══════════════════════════════════════════════════════════ */}
          {isInventoryView && (
            <div className="space-y-6 animate-fadeIn">

              {/* Tab Switcher */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-1.5 flex gap-1">
                <button onClick={() => setActiveTab('inventory')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === 'inventory' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}>
                  <Package className="w-4 h-4" /> Medicine Inventory
                </button>
                <button onClick={() => setActiveTab('batches')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === 'batches' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}>
                  <Hash className="w-4 h-4" /> Medicine Batches
                  {batches.length > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'batches' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600'}`}>{batches.length}</span>
                  )}
                </button>
              </div>

              {/* ─── INVENTORY TAB (Aggregated) ───────────────────────── */}
              {activeTab === 'inventory' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-wrap gap-3">
                    <div>
                      <h2 className="text-base font-bold text-gray-900">Medicine Inventory</h2>
                      <p className="text-sm text-gray-500 mt-0.5">{aggregatedInventory.length} medicines tracked</p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                          placeholder="Search medicines…"
                          className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white w-48" />
                      </div>
                      <button onClick={() => setShowAddMedicineModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
                        <Plus className="w-4 h-4" /> Add Medicine
                      </button>
                      <button onClick={() => setShowRequestModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
                        <MessageSquare className="w-4 h-4" /> Request Medicine
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          {['Medicine Name', 'Category', 'Total Stock Qty', 'Status', 'Actions'].map(h => (
                            <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {paged.map((m, i) => {
                          const qty = parseInt(m.total_stock) || 0;
                          return (
                            <tr key={m.medicine_id || i} className="hover:bg-blue-50/30 transition-colors">
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Package className="w-4 h-4 text-blue-600" />
                                  </div>
                                  <div>
                                    <span className="font-semibold text-gray-900 text-sm block">{m.brand_name}</span>
                                    {m.generic_name && <span className="text-xs text-gray-400">{m.generic_name}</span>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-sm text-gray-600">{m.category || '—'}</td>
                              <td className="px-5 py-3.5"><QtyDisplay qty={qty} item={m} /></td>
                              <td className="px-5 py-3.5"><StockBadge status={m.status} /></td>
                              <td className="px-5 py-3.5">
                                <button
                                  onClick={() => handleRemoveMedicine(m.medicine_id, m.brand_name)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  title="Remove from inventory"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {paged.length === 0 && (
                          <tr>
                            <td colSpan={4} className="text-center py-14">
                              <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                              <p className="text-gray-400 text-sm">No medicines found</p>
                              <p className="text-gray-300 text-xs mt-1">Add a batch to start tracking inventory</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                    <p className="text-sm text-gray-500">
                      Showing {filtered.length === 0 ? 0 : (page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                        className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-all">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(p => (
                        <button key={p} onClick={() => setPage(p)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${page === p ? 'bg-blue-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
                          {p}
                        </button>
                      ))}
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                        className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-all">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── BATCHES TAB ──────────────────────────────────────── */}
              {activeTab === 'batches' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                        <Hash className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-gray-900">Medicine Batches</h2>
                        <p className="text-sm text-gray-500 mt-0.5">{batches.length} batch{batches.length !== 1 ? 'es' : ''} recorded</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="text" value={batchSearch} onChange={e => setBatchSearch(e.target.value)}
                          placeholder="Search batches…"
                          className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white w-48" />
                      </div>
                      <button onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
                        <Plus className="w-4 h-4" /> Add New Batch
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          {['Batch Number', 'Medicine', 'Category', 'Qty', 'Price', 'Expiry Date', 'Added On', 'Actions'].map(h => (
                            <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredBatches.map(b => {
                          const qty = b.quantity_in_stock ?? 0;
                          const expDate = new Date(b.expiry_date);
                          const daysUntilExpiry = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
                          const isExpired = daysUntilExpiry < 0;
                          const isExpiringSoon = !isExpired && daysUntilExpiry <= 30;
                          return (
                            <tr key={b.batch_id} className="hover:bg-blue-50/30 transition-colors">
                              <td className="px-5 py-3.5">
                                <span className="font-mono text-sm font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">{b.batch_number}</span>
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Package className="w-4 h-4 text-blue-600" />
                                  </div>
                                  <div>
                                    <span className="font-semibold text-gray-900 text-sm block">{b.brand_name}</span>
                                    <span className="text-xs text-gray-400">{b.generic_name}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-sm text-gray-600">{b.category || '—'}</td>
                              <td className="px-5 py-3.5">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                                  qty === 0 ? 'bg-red-100 text-red-700' : qty < 20 ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'
                                }`}>{qty}</span>
                              </td>
                              <td className="px-5 py-3.5 text-sm font-semibold text-gray-800">
                                {b.unit_price ? `Rs. ${parseFloat(b.unit_price).toFixed(2)}` : '—'}
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-2">
                                  <Calendar className={`w-4 h-4 flex-shrink-0 ${isExpired ? 'text-red-500' : isExpiringSoon ? 'text-indigo-500' : 'text-gray-400'}`} />
                                  <div>
                                    <span className={`text-sm font-medium block ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-indigo-600' : 'text-gray-700'}`}>
                                      {expDate.toLocaleDateString()}
                                    </span>
                                    {isExpired && <span className="text-xs text-red-500 font-semibold">Expired</span>}
                                    {isExpiringSoon && <span className="text-xs text-indigo-500 font-semibold">{daysUntilExpiry}d left</span>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-1.5 text-gray-500">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span className="text-xs">{new Date(b.created_at).toLocaleDateString()}</span>
                                </div>
                              </td>
                              <td className="px-5 py-3.5">
                                <button
                                  onClick={() => handleRemoveBatch(b.batch_id, b.batch_number)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  title="Delete Batch"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredBatches.length === 0 && (
                          <tr>
                            <td colSpan={8} className="text-center py-14">
                              <Hash className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                              <p className="text-gray-400 text-sm font-medium">No batches found</p>
                              <p className="text-gray-300 text-xs mt-1">Add a medicine batch using the button above</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              EXPIRIES VIEW
              ═══════════════════════════════════════════════════════════ */}
          {isExpiriesView && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900">Expiring & Expired Batches</h2>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {expiredBatches.length} expired, {expiringSoonBatches.length} expiring within 30 days
                      </p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {['Batch Number', 'Medicine', 'Qty', 'Expiry Date', 'Status', 'Actions'].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {[...expiredBatches, ...expiringSoonBatches]
                        .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date))
                        .map(b => {
                          const qty = b.quantity_in_stock ?? 0;
                          const expDate = new Date(b.expiry_date);
                          const daysUntilExpiry = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
                          const isExpired = daysUntilExpiry < 0;

                          return (
                            <tr key={b.batch_id} className={`transition-colors ${isExpired ? 'bg-red-50/30' : 'bg-indigo-50/30'}`}>
                              <td className="px-5 py-3.5">
                                <span className={`font-mono text-sm font-semibold px-2.5 py-1 rounded-lg ${isExpired ? 'bg-red-100 text-red-800' : 'bg-indigo-100 text-indigo-800'}`}>
                                  {b.batch_number}
                                </span>
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-gray-200">
                                    <Package className="w-4 h-4 text-gray-400" />
                                  </div>
                                  <div>
                                    <span className="font-semibold text-gray-900 text-sm block">{b.brand_name}</span>
                                    <span className="text-xs text-gray-400">{b.generic_name}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3.5">
                                <span className="font-bold text-gray-700">{qty} {getMedicineUnit(b, qty)}</span>
                              </td>
                              <td className="px-5 py-3.5">
                                <span className={`text-sm font-bold ${isExpired ? 'text-red-600' : 'text-indigo-600'}`}>
                                  {expDate.toLocaleDateString()}
                                </span>
                              </td>
                              <td className="px-5 py-3.5">
                                {isExpired ? (
                                  <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold">Expired</span>
                                ) : (
                                  <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold">Expires in {daysUntilExpiry} days</span>
                                )}
                              </td>
                              <td className="px-5 py-3.5">
                                <button
                                  onClick={() => handleRemoveBatch(b.batch_id, b.batch_number)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:bg-red-100 rounded-lg text-xs font-semibold transition-all border border-red-200"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Remove
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      {expiredBatches.length === 0 && expiringSoonBatches.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-14">
                            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                            <p className="text-gray-600 text-sm font-semibold">All clear!</p>
                            <p className="text-gray-400 text-xs mt-1">There are no expired or expiring soon batches.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              SETTINGS VIEW
              ═══════════════════════════════════════════════════════════ */}
          {isSettingsView && (
            <SettingsView sidebarItems={sidebarItems} colorScheme="green" />
          )}
        </>
      )}

      {/* ═════════════════════════════════════════════════════════════════
          ADD MEDICINE MODAL (Inventory)
          ═════════════════════════════════════════════════════════════════ */}
      {showAddMedicineModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Add Medicine to Inventory</h3>
                <p className="text-xs text-gray-500 mt-0.5">Select a medicine from the master database to start tracking it</p>
              </div>
              <button onClick={closeAddMedicineModal}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value={masterSearch} onChange={e => setMasterSearch(e.target.value)}
                  placeholder="Search master medicine database…"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-all" />
              </div>

              <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-xl">
                {filteredMaster.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No medicines found</p>
                  </div>
                ) : (
                  filteredMaster.slice(0, 30).map(m => {
                    const isSelected = selectedMed?.medicine_id === m.medicine_id;
                    return (
                      <button key={m.medicine_id} type="button" onClick={() => setSelectedMed(m)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-b border-gray-50 last:border-0 ${
                          isSelected ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-50'
                        }`}>
                        <Package className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-blue-500' : 'text-gray-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>{m.brand_name}</p>
                          <p className="text-xs text-gray-500 truncate">{m.generic_name} · {m.category}</p>
                        </div>
                        {isSelected && <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>

              {selectedMed && (
                <form onSubmit={handleAddMedicine} className="space-y-4 pt-2">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <p className="text-sm font-semibold text-blue-800">Selected: {selectedMed.brand_name}</p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      {selectedMed.generic_name} · {selectedMed.category}
                      {selectedMed.requires_prescription === 1 && (
                        <span className="ml-2 text-red-500 font-semibold">⚕ Prescription Required</span>
                      )}
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={closeAddMedicineModal}
                      className="flex-1 py-2.5 border border-gray-200 bg-white text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all">
                      Cancel
                    </button>
                    <button type="submit" disabled={addingMedicine}
                      className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-md hover:shadow-lg">
                      {addingMedicine ? <Loader2 className="w-4 h-4 spin" /> : <Plus className="w-4 h-4" />}
                      Add to Inventory
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════
          ADD BATCH MODAL
          ═════════════════════════════════════════════════════════════════ */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Add New Batch</h3>
                <p className="text-xs text-gray-500 mt-0.5">Select a medicine and record a new supplier batch</p>
              </div>
              <button onClick={closeAddModal}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Search inventory medicines */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value={masterSearch} onChange={e => setMasterSearch(e.target.value)}
                  placeholder="Search your inventory medicines…"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-all" />
              </div>

              {/* Medicine list */}
              <div className="max-h-44 overflow-y-auto border border-gray-200 rounded-xl">
                {filteredBatchMeds.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No medicines found in your inventory</p>
                    <p className="text-xs text-gray-400 mt-1">Please add the medicine from the Inventory tab first</p>
                  </div>
                ) : (
                  filteredBatchMeds.slice(0, 30).map(m => {
                    const isSelected = selectedMed?.medicine_id === m.medicine_id;
                    return (
                      <button key={m.medicine_id} type="button" onClick={() => setSelectedMed(m)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-b border-gray-50 last:border-0 ${
                          isSelected ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-50'
                        }`}>
                        <Package className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-blue-500' : 'text-gray-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>{m.brand_name}</p>
                          <p className="text-xs text-gray-500 truncate">{m.generic_name} · {m.category}</p>
                        </div>
                        {isSelected && <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Form (visible after selection) */}
              {selectedMed && (
                <form onSubmit={handleAddBatch} className="space-y-4">
                  {/* Confirmation */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <p className="text-sm font-semibold text-blue-800">Selected: {selectedMed.brand_name}</p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      {selectedMed.generic_name} · {selectedMed.category}
                      {selectedMed.requires_prescription === 1 && (
                        <span className="ml-2 text-red-500 font-semibold">⚕ Prescription Required</span>
                      )}
                    </p>
                  </div>

                  {/* Supplier Input (Free-text with Datalist) */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Supplier
                    </label>
                    <input
                      type="text"
                      list="supplier-options"
                      value={addForm.supplier_name}
                      onChange={e => setAddForm({ ...addForm, supplier_name: e.target.value })}
                      placeholder="Type supplier name..."
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-all"
                    />
                    <datalist id="supplier-options">
                      {suppliers.map(s => (
                        <option key={s.id} value={s.name} />
                      ))}
                    </datalist>
                  </div>

                  {/* Price & Qty */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Price per unit <span className="text-red-500">*</span></label>
                      <input required type="number" step="0.01" min="0" value={addForm.price}
                        onChange={e => setAddForm({ ...addForm, price: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-all"
                        placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Initial Qty <span className="text-red-500">*</span></label>
                      <input required type="number" min="1" value={addForm.quantity}
                        onChange={e => setAddForm({ ...addForm, quantity: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-all"
                        placeholder="0" />
                    </div>
                  </div>

                  {/* Expiry */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Expiry Date <span className="text-red-500">*</span></label>
                    <input required type="date" value={addForm.expiry_date}
                      onChange={e => setAddForm({ ...addForm, expiry_date: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-all" />
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={closeAddModal}
                      className="flex-1 py-2.5 border border-gray-200 bg-white text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all">
                      Cancel
                    </button>
                    <button type="submit" disabled={addingItem}
                      className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-md hover:shadow-lg">
                      {addingItem ? <Loader2 className="w-4 h-4 spin" /> : <Plus className="w-4 h-4" />}
                      Add Batch
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════
          REQUEST NEW MEDICINE MODAL
          ═════════════════════════════════════════════════════════════════ */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-gray-900">Request New Medicine</h3>
              <button onClick={() => setShowRequestModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-6">Request admin to add a new medicine to the master database</p>
            <form onSubmit={handleRequestMedicine} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Medicine Name *</label>
                <input required type="text" value={requestForm.medicine_name}
                  onChange={e => setRequestForm({ ...requestForm, medicine_name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white"
                  placeholder="Enter medicine name" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category *</label>
                <input required type="text" value={requestForm.category}
                  onChange={e => setRequestForm({ ...requestForm, category: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white"
                  placeholder="e.g. Antibiotics, Pain Relief" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                <textarea value={requestForm.description}
                  onChange={e => setRequestForm({ ...requestForm, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white resize-none"
                  rows={3} placeholder="Optional description" />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="req_prescription" checked={requestForm.requires_prescription}
                  onChange={e => setRequestForm({ ...requestForm, requires_prescription: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300" />
                <label htmlFor="req_prescription" className="text-sm font-medium text-gray-700">Requires Prescription</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowRequestModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all">Cancel</button>
                <button type="submit" disabled={submittingRequest}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                  {submittingRequest ? <Loader2 className="w-4 h-4 spin" /> : <Plus className="w-4 h-4" />}
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}


