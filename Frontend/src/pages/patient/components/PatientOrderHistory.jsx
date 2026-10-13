import { useState, useEffect } from 'react';
import { Package, Loader2, CheckCircle, Store, Box, Calendar, ShoppingCart, FileText, BookMarked, MapPin, Activity } from 'lucide-react';
import patientBannerImg from '../../../assets/patient banner.png';

const API = import.meta.env.VITE_API_BASE_URL;

export default function PatientOrderHistory() {
  const [history, setHistory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [healthSummary, setHealthSummary] = useState({ orders: 0, prescriptions: 0, saved: 0, addresses: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/patient/get_order_history.php`, { credentials: 'include' }).then(r => r.json()),
      fetch(`${API}/patient/get_dashboard.php`, { credentials: 'include' }).then(r => r.json())
    ])
    .then(([historyData, dashboardData]) => {
      if (historyData.status === 'success') {
        setHistory(historyData.data || []);
      }
      if (dashboardData.status === 'success' && dashboardData.data) {
        setOrders(dashboardData.data.recent_orders || []);
        setHealthSummary({
          orders: dashboardData.data.total_orders || 0,
          prescriptions: dashboardData.data.total_prescriptions || 0,
          saved: 0,
          addresses: 0,
        });
      }
    })
    .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-10 h-10 text-teal-500 spin" />
      </div>
    );
  }

  const orderStatusColors = {
    'pending': 'bg-amber-100 text-amber-700',
    'processing': 'bg-blue-100 text-blue-700',
    'ready': 'bg-indigo-100 text-indigo-700',
    'delivered': 'bg-green-100 text-green-700',
    'cancelled': 'bg-red-100 text-red-700',
    'Completed': 'bg-blue-100 text-blue-700',
    'Rejected': 'bg-red-100 text-red-700',
  };

  const orderStatusData = [
    { name: 'Pending', count: orders.filter(o => o.status === 'pending').length, color: '#f59e0b' },
    { name: 'Processing', count: orders.filter(o => o.status === 'processing').length, color: '#3b82f6' },
    { name: 'Completed', count: orders.filter(o => o.status === 'completed' || o.status === 'delivered').length, color: '#10b981' },
    { name: 'Cancelled', count: orders.filter(o => o.status === 'cancelled').length, color: '#ef4444' }
  ].filter(d => d.count > 0);

  const displayStatusData = orderStatusData;
  const currentMonth = new Date().toLocaleString('default', { month: 'short' });
  const monthlyOrders = [
    { month: currentMonth, count: orders.length }
  ];

  if (history.length === 0 && orders.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 flex flex-col items-center justify-center text-center animate-fadeIn">
        <Package className="w-16 h-16 text-gray-200 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">No Order History</h2>
        <p className="text-gray-500">You don't have any completed orders yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-[#f0f5fa] rounded-3xl overflow-hidden relative shadow-sm border border-blue-100/50 flex flex-col md:flex-row items-stretch justify-between min-h-[160px]">
        <div className="p-5 md:p-6 flex-1 w-full md:pr-0 z-10 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shadow-sm">
              <Package className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-extrabold text-[#1e293b]">Order History</h2>
          </div>
          <p className="text-gray-500 text-xs mb-4 max-w-md">
            Review your past completed orders and purchased medicines.
          </p>
        </div>
        <div className="w-full md:w-[35%] h-40 md:h-[220px] absolute md:relative right-0 bottom-0 pointer-events-none flex justify-end">
          <img src={patientBannerImg} alt="Order History" className="h-full object-cover md:object-contain object-right w-full opacity-30 md:opacity-100" style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 20%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 20%)' }} />
        </div>
      </div>

      {/* 2. Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Orders Bar Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-700 mb-6">Orders Overview</h3>
          <div className="flex flex-col justify-end h-48 gap-4 px-2">
            <div className="flex items-end justify-around h-full border-b border-gray-100 pb-2">
              {monthlyOrders.map((entry, index) => {
                const maxCount = Math.max(...monthlyOrders.map(d => d.count)) || 1;
                const heightPx = (entry.count / maxCount) * 140; // max height 140px
                return (
                  <div key={index} className="flex flex-col items-center justify-end group w-8">
                    <div className="text-xs font-bold text-blue-600 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {entry.count}
                    </div>
                    <div 
                      className="w-full rounded-t-md bg-blue-500 transition-all duration-500 hover:bg-blue-600" 
                      style={{ height: `${Math.max(heightPx, 4)}px` }}
                    ></div>
                    <div className="text-[10px] font-bold text-gray-400 mt-2">{entry.month}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Order Status Doughnut Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Order Status</h3>
          <div className="h-48 flex items-center justify-center relative">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                {(() => {
                  const total = displayStatusData.reduce((acc, curr) => acc + curr.count, 0) || 1;
                  let cumulativePercent = 0;
                  return displayStatusData.map((item, index) => {
                    if (item.count === 0) return null;
                    const percent = item.count / total;
                    const dasharray = `${percent * 283} 283`;
                    const offset = cumulativePercent * 283;
                    cumulativePercent += percent;
                    return (
                      <circle
                        key={index} cx="50" cy="50" r="45" fill="transparent"
                        stroke={item.color} strokeWidth="10"
                        strokeDasharray={dasharray} strokeDashoffset={-offset}
                        className="transition-all duration-1000"
                      />
                    );
                  });
                })()}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-2xl font-bold text-gray-800">
                  {displayStatusData.reduce((acc, curr) => acc + curr.count, 0)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 justify-center flex-wrap mt-2">
            {displayStatusData.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-[10px] font-medium text-gray-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Health Summary */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-500" /> My Health Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Orders', value: healthSummary.orders, icon: ShoppingCart, color: 'bg-blue-50 text-blue-600', path: '/patient/reservations' },
            { label: 'Prescriptions', value: healthSummary.prescriptions, icon: FileText, color: 'bg-teal-50 text-teal-600', path: '/patient/prescriptions' },
            { label: 'Saved Meds', value: healthSummary.saved, icon: BookMarked, color: 'bg-purple-50 text-blue-600', path: '/patient/reminders' },
            { label: 'Addresses', value: healthSummary.addresses, icon: MapPin, color: 'bg-amber-50 text-amber-600', path: '/patient' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className={`w-full ${color.split(' ')[0]} rounded-xl p-4 text-center transition-transform`}>
              <Icon className={`w-6 h-6 ${color.split(' ')[1]} mx-auto mb-2`} />
              <p className="text-3xl font-extrabold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 font-medium mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 mt-8">
        <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2 mb-4">
          <CheckCircle className="w-5 h-5 text-teal-600" /> Completed Orders
        </h3>
        {history.map((order, idx) => (
          <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-gray-500 font-semibold mb-1">ORDER ID</p>
                <p className="font-mono font-bold text-gray-900">#{order.order_id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold mb-1">DATE COMPLETED</p>
                <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {new Date(order.updated_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold mb-1">PHARMACY</p>
                <p className="text-sm font-bold text-teal-700 flex items-center gap-1.5">
                  <Store className="w-4 h-4" /> {order.pharmacy_name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 font-semibold mb-1">TOTAL AMOUNT</p>
                <p className="font-bold text-gray-900 text-lg">Rs. {order.total_amount}</p>
              </div>
            </div>
            
            <div className="px-4 py-3">
              <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Box className="w-4 h-4 text-gray-400" /> Items Purchased
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5 p-2 rounded-xl border border-gray-100 bg-gray-50">
                      <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0 text-teal-600 font-bold text-sm">
                        {item.quantity}x
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm line-clamp-1">{item.brand_name}</p>
                        <p className="text-xs text-gray-500 line-clamp-1">{item.generic_name}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No items recorded.</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
