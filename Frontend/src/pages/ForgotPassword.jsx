import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { sharedApi } from '../services/sharedApi';
import { Mail, CheckCircle, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import logo from '../assets/logo.png';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');
  const [debugLink, setDebugLink] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    setMessage('');
    
    try {
      const data = await sharedApi.requestPasswordReset(email);
      if (data.status === 'success') {
        setStatus('success');
        setMessage(data.message);
        if (data.debug_link) {
            setDebugLink(data.debug_link); // Only for local testing without real SMTP
        }
      } else {
        setStatus('error');
        setMessage(data.message || 'Failed to request password reset.');
      }
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Network error. Please try again later.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <Link to="/" className="flex justify-center mb-8 transform transition hover:scale-105">
          <img src={logo} alt="MedcareAssist" className="h-16 w-auto" />
        </Link>
        <h2 className="text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          Forgot Password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your email address to receive a reset link.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/80 backdrop-blur-xl py-8 px-4 shadow-2xl shadow-blue-900/5 sm:rounded-2xl sm:px-10 border border-white">
          {status === 'success' ? (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Email Sent!</h3>
              <p className="mt-2 text-sm text-gray-500 mb-6">
                {message}
              </p>
              {debugLink && (
                  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-left">
                      <p className="text-xs text-yellow-800 font-bold mb-2">DEBUG: Since you have no SMTP yet, here is the link:</p>
                      <a href={debugLink} className="text-sm text-blue-600 underline break-all">{debugLink}</a>
                  </div>
              )}
              <Link to="/login" className="text-blue-600 hover:text-blue-500 font-medium text-sm flex items-center justify-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Login
              </Link>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {status === 'error' && (
                <div className="rounded-xl bg-red-50 p-4 border border-red-100 flex items-start gap-3 animate-fadeIn">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-700 font-medium">{message}</div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-50/50 focus:bg-white transition-colors"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={status === 'loading' || !email}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg"
                >
                  {status === 'loading' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </div>
              
              <div className="text-center mt-4">
                <Link to="/login" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
