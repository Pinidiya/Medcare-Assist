import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Pill, ShoppingCart,
  Building2, Heart, AlertTriangle,
  Upload, MapPin, Phone,
  Star, CheckCircle, Package,
  Loader2, X, Bell, Activity, ShieldCheck, MessageSquare, ClipboardList, Settings
} from 'lucide-react';
import SettingsView from '../../components/SettingsView';
import NavigationPage from './components/NavigationPage';
import PatientReservations from './components/PatientReservations';
import PatientOrderHistory from './components/PatientOrderHistory';
import MedicinesView from './components/MedicinesView';
import PharmaciesView from './components/PharmaciesView';
import SOSButton from './components/SOSButton';
import PlaceholderView from './components/PlaceholderView';
import OrdersView from './components/OrdersView';
import MedicalHistoryLockerView from './components/MedicalHistoryLockerView';
import MedicineRemindersView from './components/MedicineRemindersView';
import MedicineSearch from './components/MedicineSearch';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet marker in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const API = import.meta.env.VITE_API_BASE_URL;
import { patientApi } from '../../services/patientApi';
import { sharedApi } from '../../services/sharedApi';

const DISTRICTS = [
  'All Districts', 'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale',
  'Nuwara Eliya', 'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi',
  'Mannar', 'Mullaitivu', 'Vavuniya', 'Batticaloa', 'Ampara', 'Trincomalee',
  'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
  'Monaragala', 'Ratnapura', 'Kegalle'
];

/* ──────────────────────────────────────────────
   LOCATION MARKER COMPONENT
   ────────────────────────────────────────────── */
const LocationMarker = ({ sosLocation, setSosLocation }) => {
  useMapEvents({
    click(e) {
      setSosLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return sosLocation === null ? null : (
    <Marker 
      position={sosLocation} 
      draggable={true} 
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          const position = marker.getLatLng();
          setSosLocation({ lat: position.lat, lng: position.lng });
        },
      }}
    />
  );
};

const sidebarItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/patient/dashboard' },
  { label: 'Find Pharmacy', icon: Building2, path: '/patient/pharmacies' },
  { label: 'My Reservations', icon: MessageSquare, path: '/patient/reservations' },
  { label: 'Medical History Locker', icon: ClipboardList, path: '/patient/history' },
  { label: 'Order History', icon: Package, path: '/patient/order-history' },
  { label: 'Medicine Reminders', icon: Bell, path: '/patient/reminders' },
  { label: 'My Settings', icon: Settings, pageKey: 'settings', path: '/patient/settings' }
];

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

const availableServices = [
  { icon: Pill, label: 'Reserve Medicine', desc: 'Browse & reserve medicines online', color: 'from-blue-500 to-blue-700', bg: 'bg-blue-50', iconColor: 'text-blue-600' },
  { icon: Upload, label: 'Upload Prescription', desc: 'Send prescription digitally', color: 'from-teal-500 to-emerald-700', bg: 'bg-teal-50', iconColor: 'text-teal-600' },
  { icon: Building2, label: 'Find Pharmacies', desc: 'Locate nearby stores easily', color: 'from-purple-500 to-indigo-700', bg: 'bg-purple-50', iconColor: 'text-blue-600' },
];

/* ──────────────────────────────────────────────
   MAIN DASHBOARD COMPONENT
   ────────────────────────────────────────────── */
