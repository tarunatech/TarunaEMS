import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, RefreshCw, CheckCheck, Clock, User, Settings, AlertTriangle, Calendar, FileText, CheckCircle, X, MessageCircle, Briefcase, GitBranch, ClipboardList, Loader2 } from "lucide-react";
import { taskService } from "../../../services/taskService";
import toast from "react-hot-toast";

const formatNotificationIST = (timeInput) => {
  if (!timeInput) return '';

  const date = new Date(timeInput);
  if (isNaN(date.getTime())) {
    return String(timeInput);
  }

  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  const istTimeStr = date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  });

  const istDateStr = date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata'
  });

  const todayIST = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
  const dateIST = date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });

  if (diffInMinutes >= 0 && diffInMinutes < 1) {
    return `Just now (${istTimeStr} IST)`;
  }

  if (diffInMinutes >= 1 && diffInMinutes < 60) {
    return `${diffInMinutes}m ago (${istTimeStr} IST)`;
  }

  if (dateIST === todayIST) {
    return `Today at ${istTimeStr} IST`;
  }

  return `${istDateStr} at ${istTimeStr} IST`;
};

const getNotificationTargetRoute = (notification) => {
  const userRole = (localStorage.getItem('userRole') || sessionStorage.getItem('userRole') || 'admin').toLowerCase();
  const isAdmin = userRole === 'admin';
  const cat = (notification.category || '').toLowerCase();
  const id = String(notification.id || '').toLowerCase();

  // EOD Reports
  if (cat === 'eod' || notification.dayBookId || id.startsWith('eod-')) {
    return isAdmin ? '/admin/tasks' : '/employee/tasks';
  }

  // Attendance
  if (cat === 'attendance' || id.includes('attendance')) {
    return isAdmin ? '/admin/attendance' : '/employee/attendance';
  }

  // Leaves
  if (cat === 'leave' || cat === 'leaves' || id.includes('leave')) {
    return isAdmin ? '/admin/leaves' : '/employee/leaves';
  }

  // Tasks
  if (cat === 'task' || cat === 'tasks' || id.includes('task')) {
    return isAdmin ? '/admin/tasks' : '/employee/tasks';
  }

  // Employees / Staff
  if (cat === 'employee' || id.includes('employee')) {
    return isAdmin ? '/admin/employees' : '/employee/profile';
  }

  // Sales / Leads / Pipeline
  if (cat === 'lead' || cat === 'pipeline' || cat === 'sales' || id.includes('lead') || id.includes('pipeline')) {
    return isAdmin ? '/admin/sales' : '/employee/sales-pipeline';
  }

  // Interviews / HR
  if (cat === 'interview' || cat === 'hr' || id.includes('interview')) {
    return isAdmin ? '/admin/interviews' : '/employee/hr-interviews';
  }

  // Holidays
  if (cat === 'holiday' || id.includes('holiday')) {
    return isAdmin ? '/admin/holidays' : '/employee/holidays';
  }

  // Payslips
  if (cat === 'payslip' || id.includes('payslip')) {
    return isAdmin ? '/admin/payslips' : '/employee/profile';
  }

  // Profile
  if (cat === 'profile' || id.includes('profile')) {
    return isAdmin ? '/admin/profile' : '/employee/profile';
  }

  // Default fallback
  return isAdmin ? '/admin/dashboard' : '/employee/dashboard';
};

