import { useState, useMemo, useEffect } from 'react';
import {
  Package,
  AlertTriangle,
  Timer,
  Layers,
  Search,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import Card from '../../../../components/common/Card';
import { inventoryApi } from '../../../../services/pharmacistApi';

const statConfig = [
  {
    label: 'Total Items',
    valueKey: 'totalItems',
    icon: Package,
    iconBg: 'bg-sky-50',
    iconColor: 'text-sky-600',
    borderColor: 'border-l-sky-400',
  },
  {
    label: 'Low Stock Items',
    valueKey: 'lowStock',
    icon: AlertTriangle,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    borderColor: 'border-l-amber-400',
  },
  {
    label: 'Expiring Soon',
    valueKey: 'expiringSoon',
    icon: Timer,
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-500',
    borderColor: 'border-l-rose-400',
  },
  {
    label: 'Categories',
    valueKey: 'categories',
    icon: Layers,
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-500',
    borderColor: 'border-l-violet-400',
  },
];

const statusConfig = {
  'in-stock': {
    label: 'In Stock',
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-50 text-emerald-700',
  },
  'low-stock': {
    label: 'Low Stock',
    dot: 'bg-amber-500',
    bg: 'bg-amber-50 text-amber-700',
  },
  critical: {
    label: 'Critical',
    dot: 'bg-rose-500',
    bg: 'bg-rose-50 text-rose-700',
  },
  'out-of-stock': {
    label: 'Out of Stock',
    dot: 'bg-gray-400',
    bg: 'bg-gray-100 text-gray-600',
  },
  'expiring-soon': {
    label: 'Expiring Soon',
    dot: 'bg-orange-500',
    bg: 'bg-orange-50 text-orange-700',
  },
};

export default function InventoryContent() {
  let [search, setSearch] = useState('');
  let [categoryFilter, setCategoryFilter] = useState('All');
  let [sortBy, setSortBy] = useState('name');
  let [medicineStock, setMedicineStock] = useState([]);
  let [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInventory();
  }, []);

  async function loadInventory() {
    setLoading(true);
    try {
      // get_stock.php now returns one row per medicine from pharmacy_inventory JOIN master_medicines.
      // total_quantity = aggregate stock count (same table the Stock Manager writes to).
      // So any batch the Stock Manager adds will appear here immediately.
      const stockRes = await inventoryApi.getStock();
      setMedicineStock(stockRes.data || []);
    } catch (e) {
      console.error('Failed to load inventory:', e);
    } finally {
      setLoading(false);
    }
  }

  const categories = useMemo(() => {
    const cats = new Set();
    medicineStock.forEach((item) => {
      if (item.category) cats.add(item.category);
    });
    return ['All', ...Array.from(cats).sort()];
  }, [medicineStock]);

  const inventoryStats = useMemo(() => {
    const total = medicineStock.length;
    const low = medicineStock.filter(
      item => parseInt(item.total_quantity, 10) <= 10 && parseInt(item.total_quantity, 10) > 0
    ).length;
    const now = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    // Count medicines where the nearest batch expires within 30 days
    const expiring = medicineStock.filter(item => {
      if (!item.nearest_expiry) return false;
      const exp = new Date(item.nearest_expiry);
      return exp >= now && exp <= thirtyDaysLater;
    }).length;
    return {
      totalItems: total,
      lowStock: low,
      expiringSoon: expiring,
      categories: categories.length - 1,
    };
  }, [medicineStock, categories]);

  let filtered = useMemo(() => {
    return medicineStock
      .filter(item => {
        let matchSearch =
          !search ||
          (item.brand_name || '').toLowerCase().includes(search.toLowerCase()) ||
          (item.generic_name || '').toLowerCase().includes(search.toLowerCase()) ||
          (item.category || '').toLowerCase().includes(search.toLowerCase());
        let matchCategory = categoryFilter === 'All' || item.category === categoryFilter;
        return matchSearch && matchCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'name')  return (a.brand_name || '').localeCompare(b.brand_name || '');
        if (sortBy === 'stock') return parseInt(a.total_quantity || 0) - parseInt(b.total_quantity || 0);
        if (sortBy === 'price') return parseFloat(b.unit_price || 0) - parseFloat(a.unit_price || 0);
        return 0;
      });
  }, [search, categoryFilter, sortBy, medicineStock]);

  // Status is now computed by the backend (get_stock.php) and returned as stock_status.
  // We keep a client-side fallback for any edge cases.
  function getStatus(item) {
    if (item.stock_status) return item.stock_status;
    const qty = parseInt(item.total_quantity || 0);
    if (qty <= 0) return 'out-of-stock';
    if (qty <= 5) return 'critical';
    if (qty <= 10) return 'low-stock';
    return 'in-stock';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statConfig.map((stat) => {
          const Icon = stat.icon;
          const value = inventoryStats[stat.valueKey];
          return (
            <Card
              key={stat.valueKey}
              className={`border-l-4 ${stat.borderColor}`}
              padding={false}
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-3xl font-bold text-gray-900">
                      {String(value).padStart(2, '0')}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
                  </div>
                  <div className={`p-2.5 rounded-xl ${stat.iconBg}`}>
                    <Icon className={`w-5 h-5 ${stat.iconColor}`} />
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-5 pb-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-gray-900">
              Stock Inventory
              <span className="text-sm font-normal text-gray-400 ml-2">
                ({filtered.length} items)
              </span>
            </h2>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, ID, category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full sm:w-64 pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/30 focus:border-[#1A73E8]"
                />
              </div>

              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/30 focus:border-[#1A73E8] cursor-pointer"
                >
                  <option value="name">Sort: Name</option>
                  <option value="stock">Sort: Stock</option>
                  <option value="price">Sort: Price</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              {/* Add Item button removed - pharmacists cannot add new medicines */}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-4 pb-4 border-b border-gray-100">
            <span className="text-xs font-medium text-gray-500 mr-1">Category:</span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-[#1A73E8] text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">
                  Item
                </th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">
                  Category
                </th>
                <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">
                  Stock
                </th>
                <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">
                  Unit Price
                </th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">
                  Batch
                </th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">
                  Expiry (FEFO)
                </th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">
                    <Package className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    No inventory items found
                  </td>
                </tr>
              ) : (
                  filtered.map((item, index) => {
                  const status = statusConfig[getStatus(item)] || statusConfig['in-stock'];
                  return (
                    <tr
                      key={item.medicine_id || index}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[#1A73E8]/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-[#1A73E8]">
                              {(item.brand_name || 'M').charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 truncate max-w-48">
                              {item.brand_name || 'Unknown'}
                            </p>
                            <p className="text-[11px] text-gray-400">{item.generic_name || ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs text-gray-600">{item.category || 'General'}</span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {item.total_quantity || 0}
                        </p>
                        <p className="text-[10px] text-gray-400">units</p>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <p className="text-sm font-medium text-gray-900">
                          Rs. {parseFloat(item.unit_price || 0).toLocaleString()}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs font-mono text-gray-500">
                          {item.batch_number || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-700">
                          {item.nearest_expiry
                            ? new Date(item.nearest_expiry).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                            : 'N/A'}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${status.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Showing {filtered.length} of {medicineStock.length} items
          </p>
          <div className="flex items-center gap-1">
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              In Stock
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-400 ml-3">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Low Stock
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-400 ml-3">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Critical
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-400 ml-3">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              Out of Stock
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
