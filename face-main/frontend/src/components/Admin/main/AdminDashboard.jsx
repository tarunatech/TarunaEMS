// components/Dashboard/AdminDashboard.js
import React, { useMemo } from 'react';
import AdminLayout from '../layout/AdminLayout';
import WelcomeSection from '../Dashboard/WelcomeSection';
import StatCard from '../Dashboard/StatCard';
import RecentActivities from '../Dashboard/RecentActivities';
import UpcomingEvents from '../Dashboard/UpcomingEvents';
import LeadOverviewSection from '../Dashboard/LeadOverviewSection';
import QuickActions from '../Dashboard/QuickActions';
import DashboardInsights from '../Dashboard/DashboardInsights';
import LoadingSpinner from '../../Common/LoadingSpinner';
import { useDashboardData } from '../../../hooks/useDashboardData';
import { useRealTimeUpdates } from '../../../hooks/useRealTimeUpdates';
import { useAuth } from '../../../hooks/useAuth';

const AdminDashboard = () => {
  const { user } = useAuth();
  const {
    stats,
    recentActivities,
    upcomingEvents,
    loading,
    error,
    refreshData,
    attentionItems,
    taskHealth
  } = useDashboardData();

  const {
    lastUpdated,
    isAutoRefreshEnabled,
    toggleAutoRefresh,
    manualRefresh
  } = useRealTimeUpdates(refreshData);

  // Memoized components for performance
  const statsGrid = useMemo(() => (
    <div className="relative z-20 grid grid-cols-2 gap-2.5 overflow-visible sm:gap-4 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <StatCard key={stat.title} stat={stat} index={index} />
      ))}
    </div>
  ), [stats]);

  const contentGrid = useMemo(() => (
    <div className="grid grid-cols-1 gap-3.5 sm:gap-5 lg:grid-cols-2">
      <RecentActivities activities={recentActivities} loading={loading} />
      <UpcomingEvents events={upcomingEvents} loading={loading} />
    </div>
  ), [recentActivities, upcomingEvents, loading]);

  // Loading state
  if (loading && stats.length === 0) {
    return (
      <AdminLayout>
        <LoadingSpinner message="Loading dashboard..." />
      </AdminLayout>
    );
  }

  // Error state (still show dashboard with error message)
  if (error && stats.length === 0) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="text-red-400 text-xl mb-4">⚠️ Dashboard Error</div>
          <div className="text-white text-lg mb-6">{error}</div>
          <button 
            onClick={refreshData}
            className="px-6 py-3 bg-neon-pink text-white rounded-lg hover:bg-neon-pink/80 transition-colors"
          >
            Retry Loading
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-3.5 sm:space-y-5">
        {/* Control Bar */}
        {error && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-red-400 text-sm">
                ⚠️ Some data may be outdated
              </div>
            </div>
          </div>
        )}

        {/* Welcome Section */}
        <WelcomeSection
          userName={user?.name || 'Admin'}
          lastUpdated={lastUpdated}
          isAutoRefreshEnabled={isAutoRefreshEnabled}
          toggleAutoRefresh={toggleAutoRefresh}
          manualRefresh={manualRefresh}
          loading={loading}
        />

        {/* Stats Grid */}
        {statsGrid}

        {/* Dashboard Insights */}
        <div className="relative z-10">
          <DashboardInsights attentionItems={attentionItems} taskHealth={taskHealth} />
        </div>

        {/* Active Leads Overview Section */}
        <LeadOverviewSection />

        {/* Content Grid */}
        {contentGrid}

        {/* Quick Actions */}
        <QuickActions userRole={user?.role || 'admin'} />
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;

