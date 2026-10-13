import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Eye, EyeOff, Mail, Lock, AlertCircle, Shield, CheckCircle, ArrowLeft, Activity, Server
} from 'lucide-react';

import logoImg from '../../assets/logo.png';

import { authApi } from '../../services/authApi';

function FloatingBubble({ children, className, delay = '0s' }) {
  return (
    <div
      className={`absolute rounded-full bg-white/40 backdrop-blur-sm border border-white/60 flex items-center justify-center shadow-sm select-none pointer-events-none ${className}`}
      style={{ animation: `floatBubble 6s ease-in-out ${delay} infinite` }}
    >
      {children}
    </div>
  );
}

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await authApi.login(form.email, form.password);
      if (data.status === 'success') {
        if (data.user.role === 'superadmin') {
          login({ ...data.user, full_name: data.user.name, user_id: data.user.id });
          navigate('/superadmin/dashboard');
        } else if (data.user.role === 'admin') {
          login({ ...data.user, full_name: data.user.name, user_id: data.user.id });
          navigate('/admin/dashboard');
        } else {
          setError('Admin credentials required. Access denied.');
        }
      } else {
        setError(data.message || 'Invalid credentials.');
      }
    } catch (err) {
      setError(err.message || 'Unable to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center font-['Inter'] bg-gradient-to-br from-[#d6eaf8] via-[#dceefb] to-[#e8f4fd] relative overflow-hidden p-4 sm:p-6">

      {/*Background decorations*/}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, #1a56db 1px, transparent 1px)', backgroundSize: '30px 30px' }}
      />

      {/*DNA helix decorative element - left side*/}
      <div className="absolute top-0 bottom-0 left-[5%] w-[150px] hidden md:flex items-center justify-center opacity-20 pointer-events-none">
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

      {/*DNA helix decorative element - right side*/}
      <div className="absolute top-0 bottom-0 right-[5%] w-[150px] hidden md:flex items-center justify-center opacity-20 pointer-events-none">
        <svg viewBox="0 0 200 600" className="h-full" fill="none">
          {[...Array(20)].map((_, i) => {
            const y = i * 30;
            const x1 = 140 - Math.sin(i * 0.6) * 40;
            const x2 = 60 + Math.sin(i * 0.6) * 40;
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

      {/*Floating bubbles*/}
      <FloatingBubble className="w-20 h-20 top-[12%] left-[12%] hidden md:flex" delay="0s">
        <Shield className="w-8 h-8 text-blue-600/70" />
      </FloatingBubble>
      <FloatingBubble className="w-16 h-16 top-[55%] left-[8%] hidden lg:flex" delay="1.5s">
        <Server className="w-6 h-6 text-indigo-600/60" />
      </FloatingBubble>
      <FloatingBubble className="w-24 h-24 bottom-[15%] left-[15%] hidden md:flex" delay="3s">
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <Activity className="w-7 h-7 text-blue-600/70" />
        </div>
      </FloatingBubble>

      <FloatingBubble className="w-16 h-16 top-[18%] right-[10%] hidden md:flex" delay="0.8s">
        <Lock className="w-6 h-6 text-blue-600/60" />
      </FloatingBubble>
      <FloatingBubble className="w-24 h-24 top-[45%] right-[12%] hidden lg:flex" delay="2.2s">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
          <Shield className="w-7 h-7 text-indigo-600/70" />
        </div>
      </FloatingBubble>
      <FloatingBubble className="w-20 h-20 bottom-[18%] right-[14%] hidden md:flex" delay="1.2s">
        <Server className="w-8 h-8 text-blue-600/70" />
      </FloatingBubble>

      {/*Back button*/}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 flex items-center gap-2 text-gray-400 hover:text-gray-700 text-sm font-semibold transition-colors z-20"
        title="Back to Home"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Home</span>
      </button>

      {/*Centered login card*/}
      <div className="w-full max-w-[460px] bg-white rounded-3xl shadow-xl shadow-blue-900/5 border border-white/60 p-8 sm:p-10 relative z-10 animate-fadeIn my-auto">

        {/*Balanced logo margins*/}
        <div className="-mt-4 -mb-4 flex justify-center">
          <img src={logoImg} alt="MedCare Assist Logo" className="h-32 w-auto object-contain" />
        </div>

        {/*Heading section*/}
        <div className="text-center mb-8">
          <span className="inline-block text-blue-700 text-[11px] font-bold uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full mb-3">
            System Administration
          </span>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-1">Admin Portal</h1>
          <p className="text-gray-400 text-sm">Restricted area — Authorized credentials required</p>
        </div>

        {/*Error notification*/}
        {error && (
          <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-100 text-red-600 px-4 py-3.5 rounded-2xl text-sm animate-fadeIn">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/*Input form*/}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/*Email field*/}
          <div>
            <label className="block text-[13px] font-semibold text-gray-700 mb-2">Admin Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-sm transition-all bg-gray-50/50 focus:bg-white placeholder:text-gray-400"
                placeholder="admin@medcare.com"
              />
            </div>
          </div>

          {/*Password field*/}
          <div>
            <label className="block text-[13px] font-semibold text-gray-700 mb-2">Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type={showPw ? 'text' : 'password'}
                required
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

          {/*Secure login button*/}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-[15px] hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 disabled:opacity-60 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Secure Login'
            )}
          </button>
        </form>

        {/*Regulatory footer note*/}
        <div className="flex items-center justify-center gap-2 mt-6 border-t border-gray-100 pt-5 text-gray-400">
          <CheckCircle className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
          <p className="text-[11px] text-center leading-snug">All access attempts are logged and monitored for compliance.</p>
        </div>
      </div>

      <style>{`
        @keyframes floatBubble {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(3deg); }
        }
      `}</style>
    </div>
  );
}