export default function PatientDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const openInMapsGlobal = (p) => {
    const pLat = p.latitude ? parseFloat(p.latitude) : (p.lat ? parseFloat(p.lat) : null);
    const pLng = p.longitude ? parseFloat(p.longitude) : (p.lng ? parseFloat(p.lng) : null);
    if (!pLat || !pLng) {
      setFeedbackToast({ message: 'Location not available for this pharmacy.', type: 'error' });
      if (feedbackToastRef.current) clearTimeout(feedbackToastRef.current);
      feedbackToastRef.current = setTimeout(() => setFeedbackToast(null), 3000);
      return;
    }
    navigate('/patient/navigation', { 
      state: { 
        pharmacy: {
          name: p.pharmacy_name || p.name,
          address: p.address,
          lat: pLat,
          lng: pLng
        } 
      } 
    });
  };

  const [loading, setLoading] = useState(true);
  const [sosToast, setSosToast] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const [emergencyData, setEmergencyData] = useState(null);
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [sosConfirmModal, setSosConfirmModal] = useState(false);
  const [sosLocation, setSosLocation] = useState(null);
  const [cart, setCart] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [activeTab, setActiveTab] = useState('medicines');
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState(null);

  // Removed inline search state
  
  const [currentPage, setCurrentPage] = useState(1);
  const pollingRef = useRef(null);
  const feedbackToastRef = useRef(null);

  useEffect(() => {
    let delay = 10000;
    const fetchUnreadCounts = () => {
      sharedApi.getUnreadCounts()
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



  useEffect(() => {
    patientApi.getDashboard()
      .then(d => {
        if (d.status === 'success') {
        }
      })
      .catch(() => {
        console.error('Failed to load dashboard data');
        setFeedbackToast({ message: 'Failed to load dashboard data.', type: 'error' });
        if (feedbackToastRef.current) clearTimeout(feedbackToastRef.current);
        feedbackToastRef.current = setTimeout(() => setFeedbackToast(null), 4000);
      })
      .finally(() => setLoading(false));
    return () => { if (feedbackToastRef.current) clearTimeout(feedbackToastRef.current); };
  }, []);

  // LocationMarker logic moved outside the component.
  const handleSOS = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    
    setSosLoading(true);
    setSosToast(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setSosLocation({ lat: latitude, lng: longitude });
        setSosToast(false);
        setSosLoading(false);
        setSosConfirmModal(true);
      },
      (error) => {
        setSosLoading(false);
        setSosToast(false);
        console.error(error);
        alert("Unable to retrieve your location. Please ensure location services are enabled.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const confirmAndSendSOS = () => {
    if (!sosLocation) return;
    setSosConfirmModal(false);
    setSosLoading(true);
    setSosToast(true);

    patientApi.sendSos({ latitude: sosLocation.lat, longitude: sosLocation.lng })
    .then(data => {
      setSosLoading(false);
      setSosToast(false);
      if (data.status === 'success') {
        setEmergencyData(data.data);
        setSosModalOpen(true);
      } else {
        alert(data.message || 'Error sending SOS');
      }
    })
    .catch(err => {
      setSosLoading(false);
      setSosToast(false);
      console.error(err);
      alert('Failed to connect to emergency services.');
    });
  };
  const addToCart = (name) => setCart(prev => [...prev, name]);

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    setSubmittingFeedback(true);
    try {
      const data = await patientApi.addFeedback(feedbackText, feedbackRating);
      if (data.status === 'success') {
        setFeedbackToast({ message: 'Feedback submitted successfully!', type: 'success' });
        setFeedbackModalOpen(false);
        setFeedbackText('');
        setFeedbackRating(5);
      } else {
        setFeedbackToast({ message: data.message || 'Failed to submit feedback.', type: 'error' });
      }
    } catch (err) {
      setFeedbackToast({ message: 'Connection error.', type: 'error' });
    }
    setSubmittingFeedback(false);
    if (feedbackToastRef.current) clearTimeout(feedbackToastRef.current);
    feedbackToastRef.current = setTimeout(() => setFeedbackToast(null), 3000);
  };

  const firstName = user?.full_name?.split(' ')[0] || 'there';
  const currentPath = location.pathname;

  if (currentPath === '/patient/settings') {
    return (
      <DashboardLayout sidebarItems={sidebarItems} colorScheme="blue" title="Settings">
        <SettingsView sidebarItems={sidebarItems} colorScheme="blue" />
      </DashboardLayout>
    );
  }

  /* Determine which view to render */
  const renderContent = () => {
    if (currentPath === '/patient/medicines') {
      return <MedicinesView />;
    }

    if (currentPath === '/patient/pharmacies') {
      return <PharmaciesView />;
    }

    if (currentPath === '/patient/orders') {
      return <OrdersView />;
    }

    if (currentPath === '/patient/reservations') {
      return <PatientReservations />;
    }

    if (currentPath === '/patient/history') {
      return <MedicalHistoryLockerView />;
    }

    if (currentPath === '/patient/order-history') {
      return <PatientOrderHistory />;
    }

    if (currentPath === '/patient/reminders') {
      return <MedicineRemindersView />;
    }

    if (currentPath === '/patient/navigation') {
      return <NavigationPage />;
    }

    if (currentPath === '/patient/sos') {
      return <PlaceholderView title="Emergency SOS" icon={AlertTriangle} description="Quick access to emergency services and nearby hospitals. Coming soon." />;
    }

    /* Default: Home view (Now Search Hub) */
    return (
      <div className="space-y-8 animate-fadeIn max-w-[1400px] mx-auto">
        {/* Date and Feedback Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 mt-2">
          <div className="flex items-center gap-2 text-gray-700 font-medium">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          </div>
          <button onClick={() => setFeedbackModalOpen(true)} className="flex items-center gap-2 bg-white border border-amber-200 text-amber-600 px-5 py-2.5 rounded-full text-sm font-bold shadow-sm hover:bg-amber-50 transition-colors">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> Give Feedback
          </button>
        </div>

        {/* ================= QUICK ACTIONS ================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {availableServices.map((service, idx) => (
            <div key={idx} className={`p-4 rounded-2xl border border-gray-100 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all bg-white`}
                 onClick={() => {
                   if (service.label === 'Find Pharmacies') navigate('/patient/pharmacies');
                   else if (service.label === 'Upload Prescription') navigate('/patient/pharmacies');
                   else if (service.label === 'Reserve Medicine') document.getElementById('medSearchInput')?.focus();
                 }}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${service.color} shadow-sm flex-shrink-0`}>
                <service.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">{service.label}</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">{service.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ================= MEDICINE SEARCH SECTION ================= */}
        <div className="w-full relative z-0">
          <MedicineSearch />
        </div>
      </div>
    );
  };

  const getPageTitle = () => {
    if (location.pathname === '/patient/navigation') return 'Real-Time Navigation';
    if (location.pathname === '/patient/reservations') return 'My Reservations';
    if (location.pathname === '/patient/prescriptions') return 'My Prescriptions';
    return 'Patient Dashboard';
  };

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
  const dynamicSidebarItems = sidebarItems.map(item => {
    if (item.path === '/patient/reservations') {
      return {
        ...item,
        badge: totalUnread > 0 ? totalUnread : undefined
      };
    }
    return item;
  });

  return (
    <DashboardLayout sidebarItems={dynamicSidebarItems} colorScheme="light" title={getPageTitle()}
      notifications={totalUnread > 0 ? [{ title: 'New Message', body: `You have ${totalUnread} new message(s)` }] : []}
      headerBadge={(user?.is_sos_enabled == 1 || user?.is_sos_enabled === true || user?.is_sos_enabled === '1' || user?.is_sos_enabled === 'true') ? <SOSButton onPress={handleSOS} /> : null}
    >

      {/* SOS Toast (Initial Sending State) */}
      {sosToast && (
        <div className="fixed top-4 right-4 left-4 md:left-auto md:top-6 md:right-6 w-auto max-w-sm mx-auto z-[100] flex items-center gap-3 bg-red-600 text-white px-5 py-3.5 rounded-xl shadow-2xl animate-fadeIn">
          {sosLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <AlertTriangle className="w-5 h-5" />}
          <div>
            <p className="font-bold text-sm">Emergency SOS</p>
            <p className="text-red-200 text-xs">Getting precise location...</p>
          </div>
        </div>
      )}

      {/* SOS Location Confirm Modal */}
      {sosConfirmModal && sosLocation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-red-600 p-6 text-white">
              <h2 className="text-2xl font-black flex items-center gap-2"><MapPin className="w-6 h-6" /> Confirm Emergency Location</h2>
              <p className="text-red-100 text-sm mt-1">Drag the marker to your exact location if it is inaccurate.</p>
            </div>
            
            <div className="h-80 w-full relative z-0">
              <MapContainer center={sosLocation} zoom={16} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationMarker sosLocation={sosLocation} setSosLocation={setSosLocation} />
              </MapContainer>
            </div>

            <div className="p-6 bg-slate-50 flex items-center justify-end gap-3">
              <button 
                onClick={() => setSosConfirmModal(false)}
                className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmAndSendSOS}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-red-200 transition-all flex items-center gap-2 animate-pulse"
              >
                <AlertTriangle className="w-5 h-5" /> SEND SOS NOW
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Results Modal */}
      {sosModalOpen && emergencyData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-red-600 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 animate-pulse" />
                <div>
                  <h2 className="text-2xl font-black">SOS Alert Sent!</h2>
                  <p className="text-red-100 text-sm">Your family has been notified with your location.</p>
                </div>
              </div>
              <button onClick={() => setSosModalOpen(false)} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-50">
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Nearest Hospitals</h3>
                <div className="space-y-3">
                  {emergencyData.nearest_hospitals.map((hosp) => (
                    <div key={hosp.hospital_id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-gray-900">{hosp.name}</h4>
                        <p className="text-sm text-gray-500 mb-1">{hosp.district} • {parseFloat(hosp.distance_km).toFixed(1)} km away</p>
                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${hosp.type === 'government' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {hosp.type.toUpperCase()}
                        </span>
                      </div>
                      <a href={`tel:${hosp.phone}`} className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md shadow-green-200 shrink-0">
                        <Phone className="w-4 h-4" /> Call {hosp.phone}
                      </a>
                    </div>
                  ))}
                  {emergencyData.nearest_hospitals.length === 0 && (
                    <div className="text-center py-6 text-gray-500">No hospitals found nearby.</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <a href={`tel:${emergencyData.emergency_numbers.ambulance}`} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-2 hover:border-red-300 hover:bg-red-50 transition-colors">
                  <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center"><Heart className="w-5 h-5" /></div>
                  <span className="text-xs font-bold text-gray-600">Ambulance</span>
                  <span className="text-lg font-black text-red-600">{emergencyData.emergency_numbers.ambulance}</span>
                </a>
                <a href={`tel:${emergencyData.emergency_numbers.police}`} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-2 hover:border-blue-300 hover:bg-blue-50 transition-colors">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center"><ShieldCheck className="w-5 h-5" /></div>
                  <span className="text-xs font-bold text-gray-600">Police</span>
                  <span className="text-lg font-black text-blue-600">{emergencyData.emergency_numbers.police}</span>
                </a>
                <a href={`tel:${emergencyData.emergency_numbers.fire}`} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-2 hover:border-orange-300 hover:bg-orange-50 transition-colors">
                  <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center"><Activity className="w-5 h-5" /></div>
                  <span className="text-xs font-bold text-gray-600">Fire</span>
                  <span className="text-lg font-black text-orange-600">{emergencyData.emergency_numbers.fire}</span>
                </a>
                <a href={`tel:${emergencyData.emergency_numbers.general}`} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-2 hover:border-gray-300 hover:bg-gray-100 transition-colors">
                  <div className="w-10 h-10 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center"><Phone className="w-5 h-5" /></div>
                  <span className="text-xs font-bold text-gray-600">Emergency</span>
                  <span className="text-lg font-black text-gray-800">{emergencyData.emergency_numbers.general}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart indicator */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-fadeIn">
          <ShoppingCart className="w-4 h-4" />
          <span className="text-sm font-semibold">{cart.length} item(s) in cart</span>
          <button onClick={() => navigate('/patient/pharmacies')} className="text-blue-200 hover:text-white text-sm font-bold transition-colors">View Cart →</button>
        </div>
      )}

      {/* Feedback Toast */}
      {feedbackToast && (
        <div className={`fixed top-4 right-4 left-4 md:left-auto md:top-6 md:right-6 w-auto max-w-sm mx-auto z-[100] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl animate-fadeIn ${feedbackToast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'} text-white`}>
          {feedbackToast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <p className="font-bold text-sm">{feedbackToast.message}</p>
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Star className="w-6 h-6 text-amber-400 fill-amber-400" /> Site Feedback</h2>
              <button onClick={() => setFeedbackModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleFeedbackSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Rate your experience</label>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button type="button" key={star} onClick={() => setFeedbackRating(star)} className="focus:outline-none transition-transform hover:scale-110">
                      <Star className={`w-10 h-10 ${feedbackRating >= star ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Your feedback</label>
                <textarea 
                  value={feedbackText} 
                  onChange={(e) => setFeedbackText(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all h-32 resize-none" 
                  placeholder="Tell us what you like or how we can improve..."
                  required
                ></textarea>
              </div>
              <div className="pt-2">
                <button type="submit" disabled={submittingFeedback} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70">
                  {submittingFeedback ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {renderContent()}

    </DashboardLayout>
  );
}