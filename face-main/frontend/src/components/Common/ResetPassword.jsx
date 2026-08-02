import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, Building2, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';

// Simulated API functions
const verifyResetToken = async (token) => {
  const response = await fetch(`/api/auth/verify-reset-token/${token}`);
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Invalid or expired token');
  }
  
  return response.json();
};

const resetPassword = async (token, password, confirmPassword) => {
  const response = await fetch(`/api/auth/reset-password/${token}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ password, confirmPassword })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to reset password');
  }
  
  return response.json();
};

const ResetPassword = () => {
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  // Get token from URL - in real app, use useParams from react-router
  const token = 'demo-token'; // Replace with actual token from URL

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const response = await verifyResetToken(token);
        if (response.success) {
          setTokenValid(true);
          setUserEmail(response.email);
        }
      } catch (error) {
        setError(error.message);
        setTokenValid(false);
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user types
  };

  const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const errors = [];
    if (password.length < minLength) errors.push(`At least ${minLength} characters`);
    if (!hasUpperCase) errors.push('One uppercase letter');
    if (!hasLowerCase) errors.push('One lowercase letter');
    if (!hasNumbers) errors.push('One number');
    if (!hasSpecialChar) errors.push('One special character');

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { password, confirmPassword } = formData;

      // Validation
      if (!password || !confirmPassword) {
        throw new Error('Please fill in all fields');
      }

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      const passwordErrors = validatePassword(password);
      if (passwordErrors.length > 0) {
        throw new Error(`Password must contain: ${passwordErrors.join(', ')}`);
      }

      const response = await resetPassword(token, password, confirmPassword);
      
      if (response.success) {
        setSuccess(true);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Loading state while verifying token
  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-secondary-900 via-secondary-800 to-secondary-900">
        <div className="glass-morphism neon-border p-8 rounded-2xl text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-pink mx-auto mb-4"></div>
          <p className="text-white">Verifying reset token...</p>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-secondary-900 via-secondary-800 to-secondary-900">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 -left-10 w-72 h-72 bg-neon-pink opacity-10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-neon-purple opacity-10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="w-full max-w-md relative">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-neon-pink to-neon-purple rounded-2xl mb-4 animate-glow">
              <Building2 className="w-8 h-8 text-white" />
            </div>
          </div>

          <div className="glass-morphism neon-border p-8 rounded-2xl text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Invalid Reset Link</h2>
            <p className="text-secondary-400 mb-6">
              This password reset link is invalid or has expired. Reset links are valid for 10 minutes only.
            </p>
            <div className="space-y-4">
              <button
                onClick={() => window.location.href = '/forgot-password'}
                className="w-full py-3 px-4 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-semibold rounded-lg hover-glow transition-all duration-300"
              >
                Request New Reset Link
              </button>
              <button
                onClick={() => window.location.href = '/login'}
                className="inline-flex items-center text-secondary-400 hover:text-white transition-colors duration-300 bg-transparent border-none cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-secondary-900 via-secondary-800 to-secondary-900">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 -left-10 w-72 h-72 bg-neon-pink opacity-10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-neon-purple opacity-10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="w-full max-w-md relative">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-neon-pink to-neon-purple rounded-2xl mb-4 animate-glow">
              <Building2 className="w-8 h-8 text-white" />
            </div>
          </div>

          <div className="glass-morphism neon-border p-8 rounded-2xl text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Password Reset Successful!</h2>
            <p className="text-secondary-400 mb-6">
              Your password has been successfully updated. You can now login with your new password.
            </p>
            <button
              onClick={() => window.location.href = '/login'}
              className="w-full py-3 px-4 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-semibold rounded-lg hover-glow transition-all duration-300 mb-4"
            >
              Continue to Login
            </button>
            <p className="text-xs text-secondary-500">
              A confirmation email has been sent to your registered email address.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Password reset form
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
            <h2 className="text-2xl font-bold text-white mb-2">Create New Password</h2>
            <p className="text-secondary-400 mb-2">
              Enter a new password for your account
            </p>
            {userEmail && (
              <p className="text-neon-pink text-sm font-medium">
                {userEmail}
              </p>
            )}
          </div>

          <div onSubmit={handleSubmit} className="space-y-6">
            {/* New Password */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-secondary-300">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-12 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white placeholder-secondary-500 focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 transition-all duration-300"
                  placeholder="Enter new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-secondary-300">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full pl-10 pr-12 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white placeholder-secondary-500 focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 transition-all duration-300"
                  placeholder="Confirm new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-400 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="bg-secondary-800/30 rounded-lg p-4 border border-secondary-600">
              <h3 className="text-sm font-medium text-secondary-300 mb-2">Password Requirements:</h3>
              <ul className="text-xs text-secondary-400 space-y-1">
                <li>• At least 8 characters long</li>
                <li>• Contains uppercase and lowercase letters</li>
                <li>• Contains at least one number</li>
                <li>• Contains at least one special character</li>
              </ul>
            </div>

            {error && (
              <div className="flex items-start space-x-3 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-semibold rounded-lg hover-glow transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="loading-dots">Updating Password</span>
              ) : (
                'Update Password'
              )}
            </button>
          </div>

          <div className="text-center mt-6">
            <button
              onClick={() => window.location.href = '/login'}
              className="inline-flex items-center text-secondary-400 hover:text-white transition-colors duration-300 bg-transparent border-none cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;