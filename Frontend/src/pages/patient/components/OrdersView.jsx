import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Package, Clock, MessageSquare, FileText, Upload, Navigation, Loader2, X, FileUp } from 'lucide-react';
import Notification from './Notification';
import QuotationView from '../../../components/QuotationView';
import OrderChat from '../../../components/OrderChat';
import patientBannerImg from '../../../assets/patient banner.png';

const API = import.meta.env.VITE_API_BASE_URL;

const orderStatusColors = {
  'pending': 'bg-amber-100 text-amber-700',
  'processing': 'bg-blue-100 text-blue-700',
  'ready': 'bg-indigo-100 text-indigo-700',
  'delivered': 'bg-green-100 text-green-700',
  'cancelled': 'bg-red-100 text-red-700',
  'Pending': 'bg-amber-100 text-amber-700',
  'Quoted': 'bg-blue-100 text-purple-700 border border-purple-200',
  'Pending Verification': 'bg-orange-100 text-orange-700 border border-orange-200',
  'Reserved': 'bg-green-100 text-green-800 border border-green-300 font-extrabold',
  'Completed': 'bg-blue-100 text-blue-700',
  'Rejected': 'bg-red-100 text-red-700',
};

export default function OrdersView() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [slipModal, setSlipModal] = useState(null);
  const [slipFile, setSlipFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [viewQuotation, setViewQuotation] = useState(null);
  const [chatOrder, setChatOrder] = useState(null);
  const fileInputRef = useRef(null);

  const fetchOrders = () => {
    setLoading(true);
    fetch(`${API}/patient/get_orders.php`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.status === 'success') {
          setOrders(d.data || []);
        } else {
          setOrders([]);
        }
      })
      .catch((err) => {
        console.error(err);
        setOrders([]);
        setToast({ message: 'Failed to load orders. Please try again.', type: 'error' });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUploadSlip = async () => {
    if (!slipFile) {
      setToast({ message: 'Please select a payment slip file.', type: 'error' });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('order_id', slipModal.order_id);
    formData.append('payment_slip', slipFile);

    try {
      const res = await fetch(`${API}/patient/upload_slip.php`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();
      if (data.status === 'success') {
        setToast({ message: 'Payment slip uploaded! The pharmacist will verify it shortly.', type: 'success' });
        setSlipModal(null);
        fetchOrders();
      } else {
        setToast({ message: data.message || 'Upload failed. Please try again.', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: 'Network error. Please try again.', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {toast && <Notification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Slip Upload Modal */}
      {slipModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn" onClick={() => setSlipModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Upload Payment Slip</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Order ID: #{String(slipModal.order_id).padStart(6, '0')}
                </p>
              </div>
              <button
                onClick={() => setSlipModal(null)}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Slip File (Bank Transfer/Deposit)</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
                    slipFile
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/50'
                  }`}
                >
                  {slipFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileUp className="w-8 h-8 text-blue-500" />
                      <div className="text-left">
                        <p className="text-sm font-semibold text-gray-800 truncate max-w-[200px]">{slipFile.name}</p>
                        <p className="text-xs text-gray-500">{(slipFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSlipFile(null); }}
                        className="w-7 h-7 bg-red-100 hover:bg-red-200 rounded-lg flex items-center justify-center transition-colors"
                      >
                        <X className="w-3.5 h-3.5 text-red-600" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 font-medium">Click to upload slip</p>
                      <p className="text-xs text-gray-400 mt-1">Supports images and PDF files</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => setSlipFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3 justify-end">
              <button
                onClick={() => setSlipModal(null)}
                className="px-4 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadSlip}
                disabled={uploading}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {uploading ? 'Uploading...' : 'Upload Slip'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quotation View Modal */}
      {viewQuotation && (
        <QuotationView orderId={viewQuotation} onClose={() => setViewQuotation(null)} />
      )}

      {/* Order Chat Panel */}
      {chatOrder && (
        <OrderChat orderId={chatOrder} currentUserRole="patient" onClose={() => setChatOrder(null)} />
      )}

      <div className="bg-[#f0f5fa] rounded-3xl overflow-hidden relative shadow-sm border border-blue-100/50 flex flex-col md:flex-row items-stretch justify-between min-h-[160px]">
        <div className="p-5 md:p-6 flex-1 w-full md:pr-0 z-10 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shadow-sm">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-extrabold text-[#1e293b]">My Orders</h2>
          </div>
          <p className="text-gray-500 text-xs mb-4 max-w-md">
            Track your medicine orders, upload payment slips, and view your 4-digit pickup PINs.
          </p>
        </div>
        <div className="w-full md:w-[35%] h-40 md:h-[220px] absolute md:relative right-0 bottom-0 pointer-events-none flex justify-end">
          <img src={patientBannerImg} alt="My Orders" className="h-full object-cover md:object-contain object-right w-full opacity-30 md:opacity-100" style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 20%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 20%)' }} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-blue-500 spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 animate-fadeIn">
          <ShoppingCart className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 text-base font-semibold">No orders found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.order_id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-50 pb-4 mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Order #{String(o.order_id).padStart(6, '0')}</h3>
                    <p className="text-xs text-gray-500">{new Date(o.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize shadow-sm ${orderStatusColors[o.status] || 'bg-gray-100 text-gray-700'}`}>
                    {o.status}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-semibold mb-1">Pharmacy Details</p>
                  <p className="text-sm font-bold text-gray-800">{o.pharmacy_name}</p>
                  <p className="text-xs text-gray-600">{o.pharmacy_address}</p>
                </div>
                <div className="flex flex-col sm:items-end justify-center gap-2">
                  <p className="text-xs text-gray-500 font-semibold mb-1">Total Amount</p>
                  <p className="text-lg font-black text-gray-900">Rs. {parseFloat(o.total_amount).toFixed(2)}</p>
                </div>
              </div>

              {/* Action Area based on Status */}
              <div className="mt-5 pt-4 border-t border-gray-50 flex items-center justify-between flex-wrap gap-4">
                <div>
                  {o.status === 'Quoted' && (
                    <p className="text-sm text-gray-600 font-medium mb-2">Please upload your advance payment slip to confirm your order.</p>
                  )}
                  {o.status === 'Reserved' && o.pickup_pin && (
                    <div className="flex items-center gap-3 mb-2">
                      <p className="text-sm text-gray-600 font-medium">Your Pickup PIN:</p>
                      <span className="px-4 py-1.5 bg-green-100 text-green-800 text-lg font-black rounded-lg border border-green-200 tracking-widest shadow-sm">
                        {o.pickup_pin}
                      </span>
                    </div>
                  )}
                  {o.status === 'Pending Verification' && (
                    <span className="text-sm font-semibold text-amber-600 flex items-center gap-1.5 mb-2">
                      <Clock className="w-4 h-4" /> Verifying slip...
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setChatOrder(o.order_id)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-xl transition-colors shadow-sm"
                  >
                    <MessageSquare className="w-4 h-4" /> Chat
                  </button>
                  {o.status !== 'Pending' && o.status !== 'Rejected' && o.status !== 'cancelled' && (
                    <button
                      onClick={() => setViewQuotation(o.order_id)}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-bold rounded-xl transition-colors shadow-sm"
                    >
                      <FileText className="w-4 h-4" /> View Quote
                    </button>
                  )}
                  {o.status === 'Quoted' && (
                    <button
                      onClick={() => { setSlipModal(o); setSlipFile(null); }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
                    >
                      <Upload className="w-4 h-4" /> Upload Bank Slip
                    </button>
                  )}
                  {o.status === 'Reserved' && (
                    <button
                      onClick={() => {
                        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.pharmacy_name)}`, '_blank', 'noopener,noreferrer');
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
                    >
                      <Navigation className="w-4 h-4" /> Get Directions
                    </button>
                  )}
                </div>
              </div>

            </div>

          ))}
        </div>
      )}
    </div>
  );
}
