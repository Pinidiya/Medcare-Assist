import { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, ShieldCheck, Plus, X, Loader2, CheckCircle, AlertCircle, ToggleLeft, ToggleRight, FileText, LayoutDashboard } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import SettingsView from '../../components/SettingsView';

const API = import.meta.env.VITE_API_BASE_URL;

const sidebarItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/superadmin/dashboard' }
  //{ label: 'Settings', icon: Settings, path: '/superadmin/settings' }
];

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl animate-fadeIn text-white text-sm font-medium ${type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
      {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      {message}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
}

export default function SuperadminDashboard() {
  const [admins, setAdmins] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ full_name: '', email: '', password: '' });
  const [adding, setAdding] = useState(false);

  const [togglingId, setTogglingId] = useState(null);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const fetchSecurityData = useCallback(() => {
    setLoading(true);

    Promise.all([
      fetch(`${API}/superadmin/get_admins.php`, { credentials: 'include' }).then(r => r.json()),
      fetch(`${API}/superadmin/get_audit_logs.php`, { credentials: 'include' }).then(r => r.json())
    ])
      .then(([adminsData, logsData]) => {
        if (adminsData.status === 'success') setAdmins(adminsData.data || []);
        else showToast(adminsData.message || 'Failed to fetch admins', 'error');

        if (logsData.status === 'success') setAuditLogs(logsData.data || []);
      })
      .catch(() => showToast('Connection error', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchSecurityData();
  }, [fetchSecurityData]);

  const location = useLocation();
  const currentPath = location.pathname;

  if (currentPath === '/superadmin/settings') {
    return (
      <DashboardLayout sidebarItems={sidebarItems} colorScheme="blue" title="Settings">
        <SettingsView sidebarItems={sidebarItems} colorScheme="blue" />
      </DashboardLayout>
    );
  }

  const handleToggleAdmin = async (userId, currentStatus) => {
    setTogglingId(userId);
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    try {
      const res = await fetch(`${API}/superadmin/toggle_admin.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, account_status: newStatus }),
      });
      const d = await res.json();
      if (d.status === 'success') {
        setAdmins(prev => prev.map(a => a.user_id === userId ? { ...a, account_status: newStatus } : a));
        showToast(d.message || `Admin account status updated`);
      } else {
        showToast(d.message || 'Failed to update admin status', 'error');
      }
    } catch {
      showToast('Connection error', 'error');
    }
    setTogglingId(null);
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch(`${API}/superadmin/create_admin.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      const d = await res.json();
      if (d.status === 'success') {
        showToast('Admin created successfully');
        setShowAddModal(false);
        setAddForm({ full_name: '', email: '', password: '' });
        fetchSecurityData();
      } else {
        showToast(d.message || 'Failed to create admin', 'error');
      }
    } catch {
      showToast('Connection error', 'error');
    }
    setAdding(false);
  };

  return (
    <DashboardLayout sidebarItems={sidebarItems} colorScheme="blue" title="Superadmin Dashboard">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-8 overflow-hidden animate-fadeIn">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 border-b border-gray-100 gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-blue-500" /> System Administrators
            </h2>
            <p className="text-sm text-gray-500 mt-1">Manage admin access to the MedCare Assist platform</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm shadow-blue-200 hover:shadow-md"
          >
            <Plus className="w-4 h-4" /> Add New Admin
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-blue-500 spin" />
          </div>
        ) : admins.length === 0 ? (
          <div className="text-center py-16 bg-gray-50">
            <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No admin accounts found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Administrator</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {admins.map(admin => (
                  <tr key={admin.user_id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                          {admin.full_name?.charAt(0).toUpperCase() || 'A'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{admin.full_name}</p>
                          <p className="text-sm text-gray-500">{admin.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${admin.account_status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                        {admin.account_status === 'active' ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(admin.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleToggleAdmin(admin.user_id, admin.account_status)}
                        disabled={togglingId === admin.user_id}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${admin.account_status === 'active' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'} disabled:opacity-50`}
                      >
                        {togglingId === admin.user_id ? <Loader2 className="w-4 h-4 spin" /> : admin.account_status === 'active' ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        {admin.account_status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/*Audit logs table*/}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8 animate-fadeIn">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 border-b border-gray-100 gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-gray-400" /> System Audit Logs
            </h2>
            <p className="text-sm text-gray-500 mt-1">Track all administrative actions across the platform</p>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-gray-400 spin" />
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="text-center py-16 bg-gray-50">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No logs available.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-100 shadow-sm">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date/Time</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {auditLogs.map((log, idx) => (
                  <tr key={log.id || idx} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString([], {
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-xs">
                          {(log.full_name || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{log.full_name || 'System'}</p>
                          <p className="text-xs text-gray-500">{log.email || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {log.action_description?.toLowerCase().includes('create') && <div className="w-2 h-2 rounded-full bg-emerald-500"></div>}
                        {log.action_description?.toLowerCase().includes('suspend') && <div className="w-2 h-2 rounded-full bg-red-500"></div>}
                        {log.action_description?.toLowerCase().includes('active') && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                        {!log.action_description?.toLowerCase().includes('create') && !log.action_description?.toLowerCase().includes('suspend') && !log.action_description?.toLowerCase().includes('active') && <div className="w-2 h-2 rounded-full bg-gray-400"></div>}
                        <span className="text-sm text-gray-700">{log.action_description}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800 font-mono">
                        {log.ip_address === '::1' ? '127.0.0.1 (Local)' : (log.ip_address || 'Unknown')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Add Administrator</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={addForm.full_name}
                  onChange={e => setAddForm({ ...addForm, full_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 focus:bg-white transition-all"
                  placeholder="e.g. Wimal Karunaratne"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={addForm.email}
                  onChange={e => setAddForm({ ...addForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 focus:bg-white transition-all"
                  placeholder="admin@example.lk"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={addForm.password}
                  onChange={e => setAddForm({ ...addForm, password: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 focus:bg-white transition-all"
                  placeholder="••••••••"
                />
                <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters.</p>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="flex-1 px-4 py-2.5 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-70 flex justify-center items-center gap-2"
                >
                  {adding ? <Loader2 className="w-5 h-5 spin" /> : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
