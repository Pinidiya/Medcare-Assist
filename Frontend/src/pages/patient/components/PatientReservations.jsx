import { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Send, FileText, CheckCircle2, ShieldCheck, 
  Clock, Loader2, X, 
  CreditCard, Sparkles, Info, Eye, Navigation, ArrowLeft, RefreshCw, Trash2,
  Store, User, Calendar, Receipt
} from 'lucide-react';
import ReservationCheckout from '../../../components/ReservationCheckout';
import { useAuth } from '../../../context/AuthContext';

const API = import.meta.env.VITE_API_BASE_URL;

import MessageListItem, { MessageAvatar } from '../../../components/common/MessageListItem';
import { getMedicineUnit } from '../../../utils/medicineUnit';

function getInitials(name) {
  if (!name) return 'PH';
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

export default function PatientReservations() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [selectedRes, setSelectedRes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [quote, setQuote] = useState(null);
  const [toast, setToast] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [patientAction, setPatientAction] = useState(null); // 'accept' or null
  const [showAcceptWarning, setShowAcceptWarning] = useState(false);
  const [pickupOption, setPickupOption] = useState('pay'); // 'pay' or 'direct'
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmountType, setPaymentAmountType] = useState('full'); // 'full' or 'half'
  const [rejectLoading, setRejectLoading] = useState(false);
  const [pickupLoading, setPickupLoading] = useState(false);
  const [revertLoading, setRevertLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [activeTab, setActiveTab] = useState('all');

  const chatEndRef = useRef(null);
  const pollingRef = useRef(null);
  const chatPollingRef = useRef(null);
  const toastTimerRef = useRef(null);

  // Fetch all patient reservations
  const fetchReservations = (selectId = null, shouldSelect = true) => {
    if (shouldSelect) setLoading(true);
    fetch(`${API}/patient/get_reservations.php`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.status === 'success') {
          setReservations(data.data || []);
          if (selectId && shouldSelect) {
            const found = (data.data || []).find(r => r.reservation_id == selectId);
            setSelectedRes(found || null);
          }
        }
      })
      .catch(() => showToast('Failed to load reservations', 'error'))
      .finally(() => {
        if (shouldSelect) setLoading(false);
      });
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  // Poll unread message counts with backoff
  useEffect(() => {
    let delay = 10000;
    const fetchUnreadCounts = () => {
      fetch(`${API}/shared/get_unread_counts.php`, { credentials: 'include' })
        .then((r) => r.json())
        .then((data) => {
          if (data.status === 'success') {
            setUnreadCounts(data.unread || {});
          }
          delay = 10000; // Reset delay on success
          pollingRef.current = setTimeout(fetchUnreadCounts, delay);
        })
        .catch(() => {
          console.error('Failed to fetch unread counts');
          delay = Math.min(delay * 2, 60000); // Backoff: double delay, max 60s
          pollingRef.current = setTimeout(fetchUnreadCounts, delay);
        });
    };
    fetchUnreadCounts();
    return () => { if (pollingRef.current) clearTimeout(pollingRef.current); };
  }, []);

  // Fetch chat messages and quote details upon selecting reservation
  useEffect(() => {
    if (!selectedRes?.reservation_id) {
      setMessages([]);
      setQuote(null);
      return;
    }

    fetchChatDetails();
  }, [selectedRes?.reservation_id]);

  // Poll chat messages with backoff for real-time-like updates
  useEffect(() => {
    if (!selectedRes?.reservation_id) return;
    let chatDelay = 10000;
    const pollChat = () => {
      fetch(`${API}/shared/get_reservation_chat.php?reservation_id=${selectedRes.reservation_id}`, { credentials: 'include' })
        .then((r) => r.json())
        .then((data) => {
          if (data.status === 'success') {
            setMessages(data.messages || []);
            setQuote(data.quote || null);
            if (data.context) {
              setSelectedRes(prev => {
                if (!prev) return { ...data.context };
                if (prev.status !== data.context.status || prev.payment_status !== data.context.payment_status) {
                  if (prev.status === 'paid' && data.context.status === 'bill_generated') return prev;
                  setTimeout(() => fetchReservations(data.context.reservation_id, false), 0);
                  return { ...prev, ...data.context };
                }
                return prev;
              });
            }
          }
          chatDelay = 10000; // Reset on success
          chatPollingRef.current = setTimeout(pollChat, chatDelay);
        })
        .catch(() => {
          console.error('Failed to poll chat messages');
          chatDelay = Math.min(chatDelay * 2, 60000);
          chatPollingRef.current = setTimeout(pollChat, chatDelay);
        });
    };
    chatPollingRef.current = setTimeout(pollChat, chatDelay);
    return () => { if (chatPollingRef.current) clearTimeout(chatPollingRef.current); };
  }, [selectedRes?.reservation_id]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchChatDetails = (showLoading = true) => {
    if (showLoading) setChatLoading(true);
    fetch(`${API}/shared/get_reservation_chat.php?reservation_id=${selectedRes.reservation_id}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.status === 'success') {
          setMessages(data.messages || []);
          setQuote(data.quote || null);
          
          // Sync reservation header status if changed
          if (data.context) {
            setSelectedRes(prev => {
              if (!prev) return { ...data.context };
              if (prev.status !== data.context.status || prev.payment_status !== data.context.payment_status) {
                // Prevent race condition: don't revert optimistic 'paid' status if webhook is slow
                if (prev.status === 'paid' && data.context.status === 'bill_generated') {
                  return prev; 
                }
                // Refresh reservation list in background using setTimeout to escape state updater phase
                setTimeout(() => fetchReservations(data.context.reservation_id, false), 0);
                return { ...prev, ...data.context };
              }
              return prev; // Return exact same reference if no status change to prevent infinite rendering loop!
            });
          }
        }
      })
      .catch(() => {
        console.error('Failed to load chat details');
      })
      .finally(() => {
        if (showLoading) setChatLoading(false);
      });
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  };

  // Send Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const text = newMessage.trim();
    setNewMessage('');

    try {
      const response = await fetch(`${API}/shared/send_reservation_message.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reservation_id: selectedRes.reservation_id,
          message_text: text
        })
      });
      const data = await response.json();
      if (data.status === 'success') {
        setMessages([...messages, data.data]);
      } else {
        showToast(data.message, 'error');
      }
    } catch (err) {
      showToast('Network error. Try again.', 'error');
    }
  };

  const handleDeleteChat = async (messageId) => {
    if (!window.confirm("Are you sure you want to delete this message?")) return;
    
    try {
      const res = await fetch(`${API}/shared/delete_reservation_message.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id: messageId }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchChatDetails(false);
      } else {
        showToast(data.message, 'error');
      }
    } catch (err) {
      showToast('Network error.', 'error');
    }
  };

  // Patient Delete Chat Handler
  const handleDeleteReservation = async () => {
    if (!window.confirm("Are you sure you want to delete this chat from your dashboard? This will not affect the pharmacy's records.")) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API}/patient/delete_reservation.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reservation_id: selectedRes.reservation_id })
      });
      const data = await res.json();
      if (data.status === 'success') {
        showToast('Chat deleted from dashboard', 'success');
        setSelectedRes(null);
        fetchReservations(); // Refresh list to remove the deleted one
      } else {
        showToast(data.message, 'error');
      }
    } catch {
      showToast('Error deleting chat', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Patient Rejection Handler
  const handleRejectBill = async () => {
    if (!window.confirm("Are you sure you want to reject this digital bill? This action cannot be undone.")) return;
    setRejectLoading(true);
    try {
      const response = await fetch(`${API}/patient/reject_reservation.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reservation_id: selectedRes.reservation_id })
      });
      const data = await response.json();
      if (data.status === 'success') {
        showToast('Bill has been rejected successfully.', 'success');
        setPatientAction(null);
        fetchChatDetails();
        fetchReservations(selectedRes.reservation_id);
      } else {
        showToast(data.message, 'error');
      }
    } catch {
      showToast('Failed to reject bill', 'error');
    } finally {
      setRejectLoading(false);
    }
  };

  // Patient Direct Pickup Handler (Option B)
  const handleDirectPickup = async () => {
    setPickupLoading(true);
    try {
      const response = await fetch(`${API}/patient/direct_pickup.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reservation_id: selectedRes.reservation_id })
      });
      const data = await response.json();
      if (data.status === 'success') {
        showToast('Status updated to Pending Pickup!', 'success');
        setPatientAction(null);
        fetchChatDetails();
        fetchReservations(selectedRes.reservation_id);
        
        // Construct native LeafletJS navigation URL
        const lat = selectedRes.latitude || 6.9271;
        const lng = selectedRes.longitude || 79.8612;
        const name = encodeURIComponent(selectedRes.pharmacy_name);
        const address = encodeURIComponent(selectedRes.pharmacy_address);
        const directionsUrl = `/patient/navigation?lat=${lat}&lng=${lng}&name=${name}&address=${address}`;
        
        // Open LeafletJS routing URL in a native new browser tab
        window.open(directionsUrl, '_blank');
      } else {
        showToast(data.message, 'error');
      }
    } catch {
      showToast('Failed to opt for direct pickup', 'error');
    } finally {
      setPickupLoading(false);
    }
  };

  // Patient Revert Pickup Handler
  const handleRevertPickup = async () => {
    setRevertLoading(true);
    try {
      const response = await fetch(`${API}/patient/revert_direct_pickup.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reservation_id: selectedRes.reservation_id })
      });
      const data = await response.json();
      if (data.status === 'success') {
        showToast('Successfully reverted! You can now choose Pay & Reserve.', 'success');
        setPatientAction('accept');
        fetchChatDetails();
        fetchReservations(selectedRes.reservation_id);
      } else {
        showToast(data.message || 'Failed to revert', 'error');
      }
    } catch (err) {
      showToast('Network error while reverting', 'error');
    } finally {
      setRevertLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const configs = {
      'Pending': 'bg-amber-100 text-amber-800 border-amber-200',
      'Quoted': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'Reserved': 'bg-purple-100 text-purple-800 border-purple-200 font-extrabold',
      'Completed': 'bg-green-100 text-green-800 border-green-200',
      'Rejected': 'bg-red-100 text-red-800 border-red-200',
      'bill_generated': 'bg-blue-100 text-blue-800 border-blue-200 font-bold',
      'rejected': 'bg-rose-100 text-rose-800 border-rose-200',
      'pending_pickup': 'bg-cyan-100 text-cyan-800 border-cyan-200 font-bold',
      'paid': 'bg-emerald-100 text-emerald-800 border-emerald-200 font-extrabold tracking-wide',
      'claimed': 'bg-teal-100 text-teal-800 border-teal-200 font-semibold',
    };
    return configs[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-5 h-auto xl:h-[calc(100vh-140px)] min-h-[calc(100vh-140px)] pb-10 xl:pb-0">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl animate-fadeIn ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'} text-white`}>
          <CheckCircle2 className="w-5 h-5 text-white" />
          <p className="font-bold text-sm">{toast.message}</p>
        </div>
      )}

      {/* Accept Warning Modal */}
      {showAcceptWarning && selectedRes && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fadeIn" onClick={() => setShowAcceptWarning(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-slideUp" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center gap-3 bg-amber-50">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                <Info className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="font-extrabold text-gray-800 text-lg">Important Notice</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 leading-relaxed font-medium text-center">
                Please note that you <strong className="text-gray-900">must bring the physical original prescription</strong> with you when you visit the pharmacy to collect your medicines.
              </p>
            </div>
            <div className="p-4 bg-gray-50 flex gap-3">
              <button
                onClick={() => setShowAcceptWarning(false)}
                className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowAcceptWarning(false);
                  setPatientAction('accept');
                }}
                className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20 text-sm"
              >
                OK, I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedRes && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowPaymentModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-extrabold text-gray-800 text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" /> Secure Online Payment
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(100vh-120px)]">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-amber-800 text-xs">
                <Info className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <p className="leading-relaxed font-medium">To secure your reservation instantly, you must pay at least 50% of the total amount upfront. You can also choose to pay the full amount now.</p>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Select Payment Option</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentAmountType('half')}
                    className={`p-4 rounded-xl border-2 text-left flex flex-col justify-between transition-all ${paymentAmountType === 'half' ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-600/10' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                  >
                    <span className={`text-[10px] font-bold uppercase ${paymentAmountType === 'half' ? 'text-blue-600' : 'text-gray-500'}`}>50% Advance</span>
                    <span className="text-lg font-black text-gray-900 mt-1">Rs. {(quote?.total_amount / 2).toFixed(2)}</span>
                  </button>
                  <button
                    onClick={() => setPaymentAmountType('full')}
                    className={`p-4 rounded-xl border-2 text-left flex flex-col justify-between transition-all ${paymentAmountType === 'full' ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-600/10' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                  >
                    <span className={`text-[10px] font-bold uppercase ${paymentAmountType === 'full' ? 'text-blue-600' : 'text-gray-500'}`}>Full Amount</span>
                    <span className="text-lg font-black text-gray-900 mt-1">Rs. {parseFloat(quote?.total_amount).toFixed(2)}</span>
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <ReservationCheckout
                  reservation={selectedRes}
                  amount={paymentAmountType === 'half' ? quote?.total_amount / 2 : quote?.total_amount}
                  customerDetails={{
                    first_name: selectedRes.patient_name?.split(' ')[0],
                    last_name: selectedRes.patient_name?.split(' ').slice(1).join(' ') || 'User',
                    email: selectedRes.patient_email || 'patient@example.com',
                    phone: selectedRes.patient_phone || '0771234567',
                    address: selectedRes.patient_address || '123 Hospital Road'
                  }}
                  onPaymentSuccess={(orderId) => {
                    showToast('Payment successful! Order ID: ' + orderId, 'success');
                    setShowPaymentModal(false);
                    setSelectedRes(prev => ({ ...prev, status: 'paid', payment_status: 'paid' }));
                    fetchChatDetails();
                    fetchReservations(selectedRes.reservation_id);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxOpen && selectedRes && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setLightboxOpen(false)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] bg-transparent" onClick={e => e.stopPropagation()}>
            <button onClick={() => setLightboxOpen(false)} className="absolute -top-12 right-0 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
            <img 
              src={selectedRes.prescription_url?.startsWith('http') ? selectedRes.prescription_url : `${API}/shared/view_file.php?file=${encodeURIComponent(selectedRes.prescription_url)}`} 
              alt="Prescription Large" 
              className="max-w-full max-h-[80vh] mx-auto object-contain rounded-xl shadow-2xl" 
            />
          </div>
        </div>
      )}

      {/* Left Sidebar Queue list */}
      <div className={`xl:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full ${selectedRes ? 'hidden xl:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-100">
          <div className="flex gap-1 overflow-x-auto">
            <button onClick={() => setActiveTab('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${activeTab === 'all' ? 'bg-[#1A73E8] text-white' : 'text-[#64748B] hover:bg-gray-100'}`}>All Messages ({reservations.length})</button>
            <button onClick={() => setActiveTab('pending')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${activeTab === 'pending' ? 'bg-[#1A73E8] text-white' : 'text-[#64748B] hover:bg-gray-100'}`}>Pending ({reservations.filter(r => r.status === 'pending' || r.status === 'bill_generated').length})</button>
            <button onClick={() => setActiveTab('complete')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${activeTab === 'complete' ? 'bg-[#1A73E8] text-white' : 'text-[#64748B] hover:bg-gray-100'}`}>Complete ({reservations.filter(r => r.status === 'completed' || r.status === 'paid' || r.status === 'reserved').length})</button>
          </div>
        </div>

        {/* Reservations list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Loader2 className="w-8 h-8 spin text-blue-500 mb-2" />
              <p className="text-xs">Loading...</p>
            </div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No messages found</p>
            </div>
          ) : (
            [...reservations]
              .filter(res => {
                if (activeTab === 'pending') return res.status === 'pending' || res.status === 'bill_generated';
                if (activeTab === 'complete') return res.status === 'completed' || res.status === 'paid' || res.status === 'reserved';
                return true;
              })
              .sort((a, b) => {
                const unreadA = unreadCounts[a.reservation_id] || 0;
                const unreadB = unreadCounts[b.reservation_id] || 0;
                if (unreadA > 0 && unreadB === 0) return -1;
                if (unreadB > 0 && unreadA === 0) return 1;
                return new Date(b.created_at) - new Date(a.created_at);
              })
              .map((res) => {
                const isSelected = selectedRes?.reservation_id === res.reservation_id;
                return (
                  <MessageListItem
                    key={res.reservation_id}
                    id={res.reservation_id}
                    initials={getInitials(res.pharmacy_name)}
                    status={res.status}
                    name={res.pharmacy_name}
                    time={new Date(res.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                    orderId={res.reservation_id}
                    snippet={res.pharmacy_address}
                    unreadCount={unreadCounts[res.reservation_id] || 0}
                    statusStyle={getStatusColor(res.status)}
                    statusLabel={res.status}
                    isActive={isSelected}
                    onClick={(id) => {
                      setSelectedRes(res);
                      setPatientAction(null);
                      setUnreadCounts(prev => { const n = {...prev}; delete n[id]; return n; });
                    }}
                  />
                );
              })
          )}
        </div>
      </div>

      {/* Main Chat/Workspace Pane */}
      {!selectedRes ? (
        <div className="hidden xl:flex xl:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm items-center justify-center h-full">
          <div className="text-center py-16">
            <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-800">Select a Reservation</h3>
            <p className="text-sm text-gray-400 max-w-sm mt-1 mx-auto">
              Select one of your reservations from the list to view active 1-on-1 pharmacist clarification notes, see quotes, and complete pickup checkout.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Split: Chat Pane (Left side) */}
          <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[600px] xl:h-full">
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedRes(null)} className="xl:hidden p-2 text-[#64748B] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer relative z-10">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <MessageAvatar initials={getInitials(selectedRes.pharmacy_name)} status={selectedRes.status} size="sm" />
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">{selectedRes.pharmacy_name}</h3>
                    <p className="text-[11px] text-[#64748B]">Reservation #{selectedRes.reservation_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => fetchChatDetails(true)} 
                    disabled={chatLoading}
                    className="flex items-center gap-1.5 p-1.5 text-[#64748B] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${chatLoading ? 'spin' : ''}`} />
                  </button>
                  <button 
                    onClick={() => setLightboxOpen(true)}
                    className="flex items-center gap-1.5 p-1.5 text-[#64748B] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                    title="View Prescription"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={handleDeleteReservation}
                    disabled={deleteLoading}
                    className="flex items-center gap-1.5 p-1.5 text-[#64748B] hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    title="Delete Chat"
                  >
                    {deleteLoading ? <Loader2 className="w-4 h-4 spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${getStatusColor(selectedRes.status)}`}>
                    {selectedRes.status}
                  </span>
                </div>
              </div>

              {/* Chat messages list */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {chatLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-8">No messages yet</p>
                ) : (
                  messages.map((msg, idx) => {
                    const isPatient = msg.sender_role === 'patient';
                    const isSystem = msg.message_text.includes('[SYSTEM') || msg.message_text.includes('successfully') || msg.message_text.includes('assigned');
                    
                    if (isSystem) {
                      return (
                        <div key={msg.message_id || idx} className="text-center my-4">
                          <span className="inline-block bg-[#F8FAFC] text-[#64748B] text-[10px] font-medium px-3 py-1 rounded-full border border-[#E2E8F0]">
                            {msg.message_text}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div key={msg.message_id || idx}>
                        <p className="text-[11px] text-[#94A3B8] mb-3 text-center">
                          {msg.created_at ? new Date(msg.created_at).toLocaleDateString() : ''}
                        </p>
                        <div className="flex items-start gap-3">
                          <MessageAvatar
                            initials={isPatient ? 'PT' : getInitials(selectedRes.pharmacy_name)}
                            status={selectedRes.status}
                            size="sm"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-xs font-semibold text-[#0F172A]">
                                {isPatient ? 'You' : (selectedRes.pharmacist_name || selectedRes.pharmacy_name)}
                              </span>
                              <span className="text-[10px] text-[#94A3B8]">
                                {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                              {isPatient && (
                                <button onClick={() => handleDeleteChat(msg.message_id)} className="text-gray-400 hover:text-red-500 transition-colors ml-auto" title="Delete message">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <div className={`rounded-2xl p-4 max-w-[85%] ${
                              isPatient
                                ? 'bg-[#1A73E8]/5 border border-[#1A73E8]/10 rounded-tl-sm'
                                : 'bg-[#F1F5F9] rounded-tl-sm'
                            }`}>
                              <p className={`text-sm ${isPatient ? 'text-[#0F172A]' : 'text-[#334155]'}`}>
                                {msg.message_text}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input form */}
              <div className="mt-auto border-t border-gray-100 p-4 bg-[#F8FAFC]">
                <h4 className="text-xs font-bold text-[#64748B] mb-2 uppercase tracking-wider">Reply Message</h4>
                <div className="relative">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your reply..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/30 focus:border-[#1A73E8] resize-none"
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="mt-3 w-full bg-[#1A73E8] hover:bg-[#155DB1] disabled:bg-[#94A3B8] text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" /> Send Reply
                </button>
              </div>
            </div>

            {/* Split: Digital Prescription Viewer & Patient Action Dashboard (Right side) */}
            <div className="xl:col-span-1 space-y-4 overflow-y-visible xl:overflow-y-auto h-auto xl:h-full flex flex-col">
              
              {/* Body details & Status */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4 flex-shrink-0">
                <h4 className="text-sm font-bold text-[#0F172A] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#1A73E8]" /> Patient Action Dashboard
                </h4>
                {/* Status card */}
                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-3">
                  {selectedRes.status !== 'bill_generated' && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500">Reservation Status</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusColor(selectedRes.status)}`}>
                        {selectedRes.status === 'rejected' ? 'Rejected' :
                         selectedRes.status === 'pending_pickup' ? 'Direct Pickup' :
                         (selectedRes.status === 'paid' || selectedRes.status === 'Reserved') ? 'Reserved' :
                         selectedRes.status === 'completed' ? 'Completed' :
                         selectedRes.status}
                      </span>
                    </div>
                  )}
                  <div className={`flex items-center justify-between ${selectedRes.status !== 'bill_generated' ? 'border-t border-gray-100 pt-3' : ''}`}>
                    <span className="text-xs font-semibold text-gray-500">Payment Status</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      selectedRes.status === 'completed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      selectedRes.payment_status === 'Paid' ? 'bg-green-50 text-green-700 border-green-200' : 
                      selectedRes.payment_status === 'Half_Paid' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                      'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {selectedRes.status === 'completed' ? 'Completed' :
                       selectedRes.payment_status === 'Paid' ? 'Full Payment' : 
                       selectedRes.payment_status === 'Half_Paid' ? 'Half Payment (Advance)' : 'Pending'}
                    </span>
                  </div>

                  {/* Pickup PIN display */}
                  {(selectedRes.status === 'Reserved' || selectedRes.status === 'paid' || selectedRes.status === 'pending_pickup') && selectedRes.pickup_pin && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl text-center space-y-1.5 animate-fadeIn">
                      <p className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-widest">
                        {selectedRes.status === 'pending_pickup' ? 'Direct Pickup PIN' : 'Reserved Pickup Pin'}
                      </p>
                      <p className="text-3xl font-black text-emerald-800 tracking-[0.5em] pl-[0.5em]">{selectedRes.pickup_pin}</p>
                      <p className="text-[10px] text-gray-500 font-semibold">Provide this secure 4-digit PIN to the pharmacist when picking up your medicines.</p>
                    </div>
                  )}

                  {/* Direct Pickup Navigate Button display */}
                  {selectedRes.status === 'pending_pickup' && (
                    <div className="mt-4 p-4 bg-cyan-50 border border-cyan-200 rounded-xl text-center space-y-2 animate-fadeIn">
                      <p className="text-xs font-bold text-cyan-800 flex items-center justify-center gap-1">🧭 Opted for Direct Pickup</p>
                      <p className="text-[10px] text-gray-500">You opted to pick up directly. Use the map below to navigate to the pharmacy location.</p>
                      <button
                        onClick={() => {
                          const lat = selectedRes.latitude || 6.9271;
                          const lng = selectedRes.longitude || 79.8612;
                          const name = encodeURIComponent(selectedRes.pharmacy_name);
                          const address = encodeURIComponent(selectedRes.pharmacy_address);
                          const pinParam = selectedRes.pickup_pin ? `&pin=${selectedRes.pickup_pin}` : '';
                          window.open(`/patient/navigation?lat=${lat}&lng=${lng}&name=${name}&address=${address}${pinParam}`, '_blank');
                        }}
                        className="w-full mt-1.5 flex items-center justify-center gap-1.5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                      >
                        <Navigation className="w-3.5 h-3.5" /> Navigate using Map
                      </button>
                      <button
                        onClick={handleRevertPickup}
                        disabled={revertLoading}
                        className="w-full mt-2 flex items-center justify-center gap-1.5 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-[10px] font-bold rounded-lg shadow-sm transition-all"
                      >
                        {revertLoading ? <Loader2 className="w-3.5 h-3.5 spin text-gray-500" /> : <RefreshCw className="w-3.5 h-3.5" />} Change to Pay Online & Reserve
                      </button>
                    </div>
                  )}
                </div>

                {/* Pharmacist Note container */}
                {selectedRes.pharmacist_note && (
                  <div className="bg-amber-50/40 border border-amber-200 rounded-2xl p-4 shadow-sm space-y-1.5 animate-fadeIn">
                    <h5 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-amber-600" /> Pharmacist Note / Instructions
                    </h5>
                    <p className="text-xs text-amber-800 font-medium italic leading-relaxed">
                      "{selectedRes.pharmacist_note}"
                    </p>
                  </div>
                )}
              </div>

              {/* Quote details (Invoice) - Full width in the column */}
                {!quote ? (
                  <div className="bg-white rounded-2xl p-6 text-center text-gray-400 space-y-2 border border-gray-100 shadow-sm">
                    <Clock className="w-8 h-8 text-gray-300 mx-auto mb-1 animate-pulse" />
                    <p className="text-xs font-bold text-gray-700">Awaiting pharmacist quote...</p>
                    <p className="text-[10px] max-w-[200px] mx-auto leading-relaxed">
                      The assigned pharmacist is currently reviewing your prescription document to compile prices. You will be notified in the clarification notes as soon as it is ready!
                    </p>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm animate-fadeIn flex-shrink-0">
                    {/* Blue Header */}
                    <div className="bg-[#1A73E8] p-3 text-white flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                          <Receipt className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-lg">{selectedRes.pharmacy_name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-blue-100 tracking-wider">Invoice</p>
                        <p className="font-bold text-base">#{String(selectedRes.reservation_id).padStart(5, '0')}</p>
                      </div>
                    </div>

                    {/* Info Section */}
                    <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
                      <div className="p-4 space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                          <Store className="w-3 h-3" /> Pharmacy
                        </p>
                        <p className="text-xs font-bold text-gray-800">{selectedRes.pharmacy_name}</p>
                      </div>
                      <div className="p-4 space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                          <User className="w-3 h-3" /> Patient
                        </p>
                        <p className="text-xs font-bold text-gray-800">{user?.full_name || 'Patient Name'}</p>
                        <p className="text-[10px] text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <span className={`mt-1 inline-block px-2 py-0.5 text-[10px] font-bold rounded ${
                          selectedRes.status === 'completed' ? 'bg-blue-50 text-blue-700' :
                          selectedRes.status === 'paid' ? 'bg-emerald-50 text-emerald-700' :
                          selectedRes.status === 'pending_pickup' || selectedRes.status === 'Reserved' ? 'bg-cyan-50 text-cyan-700' :
                          selectedRes.status === 'rejected' ? 'bg-red-50 text-red-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {selectedRes.status === 'completed' ? 'COMPLETED' :
                           selectedRes.status === 'paid' ? 'PAID' :
                           selectedRes.status === 'pending_pickup' || selectedRes.status === 'Reserved' ? 'RESERVED' :
                           selectedRes.status === 'rejected' ? 'REJECTED' :
                           'PENDING'}
                        </span>
                      </div>
                    </div>

                    {/* Medicines List */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Medicines</h5>
                        <span className="text-[11px] text-gray-400">{quote.items.length} item{quote.items.length !== 1 ? 's' : ''}</span>
                      </div>

                      <div className="bg-[#F8FAFC] rounded-xl overflow-hidden border border-[#F1F5F9]">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-[#F1F5F9]">
                              <th className="py-2.5 px-3 text-[10px] font-bold text-gray-500 w-8 text-center">#</th>
                              <th className="py-2.5 px-3 text-[10px] font-bold text-gray-500">MEDICINE</th>
                              <th className="py-2.5 px-3 text-[10px] font-bold text-gray-500 text-center w-12">QTY</th>
                              <th className="py-2.5 px-3 text-[10px] font-bold text-gray-500 text-right w-24">AMOUNT</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F1F5F9] bg-white">
                            {quote.items.map((item, idx) => (
                              <tr key={item.item_id || idx} className="hover:bg-[#F8FAFC]/50 transition-colors">
                              <td className="py-2.5 px-3 text-[10px] font-bold text-gray-400 text-center">{idx + 1}</td>
                                <td className="py-2.5 px-3">
                                  <p className="text-[10px] font-bold text-[#0F172A]">{item.brand_name}</p>
                                  <p className="text-[9px] text-gray-400">{item.generic_name}</p>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className="inline-block bg-[#F8FAFC] text-gray-600 font-bold text-[9px] px-2 py-0.5 rounded-lg border border-gray-100 whitespace-nowrap">
                                    {item.quantity} <span className="font-normal text-gray-400">{getMedicineUnit(item, item.quantity)}</span>
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <p className="text-[10px] font-bold text-[#0F172A]">Rs. {(item.quantity * item.unit_price).toFixed(2)}</p>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Total */}
                      <div className="mt-3 bg-[#F0F7FF] rounded-xl p-3 flex items-center justify-between border border-[#E0EFFF]">
                        <div>
                          <p className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider">Total Amount</p>
                          <p className="text-[9px] text-[#94A3B8]">Inclusive of all medicines</p>
                        </div>
                        <div className="text-right flex items-baseline gap-1">
                          <span className="text-lg font-black text-[#1A73E8]">Rs. {quote.total_amount.toFixed(2)}</span>
                          <span className="text-[9px] font-bold text-[#94A3B8]">LKR</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              {/* PAID STATUS & PIN DISPLAY */}
              {(selectedRes.status === 'paid' || selectedRes.status === 'completed' || selectedRes.status === 'pending_pickup') && (
                <div className="bg-emerald-50 rounded-2xl border border-emerald-200 shadow-sm p-5 space-y-3 flex-shrink-0 relative overflow-hidden animate-slideDown mt-4">
                  <div className="flex items-center justify-center gap-2 text-emerald-700">
                    <CheckCircle2 className="w-5 h-5" />
                    <h3 className="font-bold">Order Confirmed</h3>
                  </div>
                  <div className="bg-white rounded-xl p-4 text-center border border-emerald-100 shadow-sm">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Your Pickup PIN</p>
                    <p className="text-3xl font-black text-emerald-600 tracking-[0.3em]">{selectedRes.pickup_pin}</p>
                  </div>
                  <p className="text-[10px] text-emerald-600 text-center font-medium leading-relaxed">
                    Please present this PIN at the pharmacy counter to collect your medicines.
                  </p>
                </div>
              )}

              {/* Patient's Interactive Action and Checkout Decision Panel */}
              {quote && selectedRes.status === 'bill_generated' && (
                <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4 flex-shrink-0 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-[#0F172A] flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#1A73E8]" /> Checkout Options
                    </h3>
                    <div className="text-right">
                      <span className="text-[9px] text-[#64748B] font-bold uppercase tracking-widest block">Payable Total</span>
                      <span className="text-lg font-black text-[#1A73E8]">Rs. {quote.total_amount.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="h-[1px] w-full bg-gradient-to-r from-gray-100 via-gray-200 to-transparent"></div>

                  {/* STEP 1: Show Accept / Reject Buttons */}
                  {selectedRes.status === 'bill_generated' && !patientAction && (
                    <div className="space-y-3 animate-fadeIn">
                      <p className="text-[10px] text-gray-500 font-medium">Review the itemized invoice above. Accepting will reserve your medicines securely.</p>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setShowAcceptWarning(true)}
                          className="py-3 bg-[#1A73E8] hover:bg-[#155DB1] text-white font-extrabold rounded-xl transition-all shadow-md shadow-[#1A73E8]/20 text-xs flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4 text-white" /> Accept Bill
                        </button>
                        <button
                          onClick={handleRejectBill}
                          disabled={rejectLoading}
                          className="py-3 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 hover:text-rose-700 font-extrabold rounded-xl transition-all text-xs flex items-center justify-center gap-1.5"
                        >
                          {rejectLoading ? <Loader2 className="w-4 h-4 spin text-rose-600" /> : <X className="w-4 h-4" />} Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Show Conditional Option A or Option B on Acceptance */}
                  {selectedRes.status === 'bill_generated' && patientAction === 'accept' && (
                    <div className="space-y-4 animate-slideDown">
                      {/* Reject button for changing mind */}
                      <div className="flex justify-end">
                        <button 
                          onClick={handleRejectBill}
                          disabled={rejectLoading}
                          className="text-[10px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 transition-all bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-100 shadow-sm"
                        >
                          {rejectLoading ? <Loader2 className="w-3 h-3 spin" /> : <X className="w-3 h-3" />} Cancel & Reject Order
                        </button>
                      </div>

                      {/* Selector cards */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          onClick={() => setPickupOption('pay')}
                          className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all h-20 ${pickupOption === 'pay' ? 'bg-blue-50/50 border-blue-500 text-blue-900 ring-2 ring-blue-500/10' : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'}`}
                        >
                          <CreditCard className={`w-4 h-4 ${pickupOption === 'pay' ? 'text-blue-600' : 'text-gray-400'}`} />
                          <span className="text-[11px] font-bold block mt-1.5 leading-tight">Pay &amp; Reserve</span>
                        </button>

                        <button
                          onClick={() => setPickupOption('direct')}
                          className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all h-20 ${pickupOption === 'direct' ? 'bg-cyan-50/50 border-cyan-500 text-cyan-900 ring-2 ring-cyan-500/10' : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'}`}
                        >
                          <Navigation className={`w-4 h-4 ${pickupOption === 'direct' ? 'text-cyan-600' : 'text-gray-400'}`} />
                          <span className="text-[11px] font-bold block mt-1.5 leading-tight">Direct Pickup</span>
                        </button>
                      </div>

                      {/* Display Option A form triggers */}
                      {pickupOption === 'pay' && (
                        <div className="space-y-2.5 animate-fadeIn">
                          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[10px] text-blue-700 leading-relaxed">
                            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5 inline-block mr-1" />
                            <span>Online payment secures your reservation instantly. You can choose to pay the full amount or a 50% advance to reserve.</span>
                          </div>

                          <button
                            onClick={() => setShowPaymentModal(true)}
                            className="w-full flex items-center justify-center gap-1.5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl transition-all shadow-md shadow-blue-600/20 text-xs"
                          >
                            <CreditCard className="w-4 h-4" /> Proceed to Online Payment
                          </button>
                        </div>
                      )}

                      {/* Display Option B form triggers */}
                      {pickupOption === 'direct' && (
                        <div className="space-y-2.5 animate-fadeIn">
                          <div className="p-3 bg-cyan-50 border border-cyan-100 rounded-xl text-[10px] text-cyan-700 leading-relaxed">
                            <Info className="w-4 h-4 text-cyan-500 flex-shrink-0 mt-0.5 inline-block mr-1" />
                            <span>Direct Pickup transitions your reservation directly to pending pickup. You can navigate instantly using the map in a new tab.</span>
                          </div>

                          <button
                            onClick={handleDirectPickup}
                            disabled={pickupLoading}
                            className="w-full flex items-center justify-center gap-1.5 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold rounded-xl transition-all shadow-md shadow-cyan-600/10 text-xs"
                          >
                            {pickupLoading ? <Loader2 className="w-4 h-4 spin text-white" /> : <Navigation className="w-4 h-4" />} Confirm &amp; Get Directions
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedRes.status === 'rejected' && (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 font-medium">
                      <X className="w-4.5 h-4.5 text-rose-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Quotation Rejected</p>
                        <p className="text-[10px] text-rose-700 mt-0.5 leading-relaxed">
                          You rejected this digital bill quotation. You can chat with the pharmacist in the left workspace to request revisions or alternative medications.
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedRes.status === 'pending_pickup' && (
                    <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-xl flex items-start gap-2.5 text-xs text-cyan-800 font-medium">
                      <Navigation className="w-4.5 h-4.5 text-cyan-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Pending Direct Pickup</p>
                        <p className="text-[10px] text-cyan-700 mt-0.5 leading-relaxed">
                          Your reservation is pending pickup. Visit the pharmacy and pay the amount directly to claim your medicines.
                        </p>
                      </div>
                    </div>
                  )}

                  {(selectedRes.status === 'Reserved' || selectedRes.status === 'paid') && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-2.5 text-xs text-green-800 font-medium">
                      <CheckCircle2 className="w-4.5 h-4.5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Reservation Secured!</p>
                        <p className="text-[10px] text-green-700 mt-0.5 leading-relaxed">
                          Your payment is verified. Visit the pharmacy and present the 4-digit pickup PIN shown above to claim your medicines.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
        </>
      )}
    </div>
  );
}
