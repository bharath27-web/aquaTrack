import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Droplets, Mail, Lock, User, Phone, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const RegisterPage = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const nameTrimmed = form.name.trim();
    const emailTrimmed = form.email.trim();
    const phoneTrimmed = form.phone.trim();

    if (!nameTrimmed || !emailTrimmed || !phoneTrimmed || !form.password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters in length.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Password and confirmation password do not match.');
      return;
    }

    setLoading(true);
    const result = await register({
      name: nameTrimmed,
      email: emailTrimmed,
      phone: phoneTrimmed,
      password: form.password,
    });
    setLoading(false);

    if (result?.success) {
      // Registration automatically logs the customer in and sets JWT
      navigate('/customer/dashboard', { replace: true });
    } else {
      setError(result?.error || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-[#F8FAFC]">
      {/* Left Panel - Brand Presentation */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] bg-gradient-to-br from-[#075985] via-[#0c4a6e] to-[#082f49] text-white p-14 relative overflow-hidden select-none">
        {/* Subtle Water & Glow Geometry */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#06B6D4]/15 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-36 right-0 w-[420px] h-[420px] bg-[#0284C7]/20 rounded-full blur-3xl"></div>

          <svg
            className="absolute bottom-0 left-0 right-0 w-full opacity-10"
            viewBox="0 0 1440 320"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="#FFFFFF"
              d="M0,192L48,197.3C96,203,192,213,288,192C384,171,480,117,576,112C672,107,768,149,864,170.7C960,192,1056,192,1152,176C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            ></path>
          </svg>
        </div>

        {/* Top Header Logo */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
              <Droplets className="w-6 h-6 text-[#CFFAFE]" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white block">AquaTrack</span>
              <span className="text-xs uppercase tracking-widest text-[#CFFAFE]/80 font-medium block">
                Smart Water Delivery
              </span>
            </div>
          </div>
        </div>

        {/* Center Content */}
        <div className="relative z-10 max-w-lg my-auto py-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-medium text-[#CFFAFE] mb-6">
            <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
            <span>Customer Portal Registration</span>
          </div>

          <h2 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-tight mb-4">
            Reliable pure water. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#67e8f9] to-[#38bdf8]">
              Delivered on schedule.
            </span> <br />
            Tracked in real time.
          </h2>

          <p className="text-slate-200/90 text-base leading-relaxed mb-8">
            Create your customer account in seconds to schedule refill orders, view real-time delivery GPS maps, track can returns, and manage billing effortlessly.
          </p>

          <div className="space-y-3.5">
            <div className="flex items-center gap-3 text-sm text-slate-200">
              <div className="w-5 h-5 rounded-full bg-[#06B6D4]/20 flex items-center justify-center text-[#67e8f9] shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <span>Automated recurring refill deliveries scheduled to your needs</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-200">
              <div className="w-5 h-5 rounded-full bg-[#06B6D4]/20 flex items-center justify-center text-[#67e8f9] shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <span>Real-time driver location and delivery ETA telemetry</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-200">
              <div className="w-5 h-5 rounded-full bg-[#06B6D4]/20 flex items-center justify-center text-[#67e8f9] shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <span>Digital delivery slips and transparent empty can accounting</span>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-300/80">
          <span>AquaTrack Customer Platform</span>
          <span>Encrypted Credentials &bull; Strict Privacy</span>
        </div>
      </div>

      {/* Right Panel - Registration Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-[440px]">
          {/* Mobile Top Brand */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#075985] flex items-center justify-center shadow-md">
              <Droplets className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-[#0F172A] block leading-tight">AquaTrack</span>
              <span className="text-xs text-[#64748B] block">Smart Water Delivery</span>
            </div>
          </div>

          <div className="mb-6">
            <div className="w-11 h-11 rounded-xl bg-[#CFFAFE]/60 border border-[#06B6D4]/20 hidden lg:flex items-center justify-center text-[#0284C7] mb-5 shadow-sm">
              <Droplets className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">
              Create an account
            </h1>
            <p className="text-sm text-[#64748B] mt-1.5">
              Start managing your water deliveries and refills
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50/90 border border-red-200/80 text-red-700 text-sm flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></div>
              <p className="font-medium text-xs sm:text-sm leading-snug">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. John Doe"
                  required
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0284C7]/20 focus:border-[#0284C7] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0284C7]/20 focus:border-[#0284C7] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="9876543210"
                  required
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0284C7]/20 focus:border-[#0284C7] transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Min. 8 chars"
                    required
                    className="w-full pl-10 pr-8 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0284C7]/20 focus:border-[#0284C7] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    placeholder="Repeat password"
                    required
                    className="w-full pl-10 pr-8 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0284C7]/20 focus:border-[#0284C7] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 pt-1">
              By creating an account, you agree to AquaTrack service terms and policies.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[#0284C7] hover:bg-[#0369a1] text-white text-sm font-semibold shadow-md shadow-[#0284C7]/20 hover:shadow-lg hover:shadow-[#0284C7]/30 active:scale-[0.99] transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-slate-200/80 pt-6">
            <p className="text-sm text-[#64748B]">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-[#0284C7] hover:text-[#075985] font-semibold hover:underline transition-colors"
              >
                Sign in instead
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
