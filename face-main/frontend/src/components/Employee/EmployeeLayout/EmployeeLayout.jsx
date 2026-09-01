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
} from "lucide-react";
import toast from "react-hot-toast";
import { allowedKeysForDepartment, getDepartmentName, normalizeDepartment } from '../../../utils/departmentAccess';
import { dashboardAPI, getApiFileUrl } from '../../../utils/api';
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
