import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  CheckCircle,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  Users
} from 'lucide-react';
import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

const FeatureCard = ({ icon: Icon, title, text }) => (
  <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/10 p-4 shadow-sm backdrop-blur-sm">
    <div className="shrink-0 w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center">
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div className="min-w-0">
      <p className="text-white text-sm font-semibold">{title}</p>
      <p className="text-blue-100/80 text-xs leading-relaxed mt-1">{text}</p>
    </div>
  </div>
);

const BrandPanel = () => (
  <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-900 to-blue-800">
    <div className="absolute -top-16 -right-10 w-80 h-80 bg-white/10 rounded-full" />
    <div className="absolute top-1/3 -right-24 w-64 h-64 bg-white/5 rounded-full" />
    <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-2xl" />

    <div className="relative z-10 flex h-full w-full flex-col p-10 xl:p-14">
      <div className="flex items-center gap-3.5">
        <img
          className="w-14 h-14 rounded-xl object-contain bg-white p-2 shadow-lg shadow-blue-900/20"
          src="/taruna_logo.png"
          alt="Taruna Technology logo"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <div>
          <span className="block text-white font-bold text-xl tracking-tight">Taruna Technology</span>
          <span className="block text-blue-100 text-sm">Employee Management System</span>
        </div>
      </div>

      <div className="max-w-md mt-12">
        <h1 className="text-4xl xl:text-[2.6rem] font-bold text-white leading-tight tracking-tight mb-5">
          Set a new password, <span className="text-blue-100">securely</span>.
        </h1>
        <p className="text-blue-50/90 text-base leading-relaxed">
          Create a fresh password for your Taruna Technology workspace and continue with protected access.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 mt-10">
        <FeatureCard icon={ShieldCheck} title="Protected link" text="Reset links are time-limited for safety." />
        <FeatureCard icon={Users} title="Team portal" text="Admin and employee access stays connected." />
        <FeatureCard icon={BarChart3} title="Work insight" text="Tasks, attendance and performance in one place." />
      </div>

      <p className="text-blue-100/70 text-xs mt-auto pt-10">
        © {new Date().getFullYear()} Taruna Technology. All rights reserved.
      </p>
    </div>
  </div>
);

const MobileBrand = () => (
  <div className="lg:hidden flex items-center gap-3 mb-10">
    <img
      className="w-14 h-14 rounded-lg object-contain bg-white p-2 shadow-md shadow-blue-500/20 ring-1 ring-gray-200"
      src="/taruna_logo.png"
      alt="Taruna Technology logo"
      onError={(e) => { e.target.style.display = 'none'; }}
    />
    <div>
      <span className="block text-slate-900 font-semibold text-lg tracking-tight">Taruna Technology</span>
      <span className="block text-gray-500 text-xs mt-0.5">IT solutions, built to grow with you</span>
    </div>
  </div>
);

const ErrorMessage = ({ error }) => (
  <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
    <p className="text-sm text-red-700 leading-relaxed">{error}</p>
  </div>
);

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError('');
  };

  const validatePassword = (password) => {
    const errors = [];
    if (password.length < 6) errors.push('at least 6 characters');
    if (!/[A-Z]/.test(password)) errors.push('one uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('one lowercase letter');
    if (!/\d/.test(password)) errors.push('one number');
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!token) {
        throw new Error('Reset link is missing. Please request a new password reset link.');
      }

      if (!formData.password || !formData.confirmPassword) {
        throw new Error('Please fill in both password fields.');
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match.');
      }

      const passwordErrors = validatePassword(formData.password);
      if (passwordErrors.length > 0) {
        throw new Error(`Password must contain ${passwordErrors.join(', ')}.`);
      }

      const response = await API.put(`/auth/reset-password/${token}`, {
        password: formData.password
      });

      if (response.data.success) {
        setSuccess(true);
        toast.success('Password reset successfully');
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to reset password. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="h-screen overflow-hidden flex bg-white">
        <BrandPanel />

        <div className="w-full lg:w-1/2 flex items-center justify-center overflow-hidden p-6 sm:p-10 bg-white">
          <div className="w-full max-w-sm">
            <MobileBrand />

            <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-xl shadow-blue-900/5 text-center">
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 ring-1 ring-green-100">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Password updated</h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                Your new password is ready. You can now sign in with your updated credentials.
              </p>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors duration-200 shadow-lg shadow-blue-600/25"
              >
                Continue to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden flex bg-white">
      <BrandPanel />

      <div className="w-full lg:w-1/2 flex items-center justify-center overflow-hidden p-6 sm:p-10 bg-white">
        <div className="w-full max-w-sm">
          <MobileBrand />

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-1.5">Create new password</h2>
            <p className="text-gray-500 text-sm">Choose a strong password to secure your account.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                New password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-12 pr-12 py-3.5 bg-white border border-gray-200 rounded-xl text-slate-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-slate-700 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 mb-2">
                Confirm password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full pl-12 pr-12 py-3.5 bg-white border border-gray-200 rounded-xl text-slate-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-slate-700 transition-colors"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3">
              <p className="text-sm font-semibold text-slate-800 mb-1">Password must include</p>
              <p className="text-xs text-gray-600 leading-relaxed">
                At least 6 characters with uppercase, lowercase and one number.
              </p>
            </div>

            {error && <ErrorMessage error={error} />}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-blue-600/25"
            >
              {loading ? 'Updating password...' : 'Update Password'}
            </button>
          </form>

          <div className="mt-7 text-center">
            <Link
              to="/login"
              className="inline-flex items-center justify-center text-sm font-semibold text-gray-500 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
