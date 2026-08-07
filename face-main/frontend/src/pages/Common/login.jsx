import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, ShieldCheck, Users, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { getDepartmentName } from '../../utils/departmentAccess';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const isEmployeeId = (value) => {
    return !value.includes('@') && /^[A-Z0-9_-]+$/i.test(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const loginData = {
        email: formData.email.trim(),
        password: formData.password
      };

      console.log('Login attempt:', {
        identifier: loginData.email,
        isEmployeeId: isEmployeeId(loginData.email),
        identifierType: isEmployeeId(loginData.email) ? 'Employee ID' : 'Email'
      });

      const response = await api.post('/auth/login', loginData);

      if (response.data.success) {
        const deptData = response.data.user.department;
        const departmentName = getDepartmentName(deptData);

        console.log('Department extraction debug:', { raw: deptData, extracted: departmentName });

        const userData = {
          token: response.data.token,
          userRole: response.data.user.role,
          userEmail: response.data.user.email,
          userName: response.data.user.name,
          userId: response.data.user.id,
          userDepartment: departmentName,
          departmentId: deptData?.id || deptData?._id || null
        };

        if (response.data.user.employeeId) {
          userData.employeeId = response.data.user.employeeId;
        }

        const authKeys = ['token', 'userRole', 'userEmail', 'userName', 'userId', 'userDepartment', 'departmentId', 'employeeId', 'userImage'];
        authKeys.forEach(key => {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        });

        const userDataToStore = {
          ...userData,
          userImage: response.data.user.profileImage
        };

        Object.keys(userDataToStore).forEach(key => {
          if (userDataToStore[key] !== null && userDataToStore[key] !== undefined) {
            sessionStorage.setItem(key, userDataToStore[key]);
            localStorage.setItem(key, userDataToStore[key]);
          }
        });

        console.log("User Department stored:", localStorage.getItem('userDepartment'));
        console.log("Token stored:", sessionStorage.getItem("token"));
        console.log("Token in sessionStorage:", sessionStorage.getItem("token"));
        console.log("Token in localStorage:", localStorage.getItem("token"));

        api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;

        const loginType = isEmployeeId(formData.email) ? 'Employee ID' : 'Email';
        toast.success(`Welcome back, ${response.data.user.name}! (${loginType} login)`);

        if (response.data.user.role === 'admin') {
          navigate('/admin/dashboard');
        } else if (response.data.user.role === 'employee') {
          const department = response.data.user.department?.name?.toLowerCase();

          if (department === 'sales' || department === 'sales department') {
            navigate('/employee/leads');
          } else {
            navigate('/employee/dashboard');
          }
        } else {
          toast.error('Unknown user role');
        }
      }
    } catch (error) {
      console.error('Login error:', error);

      if (error.response?.status === 401) {
        if (error.response.data.message.includes('locked')) {
          toast.error('Account temporarily locked due to too many failed attempts');
        } else if (error.response.data.message.includes('deactivated')) {
          toast.error('Account is deactivated. Please contact administrator.');
        } else {
          const loginType = isEmployeeId(formData.email) ? 'Employee ID' : 'Email';
          toast.error(error.response.data.message || `Invalid ${loginType.toLowerCase()} or password`);
        }
      } else if (error.response?.status === 400) {
        toast.error(error.response.data.message || 'Please check your input');
      } else if (error.response?.status >= 500) {
        toast.error('Server error. Please try again later.');
      } else {
        toast.error(error.response?.data?.message || 'Login failed. Please try again.');
      }
    }

    setLoading(false);
  };

  React.useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      sessionStorage.clear();
    }
  }, []);

  const getInputIcon = () => {
    if (!formData.email) return <Mail className="w-5 h-5 text-gray-400" />;
    return isEmployeeId(formData.email) ?
      <User className="w-5 h-5 text-gray-400" /> :
      <Mail className="w-5 h-5 text-gray-400" />;
  };

  const getInputPlaceholder = () => {
    if (!formData.email) return 'Enter your email or employee ID';
    return isEmployeeId(formData.email) ?
      'Enter your employee ID' :
      'Enter your email address';
  };

  return (
    <div className="h-screen overflow-hidden flex bg-white">
      {/* LEFT PANEL — company brand / context */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-900 to-blue-800">
        {/* Decorative soft circles, like the reference layout */}
        <div className="absolute -top-16 -right-10 w-80 h-80 bg-white/10 rounded-full" />
        <div className="absolute top-1/3 -right-24 w-64 h-64 bg-white/5 rounded-full" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-2xl" />

        <div className="relative z-10 flex h-full flex-col p-10 xl:p-14 w-full">
          {/* Logo + wordmark */}
          <div className="flex items-center gap-3.5">
            <img
              className="w-14 h-14 rounded-xl object-contain bg-white p-2 shadow-lg shadow-blue-900/20"
              src="/taruna_logo.png"
              alt="Taruna Technology logo"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div>
              <span className="block text-white font-bold text-xl tracking-tight">
                Taruna Technology
              </span>
              <span className="block text-blue-100 text-sm">
                Employee Management System
              </span>
            </div>
          </div>

          {/* Main message */}
          <div className="max-w-md mt-12">
            <h1 className="text-4xl xl:text-[2.6rem] font-bold text-white leading-tight tracking-tight mb-5">
              Run your <span className="text-blue-100">workforce</span> with clarity.
            </h1>
            <p className="text-blue-50/90 text-base leading-relaxed">
              Taruna Technology delivers comprehensive IT solutions built to accelerate
              business growth and operational efficiency. This portal brings attendance,
              leave, tasks and performance together in one reliable place for our team.
            </p>
          </div>

          {/* Feature list, card-style like the reference */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 mt-10">
            <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/10 p-4 shadow-sm backdrop-blur-sm">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold">Secure access</p>
                <p className="text-blue-100/80 text-xs leading-relaxed mt-1">Role-protected sign-in for every account.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/10 p-4 shadow-sm backdrop-blur-sm">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold">Role-based tools</p>
                <p className="text-blue-100/80 text-xs leading-relaxed mt-1">Admin and employee views built for each role.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/10 p-4 shadow-sm backdrop-blur-sm">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold">Real-time insight</p>
                <p className="text-blue-100/80 text-xs leading-relaxed mt-1">Live attendance, tasks and reporting at a glance.</p>
              </div>
            </div>
          </div>

          <p className="text-blue-100/70 text-xs mt-auto pt-10">
            © {new Date().getFullYear()} Taruna Technology. All rights reserved.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL — login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center overflow-hidden p-6 sm:p-10 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile-only compact brand header */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <img
              className="w-14 h-14 rounded-lg object-contain bg-white p-2 shadow-md shadow-blue-500/20 ring-1 ring-gray-200"
              src="/taruna_logo.png"
              alt="Taruna Technology logo"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div>
              <span className="block text-slate-900 font-semibold text-lg tracking-tight">
                Taruna Technology
              </span>
              <span className="block text-gray-500 text-xs mt-0.5">
                IT solutions, built to grow with you
              </span>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-1.5">Welcome back</h2>
            <p className="text-gray-500 text-sm">Sign in to access your dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email/Employee ID Field */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Email or Employee ID
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                  {getInputIcon()}
                </div>
                <input
                  type="text"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-slate-900 placeholder-gray-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
                  placeholder={getInputPlaceholder()}
                  required
                  disabled={loading}
                  autoComplete="username"
                />
              </div>
              {formData.email && (
                <p className="text-xs text-gray-400">
                  {isEmployeeId(formData.email) ?
                    'Logging in with Employee ID' :
                    'Logging in with Email Address'
                  }
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                {formData.email && isEmployeeId(formData.email) && (
                  <span className="text-xs text-blue-600">Use your Employee ID</span>
                )}
                {formData.email && !isEmployeeId(formData.email) && formData.email.includes('@') && (
                  <span className="text-xs text-blue-600">Employees: use Employee ID</span>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-slate-900 placeholder-gray-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
                  placeholder={
                    isEmployeeId(formData.email)
                      ? "Enter your Employee ID"
                      : formData.email.includes('@') && !formData.email.includes('admin')
                        ? "Enter your Employee ID as password"
                        : "Enter your password"
                  }
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-slate-700 transition-colors"
                  disabled={loading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700 transition-colors duration-200 font-medium"
              >
                Forgot your password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/25"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
