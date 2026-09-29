// components/Header/Header.jsx - Improved version with better error handling
import React, { useState, useEffect, useRef } from "react";
import { Menu, User, ChevronDown, MessageCircle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import NotificationBell from "./NotificationBell";
import ProfileDropdown from "./ProfileDropdown";
import { authAPI, dashboardAPI, getApiFileUrl } from '../../../utils/api';
import toast from 'react-hot-toast';

const getNotificationStorageKey = (suffix) => {
  const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId') || 'admin';
  return `admin-notifications-${userId}-${suffix}`;
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

const Header = ({ sidebarItems, location, setSidebarOpen }) => {
  const navigate = useNavigate();
  const [profileDropdown, setProfileDropdown] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chatPopup, setChatPopup] = useState(null);

  const fetchingRef = useRef(false);
  const profileDropdownRef = useRef(null);
  const socketRef = useRef(null);
  const popupTimeoutRef = useRef(null);

  const playNotificationChime = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.12);
      osc2.start(ctx.currentTime + 0.08);
      osc2.stop(ctx.currentTime + 0.35);
    } catch (e) {}
  };

  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin.replace(/:\d+$/, ':5000');

    if (!socketRef.current) {
      const socket = io(`${SOCKET_URL}/employee`, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10
      });
      socketRef.current = socket;
    }

    const socket = socketRef.current;

    const getCurrentUserId = () => {
      try {
        const uStr = localStorage.getItem('user') || sessionStorage.getItem('user');
        if (uStr) {
          const u = JSON.parse(uStr);
          if (u?._id || u?.id) return String(u._id || u.id);
        }
      } catch (e) {}
      return String(
        localStorage.getItem('userId') ||
        sessionStorage.getItem('userId') ||
        userProfile?._id || userProfile?.id || ''
      );
    };

    const showPopup = (data) => {
      playNotificationChime();
      setChatPopup(data);
      if (popupTimeoutRef.current) {
        clearTimeout(popupTimeoutRef.current);
      }
      popupTimeoutRef.current = setTimeout(() => {
        setChatPopup(null);
      }, 6500);
    };

    const handleDirectMessage = (msg) => {
      if (!msg || msg.fromBot) return;
      const currentUserId = getCurrentUserId();
      const senderId = String(msg.from || '');
      if (msg.self || (senderId && currentUserId && senderId === currentUserId)) return;

      showPopup({
        id: msg._id || Date.now(),
        type: 'team',
        senderName: msg.fromName || 'Employee',
        text: msg.text || '',
        peerId: senderId,
        profileImage: msg.profileImage || null
      });
    };

    const handleGroupMessage = (msg) => {
      if (!msg) return;
      const currentUserId = getCurrentUserId();
      const senderId = String(msg.sender?._id || msg.sender?.id || msg.sender || '');
      if (senderId && currentUserId && senderId === currentUserId) return;

      const senderName = msg.sender?.name || msg.senderName || 'Group Member';
      showPopup({
        id: msg._id || Date.now(),
        type: 'group',
        senderName,
        groupName: msg.groupName || 'Group Chat',
        text: msg.text || '',
        groupId: msg.groupId,
        profileImage: msg.sender?.profileImage || null
      });
    };

    socket.on('message', handleDirectMessage);
    socket.on('group:message', handleGroupMessage);

    return () => {
      socket.off('message', handleDirectMessage);
      socket.off('group:message', handleGroupMessage);
    };
  }, [userProfile]);

  // Close dropdowns when clicking outside or on mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdown && profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target)) {
        setProfileDropdown(false);
      }
    };

    const handleResize = () => {
      if (window.innerWidth < 768 && profileDropdown) {
        setProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
    };
  }, [profileDropdown]);

  // Fetch user data only once on mount
  useEffect(() => {
    const initializeHeader = async () => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;

      try {
        await Promise.all([
          fetchUserData(),
          fetchNotifications()
        ]);
      } catch (error) {
        console.error('Header initialization error:', error);
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    };

    initializeHeader();
  }, []);

  const fetchUserData = async () => {
    try {
      setError(null);
      const response = await authAPI.getMyProfile();

      if (response.data.success) {
        setUserProfile(response.data.data);
      } else {
        throw new Error(response.data.message || 'Failed to fetch profile');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError(error.message);

      const fallbackData = {
        name: localStorage.getItem('userName') || 'User',
        email: localStorage.getItem('userEmail') || 'user@example.com',
        role: localStorage.getItem('userRole') || 'employee'
      };
      setUserProfile(fallbackData);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await dashboardAPI.getUserNotifications();
      if (response.data.success) {
        const readIds = readNotificationSet('read');
        const dismissedIds = readNotificationSet('dismissed');
        setNotifications(
          (response.data.data || []).map((n, index) => {
            const id = String(n.id || `notification-${index}`);
            return {
              id,
              message: n.message,
              user: n.user,
              time: n.time,
              type: n.type || 'info',
              category: n.category || 'general',
              dayBookId: n.dayBookId,
              dayBookStatus: n.dayBookStatus,
              count: n.count || 1,
              unread: readIds.has(id) ? false : (n.unread ?? true)
            };
          }).filter(n => !dismissedIds.has(n.id) && !readIds.has(n.id) && n.unread !== false)
        );
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    }
  };

  const handleRefreshNotifications = async () => {
    if (fetchingRef.current) return;

    try {
      await fetchNotifications();
    } catch {
      toast.error('Failed to refresh notifications');
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout().catch(() => { });
    } finally {
      const authKeys = [
        'token', 'authToken', 'userRole', 'userEmail', 'userName', 'userId', 'employeeId'
      ];

      authKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      localStorage.clear();
      sessionStorage.clear();

      toast.success("Logged out successfully!");
      navigate('/login');
    }
  };

  const handleNotificationRead = async (notificationId) => {
    const id = String(notificationId);
    const readIds = readNotificationSet('read');
    readIds.add(id);
    writeNotificationSet('read', readIds);
    setNotifications(prev => prev.filter(n => n.id !== id));
    dashboardAPI.markNotificationAsRead(id).catch(() => {});
  };

  const handleMarkAllNotificationsRead = async () => {
    const readIds = readNotificationSet('read');
    notifications.forEach(notification => readIds.add(String(notification.id)));
    writeNotificationSet('read', readIds);
    setNotifications([]);
    dashboardAPI.markAllNotificationsAsRead().catch(() => {});
    toast.success('All notifications marked as read');
  };

  const handleDismissNotification = (notificationId) => {
    const id = String(notificationId);
    const dismissedIds = readNotificationSet('dismissed');
    dismissedIds.add(id);
    writeNotificationSet('dismissed', dismissedIds);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const unreadNotifications = notifications.filter(n => n.unread).length;

  const getDisplayInfo = () => {
    if (loading && !userProfile) {
      return { name: 'Loading...', email: '', role: '' };
    }

    if (error && !userProfile) {
      return {
        name: 'User',
        email: localStorage.getItem('userEmail') || '',
        role: localStorage.getItem('userRole') || ''
      };
    }

    if (userProfile) {
      const firstName = userProfile.personalInfo?.firstName || '';
      const lastName = userProfile.personalInfo?.lastName || '';
      const fullName = firstName && lastName ? `${firstName} ${lastName}` : userProfile.name;

      return {
        name: fullName || userProfile.name || 'User',
        email: userProfile.email || userProfile.contactInfo?.personalEmail || '',
        role: userProfile.role === 'admin' ? 'Administrator' : 'Employee'
      };
    }

    return {
      name: localStorage.getItem('userName') || 'User',
      email: localStorage.getItem('userEmail') || '',
      role: localStorage.getItem('userRole') === 'admin' ? 'Administrator' : 'Employee'
    };
  };

  const { name, email } = getDisplayInfo();
  const getFullImageUrl = (path) => getApiFileUrl(path) || null;

  return (
    <header className="sticky top-0 z-40 h-14 shrink-0 border-b border-slate-200/80 bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl">
      <div className="flex h-full items-center justify-between gap-2 px-3 sm:px-6">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-md p-1 text-slate-500 transition-colors hover:text-slate-900 lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="hidden sm:hidden lg:block">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            {sidebarItems.find((item) => item.path === location.pathname)?.name ||
              "Dashboard"}
          </h2>
        </div>

        <div className="min-w-0 flex-1 text-center sm:hidden lg:hidden">
          <h2 className="truncate px-1 text-base font-bold text-slate-900">
            {sidebarItems.find((item) => item.path === location.pathname)?.name ||
              "Dashboard"}
          </h2>
        </div>

        {/* Right Section */}
        <div className="flex shrink-0 items-center space-x-2 sm:space-x-4">
          {/* Real-time Chat Notification Popup */}
          {chatPopup && (
            <div
              onClick={() => setChatPopup(null)}
              className="fixed top-16 right-4 sm:right-6 z-[99999] w-80 sm:w-96 cursor-pointer transform transition-all duration-300 ease-out animate-in fade-in slide-in-from-top-2"
            >
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xl shadow-slate-200/50 dark:bg-slate-900 dark:border-slate-800 dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)] hover:border-indigo-300 dark:hover:border-indigo-800 transition-all">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md overflow-hidden ring-2 ring-indigo-100 dark:ring-slate-700">
                      {chatPopup.profileImage ? (
                        <img src={getFullImageUrl(chatPopup.profileImage)} alt={chatPopup.senderName} className="h-full w-full object-cover" />
                      ) : (
                        <span>{chatPopup.senderName?.[0]?.toUpperCase() || 'C'}</span>
                      )}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-xs" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-800">
                        <MessageCircle className="w-3 h-3 text-indigo-500" />
                        {chatPopup.type === 'group' ? (chatPopup.groupName ? `Group · ${chatPopup.groupName}` : 'Group Chat') : 'Team Chat'}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400">Just now</span>
                    </div>

                    <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white truncate">
                      {chatPopup.senderName}
                    </h4>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5 leading-snug">
                      {chatPopup.text}
                    </p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setChatPopup(null);
                    }}
                    className="shrink-0 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          <NotificationBell
            unreadCount={unreadNotifications}
            notifications={notifications}
            onNotificationRead={handleNotificationRead}
            onMarkAllRead={handleMarkAllNotificationsRead}
            onDismiss={handleDismissNotification}
            onRefresh={handleRefreshNotifications}
          />

          {/* Profile */}
          <div className="relative" ref={profileDropdownRef}>
            <button
              onClick={() => setProfileDropdown(!profileDropdown)}
              className="flex items-center space-x-2 sm:space-x-3 p-1 sm:p-1.5 rounded-2xl hover:bg-slate-50 transition-colors border border-slate-200/80 hover:border-slate-300 shadow-sm"
              aria-label="Open profile menu"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-violet-500 to-indigo-600 border border-white/60 rounded-full flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-500/20">
                <User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>

              <div className="hidden sm:block md:block text-left min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate max-w-[120px] lg:max-w-none">
                  {name}
                </p>
                <p className="text-xs text-slate-500 truncate max-w-[120px] lg:max-w-none">
                  {email}
                </p>
              </div>

              <ChevronDown className={`w-4 h-4 text-slate-400 hidden sm:block transition-transform ${profileDropdown ? 'rotate-180' : ''}`} />
            </button>

            {profileDropdown && (
              <ProfileDropdown
                onLogout={handleLogout}
                userProfile={userProfile}
                onClose={() => setProfileDropdown(false)}
              />
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
