// hooks/useDashboardData.js
import { useState, useEffect, useCallback } from 'react';
import { dashboardAPI } from '../utils/api';
import { Users, Building2, Calendar, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export const useDashboardData = () => {
  const [state, setState] = useState({
    stats: [],
    recentActivities: [],
    upcomingEvents: [],
    loading: true,
    error: null
  });

  const createDefaultStats = useCallback((data = {}) => [
    {
      title: "Total Employees",
      value: data.totalEmployees || 0,
      icon: Users,
      color: "from-pink-500 to-purple-500",
      changeType: "positive",
      path: "/admin/employees"
    },
    {
      title: "Active Employees",
      value: data.activeEmployees || 0,
      icon: UserCheck,
      color: "from-green-500 to-emerald-500",
      changeType: "negative",
      path: "/admin/employees"
    },
    {
      title: "Departments",
      value: data.departments || 0,
      icon: Building2,
      color: "from-blue-500 to-indigo-500",
      changeType: "positive",
      path: "/admin/department"
    },
    {
      title: "Leaves Today",
      value: data.leavesToday || 0,
      icon: Calendar,
      color: "from-yellow-500 to-orange-500",
      changeType: "neutral",
      path: "/admin/leaves"
    }
  ], []);

  const fetchDashboardData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const [statsResponse, activitiesResponse, eventsResponse] = await Promise.all([
        dashboardAPI.getAdminStats(),
        dashboardAPI.getRecentActivities(),
        dashboardAPI.getUpcomingEvents()
      ]);

      const newState = {
        loading: false,
        error: null
      };

      // Process stats data
      if (statsResponse.data.success) {
        const data = statsResponse.data;
        newState.stats = createDefaultStats(data);
      } else {
        newState.stats = createDefaultStats();
      }

      // Process activities data
      if (activitiesResponse.data.success) {
        newState.recentActivities = activitiesResponse.data.activities || [];
      } else {
        newState.recentActivities = [];
      }

      // Process events data
      if (eventsResponse.data.success) {
        newState.upcomingEvents = eventsResponse.data.events || [];
      } else {
        newState.upcomingEvents = [];
      }

      setState(prev => ({ ...prev, ...newState }));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);

      const errorMessage = error.response?.data?.message || 'Failed to load dashboard data';
      toast.error(errorMessage);

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        stats: createDefaultStats(),
        recentActivities: [],
        upcomingEvents: []
      }));
    }
  }, [createDefaultStats]);

  const refreshData = useCallback(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    ...state,
    refreshData,
    isLoading: state.loading
  };
};

