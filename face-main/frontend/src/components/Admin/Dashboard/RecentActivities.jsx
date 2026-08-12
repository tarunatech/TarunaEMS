// components/Dashboard/RecentActivities.js
import React from 'react';
import { Clock, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RecentActivities = ({ activities = [], loading = false }) => {
  const navigate = useNavigate();

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

  const getActivityPath = (activity) => {
    const category = String(activity?.category || '').toLowerCase();
    const action = String(activity?.action || activity?.description || '').toLowerCase();

    if (category.includes('leave') || action.includes('leave')) return '/admin/leaves';
    if (category.includes('employee') || action.includes('employee')) return '/admin/employees';
    if (category.includes('task') || action.includes('task')) return '/admin/tasks';
    if (category.includes('attendance') || action.includes('attendance')) return '/admin/attendance';
    if (category.includes('department') || action.includes('department')) return '/admin/department';
    if (category.includes('payslip') || action.includes('payslip')) return '/admin/payslips';
    if (category.includes('holiday') || action.includes('holiday')) return '/admin/holidays';
    if (category.includes('expense') || action.includes('expense')) return '/admin/expense-tracker';

    return '/admin/dashboard';
  };

  const handleActivityClick = (activity) => {
    navigate(getActivityPath(activity));
  };

  if (loading) {
    return (
      <div className="dashboard-panel bg-white border border-slate-200/70 rounded-2xl p-4 sm:p-6 shadow-[0_10px_28px_rgba(15,23,42,0.07)]">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">Recent Activities</h2>
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
      <div className="dashboard-panel relative overflow-hidden bg-white border border-slate-200/70 rounded-2xl p-4 sm:p-6 shadow-[0_10px_28px_rgba(15,23,42,0.07)]">
        <div className="dashboard-card-wash absolute -top-20 -right-20 h-40 w-40 rounded-full bg-violet-50" />
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="relative text-base sm:text-lg font-bold text-slate-950">Recent Activities</h2>
          <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />
          </div>
        </div>
      <div className="scrollbar-hide relative space-y-2 sm:space-y-4 max-h-[18rem] sm:max-h-80 overflow-y-auto overscroll-contain">
        {activities.length > 0 ? (
          activities.map((activity, index) => (
            <button
              type="button"
              key={activity.id || index} 
              onClick={() => handleActivityClick(activity)}
              className="dashboard-soft-row group flex w-full items-start space-x-3 rounded-xl p-2.5 text-left transition-all duration-200 hover:bg-violet-50/60 focus:outline-none focus:ring-2 focus:ring-violet-500/30 sm:p-3"
              title={`Open ${activity.category || 'activity'} page`}
            >
              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getActivityTypeStyles(activity.type)} shadow-sm`}></div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-800 text-xs sm:text-sm leading-relaxed group-hover:text-violet-700 transition-colors">
                  {activity.action || activity.description}
                </p>
                {activity.user && (
                  <p className="text-violet-600 text-xs sm:text-sm font-medium mt-1">
                    {activity.user}
                  </p>
                )}
                {activity.category === 'task' && activity.details && (
                  <div className="mt-2 rounded-lg border border-slate-200/80 bg-white/80 px-3 py-1">
                    <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-600">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                        {/* <UserRound className="h-3.5 w-3.5 text-violet-500" /> */}
                        {/* {activity.details.employeeName} */}
                         Task :{activity.description && (
                      <p className="mt- text-[11px] leading-relaxed text-slate-500">
                        {activity.description}
                      </p>
                    )}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 font-semibold ${
                        activity.details.timingStatus === 'late'
                          ? 'bg-red-50 text-red-600 ring-1 ring-red-100'
                          : 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100'
                      }`}>
                        {activity.details.timingStatus === 'late' ? 'Late / Overdue' : 'On time'}
                      </span>
                    </div>
                   
                  </div>
                )}
                <p className="text-slate-500 text-xs mt-1">
                  {formatActivityTime(activity.time || activity.timestamp || activity.createdAt)}
                </p>
              </div>
            </button>
          ))
        ) : (
          <div className="text-center py-8 sm:py-12">
            <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 mx-auto mb-3 sm:mb-4" />
            <p className="text-slate-600 text-base sm:text-lg">No recent activities</p>
            <p className="text-slate-500 text-sm mt-2">Activities will appear here as they happen</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentActivities;
