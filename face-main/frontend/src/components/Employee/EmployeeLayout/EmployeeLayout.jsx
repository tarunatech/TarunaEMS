import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Building2,
  LayoutDashboard,
  User,
  Calendar,
  Clock,
  FileText,
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
  GitBranch,
  ClipboardList,
  Loader2,
  Download,
} from "lucide-react";
import toast from "react-hot-toast";
import { allowedKeysForDepartment, getDepartmentName, normalizeDepartment } from '../../../utils/departmentAccess';
import { dashboardAPI, payslipAPI, getApiFileUrl } from '../../../utils/api';
import logo from "../../../assets/logo.jpg";
import EmployeeHrBot from "./EmployeeHrBot";
import { useTheme } from "../../../hooks/useTheme";
import NotificationBell from "../../Admin/Header/NotificationBell";

const getNotificationStorageKey = (suffix) => {
  const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId') || localStorage.getItem('employeeId') || 'employee';
  return `employee-notifications-${userId}-${suffix}`;
};

const readNotificationSet = (suffix) => {
  try {
    return new Set(JSON.parse(localStorage.getItem(getNotificationStorageKey(suffix)) || '[]'));
  } catch {
    return new Set();
  }
};

const writeNotificationSet = (suffix, values) => {
  localStorage.setItem(getNotificationStorageKey(suffix), JSON.stringify(Array.from(values)));
};

const getStoredDepartment = () => {
  const stored = getDepartmentName(
    localStorage.getItem('userDepartment'),
    sessionStorage.getItem('userDepartment')
  );

  return stored || '';
};

