import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Eye, EyeOff, Mail, Lock, User, Building2, CheckCircle, AlertCircle,
  ArrowLeft, ArrowRight, Shield, Heart,
  Phone, Calendar, Users, Upload, FileText, Camera, X, MapPin,
  Save, Clock, Navigation, Crosshair
} from 'lucide-react';

import logoImg from '../assets/logo.png';

import { authApi } from '../services/authApi';

const DISTRICTS = [
  'Colombo','Gampaha','Kalutara','Kandy','Matale','Nuwara Eliya',
  'Galle','Matara','Hambantota','Jaffna','Kilinochchi','Mannar',
  'Mullaitivu','Vavuniya','Batticaloa','Ampara','Trincomalee',
  'Kurunegala','Puttalam','Anuradhapura','Polonnaruwa','Badulla',
  'Monaragala','Ratnapura','Kegalle'
];

const RELATIONSHIPS = ['Father','Mother','Spouse','Brother','Sister','Guardian','Other'];

const PHARMACY_STEPS = [
  { num: 1, label: 'Owner Details', icon: User },
  { num: 2, label: 'Pharmacy Info', icon: Building2 },
  { num: 3, label: 'Documents', icon: FileText },
  { num: 4, label: 'Location', icon: MapPin },
  { num: 5, label: 'Review', icon: CheckCircle },
];

function FloatingBubble({ size, left, delay, duration, icon: Icon }) {
  return (
    <div
      className="absolute rounded-full bg-white/10 flex items-center justify-center"
      style={{
        width: size, height: size, left, bottom: '-20%',
        animation: `floatBubble ${duration}s ease-in-out ${delay}s infinite`,
      }}>
      {Icon && <Icon className="w-1/2 h-1/2 text-white/30" />}
    </div>
  );
}

/* ═══════════ VALIDATION BADGE ═══════════ */
function ValidationBadge({ valid, label }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full transition-all ${
      valid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
    }`}>
      {valid ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 border border-gray-300 rounded-full" />}
      {label}
    </span>
  );
}

/* ═══════════ MAP COMPONENT (Leaflet via CDN) ═══════════ */
function LocationMap({ lat, lng, onLocationChange }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    // Load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    // Load Leaflet JS
    if (!window.L) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setMapReady(true);
      document.body.appendChild(script);
    } else {
      setMapReady(true);
    }
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || mapInstanceRef.current) return;
    const L = window.L;
    const center = lat && lng ? [parseFloat(lat), parseFloat(lng)] : [7.8731, 80.7718]; // Sri Lanka center
    const zoom = lat && lng ? 16 : 8;
    const map = L.map(mapRef.current, { scrollWheelZoom: true }).setView(center, zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    if (lat && lng) {
      markerRef.current = L.marker(center, { draggable: true }).addTo(map);
      markerRef.current.on('dragend', (e) => {
        const ll = e.target.getLatLng();
        onLocationChange(ll.lat.toFixed(8), ll.lng.toFixed(8));
      });
    }

    map.on('click', (e) => {
      const { lat: cLat, lng: cLng } = e.latlng;
      if (markerRef.current) {
        markerRef.current.setLatLng([cLat, cLng]);
      } else {
        markerRef.current = L.marker([cLat, cLng], { draggable: true }).addTo(map);
        markerRef.current.on('dragend', (ev) => {
          const ll = ev.target.getLatLng();
          onLocationChange(ll.lat.toFixed(8), ll.lng.toFixed(8));
        });
      }
      onLocationChange(cLat.toFixed(8), cLng.toFixed(8));
    });

    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; markerRef.current = null; };
  }, [mapReady]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ' Sri Lanka')}&limit=1`);
      const data = await res.json();
      if (data.length > 0) {
        const { lat: sLat, lon: sLng } = data[0];
        const L = window.L;
        const map = mapInstanceRef.current;
        map.setView([parseFloat(sLat), parseFloat(sLng)], 16);
        if (markerRef.current) {
          markerRef.current.setLatLng([parseFloat(sLat), parseFloat(sLng)]);
        } else {
          markerRef.current = L.marker([parseFloat(sLat), parseFloat(sLng)], { draggable: true }).addTo(map);
          markerRef.current.on('dragend', (e) => {
            const ll = e.target.getLatLng();
            onLocationChange(ll.lat.toFixed(8), ll.lng.toFixed(8));
          });
        }
        onLocationChange(parseFloat(sLat).toFixed(8), parseFloat(sLng).toFixed(8));
      }
    } catch {}
    setSearching(false);
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude: gLat, longitude: gLng } = pos.coords;
      const L = window.L;
      const map = mapInstanceRef.current;
      if (!map) return;
      map.setView([gLat, gLng], 16);
      if (markerRef.current) {
        markerRef.current.setLatLng([gLat, gLng]);
      } else {
        markerRef.current = L.marker([gLat, gLng], { draggable: true }).addTo(map);
        markerRef.current.on('dragend', (e) => {
          const ll = e.target.getLatLng();
          onLocationChange(ll.lat.toFixed(8), ll.lng.toFixed(8));
        });
      }
      onLocationChange(gLat.toFixed(8), gLng.toFixed(8));
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
            placeholder="Search location... e.g. Colombo Fort"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white"
          />
        </div>
        <button type="button" onClick={handleSearch} disabled={searching}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all disabled:opacity-60 flex items-center gap-1.5">
          {searching ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full spin" /> : <Navigation className="w-4 h-4" />}
          Search
        </button>
        <button type="button" onClick={handleLocateMe}
          className="px-3 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-all flex items-center gap-1.5" title="Use my location">
          <Crosshair className="w-4 h-4" />
        </button>
      </div>
      <div ref={mapRef} className="w-full h-[300px] rounded-2xl border-2 border-gray-200 overflow-hidden shadow-inner" style={{ zIndex: 1 }} />
      {lat && lng && (
        <div className="flex items-center gap-4 p-3 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Location Selected</p>
            <p className="text-xs text-green-600 font-mono mt-0.5">{lat}, {lng}</p>
          </div>
        </div>
      )}
      {!lat && (
        <p className="text-xs text-gray-400 text-center">Click on the map to select your pharmacy location, or use the search bar.</p>
      )}
    </div>
  );
}


