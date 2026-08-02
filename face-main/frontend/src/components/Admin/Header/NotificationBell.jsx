import React, { useState, useRef, useEffect } from "react";
import { Bell, RefreshCw, CheckCheck, Clock, User, Settings, AlertTriangle, X } from "lucide-react";

const NotificationBell = ({ unreadCount, notifications = [], onNotificationRead, onRefresh }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const dropdownRef = useRef(null);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      
      // Prevent body scroll on mobile when dropdown is open
      if (isMobile) {
        document.body.style.overflow = 'hidden';
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [dropdownOpen, isMobile]);

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
  const handleMarkAllRead = () => {
    notifications.filter(n => n.unread).forEach(n => onNotificationRead(n.id));
  };

  // Get notification icon based on type
  const getNotificationIcon = (type, category) => {
    const iconProps = { className: "w-4 h-4 flex-shrink-0" };
    
    switch (category) {
      case 'employee':
        return <User {...iconProps} className="w-4 h-4 text-blue-600 flex-shrink-0" />;
      case 'leave':
      case 'leaves':
        return <Clock {...iconProps} className="w-4 h-4 text-amber-600 flex-shrink-0" />;
      case 'task':
        return <Settings {...iconProps} className="w-4 h-4 text-green-600 flex-shrink-0" />;
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

  // Close dropdown
  const closeDropdown = () => {
    setDropdownOpen(false);
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

        {dropdownOpen && !isMobile && (
          // Desktop dropdown
          <div className="notif-dropdown-enter absolute right-0 mt-2 w-80 xl:w-96 bg-white rounded-lg border border-slate-200 shadow-xl z-50 max-h-96 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <h3 className="text-lg font-semibold text-slate-900">Notifications</h3>
              </div>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-slate-500 hover:text-slate-900 transition-all duration-200 flex items-center space-x-1 px-2 py-1 rounded hover:bg-slate-100"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3 h-3" />
                    <span className="hidden sm:inline">Mark all read</span>
                  </button>
                )}
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="text-slate-400 hover:text-slate-900 transition-all duration-200 disabled:opacity-50 p-1 rounded hover:bg-slate-100"
                  title="Refresh notifications"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-64 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
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
                      if (notification.unread) {
                        onNotificationRead(notification.id);
                      }
                    }}
                    className={`p-4 border-b border-slate-200 last:border-b-0 cursor-pointer transition-all duration-200 hover:bg-blue-50 ${
                      notification.unread ? 'bg-slate-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="mt-1 flex-shrink-0">
                        {getNotificationIcon(notification.type, notification.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${getNotificationColor(notification.type, notification.unread)} break-words`}>
                          {notification.message}
                        </p>
                        {notification.user && (
                          <p className="text-xs text-slate-400 mt-1 truncate">
                            {notification.user}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-slate-400">
                            {notification.time}
                          </span>
                          {notification.unread && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-slate-200 bg-slate-50">
                <button className="w-full text-xs text-slate-500 hover:text-slate-900 transition-all duration-200 text-center py-1">
                  View All Notifications
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Modal */}
      {dropdownOpen && isMobile && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm"
            onClick={closeDropdown}
          />
          
          {/* Modal */}
          <div className="fixed bottom-0 left-0 right-0 max-h-[80vh] bg-white rounded-t-2xl border-t border-slate-200 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-slate-900">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-slate-500 hover:text-slate-900 transition-all duration-200 flex items-center space-x-1 px-3 py-2 rounded-lg hover:bg-slate-100"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>Mark all read</span>
                  </button>
                )}
                <button
                  onClick={closeDropdown}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all duration-200"
                  aria-label="Close notifications"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-[60vh] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                    <Bell className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 text-base mb-2 font-medium">No notifications yet</p>
                  <p className="text-slate-400 text-sm">
                    You'll see updates about activities here
                  </p>
                </div>
              ) : (
                <>
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => {
                        if (notification.unread) {
                          onNotificationRead(notification.id);
                        }
                      }}
                      className={`p-4 border-b border-slate-200 last:border-b-0 active:bg-blue-50 transition-all duration-200 ${
                        notification.unread ? 'bg-slate-50' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="mt-1 flex-shrink-0">
                          {getNotificationIcon(notification.type, notification.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${getNotificationColor(notification.type, notification.unread)} leading-relaxed`}>
                            {notification.message}
                          </p>
                          {notification.user && (
                            <p className="text-sm text-slate-400 mt-1">
                              {notification.user}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-sm text-slate-400">
                              {notification.time}
                            </span>
                            {notification.unread && (
                              <div className="w-3 h-3 bg-blue-600 rounded-full flex-shrink-0"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Refresh Button for Mobile */}
                  <div className="p-4 border-t border-slate-200">
                    <button
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="w-full py-3 text-slate-500 hover:text-slate-900 transition-all duration-200 disabled:opacity-50 flex items-center justify-center space-x-2 rounded-lg hover:bg-slate-100"
                    >
                      <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                      <span>{refreshing ? 'Refreshing...' : 'Refresh Notifications'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationBell;