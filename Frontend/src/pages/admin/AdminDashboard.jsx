import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import {
  LayoutDashboard, Building2, Pill, Users,
  Settings, CheckCircle, XCircle, Plus, Search, Loader2,
  AlertCircle, Eye, TrendingUp, Clock, X, ShieldCheck,
  FileText, UserCheck, ClipboardList, Filter, ToggleLeft, ToggleRight, Star, MessageSquare, ImageIcon,
  ChevronLeft, ChevronRight, ExternalLink, Trash2, Edit
} from 'lucide-react';
import SettingsView from '../../components/SettingsView';

const API = import.meta.env.VITE_API_BASE_URL;
import { adminApi } from '../../services/adminApi';
// API base URL for fetching data
const getMediaUrl = (path) => path ? `${API}/shared/view_file.php?file=${encodeURIComponent(path)}` : null;

const sidebarItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
  { label: 'Approvals', icon: Building2, path: '/admin/pharmacies' },
  { label: 'Medicine Database', icon: Pill, path: '/admin/medicines' },
  { label: 'User Management', icon: Users, path: '/admin/users' },
  { label: 'Feedbacks', icon: MessageSquare, path: '/admin/feedbacks' },
  { label: 'Settings', icon: Settings, path: '/admin/settings' }
];

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed top-4 right-4 left-4 sm:left-auto z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl animate-fadeIn text-white text-sm font-medium ${type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
      {type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100 shrink-0"><X className="w-4 h-4" /></button>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className={`bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all group`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 ${color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <TrendingUp className="w-4 h-4 text-emerald-500" />
      </div>
      <p className="text-2xl sm:text-3xl font-extrabold text-gray-900">{value ?? '—'}</p>
      <p className="text-gray-500 text-sm mt-1 font-medium">{label}</p>
      {sub && <p className="text-xs text-emerald-600 mt-1 font-medium">{sub}</p>}
    </div>
  );
}

