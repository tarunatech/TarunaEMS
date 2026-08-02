// components/ForgotPassword.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Building2, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

// Create axios instance
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

  // Countdown timer for resend functionality
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
        setCountdown(60); // 60 seconds before allowing resend
        toast.success(response.data.message);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to send reset link. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      
      // If rate limited, show countdown
      if (error.response?.status === 429) {
        const retryAfter = error.response?.data?.retryAfter || 900; // 15 minutes default
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
        setCountdown(60); // Reset countdown
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

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-secondary-900 via-secondary-800 to-secondary-900">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 -left-10 w-72 h-72 bg-neon-pink opacity-10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-neon-purple opacity-10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="w-full max-w-md relative">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-neon-pink to-neon-purple rounded-2xl mb-4 animate-glow">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold neon-text mb-2">CompanyName</h1>
          </div>

          <div className="glass-morphism neon-border p-8 rounded-2xl text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Check Your Email</h2>
            <p className="text-secondary-400 mb-4">
              We've sent a password reset link to 
            </p>
            <p className="text-neon-pink font-medium mb-6 break-all">
              {email}
            </p>
            
            <div className="bg-secondary-800/30 rounded-lg p-4 mb-6 text-left">
              <h3 className="text-white font-medium mb-2 flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                What's next?
              </h3>
              <ul className="text-secondary-400 text-sm space-y-1">
                <li>• Check your email inbox (and spam folder)</li>
                <li>• Click the reset link in the email</li>
                <li>• Create your new password</li>
                <li>• <span className="text-yellow-400">The link expires in 10 minutes</span></li>
              </ul>
            </div>

            {error && (
              <div className="mb-4 flex items-start space-x-3 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-red-400 text-sm text-left">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={handleResendEmail}
                disabled={loading || countdown > 0}
                className="w-full py-2 px-4 bg-secondary-700/50 text-white font-medium rounded-lg hover:bg-secondary-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  'Sending...'
                ) : countdown > 0 ? (
                  `Resend in ${formatTime(countdown)}`
                ) : (
                  'Resend Email'
                )}
              </button>
              
              <Link
                to="/login"
                className="inline-flex items-center text-neon-pink hover:text-neon-purple transition-colors duration-300"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Link>
            </div>

            {/* Troubleshooting section */}
            <div className="mt-6 pt-6 border-t border-secondary-600">
              <h3 className="text-sm font-medium text-secondary-300 mb-2">Didn't receive the email?</h3>
              <ul className="text-xs text-secondary-400 space-y-1 text-left">
                <li>• Check your spam/junk folder</li>
                <li>• Make sure you entered the correct email</li>
                <li>• Wait a few minutes for email delivery</li>
                <li>• Contact support if problems persist</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-secondary-900 via-secondary-800 to-secondary-900">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-10 -left-10 w-72 h-72 bg-neon-pink opacity-10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-neon-purple opacity-10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="w-full max-w-md relative">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-neon-pink to-neon-purple rounded-2xl mb-4 animate-glow">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold neon-text mb-2">CompanyName</h1>
        </div>

        {/* Form */}
        <div className="glass-morphism neon-border p-8 rounded-2xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Forgot Password?</h2>
            <p className="text-secondary-400">Enter your email address and we'll send you a secure link to reset your password.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-secondary-300">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(''); // Clear error when user types
                  }}
                  className="w-full pl-10 pr-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white placeholder-secondary-500 focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 transition-all duration-300"
                  placeholder="Enter your registered email"
                  required
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-secondary-500">
                Enter the email address associated with your account
              </p>
            </div>

            {error && (
              <div className="flex items-start space-x-3 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-red-400 text-sm">{error}</p>
                  {countdown > 0 && (
                    <p className="text-red-300 text-xs mt-1">
                      Please wait {formatTime(countdown)} before trying again
                    </p>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || countdown > 0}
              className="w-full py-3 px-4 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-semibold rounded-lg hover-glow transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
            <Link
              to="/login"
              className="inline-flex items-center text-secondary-400 hover:text-white transition-colors duration-300"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Link>
          </div>

          {/* Security notice */}
          <div className="mt-6 p-4 bg-secondary-800/30 rounded-lg border border-secondary-600">
            <h3 className="text-sm font-medium text-secondary-300 mb-2">🔒 Security Notice</h3>
            <ul className="text-xs text-secondary-400 space-y-1">
              <li>• Reset links are valid for 10 minutes only</li>
              <li>• If you don't have an account, no email will be sent</li>
              <li>• Check your spam folder if you don't see the email</li>
              <li>• Contact support if you continue having issues</li>
            </ul>
          </div>

          {/* Demo info - Remove in production */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg">
              <p className="text-blue-400 text-xs">
                <strong>Development Mode:</strong> Check console for email preview links
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;