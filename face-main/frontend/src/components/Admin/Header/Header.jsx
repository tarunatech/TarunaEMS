// components/Header/Header.jsx - Improved version with better error handling
import React, { useState, useEffect, useRef } from "react";
import { Menu, User, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import NotificationBell from "./NotificationBell";
import ProfileDropdown from "./ProfileDropdown";
import { authAPI, dashboardAPI } from '../../../utils/api';
import toast from 'react-hot-toast';

const Header = ({ sidebarItems, location, setSidebarOpen }) => {
  const navigate = useNavigate();
  const [profileDropdown, setProfileDropdown] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use ref to prevent multiple simultaneous API calls
  const fetchingRef = useRef(false);
  // Ref for profile dropdown container to detect outside clicks
  const profileDropdownRef = useRef(null);

  // Close dropdowns when clicking outside or on mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only close if click is outside the profile dropdown container
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
      if (fetchingRef.current) return; // Prevent duplicate calls
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

  // Fetch current user profile data
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

      // Fallback to localStorage data
      const fallbackData = {
        name: localStorage.getItem('userName') || 'User',
        email: localStorage.getItem('userEmail') || 'user@example.com',
        role: localStorage.getItem('userRole') || 'employee'
      };
      setUserProfile(fallbackData);
    }
  };

  // Fetch notifications with error handling
  const fetchNotifications = async () => {
    try {
      const response = await dashboardAPI.getUserNotifications();
      if (response.data.success) {
        setNotifications(
          (response.data.data || []).map((n, index) => ({
            id: n.id || `notification-${index}`,
            message: n.message,
            user: n.user,
            time: n.time,
            type: n.type || 'info',
            category: n.category || 'general',
            unread: n.unread ?? true
          }))
        );
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    }
  };

  // Refresh notifications manually
  const handleRefreshNotifications = async () => {
    if (fetchingRef.current) return;

    try {
      await fetchNotifications();
    } catch {
      toast.error('Failed to refresh notifications');
    }
  };

  // Handle logout with proper cleanup
  const handleLogout = async () => {
    try {
      // Call logout API (don't fail if it errors)
      await authAPI.logout().catch(() => { });
    } finally {
      // Always clear storage and redirect
      const authKeys = [
        'token', 'authToken', 'userRole', 'userEmail', 'userName', 'userId', 'employeeId'
      ];

      authKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      // Clear all other possible auth keys just in case
      localStorage.clear();
      sessionStorage.clear();

      toast.success("Logged out successfully!");
      navigate('/login');
    }
  };

  // Mark notification as read
  const handleNotificationRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, unread: false } : n)
    );
  };

  // Count unread notifications
  const unreadNotifications = notifications.filter(n => n.unread).length;

  // Get display information
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
      // Handle both user profile formats
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

  return (
    <header className="bg-white/95 backdrop-blur-xl border-b border-slate-200/80 h-14 z-40 sticky top-0 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between h-full px-4 sm:px-6">
        {/* Mobile menu button */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden text-slate-500 hover:text-slate-900 p-1 rounded-md transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Page Title - Hidden on very small screens */}
        <div className="hidden sm:hidden lg:block">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            {sidebarItems.find((item) => item.path === location.pathname)?.name ||
              "Dashboard"}
          </h2>
        </div>

        {/* Mobile Page Title - Only show on small screens */}
        <div className="sm:hidden lg:hidden flex-1 text-center">
          <h2 className="text-lg font-bold text-slate-900 truncate px-2">
            {sidebarItems.find((item) => item.path === location.pathname)?.name ||
              "Dashboard"}
          </h2>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <NotificationBell
            unreadCount={unreadNotifications}
            notifications={notifications}
            onNotificationRead={handleNotificationRead}
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

              {/* User info - responsive visibility */}
              <div className="hidden sm:block md:block text-left min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate max-w-[120px] lg:max-w-none">
                  {name}
                </p>
                <p className="text-xs text-slate-500 truncate max-w-[120px] lg:max-w-none">
                  {email}
                </p>
              </div>

              {/* Show only on larger screens */}
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