// The main dashboard for Administrators
export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  const { user } = useAuth();

  const [stats, setStats] = useState(null);
  const [pharmacies, setPharmacies] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [medSearch, setMedSearch] = useState('');
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingPharm, setLoadingPharm] = useState(true);
  const [loadingMed, setLoadingMed] = useState(true);
  const [toast, setToast] = useState(null);
  const [showAddMed, setShowAddMed] = useState(false);
  const [addMedForm, setAddMedForm] = useState({ brand_name: '', generic_name: '', category: '', description: '', requires_prescription: false });
  const [addingMed, setAddingMed] = useState(false);
  const [approvingId, setApprovingId] = useState(null);

  // Pharmacy filters
  const [pharmacyFilter, setPharmacyFilter] = useState('pending_admin_approval'); 
  const [nmraSearch, setNmraSearch] = useState('');

  // Pharmacy Staff View Modal
  const [viewStaffPharmacy, setViewStaffPharmacy] = useState(null);
  const [pharmacyStaff, setPharmacyStaff] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  // Pharmacy Details Modal
  const [viewPharmacyDetails, setViewPharmacyDetails] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);

  // Pharmacist verification state
  const [pharmacists, setPharmacists] = useState([]);
  const [loadingPharmacists, setLoadingPharmacists] = useState(true);
  const [pharmacistSearch, setPharmacistSearch] = useState('');
  const [pharmacistFilter, setPharmacistFilter] = useState('pending');
  const [approvingPharmacistId, setApprovingPharmacistId] = useState(null);
  const [viewPharmacistDetails, setViewPharmacistDetails] = useState(null);
  const [medicinePage, setMedicinePage] = useState(0);

  // Medicine request state
  const [medicineRequests, setMedicineRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // User Management state
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [togglingUserId, setTogglingUserId] = useState(null);

  // Feedbacks state
  const [feedbacks, setFeedbacks] = useState([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);
  const [feedbackSearch, setFeedbackSearch] = useState('');
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState('pending');

  const showToast = (message, type = 'success') => setToast({ message, type });

  const openDocPreview = (clickedUrl, allUrls = []) => {
    const list = allUrls.filter(u => u);
    let index = list.indexOf(clickedUrl);
    if (index === -1) {
      if (list.length === 0 && clickedUrl) list.push(clickedUrl);
      index = 0;
    }
    const finalUrl = list[index] || clickedUrl || '';
    setPreviewDoc({ url: finalUrl, list, index });
  };

  const fetchUsers = () => {
    setLoadingUsers(true);
    adminApi.getUsers()
      .then(d => {
        if (d.status === 'success') {
          setUsers(d.data || []);
        } else {
          showToast(d.message || 'Failed to fetch users', 'error');
        }
      })
      .catch(() => showToast('Connection error', 'error'))
      .finally(() => setLoadingUsers(false));
  };

  useEffect(() => {
    // Get general stats
    adminApi.getStats()
      .then(d => { if (d.status === 'success') setStats(d.data); })
      .catch(() => {}).finally(() => setLoadingStats(false));

    adminApi.getPharmacies()
      .then(d => { if (d.status === 'success') setPharmacies(d.data || []); })
      .catch(() => {}).finally(() => setLoadingPharm(false));

    adminApi.getMedicines()
      .then(d => { if (d.status === 'success') setMedicines(d.data || []); })
      .catch(() => {}).finally(() => setLoadingMed(false));

    adminApi.getPharmacists()
      .then(d => { if (d.status === 'success') setPharmacists(d.data || []); })
      .catch(() => {}).finally(() => setLoadingPharmacists(false));

    adminApi.getMedicineRequests()
      .then(d => { if (d.status === 'success') setMedicineRequests(d.data || []); })
      .catch(() => {}).finally(() => setLoadingRequests(false));

    adminApi.getFeedbacks()
      .then(d => { if (d.status === 'success') setFeedbacks(d.data || []); })
      .catch(() => {}).finally(() => setLoadingFeedbacks(false));

    fetchUsers();
  }, []);

  const handleApprove = async (id, action) => {
    setApprovingId(id);
    try {
      const d = await adminApi.approveCombined(id, action);
      if (d.status === 'success') {
        const newStatus = action === 'approve' ? 'fully_verified' : 'rejected';
        setPharmacies(prev => prev.map(p => p.pharmacy_id === id ? { ...p, status: newStatus } : p));
        setPharmacists(prev => prev.map(p => p.pharmacy_id === id ? { ...p, pharmacy_status: newStatus } : p));
        showToast(`Pharmacy ${action === 'approve' ? 'Approved (Step 1)' : 'Rejected'} successfully`);
      } else {
        showToast(d.message || 'Action failed', 'error');
      }
    } catch (e) { showToast(e.message || 'Connection error', 'error'); }
    setApprovingId(null);
  };

  const handleToggleUserSuspension = async (userId, currentStatus) => {
    setTogglingUserId(userId);
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    try {
      const d = await adminApi.toggleUser(userId, newStatus);
      if (d.status === 'success') {
        setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, account_status: newStatus } : u));
        showToast(d.message || `User account status updated successfully`);
      } else {
        showToast(d.message || 'Failed to update user status', 'error');
      }
    } catch (e) {
      showToast(e.message || 'Connection error', 'error');
    }
    setTogglingUserId(null);
  };

  const handleViewStaff = async (pharmacy) => {
    setViewStaffPharmacy(pharmacy);
    setLoadingStaff(true);
    try {
      const d = await adminApi.getPharmacyStaff(pharmacy.pharmacy_id);
      if (d.status === 'success') {
        setPharmacyStaff(d.data || []);
      } else {
        showToast(d.message || 'Failed to load staff', 'error');
        setPharmacyStaff([]);
      }
    } catch (e) {
      showToast(e.message || 'Connection error', 'error');
      setPharmacyStaff([]);
    }
    setLoadingStaff(false);
  };

  const handlePharmacistApprove = async (userId, action) => {
    if (action === 'approve') {
      const pharmacist = pharmacists.find(p => p.user_id === userId);
      if (pharmacist && pharmacist.pharmacy_status === 'rejected') {
        showToast("Can't approve since pharmacy is rejected", 'error');
        return;
      }
    }
    setApprovingPharmacistId(userId);
    try {
      const d = await adminApi.approvePharmacist(userId, action);
      if (d.status === 'success') {
        let currentPharmacist = pharmacists.find(p => p.user_id === userId);
        
        setPharmacists(prev => prev.map(p =>
          p.user_id === userId ? { ...p, status: action === 'approve' ? 'approved' : 'rejected' } : p
        ));

        if (d.new_pharmacy_status && currentPharmacist) {
           setPharmacies(prev => prev.map(p => 
             p.pharmacy_id === currentPharmacist.pharmacy_id ? { ...p, status: d.new_pharmacy_status } : p
           ));
        }
        showToast(`Pharmacist ${action}d successfully`);
      } else {
        showToast(d.message || 'Action failed', 'error');
      }
    } catch (e) { showToast(e.message || 'Connection error', 'error'); }
    setApprovingPharmacistId(null);
  };

  const handleMedicineRequest = async (requestId, action) => {
    try {
      const d = await adminApi.approveMedicineRequest(requestId, action, '');
      if (d.status === 'success') {
        setMedicineRequests(prev => prev.map(r =>
          r.request_id === requestId ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r
        ));
        showToast(`Medicine request ${action}d successfully`);
      } else {
        showToast(d.message || 'Action failed', 'error');
      }
    } catch (e) { showToast(e.message || 'Connection error', 'error'); }
  };

  const handleFeedbackStatus = async (feedbackId, status) => {
    try {
      const d = await adminApi.updateFeedbackStatus(feedbackId, status);
      if (d.status === 'success') {
        setFeedbacks(prev => prev.map(f =>
          f.id === feedbackId ? { ...f, status } : f
        ));
        showToast(`Feedback ${status} successfully`);
      } else {
        showToast(d.message || 'Action failed', 'error');
      }
    } catch (e) { showToast(e.message || 'Connection error', 'error'); }
  };

  const handleDeleteFeedback = async (feedbackId) => {
    if (!window.confirm('Are you sure you want to delete this feedback?')) return;
    try {
      const d = await adminApi.deleteFeedback(feedbackId);
      if (d.status === 'success') {
        setFeedbacks(prev => prev.filter(f => f.id !== feedbackId));
        showToast('Feedback deleted successfully');
      } else {
        showToast(d.message || 'Delete failed', 'error');
      }
    } catch (e) { showToast(e.message || 'Connection error', 'error'); }
  };

  const handleAddMedicine = async (e) => {
    e.preventDefault();
    setAddingMed(true);
    try {
      const d = await adminApi.addMedicine(addMedForm);
      if (d.status === 'success') {
        setMedicines(prev => [d.medicine || { ...addMedForm, id: Date.now() }, ...prev]);
        showToast('Medicine added to master database');
        setShowAddMed(false);
        setAddMedForm({ brand_name: '', generic_name: '', category: '', description: '', requires_prescription: false });
      } else {
        showToast(d.message || 'Failed to add medicine', 'error');
      }
    } catch (e) { showToast(e.message || 'Connection error', 'error'); }
    setAddingMed(false);
  };

  const handleEditMedicine = async (e) => {
    e.preventDefault();
    setAddingMed(true);
    try {
      const d = await adminApi.updateMedicine(addMedForm);
      if (d.status === 'success') {
        setMedicines(prev => prev.map(m => m.medicine_id === addMedForm.medicine_id ? { ...m, ...addMedForm } : m));
        setShowAddMed(false);
        showToast('Medicine updated successfully');
      } else {
        showToast(d.message || 'Failed to update medicine', 'error');
      }
    } catch (e) { showToast(e.message || 'Connection error', 'error'); }
    setAddingMed(false);
  };

  const handleDeleteMedicine = async (medicineId) => {
    if (!window.confirm('Are you sure you want to delete this medicine? This will hide it from pharmacies. Affected pharmacy staff will be notified automatically.')) return;
    try {
      const d = await adminApi.deleteMedicine(medicineId);
      if (d.status === 'success') {
        setMedicines(prev => prev.filter(m => m.medicine_id !== medicineId));
        showToast('Medicine deleted successfully');
      } else {
        showToast(d.message || 'Failed to delete medicine', 'error');
      }
    } catch (e) { showToast(e.message || 'Connection error', 'error'); }
  };

  const filteredMeds = medicines.filter(m =>
    m.brand_name?.toLowerCase().includes(medSearch.toLowerCase()) ||
    m.generic_name?.toLowerCase().includes(medSearch.toLowerCase()) ||
    m.category?.toLowerCase().includes(medSearch.toLowerCase())
  );

  const filteredPharmacists = pharmacists.filter(p => {
    if (pharmacistFilter !== 'all' && p.status !== pharmacistFilter) return false;
    if (pharmacistSearch && !(p.slmc_reg_number || '').toLowerCase().includes(pharmacistSearch.toLowerCase())) return false;
    return true;
  });

  const pendingPharmacistsCount = pharmacists.filter(p => p.status === 'pending').length;

  const getFilteredPharmacies = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return pharmacies.filter(p => {
      if (nmraSearch) {
        const matchesNmra = p.nmra_license ? p.nmra_license.toLowerCase().includes(nmraSearch.toLowerCase()) : false;
        const matchesName = p.name ? p.name.toLowerCase().includes(nmraSearch.toLowerCase()) : false;
        if (!matchesNmra && !matchesName) {
          return false;
        }
      }
      if (pharmacyFilter === 'all') return true;
      if (pharmacyFilter === 'expired') {
        if (!p.nmra_expiry_date) return false;
        const expiry = new Date(p.nmra_expiry_date);
        return expiry < today;
      }
      return p.status === pharmacyFilter;
    });
  };

  const displayedPharmacies = getFilteredPharmacies();
  const pendingPharmaciesCount = pharmacies.filter(p => p.status === 'pending_admin_approval').length;
  const pendingMedicineRequests = medicineRequests.filter(r => r.status === 'pending');

  const currentPath = location.pathname;
  const isDashboard = currentPath === '/admin/dashboard' || currentPath === '/admin' || currentPath === '/admin/';
  const isPharmacies = currentPath === '/admin/pharmacies';
  const isMedicines = currentPath === '/admin/medicines';
  const isUsers = currentPath === '/admin/users';
  const isFeedbacks = currentPath === '/admin/feedbacks';

  const getDashboardTitle = () => {
    if (isUsers) return 'User Management';
    if (isFeedbacks) return 'Patient Feedbacks';
    if (isPharmacies) return 'Pharmacy Approvals & Verification';
    if (isMedicines) return 'Master Medicine Database';
    if (currentPath === '/admin/settings') return 'Settings';
    return 'Admin Dashboard';
  };

  const filteredUsers = users.filter(u => {
    if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
    if (userSearch) {
      const q = userSearch.toLowerCase();
      return (
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phone || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getRoleBadge = (role) => {
    const rolesMap = {
      admin: { label: 'Admin', styles: 'bg-rose-50 text-rose-700 border-rose-100' },
      patient: { label: 'Patient', styles: 'bg-blue-50 text-blue-700 border-blue-100' },
      pharmacy_owner: { label: 'Owner', styles: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
      pharmacist: { label: 'Pharmacist', styles: 'bg-teal-50 text-teal-700 border-teal-100' },
      stock_manager: { label: 'Stock Manager', styles: 'bg-orange-50 text-orange-700 border-orange-100' },
    };
    const r = rolesMap[role] || { label: role, styles: 'bg-gray-50 text-gray-700 border-gray-100' };
    return (
      <span className={`px-2.5 py-1 border rounded-lg text-xs font-semibold ${r.styles}`}>
        {r.label}
      </span>
    );
  };

  const getUserInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };
  
  const getAvatarBg = (role) => {
    const bgMap = {
      admin: 'bg-rose-500 text-white',
      patient: 'bg-blue-500 text-white',
      pharmacy_owner: 'bg-indigo-500 text-white',
      pharmacist: 'bg-teal-500 text-white',
      stock_manager: 'bg-orange-500 text-white',
    };
    return bgMap[role] || 'bg-gray-500 text-white';
  };

  const prepareChartData = () => {
    if (!stats) return { usersData: [], pharmacyData: [] };
    
    const rolesMap = {
      admin: 'Admins',
      patient: 'Patients',
      pharmacy_owner: 'Owners',
      pharmacist: 'Pharmacists',
      stock_manager: 'Stock Mgrs'
    };
    
    const usersData = Object.entries(stats.users_by_role || {}).map(([role, count]) => ({
      name: rolesMap[role] || role,
      count: count
    }));

    const pharmacyData = [
      { name: 'Verified', value: stats.pharmacies?.fully_verified || 0, color: '#10b981' },
      { name: 'Pending', value: stats.pharmacies?.pending_admin_approval || 0, color: '#f59e0b' },
      { name: 'Incomplete', value: stats.pharmacies?.incomplete || 0, color: '#9ca3af' }
    ].filter(d => d.value > 0);

    return { usersData, pharmacyData };
  };

  const { usersData, pharmacyData } = prepareChartData();

  // Calculate pending counts
  const pendingApprovalsCount = pharmacies.filter(p => p.status === 'pending_admin_approval').length 
                              + pharmacists.filter(p => p.status === 'pending').length;
  const pendingMedicineRequestsCount = medicineRequests.filter(r => r.status === 'pending').length;
  const pendingFeedbacksCount = feedbacks.filter(f => f.status === 'pending').length;

  const dynamicSidebarItems = sidebarItems.map(item => {
    if (item.path === '/admin/pharmacies') {
      return { ...item, badge: pendingApprovalsCount > 0 ? pendingApprovalsCount.toString() : undefined };
    }
    if (item.path === '/admin/medicines') {
      return { ...item, badge: pendingMedicineRequestsCount > 0 ? pendingMedicineRequestsCount.toString() : undefined };
    }
    if (item.path === '/admin/feedbacks') {
      return { ...item, badge: pendingFeedbacksCount > 0 ? pendingFeedbacksCount.toString() : undefined };
    }
    return item;
  });

  const adminNotifications = [];
  if (pendingApprovalsCount > 0) {
    adminNotifications.push({
      title: 'Pending Approvals',
      body: `You have ${pendingApprovalsCount} pending pharmacist/pharmacy approvals waiting for your review.`,
    });
  }
  if (pendingMedicineRequestsCount > 0) {
    adminNotifications.push({
      title: 'Medicine Requests',
      body: `You have ${pendingMedicineRequestsCount} pending medicine requests waiting for your review.`,
    });
  }
  if (pendingFeedbacksCount > 0) {
    adminNotifications.push({
      title: 'New Feedbacks',
      body: `You have ${pendingFeedbacksCount} unread feedbacks from users.`,
    });
  }

  if (currentPath === '/admin/settings') {
    return (
      <DashboardLayout sidebarItems={dynamicSidebarItems} notifications={adminNotifications} colorScheme="blue" title="Settings">
        <SettingsView sidebarItems={dynamicSidebarItems} colorScheme="blue" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebarItems={dynamicSidebarItems} notifications={adminNotifications} colorScheme="blue" title={getDashboardTitle()}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Stats */}
      {isDashboard && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8 animate-fadeIn">
          {loadingStats ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 h-36 animate-pulse">
                <div className="w-12 h-12 bg-gray-200 rounded-xl mb-4" />
                <div className="h-8 bg-gray-200 rounded w-16 mb-2" />
                <div className="h-4 bg-gray-100 rounded w-24" />
              </div>
            ))
          ) : (
            <>
              <StatCard label="Total Users" value={stats?.total_users} icon={Users} color="bg-blue-500" sub="+12% this month" />
              <StatCard label="Pending Pharmacies" value={pendingPharmaciesCount} icon={Clock} color="bg-amber-500" sub="Awaiting approval" />
              <StatCard label="Pending Pharmacists" value={pendingPharmacistsCount} icon={UserCheck} color="bg-teal-500" sub="Awaiting verification" />
              <StatCard label="Fully Verified Pharmacies" value={pharmacies.filter(p => p.status === 'fully_verified').length} icon={Building2} color="bg-emerald-500" sub="Active partners" />
              <StatCard label="Total Medicines" value={stats?.total_medicines || medicines.length} icon={Pill} color="bg-blue-500" sub="In master DB" />
              <StatCard label="Medicine Requests" value={pendingMedicineRequests.length} icon={ClipboardList} color="bg-orange-500" sub="Pending review" />
            </>
          )}
        </div>
      )}

      {/* Charts section */}
      {isDashboard && !loadingStats && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 animate-fadeIn">
          {/* Users Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <h3 className="text-base font-bold text-gray-900 mb-6">Users by Role</h3>
            <div className="flex flex-col justify-end h-72 gap-4 px-2 overflow-x-auto">
              <div className="flex items-end justify-around h-full border-b border-gray-100 pb-2 min-w-[340px]">
                {usersData.map((entry, index) => {
                  const maxCount = Math.max(...usersData.map(d => d.count)) || 1;
                  const heightPx = (entry.count / maxCount) * 200; 
                  const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e'];
                  return (
                    <div key={index} className="flex flex-col items-center justify-end group w-12">
                      <div className="text-xs font-bold text-gray-700 mb-2 bg-gray-100 px-2 py-1 rounded-lg">
                        {entry.count}
                      </div>
                      <div 
                        className="w-full rounded-t-lg transition-all duration-500 hover:opacity-80" 
                        style={{ height: `${Math.max(heightPx, 4)}px`, backgroundColor: colors[index % 5] }}
                      ></div>
                      <div className="text-[11px] font-bold text-gray-500 mt-3 whitespace-nowrap text-center" title={entry.name}>
                        {entry.name.length > 8 ? entry.name.substring(0, 8) + '...' : entry.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Pharmacy Status */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <h3 className="text-base font-bold text-gray-900 mb-6">Pharmacy Verification Status</h3>
            <div className="h-72 flex flex-col items-center justify-center">
              {pharmacyData.length > 0 ? (
                <>
                  <div className="relative w-40 h-40 sm:w-48 sm:h-48 mx-auto">
                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                      {(() => {
                        const total = pharmacyData.reduce((acc, curr) => acc + curr.value, 0) || 1;
                        let cumulativePercent = 0;
                        return pharmacyData.map((item, index) => {
                          if (item.value === 0) return null;
                          const percent = item.value / total;
                          const dasharray = `${percent * 283} 283`;
                          const offset = cumulativePercent * 283;
                          cumulativePercent += percent;
                          
                          return (
                            <circle
                              key={index}
                              cx="50"
                              cy="50"
                              r="45"
                              fill="transparent"
                              stroke={item.color}
                              strokeWidth="10"
                              strokeDasharray={dasharray}
                              strokeDashoffset={-offset}
                              className="transition-all duration-1000"
                            />
                          );
                        });
                      })()}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-2xl sm:text-3xl font-bold text-gray-800">
                        {pharmacyData.reduce((acc, curr) => acc + curr.value, 0)}
                      </span>
                      <span className="text-xs text-gray-500 font-medium">Pharmacies</span>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-6 justify-center flex-wrap">
                    {pharmacyData.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-xs font-medium text-gray-600">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 font-medium">No pharmacy data available</div>
              )}
            </div>
          </div>
        </div>
      )}

      {isPharmacies && (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-8 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 py-5 border-b border-gray-100 gap-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Pharmacy Management</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {displayedPharmacies.length} pharmacies found
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={pharmacyFilter}
                    onChange={e => setPharmacyFilter(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-all appearance-none cursor-pointer"
                  >
                    <option value="all">All Pharmacies</option>
                    <option value="incomplete">Incomplete (Offline)</option>
                    <option value="pending_admin_approval">Pending Admin Approval (Combined)</option>
                    <option value="fully_verified">Fully Verified (Online)</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={nmraSearch}
                    onChange={e => setNmraSearch(e.target.value)}
                    placeholder="Search by NMRA or Name…"
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-all sm:w-56"
                  />
                </div>
              </div>
            </div>

            {loadingPharm ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-blue-500 spin" />
              </div>
            ) : displayedPharmacies.length === 0 ? (
              <div className="text-center py-16">
                <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No pharmacies found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full table-auto min-w-[800px]">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Pharmacy Info', 'Owner', 'License & Expiry', 'Pharmacist', 'Status', 'Actions'].map(h => (
                        <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {displayedPharmacies.map((p) => {
                      const isExpired = p.nmra_expiry_date && new Date(p.nmra_expiry_date) < new Date();
                      
                      return (
                      <tr key={p.pharmacy_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${p.status === 'fully_verified' ? 'bg-emerald-100' : 'bg-blue-100'}`}>
                              <Building2 className={`w-5 h-5 ${p.status === 'fully_verified' ? 'text-emerald-600' : 'text-blue-600'}`} />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                              <p className="text-xs text-gray-500 max-w-[200px] truncate">{p.address || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-800 font-medium">{p.owner_name}</p>
                          <p className="text-xs text-gray-500">{p.phone}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm text-gray-700 font-mono">{p.nmra_license || '—'}</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium ${isExpired ? 'text-red-600' : 'text-gray-500'}`}>
                                {p.nmra_expiry_date ? new Date(p.nmra_expiry_date).toLocaleDateString() : '—'}
                              </span>
                              {isExpired && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase">Expired</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {p.pharmacist_name ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-semibold text-teal-700">{p.pharmacist_name}</span>
                              <span className="text-xs font-mono text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded w-fit">SLMC: {p.slmc_number}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">No Pharmacist Linked</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {p.status === 'fully_verified' ? (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold">Fully Verified</span>
                          ) : p.status === 'pending_admin_approval' ? (
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold">Pending Approval</span>
                          ) : p.status === 'rejected' ? (
                            <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-semibold">Rejected</span>
                          ) : (
                            <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold">Incomplete</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            {p.status === 'pending_admin_approval' && (
                              <>
                                <button
                                  onClick={() => handleApprove(p.pharmacy_id, 'approve')}
                                  disabled={approvingId === p.pharmacy_id}
                                  className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition-all hover:shadow-sm disabled:opacity-50">
                                  {approvingId === p.pharmacy_id ? '...' : 'Approve'}
                                </button>
                                <button
                                  onClick={() => handleApprove(p.pharmacy_id, 'reject')}
                                  disabled={approvingId === p.pharmacy_id}
                                  className="px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-semibold transition-all hover:shadow-sm disabled:opacity-50">
                                  Reject
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleViewStaff(p)}
                              className="flex items-center gap-1.5 px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-all">
                              <Users className="w-3.5 h-3.5" /> Staff
                            </button>
                            <button
                              onClick={() => setViewPharmacyDetails(p)}
                              className="flex items-center gap-1.5 px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-all">
                              <ClipboardList className="w-3.5 h-3.5" /> Review
                            </button>

                          </div>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pharmacy Staff View Modal */}
          {viewStaffPharmacy && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-4 sm:p-6 my-auto max-h-[90vh] overflow-y-auto">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Staff for {viewStaffPharmacy.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{viewStaffPharmacy.address}</p>
                  </div>
                  <button onClick={() => setViewStaffPharmacy(null)} className="text-gray-400 hover:text-gray-600 bg-gray-100 rounded-lg p-2 shrink-0">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {loadingStaff ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-blue-500 spin" /></div>
                ) : pharmacyStaff.length === 0 ? (
                  <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 font-medium">No staff assigned to this pharmacy yet.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Pharmacists */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Pharmacists</h4>
                      <div className="space-y-3">
                        {pharmacyStaff.filter(s => s.role === 'pharmacist').length === 0 ? (
                          <p className="text-xs text-gray-400 italic pl-2">No pharmacists registered.</p>
                        ) : (
                          pharmacyStaff.filter(s => s.role === 'pharmacist').map(staff => (
                            <div key={staff.user_id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl gap-3">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold bg-teal-500 shrink-0">
                                  {staff.full_name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900 text-sm">{staff.full_name}</p>
                                  <p className="text-xs text-gray-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                    <span>{staff.email}</span> • <span>{staff.phone || '—'}</span>
                                  </p>
                                  {staff.slmc_registration_number && (
                                    <p className="text-[10px] font-mono text-teal-600 mt-1 bg-teal-50 px-2 py-0.5 rounded w-fit">
                                      SLMC: {staff.slmc_registration_number}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 pt-2 sm:pt-0">
                                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-100 text-teal-700">
                                  Pharmacist
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${!staff.staff_is_active ? 'bg-red-100 text-red-700' : staff.verification_status != 1 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                  {!staff.staff_is_active ? 'Rejected' : staff.verification_status != 1 ? 'Not Verified' : 'Active'}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Stock Managers */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Stock Managers</h4>
                      <div className="space-y-3">
                        {pharmacyStaff.filter(s => s.role === 'stock_manager').length === 0 ? (
                          <p className="text-xs text-gray-400 italic pl-2">No stock managers registered.</p>
                        ) : (
                          pharmacyStaff.filter(s => s.role === 'stock_manager').map(staff => (
                            <div key={staff.user_id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl gap-3">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold bg-orange-500 shrink-0">
                                  {staff.full_name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900 text-sm">{staff.full_name}</p>
                                  <p className="text-xs text-gray-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                    <span>{staff.email}</span> • <span>{staff.phone || '—'}</span>
                                  </p>
                                </div>
                              </div>
                              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 pt-2 sm:pt-0">
                                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-orange-100 text-orange-700">
                                  Stock Manager
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${viewStaffPharmacy?.status === 'rejected' || !staff.staff_is_active ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                  {viewStaffPharmacy?.status === 'rejected' || !staff.staff_is_active ? 'Not Verified' : 'Active'}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pharmacy Details View Modal */}
          {viewPharmacyDetails && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-0 my-auto overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-gray-900">Pharmacy Verification Details</h3>
                      <p className="text-xs sm:text-sm text-gray-500">Review uploaded documents and details</p>
                    </div>
                  </div>
                  <button onClick={() => setViewPharmacyDetails(null)} className="text-gray-400 hover:text-gray-600 bg-white border border-gray-200 rounded-lg p-2 shadow-sm transition-all shrink-0">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Pharmacy Info */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">Pharmacy Information</h4>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold mb-1">Pharmacy Name</p>
                        <p className="text-sm text-gray-900 font-medium bg-gray-50 p-2.5 rounded-lg border border-gray-100">{viewPharmacyDetails.name || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold mb-1">Address</p>
                        <p className="text-sm text-gray-900 font-medium bg-gray-50 p-2.5 rounded-lg border border-gray-100">{viewPharmacyDetails.address || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold mb-1">Contact Number</p>
                        <p className="text-sm text-gray-900 font-medium bg-gray-50 p-2.5 rounded-lg border border-gray-100">{viewPharmacyDetails.phone || '—'}</p>
                      </div>
                    </div>

                    {/* Owner Info */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">Owner Details</h4>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold mb-1">Owner Name</p>
                        <p className="text-sm text-gray-900 font-medium bg-gray-50 p-2.5 rounded-lg border border-gray-100">{viewPharmacyDetails.owner_name || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold mb-1">Owner Email</p>
                        <p className="text-sm text-gray-900 font-medium bg-gray-50 p-2.5 rounded-lg border border-gray-100">{viewPharmacyDetails.owner_email || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold mb-1">Owner NIC</p>
                        <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2.5 rounded-lg border border-gray-100">{viewPharmacyDetails.owner_nic || '—'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Registration & Licenses */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">Registration & Licenses</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 font-semibold mb-1">Business Registration</p>
                        <p className="text-sm text-gray-900 font-mono bg-blue-50 text-blue-800 p-3 rounded-xl border border-blue-100">{viewPharmacyDetails.business_registration || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold mb-1">NMRA License No.</p>
                        <p className="text-sm text-gray-900 font-mono bg-blue-50 text-blue-800 p-3 rounded-xl border border-blue-100">{viewPharmacyDetails.nmra_license || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold mb-1">NMRA Expiry Date</p>
                        <p className="text-sm text-gray-900 font-medium bg-blue-50 text-blue-800 p-3 rounded-xl border border-blue-100">
                          {viewPharmacyDetails.nmra_expiry_date ? new Date(viewPharmacyDetails.nmra_expiry_date).toLocaleDateString() : '—'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Documents */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">Uploaded Documents</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {viewPharmacyDetails.license_doc_path && (
                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center gap-3 text-center">
                          <FileText className="w-8 h-8 text-blue-500" />
                          <div>
                            <p className="text-sm font-bold text-gray-900">Registration Document</p>
                          </div>
                          <button onClick={() => {
                            const list = [];
                            if (viewPharmacyDetails.license_doc_path) list.push(getMediaUrl(viewPharmacyDetails.license_doc_path));
                            try {
                              const docs = JSON.parse(viewPharmacyDetails.additional_docs);
                              if (Array.isArray(docs)) docs.forEach(d => list.push(getMediaUrl(d)));
                            } catch(e) {}
                            openDocPreview(getMediaUrl(viewPharmacyDetails.license_doc_path), list);
                          }} className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-sm">
                            <Eye className="w-4 h-4" /> View Document
                          </button>
                        </div>
                      )}
                      
                      {viewPharmacyDetails.owner_photo && (
                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center gap-3 text-center">
                          <ImageIcon className="w-8 h-8 text-indigo-500" />
                          <div>
                            <p className="text-sm font-bold text-gray-900">Owner Photo</p>
                          </div>
                          <button onClick={() => {
                            const list = [getMediaUrl(viewPharmacyDetails.owner_photo)];
                            openDocPreview(getMediaUrl(viewPharmacyDetails.owner_photo), list);
                          }} className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-sm">
                            <Eye className="w-4 h-4" /> View Photo
                          </button>
                        </div>
                      )}


                    </div>
                  </div>
                </div>
                
                {/* Modal Actions */}
                <div className="px-4 sm:px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className={`w-fit px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${viewPharmacyDetails.status === 'fully_verified' ? 'bg-emerald-100 text-emerald-700' : viewPharmacyDetails.status === 'pending_admin_approval' ? 'bg-amber-100 text-amber-700' : viewPharmacyDetails.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-600'}`}>
                    Status: {viewPharmacyDetails.status.replace(/_/g, ' ')}
                  </span>
                  
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => {
                        handleApprove(viewPharmacyDetails.pharmacy_id, 'reject');
                        setViewPharmacyDetails(null);
                      }}
                      disabled={approvingId === viewPharmacyDetails.pharmacy_id || viewPharmacyDetails.status !== 'pending_admin_approval'}
                      className="flex-1 sm:flex-initial px-4 py-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-sm font-bold transition-all disabled:opacity-50">
                      Reject
                    </button>
                    <button
                      onClick={() => {
                        handleApprove(viewPharmacyDetails.pharmacy_id, 'approve');
                        setViewPharmacyDetails(null);
                      }}
                      disabled={approvingId === viewPharmacyDetails.pharmacy_id || viewPharmacyDetails.status !== 'pending_admin_approval'}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-50">
                      <CheckCircle className="w-4 h-4" /> Approve
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pharmacist Details View Modal */}
          {viewPharmacistDetails && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-0 my-auto overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center shrink-0">
                      <UserCheck className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-gray-900">Pharmacist Details</h3>
                      <p className="text-xs text-gray-500">Review pharmacist registration details</p>
                    </div>
                  </div>
                  <button onClick={() => setViewPharmacistDetails(null)} className="text-gray-400 hover:text-gray-600 bg-white border border-gray-200 rounded-lg p-2 shadow-sm transition-all shrink-0">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">Pharmacists register using their SLMC Number. Document uploads are not required initially.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">Personal Information</h4>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold mb-1">Full Name</p>
                        <p className="text-sm text-gray-900 font-medium bg-gray-50 p-2.5 rounded-lg border border-gray-100">{viewPharmacistDetails.full_name || viewPharmacistDetails.name || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold mb-1">Email Address</p>
                        <p className="text-sm text-gray-900 font-medium bg-gray-50 p-2.5 rounded-lg border border-gray-100">{viewPharmacistDetails.email || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold mb-1">Phone Number</p>
                        <p className="text-sm text-gray-900 font-medium bg-gray-50 p-2.5 rounded-lg border border-gray-100">{viewPharmacistDetails.phone || '—'}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">Professional Details</h4>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">SLMC Registration No</label>
                        <p className="text-sm text-gray-900 font-mono bg-teal-50 text-teal-800 p-3 rounded-xl border border-teal-100">{viewPharmacistDetails.slmc_reg_number || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold mb-1">Assigned Pharmacy</p>
                        <p className="text-sm text-gray-900 font-semibold bg-blue-50 text-blue-800 p-3 rounded-xl border border-blue-100 flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-blue-500" />
                          {viewPharmacistDetails.pharmacy_name || 'Not Assigned'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Certificate / License</label>
                        {viewPharmacistDetails.certificate_path ? (
                           <button onClick={() => {
                             const list = [getMediaUrl(viewPharmacistDetails.certificate_path)];
                             openDocPreview(getMediaUrl(viewPharmacistDetails.certificate_path), list);
                           }} className="w-full flex items-center justify-center gap-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 p-3 rounded-xl transition-colors font-semibold">
                             <FileText className="w-5 h-5" /> View Certificate
                           </button>
                        ) : (
                           <p className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">Not provided</p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Pharmacist Photo</label>
                        {viewPharmacistDetails.photo_path ? (
                           <button onClick={() => {
                             const list = [getMediaUrl(viewPharmacistDetails.photo_path)];
                             openDocPreview(getMediaUrl(viewPharmacistDetails.photo_path), list);
                           }} className="w-full flex items-center justify-center gap-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 p-3 rounded-xl transition-colors font-semibold">
                             <ImageIcon className="w-5 h-5" /> View Photo
                           </button>
                        ) : (
                           <p className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">Not provided</p>
                        )}
                      </div>
                    </div>
                </div>
                
                {/* Modal Actions */}
                <div className="px-4 sm:px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className={`w-fit px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${viewPharmacistDetails.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : viewPharmacistDetails.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                    Status: {viewPharmacistDetails.status}
                  </span>
                  
                  <div className="flex gap-2 w-full sm:w-auto">
                    {viewPharmacistDetails.status === 'pending' && (
                      <>
                        <button
                          onClick={() => {
                            handlePharmacistApprove(viewPharmacistDetails.user_id, 'reject');
                            setViewPharmacistDetails(null);
                          }}
                          disabled={approvingPharmacistId === viewPharmacistDetails.user_id}
                          className="flex-1 sm:flex-initial px-5 py-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-sm font-bold transition-all disabled:opacity-50">
                          Reject
                        </button>
                        <button
                          onClick={() => {
                            handlePharmacistApprove(viewPharmacistDetails.user_id, 'approve');
                            if (viewPharmacistDetails.pharmacy_status !== 'rejected') {
                              setViewPharmacistDetails(null);
                            }
                          }}
                          disabled={approvingPharmacistId === viewPharmacistDetails.user_id}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50">
                          <CheckCircle className="w-4 h-4" /> Approve
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pharmacist Approval Table Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-8 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 py-5 border-b border-gray-100 gap-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Pharmacist Approval</h2>
                <p className="text-sm text-gray-500 mt-0.5">{pendingPharmacistsCount} pending review</p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={pharmacistFilter}
                    onChange={e => setPharmacistFilter(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-gray-50 focus:bg-white transition-all appearance-none cursor-pointer"
                  >
                    <option value="all">All Pharmacists</option>
                    <option value="pending">Pending Approval</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={pharmacistSearch}
                    onChange={e => setPharmacistSearch(e.target.value)}
                    placeholder="Search by SLMC number."
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-gray-50 focus:bg-white transition-all sm:w-52"
                  />
                </div>
                <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 text-teal-700 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {pendingPharmacistsCount} Pending
                </div>
              </div>
            </div>

            {loadingPharmacists ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-teal-500 spin" />
              </div>
            ) : filteredPharmacists.length === 0 ? (
              <div className="text-center py-16">
                <UserCheck className="w-12 h-12 text-teal-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No pharmacists found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full table-auto min-w-[750px]">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Pharmacist Info', 'Assigned Pharmacy', 'SLMC Number', 'Status', 'Actions'].map(h => (
                        <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredPharmacists.map((p) => (
                      <tr key={p.user_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center shrink-0">
                              <UserCheck className="w-5 h-5 text-teal-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">{p.full_name || p.name || '—'}</p>
                              <p className="text-xs text-gray-500">{p.email || '—'}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{p.phone || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-700 font-semibold flex items-center gap-1.5">
                            {p.pharmacy_name ? (
                              <div className="flex flex-col">
                                <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-blue-500" /> {p.pharmacy_name}</span>
                                {p.is_active == 0 && p.status === 'approved' && <span className="text-[10px] text-amber-600 font-bold uppercase mt-0.5">Unlinked by Pharmacy</span>}
                                {p.pharmacy_status === 'rejected' && <span className="text-[10px] text-red-500 font-bold uppercase mt-0.5">Rejected</span>}
                              </div>
                            ) : <span className="text-gray-400 italic">Unlinked by Pharmacy</span>}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-700 font-mono bg-teal-50 px-2 py-1 rounded text-teal-800">{p.slmc_reg_number || '—'}</span>
                        </td>
                        <td className="px-6 py-4">
                          {!p.pharmacy_id ? (
                            <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-semibold">Rejected</span>
                          ) : p.status === 'approved' ? (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold">Approved</span>
                          ) : p.status === 'rejected' ? (
                            <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-semibold">Rejected</span>
                          ) : (
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold">Pending</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => setViewPharmacistDetails(p)}
                              className="flex items-center gap-1.5 px-2 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-xs font-semibold transition-all">
                              <ClipboardList className="w-3.5 h-3.5" /> Details
                            </button>
                          {p.status === 'pending' && p.pharmacy_id ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handlePharmacistApprove(p.user_id, 'approve')}
                                disabled={approvingPharmacistId === p.user_id}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition-all disabled:opacity-50">
                                {approvingPharmacistId === p.user_id ? <Loader2 className="w-3.5 h-3.5 spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                Approve
                              </button>
                              <button
                                onClick={() => handlePharmacistApprove(p.user_id, 'reject')}
                                disabled={approvingPharmacistId === p.user_id}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-semibold transition-all disabled:opacity-50">
                                <XCircle className="w-3.5 h-3.5" />
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {isMedicines && (
        <>
          {/* Medicine Requests */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-8 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 py-5 border-b border-gray-100 gap-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Medicine Requests</h2>
                <p className="text-sm text-gray-500 mt-0.5">Requests from stock managers for new medicines</p>
              </div>
              <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 px-3 py-1.5 rounded-lg text-xs font-semibold w-fit">
                <ClipboardList className="w-3.5 h-3.5" />
                {pendingMedicineRequests.length} Pending
              </div>
            </div>

            {loadingRequests ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-orange-500 spin" />
              </div>
            ) : medicineRequests.length === 0 ? (
              <div className="text-center py-16">
                <ClipboardList className="w-12 h-12 text-orange-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No medicine requests yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full table-auto min-w-[900px]">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Medicine Name', 'Category', 'Description', 'Requested By', 'Pharmacy', 'Date', 'Status', 'Actions'].map(h => (
                        <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {medicineRequests.map((r) => (
                      <tr key={r.request_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
                              <Pill className="w-4 h-4 text-orange-600" />
                            </div>
                            <span className="font-semibold text-gray-900 text-sm">{r.medicine_name || r.name || '—'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold">{r.category || '—'}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{r.description || '—'}</td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-800 font-medium">{r.requested_by_name || r.staff_name || '—'}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{r.pharmacy_name || '—'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
                        <td className="px-6 py-4">
                          {r.status === 'approved' ? (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold">Approved</span>
                          ) : r.status === 'rejected' ? (
                            <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-semibold">Rejected</span>
                          ) : (
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold">Pending</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {r.status === 'pending' ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleMedicineRequest(r.request_id, 'approve')}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition-all">
                                <CheckCircle className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button
                                onClick={() => handleMedicineRequest(r.request_id, 'reject')}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-semibold transition-all">
                                <XCircle className="w-3.5 h-3.5" /> Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Medicine Database */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 py-5 border-b border-gray-100 gap-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Master Medicine Database</h2>
                <p className="text-sm text-gray-500 mt-0.5">{medicines.length} medicines registered</p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={medSearch}
                    onChange={e => setMedSearch(e.target.value)}
                    placeholder="Search medicines…"
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-all sm:w-52"
                  />
                </div>
                <button
                  onClick={() => {
                    setAddMedForm({ brand_name: '', generic_name: '', category: '', description: '', requires_prescription: false });
                    setShowAddMed(true);
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md">
                  <Plus className="w-4 h-4" /> Add Medicine
                </button>
              </div>
            </div>

            {loadingMed ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-blue-500 spin" />
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full table-auto min-w-[750px]">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['#', 'Medicine Name', 'Category', 'Prescription Required', 'Description', 'Actions'].map(h => (
                        <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredMeds.slice(medicinePage * 15, (medicinePage + 1) * 15).map((m, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors border-b border-gray-50">
                        <td className="px-6 py-3.5 text-xs text-gray-400 font-mono">{medicinePage * 15 + i + 1}</td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                              <Pill className="w-4 h-4 text-blue-600" />
                            </div>
                            <span className="font-semibold text-gray-900 text-sm">{m.brand_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold">{m.category || '—'}</span>
                        </td>
                        <td className="px-6 py-3.5">
                          {m.requires_prescription ? (
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold">Required</span>
                          ) : (
                            <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-semibold">OTC</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-sm text-gray-500 max-w-xs truncate">{m.description || '—'}</td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setAddMedForm(m);
                                setShowAddMed(true);
                              }}
                              className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteMedicine(m.medicine_id)}
                              className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredMeds.length === 0 && (
                  <div className="text-center py-12">
                    <Pill className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">No medicines found</p>
                  </div>
                )}
                
                {filteredMeds.length > 15 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
                    <p className="text-sm text-gray-500 font-medium">
                      Showing {medicinePage * 15 + 1} to {Math.min((medicinePage + 1) * 15, filteredMeds.length)} of {filteredMeds.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setMedicinePage(p => Math.max(0, p - 1))}
                        disabled={medicinePage === 0}
                        className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      <button 
                        onClick={() => setMedicinePage(p => Math.min(Math.ceil(filteredMeds.length / 15) - 1, p + 1))}
                        disabled={(medicinePage + 1) * 15 >= filteredMeds.length}
                        className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* User Management */}
      {isUsers && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-8 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 py-5 border-b border-gray-100 gap-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">User Management</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {filteredUsers.length} total users registered
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              {/* Role filter */}
              <div className="relative flex-1 sm:flex-initial">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={userRoleFilter}
                  onChange={e => setUserRoleFilter(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-all appearance-none cursor-pointer"
                >
                  <option value="all">All Roles</option>
                  <option value="patient">Patients</option>
                  <option value="pharmacy_owner">Owners</option>
                  <option value="pharmacist">Pharmacists</option>
                  <option value="stock_manager">Stock Managers</option>
                  <option value="admin">Administrators</option>
                </select>
              </div>
              
              {/* Search */}
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search by name, email..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-all sm:w-56"
                />
              </div>
            </div>
          </div>

          {loadingUsers ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-blue-500 spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No users found matching your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full table-auto min-w-[850px]">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['User Info', 'Role', 'Phone Number', 'Registered Date', 'Account Status', 'Actions'].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredUsers.map((u) => {
                    const isSuspended = u.account_status === 'suspended';
                    return (
                      <tr key={u.user_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-sm shrink-0 ${getAvatarBg(u.role)}`}>
                              {getUserInitials(u.full_name)}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">{u.full_name}</p>
                              <p className="text-xs text-gray-500">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {getRoleBadge(u.role)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                          {u.phone || '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-6 py-4">
                          {isSuspended ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-semibold border border-red-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                              Suspended
                            </span>
                          ) : (u.role === 'pharmacy_owner' || u.role === 'pharmacist' || u.role === 'stock_manager') && u.specific_status !== 'fully_verified' && u.specific_status !== null ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Not Verified
                            </span>
                          ) : u.is_active == 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Inactive
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {u.role === 'admin' ? (
                            <span className="text-xs text-gray-400 italic font-medium">Admin Account</span>
                          ) : u.role === 'superadmin' ? (
                            <span className="text-xs text-gray-400 italic font-medium">Super Admin Account</span>
                          ) : (
                            <button
                              onClick={() => handleToggleUserSuspension(u.user_id, u.account_status)}
                              disabled={togglingUserId === u.user_id}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                                isSuspended
                                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                              } disabled:opacity-50`}
                            >
                              {togglingUserId === u.user_id ? (
                                <Loader2 className="w-3.5 h-3.5 spin" />
                              ) : isSuspended ? (
                                <ToggleRight className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <ToggleLeft className="w-4 h-4 text-rose-600" />
                              )}
                              {isSuspended ? 'Reactivate' : 'Suspend'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Feedbacks Management */}
      {isFeedbacks && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-8 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 py-5 border-b border-gray-100 gap-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Patient Feedbacks</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Review and approve feedbacks for the Home page
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={feedbackStatusFilter}
                  onChange={e => setFeedbackStatusFilter(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-all appearance-none cursor-pointer"
                >
                  <option value="all">All Feedbacks</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>

          {loadingFeedbacks ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-blue-500 spin" />
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="text-center py-16">
              <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No feedbacks found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full table-auto min-w-[800px]">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Patient', 'Rating', 'Feedback', 'Date', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {feedbacks.filter(f => feedbackStatusFilter === 'all' || f.status === feedbackStatusFilter).map((f) => (
                    <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                            {getUserInitials(f.patient_name || 'Anonymous')}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{f.patient_name || 'Anonymous'}</p>
                            <p className="text-xs text-gray-500">{f.patient_email || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(star => (
                            <Star key={star} className={`w-4 h-4 ${star <= f.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-700 line-clamp-2 max-w-xs">{f.feedback_text}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {f.created_at ? new Date(f.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize ${
                          f.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                          f.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {f.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {f.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleFeedbackStatus(f.id, 'approved')}
                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition-all">
                                Approve
                              </button>
                              <button
                                onClick={() => handleFeedbackStatus(f.id, 'rejected')}
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-semibold transition-all">
                                Reject
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDeleteFeedback(f.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-auto"
                            title="Delete Feedback">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Medicine Modal */}
      {showAddMed && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">{addMedForm.medicine_id ? 'Edit Medicine' : 'Add to Master DB'}</h3>
              <button onClick={() => setShowAddMed(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={addMedForm.medicine_id ? handleEditMedicine : handleAddMedicine} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Brand Name *</label>
                <input required value={addMedForm.brand_name} onChange={e => setAddMedForm({ ...addMedForm, brand_name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white"
                  placeholder="e.g. Panadol" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Generic Name *</label>
                <input required value={addMedForm.generic_name} onChange={e => setAddMedForm({ ...addMedForm, generic_name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white"
                  placeholder="e.g. Paracetamol" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category *</label>
                <input required value={addMedForm.category} onChange={e => setAddMedForm({ ...addMedForm, category: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white"
                  placeholder="e.g. Antibiotic" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                <textarea value={addMedForm.description} onChange={e => setAddMedForm({ ...addMedForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white resize-none"
                  placeholder="Brief description of the medicine" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="req_rx" checked={addMedForm.requires_prescription}
                  onChange={e => setAddMedForm({ ...addMedForm, requires_prescription: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded" />
                <label htmlFor="req_rx" className="text-sm text-gray-700 font-medium cursor-pointer">Requires Prescription</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddMed(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={addingMed}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                  {addingMed ? <Loader2 className="w-4 h-4 spin" /> : (addMedForm.medicine_id ? 'Update Medicine' : <><Plus className="w-4 h-4" /> Add Medicine</>)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/90 backdrop-blur-sm" onClick={() => setPreviewDoc(null)}>
          <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
              <h3 className="font-bold text-gray-900 flex items-center gap-3">
                Document Preview
                {previewDoc.list?.length > 1 && (
                  <span className="text-xs font-medium bg-gray-200 text-gray-700 px-2 py-1 rounded-lg">
                    {previewDoc.index + 1} of {previewDoc.list.length}
                  </span>
                )}
              </h3>
              <div className="flex gap-2">
                {previewDoc.list?.length > 1 && (
                  <div className="flex items-center gap-1 mr-4 border-r border-gray-200 pr-4">
                    <button 
                      onClick={() => setPreviewDoc({ ...previewDoc, index: previewDoc.index > 0 ? previewDoc.index - 1 : previewDoc.list.length - 1, url: previewDoc.list[previewDoc.index > 0 ? previewDoc.index - 1 : previewDoc.list.length - 1] })}
                      className="p-1.5 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                      title="Previous Document"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setPreviewDoc({ ...previewDoc, index: previewDoc.index < previewDoc.list.length - 1 ? previewDoc.index + 1 : 0, url: previewDoc.list[previewDoc.index < previewDoc.list.length - 1 ? previewDoc.index + 1 : 0] })}
                      className="p-1.5 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                      title="Next Document"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
                <a href={typeof previewDoc === 'string' ? previewDoc : previewDoc.url} target="_blank" rel="noreferrer" className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors" title="Open in new tab">
                  <ExternalLink className="w-5 h-5" />
                </a>
                <button onClick={() => setPreviewDoc(null)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto flex items-center justify-center bg-gray-100/50 flex-1 min-h-[50vh] w-full relative">
              {previewDoc.list?.length > 1 && (
                <>
                  <button onClick={() => setPreviewDoc({ ...previewDoc, index: previewDoc.index > 0 ? previewDoc.index - 1 : previewDoc.list.length - 1, url: previewDoc.list[previewDoc.index > 0 ? previewDoc.index - 1 : previewDoc.list.length - 1] })} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/80 hover:bg-white text-gray-800 rounded-full shadow-lg backdrop-blur-sm transition-all z-10">
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button onClick={() => setPreviewDoc({ ...previewDoc, index: previewDoc.index < previewDoc.list.length - 1 ? previewDoc.index + 1 : 0, url: previewDoc.list[previewDoc.index < previewDoc.list.length - 1 ? previewDoc.index + 1 : 0] })} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/80 hover:bg-white text-gray-800 rounded-full shadow-lg backdrop-blur-sm transition-all z-10">
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
              {((typeof previewDoc === 'string' ? previewDoc : previewDoc.url) || '').toLowerCase().endsWith('.pdf') ? (
                <iframe src={typeof previewDoc === 'string' ? previewDoc : previewDoc.url} className="w-full h-full min-h-[75vh] border-0 rounded-lg shadow-sm bg-white relative z-0" title="PDF Preview" />
              ) : (
                <>
                  <img src={typeof previewDoc === 'string' ? previewDoc : previewDoc.url} alt="Document Preview" className="max-w-full max-h-[75vh] object-contain shadow-sm bg-white relative z-0" onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                  <div style={{display: 'none'}} className="flex-col items-center justify-center text-center p-8 relative z-0">
                    <AlertCircle className="w-16 h-16 text-amber-500 mb-4 mx-auto" />
                    <h4 className="text-lg font-bold text-gray-900 mb-2">Unable to display preview</h4>
                    <p className="text-gray-500 max-w-sm mb-6">This document format might not be previewable directly in the browser.</p>
                    <a href={typeof previewDoc === 'string' ? previewDoc : previewDoc.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-sm">
                      <ExternalLink className="w-5 h-5" /> Open Document
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}