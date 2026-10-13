import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    User, Lock, Shield, CheckCircle, AlertCircle, Key, Smartphone, Laptop, X, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE_URL;
const RELATIONSHIPS = ['Father', 'Mother', 'Spouse', 'Brother', 'Sister', 'Guardian', 'Other'];

export default function SettingsView({ sidebarItems, colorScheme = "blue", showPharmacistSettings = false }) {
    const { user, login, logout } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('profile');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleting, setDeleting] = useState(false);

    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        family_contact: '',
        family_relationship: '',
        family_contact_2: '',
        family_relationship_2: '',
        is_sos_enabled: false,
        pharmacy_name: '',
        address: '',
        new_password: '',
        confirm_password: '',
        password: ''
    });
    const [sessionInfo, setSessionInfo] = useState(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await fetch(`${API_BASE}/shared/get_profile.php`, { credentials: 'include' });
            const data = await res.json();
            if (data.status === 'success') {
                const p = data.data;
                setFormData(prev => ({
                    ...prev,
                    full_name: p.full_name || '',
                    phone: p.phone || '',
                    family_contact: p.family_contact || '',
                    family_relationship: p.family_relationship || '',
                    family_contact_2: p.family_contact_2 || '',
                    family_relationship_2: p.family_relationship_2 || '',
                    is_sos_enabled: p.is_sos_enabled == 1,
                    pharmacy_name: p.pharmacy_name || '',
                    address: p.address || '',
                    license_number: p.license_number || ''
                }));
                if (p.session_info) {
                    setSessionInfo(p.session_info);
                }
            } else {
                setError(data.message || 'Failed to load profile');
            }
        } catch {
            setError('Connection error');
        }
        setLoading(false);
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const payload = { ...formData, new_password: '' };

            const res = await fetch(`${API_BASE}/shared/update_profile.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.status === 'success') {
                setSuccess('Profile updated successfully!');
                if (login) {
                    login({ 
                        ...user, 
                        full_name: formData.full_name, 
                        name: formData.full_name, // Update 'name' too because login.php uses 'name'
                        phone: formData.phone, 
                        is_sos_enabled: formData.is_sos_enabled ? 1 : 0,
                        pharmacy_name: formData.pharmacy_name 
                    });
                }
            } else {
                setError(data.message || 'Update failed');
            }
        } catch {
            setError('Connection error');
        }
        setSaving(false);
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (!formData.password || !formData.new_password || !formData.confirm_password) {
            setError('Current, new, and confirm passwords are required');
            return;
        }
        if (formData.new_password !== formData.confirm_password) {
            setError('New password and confirm password do not match');
            return;
        }
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const payload = { ...formData };
            const res = await fetch(`${API_BASE}/shared/update_profile.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.status === 'success') {
                setSuccess('Password updated successfully!');
                setFormData(prev => ({ ...prev, password: '', new_password: '', confirm_password: '' }));
            } else {
                setError(data.message || 'Update failed');
            }
        } catch {
            setError('Connection error');
        }
        setSaving(false);
    };

    const handleDeleteAccount = async (e) => {
        e.preventDefault();
        if (!deletePassword) {
            setError('Password is required to delete your account.');
            return;
        }
        setDeleting(true);
        setError('');

        try {
            const res = await fetch(`${API_BASE}/shared/delete_account.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ password: deletePassword })
            });
            const data = await res.json();
            if (data.status === 'success') {
                await logout();
                navigate('/login');
            } else {
                setError(data.message || 'Failed to delete account');
            }
        } catch {
            setError('Connection error');
        }
        setDeleting(false);
    };

    const tabs = [
        { id: 'profile', label: 'Profile Information', icon: User },
        { id: 'password', label: 'Change Password', icon: Lock },
        { id: 'security', label: 'Security', icon: Shield },
    ];

    const inputCls = "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all";
    const labelCls = "block text-sm font-semibold text-gray-700 mb-1.5";

    const nameParts = formData.full_name ? formData.full_name.split(' ') : [];
    const firstName = nameParts[0] || '';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    const initials = firstName ? firstName.charAt(0).toUpperCase() : 'U';

    const roleLabels = {
        admin: 'Administrator',
        pharmacy_owner: 'Pharmacy Owner',
        pharmacist: 'Pharmacist',
        stock_manager: 'Stock Manager',
        patient: 'Patient',
        superadmin: 'Super Admin'
    };

    const userIdDisplay = user?.role === 'stock_manager' ? 'STK-2173' : (user?.user_id ? `USR-${user.user_id}` : 'N/A');

    return (
        <>
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 max-w-7xl mx-auto w-full animate-fadeIn p-4">

            {/* Left Settings Sidebar */}
                <div className="w-full md:w-64 flex-shrink-0">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 flex flex-col gap-1">
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => { setActiveTab(tab.id); setError(''); setSuccess(''); }}
                                    className={`flex items-center gap-2 md:gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left whitespace-nowrap flex-shrink-0
                    ${isActive
                                            ? 'bg-blue-50 text-blue-700 md:border-l-[3px] border-blue-600'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 md:border-l-[3px] border-transparent'
                                        }`}
                                >
                                    <tab.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} strokeWidth={isActive ? 2.5 : 2} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right Content Area */}
                <div className="flex-1">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">

                        {error && (
                            <div className="mb-6 flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3 font-medium shadow-sm">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                            </div>
                        )}
                        {success && (
                            <div className="mb-6 flex items-center gap-2 text-[#00C26F] text-sm bg-[#E6FDF4] border border-[#00C26F]/20 rounded-xl px-4 py-3 font-medium shadow-sm">
                                <CheckCircle className="w-4 h-4 flex-shrink-0" />{success}
                            </div>
                        )}

                        {loading ? (
                            <div className="flex justify-center py-12">
                                <span className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full spin" />
                            </div>
                        ) : (
                            <>
                                {/* ── PROFILE TAB ── */}
                                {activeTab === 'profile' && (
                                    <div className="space-y-8 animate-fadeIn">
                                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 pb-6 border-b border-gray-100 text-center sm:text-left">
                                            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg flex-shrink-0">
                                                {initials}
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-gray-900">{formData.full_name || 'User Name'}</h2>
                                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 mt-2">
                                                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg uppercase tracking-wider">
                                                        {roleLabels[user?.role] || 'Staff'}
                                                    </span>
                                                    <span className="text-sm font-medium text-gray-500">ID: {userIdDisplay}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <form onSubmit={handleProfileSubmit}>
                                            <div className="space-y-6">
                                                <h3 className="text-lg font-bold text-gray-900">Personal Information</h3>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div>
                                                        <label className={labelCls}>First Name</label>
                                                        <input type="text" value={firstName} onChange={(e) => setFormData({ ...formData, full_name: `${e.target.value} ${lastName}` })} className={inputCls} />
                                                    </div>
                                                    <div>
                                                        <label className={labelCls}>Last Name</label>
                                                        <input type="text" value={lastName} onChange={(e) => setFormData({ ...formData, full_name: `${firstName} ${e.target.value}` })} className={inputCls} />
                                                    </div>
                                                    <div>
                                                        <label className={labelCls}>Email Address</label>
                                                        <input type="email" value={user?.email || ''} readOnly className={`${inputCls} opacity-70 cursor-not-allowed`} />
                                                    </div>
                                                    <div>
                                                        <label className={labelCls}>Phone Number</label>
                                                        <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className={inputCls} />
                                                    </div>
                                                </div>

                                                {(user?.role === 'pharmacy_owner' || showPharmacistSettings) && (
                                                    <>
                                                        <h3 className="text-lg font-bold text-gray-900 pt-4 border-t border-gray-100">Professional Details</h3>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                            {showPharmacistSettings && (
                                                                <div className="md:col-span-2">
                                                                    <label className={labelCls}>License Number (SLMC)</label>
                                                                    <input type="text" value={formData.license_number || ''} readOnly className={`${inputCls} opacity-70 cursor-not-allowed`} />
                                                                </div>
                                                            )}
                                                            {user?.role === 'pharmacy_owner' && (
                                                                <>
                                                                    <div className="md:col-span-2">
                                                                        <label className={labelCls}>Pharmacy Name</label>
                                                                        <input type="text" value={formData.pharmacy_name} onChange={e => setFormData({ ...formData, pharmacy_name: e.target.value })} className={inputCls} />
                                                                    </div>
                                                                    <div className="md:col-span-2">
                                                                        <label className={labelCls}>Pharmacy Address</label>
                                                                        <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className={inputCls} />
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </>
                                                )}

                                                {user?.role === 'patient' && (
                                                    <>
                                                        <div className="flex items-center justify-between mb-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                                            <div>
                                                                <h4 className="text-md font-semibold text-blue-900 mb-1 flex items-center gap-2">
                                                                    <AlertCircle className="w-4 h-4 text-blue-600" />
                                                                    Emergency SOS Feature
                                                                </h4>
                                                                <p className="text-sm text-blue-700/80">
                                                                    Turn on this feature to add the SOS button to your dashboard. This allows you to quickly notify your trusted family members in an emergency.
                                                                </p>
                                                            </div>
                                                            <label className="relative inline-flex items-center cursor-pointer">
                                                                <input 
                                                                    type="checkbox" 
                                                                    className="sr-only peer" 
                                                                    checked={formData.is_sos_enabled}
                                                                    onChange={e => setFormData({ ...formData, is_sos_enabled: e.target.checked })}
                                                                />
                                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                            </label>
                                                        </div>

                                                        {formData.is_sos_enabled && (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                <div>
                                                                    <label className={labelCls}>Primary Contact Number</label>
                                                                    <input type="tel" value={formData.family_contact} onChange={e => setFormData({ ...formData, family_contact: e.target.value })} className={inputCls} />
                                                                </div>
                                                                <div>
                                                                    <label className={labelCls}>Relationship</label>
                                                                    <select value={formData.family_relationship} onChange={e => setFormData({ ...formData, family_relationship: e.target.value })} className={inputCls}>
                                                                        <option value="">Select Relationship</option>
                                                                        {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className={labelCls}>Secondary Contact Number</label>
                                                                    <input type="tel" value={formData.family_contact_2} onChange={e => setFormData({ ...formData, family_contact_2: e.target.value })} className={inputCls} />
                                                                </div>
                                                                <div>
                                                                    <label className={labelCls}>Relationship</label>
                                                                    <select value={formData.family_relationship_2} onChange={e => setFormData({ ...formData, family_relationship_2: e.target.value })} className={inputCls}>
                                                                        <option value="">Select Relationship</option>
                                                                        {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </>
                                                )}



                                                <div className="flex justify-end pt-4">
                                                    <button type="submit" disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-60 shadow-sm">
                                                        {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full spin" /> : <CheckCircle className="w-4 h-4" />}
                                                        Save Changes
                                                    </button>
                                                </div>
                                            </div>
                                        </form>
                                    </div>
                                )}

                                {/* ── PASSWORD TAB ── */}
                                {activeTab === 'password' && (
                                    <div className="space-y-8 animate-fadeIn">
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900">Change Password</h2>
                                            <p className="text-sm text-gray-500 mt-1">Ensure your account is using a long, random password to stay secure.</p>
                                        </div>

                                        <form onSubmit={handlePasswordSubmit}>
                                            <div className="space-y-6 max-w-md">
                                                <div>
                                                    <label className={labelCls}>Current Password</label>
                                                    <div className="relative">
                                                        <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                        <input type="password" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className={`${inputCls} pl-10`} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className={labelCls}>New Password</label>
                                                    <div className="relative">
                                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                        <input type="password" required minLength={6} value={formData.new_password} onChange={(e) => setFormData({ ...formData, new_password: e.target.value })} className={`${inputCls} pl-10`} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className={labelCls}>Confirm New Password</label>
                                                    <div className="relative">
                                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                        <input type="password" required minLength={6} value={formData.confirm_password} onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })} className={`${inputCls} pl-10`} />
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-2">Password must be at least 6 characters long.</p>
                                                </div>

                                                <div className="pt-4">
                                                    <button type="submit" disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-60 shadow-sm">
                                                        {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full spin" /> : <Shield className="w-4 h-4" />}
                                                        Update Password
                                                    </button>
                                                </div>
                                            </div>
                                        </form>
                                    </div>
                                )}

                                {/* ── SECURITY TAB ── */}
                                {activeTab === 'security' && (
                                    <div className="space-y-8 animate-fadeIn">
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900">Security</h2>
                                            <p className="text-sm text-gray-500 mt-1">Manage your account security and active sessions.</p>
                                        </div>

                                        <div className="space-y-6">

                                            {/* Active Sessions */}
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900 mb-4">Active Sessions</h3>
                                                <div className="space-y-3">
                                                    {sessionInfo ? (
                                                        <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl">
                                                            <div className="flex items-center gap-4">
                                                                {sessionInfo.os === 'iPhone' || sessionInfo.os === 'Android' ? (
                                                                    <Smartphone className="w-5 h-5 text-gray-400" />
                                                                ) : (
                                                                    <Laptop className="w-5 h-5 text-gray-400" />
                                                                )}
                                                                <div>
                                                                    <p className="text-sm font-bold text-gray-900">{sessionInfo.os} • {sessionInfo.browser}</p>
                                                                    <p className="text-xs text-gray-500">Active now • IP: {sessionInfo.ip}</p>
                                                                </div>
                                                            </div>
                                                            <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-lg uppercase">Current</span>
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm text-gray-500 py-2">Loading session details...</div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Delete Account */}
                                            <div className="pt-6 border-t border-gray-100">
                                                <h3 className="text-lg font-bold text-red-600 mb-2">Delete Account</h3>
                                                <p className="text-sm text-gray-500 mb-4">Once you delete your account, there is no going back. Please be certain.</p>
                                                <button
                                                    onClick={() => { setShowDeleteModal(true); setDeletePassword(''); setError(''); }}
                                                    className="px-5 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors"
                                                >
                                                    Delete my account
                                                </button>
                                            </div>

                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                    </div>
                </div>
            </div>

            {/* Delete Account Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-red-600">Delete Account</h3>
                            <button onClick={() => setShowDeleteModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {error && (
                            <div className="mb-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3 font-medium shadow-sm">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                            </div>
                        )}

                        <form onSubmit={handleDeleteAccount} className="space-y-4">
                            <p className="text-sm text-gray-700 font-medium leading-relaxed">
                                Are you sure you want to delete your account? This action cannot be undone.
                                Please enter your password to confirm.
                            </p>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password *</label>
                                <div className="relative">
                                    <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input type="password" required value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50 focus:bg-white transition-all"
                                        placeholder="Enter your password"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all">
                                    No, Cancel
                                </button>
                                <button type="submit" disabled={deleting || !deletePassword}
                                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                                    {deleting ? <Loader2 className="w-4 h-4 spin" /> : null}
                                    Yes, Delete
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
