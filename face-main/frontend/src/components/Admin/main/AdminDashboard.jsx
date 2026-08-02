// components/Dashboard/AdminDashboard.js
import React, { useMemo, useState } from 'react';
import AdminLayout from '../layout/AdminLayout';
import WelcomeSection from '../Dashboard/WelcomeSection';
import StatCard from '../Dashboard/StatCard';
import RecentActivities from '../Dashboard/RecentActivities';
import UpcomingEvents from '../Dashboard/UpcomingEvents';
import QuickActions from '../Dashboard/QuickActions';
import LoadingSpinner from '../../Common/LoadingSpinner';
import FloatingChatButton from './FloatingChatButton';
import AdminChatbot from './AdminChatbot';
import { useDashboardData } from '../../../hooks/useDashboardData';
import { useRealTimeUpdates } from '../../../hooks/useRealTimeUpdates';
import { useAuth } from '../../../hooks/useAuth';

const AdminDashboard = () => {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const {
    stats,
    recentActivities,
    upcomingEvents,
    loading,
    error,
    refreshData
  } = useDashboardData();

  const {
    lastUpdated,
    isAutoRefreshEnabled,
    toggleAutoRefresh,
    manualRefresh
  } = useRealTimeUpdates(refreshData);

  const [isChatOpen, setIsChatOpen] = useState(false);

  // Memoized components for performance
  const statsGrid = useMemo(() => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <StatCard key={stat.title} stat={stat} index={index} />
      ))}
    </div>
  ), [stats]);

  const contentGrid = useMemo(() => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
      <div className="space-y-6">
        {/* Control Bar */}
        {error && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {error && (
              <div className="text-red-400 text-sm">
                ⚠️ Some data may be outdated
              </div>
            )}
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

        {/* Content Grid */}
        {contentGrid}

        {/* Quick Actions */}
        <QuickActions userRole={user?.role || 'admin'} />
      </div>

      {/* Floating Chat Button */}
      <FloatingChatButton
        isAdmin={isAdmin}
        onClick={() => setIsChatOpen(true)}
      />

      {/* Admin Chatbot */}
      <AdminChatbot
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        isAdmin={isAdmin}
      />
    </AdminLayout>
  );
};

export default AdminDashboard;
