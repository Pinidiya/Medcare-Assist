import { useState, useMemo, useEffect, useRef } from 'react';
import {
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  Send,
  Phone,
  FileText,
  User,
  MapPin,
  ShoppingCart,
  Calendar,
  ArrowLeft,
  Loader2,
  Fingerprint,
  Eye,
  X} from 'lucide-react';
import { usePharmacyData } from '../../hooks/usePharmacyData';
import { reservationApi, inventoryApi, dashboardApi } from '../../../../services/pharmacistApi';
import { sharedApi } from '../../../../services/sharedApi';
import GeneratedBill from '../../../../components/common/GeneratedBill';
import MessageListItem, { MessageAvatar } from '../../../../components/common/MessageListItem';
import { getMedicineUnit } from '../../../../utils/medicineUnit';

const statusStyles = {
  urgent: 'bg-red-50 text-red-600 border-red-200',
  pending: 'bg-amber-50 text-amber-600 border-amber-200',
  replied: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  quoted: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  reserved: 'bg-purple-50 text-purple-600 border-purple-200',
  completed: 'bg-green-50 text-green-600 border-green-200',
  rejected: 'bg-red-50 text-red-600 border-red-200',
  bill_generated: 'bg-blue-50 text-blue-600 border-blue-200',
  paid: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  pending_pickup: 'bg-cyan-50 text-cyan-600 border-cyan-200'};

const defaultStatusStyle = 'bg-gray-50 text-gray-600 border-gray-200';

const statusLabels = {
  urgent: 'Urgent',
  pending: 'Pending',
  replied: 'Replied',
  quoted: 'Quoted',
  reserved: 'Reserved',
  completed: 'Completed',
  rejected: 'Rejected',
  bill_generated: 'Bill Generated',
  paid: 'Paid',
  pending_pickup: 'Pending Pickup'};

const defaultStatusLabel = 'Unknown';

function mapReservationStatus(status) {
  if (!status) return 'pending';
  const s = String(status).toLowerCase();
  if (s === 'pending') return 'pending';
  if (s === 'claimed') return 'pending';
  if (s === 'quoted') return 'quoted';
  if (s === 'bill_generated') return 'bill_generated';
  if (s === 'paid' || s === 'advance_paid') return 'paid';
  if (s === 'pending_pickup') return 'pending_pickup';
  if (s === 'reserved') return 'reserved';
  if (s === 'completed') return 'completed';
  if (s === 'cancelled' || s === 'rejected') return 'rejected';
  return 'pending';
}

