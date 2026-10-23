import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Droplets,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  Truck,
  User,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const ROLES = [
  {
    id: 'admin',
    name: 'Admin',
    subtitle: 'System Control',
    icon: ShieldCheck,
  },
  {
    id: 'staff',
    name: 'Staff',
    subtitle: 'Deliveries',
    icon: Truck,
  },
  {
    id: 'customer',
    name: 'Customer',
    subtitle: 'Water Orders',
    icon: User,
  },
];

const LoginPage = () => {
  const [selectedRole, setSelectedRole] = useState('admin');
  const [form, setForm] = useState({ email: '', password: '', remember: false });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const redirectByRole = useCallback((role) => {
    if (role === 'admin') navigate('/admin/dashboard', { replace: true });
    else if (role === 'staff') navigate('/staff/dashboard', { replace: true });
    else if (role === 'customer') navigate('/customer/dashboard', { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (user) {
      redirectByRole(user.role);
    }
  }, [user, redirectByRole]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const emailTrimmed = form.email.trim();
    if (!emailTrimmed || !form.password) {
      setError('Please provide both email address and password.');
      return;
    }

    setLoading(true);
    const result = await login(emailTrimmed, form.password, selectedRole);
    setLoading(false);

    if (result?.success) {
      redirectByRole(result.role);
    } else {
      setError(result?.error || 'Email or password is incorrect.');
    }
  };

  const activeRoleName = ROLES.find((r) => r.id === selectedRole)?.name || 'Admin';

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#F8FAFC] overflow-x-hidden">
      {/* Background Subtle Water Waves & Ripple Decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none" aria-hidden="true">
        {/* Soft Ambient Aqua and Ocean Glows */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-cyan-200/35 blur-3xl" />
        <div className="absolute -bottom-36 -right-20 w-[450px] h-[450px] rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-sky-100/40 blur-3xl" />

        {/* Concentric Subtle Water Ripple Rings centered behind card */}
        <svg
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] opacity-[0.45]"
          viewBox="0 0 900 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="450" cy="450" r="180" stroke="#0284C7" strokeWidth="1" strokeDasharray="3 4" opacity="0.18" />
          <circle cx="450" cy="450" r="280" stroke="#06B6D4" strokeWidth="1" opacity="0.12" />
          <circle cx="450" cy="450" r="380" stroke="#0284C7" strokeWidth="1.2" strokeDasharray="4 6" opacity="0.08" />
          <circle cx="450" cy="450" r="440" stroke="#075985" strokeWidth="1" opacity="0.05" />
        </svg>

        {/* Subtle Wave Graphic at Bottom */}
        <svg
          className="absolute bottom-0 left-0 right-0 w-full h-24 sm:h-36 opacity-30 text-sky-200/50"
          viewBox="0 0 1440 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="currentColor"
            d="M0,64L60,74.7C120,85,240,107,360,101.3C480,96,600,64,720,53.3C840,43,960,53,1080,69.3C1200,85,1320,107,1380,117.3L1440,128L1440,160L1380,160C1320,160,1200,160,1080,160C960,160,840,160,720,160C600,160,480,160,360,160C240,160,120,160,60,160L0,160Z"
          />
        </svg>
      </div>

      {/* Main Centered Login Card */}
      <div className="relative z-10 w-full max-w-[490px] my-auto">
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-[0_12px_45px_-10px_rgba(2,132,199,0.12),0_4px_16px_-2px_rgba(15,23,42,0.04)] p-6 sm:p-9 transition-all">
          
          {/* AquaTrack Branding & Header */}
          <div className="flex flex-col items-center text-center mb-6 sm:mb-7">
            {/* Water-drop Logo Badge */}
            <div className="relative mb-3 flex items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-cyan-400/25 blur-md transform scale-110" />
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#075985] via-[#0284C7] to-[#06B6D4] flex items-center justify-center shadow-md shadow-sky-600/25 text-white border border-white/20">
                <Droplets className="w-6 h-6 text-white" />
              </div>
            </div>

            {/* Brand Title & Tagline */}
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">
              AquaTrack
            </h2>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[#0284C7] bg-sky-50 border border-sky-200/70 px-2.5 py-0.5 rounded-full mt-1.5 inline-block">
              Smart Water Delivery
            </span>

            {/* Welcome Headings */}
            <div className="mt-4">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Welcome to AquaTrack
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                How do you want to continue?
              </p>
            </div>
          </div>

          {/* Role Selection Cards */}
          <div className="mb-6">
            <div className="grid grid-cols-3 gap-2.5">
              {ROLES.map((role) => {
                const isSelected = selectedRole === role.id;
                const Icon = role.icon;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => {
                      setSelectedRole(role.id);
                      setError('');
                    }}
                    className={`relative p-3 rounded-xl border text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7] ${
                      isSelected
                        ? 'border-[#0284C7] bg-sky-50/90 shadow-sm ring-1 ring-[#0284C7] -translate-y-0.5'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    {/* Role Selection Check Indicator */}
                    {isSelected && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#0284C7] text-white flex items-center justify-center shadow-xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}

                    {/* Icon */}
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center mb-1.5 transition-colors ${
                        isSelected
                          ? 'bg-[#0284C7] text-white shadow-xs shadow-sky-600/30'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-sky-50 group-hover:text-[#0284C7]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Role Title */}
                    <span
                      className={`text-xs font-semibold tracking-wide ${
                        isSelected ? 'text-[#075985]' : 'text-slate-800'
                      }`}
                    >
                      {role.name}
                    </span>

                    {/* Role Subtitle */}
                    <span
                      className={`text-[10px] leading-tight mt-0.5 font-medium truncate max-w-full ${
                        isSelected ? 'text-[#0284C7]' : 'text-slate-400'
                      }`}
                    >
                      {role.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200/80 text-red-700 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
              <p className="font-medium leading-snug">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder={
                    selectedRole === 'admin'
                      ? 'admin@aquatrack.com'
                      : selectedRole === 'staff'
                      ? 'staff@aquatrack.com'
                      : 'customer@aquatrack.com'
                  }
                  autoComplete="email"
                  required
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0284C7] focus:ring-4 focus:ring-sky-500/10 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setError('Password reset instructions will be sent to your registered email.')}
                  className="text-xs text-[#0284C7] hover:text-[#075985] font-medium hover:underline transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0284C7] focus:ring-4 focus:ring-sky-500/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-0.5"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Keep me signed in */}
            <div className="flex items-center pt-0.5 pb-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.remember}
                  onChange={(e) => setForm({ ...form, remember: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-[#0284C7] focus:ring-[#0284C7] accent-[#0284C7]"
                />
                <span className="text-xs text-slate-600 font-medium">Keep me signed in</span>
              </label>
            </div>

            {/* Primary Sign-in Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#075985] hover:from-[#0369a1] hover:to-[#0c4a6e] text-white text-sm font-semibold shadow-md shadow-sky-600/20 hover:shadow-lg hover:shadow-sky-600/30 active:scale-[0.99] transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Signing in as {activeRoleName}...</span>
                </>
              ) : (
                <>
                  <span>Sign In as {activeRoleName}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Registration Link */}
          <div className="mt-6 text-center border-t border-slate-100 pt-5">
            <p className="text-xs sm:text-sm text-slate-500">
              Don&apos;t have an account?{' '}
              <Link
                to="/register"
                className="text-[#0284C7] hover:text-[#075985] font-semibold hover:underline transition-colors ml-0.5"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>

        {/* Subtle Security & Trust Footer */}
        <div className="mt-4 text-center">
          <p className="text-[11px] text-slate-400 font-medium tracking-wide">
            Enterprise Grade &bull; 256-bit SSL Secure &bull; AquaTrack Platform
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