/* ═══════════ MAIN COMPONENT ═══════════ */
export default function Register() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(null);
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  // Pharmacy owner multi-step
  const [pharmacyStep, setPharmacyStep] = useState(1);

  // Patient form
  const [patientForm, setPatientForm] = useState({
    full_name: '', email: '', password: '', confirm_password: '',
    phone: '', birthday: '', age: '', family_contact: '', family_relationship: '',
    family_contact_2: '', family_relationship_2: '', is_sos_enabled: false
  });

  // Pharmacy form
  const [pharmacyForm, setPharmacyForm] = useState({
    full_name: '', email: '', password: '', confirm_password: '',
    owner_nic: '', pharmacy_name: '', address: '', district: '', phone: '',
    nmra_license: '', nmra_expiry_date: '', business_registration: '',
    latitude: '', longitude: ''
  });
  const [ownerPhoto, setOwnerPhoto] = useState(null);
  const [licenseDoc, setLicenseDoc] = useState(null);

  // Pharmacist form
  const [pharmacistForm, setPharmacistForm] = useState({
    full_name: '', slmc_registration_number: '', nic: '',
    email: '', password: '', confirm_password: '', phone: ''
  });
  const [certificate, setCertificate] = useState(null);
  const [pharmacistPhoto, setPharmacistPhoto] = useState(null);

  /* ─── Load saved pharmacy form data ─── */
  useEffect(() => {
    try {
      const saved = localStorage.getItem('medcare_pharmacy_draft');
      if (saved) {
        const data = JSON.parse(saved);
        setPharmacyForm(prev => ({ ...prev, ...data.form }));
        if (data.step) setPharmacyStep(data.step);
        if (data.role) setSelectedRole(data.role);
      }
    } catch {}
  }, []);

  /* ─── Save pharmacy draft ─── */
  const savePharmacyDraft = useCallback(() => {
    const data = {
      form: { ...pharmacyForm, password: '', confirm_password: '' },
      step: pharmacyStep,
      role: 'pharmacy_owner',
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem('medcare_pharmacy_draft', JSON.stringify(data));
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  }, [pharmacyForm, pharmacyStep]);

  const clearDraft = () => localStorage.removeItem('medcare_pharmacy_draft');

  const calcAge = (birthday) => {
    if (!birthday) return '';
    return Math.floor((Date.now() - new Date(birthday).getTime()) / 31557600000);
  };

  const handlePatientBirthday = (val) => {
    setPatientForm({ ...patientForm, birthday: val, age: calcAge(val) });
  };

  const maxPatientDate = new Date();
  maxPatientDate.setFullYear(maxPatientDate.getFullYear() - 16);
  const maxPatientDateStr = maxPatientDate.toISOString().split('T')[0];

  /* ─── Validation helpers ─── */
  const isEmailValid = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const isPwStrong = (p) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(p);
  const pwErrorMsg = 'Password must contain at least 8 characters, one uppercase, one lowercase, one number and one special character';
  const isPwMatch = (p, c) => p && c && p === c;

  const isNicValid = (nic) => /^([0-9]{9}[vV]|[0-9]{12})$/.test(nic);

  const pharmacyStep1Valid = pharmacyForm.full_name && isEmailValid(pharmacyForm.email) && isPwStrong(pharmacyForm.password) && isPwMatch(pharmacyForm.password, pharmacyForm.confirm_password) && isNicValid(pharmacyForm.owner_nic) && ownerPhoto;
  const pharmacyStep2Valid = pharmacyForm.pharmacy_name && pharmacyForm.address && pharmacyForm.district && pharmacyForm.phone;
  const pharmacyStep3Valid = pharmacyForm.nmra_license && pharmacyForm.nmra_expiry_date && pharmacyForm.business_registration && licenseDoc;
  const pharmacyStep4Valid = pharmacyForm.latitude && pharmacyForm.longitude;
  const allPharmacyValid = pharmacyStep1Valid && pharmacyStep2Valid && pharmacyStep3Valid && pharmacyStep4Valid && agreed;

  const stepValidation = [pharmacyStep1Valid, pharmacyStep2Valid, pharmacyStep3Valid, pharmacyStep4Valid, allPharmacyValid];

  /* ─── Submissions ─── */
  const handlePatientSubmit = async (e) => {
    e.preventDefault();
    if (patientForm.password !== patientForm.confirm_password) { setError('Passwords do not match'); return; }
    if (!isPwStrong(patientForm.password)) { setError(pwErrorMsg); return; }
    if (!agreed) { setError('Please agree to the terms'); return; }
    if (patientForm.age < 12) { setError('You must be at least 12 years old to register'); return; }
    setLoading(true); setError('');
    try {
      const d = await authApi.registerPatient({ 
          full_name: patientForm.full_name, email: patientForm.email, password: patientForm.password, 
          phone: patientForm.phone, birthday: patientForm.birthday, age: patientForm.age, 
          family_contact: patientForm.is_sos_enabled ? patientForm.family_contact : '', 
          family_relationship: patientForm.is_sos_enabled ? patientForm.family_relationship : '', 
          family_contact_2: patientForm.is_sos_enabled ? patientForm.family_contact_2 : '', 
          family_relationship_2: patientForm.is_sos_enabled ? patientForm.family_relationship_2 : '',
          is_sos_enabled: patientForm.is_sos_enabled ? 1 : 0,
          role: 'patient' 
        });
      if (d.status === 'success') { setSuccess('Account created! Redirecting to login...'); setTimeout(() => navigate('/login'), 2500); }
      else { setError(d.message || 'Registration failed'); }
    } catch (err) { setError(err.message || 'Connection error.'); }
    setLoading(false);
  };

  const handlePharmacySubmit = async (e) => {
    if (e) e.preventDefault();
    if (pharmacyForm.password !== pharmacyForm.confirm_password) { setError('Passwords do not match'); return; }
    if (!isPwStrong(pharmacyForm.password)) { setError(pwErrorMsg); return; }
    if (!agreed) { setError('Please agree to the terms'); return; }
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      Object.entries(pharmacyForm).forEach(([k, v]) => { if (k !== 'confirm_password') fd.append(k, v); });
      fd.append('role', 'pharmacy_owner');
      if (ownerPhoto) fd.append('owner_photo', ownerPhoto);
      if (licenseDoc) fd.append('license_doc', licenseDoc);
      const d = await authApi.registerPharmacy(fd);
      if (d.status === 'success') { clearDraft(); setSuccess('Registration submitted! Pending admin approval.'); }
      else { setError(d.message || 'Registration failed'); }
    } catch (err) { setError(err.message || 'Connection error.'); }
    setLoading(false);
  };

  const handlePharmacistSubmit = async (e) => {
    e.preventDefault();
    if (pharmacistForm.password !== pharmacistForm.confirm_password) { setError('Passwords do not match'); return; }
    if (!isPwStrong(pharmacistForm.password)) { setError(pwErrorMsg); return; }
    if (!agreed) { setError('Please agree to the terms'); return; }
    if (!certificate) { setError('Certificate upload is required'); return; }
    if (!pharmacistPhoto) { setError('Photo upload is required'); return; }
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      Object.entries(pharmacistForm).forEach(([k, v]) => { if (k !== 'confirm_password') fd.append(k, v); });
      fd.append('role', 'pharmacist');
      if (certificate) fd.append('certificate', certificate);
      if (pharmacistPhoto) fd.append('photo', pharmacistPhoto);
      const d = await authApi.registerPharmacist(fd);
      if (d.status === 'success') { setSuccess('Registration submitted! Pending admin verification.'); }
      else { setError(d.message || 'Registration failed'); }
    } catch (err) { setError(err.message || 'Connection error.'); }
    setLoading(false);
  };

  const roleCards = [
    { key: 'patient', label: 'Patient', icon: User, desc: 'Search & reserve medicines', color: 'blue', gradient: 'from-blue-500 to-blue-600' },
    { key: 'pharmacy_owner', label: 'Pharmacy Owner', icon: Building2, desc: 'Register & manage pharmacy', color: 'blue', note: 'Requires admin approval', gradient: 'from-blue-500 to-blue-600' }
  ];

  const inputCls = "w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-all";
  const labelCls = "block text-sm font-semibold text-gray-700 mb-1.5";

  /* ═══════════ PROGRESS BAR ═══════════ */
  const renderPharmacyProgressBar = () => {
    const progress = ((pharmacyStep - 1) / (PHARMACY_STEPS.length - 1)) * 100;
    return (
      <div className="mb-6">
        {/* Desktop step labels */}
        <div className="hidden sm:flex items-center justify-between mb-3">
          {PHARMACY_STEPS.map((s) => {
            const done = pharmacyStep > s.num;
            const active = pharmacyStep === s.num;
            const valid = stepValidation[s.num - 1];
            return (
              <button
                key={s.num} type="button"
                onClick={() => { if (done || (s.num <= pharmacyStep)) setPharmacyStep(s.num); }}
                className={`flex items-center gap-2 text-xs font-semibold transition-all ${
                  active ? 'text-blue-700' : done ? 'text-green-600 hover:text-green-700' : 'text-gray-400'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  done && valid ? 'bg-green-500 border-green-500 text-white'
                    : active ? 'bg-blue-600 border-blue-600 text-white scale-110 shadow-lg shadow-blue-200'
                    : 'bg-white border-gray-300 text-gray-400'
                }`}>
                  {done && valid ? <CheckCircle className="w-3.5 h-3.5" /> : s.num}
                </div>
                <span className="hidden md:inline">{s.label}</span>
              </button>
            );
          })}
        </div>
        {/* Progress bar */}
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 via-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-500 font-medium">Step {pharmacyStep} of {PHARMACY_STEPS.length}: <span className="text-blue-600 font-bold">{PHARMACY_STEPS[pharmacyStep-1].label}</span></p>
        </div>
      </div>
    );
  };

  /* ═══════════ ROLE SELECTION ═══════════ */
  const renderRoleSelection = () => (
    <div className="animate-fadeIn">
      <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Create Account</h2>
      <p className="text-gray-500 text-sm mb-8">Choose your role to get started</p>
      <div className="space-y-3">
        {roleCards.map(r => (
          <button key={r.key} type="button" onClick={() => { setSelectedRole(r.key); setError(''); setSuccess(''); }}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${
              selectedRole === r.key ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 hover:border-blue-300 bg-white'
            }`}>
            <div className={`w-12 h-12 bg-gradient-to-br ${r.gradient} rounded-xl flex items-center justify-center flex-shrink-0 shadow-md`}>
              <r.icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900">{r.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
              {r.note && <p className="text-xs text-amber-600 mt-1 font-medium">⚠ {r.note}</p>}
            </div>
            <ArrowRight className={`w-5 h-5 ${selectedRole === r.key ? 'text-blue-500' : 'text-gray-300'}`} />
          </button>
        ))}
      </div>
      <p className="mt-8 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link to="/login" className="text-blue-600 font-semibold hover:underline">Sign In</Link>
      </p>
    </div>
  );

  /* ═══════════ PATIENT FORM ═══════════ */
  const renderPatientForm = () => (
    <form onSubmit={handlePatientSubmit} className="animate-fadeIn space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <button type="button" onClick={() => { setSelectedRole(null); setError(''); }} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-all">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-extrabold text-gray-900">Patient Registration</h2>
          <p className="text-xs text-gray-500">Fill in your details to create an account</p>
        </div>
        <div className="flex gap-1 flex-wrap">
          <ValidationBadge valid={!!patientForm.full_name} label="Name" />
          <ValidationBadge valid={isEmailValid(patientForm.email)} label="Email" />
        </div>
      </div>

      <div>
        <label className={labelCls}>Full Name *</label>
        <div className="relative">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input required value={patientForm.full_name} onChange={e => setPatientForm({ ...patientForm, full_name: e.target.value })} className={inputCls} placeholder="John Doe" />
        </div>
      </div>
      <div>
        <label className={labelCls}>Email *</label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input required type="email" value={patientForm.email} onChange={e => setPatientForm({ ...patientForm, email: e.target.value.toLowerCase() })} className={`${inputCls} ${patientForm.email && !isEmailValid(patientForm.email) ? 'ring-2 ring-red-300 border-red-300' : ''}`} placeholder="you@email.com" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Password *</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input required type={showPw ? 'text' : 'password'} value={patientForm.password} onChange={e => setPatientForm({ ...patientForm, password: e.target.value })} className={inputCls} placeholder="Strong password" />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className={labelCls}>Confirm *</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input required type={showCpw ? 'text' : 'password'} value={patientForm.confirm_password} onChange={e => setPatientForm({ ...patientForm, confirm_password: e.target.value })} className={`${inputCls} ${patientForm.confirm_password && !isPwMatch(patientForm.password, patientForm.confirm_password) ? 'ring-2 ring-red-300 border-red-300' : ''}`} placeholder="Repeat" />
          </div>
        </div>
      </div>
      <div>
        <label className={labelCls}>Phone Number *</label>
        <div className="relative">
          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input required type="tel" pattern="0[0-9]{9}" maxLength="10" title="Phone number must start with 0 and be exactly 10 digits" value={patientForm.phone} onChange={e => setPatientForm({ ...patientForm, phone: e.target.value.replace(/[^0-9]/g, '') })} className={inputCls} placeholder="07X XXX XXXX" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className={labelCls}>Birthday *</label>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input required type="date" max={maxPatientDateStr} value={patientForm.birthday} onChange={e => handlePatientBirthday(e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      <div className="col-span-1 md:col-span-2 bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-2 mt-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 pr-4">
            <h4 className="text-md font-semibold text-blue-900 mb-1 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              Emergency SOS Feature
            </h4>
            <p className="text-sm text-blue-700/80">
              This feature allows you to quickly notify your trusted family members in case of a medical emergency. You can enable it now or configure it later in your settings.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer mt-1">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={patientForm.is_sos_enabled}
              onChange={e => setPatientForm({ ...patientForm, is_sos_enabled: e.target.checked })}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {patientForm.is_sos_enabled && (
        <>
          <div className="grid grid-cols-2 gap-3 mt-4 border-t border-gray-100 pt-4">
            <div>
              <label className={labelCls}>Family Contact 1 (Phone) *</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input required type="tel" pattern="0[0-9]{9}" maxLength="10" title="Phone number must start with 0 and be exactly 10 digits" value={patientForm.family_contact} onChange={e => setPatientForm({ ...patientForm, family_contact: e.target.value.replace(/[^0-9]/g, '') })} className={inputCls} placeholder="07X XXX XXXX" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Relationship 1 *</label>
              <div className="relative">
                <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select required value={patientForm.family_relationship} onChange={e => setPatientForm({ ...patientForm, family_relationship: e.target.value })} className={inputCls}>
                  <option value="">Select relationship</option>
                  {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div>
              <label className={labelCls}>Family Contact 2 (Phone) *</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input required type="tel" pattern="0[0-9]{9}" maxLength="10" title="Phone number must start with 0 and be exactly 10 digits" value={patientForm.family_contact_2} onChange={e => setPatientForm({ ...patientForm, family_contact_2: e.target.value.replace(/[^0-9]/g, '') })} className={inputCls} placeholder="07X XXX XXXX" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Relationship 2 *</label>
              <div className="relative">
                <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select required value={patientForm.family_relationship_2} onChange={e => setPatientForm({ ...patientForm, family_relationship_2: e.target.value })} className={inputCls}>
                  <option value="">Select relationship</option>
                  {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>
        </>
      )}
      <div className="flex items-start gap-2 pt-1">
        <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-1 w-4 h-4 text-blue-600 rounded" id="terms_patient" />
        <label htmlFor="terms_patient" className="text-xs text-gray-500 cursor-pointer">I agree to the <span className="text-blue-600 font-medium">Terms of Service</span> and <span className="text-blue-600 font-medium">Privacy Policy</span></label>
      </div>
      {error && <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-2.5"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
      <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-xl disabled:opacity-60 flex items-center justify-center gap-2">
        {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full spin" /> : <CheckCircle className="w-4 h-4" />}
        Create Patient Account
      </button>
    </form>
  );

  /* ═══════════ PHARMACY FORM (5 STEPS) ═══════════ */
  const renderPharmacyForm = () => (
    <form onSubmit={(e) => { e.preventDefault(); if (pharmacyStep === 5) handlePharmacySubmit(); }} className="animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button type="button" onClick={() => { if (pharmacyStep > 1) setPharmacyStep(pharmacyStep - 1); else { setSelectedRole(null); setError(''); clearDraft(); }}} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-all">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-extrabold text-gray-900">Pharmacy Registration</h2>
        </div>
        <button type="button" onClick={savePharmacyDraft}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-semibold transition-all" title="Save & Continue Later">
          <Save className="w-3.5 h-3.5" /> Save Draft
        </button>
      </div>

      {renderPharmacyProgressBar()}

      {/* ── Step 1: Owner Details ── */}
      {pharmacyStep === 1 && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-blue-600 flex items-center gap-2"><User className="w-4 h-4" /> Owner Details</p>
            <div className="flex gap-1">
              <ValidationBadge valid={!!pharmacyForm.full_name} label="Name" />
              <ValidationBadge valid={isEmailValid(pharmacyForm.email)} label="Email" />
              <ValidationBadge valid={isPwStrong(pharmacyForm.password)} label="Password" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Owner Full Name *</label>
            <div className="relative"><User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input required value={pharmacyForm.full_name} onChange={e => setPharmacyForm({ ...pharmacyForm, full_name: e.target.value })} className={inputCls} placeholder="Owner full name" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Email *</label>
            <div className="relative"><Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input required type="email" value={pharmacyForm.email} onChange={e => setPharmacyForm({ ...pharmacyForm, email: e.target.value.toLowerCase() })} className={`${inputCls} ${pharmacyForm.email && !isEmailValid(pharmacyForm.email) ? 'ring-2 ring-red-300 border-red-300' : ''}`} placeholder="you@email.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Password *</label>
              <div className="relative"><Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input required type={showPw ? 'text' : 'password'} value={pharmacyForm.password} onChange={e => setPharmacyForm({ ...pharmacyForm, password: e.target.value })} className={inputCls} placeholder="Strong password" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Confirm *</label>
              <div className="relative"><Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input required type={showCpw ? 'text' : 'password'} value={pharmacyForm.confirm_password} onChange={e => setPharmacyForm({ ...pharmacyForm, confirm_password: e.target.value })} className={inputCls} placeholder="Repeat" />
              </div>
            </div>
          </div>
          <div>
            <label className={labelCls}>Owner NIC *</label>
            <div className="relative"><Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input required pattern="^([0-9]{9}[vV]|[0-9]{12})$" title="Enter a valid Sri Lankan NIC (e.g., 123456789V or 200012345678)" value={pharmacyForm.owner_nic} onChange={e => setPharmacyForm({ ...pharmacyForm, owner_nic: e.target.value })} className={inputCls} placeholder="National ID number" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Owner Photo</label>
            <div className="flex items-center gap-3">
              {ownerPhoto && <img src={URL.createObjectURL(ownerPhoto)} alt="" className="w-14 h-14 rounded-xl object-cover border-2 border-blue-200 shadow-sm" />}
              <label className="flex-1 flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 cursor-pointer transition-all">
                <Camera className="w-4 h-4" />{ownerPhoto ? ownerPhoto.name : 'Upload photo'}
                <input type="file" accept="image/*" className="hidden" onChange={e => setOwnerPhoto(e.target.files[0])} />
              </label>
            </div>
          </div>
          <button type="button" onClick={() => setPharmacyStep(2)} disabled={!pharmacyStep1Valid}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg">
            Next: Pharmacy Details <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Step 2: Pharmacy Info ── */}
      {pharmacyStep === 2 && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-blue-600 flex items-center gap-2"><Building2 className="w-4 h-4" /> Pharmacy Details</p>
            <div className="flex gap-1">
              <ValidationBadge valid={!!pharmacyForm.pharmacy_name} label="Name" />
              <ValidationBadge valid={!!pharmacyForm.district} label="District" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Pharmacy Name *</label>
            <div className="relative"><Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input required value={pharmacyForm.pharmacy_name} onChange={e => setPharmacyForm({ ...pharmacyForm, pharmacy_name: e.target.value })} className={inputCls} placeholder="MedCare Pharmacy" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Address *</label>
            <textarea required value={pharmacyForm.address} onChange={e => setPharmacyForm({ ...pharmacyForm, address: e.target.value })} rows={2} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white resize-none" placeholder="Full pharmacy address" />
          </div>
          <div>
            <label className={labelCls}>District *</label>
            <div className="relative"><MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select required value={pharmacyForm.district} onChange={e => setPharmacyForm({ ...pharmacyForm, district: e.target.value })} className={inputCls}>
                <option value="">Select district</option>
                {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Phone *</label>
            <div className="relative"><Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input required type="tel" pattern="0[0-9]{9}" maxLength="10" title="Phone number must start with 0 and be exactly 10 digits" value={pharmacyForm.phone} onChange={e => setPharmacyForm({ ...pharmacyForm, phone: e.target.value.replace(/[^0-9]/g, '') })} className={inputCls} placeholder="0XX XXX XXXX" />
            </div>
          </div>
          <button type="button" onClick={() => setPharmacyStep(3)} disabled={!pharmacyStep2Valid}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg">
            Next: Documents <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Step 3: Documents ── */}
      {pharmacyStep === 3 && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-blue-600 flex items-center gap-2"><FileText className="w-4 h-4" /> License & Documents</p>
            <div className="flex gap-1">
              <ValidationBadge valid={!!pharmacyForm.nmra_license} label="NMRA" />
              <ValidationBadge valid={!!pharmacyForm.business_registration} label="BR" />
            </div>
          </div>
          <div>
            <label className={labelCls}>NMRA License Number *</label>
            <div className="relative"><Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input required value={pharmacyForm.nmra_license} onChange={e => setPharmacyForm({ ...pharmacyForm, nmra_license: e.target.value })} className={inputCls} placeholder="NMRA license number" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Expiry Date *</label>
              <div className="relative"><Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input required type="date" value={pharmacyForm.nmra_expiry_date} onChange={e => setPharmacyForm({ ...pharmacyForm, nmra_expiry_date: e.target.value })} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Business Reg# *</label>
              <div className="relative"><FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input required value={pharmacyForm.business_registration} onChange={e => setPharmacyForm({ ...pharmacyForm, business_registration: e.target.value })} className={inputCls} placeholder="BR number" />
              </div>
            </div>
          </div>
          <div>
            <label className={labelCls}>License Document</label>
            <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 cursor-pointer transition-all">
              <Upload className="w-4 h-4" />{licenseDoc ? <span className="text-blue-600 font-medium">{licenseDoc.name}</span> : 'Upload license document (PDF/Image)'}
              <input type="file" accept=".pdf,image/*" className="hidden" onChange={e => setLicenseDoc(e.target.files[0])} />
            </label>
          </div>
          <button type="button" onClick={() => setPharmacyStep(4)} disabled={!pharmacyStep3Valid}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg">
            Next: Location <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Step 4: Location Map ── */}
      {pharmacyStep === 4 && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-blue-600 flex items-center gap-2"><MapPin className="w-4 h-4" /> Pharmacy Location</p>
            <ValidationBadge valid={pharmacyStep4Valid} label="Location Set" />
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <p className="text-sm text-blue-800 font-medium">📍 Click on the map to pin your pharmacy location</p>
            <p className="text-xs text-blue-600 mt-0.5">You can also search by name or use your current location. Drag the pin to adjust.</p>
          </div>
          <LocationMap
            lat={pharmacyForm.latitude}
            lng={pharmacyForm.longitude}
            onLocationChange={(lat, lng) => setPharmacyForm({ ...pharmacyForm, latitude: lat, longitude: lng })}
          />
          <button type="button" onClick={() => setPharmacyStep(5)} disabled={!pharmacyStep4Valid}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg">
            Next: Review & Submit <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Step 5: Review & Submit ── */}
      {pharmacyStep === 5 && (
        <div className="space-y-4 animate-fadeIn">
          <p className="text-sm font-bold text-blue-600 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Review & Submit</p>
          <p className="text-xs text-gray-500">Review all your details before submitting. Click any section header to edit.</p>

          {/* Review Card */}
          <div className="space-y-3">
            {/* Owner Section */}
            <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
              <button type="button" onClick={() => setPharmacyStep(1)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-100 transition-colors text-left">
                <span className="text-sm font-bold text-gray-800 flex items-center gap-2"><User className="w-4 h-4 text-blue-500" /> Owner Details</span>
                {pharmacyStep1Valid ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">✓ Complete</span> : <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">Incomplete</span>}
              </button>
              <div className="px-4 pb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div><span className="text-gray-400">Name:</span> <span className="text-gray-700 font-medium">{pharmacyForm.full_name || '—'}</span></div>
                <div><span className="text-gray-400">Email:</span> <span className="text-gray-700 font-medium">{pharmacyForm.email || '—'}</span></div>
                <div><span className="text-gray-400">NIC:</span> <span className="text-gray-700 font-medium">{pharmacyForm.owner_nic || '—'}</span></div>
                <div><span className="text-gray-400">Photo:</span> <span className="text-gray-700 font-medium">{ownerPhoto ? '✓ Uploaded' : '—'}</span></div>
              </div>
            </div>

            {/* Pharmacy Section */}
            <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
              <button type="button" onClick={() => setPharmacyStep(2)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-100 transition-colors text-left">
                <span className="text-sm font-bold text-gray-800 flex items-center gap-2"><Building2 className="w-4 h-4 text-blue-500" /> Pharmacy Details</span>
                {pharmacyStep2Valid ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">✓ Complete</span> : <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">Incomplete</span>}
              </button>
              <div className="px-4 pb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div><span className="text-gray-400">Name:</span> <span className="text-gray-700 font-medium">{pharmacyForm.pharmacy_name || '—'}</span></div>
                <div><span className="text-gray-400">District:</span> <span className="text-gray-700 font-medium">{pharmacyForm.district || '—'}</span></div>
                <div className="col-span-2"><span className="text-gray-400">Address:</span> <span className="text-gray-700 font-medium">{pharmacyForm.address || '—'}</span></div>
                <div><span className="text-gray-400">Phone:</span> <span className="text-gray-700 font-medium">{pharmacyForm.phone || '—'}</span></div>
              </div>
            </div>

            {/* Documents Section */}
            <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
              <button type="button" onClick={() => setPharmacyStep(3)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-100 transition-colors text-left">
                <span className="text-sm font-bold text-gray-800 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-500" /> License & Documents</span>
                {pharmacyStep3Valid ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">✓ Complete</span> : <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">Incomplete</span>}
              </button>
              <div className="px-4 pb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div><span className="text-gray-400">NMRA:</span> <span className="text-gray-700 font-medium">{pharmacyForm.nmra_license || '—'}</span></div>
                <div><span className="text-gray-400">Expiry:</span> <span className="text-gray-700 font-medium">{pharmacyForm.nmra_expiry_date || '—'}</span></div>
                <div><span className="text-gray-400">BR#:</span> <span className="text-gray-700 font-medium">{pharmacyForm.business_registration || '—'}</span></div>
                <div><span className="text-gray-400">License Doc:</span> <span className="text-gray-700 font-medium">{licenseDoc ? '✓ Uploaded' : '—'}</span></div>
              </div>
            </div>

            {/* Location Section */}
            <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
              <button type="button" onClick={() => setPharmacyStep(4)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-100 transition-colors text-left">
                <span className="text-sm font-bold text-gray-800 flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-500" /> Location</span>
                {pharmacyStep4Valid ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">✓ Complete</span> : <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">Incomplete</span>}
              </button>
              <div className="px-4 pb-3 text-xs">
                {pharmacyForm.latitude ? (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Coordinates:</span>
                    <span className="text-gray-700 font-mono font-medium">{pharmacyForm.latitude}, {pharmacyForm.longitude}</span>
                  </div>
                ) : <span className="text-red-500">⚠ No location selected</span>}
              </div>
            </div>
          </div>

          {/* Status Message */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Pending Admin Verification</p>
              <p className="text-xs text-amber-600 mt-0.5">After submission, your pharmacy will be reviewed by the MedCare admin team. You'll receive an email notification once approved.</p>
            </div>
          </div>

          <div className="flex items-start gap-2 pt-1">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-1 w-4 h-4 text-blue-600 rounded" id="terms_pharmacy" />
            <label htmlFor="terms_pharmacy" className="text-xs text-gray-500 cursor-pointer">I agree to the <span className="text-blue-600 font-medium">Terms of Service</span> and <span className="text-blue-600 font-medium">Privacy Policy</span></label>
          </div>

          {error && <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-2.5"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}

          <button type="submit" disabled={loading || !allPharmacyValid}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
            {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full spin" /> : <Shield className="w-4 h-4" />}
            Submit for Verification
          </button>
        </div>
      )}
    </form>
  );

  /* ═══════════ PHARMACIST FORM ═══════════ */
  const renderPharmacistForm = () => (
    <form onSubmit={handlePharmacistSubmit} className="animate-fadeIn space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <button type="button" onClick={() => { setSelectedRole(null); setError(''); }} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-all">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-extrabold text-gray-900">Pharmacist Registration</h2>
          <p className="text-xs text-gray-500">Submit your credentials for admin verification</p>
        </div>
        <div className="flex gap-1">
          <ValidationBadge valid={!!pharmacistForm.slmc_registration_number} label="SLMC" />
          <ValidationBadge valid={isNicValid(pharmacistForm.nic)} label="NIC" />
        </div>
      </div>
      <div>
        <label className={labelCls}>Full Name *</label>
        <div className="relative"><User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input required value={pharmacistForm.full_name} onChange={e => setPharmacistForm({ ...pharmacistForm, full_name: e.target.value })} className={inputCls} placeholder="Full name" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>SLMC Reg# *</label>
          <div className="relative"><Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input required value={pharmacistForm.slmc_registration_number} onChange={e => setPharmacistForm({ ...pharmacistForm, slmc_registration_number: e.target.value })} className={inputCls} placeholder="SLMC number" />
          </div>
        </div>
        <div>
          <label className={labelCls}>NIC *</label>
          <div className="relative"><Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input required pattern="^([0-9]{9}[vV]|[0-9]{12})$" title="Enter a valid Sri Lankan NIC (e.g., 123456789V or 200012345678)" value={pharmacistForm.nic} onChange={e => setPharmacistForm({ ...pharmacistForm, nic: e.target.value })} className={inputCls} placeholder="NIC number" />
          </div>
        </div>
      </div>
      <div>
        <label className={labelCls}>Email *</label>
        <div className="relative"><Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input required type="email" value={pharmacistForm.email} onChange={e => setPharmacistForm({ ...pharmacistForm, email: e.target.value.toLowerCase() })} className={`${inputCls} ${pharmacistForm.email && !isEmailValid(pharmacistForm.email) ? 'ring-2 ring-red-300 border-red-300' : ''}`} placeholder="you@email.com" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Password *</label>
          <div className="relative"><Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input required type={showPw ? 'text' : 'password'} value={pharmacistForm.password} onChange={e => setPharmacistForm({ ...pharmacistForm, password: e.target.value })} className={inputCls} placeholder="Strong password" />
          </div>
        </div>
        <div>
          <label className={labelCls}>Confirm *</label>
          <div className="relative"><Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input required type={showCpw ? 'text' : 'password'} value={pharmacistForm.confirm_password} onChange={e => setPharmacistForm({ ...pharmacistForm, confirm_password: e.target.value })} className={inputCls} placeholder="Repeat" />
          </div>
        </div>
      </div>
      <div>
        <label className={labelCls}>Phone *</label>
        <div className="relative"><Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input required type="tel" pattern="0[0-9]{9}" maxLength="10" title="Phone number must start with 0 and be exactly 10 digits" value={pharmacistForm.phone} onChange={e => setPharmacistForm({ ...pharmacistForm, phone: e.target.value.replace(/[^0-9]/g, '') })} className={inputCls} placeholder="07X XXX XXXX" />
        </div>
      </div>
      <div>
        <label className={labelCls}>Certificate Upload *</label>
        <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-teal-400 hover:text-teal-600 cursor-pointer transition-all">
          <Upload className="w-4 h-4" />{certificate ? <span className="text-teal-600 font-medium">{certificate.name}</span> : 'Upload certificate (PDF/Image)'}
          <input type="file" accept=".pdf,image/*" className="hidden" onChange={e => setCertificate(e.target.files[0])} />
        </label>
      </div>
      <div>
        <label className={labelCls}>Photo *</label>
        <div className="flex items-center gap-3">
          {pharmacistPhoto && <img src={URL.createObjectURL(pharmacistPhoto)} alt="" className="w-14 h-14 rounded-xl object-cover border-2 border-teal-200 shadow-sm" />}
          <label className="flex-1 flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-teal-400 hover:text-teal-600 cursor-pointer transition-all">
            <Camera className="w-4 h-4" />{pharmacistPhoto ? pharmacistPhoto.name : 'Upload photo'}
            <input type="file" accept="image/*" className="hidden" onChange={e => setPharmacistPhoto(e.target.files[0])} />
          </label>
        </div>
      </div>
      <div className="flex items-start gap-2 pt-1">
        <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-1 w-4 h-4 text-teal-600 rounded" id="terms_pharmacist" />
        <label htmlFor="terms_pharmacist" className="text-xs text-gray-500 cursor-pointer">I agree to the <span className="text-teal-600 font-medium">Terms of Service</span> and <span className="text-teal-600 font-medium">Privacy Policy</span></label>
      </div>
      {error && <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-2.5"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
      <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-xl disabled:opacity-60 flex items-center justify-center gap-2">
        {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full spin" /> : <CheckCircle className="w-4 h-4" />}
        Submit for Verification
      </button>
    </form>
  );

  /* ═══════════ SUCCESS SCREEN ═══════════ */
  if (success) {
    const isPharmacy = success.includes('admin approval');
    const isPharmacist = success.includes('admin verification');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md text-center animate-fadeIn border border-gray-100">
          <div className={`w-20 h-20 ${isPharmacy || isPharmacist ? 'bg-amber-100' : 'bg-green-100'} rounded-full flex items-center justify-center mx-auto mb-6`}>
            {isPharmacy || isPharmacist ? <Clock className="w-10 h-10 text-amber-500" /> : <CheckCircle className="w-10 h-10 text-green-500" />}
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-3">
            {isPharmacy || isPharmacist ? 'Submitted Successfully!' : 'Registration Successful!'}
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed">{success}</p>
          {(isPharmacy || isPharmacist) && (
            <div className="mt-4 inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-xl text-xs font-semibold">
              <Clock className="w-4 h-4" /> Status: Pending Admin Verification
            </div>
          )}
          <button onClick={() => navigate('/login')} className="mt-6 w-full px-8 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  /* ═══════════ MAIN RENDER ═══════════ */
  return (
    <div className="flex min-h-screen font-['Inter']">
      <style>{`
        @keyframes floatBubble { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-15px); } }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* ═══════════ LEFT HERO PANEL ═══════════ */}
      <div className="hidden lg:flex w-[480px] flex-shrink-0 bg-gradient-to-br from-[#d6eaf8] via-[#dceefb] to-[#e8f4fd] relative overflow-hidden flex-col justify-between p-10">
        <div className="relative z-10 flex flex-col h-full justify-between">
          <div>
            <div className="mb-12">
              <img src={logoImg} alt="MedCare Assist Logo" className="h-24 object-contain" />
            </div>
            <h1 className="text-4xl font-extrabold text-gray-800 leading-tight mb-4">
              Join MedCare<br />Assist Today
            </h1>
            <p className="text-gray-500 text-base leading-relaxed mb-10">
              Connect with verified pharmacies, search medicines, and manage prescriptions—all in one platform.
            </p>
            <div className="space-y-4">
              {[
                { icon: Shield, text: 'Verified pharmacies & pharmacists' },
                { icon: Heart, text: 'Comprehensive health management' },
                { icon: Building2, text: 'Multi-role platform access' },
                { icon: MapPin, text: 'Location-based pharmacy search' },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-3 text-gray-600">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <f.icon className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium">{f.text}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-gray-400 text-xs pb-8">&copy; 2026 MedCare Assist by CST group No 03 Present. All rights reserved.</p>
        </div>
      </div>

      {/* ═══════════ RIGHT FORM PANEL ═══════════ */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-gradient-to-br from-white via-gray-50/50 to-blue-50/30 relative overflow-y-auto">
        {/* Close button */}
        <button onClick={() => navigate('/')} className="absolute top-6 right-6 w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-all z-10" title="Close">
          <X className="w-5 h-5" />
        </button>

        {/* Saved Toast */}
        {savedToast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-xl shadow-2xl animate-fadeIn">
            <Save className="w-4 h-4" />
            <span className="text-sm font-semibold">Draft saved! You can continue later.</span>
          </div>
        )}

        <div className="w-full max-w-[480px] py-8">
          {!selectedRole && renderRoleSelection()}
          {selectedRole === 'patient' && renderPatientForm()}
          {selectedRole === 'pharmacy_owner' && renderPharmacyForm()}
          {selectedRole === 'pharmacist' && renderPharmacistForm()}

          {selectedRole && (
            <p className="mt-6 text-center text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 font-semibold hover:underline">Sign In</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
