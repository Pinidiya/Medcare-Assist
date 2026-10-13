import { useState, useRef } from 'react';
import {
  Fingerprint, CheckCircle, Clock, Loader2, AlertCircle,
  ShieldCheck, X, Receipt, Search, CreditCard, Package,
  User, Phone, Calendar, Hash,
} from 'lucide-react';
import Card from '../../../../components/common/Card';
import Button from '../../../../components/common/Button';
import { pickupApi } from '../../../../services/pharmacistApi';
import { usePharmacyData } from '../../hooks/usePharmacyData';

/* ── Helpers ── */
function paymentBadge(status) {
  const map = {
    paid: { label: 'Paid', cls: 'bg-emerald-100 text-emerald-700' },
    online_paid: { label: 'Online Paid', cls: 'bg-blue-100 text-blue-700' },
    advance_paid: { label: 'Advance Paid', cls: 'bg-indigo-100 text-indigo-700' },
    pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-700' },
    pending_pickup: { label: 'Pending Pickup', cls: 'bg-cyan-100 text-cyan-700' },
  };
  const cfg = map[(status || '').toLowerCase()] || { label: status || 'Unknown', cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

export default function PickupVerification() {
  const { refreshDashboard } = usePharmacyData();
  const [pinInput, setPinInput]             = useState('');
  const [loading, setLoading]               = useState(false);
  const [result, setResult]                 = useState(null);
  const [error, setError]                   = useState('');
  const [showBillPopup, setShowBillPopup]   = useState(false);
  const [completing, setCompleting]         = useState(false);
  const [completed, setCompleted]           = useState(false);
  const [prescriptionChecked, setPrescriptionChecked] = useState(false);
  const [recentVerifications, setRecentVerifications] = useState([]);
  const inputRef = useRef(null);

  /* ── Search by PIN / PayHere ref ── */
  const handleVerify = async () => {
    const pin = pinInput.trim();
    if (!pin) { setError('Please enter a PIN or payment reference'); return; }
    setLoading(true);
    setError('');
    setResult(null);
    setCompleted(false);
    setPrescriptionChecked(false);
    try {
      const data = await pickupApi.searchOrder(pin);
      if (data.status === 'success') {
        setResult(data.data);
        setShowBillPopup(true);
        setRecentVerifications((prev) => [{
          patientName:  data.data.patient_name,
          type:         data.data.type,
          totalAmount:  data.data.total_amount,
          paymentStatus: data.data.payment_status,
          time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        }, ...prev.slice(0, 4)]);
      } else {
        setError(data.message || 'No active order found with this PIN or reference.');
      }
    } catch (e) {
      setError(e.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  /* ── Complete the found order ── */
  const handleCompleteOrder = async () => {
    if (!result) return;
    setCompleting(true);
    try {
      const data = await pickupApi.completeOrder(pinInput.trim(), result.id, result.type);
      if (data.status === 'success') {
        setCompleted(true);
        // Refresh dashboard stats including today's revenue
        if (refreshDashboard) refreshDashboard();
        setTimeout(() => { setShowBillPopup(false); handleReset(); }, 2500);
      } else {
        setError(data.message || 'Failed to complete order');
      }
    } catch (e) {
      setError(e.message || 'Completion failed');
    } finally {
      setCompleting(false);
    }
  };

  const handleReset = () => {
    setPinInput('');
    setResult(null);
    setError('');
    setShowBillPopup(false);
    setCompleted(false);
    setPrescriptionChecked(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleVerify();
    if (e.key === 'Escape') handleReset();
  };

  return (
    <>
      <Card>
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <Fingerprint className="w-4 h-4 text-[#1A73E8]" />
          <h2 className="text-base font-semibold text-gray-900">Counter Pickup Verification</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Ask patient for their Pickup PIN or PayHere reference &amp; enter it below
        </p>

        {/* Unified Input */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={pinInput}
            onChange={(e) => {
              setPinInput(e.target.value);
              setError('');
              if (!e.target.value) { setResult(null); setShowBillPopup(false); setCompleted(false); setPrescriptionChecked(false); }
            }}
            onKeyDown={handleKeyDown}
            placeholder="Enter 4-digit PIN or PayHere reference…"
            disabled={loading}
            className={`w-full pl-9 pr-10 py-3 rounded-xl border-2 text-sm font-semibold tracking-wider transition-all focus:outline-none ${
              result
                ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                : error
                ? 'border-red-300 bg-red-50 text-gray-800'
                : 'border-gray-200 bg-gray-50 text-gray-800 focus:border-[#1A73E8] focus:bg-white'
            }`}
          />
          {pinInput && (
            <button
              onClick={handleReset}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Success hint (before popup) */}
        {result && !showBillPopup && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <p className="text-xs text-emerald-700 font-medium">Found: {result.patient_name}</p>
          </div>
        )}

        {/* Action Button */}
        {!result ? (
          <Button
            variant="primary"
            className="w-full justify-center"
            onClick={handleVerify}
            disabled={loading || !pinInput.trim()}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
            {loading ? 'Searching…' : 'Verify & Search'}
          </Button>
        ) : (
          <button
            onClick={() => setShowBillPopup(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            <Receipt className="w-4 h-4" />
            View Order & Complete
          </button>
        )}

        {/* Recent Verifications */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1.5 mb-2">
            <Clock className="w-3 h-3 text-gray-400" />
            <p className="text-[11px] font-medium text-gray-500">Recent Verifications</p>
          </div>
          <div className="space-y-1.5">
            {recentVerifications.length === 0 ? (
              <p className="text-[11px] text-gray-400 text-center py-2">Enter a PIN to verify</p>
            ) : (
              recentVerifications.map((v, idx) => (
                <div key={idx} className="flex items-center justify-between px-2 py-1.5 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span className="text-[11px] text-gray-700 font-medium truncate">{v.patientName}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-gray-400">Rs. {parseFloat(v.totalAmount || 0).toFixed(0)}</span>
                    <span className="text-[10px] text-gray-400">{v.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>

      {/* ── Bill Popup Modal ── */}
      {showBillPopup && result && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => { if (!completing && !completed) setShowBillPopup(false); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#1A73E8]" />
                Order Verification
              </h3>
              {!completing && !completed && (
                <button
                  onClick={() => setShowBillPopup(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

              {/* Patient Info */}
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Patient</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-gray-700">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-semibold">{result.patient_name || 'Unknown'}</span>
                  </div>
                  {result.patient_email && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="ml-5">{result.patient_email}</span>
                    </div>
                  )}
                  {result.patient_phone && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span>{result.patient_phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Order Info</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-gray-500">
                      <Hash className="w-3 h-3" /> ID
                    </span>
                    <span className="font-semibold text-gray-800">#{result.id}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-gray-500">
                      <Package className="w-3 h-3" /> Type
                    </span>
                    <span className="font-semibold text-gray-800 capitalize">{result.type}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-gray-500">
                      <CreditCard className="w-3 h-3" /> Payment
                    </span>
                    {paymentBadge(result.payment_status)}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-gray-500">
                      <Calendar className="w-3 h-3" /> Date
                    </span>
                    <span className="font-medium text-gray-700">
                      {result.created_at ? new Date(result.created_at).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  {result.payhere_ref && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">PayHere Ref</span>
                      <span className="font-mono font-semibold text-blue-700 text-[11px]">{result.payhere_ref}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Medicines */}
              {(result.items || []).length > 0 && (
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Medicines ({result.items.length})
                  </p>
                  <div className="space-y-2">
                    {result.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-800 truncate">{item.brand_name}</p>
                          {item.generic_name && (
                            <p className="text-gray-400 text-[10px]">{item.generic_name}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="text-gray-500">x{item.quantity}</p>
                          <p className="font-bold text-gray-800">
                            Rs. {parseFloat(item.line_total || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-2 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700">Total</span>
                    <span className="text-sm font-black text-[#1A73E8]">
                      Rs. {parseFloat(result.total_amount || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Security notice — PIN is never shown here */}
              <div className="flex items-start gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-600">
                  PIN verified securely. The patient's pickup PIN is never displayed to pharmacists.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t border-gray-100 shrink-0 space-y-3">
              {(() => {
                const needsPrescriptionCheck = 
                  (result?.items?.some(item => parseInt(item.requires_prescription) === 1)) ||
                  (result?.type === 'reservation' && !!result?.prescription_url);
                
                if (completed) {
                  return (
                    <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-emerald-700">Order Completed!</p>
                        <p className="text-xs text-emerald-600">Patient can now collect their medicines.</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <>
                    {needsPrescriptionCheck ? (
                      <label className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-100/50 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={prescriptionChecked}
                          onChange={(e) => setPrescriptionChecked(e.target.checked)}
                          className="mt-0.5 w-4 h-4 text-[#1A73E8] bg-white border-gray-300 rounded focus:ring-[#1A73E8] cursor-pointer"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-bold text-gray-900">Original Prescription Verified</p>
                          <p className="text-xs text-gray-600 mt-0.5">I have physically checked the patient's original prescription and it matches the uploaded one.</p>
                        </div>
                      </label>
                    ) : (
                      <div className="flex items-center justify-center gap-2 py-2 bg-gray-50 rounded-lg border border-gray-100">
                        <ShieldCheck className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-medium text-gray-500">No Prescription Required (OTC Order)</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <button
                        onClick={handleCompleteOrder}
                        disabled={completing || result.status === 'completed' || (needsPrescriptionCheck && !prescriptionChecked)}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {completing
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Completing…</>
                          : <><ShieldCheck className="w-4 h-4" /> Complete Order</>
                        }
                      </button>
                      <button
                        onClick={() => { setShowBillPopup(false); handleReset(); }}
                        disabled={completing}
                        className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
