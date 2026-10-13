import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import PharmacyDashboard from './pages/pharmacy/PharmacyDashboard';
import PharmacistDashboard from './pages/pharmacist/PharmacistDashboard';
import StockDashboard from './pages/stock/StockDashboard';
import PatientDashboard from './pages/patient/PatientDashboard';
import PharmacyPortfolio from './pages/patient/PharmacyPortfolio';
import SuperadminDashboard from './pages/superadmin/SuperadminDashboard';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

function RoleRouter() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const roleRoutes = {
    admin: '/admin/dashboard',
    pharmacy_owner: '/pharmacy/staff',
    pharmacist: '/pharmacist/dashboard',
    stock_manager: '/stock/dashboard',
    patient: '/patient/dashboard',
    superadmin: '/superadmin/dashboard',
  };
  return <Navigate to={roleRoutes[user.role] || '/login'} replace />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/*" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/superadmin/*" element={<ProtectedRoute allowedRoles={['superadmin']}><SuperadminDashboard /></ProtectedRoute>} />
          <Route path="/pharmacy/*" element={<ProtectedRoute allowedRoles={['pharmacy_owner']}><PharmacyDashboard /></ProtectedRoute>} />
          <Route path="/pharmacist" element={<ProtectedRoute allowedRoles={['pharmacist']}><PharmacistDashboard /></ProtectedRoute>} />
          <Route path="/stockmanager" element={<ProtectedRoute allowedRoles={['stock_manager']}><StockDashboard /></ProtectedRoute>} />
          <Route path="/patient/*" element={<ProtectedRoute allowedRoles={['patient']}><PatientDashboard /></ProtectedRoute>} />
          <Route path="/patient/pharmacy/:id" element={<ProtectedRoute allowedRoles={['patient']}><PharmacyPortfolio /></ProtectedRoute>} />

          {/* Wildcard sub-routes for dashboard sidebar navigation */}
          <Route path="/patient/*" element={<ProtectedRoute allowedRoles={['patient']}><PatientDashboard /></ProtectedRoute>} />
          <Route path="/pharmacy/*" element={<ProtectedRoute allowedRoles={['pharmacy_owner']}><PharmacyDashboard /></ProtectedRoute>} />
          <Route path="/pharmacist/*" element={<ProtectedRoute allowedRoles={['pharmacist']}><PharmacistDashboard /></ProtectedRoute>} />
          <Route path="/stock/*" element={<ProtectedRoute allowedRoles={['stock_manager']}><StockDashboard /></ProtectedRoute>} />
          <Route path="/admin/*" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/superadmin/*" element={<ProtectedRoute allowedRoles={['superadmin']}><SuperadminDashboard /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
