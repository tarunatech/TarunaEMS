import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Building2,
  LayoutDashboard,
  User,
  Calendar,
  Clock,
  FileText,
  Bell,
  LogOut,
  ChevronDown,
  Menu,
  X,
  CreditCard,
  Phone,
  MapPin,
  AlertCircle,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Users,
  WalletCards,
  Moon,
  Sun,
} from "lucide-react";
import toast from "react-hot-toast";
import { allowedKeysForDepartment, normalizeDepartment } from '../../../utils/departmentAccess';
import logo from "../../../assets/logo.jpg";
import EmployeeHrBot from "./EmployeeHrBot";
import { useTheme } from "../../../hooks/useTheme";

const getStoredDepartment = () => {
  const stored = localStorage.getItem('userDepartment') ||
    sessionStorage.getItem('userDepartment') ||
    '';

  // Filter out ObjectIds (24 character hex strings) - we only want actual department names
  if (stored && stored.match(/^[a-f0-9]{24}$/i)) {
    console.warn('Sidebar: Ignoring ObjectId stored as department:', stored);
    return '';
  }

  return stored;
};

const getStoredEmployeeData = () => {
  const storedDepartment = localStorage.getItem('userDepartment');
  const storedName = localStorage.getItem('userName');
  const storedEmail = localStorage.getItem('userEmail');
  const storedEmployeeId = localStorage.getItem('employeeId');
  const storedImage = localStorage.getItem('userImage');

  return {
    personalInfo: {
      firstName: storedName?.split(' ')[0] || 'Unknown',
      lastName: storedName?.split(' ')[1] || 'User',
    },
    workInfo: {
      position: 'Employee',
      department: storedDepartment || 'N/A',
    },
    employeeId: storedEmployeeId || 'N/A',
    contactInfo: {
      personalEmail: storedEmail || 'user@company.com',
    },
    user: {
      profileImage: storedImage || null
    }
  };
};

