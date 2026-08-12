// components/ForgotPassword.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, AlertCircle, CheckCircle, Clock, ShieldCheck, Users, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  React.useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await API.post('/auth/forgot-password', { email });

      if (response.data.success) {
        setSent(true);
        setCountdown(60);
        toast.success(response.data.message);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to send reset link. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);

      if (error.response?.status === 429) {
        const retryAfter = error.response?.data?.retryAfter || 900;
        setCountdown(retryAfter);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (countdown > 0) return;

    setLoading(true);
    setError('');

    try {
      const response = await API.post('/auth/forgot-password', { email });

      if (response.data.success) {
        setCountdown(60);
        toast.success('Reset link sent again!');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to resend link.';
      setError(errorMessage);
      toast.error(errorMessage);

      if (error.response?.status === 429) {
        const retryAfter = error.response?.data?.retryAfter || 900;
        setCountdown(retryAfter);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

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
            Secure access, <span className="text-blue-100">quick recovery</span>.
          </h1>
          <p className="text-blue-50/90 text-base leading-relaxed">
            Reset your password safely and get back to your Taruna Technology workspace without disrupting your day.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 mt-10">
          <FeatureCard icon={ShieldCheck} title="Secure reset" text="Time-limited links protect account access." />
          <FeatureCard icon={Users} title="Team portal" text="Admin and employee access in one place." />
          <FeatureCard icon={BarChart3} title="Work insight" text="Tasks, attendance and performance together." />
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

  if (sent) {
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
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Check your email</h2>
              <p className="text-gray-500 text-sm mb-3">We've sent a password reset link to</p>
              <p className="text-blue-600 font-semibold mb-6 break-all">{email}</p>

              <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left border border-gray-200">
                <h3 className="text-slate-900 font-semibold mb-2 flex items-center text-sm">
                  <Clock className="w-4 h-4 mr-2 text-blue-600" />
                  What's next?
                </h3>
                <ul className="text-gray-500 text-sm space-y-1">
                  <li>• Check your email inbox and spam folder</li>
                  <li>• Click the reset link in the email</li>
                  <li>• Create your new password</li>
                  <li>• <span className="text-amber-600">The link expires in 10 minutes</span></li>
                </ul>
              </div>

              {error && <ErrorMessage error={error} />}

              <div className="space-y-4">
                <button
                  onClick={handleResendEmail}
                  disabled={loading || countdown > 0}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/25"
                >
                  {loading ? 'Sending...' : countdown > 0 ? `Resend in ${formatTime(countdown)}` : 'Resend Email'}
                </button>
                <BackToLogin />
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Didn't receive the email?</h3>
                <ul className="text-xs text-gray-500 space-y-1 text-left">
                  <li>• Check your spam/junk folder</li>
                  <li>• Make sure you entered the correct email</li>
                  <li>• Wait a few minutes for email delivery</li>
                  <li>• Contact support if problems persist</li>
                </ul>
              </div>
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
            <h2 className="text-3xl font-bold text-slate-900 mb-1.5">Forgot password?</h2>
            <p className="text-gray-500 text-sm">Enter your email and we'll send a secure reset link.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-slate-900 placeholder-gray-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
                  placeholder="Enter your registered email"
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
              <p className="text-xs text-gray-400">Enter the email address associated with your account</p>
            </div>

            {error && (
              <ErrorMessage
                error={error}
                detail={countdown > 0 ? `Please wait ${formatTime(countdown)} before trying again` : ''}
              />
            )}

            <button
              type="submit"
              disabled={loading || countdown > 0}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/25"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending Reset Link
                </span>
              ) : countdown > 0 ? (
                `Wait ${formatTime(countdown)}`
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>

          <div className="text-center mt-6">
            <BackToLogin />
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Security Notice</h3>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• Reset links are valid for 10 minutes only</li>
              <li>• If you don't have an account, no email will be sent</li>
              <li>• Check your spam folder if you don't see the email</li>
              <li>• Contact support if you continue having issues</li>
            </ul>
          </div>

          {import.meta.env.DEV && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-blue-600 text-xs">
                <strong>Development Mode:</strong> Check console for email preview links
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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

const ErrorMessage = ({ error, detail = '' }) => (
  <div className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded-xl">
    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
    <div>
      <p className="text-red-600 text-sm">{error}</p>
      {detail && <p className="text-red-500 text-xs mt-1">{detail}</p>}
    </div>
  </div>
);

const BackToLogin = () => (
  <Link
    to="/login"
    className="inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors duration-200 font-medium text-sm"
  >
    <ArrowLeft className="w-4 h-4 mr-2" />
    Back to Login
  </Link>
);

export default ForgotPassword;