const getStoredEmployeeData = () => {
  const storedDepartment = getStoredDepartment();
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

const EmployeeLayout = ({ children, onOpenTeamChat, onOpenGroupChats, employeeData: liveEmployeeData }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });
  const [profileDropdown, setProfileDropdown] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [currentPayslip, setCurrentPayslip] = useState(null);
  const [payslipLoading, setPayslipLoading] = useState(false);

  const handleViewPayslip = async () => {
    try {
      setPayslipLoading(true);
      setShowPayslipModal(true);

      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const response = await payslipAPI.getPayslips({
        month: currentMonth,
        year: currentYear
      });

      const payslips = response.data?.data?.payslips || [];

      if (payslips.length > 0) {
        setCurrentPayslip(payslips[0]);
      } else {
        setCurrentPayslip(null);
        toast.info('No payslip generated for current month');
      }
    } catch (error) {
      console.error('Error fetching payslip:', error);
      toast.error('Failed to load payslip');
      setCurrentPayslip(null);
    } finally {
      setPayslipLoading(false);
    }
  };

  const handleDownloadPayslip = async () => {
    if (!currentPayslip?._id) {
      toast.error('No payslip available to download');
      return;
    }

    try {
      toast.loading('Preparing download...', { id: 'payslip-download' });
      const response = await payslipAPI.downloadPayslip(currentPayslip._id);

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Payslip_${currentPayslip.employeeId}_${currentPayslip.period.month}_${currentPayslip.period.year}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Payslip downloaded successfully!', { id: 'payslip-download' });
    } catch (error) {
      console.error('Error downloading payslip:', error);
      toast.error('Failed to download payslip. Please try again.', { id: 'payslip-download' });
    }
  };

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

  useEffect(() => {
    if (!liveEmployeeData) return;
    const profileImage = liveEmployeeData.profileImage || liveEmployeeData.user?.profileImage || localStorage.getItem('userImage');
    setEmployeeData(prev => ({
      ...prev,
      ...liveEmployeeData,
      user: {
        ...(prev.user || {}),
        ...(liveEmployeeData.user || {}),
        profileImage: profileImage || null
      }
    }));
  }, [liveEmployeeData]);

  useEffect(() => {
    const handleProfileImageUpdated = (event) => {
      const profileImage = event.detail?.profileImage || localStorage.getItem('userImage') || null;
      setEmployeeData(prev => ({
        ...prev,
        profileImage,
        user: {
          ...(prev.user || {}),
          profileImage
        }
      }));
    };

    window.addEventListener('profile-image-updated', handleProfileImageUpdated);
    return () => window.removeEventListener('profile-image-updated', handleProfileImageUpdated);
  }, []);

  const [notifications, setNotifications] = useState([]);

  const location = useLocation();
  const navigate = useNavigate();
  const profileRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await dashboardAPI.getUserNotifications();
      if (response.data.success) {
        const readIds = readNotificationSet('read');
        const dismissedIds = readNotificationSet('dismissed');
        const nextNotifications = (response.data.data || [])
          .map((notification, index) => {
            const id = String(notification.id || `notification-${index}`);
            return {
              id,
              message: notification.message,
              user: notification.user,
              time: notification.time,
              type: notification.type || 'info',
              category: notification.category || 'general',
              count: notification.count || 1,
              unread: readIds.has(id) ? false : (notification.unread ?? true)
            };
          })
          .filter(notification => !dismissedIds.has(notification.id) && !readIds.has(notification.id) && notification.unread !== false);

        setNotifications(nextNotifications);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Failed to load employee notifications:', error);
      setNotifications([]);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = window.setInterval(fetchNotifications, 45000);
    window.addEventListener('employee-notifications-refresh', fetchNotifications);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('employee-notifications-refresh', fetchNotifications);
    };
  }, []);

  // Subtle header elevation once the page content scrolls
  useEffect(() => {
    const main = document.getElementById('employee-main-scroll');
    if (!main) return;
    const onScroll = () => setScrolled(main.scrollTop > 4);
    main.addEventListener('scroll', onScroll);
    return () => main.removeEventListener('scroll', onScroll);
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
    salesPipeline: { name: "Sales Pipeline", icon: GitBranch, path: "/employee/sales-pipeline" },
    salesMeetings: { name: "Meetings", icon: Phone, path: "/employee/sales-meetings" },
    hrInterviews: { name: "Interview Schedule", icon: ClipboardList, path: "/employee/hr-interviews" },
    payslip: { name: "View Payslip", icon: CreditCard, isAction: true },
  };

  // Use local state for employee data
  const emp = employeeData;

  // Build sidebar items from stored department - read directly from localStorage for reliability
  const currentDept = getStoredDepartment();
  const normalizedDept = normalizeDepartment(currentDept);
  const allowedKeys = allowedKeysForDepartment(normalizedDept);
  const sidebarItems = allowedKeys.map((key) => NAV_CATALOG[key]).filter(Boolean);

  const getFullImageUrl = (path) => getApiFileUrl(path) || null;

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
    const id = String(notificationId);
    const readIds = readNotificationSet('read');
    readIds.add(id);
    writeNotificationSet('read', readIds);
    setNotifications(prev => prev.filter(n => n.id !== id));
    dashboardAPI.markNotificationAsRead(id).catch(() => {});
  };

  const markAllAsRead = () => {
    const readIds = readNotificationSet('read');
    notifications.forEach(notification => readIds.add(String(notification.id)));
    writeNotificationSet('read', readIds);
    setNotifications([]);
    dashboardAPI.markAllNotificationsAsRead().catch(() => {});
    toast.success('All notifications marked as read');
  };

  const dismissNotification = (notificationId) => {
    const id = String(notificationId);
    const dismissedIds = readNotificationSet('dismissed');
    dismissedIds.add(id);
    writeNotificationSet('dismissed', dismissedIds);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const unreadNotifications = notifications.filter((n) => n.unread).length;
  const initials = `${emp.personalInfo?.firstName?.[0] || ''}${emp.personalInfo?.lastName?.[0] || ''}`.toUpperCase();

  return (
    <div className="relative flex h-dvh min-h-dvh overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform ${
          isCollapsed ? "w-[76px]" : "w-[248px]"
        } ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-[width,transform] duration-200 ease-out lg:translate-x-0`}
      >
        <div className="relative h-full bg-[#0C0F17] flex flex-col justify-between overflow-hidden">
          {/* single, quiet accent — no glow blobs */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-white/[0.08] via-white/[0.04] to-transparent" />

          <div className="relative flex-1 overflow-y-auto scrollbar-none">
            {/* Logo */}
            <div className={`flex items-center h-16 ${
              isCollapsed ? "justify-center px-2" : "justify-between px-5"
            }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 flex-shrink-0 ring-1 ring-white/10">
                  <img
                    src={logo}
                    alt="Taruna Technology"
                    className="w- h- object-contain"
                  />
                </div>

                {!isCollapsed && (
                  <div className="flex flex-col justify-center min-w-0">
                    <h1 className="text-[13.5px] font-semibold text-white leading-tight tracking-tight truncate">
                      Taruna Technology
                    </h1>
                    <p className="text-[10px] text-slate-500 leading-tight mt-0.5 font-medium truncate">
                      Employee Portal
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-slate-500 hover:text-white transition-colors duration-150 flex-shrink-0"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="h-px bg-white/[0.06] mx-5 mb-3" />

            {/* Navigation */}
            <nav className={isCollapsed ? "px-3" : "px-3"}>
              <div className="space-y-0.5">
                {sidebarItems.map((item) => {
                  if (item.isAction) {
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => {
                          setSidebarOpen(false);
                          handleViewPayslip();
                        }}
                        title={isCollapsed ? item.name : undefined}
                        className={`group relative flex w-full items-center rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400/60 ${
                          isCollapsed ? "justify-center h-10 w-10 mx-auto" : "gap-2.5 px-2.5 h-9"
                        } text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]`}
                      >
                        <item.icon
                          strokeWidth={1.75}
                          className="w-[18px] h-[18px] flex-shrink-0 text-slate-500 group-hover:text-slate-300"
                        />
                        {!isCollapsed && (
                          <span className="text-[13.5px] font-medium truncate">
                            {item.name}
                          </span>
                        )}
                      </button>
                    );
                  }
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      title={isCollapsed ? item.name : undefined}
                      className={`group relative flex items-center rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400/60 ${
                        isCollapsed ? "justify-center h-10 w-10 mx-auto" : "gap-2.5 px-2.5 h-9"
                      } ${isActive
                        ? "bg-white/[0.08] text-white"
                        : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]"
                      }`}
                    >
                      {isActive && !isCollapsed && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2.5px] rounded-full bg-indigo-400" />
                      )}
                      <item.icon
                        strokeWidth={1.75}
                        className={`w-[18px] h-[18px] flex-shrink-0 ${
                          isActive ? "text-indigo-300" : "text-slate-500 group-hover:text-slate-300"
                        }`}
                      />
                      {!isCollapsed && (
                        <span className={`text-[13.5px] font-medium truncate ${isActive ? "text-white" : ""}`}>
                          {item.name}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </nav>

            {/* Quick Actions */}
            <div className="mt-5 px-3">
              {!isCollapsed && (
                <p className="px-2.5 mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-600">
                  Quick actions
                </p>
              )}
              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={handleOpenTeamChat}
                  title={isCollapsed ? "Chat with Team" : undefined}
                  aria-label="Open chat with team"
                  className={`group relative flex w-full items-center rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400/60 ${
                    isCollapsed ? "justify-center h-10 w-10 mx-auto" : "gap-2.5 px-2.5 h-9"
                  } text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]`}
                >
                  <MessageCircle strokeWidth={1.75} className="w-[18px] h-[18px] flex-shrink-0 text-slate-500 group-hover:text-slate-300" />
                  {!isCollapsed && (
                    <span className="text-[13.5px] font-medium truncate">Chat with Team</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleOpenGroupChats}
                  title={isCollapsed ? "Group Chats" : undefined}
                  aria-label="Open group chats"
                  className={`group relative flex w-full items-center rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400/60 ${
                    isCollapsed ? "justify-center h-10 w-10 mx-auto" : "gap-2.5 px-2.5 h-9"
                  } text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]`}
                >
                  <Users strokeWidth={1.75} className="w-[18px] h-[18px] flex-shrink-0 text-slate-500 group-hover:text-slate-300" />
                  {!isCollapsed && (
                    <span className="text-[13.5px] font-medium truncate">Group Chats</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Footer controls */}
          <div className="relative p-3 space-y-2">
            <div className="h-px bg-white/[0.06] mb-1" />
            <button
              type="button"
              onClick={toggleTheme}
              title={isDark ? "Switch to light theme" : "Switch to dark theme"}
              aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
              className={`flex w-full items-center rounded-lg text-slate-300 transition-colors duration-150 hover:bg-white/[0.05] ${
                isCollapsed ? "justify-center h-10 w-10 mx-auto" : "justify-between px-2.5 h-9"
              }`}
            >
              <span className={`flex items-center ${isCollapsed ? "" : "gap-2.5"}`}>
                {isDark ? <Sun strokeWidth={1.75} className="h-[18px] w-[18px] text-amber-300" /> : <Moon strokeWidth={1.75} className="h-[18px] w-[18px] text-indigo-300" />}
                {!isCollapsed && <span className="text-[13.5px] font-medium">{isDark ? "Light theme" : "Dark theme"}</span>}
              </span>
              {!isCollapsed && (
                <span className={`h-[18px] w-8 rounded-full p-0.5 transition-colors ${isDark ? "bg-indigo-500" : "bg-slate-700"}`}>
                  <span className={`block h-[14px] w-[14px] rounded-full bg-white transition-transform ${isDark ? "translate-x-[14px]" : "translate-x-0"}`} />
                </span>
              )}
            </button>
            <button
              onClick={handleToggleCollapse}
              className="hidden lg:flex w-full items-center justify-center h-9 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight strokeWidth={1.75} className="w-[18px] h-[18px]" /> : <ChevronLeft strokeWidth={1.75} className="w-[18px] h-[18px]" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`min-w-0 flex-1 flex flex-col transition-[margin] duration-200 ${isCollapsed ? "lg:ml-[76px]" : "lg:ml-[248px]"}`}>
        {/* Header */}
        <header className={`sticky top-0 z-40 h-14 shrink-0 border-b bg-white/95 backdrop-blur-sm transition-shadow duration-150 ${
          scrolled ? "border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)]" : "border-slate-100"
        }`}>
          <div className="flex items-center justify-between h-full gap-2 px-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-slate-500 hover:text-slate-900 transition-colors duration-150"
              >
                <Menu className="w-5 h-5" />
              </button>

              <h2 className="block truncate text-[14px] font-semibold text-slate-900 tracking-tight sm:text-[15px] lg:block">
                {sidebarItems.find((item) => item.path === location.pathname)?.name || "Dashboard"}
              </h2>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2">
              {/* Notifications */}
              <NotificationBell
                unreadCount={unreadNotifications}
                notifications={notifications}
                onNotificationRead={markAsRead}
                onMarkAllRead={markAllAsRead}
                onDismiss={dismissNotification}
                onRefresh={fetchNotifications}
              />

              <div className="w-px h-5 bg-slate-200 mx-1" />

              {/* Profile Dropdown */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileDropdown(!profileDropdown)}
                  className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-lg hover:bg-slate-200 transition-colors duration-150"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center overflow-hidden ring-1 ring-black/5">
                    {emp.user?.profileImage ? (
                      <img
                        src={getFullImageUrl(emp.user.profileImage)}
                        alt="User"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[11px] font-semibold text-white">{initials || <User className="w-4 h-4" />}</span>
                    )}
                  </div>
                  <div className="hidden md:block text-left leading-tight">
                    <p className="text-[13px] font-medium text-slate-900">
                      {emp.personalInfo?.firstName} {emp.personalInfo?.lastName}
                    </p>
                    <p className="text-[11.5px] text-slate-500">
                      {emp.contactInfo?.personalEmail || emp.user?.email}
                    </p>
                  </div>
                  <ChevronDown strokeWidth={1.75} className="w-4 h-4 text-slate-400" />
                </button>

                {profileDropdown && (
                  <div className="absolute right-0 mt-2 w-[calc(100vw-1.5rem)] max-w-64 bg-white rounded-xl border border-slate-200/80 shadow-xl shadow-slate-900/[0.08] z-50 animate-dropdown-in">
                    <div className="px-4 py-3.5 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center overflow-hidden ring-1 ring-black/5 flex-shrink-0">
                          {emp.user?.profileImage ? (
                            <img
                              src={getFullImageUrl(emp.user.profileImage)}
                              alt="User"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[12px] font-semibold text-white">{initials || <User className="w-5 h-5" />}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-slate-900 truncate">
                            {emp.personalInfo?.firstName} {emp.personalInfo?.lastName}
                          </p>
                          <p className="text-[11.5px] text-indigo-600 font-medium truncate">
                            {emp.workInfo?.position}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {emp.employeeId}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="py-1.5">
                      <Link
                        to="/employee/profile"
                        className="flex items-center px-4 py-2 text-[13px] text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors duration-150"
                        onClick={() => setProfileDropdown(false)}
                      >
                        <User strokeWidth={1.75} className="w-[15px] h-[15px] mr-2.5 text-slate-400" />
                        Profile information
                      </Link>
                      <Link
                        to="/employee/attendance"
                        className="flex items-center px-4 py-2 text-[13px] text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors duration-150"
                        onClick={() => setProfileDropdown(false)}
                      >
                        <Clock strokeWidth={1.75} className="w-[15px] h-[15px] mr-2.5 text-slate-400" />
                        My attendance
                      </Link>
                      <div className="h-px bg-slate-100 my-1.5" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-[13px] text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors duration-150"
                      >
                        <LogOut strokeWidth={1.75} className="w-[15px] h-[15px] mr-2.5" />
                        Log out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main id="employee-main-scroll" className="employee-main-scroll relative z-10 min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 px-3 py-4 sm:px-5 lg:px-6">
          <div className="mx-auto w-full max-w-[1600px] min-w-0">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm lg:hidden transition-opacity duration-200"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Payslip Modal */}
      {showPayslipModal && (
        <div className="fixed inset-0 z-[99999] flex items-start sm:items-center justify-center p-2.5 pt-12 pb-14 sm:p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[99998]" onClick={() => setShowPayslipModal(false)} />
          <div className="relative z-[99999] flex max-h-[calc(100dvh-100px)] sm:max-h-[85vh] w-full max-w-3xl lg:max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl animate-enter" style={{ animationDuration: '0.2s' }}>
            {/* Header */}
            <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/95 px-3.5 py-2.5 backdrop-blur sm:px-6 sm:py-3.5">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-2xs shrink-0">
                  <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={1.75} />
                </div>
                <div>
                  <h2 className="text-xs sm:text-[15px] font-bold text-slate-900 tracking-tight leading-none">
                    Salary Slip — {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </h2>
                  <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 mt-0.5">Official Monthly Compensation Breakdown</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {currentPayslip && (
                  <button
                    onClick={handleDownloadPayslip}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                )}
                <button onClick={() => setShowPayslipModal(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700 border border-transparent hover:border-slate-200 transition-all duration-150">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="task-details-modal-scroll min-h-0 flex-1 space-y-3 overflow-y-auto px-3.5 py-3 sm:space-y-4 sm:px-6 sm:py-4">
              {payslipLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
                </div>
              ) : !currentPayslip ? (
                <div className="text-center py-8">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <CreditCard className="w-5 h-5 text-slate-400" strokeWidth={1.5} />
                  </div>
                  <p className="text-slate-800 text-xs sm:text-[14px] font-semibold">No payslip generated for current month</p>
                  <p className="text-slate-400 text-[11px] sm:text-[12px] mt-0.5">Please contact HR for more information</p>
                </div>
              ) : (
                <>
                  {/* Top Row: Employee Info & Attendance Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
                    {/* Employee Info Card */}
                    <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-2.5 sm:p-3 space-y-1.5">
                      <h3 className="text-[11px] sm:text-[11.5px] font-bold uppercase tracking-wider text-slate-600 mb-1">Employee Details</h3>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400 font-medium block text-[10px] sm:text-[10.5px]">Employee Name</span>
                          <span className="text-slate-900 font-semibold truncate block">{currentPayslip.employeeName || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block text-[10px] sm:text-[10.5px]">Employee ID</span>
                          <span className="text-slate-900 font-semibold">{currentPayslip.employeeId || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block text-[10px] sm:text-[10.5px]">Pay Period</span>
                          <span className="text-slate-900 font-semibold">
                            {new Date(currentPayslip.period.year, currentPayslip.period.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block text-[10px] sm:text-[10.5px]">Status</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[10.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">
                            {currentPayslip.status || 'Generated'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Attendance Summary */}
                    {currentPayslip.attendance ? (
                      <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-2.5 sm:p-3">
                        <h3 className="text-[11px] sm:text-[11.5px] font-bold uppercase tracking-wider text-indigo-700 mb-1.5">Attendance Summary</h3>
                        <div className="grid grid-cols-4 gap-1 sm:gap-1.5 text-center">
                          <div className="bg-white p-1 sm:p-1.5 rounded-lg border border-indigo-100/80 shadow-2xs">
                            <span className="text-xs sm:text-[16px] font-bold text-slate-900 block leading-tight">{currentPayslip.attendance.workingDays || 0}</span>
                            <span className="text-[9px] sm:text-[10px] font-medium text-slate-500">Working</span>
                          </div>
                          <div className="bg-white p-1 sm:p-1.5 rounded-lg border border-emerald-100 shadow-2xs">
                            <span className="text-xs sm:text-[16px] font-bold text-emerald-600 block leading-tight">{currentPayslip.attendance.presentDays || 0}</span>
                            <span className="text-[9px] sm:text-[10px] font-medium text-slate-500">Present</span>
                          </div>
                          <div className="bg-white p-1 sm:p-1.5 rounded-lg border border-amber-100 shadow-2xs">
                            <span className="text-xs sm:text-[16px] font-bold text-amber-600 block leading-tight">{currentPayslip.attendance.leaveDays || 0}</span>
                            <span className="text-[9px] sm:text-[10px] font-medium text-slate-500">Leave</span>
                          </div>
                          <div className="bg-white p-1 sm:p-1.5 rounded-lg border border-rose-100 shadow-2xs">
                            <span className="text-xs sm:text-[16px] font-bold text-rose-600 block leading-tight">{currentPayslip.attendance.absentDays || 0}</span>
                            <span className="text-[9px] sm:text-[10px] font-medium text-slate-500">Absent</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3 flex items-center justify-center text-slate-400 text-xs">
                        No attendance data recorded
                      </div>
                    )}
                  </div>

                  {/* Middle Row: Earnings & Deductions Side-by-Side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
                    {/* Earnings Column */}
                    <div className="bg-emerald-50/40 border border-emerald-200/60 rounded-xl p-2.5 sm:p-3.5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1.5 border-b border-emerald-200/60 pb-1">
                          <h3 className="text-xs sm:text-[13px] font-bold text-emerald-800">Earnings</h3>
                          <span className="text-[10px] sm:text-[10.5px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">Allowances</span>
                        </div>
                        <div className="space-y-1 text-xs sm:text-[12px]">
                          <div className="flex justify-between">
                            <span className="text-slate-600">Basic Salary</span>
                            <span className="font-semibold text-slate-900">₹{(currentPayslip.earnings?.basicSalary || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">HRA</span>
                            <span className="font-semibold text-slate-900">₹{(currentPayslip.earnings?.hra || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Medical Allowance</span>
                            <span className="font-semibold text-slate-900">₹{(currentPayslip.earnings?.medical || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Transport Allowance</span>
                            <span className="font-semibold text-slate-900">₹{(currentPayslip.earnings?.transport || 0).toLocaleString()}</span>
                          </div>
                          {(currentPayslip.earnings?.bonus || 0) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-slate-600">Bonus</span>
                              <span className="font-semibold text-slate-900">₹{(currentPayslip.earnings?.bonus || 0).toLocaleString()}</span>
                            </div>
                          )}
                          {(currentPayslip.earnings?.overtime || 0) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-slate-600">Overtime</span>
                              <span className="font-semibold text-slate-900">₹{(currentPayslip.earnings?.overtime || 0).toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-slate-600">Other Allowances</span>
                            <span className="font-semibold text-slate-900">₹{(currentPayslip.earnings?.otherAllowances || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between border-t border-emerald-200/80 pt-1.5 mt-1.5 font-bold text-xs sm:text-[13px]">
                        <span className="text-emerald-800">Gross Earnings</span>
                        <span className="text-emerald-800">₹{(currentPayslip.grossEarnings || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Deductions Column */}
                    <div className="bg-rose-50/40 border border-rose-200/60 rounded-xl p-2.5 sm:p-3.5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1.5 border-b border-rose-200/60 pb-1">
                          <h3 className="text-xs sm:text-[13px] font-bold text-rose-800">Deductions</h3>
                          <span className="text-[10px] sm:text-[10.5px] font-semibold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-md">Taxes & PF</span>
                        </div>
                        <div className="space-y-1 text-xs sm:text-[12px]">
                          <div className="flex justify-between">
                            <span className="text-slate-600">Provident Fund (PF)</span>
                            <span className="font-semibold text-slate-900">₹{(currentPayslip.deductions?.pf || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">ESI</span>
                            <span className="font-semibold text-slate-900">₹{(currentPayslip.deductions?.esi || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Income Tax</span>
                            <span className="font-semibold text-slate-900">₹{(currentPayslip.deductions?.tax || 0).toLocaleString()}</span>
                          </div>
                          {(currentPayslip.deductions?.professionalTax || 0) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-slate-600">Professional Tax</span>
                              <span className="font-semibold text-slate-900">₹{(currentPayslip.deductions?.professionalTax || 0).toLocaleString()}</span>
                            </div>
                          )}
                          {(currentPayslip.deductions?.loanDeduction || 0) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-slate-600">Loan Deduction</span>
                              <span className="font-semibold text-slate-900">₹{(currentPayslip.deductions?.loanDeduction || 0).toLocaleString()}</span>
                            </div>
                          )}
                          {(currentPayslip.deductions?.lateDeduction || 0) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-rose-700 font-medium">Late Check-in (₹200/day)</span>
                              <span className="font-bold text-rose-700">₹{(currentPayslip.deductions?.lateDeduction || 0).toLocaleString()}</span>
                            </div>
                          )}
                          {(currentPayslip.deductions?.halfDayDeduction || 0) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-rose-700 font-medium">Half Day Deduction</span>
                              <span className="font-bold text-rose-700">₹{(currentPayslip.deductions?.halfDayDeduction || 0).toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-slate-600">Other Deductions</span>
                            <span className="font-semibold text-slate-900">₹{(currentPayslip.deductions?.otherDeductions || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between border-t border-rose-200/80 pt-1.5 mt-1.5 font-bold text-xs sm:text-[13px]">
                        <span className="text-rose-800">Total Deductions</span>
                        <span className="text-rose-800">₹{(currentPayslip.totalDeductions || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Net Salary Callout & Bank Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3 items-center">
                    <div className="md:col-span-2 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-3 sm:p-3.5 shadow-md flex items-center justify-between">
                      <div>
                        <p className="text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-widest text-indigo-300">Take-Home Pay</p>
                        <p className="text-xs sm:text-[12.5px] text-slate-300 font-medium mt-0.5">Net Salary Credited</p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg sm:text-[25px] font-extrabold tracking-tight text-white leading-none">
                          ₹{(currentPayslip.netSalary || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Bank Details */}
                    {currentPayslip.bankInfo && (
                      <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-2.5 space-y-0.5 text-xs">
                        <p className="font-bold text-slate-800 text-[11px] sm:text-[11.5px] mb-0.5">Bank Account</p>
                        <div className="flex justify-between text-slate-600">
                          <span>Bank:</span>
                          <span className="font-medium text-slate-900 truncate max-w-[110px]">{currentPayslip.bankInfo.bankName || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>A/C:</span>
                          <span className="font-medium text-slate-900">{currentPayslip.bankInfo.accountNumber || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>IFSC:</span>
                          <span className="font-medium text-slate-900">{currentPayslip.bankInfo.ifscCode || 'N/A'}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {currentPayslip.remarks && (
                    <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-2.5 text-xs">
                      <span className="font-bold text-slate-700 block mb-0.5 text-[11px]">Remarks:</span>
                      <p className="text-slate-600 text-[11.5px]">{currentPayslip.remarks}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <EmployeeHrBot />

      <style>{`
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-dropdown-in {
          animation: dropdownIn 0.12s ease-out both;
        }
        .scrollbar-none::-webkit-scrollbar { width: 0; height: 0; }
        .scrollbar-none { scrollbar-width: none; }
        .employee-main-scroll {
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
};

export default EmployeeLayout;