const EmployeeLayout = ({ children, onOpenTeamChat, onOpenGroupChats }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });
  const [profileDropdown, setProfileDropdown] = useState(false);
  const [notificationDropdown, setNotificationDropdown] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  const handleToggleCollapse = () => {
    setIsCollapsed(prev => {
      const newVal = !prev;
      localStorage.setItem('sidebar-collapsed', String(newVal));
      return newVal;
    });
  };

  const [department, setDepartment] = useState(() => getStoredDepartment());
  const [employeeData, setEmployeeData] = useState(() => getStoredEmployeeData());

  useEffect(() => {
    const dept = getStoredDepartment();
    if (dept && dept !== department) {
      setDepartment(dept);
    }
    const empData = getStoredEmployeeData();
    setEmployeeData(empData);
  }, []);

  const [notifications, setNotifications] = useState([
    {
      id: 1,
      message: "Welcome to the company!",
      time: "1 hour ago",
      unread: true,
    },
    {
      id: 2,
      message: "Please complete your profile",
      time: "2 hours ago",
      unread: true,
    },
    {
      id: 3,
      message: "Team meeting scheduled for tomorrow",
      time: "1 day ago",
      unread: false,
    },
  ]);

  const location = useLocation();
  const navigate = useNavigate();
  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationDropdown(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Navigation catalog keyed for reuse in department-based filtering
  const NAV_CATALOG = {
    dashboard: { name: "Dashboard", icon: LayoutDashboard, path: "/employee/dashboard" },
    attendance: { name: "Attendance", icon: Clock, path: "/employee/attendance" },
    expenses: { name: "Expenses", icon: WalletCards, path: "/employee/expenses" },
    leaves: { name: "Leave Requests", icon: Calendar, path: "/employee/leaves" },
    holidays: { name: "Holiday Calendar", icon: Calendar, path: "/employee/holidays" },
    tasks: { name: "Tasks", icon: FileText, path: "/employee/tasks" },
    problems: { name: "Problem Statement", icon: AlertCircle, path: "/employee/problems" },
    sales: { name: "Sales", icon: TrendingUp, path: "/employee/sales" },
  };

  // Use local state for employee data
  const emp = employeeData;

  // Build sidebar items from stored department - read directly from localStorage for reliability
  const currentDept = getStoredDepartment();
  const normalizedDept = normalizeDepartment(currentDept);
  console.log('Sidebar Debug - Raw department:', currentDept, 'Normalized:', normalizedDept);
  const allowedKeys = allowedKeysForDepartment(normalizedDept);
  console.log('Sidebar Debug - Allowed keys:', allowedKeys);
  const sidebarItems = allowedKeys.map((key) => NAV_CATALOG[key]).filter(Boolean);

  const getFullImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    return baseUrl.replace('/api', '') + path;
  };

  const handleLogout = () => {
    const authKeys = [
      'token', 'userRole', 'userEmail', 'userName', 'userId', 'employeeId', 'userDepartment', 'departmentId', 'userImage'
    ];

    authKeys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    toast.success('Logged out successfully');
    navigate('/login');
  };

  const handleOpenTeamChat = () => {
    setSidebarOpen(false);

    if (typeof onOpenTeamChat === 'function') {
      onOpenTeamChat();
      return;
    }

    navigate('/employee/dashboard?openChat=team');
  };

  const handleOpenGroupChats = () => {
    setSidebarOpen(false);

    if (typeof onOpenGroupChats === 'function') {
      onOpenGroupChats();
      return;
    }

    navigate('/employee/dashboard?openChat=group');
  };

  const markAsRead = (notificationId) => {
    setNotifications(notifications.map(n =>
      n.id === notificationId ? { ...n, unread: false } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
    toast.success('All notifications marked as read');
  };

  const unreadNotifications = notifications.filter((n) => n.unread).length;

  return (
    <div className="min-h-screen flex bg-white relative">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform ${
          isCollapsed ? "w-20" : "w-64"
        } ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-all duration-300 ease-in-out lg:translate-x-0`}
      >
        <div className="relative h-full bg-[#0a0e1a] border-r border-white/5 flex flex-col justify-between overflow-hidden">
          {/* Ambient premium glow — purely decorative */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -left-16 w-56 h-56 bg-blue-600/20 rounded-full blur-3xl" />
            <div className="absolute top-1/2 -right-20 w-56 h-56 bg-indigo-600/15 rounded-full blur-3xl" />
            <div className="absolute bottom-0 -left-10 w-48 h-48 bg-violet-600/10 rounded-full blur-3xl" />
          </div>
          {/* top accent line matching the hero gradient */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />

          <div className="relative flex-1 overflow-y-auto">
            {/* Logo */}
            <div className={`flex items-center h-16 border-b border-white/5 ${
              isCollapsed ? "justify-center px-2" : "justify-between px-6"
            }`}>
              <div className="flex items-center space-x-3">
                {/* Logo Container - Fixed aspect ratio */}
                <div className="relative w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 flex-shrink-0 shadow-lg shadow-indigo-500/30 ring-1 ring-white/10">
                  <img
                    src={logo}
                    alt="Taruna Technology Logo"
                    className="w- h- object-contain p-"
                  />
                </div>

                {/* Text Container */}
                {!isCollapsed && (
                  <div className="flex flex-col justify-center min-w-0">
                    <h1 className="text-base font-semibold text-white leading-tight tracking-tight">
                      Taruna Technology
                    </h1>
                    <p className="text-[10px] text-indigo-300/80 leading-tight mt-1 uppercase tracking-widest font-medium">
                      Employee Portal
                    </p>
                  </div>
                )}
              </div>

              {/* Close button for mobile */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-slate-500 hover:text-white transition-colors duration-200 flex-shrink-0"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="mt-3 px-4">
              <div className="space-y-1.5">
                {sidebarItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      title={isCollapsed ? item.name : undefined}
                      className={`group relative flex items-center rounded-xl transition-all duration-200 ${
                        isCollapsed ? "justify-center p-3" : "space-x-3 px-3 py-2.5"
                      } ${isActive
                        ? "bg-gradient-to-r from-blue-500/15 via-indigo-500/15 to-transparent text-indigo-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                        : "text-slate-400 hover:text-slate-100 hover:bg-white/5 hover:translate-x-0.5"
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-gradient-to-b from-blue-400 to-violet-400 shadow-[0_0_10px_rgba(99,102,241,0.7)]" />
                      )}
                      <item.icon
                        className={`w-5 h-5 flex-shrink-0 transition-colors duration-200 ${
                          isActive ? "text-indigo-300" : "text-slate-500 group-hover:text-slate-200"
                        }`}
                      />
                      {!isCollapsed && (
                        <span className={`font-medium truncate ${isActive ? "text-indigo-200" : ""}`}>
                          {item.name}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </nav>

            {/* Quick Actions */}
            <div className="mt-6 px-4">
              {!isCollapsed && (
                <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Quick Actions
                </p>
              )}
              <button
                type="button"
                onClick={handleOpenTeamChat}
                title={isCollapsed ? "Chat with Team" : undefined}
                aria-label="Open chat with team"
                className={`group relative flex w-full items-center rounded-xl transition-all duration-200 ${
                  isCollapsed ? "justify-center p-3" : "space-x-3 px-3 py-2.5"
                } text-slate-400 hover:text-slate-100 hover:bg-white/5 hover:translate-x-0.5`}
              >
                <MessageCircle className="w-5 h-5 flex-shrink-0 text-slate-500 transition-colors duration-200 group-hover:text-indigo-300" />
                {!isCollapsed && (
                  <span className="font-medium truncate">
                    Chat with Team
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={handleOpenGroupChats}
                title={isCollapsed ? "Group Chats" : undefined}
                aria-label="Open group chats"
                className={`group relative mt-1.5 flex w-full items-center rounded-xl transition-all duration-200 ${
                  isCollapsed ? "justify-center p-3" : "space-x-3 px-3 py-2.5"
                } text-slate-400 hover:text-slate-100 hover:bg-white/5 hover:translate-x-0.5`}
              >
                <Users className="w-5 h-5 flex-shrink-0 text-slate-500 transition-colors duration-200 group-hover:text-indigo-300" />
                {!isCollapsed && (
                  <span className="font-medium truncate">
                    Group Chats
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Toggle Collapse Button (Desktop Only) */}
          <div className="relative p-4 border-t border-white/5">
            <button
              type="button"
              onClick={toggleTheme}
              title={isDark ? "Switch to light theme" : "Switch to dark theme"}
              aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
              className={`mb-2 flex w-full items-center rounded-xl border border-white/5 bg-white/5 text-slate-300 transition-all duration-200 hover:bg-white/10 hover:text-white ${
                isCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5"
              }`}
            >
              <span className={`flex items-center ${isCollapsed ? "" : "space-x-3"}`}>
                {isDark ? <Sun className="h-5 w-5 text-amber-200" /> : <Moon className="h-5 w-5 text-indigo-200" />}
                {!isCollapsed && <span className="text-sm font-medium">{isDark ? "Light Theme" : "Dark Theme"}</span>}
              </span>
              {!isCollapsed && (
                <span className={`h-5 w-9 rounded-full p-0.5 transition-colors ${isDark ? "bg-indigo-500" : "bg-slate-600"}`}>
                  <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${isDark ? "translate-x-4" : "translate-x-0"}`} />
                </span>
              )}
            </button>
            <button
              onClick={handleToggleCollapse}
              className="hidden lg:flex w-full items-center justify-center p-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-indigo-200 transition-all duration-200 hover:bg-white/10 hover:border-indigo-500/20"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? "lg:ml-20" : "lg:ml-64"}`}>
        {/* Header */}
        <header className="bg-white/90 backdrop-blur-sm border-b border-slate-200 h-16 z-40 sticky top-0">
          <div className="flex items-center justify-between h-full px-6">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-500 hover:text-slate-900 transition-colors duration-200"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Page Title */}
            <div className="hidden lg:block">
              <h2 className="text-xl font-semibold text-slate-900">
                {sidebarItems.find((item) => item.path === location.pathname)
                  ?.name || "Dashboard"}
              </h2>
            </div>

            {/* Right Section */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative" ref={notificationRef}>
                <button
                  onClick={() => setNotificationDropdown(!notificationDropdown)}
                  className="relative p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                >
                  <Bell className="w-6 h-6" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full text-xs text-white flex items-center justify-center animate-pulse shadow-sm">
                      {unreadNotifications}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {notificationDropdown && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg border border-slate-200 shadow-xl z-50 max-h-96 overflow-hidden animate-dropdown-in">
                    <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                      {unreadNotifications > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-blue-600 hover:text-indigo-600 transition-colors duration-200"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            onClick={() => markAsRead(notification.id)}
                            className={`p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors duration-200 ${notification.unread ? 'bg-blue-50/60' : ''
                              }`}
                          >
                            <div className="flex items-start space-x-3">
                              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${notification.unread ? 'bg-blue-600' : 'bg-slate-300'
                                }`} />
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm ${notification.unread ? 'text-slate-900 font-medium' : 'text-slate-600'
                                  }`}>
                                  {notification.message}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                  {notification.time}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center">
                          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-400 text-sm">No notifications</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Dropdown */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileDropdown(!profileDropdown)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-50 transition-colors duration-200"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center overflow-hidden shadow-sm">
                    {emp.user?.profileImage ? (
                      <img
                        src={getFullImageUrl(emp.user.profileImage)}
                        alt="User"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-slate-900">
                      {emp.personalInfo?.firstName} {emp.personalInfo?.lastName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {emp.contactInfo?.personalEmail || emp.user?.email}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {profileDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg border border-slate-200 shadow-xl z-50 animate-dropdown-in">
                    <div className="p-4 border-b border-slate-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center overflow-hidden shadow-sm">
                          {emp.user?.profileImage ? (
                            <img
                              src={getFullImageUrl(emp.user.profileImage)}
                              alt="User"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-6 h-6 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {emp.personalInfo?.firstName}{" "}
                            {emp.personalInfo?.lastName}
                          </p>
                          <p className="text-xs text-blue-600 font-medium">
                            {emp.workInfo?.position}
                          </p>
                          <p className="text-xs text-slate-500">
                            {emp.employeeId}
                          </p>{" "}
                          {/* ✅ REAL ID */}
                        </div>
                      </div>
                    </div>

                    <div className="py-2">
                      <Link
                        to="/employee/profile"
                        className="flex items-center px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors duration-200"
                        onClick={() => setProfileDropdown(false)}
                      >
                        <User className="w-4 h-4 mr-3" />
                        Profile Information
                      </Link>
                      <Link
                        to="/employee/attendance"
                        className="flex items-center px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors duration-200"
                        onClick={() => setProfileDropdown(false)}
                      >
                        <Clock className="w-4 h-4 mr-3" />
                        My Attendance
                      </Link>
                      <hr className="my-2 border-slate-200" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors duration-200"
                      >
                        <LogOut className="w-4 h-4 mr-3" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6 relative z-10 bg-slate-50">{children}</main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm lg:hidden transition-opacity duration-200"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Dropdown entrance animation — purely presentational */}
      <EmployeeHrBot />

      <style>{`
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-dropdown-in {
          animation: dropdownIn 0.15s ease-out both;
        }
      `}</style>
    </div>
  );
};

export default EmployeeLayout;