const NotificationBell = ({ unreadCount, notifications = [], onNotificationRead, onRefresh, onMarkAllRead, onDismiss }) => {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [eodStatusState, setEodStatusState] = useState({});
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [dropdownOpen]);

  // Handle refresh notifications
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setRefreshing(false), 1000);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    if (onMarkAllRead) {
      await onMarkAllRead();
      return;
    }
    notifications.filter(n => n.unread).forEach(n => onNotificationRead(n.id));
  };

  // Get notification icon based on type
  const getNotificationIcon = (type, category) => {
    const iconProps = { className: "w-4 h-4 flex-shrink-0" };
    
    switch (category) {
      case 'employee':
        return <User {...iconProps} className="w-4 h-4 text-blue-600 flex-shrink-0" />;
      case 'attendance':
        return type === 'success'
          ? <CheckCircle {...iconProps} className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          : <Clock {...iconProps} className="w-4 h-4 text-blue-600 flex-shrink-0" />;
      case 'leave':
      case 'leaves':
        return <Calendar {...iconProps} className="w-4 h-4 text-amber-600 flex-shrink-0" />;
      case 'holiday':
        return <Calendar {...iconProps} className="w-4 h-4 text-violet-600 flex-shrink-0" />;
      case 'payslip':
        return <FileText {...iconProps} className="w-4 h-4 text-indigo-600 flex-shrink-0" />;
      case 'sales':
      case 'lead':
        return <Briefcase {...iconProps} className="w-4 h-4 text-cyan-600 flex-shrink-0" />;
      case 'pipeline':
        return <GitBranch {...iconProps} className="w-4 h-4 text-violet-600 flex-shrink-0" />;
      case 'interview':
        return <ClipboardList {...iconProps} className="w-4 h-4 text-fuchsia-600 flex-shrink-0" />;
      case 'chat':
        return <MessageCircle {...iconProps} className="w-4 h-4 text-sky-600 flex-shrink-0" />;
      case 'task':
        return <Settings {...iconProps} className="w-4 h-4 text-green-600 flex-shrink-0" />;
      case 'eod':
        return <FileText {...iconProps} className="w-4 h-4 text-purple-600 flex-shrink-0" />;
      case 'tasks':
        return type === 'error' 
          ? <AlertTriangle {...iconProps} className="w-4 h-4 text-red-600 flex-shrink-0" />
          : <Settings {...iconProps} className="w-4 h-4 text-amber-600 flex-shrink-0" />;
      default:
        return <Bell {...iconProps} className="w-4 h-4 text-slate-400 flex-shrink-0" />;
    }
  };

  // Get notification color based on type
  const getNotificationColor = (type, unread) => {
    if (!unread) return 'text-slate-500';
    
    switch (type) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-amber-600';
      case 'info':
        return 'text-blue-600';
      default:
        return 'text-slate-900';
    }
  };

  return (
    <>
      <style>{`
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .notif-dropdown-enter {
          animation: dropdownIn 0.15s ease-out both;
        }
      `}</style>
      <div className="relative" ref={dropdownRef}>
        <button 
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="relative p-1.5 sm:p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all duration-200 rounded-md"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-blue-600 rounded-full text-xs text-white flex items-center justify-center animate-pulse font-medium">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {dropdownOpen && (
          <div className="notif-dropdown-enter fixed left-2 top-[4.25rem] z-50 flex max-h-[70dvh] w-[calc(100vw-1.5rem)] max-w-sm -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15 md:absolute md:left-auto md:right-0 md:top-full md:mt-2 md:w-80 md:translate-x-0 xl:w-96 xl:max-w-none">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 p-3 sm:p-4">
              <div className="flex min-w-0 items-center gap-2">
                <Bell className="h-5 w-5 flex-shrink-0 text-blue-600" />
                <h3 className="truncate text-base font-semibold text-slate-900 sm:text-lg">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="flex-shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <div className="flex flex-shrink-0 items-center gap-1">
                {notifications.length > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 sm:h-auto sm:w-auto sm:gap-1 sm:px-2 sm:py-1.5 sm:text-xs font-medium"
                    title="Mark all as read"
                    aria-label="Mark all notifications as read"
                  >
                    <CheckCheck className="h-3.5 w-3.5 text-blue-600" />
                    <span className="hidden min-[390px]:inline">Mark all read</span>
                  </button>
                )}
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 sm:h-auto sm:w-auto sm:p-1.5"
                  title="Refresh notifications"
                  aria-label="Refresh notifications"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {notifications.length === 0 ? (
                <div className="p-6 text-center sm:p-8">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                    <Bell className="w-7 h-7 text-slate-400" />
                  </div>
                  <p className="text-slate-500 text-sm font-medium">No notifications yet</p>
                  <p className="text-slate-400 text-xs mt-1">
                    You'll see updates about activities here
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => {
                      if (notification.unread && onNotificationRead) {
                        onNotificationRead(notification.id);
                      }
                      setDropdownOpen(false);
                      const targetRoute = getNotificationTargetRoute(notification);
                      if (targetRoute) {
                        navigate(targetRoute);
                      }
                    }}
                    className={`cursor-pointer border-b border-slate-200 p-3 transition-all duration-200 last:border-b-0 hover:bg-blue-50 sm:p-4 ${
                      notification.unread ? 'bg-slate-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 flex-shrink-0">
                        {getNotificationIcon(notification.type, notification.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`break-words text-sm font-medium leading-relaxed ${getNotificationColor(notification.type, notification.unread)}`}>
                          {notification.message}
                        </p>
                        {notification.user && (
                          <p className="text-xs text-slate-400 mt-1 truncate">
                            {notification.user}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-slate-400">
                            {formatNotificationIST(notification.time)}
                          </span>
                          {notification.category === 'chat' && notification.count > 1 ? (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-semibold text-white">
                              {notification.count > 99 ? '99+' : notification.count}
                            </span>
                          ) : notification.unread && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                          )}
                        </div>

                        {/* EOD Quick Action Buttons */}
                        {(notification.category === 'eod' || notification.dayBookId || (typeof notification.id === 'string' && notification.id.startsWith('eod-'))) && (
                          <div className="mt-2.5 flex items-center gap-2 pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                            {eodStatusState[notification.id] || (notification.dayBookStatus && notification.dayBookStatus !== 'Submitted' && notification.dayBookStatus !== 'Pending') ? (
                              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md ${
                                (eodStatusState[notification.id] || notification.dayBookStatus) === 'Approved'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-red-100 text-red-800 border border-red-200'
                              }`}>
                                {(eodStatusState[notification.id] || notification.dayBookStatus) === 'Approved' ? <CheckCircle className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                                {eodStatusState[notification.id] || notification.dayBookStatus}
                              </span>
                            ) : (
                              <>
                                 <button
                                  type="button"
                                  disabled={actionLoading === notification.id}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const dbId = notification.dayBookId || (typeof notification.id === 'string' && notification.id.startsWith('eod-') ? notification.id.replace('eod-', '') : null);
                                    if (!dbId) return;
                                    setActionLoading(notification.id);
                                    try {
                                      const res = await taskService.updateDayBookStatus(dbId, { status: 'Approved' });
                                      if (res && res.success) {
                                        toast.success('EOD Report approved!');
                                        setEodStatusState(prev => ({ ...prev, [notification.id]: 'Approved' }));
                                        if (onRefresh) onRefresh();
                                      } else {
                                        throw new Error(res?.message || 'Failed to approve');
                                      }
                                    } catch (err) {
                                      toast.error('Failed to approve EOD report');
                                    } finally {
                                      setActionLoading(null);
                                    }
                                  }}
                                  className="flex-1 inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] sm:text-xs font-semibold rounded-lg shadow-2xs transition-all duration-150 disabled:opacity-50"
                                >
                                  {actionLoading === notification.id ? <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" /> : <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  disabled={actionLoading === notification.id}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const dbId = notification.dayBookId || (typeof notification.id === 'string' && notification.id.startsWith('eod-') ? notification.id.replace('eod-', '') : null);
                                    if (!dbId) return;
                                    setActionLoading(notification.id);
                                    try {
                                      const res = await taskService.updateDayBookStatus(dbId, { status: 'Rejected' });
                                      if (res && res.success) {
                                        toast.success('EOD Report rejected!');
                                        setEodStatusState(prev => ({ ...prev, [notification.id]: 'Rejected' }));
                                        if (onRefresh) onRefresh();
                                      } else {
                                        throw new Error(res?.message || 'Failed to reject');
                                      }
                                    } catch (err) {
                                      toast.error('Failed to reject EOD report');
                                    } finally {
                                      setActionLoading(null);
                                    }
                                  }}
                                  className="flex-1 inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 bg-white border border-red-200 hover:bg-red-50 text-red-600 text-[11px] sm:text-xs font-semibold rounded-lg shadow-2xs transition-all duration-150 disabled:opacity-50"
                                >
                                  {actionLoading === notification.id ? <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" /> : <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      {onDismiss && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onDismiss(notification.id);
                          }}
                          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700"
                          title="Remove notification"
                          aria-label="Remove notification"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default NotificationBell;
