import { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Loader2,
  X,
  Sun,
  Sunset,
  Moon,
  Trash2,
  ShoppingCart,
  Calendar,
  User,
  Phone,
  Clock} from 'lucide-react';
import { dashboardApi} from '../../../../services/pharmacistApi';
import GeneratedBill from '../../../../components/common/GeneratedBill';
import { getMedicineUnit } from '../../../../utils/medicineUnit';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const timingOptions = [
  { key: 'morning', label: 'Morning', icon: Sun, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', activeBg: 'bg-amber-100' },
  { key: 'afternoon', label: 'Afternoon', icon: Sunset, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200', activeBg: 'bg-orange-100' },
  { key: 'night', label: 'Night', icon: Moon, color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-200', activeBg: 'bg-indigo-100' },
];

function DosageTiming({ timing, onChange }) {
  return (
    <div className="flex gap-1.5">
      {timingOptions.map(({ key, label, icon: Icon, color, bg, border, activeBg }) => {
        const active = timing[key] > 0;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key, active ? 0 : 1)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
              active
                ? `${activeBg} ${border} ${color}`
                : `bg-white border-gray-200 text-gray-400 hover:bg-gray-50`
            }`}
            title={`${label} dose`}
          >
            <Icon className="w-3 h-3" />
            {active ? timing[key] : label}
          </button>
        );
      })}
    </div>
  );
}

function MedicineSearchResults({ results, searching, onSelect }) {
  if (!results.length && !searching) return null;
  return (
    <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto mb-3">
      {searching && (
        <div className="flex items-center justify-center py-3 gap-2">
          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          <span className="text-xs text-gray-400">Searching...</span>
        </div>
      )}
      {results.map((med) => (
        <button
          key={med.medicine_id}
          onClick={() => onSelect(med)}
          className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center justify-between text-xs border-b border-gray-50 last:border-0 cursor-pointer transition-colors"
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-800 truncate">{med.brand_name}</p>
            <p className="text-gray-400 truncate">{med.generic_name} | Stock: {med.stock_quantity}</p>
          </div>
          <span className="text-[#1A73E8] font-semibold shrink-0 ml-2">
            Rs. {parseFloat(med.unit_price).toFixed(2)}
          </span>
        </button>
      ))}
    </div>
  );
}

function OrderItemCard({ item, onUpdateTiming, onUpdateDays, onRemove }) {
  const days = item.days || 1;
  const timing = item.timing || { morning: 0, afternoon: 0, night: 0 };
  const dosesPerDay = (timing.morning || 0) + (timing.afternoon || 0) + (timing.night || 0);
  const totalQty = dosesPerDay * days;
  const subtotal = totalQty * item.unit_price;

  return (
    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-gray-800 truncate">{item.brand_name}</p>
          <p className="text-[10px] text-gray-400">{item.generic_name}</p>
        </div>
        <button
          onClick={() => onRemove(item.medicine_id)}
          className="text-gray-300 hover:text-red-500 cursor-pointer shrink-0 p-1 rounded hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <DosageTiming
        timing={timing}
        onChange={(period, count) => onUpdateTiming(item.medicine_id, period, count)}
      />

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3 h-3 text-gray-400" />
          <span className="text-[10px] text-gray-500 font-medium">Days:</span>
        </div>
        <input
          type="number"
          min={1}
          max={90}
          value={days}
          onChange={(e) => onUpdateDays(item.medicine_id, Math.max(1, parseInt(e.target.value) || 1))}
          className="w-14 px-2 py-1 bg-white border border-gray-200 rounded-md text-xs text-center font-medium focus:outline-none focus:ring-1 focus:ring-[#1A73E8]/30"
        />
        <span className="text-[10px] text-gray-400">|</span>
        <span className="text-[10px] text-gray-500">
          Total: <span className="font-bold text-gray-700">{totalQty}</span> {getMedicineUnit(item, totalQty)}
        </span>
        <span className="ml-auto text-xs font-bold text-gray-800">
          Rs. {subtotal.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

export default function OrderDetailsModal({ orderId, orderType, onClose }) {
  const [loading, setLoading] = useState(true);
  const [orderData, setOrderData] = useState(null);
  const [error, setError] = useState('');
  const [orderItems, setOrderItems] = useState([]);
  const searchTimerRef = useRef(null);

  useEffect(() => {
    loadOrderDetails();
  }, [orderId, orderType]);

  async function loadOrderDetails() {
    setLoading(true);
    setError('');
    try {
      const data = await dashboardApi.getOrderDetails(orderType, orderId);
      if (data.status === 'success' && data.data) {
        setOrderData(data.data);
        // Pre-fill existing items if any
        if (data.data.items && data.data.items.length > 0) {
          setOrderItems(data.data.items.map((item) => ({
            medicine_id: item.medicine_id || item.item_id,
            brand_name: item.brand_name,
            generic_name: item.generic_name,
            quantity: item.quantity || 1,
            unit_price: parseFloat(item.unit_price) || 0,
            days: 1,
            timing: { morning: 1, afternoon: 0, night: 0 }})));
        }
      } else {
        setError(data.message || 'Failed to load order details');
      }
    } catch (e) {
      setError(e.message || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  }

  const total = orderItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  const prescriptionUrl = orderData?.prescription_url
    ? `${API_BASE_URL}/shared/view_file.php?file=${encodeURIComponent(orderData.prescription_url)}`
    : '';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1A73E8] to-[#1557B0] flex items-center justify-center text-white shadow-sm">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-sm">
                View Order Details
              </h3>
              <p className="text-[10px] text-gray-400">
                {orderType === 'reservation' ? 'Reservation' : 'Order'} #{orderId} {orderData?.patient_name ? `— ${orderData.patient_name}` : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 cursor-pointer transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-[#1A73E8] animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-400">Loading order details...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <div className="text-center">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-red-500">{error}</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-x divide-gray-100">
            {/* Left: Prescription + Patient Info */}
            <div className="p-4 overflow-y-auto">
              {/* Patient Info */}
              <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <User className="w-3 h-3" /> Patient Information
                </h4>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-500">Name</span>
                    <span className="text-[11px] font-semibold text-gray-800">{orderData?.patient_name}</span>
                  </div>
                  {orderData?.patient_phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</span>
                      <span className="text-[11px] font-semibold text-gray-800">{orderData.patient_phone}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Date</span>
                    <span className="text-[11px] font-semibold text-gray-800">
                      {orderData?.created_at ? new Date(orderData.created_at).toLocaleDateString() : ''}
                    </span>
                  </div>
                  {orderData?.total_amount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-500">Amount</span>
                      <span className="text-[11px] font-bold text-[#1A73E8]">Rs. {parseFloat(orderData.total_amount).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Prescription */}
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Patient Prescription</h4>
              {prescriptionUrl ? (
                <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                  {prescriptionUrl.toLowerCase().endsWith('.pdf') ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
                      <FileText className="w-10 h-10" />
                      <p className="text-sm">PDF Prescription</p>
                      <a
                        href={prescriptionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#1A73E8] underline cursor-pointer"
                      >
                        Open in new tab
                      </a>
                    </div>
                  ) : (
                    <img
                      src={prescriptionUrl}
                      alt="Patient Prescription"
                      className="w-full h-auto object-contain max-h-[400px]"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  )}
                  <div className="hidden flex-col items-center justify-center py-12 text-gray-400 gap-2">
                    <FileText className="w-8 h-8" />
                    <p className="text-sm">Unable to load prescription</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400 rounded-xl border border-dashed border-gray-200">
                  <FileText className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">No prescription uploaded</p>
                </div>
              )}

              {/* Existing items */}
              {orderItems.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <ShoppingCart className="w-3 h-3" /> Ordered Medications ({orderItems.length})
                  </h4>
                </div>
              )}
            </div>

            {/* Right: Billed Medicines */}
            <div className="p-4 overflow-y-auto flex flex-col bg-gray-50/50">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                Patient Bill
              </h4>

              {orderItems.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">
                  <ShoppingCart className="w-7 h-7 mx-auto mb-2 opacity-50" />
                  <p className="font-medium">No medicines found</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-2">
                  <GeneratedBill
                    compact={false}
                    pharmacyName={orderData?.pharmacy_name || 'Pharmacy'}
                    pharmacyAddress={orderData?.pharmacy_address || ''}
                    pharmacyPhone={orderData?.pharmacy_phone || ''}
                    reservationId={orderId}
                    items={orderItems}
                    totalAmount={orderData?.total_amount || total}
                    pickupPin={''}
                    createdAt={orderData?.created_at || new Date().toISOString()}
                    patientName={orderData?.patient_name || ''}
                    paymentStatus={orderData?.payment_status || orderData?.status || 'completed'}
                    showPin={false}
                  />
                </div>
              )}

              {/* Read-only Pharmacist Note (if any) */}
              {(orderData?.pharmacist_note || orderData?.notes) && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">Pharmacist Note</p>
                  <p className="text-xs text-blue-800">{orderData.pharmacist_note || orderData.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