function MetricCard({ icon: Icon, label, value, color, bgColor }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center shrink-0`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-[#0F172A]">{value}</p>
        <p className="text-sm text-[#64748B]">{label}</p>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-[#94A3B8]" />
        <span className="text-xs text-[#64748B]">{label}</span>
      </div>
      <span className="text-xs font-medium text-[#0F172A] text-right max-w-[55%] truncate">{value || 'N/A'}</span>
    </div>
  );
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

// SECURITY: Redact any pickup PIN from chat messages in the pharmacist view.
// This covers legacy messages that were sent before the security fix.
function redactPinFromMessage(text) {
  if (!text) return text;
  return text
    // Remove lines like "🔐 Pickup PIN: 1234" or "🔐 Verification PIN: 5678"
    .replace(/[🔐🔑🔒]?\s*(Pickup|Verification|Security)?\s*PIN:?\s*\d{4}\s*/gi, '[🔒 PIN hidden]')
    // Also remove standalone 4-digit sequences that look like PINs near the word PIN
    .replace(/(PIN\s*[:=]\s*)\d{4}/gi, '$1[hidden]');
}

function PinVerificationModal({ reservationId, onVerified, onClose }) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleDigitChange = (index, value) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newPin = [...pin];
      newPin[index] = value;
      setPin(newPin);
      setError('');
    }
  };

  const handleVerify = async () => {
    const fullPin = pin.join('');
    if (fullPin.length !== 4) {
      setError('Please enter a 4-digit PIN');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await reservationApi.verifyReservationPickup(reservationId, fullPin);
      if (data.status === 'success') {
        setResult('success');
        setTimeout(() => onVerified(), 1500);
      } else {
        setError(data.message || 'Invalid PIN');
      }
    } catch (e) {
      setError(e.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden" onClick={(ev) => ev.stopPropagation()}>
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
            <Fingerprint className="w-4 h-4 text-[#1A73E8]" /> Verify Pickup PIN
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-gray-500 text-center">Enter the patient's 4-digit pickup PIN to confirm order completion.</p>
          <div className="flex items-center justify-center gap-3">
            {[0, 1, 2, 3].map((i) => (
              <input
                key={i}
                type="text"
                maxLength={1}
                value={pin[i]}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all focus:outline-none ${
                  result === 'success'
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-600'
                    : pin[i]
                    ? 'border-[#1A73E8] bg-blue-50 text-gray-900'
                    : 'border-gray-200 bg-gray-50 text-gray-400'
                }`}
                placeholder="0"
                disabled={loading || result === 'success'}
              />
            ))}
          </div>
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
          {result === 'success' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <p className="text-xs text-emerald-600 font-semibold">PIN verified! Order completed.</p>
            </div>
          )}
          <button
            onClick={handleVerify}
            disabled={loading || result === 'success' || pin.join('').length !== 4}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1A73E8] text-white text-sm font-semibold rounded-lg hover:bg-[#1557B0] transition-colors shadow-sm cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
            {loading ? 'Verifying...' : 'Verify & Complete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DosageTimingRow({ timing, onChange }) {
  const periods = [
    { key: 'morning', label: 'Morning', icon: '☀️', activeClass: 'bg-amber-100 border-amber-200 text-amber-700' },
    { key: 'afternoon', label: 'Afternoon', icon: '🌤️', activeClass: 'bg-orange-100 border-orange-200 text-orange-700' },
    { key: 'night', label: 'Night', icon: '🌙', activeClass: 'bg-indigo-100 border-indigo-200 text-indigo-700' },
  ];
  return (
    <div className="flex gap-1.5 flex-wrap">
      {periods.map(({ key, label, icon, activeClass }) => {
        const qty = timing[key] || 0;
        const active = qty > 0;
        return (
          <div key={key} className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => onChange(key, active ? 0 : 1)}
              className={`flex items-center gap-1 px-2 py-1 rounded-l-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                active
                  ? activeClass
                  : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
              }`}
            >
              <span>{icon}</span>
              {active ? label : label}
            </button>
            {active && (
              <>
                <button
                  type="button"
                  onClick={() => onChange(key, Math.max(0, qty - 1))}
                  className={`px-1.5 py-1 text-xs font-bold border-y border-l-0 border-r-0 transition-all cursor-pointer ${activeClass}`}
                >−</button>
                <span className={`px-1.5 py-1 text-xs font-black border-y ${activeClass}`}>{qty}</span>
                <button
                  type="button"
                  onClick={() => onChange(key, qty + 1)}
                  className={`px-1.5 py-1 text-xs font-bold border-y border-l-0 rounded-r-lg transition-all cursor-pointer ${activeClass}`}
                >+</button>
              </>
            )}
            {!active && (
              <span className="px-1.5 py-1 text-[10px] text-gray-300 border border-l-0 rounded-r-lg bg-white border-gray-200">off</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function OrderDetailsModal({ reservationId, prescriptionUrl, chatContext, activeMessage, onClose, onBillGenerated }) {
  const initialStatus = (chatContext?.status || activeMessage?.status || activeMessage?.rawStatus || 'pending').toLowerCase();
  const initialHasQuote = (chatContext?.quote?.items && chatContext.quote.items.length > 0);
  const initialIsBilled = initialHasQuote || ['quoted', 'reserved', 'paid', 'completed', 'bill_generated', 'pending_pickup', 'claimed'].includes(initialStatus);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [orderItems, setOrderItems] = useState(
    initialHasQuote ? chatContext.quote.items.map((item) => ({
      medicine_id: item.medicine_id || item.item_id,
      brand_name: item.brand_name || item.name || 'Medicine',
      generic_name: item.generic_name || '',
      category: item.category || '',
      unit_price: parseFloat(item.unit_price || item.price) || 0,
      stock: item.stock_quantity || 9999,
      quantity: parseInt(item.quantity) || 1,
      days: item.days || 1,
      timing: item.timing || { morning: item.quantity || 1, afternoon: 0, night: 0 }
    })) : []
  );
  const [pharmacistNote, setPharmacistNote] = useState(chatContext?.pharmacist_note || '');
  const [generatingBill, setGeneratingBill] = useState(false);
  const [billGenerated, setBillGenerated] = useState(false);
  const [isBillFinalized, setIsBillFinalized] = useState(initialIsBilled);
  const [existingTotal, setExistingTotal] = useState(parseFloat(chatContext?.total_amount || chatContext?.quote?.total_amount || 0) || 0);
  const [generatedPin, setGeneratedPin] = useState('');
  const [billError, setBillError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isPrescriptionApproved, setIsPrescriptionApproved] = useState(initialIsBilled);
  const [isRejected, setIsRejected] = useState(initialStatus === 'rejected');
  const [prescriptionStatus, setPrescriptionStatus] = useState(initialStatus); // 'pending' | 'approved' | 'rejected'
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const searchTimerRef = useRef(null);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!reservationId) return;
    setLoading(true);
    dashboardApi.getOrderDetails('reservation', reservationId)
      .then((data) => {
        if (data.status === 'success' && data.data) {
          const rStatus = data.data.status || 'pending';
          const rStatusLower = rStatus.toLowerCase();
          setPrescriptionStatus(rStatus);

          const isAlreadyProcessed = ['quoted', 'reserved', 'paid', 'completed', 'bill_generated', 'pending_pickup', 'claimed'].includes(rStatusLower);
          const hasItems = data.data.items && data.data.items.length > 0;
          const isBilled = data.data.has_bill || isAlreadyProcessed || hasItems || initialIsBilled;

          if (hasItems) {
            setOrderItems(data.data.items.map((item) => ({
              medicine_id: item.medicine_id || item.item_id,
              brand_name: item.brand_name || 'Medicine',
              generic_name: item.generic_name || '',
              category: item.category || '',
              unit_price: parseFloat(item.unit_price) || 0,
              stock: item.stock_quantity || 9999,
              quantity: parseInt(item.quantity) || 1,
              days: item.days || 1,
              timing: item.timing || { morning: item.quantity || 1, afternoon: 0, night: 0 }
            })));
          }
          if (data.data.pharmacist_note) {
            setPharmacistNote(data.data.pharmacist_note);
          }
          if (data.data.total_amount) {
            setExistingTotal(parseFloat(data.data.total_amount) || 0);
          }

          if (data.data.is_approved || isBilled) {
            setIsPrescriptionApproved(true);
          }
          if (isBilled) {
            setIsBillFinalized(true);
          }
          if (rStatusLower === 'rejected' || data.data.is_rejected) {
            setIsRejected(true);
          }
        }
      })
      .catch((e) => console.error('Failed to load reservation details:', e))
      .finally(() => setLoading(false));
  }, [reservationId]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      // Clear results immediately when search is empty
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await inventoryApi.searchInventory(searchQuery);
        const results = data.data || [];
        setSearchResults(results);
        setShowDropdown(results.length > 0);
      } catch {
        setSearchResults([]);
        setShowDropdown(false);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery]);

  function addMedicine(med) {
    const existing = orderItems.find((i) => i.medicine_id === med.medicine_id);
    if (existing) {
      setSearchQuery('');
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    setOrderItems([
      ...orderItems,
      {
        medicine_id: med.medicine_id,
        brand_name: med.brand_name,
        generic_name: med.generic_name,
        category: med.category,
        unit_price: parseFloat(med.unit_price) || 0,
        stock: med.stock_quantity || 0,
        days: 1,
        timing: { morning: 0, afternoon: 0, night: 0 }
      },
    ]);
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
  }

  function updateTiming(medicineId, period, count) {
    setOrderItems(orderItems.map((i) =>
      i.medicine_id === medicineId
        ? { ...i, timing: { ...i.timing, [period]: count } }
        : i
    ));
  }

  function updateDays(medicineId, days) {
    setOrderItems(orderItems.map((i) =>
      i.medicine_id === medicineId ? { ...i, days: Math.max(1, days) } : i
    ));
  }

  function removeItem(medicineId) {
    setOrderItems(orderItems.filter((i) => i.medicine_id !== medicineId));
  }

  function getItemTotalQty(item) {
    if (item.quantity && !item.timing) return item.quantity;
    const dosesPerDay = (item.timing?.morning || 0) + (item.timing?.afternoon || 0) + (item.timing?.night || 0);
    if (dosesPerDay > 0) {
      return dosesPerDay * (item.days || 1);
    }
    return item.quantity || 1;
  }

  const computedTotal = orderItems.reduce((sum, i) => sum + getItemTotalQty(i) * i.unit_price, 0);
  const displayTotal = existingTotal > 0 && orderItems.length > 0 && isBillFinalized ? existingTotal : computedTotal;

  async function handleGenerateBill() {
    if (orderItems.length === 0) return;
    setBillError('');

    const invalidItems = orderItems.filter((i) => getItemTotalQty(i) <= 0);
    if (invalidItems.length > 0) {
      setBillError(`Please select dosage timing (Morning/Afternoon/Night) for: ${invalidItems.map((i) => i.brand_name).join(', ')}`);
      return;
    }

    setGeneratingBill(true);
    try {
      const items = orderItems.map((i) => ({
        medicine_id: i.medicine_id,
        quantity: getItemTotalQty(i),
        unit_price: i.unit_price
      }));
      const result = await reservationApi.generateBill(reservationId, items, pharmacistNote);
      setGeneratedPin(result.pickup_pin || '');
      setBillGenerated(true);
      setIsBillFinalized(true);
      if (onBillGenerated) onBillGenerated();
      onClose();
    } catch (e) {
      console.error('Failed to generate bill:', e);
      setBillError(e.message || 'Failed to generate bill. Please try again.');
    } finally {
      setGeneratingBill(false);
    }
  }

  async function handleApprovePrescription() {
    setApproving(true);
    try {
      await reservationApi.approvePrescription(reservationId);
      setIsPrescriptionApproved(true);
      if (onBillGenerated) onBillGenerated();
    } catch (e) {
      console.error('Failed to approve prescription:', e);
      alert('Failed to approve prescription. Please try again.');
    } finally {
      setApproving(false);
    }
  }

  async function handleRejectPrescription() {
    if (!rejectReason.trim()) {
      alert("Please provide a reason for rejection.");
      return;
    }
    setRejecting(true);
    try {
      await reservationApi.reject(reservationId, rejectReason);
      if (onBillGenerated) onBillGenerated();
      onClose();
    } catch (e) {
      console.error('Failed to reject prescription:', e);
      alert('Failed to reject prescription. Please try again.');
    } finally {
      setRejecting(false);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl p-8 flex items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 text-[#1A73E8] animate-spin" />
          <span className="text-sm font-semibold text-[#0F172A]">Loading reservation details...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(ev) => ev.stopPropagation()}>
        <div className="p-4 border-b border-gray-100 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#1A73E8]" /> Order Details — Reservation #{reservationId}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-x divide-gray-100">
          {/* Left: Prescription */}
          <div className="p-4 overflow-y-auto">
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
                      className="text-xs text-[#1A73E8] underline"
                    >
                      Open in new tab
                    </a>
                  </div>
                ) : (
                  <img
                    src={prescriptionUrl}
                    alt="Patient Prescription"
                    className="w-full h-auto object-contain max-h-[420px]"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const fallback = e.target.parentElement.querySelector('.rx-fallback');
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                )}
                <div className="rx-fallback hidden flex-col items-center justify-center py-12 text-gray-400 gap-2">
                  <FileText className="w-8 h-8" />
                  <p className="text-sm">Unable to load prescription image</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400 rounded-xl border border-dashed border-gray-200">
                <FileText className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">No prescription uploaded</p>
              </div>
            )}
          </div>

          {/* Right: Medicines or Approval Status or Finalized Bill */}
          <div className="p-4 overflow-y-auto flex flex-col relative bg-white">

            {/* REJECTED STATE - show locked pane with rejected badge */}
            {isRejected && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-white/70 backdrop-blur-sm">
                <div className="bg-white p-6 rounded-2xl shadow-xl border border-red-100 max-w-sm w-full text-center">
                  <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <X className="w-6 h-6 text-red-500" />
                  </div>
                  <h3 className="text-base font-bold text-red-700 mb-1">Prescription Rejected</h3>
                  <p className="text-xs text-gray-500">This prescription was rejected. No further action can be taken on this order.</p>
                  <div className="mt-4 px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
                    <p className="text-xs text-red-600 font-medium">The patient was notified with the rejection reason via chat.</p>
                  </div>
                </div>
              </div>
            )}

            {/* PENDING STATE (Not yet approved and not billed) - show approve/reject overlay */}
            {!isRejected && !isBillFinalized && !isPrescriptionApproved && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-white/60 backdrop-blur-sm">
                <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 max-w-sm w-full text-center relative z-30">
                  <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6 text-[#1A73E8]" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">Review Prescription</h3>
                  <p className="text-xs text-gray-500 mb-6">
                    Please review the patient's uploaded prescription before generating the bill and adding medicines.
                  </p>
                  
                  {showRejectInput ? (
                    <div className="w-full space-y-3">
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Reason for rejection (sent to patient)..."
                        rows={2}
                        className="w-full px-3 py-2 bg-red-50/30 border border-red-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500/30 resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowRejectInput(false)}
                          className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleRejectPrescription}
                          disabled={rejecting || !rejectReason.trim()}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          {rejecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                          Confirm
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full space-y-2.5">
                      <button
                        onClick={handleApprovePrescription}
                        disabled={approving}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1A73E8] text-white text-sm font-semibold rounded-xl hover:bg-[#1557B0] transition-all shadow-sm cursor-pointer disabled:opacity-50 hover:shadow-md"
                      >
                        {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Approve & Continue
                      </button>
                      <button
                        onClick={() => setShowRejectInput(true)}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 text-xs font-semibold rounded-xl hover:bg-red-100 transition-all cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                        Reject Prescription
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* VIEW MODE: FINALIZED BILL (Bill already generated) */}
            {isBillFinalized && !isRejected ? (
              <div className="flex flex-col h-full space-y-3">
                <div className="px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-800">Digital Prescription & Bill Finalized</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {prescriptionStatus.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Prescribed Medicines ({orderItems.length})</h4>
                  <span className="text-[10px] text-gray-400 font-medium">Locked / Cannot be edited</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px]">
                  {orderItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      <ShoppingCart className="w-6 h-6 mx-auto mb-2 opacity-50" />
                      <p className="font-medium">No items found</p>
                    </div>
                  ) : (
                    orderItems.map((item, idx) => {
                      const totalQty = getItemTotalQty(item);
                      const lineTotal = totalQty * item.unit_price;
                      return (
                        <div key={item.medicine_id || idx} className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-gray-800 truncate">{item.brand_name}</p>
                              <p className="text-[10px] text-gray-400">{item.generic_name} {item.category ? `• ${item.category}` : ''}</p>
                            </div>
                            <span className="text-xs font-bold text-[#1A73E8] shrink-0">
                              Rs. {lineTotal.toFixed(2)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-[11px] text-gray-500">
                            <span>
                              Quantity: <strong className="text-gray-700 font-semibold">{totalQty}</strong> {getMedicineUnit(item, totalQty)}
                            </span>
                            <span>Rs. {item.unit_price.toFixed(2)} / {getMedicineUnit(item, 1)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {pharmacistNote && (
                  <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl">
                    <p className="text-[10px] font-bold text-[#1A73E8] uppercase tracking-wider mb-0.5">Pharmacist Note</p>
                    <p className="text-xs text-gray-700">{pharmacistNote}</p>
                  </div>
                )}

                <div className="pt-2 border-t border-gray-100 space-y-2.5">
                  <div className="flex justify-between items-center bg-gray-50 px-3.5 py-2.5 rounded-xl border border-gray-100">
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Total Amount</span>
                    <span className="text-base font-black text-[#1A73E8]">Rs. {displayTotal.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              /* CREATION MODE: ADD MEDICINES & GENERATE BILL (When status is pending) */
              <div className={`flex flex-col h-full transition-all duration-300 ${(!isPrescriptionApproved || isRejected) ? 'opacity-40 pointer-events-none select-none blur-[1px]' : ''}`}>
                {isPrescriptionApproved && !isRejected && (
                  <div className="mb-3 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-semibold text-emerald-700">Prescription Verified & Approved</span>
                  </div>
                )}
                
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Add Medicines</h4>

                <div className="relative mb-3" ref={dropdownRef}>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search medicines by name..."
                    value={searchQuery}
                    onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSearchQuery(val);
                      if (!val.trim()) {
                        setSearchResults([]);
                        setShowDropdown(false);
                      }
                    }}
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/30 focus:border-[#1A73E8]"
                  />
                  {searching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                  )}

                  {showDropdown && searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 border border-gray-200 rounded-lg max-h-52 overflow-y-auto shadow-xl bg-white">
                      {searchResults.map((med) => (
                        <button
                          key={med.medicine_id}
                          onMouseDown={(e) => { e.preventDefault(); addMedicine(med); }}
                          className="w-full text-left px-3 py-2.5 hover:bg-blue-50 flex items-center justify-between text-xs border-b border-gray-50 last:border-0 cursor-pointer transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-800 truncate">{med.brand_name}</p>
                            <p className="text-gray-400 truncate">{med.generic_name} | Stock: {med.stock_quantity}</p>
                          </div>
                          <span className="text-[#1A73E8] font-semibold shrink-0 ml-2">Rs. {parseFloat(med.unit_price).toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                  {orderItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      <ShoppingCart className="w-6 h-6 mx-auto mb-2 opacity-50" />
                      <p className="font-medium">No medicines added yet</p>
                      <p className="text-xs text-gray-300 mt-1">Search and add medicines above</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {orderItems.map((item) => {
                        const totalQty = getItemTotalQty(item);
                        const subtotal = totalQty * item.unit_price;
                        return (
                          <div key={item.medicine_id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-gray-800 truncate">{item.brand_name}</p>
                                <p className="text-[10px] text-gray-400">{item.generic_name} | Rs. {item.unit_price.toFixed(2)} / {getMedicineUnit(item, 1)}</p>
                              </div>
                              <button
                                onClick={() => removeItem(item.medicine_id)}
                                className="text-gray-300 hover:text-red-500 cursor-pointer shrink-0 p-1 rounded hover:bg-red-50"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <DosageTimingRow
                              timing={item.timing}
                              onChange={(period, count) => updateTiming(item.medicine_id, period, count)}
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
                                value={item.days || 1}
                                onChange={(e) => updateDays(item.medicine_id, parseInt(e.target.value) || 1)}
                                className="w-14 px-2 py-1 bg-white border border-gray-200 rounded-md text-xs text-center font-medium focus:outline-none focus:ring-1 focus:ring-[#1A73E8]/30"
                              />
                              <span className="text-[10px] text-gray-400">|</span>
                              <span className="text-[10px] text-gray-500">
                                Total: <span className="font-bold text-gray-700">{totalQty}</span> {getMedicineUnit(item, totalQty)}
                              </span>
                              <span className="ml-auto text-xs font-bold text-gray-800">Rs. {subtotal.toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-3">
                  <textarea
                    value={pharmacistNote}
                    onChange={(e) => setPharmacistNote(e.target.value)}
                    placeholder="Add a note for the patient (optional)..."
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/30 resize-none"
                  />
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-600">Total Amount</span>
                    <span className="text-lg font-bold text-[#1A73E8]">Rs. {displayTotal.toFixed(2)}</span>
                  </div>
                  {billError && (
                    <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-600">{billError}</p>
                    </div>
                  )}
                  {billGenerated ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <p className="text-xs text-emerald-600 font-semibold">Bill generated successfully!</p>
                      </div>
                      {generatedPin && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                          <p className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-widest">Pickup PIN</p>
                          <p className="text-xl font-black text-emerald-800 tracking-[0.4em] mt-1">{generatedPin}</p>
                        </div>
                      )}
                      <p className="text-[11px] text-gray-400 text-center">Close this modal and click "Confirm Order" to send the PIN to the patient.</p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200/60 rounded-lg text-center">
                        <p className="text-[11px] font-bold text-amber-700">Note: Only 1 digital prescription/bill can be generated per order.</p>
                      </div>
                      <button
                        onClick={handleGenerateBill}
                        disabled={generatingBill || orderItems.length === 0}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1A73E8] text-white text-sm font-semibold rounded-lg hover:bg-[#1557B0] transition-colors shadow-sm cursor-pointer disabled:opacity-50 disabled:bg-sky-300"
                      >
                        {generatingBill ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                        {generatingBill ? 'Generating Bill...' : 'Generate Bill'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MessagesContent() {
  const { conversations, refreshConversations, selectedConversationId, setSelectedConversationId, autoOpenOrderId, setAutoOpenOrderId } = usePharmacyData();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedMessageIdState, setSelectedMessageIdState] = useState(null);

  const selectedMessageId = selectedConversationId || selectedMessageIdState;
  const setSelectedMessageId = (id) => {
    setSelectedMessageIdState(id);
    if (setSelectedConversationId) setSelectedConversationId(id);
  };
  const [internalNote, setInternalNote] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatContext, setChatContext] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [confirmingOrder, setConfirmingOrder] = useState(false);
  const pollingRef = useRef(null);

  const tabs = [
    { key: 'all', label: 'All Messages' },
    { key: 'pending', label: 'Pending' },
    { key: 'replied', label: 'Replied' },
  ];

  const messageList = useMemo(() => {
    return conversations.map((c) => {
      const rawStatus = mapReservationStatus(c.rawStatus);
      const displayStatus = rawStatus === 'pending' && c.pharmacistReplied ? 'replied' : rawStatus;
      return {
        id: c.id,
        name: c.patientName,
        initials: c.initials,
        orderId: String(c.id),
        snippet: c.lastMessage,
        time: c.time,
        unread: c.unread,
        status: displayStatus,
        rawStatus};
    });
  }, [conversations]);

  const activeMessage = selectedMessageId
    ? messageList.find((m) => String(m.id) === String(selectedMessageId)) || null
    : null;

  useEffect(() => {
    const id = activeMessage?.id;
    if (!id) return;
    let cancelled = false;
    (async () => {
      if (!cancelled) setChatLoading(true);
      try {
        const data = await sharedApi.getReservationChat(id);
        if (!cancelled) {
          setChatMessages(data.messages || []);
          setChatContext(data.context ? { ...data.context, quote: data.quote } : null);
        }
      } catch {
        if (!cancelled) {
          setChatMessages([]);
          setChatContext(null);
        }
      } finally {
        if (!cancelled) setChatLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeMessage?.id]);

  useEffect(() => {
    const id = activeMessage?.id;
    if (!id) return;
    pollingRef.current = setInterval(() => {
      sharedApi.getReservationChat(id)
        .then((data) => {
          setChatMessages(data.messages || []);
          setChatContext(data.context ? { ...data.context, quote: data.quote } : null);
        })
        .catch(() => {});
    }, 8000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [activeMessage?.id]);

  useEffect(() => {
    const pollConversations = setInterval(() => {
      if (refreshConversations) refreshConversations();
    }, 15000);
    return () => clearInterval(pollConversations);
  }, [refreshConversations]);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
  
  const rawPath = chatContext?.prescription_url || activeMessage?.prescription_url || activeMessage?.prescription_path;
  const prescriptionUrl = rawPath ? `${API_BASE_URL}/shared/view_file.php?file=${encodeURIComponent(rawPath)}` : null;

  function handleOpenOrderModal() {
    setShowOrderModal(true);
  }

  // Handle Auto Open from Dashboard
  useEffect(() => {
    if (autoOpenOrderId && activeMessage?.id === autoOpenOrderId) {
      setShowOrderModal(true);
      if (setAutoOpenOrderId) setAutoOpenOrderId(null);
    }
  }, [autoOpenOrderId, activeMessage?.id, setAutoOpenOrderId]);

  async function handleConfirmOrder() {
    if (!activeMessage) return;
    const pin = chatContext?.pickup_pin;
    if (!pin) return;
    const pharmacyName = chatContext?.pharmacy_name || 'Pharmacy';
    const totalAmount = chatContext?.total_amount || 0;
    const items = chatContext?.quote?.items || [];
    
    const itemsLines = items.map(item => `  ${item.brand_name}  x${item.quantity}  —  Rs. ${parseFloat(item.quantity * item.unit_price).toFixed(2)}`);
    const itemsText = itemsLines.join('\n');
    
    const sysMsgBill = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
                     + `✅ BILL CONFIRMED — ${pharmacyName}\n`
                     + `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
                     + `Order #${activeMessage.id} (Reservation #${activeMessage.id})\n`
                     + `Date: ${new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}\n\n`
                     + `Confirmed Items:\n${itemsText || '  No items specified'}\n\n`
                     + `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
                     + `Total Amount: LKR ${parseFloat(totalAmount).toFixed(2)}\n`
                     + `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
                     + `🔐 Verification PIN: ${pin}\n\n`
                     + `Please present this PIN at the pharmacy counter to collect your medicines.`;

    setConfirmingOrder(true);
    try {
      await sharedApi.sendReservationMessage(
        activeMessage.id,
        sysMsgBill
      );
      const data = await sharedApi.getReservationChat(activeMessage.id);
      setChatMessages(data.messages || []);
      setChatContext(data.context ? { ...data.context, quote: data.quote } : null);
      if (refreshConversations) refreshConversations();
    } catch (e) {
      console.error('Failed to confirm order:', e);
    } finally {
      setConfirmingOrder(false);
    }
  }

  async function handleSendMessage() {
    if (!internalNote.trim() || !activeMessage) return;
    setSending(true);
    try {
      await sharedApi.sendReservationMessage(activeMessage.id, internalNote);
      setInternalNote('');
      const data = await sharedApi.getReservationChat(activeMessage.id);
      setChatMessages(data.messages || []);
      setChatContext(data.context ? { ...data.context, quote: data.quote } : null);
    } catch (e) {
      console.error('Failed to send:', e);
    } finally {
      setSending(false);
    }
  }

  const filteredMessages = useMemo(() => {
    return messageList.filter((msg) => {
      const q = searchQuery.trim().toLowerCase();
      // Also match "reservation #20" style searches and plain status words
      const reservationLabel = `reservation #${msg.orderId}`;
      const matchesSearch =
        !q ||
        msg.name.toLowerCase().includes(q) ||
        msg.orderId.toLowerCase().includes(q) ||
        reservationLabel.includes(q) ||
        (statusLabels[msg.status] || '').toLowerCase().includes(q);

      let matchesTab = true;
      if (activeTab === 'pending') {
        matchesTab = msg.status === 'pending' || msg.status === 'bill_generated';
      } else if (activeTab === 'replied') {
        matchesTab = msg.status === 'replied' || msg.status === 'paid' || msg.status === 'reserved' || msg.status === 'completed' || msg.status === 'pending_pickup';
      }

      return matchesSearch && matchesTab;
    });
  }, [searchQuery, activeTab, messageList]);

  const patient = activeMessage ? {
    name: chatContext?.patient_name || activeMessage.name,
    phone: chatContext?.patient_phone || '',
    gender: '',
    age: chatContext?.patient_age ? String(chatContext.patient_age) : '',
    location: chatContext?.patient_location || '',
    order: {
      id: `#${activeMessage.orderId}`,
      date: chatContext?.created_at ? new Date(chatContext.created_at).toLocaleDateString() : '',
      method: 'Reservation',
      status: activeMessage.status,
      totalAmount: chatContext?.total_amount || 0,
      paymentStatus: chatContext?.payment_status || 'pending',
      pickupPin: '',  // SECURITY: never shown to pharmacist
    }} : { name: '', phone: '', gender: '', age: '', location: '', order: { id: '', date: '', method: '', status: '', totalAmount: 0, paymentStatus: '', pickupPin: '' } };

  const canVerifyPin = activeMessage && (activeMessage.status === 'paid' || activeMessage.status === 'pending_pickup' || activeMessage.status === 'reserved');
  const canGenerateBill = activeMessage && ['pending', 'replied', 'reserved'].includes(activeMessage.status);
  const isAwaitingPatient = activeMessage && activeMessage.status === 'quoted';
  const canConfirmOrder = activeMessage && activeMessage.status === 'bill_generated' && chatContext?.pickup_pin;
  const hasPrescription = activeMessage && (activeMessage.status === 'bill_generated' || activeMessage.status === 'paid' || activeMessage.status === 'reserved' || activeMessage.status === 'completed' || activeMessage.status === 'pending_pickup');

  return (
    <div className="space-y-5">
      {showPinModal && activeMessage && (
        <PinVerificationModal
          reservationId={activeMessage.id}
          onVerified={() => {
            setShowPinModal(false);
            if (activeMessage?.id) {
              sharedApi.getReservationChat(activeMessage.id)
                .then((data) => {
                  setChatMessages(data.messages || []);
                  setChatContext(data.context ? { ...data.context, quote: data.quote } : null);
                })
                .catch(() => {});
            }
            if (refreshConversations) refreshConversations();
          }}
          onClose={() => setShowPinModal(false)}
        />
      )}

      {showOrderModal && activeMessage && (
        <OrderDetailsModal
          reservationId={activeMessage.id}
          prescriptionUrl={prescriptionUrl}
          chatContext={chatContext}
          activeMessage={activeMessage}
          onClose={() => setShowOrderModal(false)}
          onBillGenerated={() => {
            if (activeMessage?.id) {
              sharedApi.getReservationChat(activeMessage.id)
                .then((data) => {
                  setChatMessages(data.messages || []);
                  setChatContext(data.context ? { ...data.context, quote: data.quote } : null);
                })
                .catch(() => {});
            }
            if (refreshConversations) refreshConversations();
          }}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={MessageSquare}
          label="Total Messages"
          value={messageList.length}
          color="text-[#1A73E8]"
          bgColor="bg-blue-50"
        />
        <MetricCard
          icon={Clock}
          label="Pending"
          value={messageList.filter((m) => m.status === 'pending' || m.status === 'bill_generated').length}
          color="text-amber-600"
          bgColor="bg-amber-50"
        />
        <MetricCard
          icon={AlertCircle}
          label="Awaiting Pickup"
          value={messageList.filter((m) => m.status === 'paid' || m.status === 'pending_pickup').length}
          color="text-cyan-600"
          bgColor="bg-cyan-50"
        />
        <MetricCard
          icon={CheckCircle2}
          label="Completed"
          value={messageList.filter((m) => m.status === 'completed').length}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        <div className={`xl:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex-col ${activeMessage ? 'hidden xl:flex' : 'flex'}`}>
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm text-[#64748B] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/30 focus:border-[#1A73E8]"
              />
            </div>
            <div className="flex gap-1 mt-3 overflow-x-auto">
              {tabs.map((tab) => {
                let count;
                if (tab.key === 'all') count = messageList.length;
                else if (tab.key === 'pending') count = messageList.filter((m) => m.status === 'pending' || m.status === 'bill_generated').length;
                else if (tab.key === 'replied') count = messageList.filter((m) => m.status === 'replied' || m.status === 'paid' || m.status === 'reserved' || m.status === 'completed' || m.status === 'pending_pickup').length;
                else count = 0;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      activeTab === tab.key
                        ? 'bg-[#1A73E8] text-white'
                        : 'text-[#64748B] hover:bg-gray-100'
                    }`}
                  >
                    {tab.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1 max-h-[560px]">
            {filteredMessages.map((msg) => (
              <MessageListItem
                key={msg.id}
                id={msg.id}
                initials={msg.initials}
                status={msg.status}
                name={msg.name}
                time={msg.time}
                orderId={msg.orderId}
                snippet={msg.snippet}
                unreadCount={msg.unread}
                statusStyle={statusStyles[msg.status] || 'bg-gray-50 text-gray-600 border-gray-200'}
                statusLabel={statusLabels[msg.status] || 'Unknown'}
                isActive={String(selectedMessageId) === String(msg.id)}
                onClick={(id) => setSelectedMessageId(id)}
              />
            ))}
            {filteredMessages.length === 0 && (
              <div className="text-center py-12">
                <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No messages found</p>
              </div>
            )}
          </div>
        </div>

        {activeMessage ? (
          <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedMessageId(null)}
                  className="xl:hidden p-2 text-[#64748B] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer relative z-10"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <MessageAvatar initials={activeMessage.initials} status={activeMessage.status} size="sm" />
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">{activeMessage.name}</h3>
                  <p className="text-[11px] text-[#64748B]">Reservation #{activeMessage.orderId}</p>
                </div>
              </div>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusStyles[activeMessage.status] || defaultStatusStyle}`}>
                {statusLabels[activeMessage.status] || defaultStatusLabel}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[360px]">
              {chatLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
              ) : chatMessages.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">No messages yet</p>
              ) : (
                chatMessages.map((msg, idx) => {
                  const isBillMessage = msg.message_text && msg.message_text.includes('BILL —') && msg.sender_role === 'pharmacist';
                  return (
                    <div key={msg.message_id || idx}>
                      <p className="text-[11px] text-[#94A3B8] mb-3 text-center">
                        {msg.created_at ? new Date(msg.created_at).toLocaleDateString() : ''}
                      </p>
                      <div className="flex items-start gap-3">
                        <MessageAvatar
                          initials={msg.sender_role === 'pharmacist' ? 'PH' : 'PT'}
                          status={activeMessage.status}
                          size="sm"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs font-semibold text-[#0F172A]">
                              {msg.sender_role === 'pharmacist' ? 'You' : (msg.sender_name || 'Patient')}
                            </span>
                            <span className="text-[10px] text-[#94A3B8]">
                              {msg.created_at ? formatTime(msg.created_at) : ''}
                            </span>
                          </div>
                          {isBillMessage && chatContext ? (
                            <GeneratedBill
                              compact={true}
                              pharmacyName={chatContext.pharmacy_name || 'Pharmacy'}
                              pharmacyAddress={''}
                              pharmacyPhone={''}
                              reservationId={activeMessage.id}
                              items={chatContext.quote?.items || []}
                              totalAmount={chatContext.total_amount || 0}
                              pickupPin={''}
                              createdAt={msg.created_at}
                              patientName={chatContext.patient_name || ''}
                              paymentStatus={chatContext.payment_status || 'pending'}
                              showPin={false}
                            />
                          ) : (
                            <div className={`rounded-2xl p-4 max-w-[85%] ${
                              msg.sender_role === 'pharmacist'
                                ? 'bg-[#1A73E8]/5 border border-[#1A73E8]/10 rounded-tl-sm'
                                : 'bg-[#F1F5F9] rounded-tl-sm'
                            }`}>
                              <p className="text-sm text-[#334155] leading-relaxed whitespace-pre-wrap">
                                {redactPinFromMessage(msg.message_text)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-gray-100 space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2 block">
                  Reply Message
                </label>
                <textarea
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="Type your reply..."
                  rows={2}
                  className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/30 focus:border-[#1A73E8] resize-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSendMessage}
                  disabled={sending || !internalNote.trim()}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1A73E8] text-white text-sm font-semibold rounded-lg hover:bg-[#1557B0] transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send Reply
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden xl:flex xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm items-center justify-center">
            <div className="text-center py-16">
              <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Select a message to view</p>
            </div>
          </div>
        )}

        {activeMessage ? (
          <div className="hidden xl:block xl:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-[#0F172A] mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-[#1A73E8]" />
                Patient Details
              </h3>
              <div className="space-y-3">
                <DetailRow icon={User} label="Name" value={patient.name} />
                <DetailRow icon={Phone} label="Phone" value={patient.phone} />
                <DetailRow icon={User} label="Age" value={patient.age ? `${patient.age} yrs` : ''} />
                <DetailRow icon={MapPin} label="Address" value={patient.location} />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-[#0F172A] mb-4 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-[#1A73E8]" />
                Order Information
              </h3>
              <div className="space-y-3">
                <DetailRow icon={FileText} label="Order ID" value={patient.order.id} />
                <DetailRow icon={Calendar} label="Date" value={patient.order.date} />
                <DetailRow icon={ShoppingCart} label="Method" value={patient.order.method} />
                <DetailRow icon={FileText} label="Total" value={patient.order.totalAmount > 0 ? `Rs. ${parseFloat(patient.order.totalAmount).toFixed(2)}` : ''} />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-[#64748B]">Status</span>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusStyles[patient.order.status] || defaultStatusStyle}`}>
                    {statusLabels[patient.order.status] || defaultStatusLabel}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-[#0F172A] mb-4">Quick Actions</h3>
              <div className="space-y-2.5">
                <button
                  onClick={handleOpenOrderModal}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1A73E8] text-white text-sm font-semibold rounded-lg hover:bg-[#1557B0] shadow-sm cursor-pointer transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  View Order Details
                </button>



                {isAwaitingPatient && (
                  <button
                    disabled
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-500 text-sm font-semibold rounded-lg cursor-not-allowed border border-gray-200"
                  >
                    <Clock className="w-4 h-4" />
                    Waiting for Patient
                  </button>
                )}

                {canConfirmOrder && (
                  <button
                    onClick={handleConfirmOrder}
                    disabled={confirmingOrder}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 shadow-sm cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {confirmingOrder ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {confirmingOrder ? 'Sending PIN...' : 'Confirm Order'}
                  </button>
                )}

                {hasPrescription && !canVerifyPin && !canConfirmOrder && (
                  <button
                    disabled
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-400 text-sm font-semibold rounded-lg cursor-not-allowed"
                  >
                    <FileText className="w-4 h-4" />
                    {activeMessage.status === 'bill_generated' ? 'Awaiting Confirmation' : 'Order Processing'}
                  </button>
                )}


              </div>
            </div>
          </div>
        ) : (
          <div className="hidden xl:block xl:col-span-1" />
        )}
      </div>
    </div>
  );
}

