import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Eye, EyeOff, Mail, Lock, AlertCircle,
  Shield, CheckCircle, Heart, Activity, Stethoscope, X
} from 'lucide-react';

import logoImg from '../assets/logo.png';

import { authApi } from '../services/authApi';

/* ─── floating medical bubble ─── */
function FloatingBubble({ children, className, delay = '0s' }) {
  return (
    <div
      className={`absolute rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center ${className}`}
      style={{ animation: `floatBubble 6s ease-in-out ${delay} infinite` }}
    >
      {children}
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const roleRoutes = {
    admin: '/admin/dashboard',
    pharmacy_owner: '/pharmacy/staff',
    pharmacist: '/pharmacist/dashboard',
    stock_manager: '/stock/dashboard',
    patient: '/patient/dashboard',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authApi.login(form.email, form.password);
      if (data.status === 'success') {
        if (data.user.role === 'admin' || data.user.role === 'superadmin') {
          setError('Admin accounts must log in via the Admin Portal.');
          return;
        }
        login({ ...data.user, full_name: data.user.name, user_id: data.user.id });
        navigate(roleRoutes[data.user.role] || '/dashboard');
      } else {
        setError(data.message || 'Invalid credentials. Please try again.');
      }
    } catch (e) {
      setError(e.message || 'Unable to connect. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-['Inter']">
      {/* ═══════════ LEFT HERO PANEL ═══════════ */}
      <div className="hidden lg:flex w-[48%] relative overflow-hidden flex-col justify-between p-0">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#d6eaf8] via-[#dceefb] to-[#e8f4fd]" />

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, #1a56db 1px, transparent 1px)', backgroundSize: '30px 30px' }}
        />

        {/* DNA Helix decorative element */}
        <div className="absolute top-0 right-0 bottom-0 w-[55%] flex items-center justify-center opacity-20">
          <svg viewBox="0 0 200 600" className="h-full" fill="none">
            {[...Array(20)].map((_, i) => {
              const y = i * 30;
              const x1 = 60 + Math.sin(i * 0.6) * 40;
              const x2 = 140 - Math.sin(i * 0.6) * 40;
              return (
                <g key={i}>
                  <circle cx={x1} cy={y} r={4} fill="#2563eb" opacity={0.6} />
                  <circle cx={x2} cy={y} r={4} fill="#3b82f6" opacity={0.4} />
                  <line x1={x1} y1={y} x2={x2} y2={y} stroke="#93c5fd" strokeWidth={1} opacity={0.3} />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Floating medical bubbles */}
        <FloatingBubble className="w-20 h-20 top-[15%] right-[25%]" delay="0s">
          <Heart className="w-8 h-8 text-blue-500/60" />
        </FloatingBubble>
        <FloatingBubble className="w-16 h-16 top-[45%] right-[15%]" delay="1s">
          <Activity className="w-6 h-6 text-blue-400/60" />
        </FloatingBubble>
        <FloatingBubble className="w-24 h-24 bottom-[25%] right-[30%]" delay="2s">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-blue-600/70" fill="currentColor">
              <path d="M19 8h-2V6c0-1.1-.9-2-2-2h-6c-1.1 0-2 .9-2 2v2H5c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2zm-8 0V6h2v2h-2zm4 6h-2v2c0 .55-.45 1-1 1s-1-.45-1-1v-2H9c-.55 0-1-.45-1-1s.45-1 1-1h2v-2c0-.55.45-1 1-1s1 .45 1 1v2h2c.55 0 1 .45 1 1s-.45 1-1 1z"/>
            </svg>
          </div>
        </FloatingBubble>
        <FloatingBubble className="w-14 h-14 top-[70%] right-[50%]" delay="3s">
          <Stethoscope className="w-5 h-5 text-blue-400/50" />
        </FloatingBubble>

        {/* Content */}
        <div className="relative z-10 p-12 flex flex-col h-full justify-between">
          {/* Logo */}
          <div>
            <img src={logoImg} alt="MedCare Assist Logo" className="h-24 object-contain" />
          </div>

          {/* Tagline */}
          <div className="max-w-sm">
            <h2 className="text-[2.6rem] font-extrabold text-gray-800 leading-[1.15] mb-5 tracking-tight">
              Better Health,
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Better Tomorrow
              </span>
            </h2>
            <p className="text-gray-500 text-[15px] leading-relaxed">
              MediCare+ is your trusted healthcare platform, connecting you to a better and healthier life.
            </p>
          </div>

          {/* Security badge */}
          <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm border border-white/80 rounded-2xl px-5 py-3.5 shadow-sm max-w-xs">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-gray-800 text-sm font-bold">Your health data is</p>
              <p className="text-gray-500 text-xs">secure and protected</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ RIGHT FORM PANEL ═══════════ */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-white relative">
        {/* Close button */}
        <button onClick={() => navigate('/')} className="absolute top-6 right-6 w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-all z-10" title="Close">
          <X className="w-5 h-5" />
        </button>
        <div className="w-full max-w-[420px] animate-fadeIn">
          {/* Top navigation */}
          <div className="flex items-center justify-end mb-8">
            <p className="text-sm text-gray-500">
              Don't have an account?{' '}
              <Link to="/register" className="text-blue-600 font-bold hover:underline">Sign up</Link>
            </p>
          </div>

          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <img src={logoImg} alt="MedCare Assist Logo" className="h-16 object-contain" />
          </div>

          {/* Heading */}
          <h1 className="text-[28px] font-extrabold text-gray-900 mb-1.5 tracking-tight">Welcome Back</h1>
          <p className="text-gray-400 text-[15px] mb-8">Login to continue to your account</p>

          {/* Error alert */}
          {error && (
            <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-100 text-red-600 px-4 py-3.5 rounded-2xl text-sm animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-2">Email address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="email"
                  required
                  id="login-email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value.toLowerCase() })}
                  className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-sm transition-all bg-gray-50/50 focus:bg-white placeholder:text-gray-400"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[13px] font-semibold text-gray-700">Password</label>
                <Link to="/forgot-password" className="text-xs text-blue-600 hover:text-blue-700 font-semibold">Forgot password?</Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  id="login-password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full pl-12 pr-12 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-sm transition-all bg-gray-50/50 focus:bg-white placeholder:text-gray-400"
                  placeholder="Enter your password"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPw ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              id="login-submit"
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl font-bold text-[15px] hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 disabled:opacity-60 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full spin" />
              ) : (
                'Login'
              )}
            </button>
          </form>



          {/* Privacy note */}
          <div className="flex items-center justify-center gap-2 mt-8 text-gray-400">
            <CheckCircle className="w-3.5 h-3.5" />
            <p className="text-xs">We respect your privacy and keep your information safe and secure.</p>
          </div>


        </div>
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes floatBubble {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
