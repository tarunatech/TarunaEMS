// components/Dashboard/RecentActivities.js
import React from 'react';
import { Clock } from 'lucide-react';

const RecentActivities = ({ activities = [], loading = false }) => {
  const getActivityTypeStyles = (type) => {
    const styles = {
      success: 'bg-green-400',
      warning: 'bg-yellow-400',
      info: 'bg-blue-400',
      error: 'bg-red-400'
    };
    return styles[type] || styles.info;
  };

  const formatActivityTime = (timeString) => {
    if (!timeString || timeString === 'Invalid Date') return 'Unknown time';
    try {
      const time = new Date(timeString);
      if (isNaN(time.getTime())) return 'Unknown time';
      const now = new Date();
      const diffInMinutes = Math.floor((now - time) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
      
      return time.toLocaleDateString();
    } catch {
      return 'Unknown time';
    }
  };

  if (loading) {
    return (
      <div className="dashboard-panel bg-white border border-slate-200/70 rounded-2xl p-6 shadow-[0_10px_28px_rgba(15,23,42,0.07)]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Recent Activities</h2>
          <Clock className="w-5 h-5 text-blue-600 animate-pulse" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-start space-x-3 p-3 rounded-lg">
                <div className="w-2 h-2 bg-slate-300 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 rounded mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2 mb-1"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
      <div className="dashboard-panel relative overflow-hidden bg-white border border-slate-200/70 rounded-2xl p-6 shadow-[0_10px_28px_rgba(15,23,42,0.07)]">
        <div className="dashboard-card-wash absolute -top-20 -right-20 h-40 w-40 rounded-full bg-violet-50" />
        <div className="flex items-center justify-between mb-6">
          <h2 className="relative text-lg font-bold text-slate-950">Recent Activities</h2>
          <div className="relative w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center">
            <Clock className="w-5 h-5 text-violet-600" />
          </div>
        </div>
      <div className="relative space-y-4 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300">
        {activities.length > 0 ? (
          activities.map((activity, index) => (
            <div 
              key={activity.id || index} 
              className="dashboard-soft-row flex items-start space-x-3 p-3 rounded-xl hover:bg-violet-50/60 transition-all duration-200 cursor-pointer group"
            >
              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getActivityTypeStyles(activity.type)} shadow-sm`}></div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-800 text-sm leading-relaxed group-hover:text-violet-700 transition-colors">
                  {activity.action || activity.description}
                </p>
                {activity.user && (
                  <p className="text-violet-600 text-sm font-medium mt-1">
                    {activity.user}
                  </p>
                )}
                <p className="text-slate-500 text-xs mt-1">
                  {formatActivityTime(activity.time || activity.timestamp || activity.createdAt)}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 text-lg">No recent activities</p>
            <p className="text-slate-500 text-sm mt-2">Activities will appear here as they happen</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentActivities;
