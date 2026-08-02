// hooks/useAuth.js
import { useState, useEffect, useCallback } from 'react';
import { authAPI } from '../utils/api';
import { authService } from '../services/authService';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize auth from localStorage (fast initial load)
  const initAuthFromStorage = useCallback(() => {
    try {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');

      if (token && userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setIsAuthenticated(true);
        return true; // Successfully loaded from storage
      }
    } catch (error) {
      console.error('Error parsing stored user data:', error);
      // Clear corrupted data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return false; // No valid data in storage
  }, []);

  // Fetch user from API (for verification/updates)
  const fetchUser = useCallback(async () => {
    try {
      setError(null);
      
      // Try your existing authService first, fallback to authAPI
      let response;
      try {
        response = await authAPI.getCurrentUser();
      } catch (apiError) {
        // Fallback to authService if available
        if (authService && authService.getCurrentUser) {
          response = await authService.getCurrentUser();
        } else {
          throw apiError;
        }
      }
      
      if (response.data && response.data.success) {
        const userData = response.data.data;
        setUser(userData);
        setIsAuthenticated(true);
        
        // Update localStorage with fresh data
        localStorage.setItem('user', JSON.stringify(userData));
        return userData;
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      setError(error.message);
      
      // If API fails but we have stored data, keep using it
      if (!user) {
        setUser(null);
        setIsAuthenticated(false);
      }
      
      throw error;
    }
  }, []);

  // Login function (from your existing code)
  const login = useCallback(async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      
      // Use your existing authService
      const response = await authService.login(credentials);
      
      setUser(response.user);
      setIsAuthenticated(true);
      
      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Enhanced logout function
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      
      // Try API logout first
      try {
        await authService.logout();
      } catch (logoutError) {
        console.error('Logout API error:', logoutError);
        // Continue with local cleanup even if API fails
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local state and storage
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
      
      // Clear all possible auth-related storage keys
      const keysToRemove = [
        'token', 'authToken', 'user', 'userRole', 'role',
        'userEmail', 'userName', 'userId', 'employeeId'
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      setLoading(false);
      
      // Redirect to login
      window.location.href = '/login';
    }
  }, []);

  // Update user function (from your existing code)
  const updateUser = useCallback((userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(userData));
  }, []);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      await fetchUser();
    } catch (error) {
      // If refresh fails, user can still continue with cached data
      console.warn('Failed to refresh user data:', error);
    }
  }, [fetchUser, isAuthenticated]);

  // Initialize authentication
  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true);
        
        // First, try to load from storage (fast)
        const hasStoredAuth = initAuthFromStorage();
        
        if (hasStoredAuth) {
          // If we have stored data, set loading to false immediately
          // but continue to verify with API in background
          setLoading(false);
          
          // Verify/update with API in background
          try {
            await fetchUser();
          } catch (error) {
            // If API verification fails, we keep the stored data
            console.warn('Background user verification failed:', error);
          }
        } else {
          // No stored data, must fetch from API
          try {
            await fetchUser();
          } catch (error) {
            // No stored data and API failed
            setUser(null);
            setIsAuthenticated(false);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [initAuthFromStorage, fetchUser]);

  return {
    // State
    user,
    loading,
    error,
    isAuthenticated,
    
    // Computed properties
    isAdmin: user?.role === 'admin',
    isHR: user?.role === 'hr',
    isManager: user?.role === 'manager',
    isEmployee: user?.role === 'employee',
    
    // Actions
    login,
    logout,
    updateUser,
    refreshUser,
    
    // Utilities
    hasPermission: (permission) => {
      // You can implement permission checking logic here
      return user?.permissions?.includes(permission) || false;
    },
    
    getUserInitials: () => {
      if (!user?.name) return 'U';
      return user.name.split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
  };
};