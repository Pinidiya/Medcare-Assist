import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { Package, FileText,
  Users, UserCog, Shield, Plus, X,
  Eye, EyeOff, Mail, Lock, User, Building2,
  Phone, Clock, Upload, Stethoscope, BadgeCheck, Settings,
  CheckCircle, AlertCircle, Loader2, ClipboardList, ExternalLink, Image as ImageIcon, UserCheck
} from 'lucide-react';
import SettingsView from '../../components/SettingsView';

const API = import.meta.env.VITE_API_BASE_URL;
const getMediaUrl = (path) => path ? `${API}/shared/view_file.php?file=${encodeURIComponent(path)}` : null;

const sidebarItems = [
  { label: 'Staff Management', icon: UserCog, path: '/pharmacy/staff' },
  { label: 'Stock', icon: Package, path: '/pharmacy/stock' },
  { label: 'Settings', icon: Settings, path: '/pharmacy/settings' },
];

import PharmacyOwnerStockView from './PharmacyOwnerStockView';

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-6 right-6 z-[99999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl animate-fadeIn text-white text-sm font-medium ${type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
      {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      {message}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
}

const roleBadge = {
  pharmacist: 'bg-teal-100 text-teal-700',
  stock_manager: 'bg-orange-100 text-orange-700',
};

const roleLabels = {
  pharmacist: 'Pharmacist',
  stock_manager: 'Stock Manager',
};

// The main dashboard for Pharmacy Owners
export default function PharmacyDashboard() {
  const location = useLocation();
  const currentPath = location.pathname;

  const [dashboard, setDashboard] = useState(null);
  const [staff, setStaff] = useState([]);
  const [viewPharmacistDetails, setViewPharmacistDetails] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [addingStaff, setAddingStaff] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const certRef = useRef(null);
  const photoRef = useRef(null);
  const phoneRef = useRef(null);
  const slmcRef = useRef(null);
  const nicRef = useRef(null);
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const [staffForm, setStaffForm] = useState({
    full_name: '', email: '', password: '', phone: '', role: 'pharmacist',
    slmc_registration_number: '', nic: '', certificate: null, photo: null
  });

  const showToast = (message, type = 'success') => setToast({ message, type });

  // Fetch the dashboard and staff data when the component loads
  useEffect(() => {
    Promise.all([
      fetch(`${API}/pharmacy/get_dashboard.php`, { credentials: 'include', cache: 'no-store' }).then(r => r.json()),
      fetch(`${API}/pharmacy/get_staff.php`, { credentials: 'include', cache: 'no-store' }).then(r => r.json()),
    ]).then(([d, s]) => {
      if (d.status === 'success') setDashboard(d);
      if (s.status === 'success') setStaff(s.data || []);
    }).catch(() => { }).finally(() => setLoading(false)); 
  }, []);



  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (file) setStaffForm(prev => ({ ...prev, [field]: file }));
  };



  const handleAddStaff = async (e) => {
    e.preventDefault();

    [nameRef, phoneRef, emailRef, passwordRef, slmcRef, nicRef, certRef, photoRef].forEach(ref => {
      if (ref?.current) ref.current.setCustomValidity('');
    });

    if (!staffForm.full_name.trim()) {
      if (nameRef.current) {
        nameRef.current.setCustomValidity('Please fill out this field.');
        nameRef.current.reportValidity();
      }
      return;
    }

    const cleanPhone = staffForm.phone ? staffForm.phone.replace(/[\s-]/g, '') : '';
    if (!cleanPhone || !/^[0-9]{10}$/.test(cleanPhone)) {
      if (phoneRef.current) {
        phoneRef.current.setCustomValidity(`Please enter a valid phone number. '${staffForm.phone}' must be exactly 10 digits.`);
        phoneRef.current.reportValidity();
      }
      return;
    }

    if (!staffForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staffForm.email)) {
      if (emailRef.current) {
        emailRef.current.setCustomValidity(staffForm.email.includes('@') ? 'Please enter a valid email address.' : `Please include an '@' in the email address. '${staffForm.email}' is missing an '@'.`);
        emailRef.current.reportValidity();
      }
      return;
    }

    if (!staffForm.password || staffForm.password.length < 6) {
      if (passwordRef.current) {
        passwordRef.current.setCustomValidity('Password must be at least 6 characters.');
        passwordRef.current.reportValidity();
      }
      return;
    }

    const cleanNic = staffForm.nic ? staffForm.nic.replace(/\s+/g, '') : '';
    const cleanSlmc = staffForm.slmc_registration_number ? staffForm.slmc_registration_number.trim() : '';

    if (staffForm.role === 'pharmacist') {
      if (!cleanSlmc || !cleanSlmc.match(/^[0-9]{4,10}$/)) {
        if (slmcRef.current) {
          slmcRef.current.setCustomValidity(`Please enter a valid SLMC Registration Number (4-10 digits). '${staffForm.slmc_registration_number}' is invalid.`);
          slmcRef.current.reportValidity();
        }
        return;
      }
      if (!cleanNic || !cleanNic.match(/^([0-9]{9}[vVxX]|[0-9]{12})$/)) {
        if (nicRef.current) {
          nicRef.current.setCustomValidity(`Please enter a valid Sri Lankan NIC. '${staffForm.nic}' is invalid.`);
          nicRef.current.reportValidity();
        }
        return;
      }
      if (!staffForm.certificate) {
        if (certRef.current) {
          certRef.current.setCustomValidity('Please select a file.');
          certRef.current.reportValidity();
        }
        return;
      }
      if (!staffForm.photo) {
        if (photoRef.current) {
          photoRef.current.setCustomValidity('Please select a file.');
          photoRef.current.reportValidity();
        }
        return;
      }
    }
    setAddingStaff(true);
    try {
      const formData = new FormData();
      formData.append('full_name', staffForm.full_name);
      formData.append('email', staffForm.email);
      formData.append('password', staffForm.password);
      formData.append('phone', cleanPhone);
      formData.append('role', staffForm.role);

      if (staffForm.role === 'pharmacist') {
        formData.append('slmc_registration_number', cleanSlmc);
        formData.append('nic', cleanNic);
        if (staffForm.certificate) formData.append('certificate', staffForm.certificate);
        if (staffForm.photo) formData.append('photo', staffForm.photo);
      }

      const res = await fetch(`${API}/pharmacy/create_staff.php`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const d = await res.json();

      if (d.status === 'success') {
        Promise.all([
          fetch(`${API}/pharmacy/get_staff.php`, { credentials: 'include', cache: 'no-store' }).then(r => r.json()),
          fetch(`${API}/pharmacy/get_dashboard.php`, { credentials: 'include', cache: 'no-store' }).then(r => r.json())
        ]).then(([staffData, dashData]) => {
          if (staffData.status === 'success') setStaff(staffData.data || []);
          if (dashData.status === 'success') setDashboard(dashData);
        });

        showToast(d.message || 'Staff member added successfully!');
        setShowAddStaff(false);
        setStaffForm({
          full_name: '', email: '', password: '', phone: '', role: 'pharmacist',
          slmc_registration_number: '', nic: '', certificate: null, photo: null
        });
      } else {
        const msg = (d.message || '').toLowerCase();
        if (msg.includes('email')) {
          if (emailRef.current) { emailRef.current.setCustomValidity(d.message); emailRef.current.reportValidity(); }
        } else if (msg.includes('phone') || msg.includes('digits')) {
          if (phoneRef.current) { phoneRef.current.setCustomValidity(d.message); phoneRef.current.reportValidity(); }
        } else if (msg.includes('nic')) {
          if (nicRef.current) { nicRef.current.setCustomValidity(d.message); nicRef.current.reportValidity(); }
        } else if (msg.includes('slmc')) {
          if (slmcRef.current) { slmcRef.current.setCustomValidity(d.message); slmcRef.current.reportValidity(); }
        } else if (msg.includes('password') || msg.includes('characters')) {
          if (passwordRef.current) { passwordRef.current.setCustomValidity(d.message); passwordRef.current.reportValidity(); }
        } else {
          showToast(d.message || 'Failed to add staff', 'error');
        }
      }
    } catch { showToast('Connection error', 'error'); }
    setAddingStaff(false);
  };

  const handleTogglePharmacist = async (userId, isActive) => {
    const action = (isActive === 1 || isActive === '1') ? 'unlink' : 'link';
    if (action === 'unlink' && !window.confirm("Are you sure you want to unlink this pharmacist? Depending on your remaining staff, your pharmacy might go offline.")) {
      return;
    }
    try {
      const res = await fetch(`${API}/pharmacy/unlink_pharmacist.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, action })
      });
      const d = await res.json();
      if (d.status === 'success') {
        Promise.all([
          fetch(`${API}/pharmacy/get_staff.php`, { credentials: 'include', cache: 'no-store' }).then(r => r.json()),
          fetch(`${API}/pharmacy/get_dashboard.php`, { credentials: 'include', cache: 'no-store' }).then(r => r.json())
        ]).then(([staffData, dashData]) => {
          if (staffData.status === 'success') setStaff(staffData.data || []);
          if (dashData.status === 'success') setDashboard(dashData);
        });
        showToast(d.message || `Pharmacist ${action}ed successfully!`);
      } else {
        showToast(d.message || `Failed to ${action} pharmacist`, 'error');
      }
    } catch { showToast('Connection error', 'error'); }
  };

  const initials = (name) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-teal-500', 'bg-rose-500', 'bg-amber-500', 'bg-indigo-500'];

  const statsData = [
    { label: 'Total Staff', value: staff.length, icon: Users, color: 'bg-blue-500', sub: 'All roles' },
    { label: 'Pharmacists', value: staff.filter(s => s.role === 'pharmacist').length, icon: Stethoscope, color: 'bg-teal-500', sub: 'Dispensary' },
    { label: 'Stock Managers', value: staff.filter(s => s.role === 'stock_manager').length, icon: Package, color: 'bg-orange-500', sub: 'Warehouse' },
  ];

  const renderStatusBadge = () => {
    const status = dashboard?.pharmacy?.status;
    if (status === 'fully_verified') {
      return (
        <div className="flex items-center gap-2 bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-full shadow-sm">
          <BadgeCheck className="w-4 h-4 text-blue-600" />
          <span className="font-bold text-sm text-blue-800">Verified Pharmacy</span>
        </div>
      );
    }
    if (status === 'pending_admin_approval') {
      return (
        <div className="flex items-center gap-2 bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-full shadow-sm">
          <Clock className="w-4 h-4 text-amber-600" />
          <span className="font-bold text-sm text-amber-800">Pending Verification</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-full shadow-sm">
        <AlertCircle className="w-4 h-4 text-gray-600" />
        <span className="font-bold text-sm text-gray-800">Incomplete (Offline)</span>
      </div>
    );
  };

  if (currentPath === '/pharmacy/stock') {
    return (
      <DashboardLayout sidebarItems={sidebarItems} colorScheme="blue" title="Pharmacy Stock">
        <PharmacyOwnerStockView />
      </DashboardLayout>
    );
  }

  if (currentPath === '/pharmacy/settings') {
    return (
      <DashboardLayout sidebarItems={sidebarItems} colorScheme="blue" title="Settings">
        <SettingsView sidebarItems={sidebarItems} colorScheme="blue" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sidebarItems={sidebarItems}
      colorScheme="blue"
      title="Staff Management"
      headerBadge={renderStatusBadge()}
    >
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8 animate-fadeIn">
            {statsData.map((s) => (
              <div key={s.label} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 ${s.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <s.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-gray-900">{s.value}</p>
                <p className="text-gray-500 text-sm mt-1 font-medium">{s.label}</p>
                <p className="text-xs text-blue-600 mt-1 font-medium">{s.sub}</p>
              </div>
            ))}
          </div>

          {currentPath === '/pharmacy/staff' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 animate-fadeIn">
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-wrap gap-3">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Staff Directory</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{staff.length} staff members</p>
                </div>
                <button
                  onClick={() => setShowAddStaff(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
                  <Plus className="w-4 h-4" /> Add New Staff
                </button>
              </div>

              {staff.length === 0 ? (
                <div className="text-center py-16">
                  <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No staff members yet</p>
                  <p className="text-gray-400 text-sm mt-1">Add pharmacists and stock managers to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {['Staff Member', 'Role', 'Department', 'Contact', 'Status', 'Actions'].map(h => (
                          <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {staff.map((s, i) => (
                        <tr key={s.id || i} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 ${colors[i % colors.length]} rounded-xl flex items-center justify-center text-white text-xs font-bold`}>
                                {initials(s.full_name)}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900 text-sm">{s.full_name}</p>
                                <p className="text-xs text-gray-500">{s.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${roleBadge[s.role] || 'bg-gray-100 text-gray-600'}`}>
                              {roleLabels[s.role] || s.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {s.role === 'pharmacist' ? 'Dispensary' : 'Warehouse'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-gray-600 text-sm">
                              <Phone className="w-3.5 h-3.5 text-gray-400" />
                              {s.phone || '—'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                (s.role === 'pharmacist' && s.status === 'pending')
                                  ? 'bg-amber-100 text-amber-700'
                                  : (s.is_active === 0 || s.is_active === '0') 
                                    ? 'bg-gray-100 text-gray-700' 
                                    : s.role === 'pharmacist' && s.status === 'rejected' 
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-green-100 text-green-700'
                              }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                (s.role === 'pharmacist' && s.status === 'pending')
                                  ? 'bg-amber-500'
                                  : (s.is_active === 0 || s.is_active === '0') 
                                    ? 'bg-gray-500' 
                                    : s.role === 'pharmacist' && s.status === 'rejected'
                                      ? 'bg-red-500'
                                      : 'bg-green-500'
                              }`} />
                              {(s.role === 'pharmacist' && s.status === 'pending')
                                ? 'Pending Admin'
                                : (s.is_active === 0 || s.is_active === '0') 
                                  ? 'Unlinked' 
                                  : s.role === 'pharmacist' && s.status === 'rejected'
                                    ? 'Rejected'
                                    : 'Active'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {s.role === 'pharmacist' || s.role === 'stock_manager' ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                {(s.role === 'pharmacist' || s.role === 'stock_manager') && (
                                  <button
                                    onClick={() => setViewPharmacistDetails(s)}
                                    className="flex items-center gap-1.5 px-2 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-xs font-semibold transition-all cursor-pointer">
                                    <ClipboardList className="w-3.5 h-3.5" /> Details
                                  </button>
                                )}
                                <button
                                  onClick={() => handleTogglePharmacist(s.user_id, s.is_active)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:shadow-sm cursor-pointer ${
                                    (s.is_active === 1 || s.is_active === '1')
                                      ? 'bg-red-50 hover:bg-red-100 text-red-600'
                                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'
                                  }`}>
                                  {(s.is_active === 1 || s.is_active === '1') ? 'Unlink' : 'Link'}
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Portal Mounted Modal */}
      {showAddStaff && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999] p-3 sm:p-4 animate-fadeIn">

          {/* Main card */}
          <form noValidate
            onSubmit={handleAddStaff}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] min-h-[500px] max-h-[650px] grid grid-rows-[60px_1fr_75px] overflow-hidden border border-gray-100 relative">

            {/* Header block */}
            <div className="flex items-center justify-between px-5 bg-white border-b border-gray-100 z-30">
              <h3 className="text-lg font-bold text-gray-900">Add New Staff Member</h3>
              <button
                type="button"
                onClick={() => setShowAddStaff(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-50 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Self Contained Scrollable Form Section */}
            <div className="overflow-y-auto bg-white z-10 min-h-0 p-5 space-y-5">
              {/* Role Picker Section */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Role *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { val: 'pharmacist', label: 'Pharmacist', icon: Stethoscope },
                    { val: 'stock_manager', label: 'Stock Manager', icon: Package }
                  ].map(({ val, label, icon: Icon }) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setStaffForm({ ...staffForm, role: val })}
                      className={`p-3.5 rounded-xl border-2 text-left transition-all flex flex-col justify-between ${staffForm.role === val ? 'border-blue-500 bg-blue-50/40' : 'border-gray-200 hover:border-blue-300'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 flex-shrink-0 ${staffForm.role === val ? 'text-blue-600' : 'text-gray-400'}`} />
                        <div>
                          <p className={`text-sm font-semibold ${staffForm.role === val ? 'text-blue-700' : 'text-gray-700'}`}>{label}</p>
                          {val === 'pharmacist' && staffForm.role === val && (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                              Requires Admin Approval
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input ref={nameRef} required value={staffForm.full_name} onChange={e => setStaffForm({ ...staffForm, full_name: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-all"
                      placeholder="Nimal Perera" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number *</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input ref={phoneRef} required type="text" pattern="[0-9]{10}" title="Phone number must be exactly 10 digits" value={staffForm.phone}
                      onChange={e => setStaffForm({ ...staffForm, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-all"
                      placeholder="0771234567" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address *</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input ref={emailRef} required type="email" value={staffForm.email} onChange={e => setStaffForm({ ...staffForm, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-all"
                      placeholder="staff@pharmacy.lk" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input ref={passwordRef} required type={showPw ? 'text' : 'password'} value={staffForm.password} onChange={e => setStaffForm({ ...staffForm, password: e.target.value })}
                      className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-all"
                      placeholder="••••••••" minLength="6" />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Conditional Medical Verification Section */}
              {staffForm.role === 'pharmacist' && (
                <div className="border border-teal-100 bg-teal-50/30 p-4 rounded-xl space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-4 h-4 text-teal-600 flex-shrink-0" />
                    <h4 className="font-semibold text-teal-800 text-sm">Pharmacist Verification Details</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">SLMC Reg Number *</label>
                      <input ref={slmcRef} required={staffForm.role === 'pharmacist'} pattern="[0-9]{4,10}" title="SLMC Registration Number must contain 4-10 digits" value={staffForm.slmc_registration_number}
                        onChange={e => setStaffForm({ ...staffForm, slmc_registration_number: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white transition-all"
                        placeholder="e.g. 13859" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">NIC Number *</label>
                      <input ref={nicRef} required={staffForm.role === 'pharmacist'} pattern="([0-9]{9}[vVxX]|[0-9]{12})" title="Valid Sri Lankan NIC (9 digits + V/X or 12 digits)" value={staffForm.nic}
                        onChange={e => setStaffForm({ ...staffForm, nic: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white transition-all"
                        placeholder="e.g. 199012345678" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative">
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Certificate Upload *</label>
                      <div className="relative w-full">
                        <input ref={certRef} required={staffForm.role === 'pharmacist'} type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,image/*" onChange={(e) => handleFileChange(e, 'certificate')} />
                        <div className="w-full flex items-center justify-between px-4 py-2.5 border border-gray-200 bg-white rounded-xl text-sm hover:border-teal-300 transition-all text-left pointer-events-none">
                          <span className="text-gray-500 truncate mr-2">{staffForm.certificate ? staffForm.certificate.name : 'Upload PDF/Image'}</span>
                          <Upload className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Pharmacist Photo *</label>
                      <div className="relative w-full">
                        <input ref={photoRef} required={staffForm.role === 'pharmacist'} type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" onChange={(e) => handleFileChange(e, 'photo')} />
                        <div className="w-full flex items-center justify-between px-4 py-2.5 border border-gray-200 bg-white rounded-xl text-sm hover:border-teal-300 transition-all text-left pointer-events-none">
                          <span className="text-gray-500 truncate mr-2">{staffForm.photo ? staffForm.photo.name : 'Upload Image'}</span>
                          <Upload className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Fixed Footer Block */}
            <div className="px-5 bg-white border-t border-gray-100 flex items-center justify-between gap-3 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] z-30">
              <button
                type="button"
                onClick={() => setShowAddStaff(false)}
                className="flex-1 h-11 border border-gray-200 bg-white text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addingStaff}
                className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-md"
              >
                {addingStaff ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>{staffForm.role === 'pharmacist' ? 'Add & Request Verification' : 'Add Staff Member'}</span>
              </button>
            </div>

          </form>
        </div>,
        document.body
      )}
      {/* Pharmacist Details View Modal */}
      {viewPharmacistDetails && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-0 my-auto overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">{viewPharmacistDetails.role === 'stock_manager' ? 'Stock Manager Details' : 'Pharmacist Details'}</h3>
                  <p className="text-xs text-gray-500">Review {viewPharmacistDetails.role === 'stock_manager' ? 'stock manager' : 'pharmacist'} registration details</p>
                </div>
              </div>
              <button onClick={() => setViewPharmacistDetails(null)} className="text-gray-400 hover:text-gray-600 bg-white border border-gray-200 rounded-lg p-2 shadow-sm transition-all shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
              {viewPharmacistDetails.role === 'pharmacist' && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">Pharmacists register using their SLMC Number. Document uploads are not required initially.</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">Personal Information</h4>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-1">Full Name</p>
                    <p className="text-sm text-gray-900 font-medium bg-gray-50 p-2.5 rounded-lg border border-gray-100">{viewPharmacistDetails.full_name || viewPharmacistDetails.name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-1">Email Address</p>
                    <p className="text-sm text-gray-900 font-medium bg-gray-50 p-2.5 rounded-lg border border-gray-100">{viewPharmacistDetails.email || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-1">Phone Number</p>
                    <p className="text-sm text-gray-900 font-medium bg-gray-50 p-2.5 rounded-lg border border-gray-100">{viewPharmacistDetails.phone || '—'}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">Professional Details</h4>
                  {viewPharmacistDetails.role === 'pharmacist' && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">SLMC Registration No</label>
                      <p className="text-sm text-gray-900 font-mono bg-teal-50 text-teal-800 p-3 rounded-xl border border-teal-100">{viewPharmacistDetails.slmc_reg_number || '—'}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-1">Assigned Pharmacy</p>
                    <p className="text-sm text-gray-900 font-semibold bg-blue-50 text-blue-800 p-3 rounded-xl border border-blue-100 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-500" />
                      {viewPharmacistDetails.pharmacy_name || 'Your Pharmacy'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-1">Role</p>
                    <p className="text-sm text-gray-900 font-semibold bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center gap-2">
                      {viewPharmacistDetails.role === 'pharmacist' ? 'Pharmacist' : 'Stock Manager'}
                    </p>
                  </div>
                </div>
              </div>

              {viewPharmacistDetails.role === 'pharmacist' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Certificate / License</label>
                    {viewPharmacistDetails.certificate_path ? (
                      <button onClick={() => setPreviewDoc(getMediaUrl(viewPharmacistDetails.certificate_path))} className="w-full flex items-center justify-center gap-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 p-3 rounded-xl transition-colors font-semibold">
                        <FileText className="w-5 h-5" /> View Certificate
                      </button>
                    ) : (
                      <p className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">Not provided</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Pharmacist Photo</label>
                    {viewPharmacistDetails.photo_path ? (
                      <button onClick={() => setPreviewDoc(getMediaUrl(viewPharmacistDetails.photo_path))} className="w-full flex items-center justify-center gap-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 p-3 rounded-xl transition-colors font-semibold">
                        <ImageIcon className="w-5 h-5" /> View Photo
                      </button>
                    ) : (
                      <p className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">Not provided</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="px-4 sm:px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0 flex items-center justify-between">
              <span className={`w-fit px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
                (viewPharmacistDetails.role === 'pharmacist' && viewPharmacistDetails.status === 'pending')
                  ? 'bg-amber-100 text-amber-700'
                  : (viewPharmacistDetails.is_active === 0 || viewPharmacistDetails.is_active === '0')
                    ? 'bg-gray-100 text-gray-600'
                    : viewPharmacistDetails.role === 'pharmacist' && viewPharmacistDetails.status === 'rejected'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-emerald-100 text-emerald-700'
              }`}>
                {(viewPharmacistDetails.role === 'pharmacist' && viewPharmacistDetails.status === 'pending')
                  ? 'Status: Pending'
                  : (viewPharmacistDetails.is_active === 0 || viewPharmacistDetails.is_active === '0')
                    ? 'Unlinked'
                    : viewPharmacistDetails.role === 'pharmacist' && viewPharmacistDetails.status === 'rejected'
                      ? 'Status: Rejected'
                      : 'Active'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/90 backdrop-blur-sm" onClick={() => setPreviewDoc(null)}>
          <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-gray-900">Document Preview</h3>
              <div className="flex gap-2">
                <a href={previewDoc} target="_blank" rel="noreferrer" className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors" title="Open in new tab">
                  <ExternalLink className="w-5 h-5" />
                </a>
                <button onClick={() => setPreviewDoc(null)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto flex items-center justify-center bg-gray-100/50 flex-1 min-h-[50vh] w-full">
              {previewDoc?.toLowerCase().endsWith('.pdf') ? (
                <iframe src={previewDoc} className="w-full h-full min-h-[75vh] border-0 rounded-lg shadow-sm bg-white" title="PDF Preview" />
              ) : (
                <>
                  <img src={previewDoc} alt="Document Preview" className="max-w-full max-h-[75vh] object-contain shadow-sm bg-white" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                  <div style={{ display: 'none' }} className="flex-col items-center justify-center text-center p-8">
                    <AlertCircle className="w-16 h-16 text-amber-500 mb-4 mx-auto" />
                    <h4 className="text-lg font-bold text-gray-900 mb-2">Unable to display preview</h4>
                    <p className="text-gray-500 max-w-sm mb-6">This document format might not be previewable directly in the browser.</p>
                    <a href={previewDoc} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-sm">
                      <ExternalLink className="w-5 h-5" /> Open Document
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}