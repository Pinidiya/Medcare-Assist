import { useState, useMemo, useEffect } from 'react';
import {
  ShoppingBag,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  FileText,
  Package,
  Calendar,
  Loader2,
  Eye,
} from 'lucide-react';
import Card from '../../../../components/common/Card';
import Button from '../../../../components/common/Button';
import { dashboardApi } from '../../../../services/pharmacistApi';
import OrderDetailsModal from './OrderDetailsModal';

const statusConfig = {
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    ring: 'ring-emerald-600/20',
  },
  // DB: 'Completed'
  Completed: {
    label: 'Completed',
    icon: CheckCircle2,
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    ring: 'ring-emerald-600/20',
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    ring: 'ring-amber-600/20',
  },
  // DB reservation statuses that are effectively pending
  Pending: { label: 'Pending', icon: Clock, bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-600/20' },
  pending_pickup: { label: 'Pending Pickup', icon: Clock, bg: 'bg-cyan-50', text: 'text-cyan-700', ring: 'ring-cyan-600/20' },
  bill_generated: { label: 'Bill Generated', icon: Clock, bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-600/20' },
  quoted: { label: 'Quoted', icon: Clock, bg: 'bg-indigo-50', text: 'text-indigo-700', ring: 'ring-indigo-600/20' },
  Reserved: { label: 'Reserved', icon: Package, bg: 'bg-purple-50', text: 'text-purple-700', ring: 'ring-purple-600/20' },
  paid: { label: 'Paid', icon: CheckCircle2, bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-600/20' },
  processing: {
    label: 'Processing',
    icon: Package,
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    ring: 'ring-blue-600/20',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    ring: 'ring-rose-600/20',
  },
  // DB: 'Rejected' maps to cancelled display
  Rejected: { label: 'Rejected', icon: XCircle, bg: 'bg-rose-50', text: 'text-rose-700', ring: 'ring-rose-600/20' },
};

function OrderStatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${config.bg} ${config.text} ${config.ring}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}

function SummaryCard({ icon: Icon, label, value, color, bgColor, borderColor }) {
  return (
    <Card className={`border-l-4 ${borderColor}`} padding={false}>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-3xl font-bold text-gray-900">
              {String(value).padStart(2, '0')}
            </p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </div>
          <div className={`p-3 rounded-xl ${bgColor}`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function OrderHistoryContent() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ordersList, setOrdersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    setLoading(true);
    try {
      const data = await dashboardApi.getOrderHistory();
      setOrdersList(data.data || []);
    } catch (e) {
      console.error('Failed to load orders:', e);
    } finally {
      setLoading(false);
    }
  }

  const orderStats = useMemo(() => {
    const total     = ordersList.length;
    const completed = ordersList.filter((o) => o.display_status === 'completed').length;
    const pending   = ordersList.filter((o) => o.display_status === 'pending').length;
    const cancelled = ordersList.filter((o) => o.display_status === 'cancelled').length;
    return { totalOrders: total, completed, pending, cancelled };
  }, [ordersList]);

  const filteredOrders = useMemo(() => {
    return ordersList.filter((order) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (order.patient_name || '').toLowerCase().includes(q) ||
        (order.patient_email || '').toLowerCase().includes(q) ||
        String(order.order_id).includes(q);

      // Use normalized display_status for filtering (from backend)
      const displayStatus = order.display_status || (order.status || '').toLowerCase();
      const matchesStatus = !statusFilter || displayStatus === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, ordersList]);

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'completed', label: 'Completed' },
    { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  function handleViewOrder(order) {
    setSelectedOrder(order);
    setShowModal(true);
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
        <SummaryCard
          icon={ShoppingBag}
          label="Total Orders"
          value={orderStats.totalOrders}
          color="text-blue-600"
          bgColor="bg-blue-50"
          borderColor="border-l-blue-500"
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Completed"
          value={orderStats.completed}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
          borderColor="border-l-emerald-500"
        />
        <SummaryCard
          icon={Clock}
          label="Pending"
          value={orderStats.pending}
          color="text-amber-600"
          bgColor="bg-amber-50"
          borderColor="border-l-amber-500"
        />
        <SummaryCard
          icon={XCircle}
          label="Cancelled"
          value={orderStats.cancelled}
          color="text-rose-600"
          bgColor="bg-rose-50"
          borderColor="border-l-rose-500"
        />
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <h2 className="text-base font-semibold text-gray-900">
            All Orders
            <span className="text-sm font-normal text-gray-400 ml-2">
              ({filteredOrders.length})
            </span>
          </h2>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Patient or Order ID..."
                className="w-full sm:w-64 pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/30 focus:border-[#1A73E8] transition-shadow"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/30 focus:border-[#1A73E8] transition-shadow cursor-pointer"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <ShoppingBag className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-gray-400 text-sm font-medium">No orders match your search</p>
            <p className="text-gray-300 text-xs mt-1">Try adjusting your search or filter</p>
          </div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-3">
                      {filteredOrders[0]?.type === 'reservation' ? 'Reservation ID' : 'Order ID'}
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-3">Patient Name</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-3">Type</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-3">Status</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-3">Date</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-3">Amount</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr
                      key={order.order_id}
                      className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors group cursor-pointer"
                      onClick={() => handleViewOrder(order)}
                    >
                      <td className="py-4 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-lg bg-linear-to-br from-[#1A73E8] to-[#1557B0] flex items-center justify-center text-white shadow-sm group-hover:shadow-md transition-shadow">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">#{order.order_id}</p>
                            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{order.type || 'Order'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-linear-to-br from-[#1A73E8] to-[#1557B0] flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                            {(order.patient_name || 'U').split(' ').map((n) => n[0]).join('')}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{order.patient_name || 'Unknown'}</p>
                            <p className="text-[11px] text-gray-400">{order.patient_email || ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-3">
                        <span className="text-xs font-medium text-gray-600 capitalize">{order.type || 'order'}</span>
                      </td>
                      <td className="py-4 px-3">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="py-4 px-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-sm text-gray-700">
                            {order.created_at ? new Date(order.created_at).toLocaleDateString() : ''}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-3 text-right">
                        <span className="text-sm font-bold text-gray-900">
                          Rs. {parseFloat(order.total_amount || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleViewOrder(order); }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1A73E8] text-white text-[11px] font-semibold rounded-lg hover:bg-[#1557B0] shadow-sm cursor-pointer transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden">
              {filteredOrders.map((order) => (
                <div
                  key={order.order_id}
                  onClick={() => handleViewOrder(order)}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-lg hover:border-gray-200 transition-all duration-200 group cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-linear-to-br from-[#1A73E8] to-[#1557B0] flex items-center justify-center text-white shadow-sm">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">#{order.order_id}</p>
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{order.type || 'Order'}</p>
                      </div>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>

                  <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50/70 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-[#1A73E8] to-[#1557B0] flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
                      {(order.patient_name || 'U').split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{order.patient_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-400">{order.patient_email || ''}</p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700 font-medium">
                        {order.created_at ? new Date(order.created_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Amount:</span>
                      <span className="text-sm font-bold text-gray-900">
                        Rs. {parseFloat(order.total_amount || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleViewOrder(order); }}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#1A73E8] text-white text-xs font-semibold rounded-lg hover:bg-[#1557B0] shadow-sm cursor-pointer transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View Details
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {filteredOrders.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-4">
            <p className="text-xs text-gray-400">
              Showing {filteredOrders.length} of {ordersList.length} orders
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <span className="text-xs text-gray-500 px-2">Page 1 of 1</span>
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {showModal && selectedOrder && (
        <OrderDetailsModal
          orderId={selectedOrder.order_id}
          orderType={selectedOrder.type || 'order'}
          onClose={() => { setShowModal(false); setSelectedOrder(null); }}
          onOrderSent={() => {
            loadOrders();
            setShowModal(false);
            setSelectedOrder(null);
          }}
        />
      )}
    </div>
  );
}
