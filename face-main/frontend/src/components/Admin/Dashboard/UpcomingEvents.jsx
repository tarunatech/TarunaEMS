import React from 'react';
import { Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UpcomingEvents = ({ events = [], loading = false }) => {
  const navigate = useNavigate();

  const formatEventDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const isToday = date.toDateString() === today.toDateString();
      const isTomorrow = date.toDateString() === tomorrow.toDateString();

      if (isToday) return 'Today';
      if (isTomorrow) return 'Tomorrow';

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString || 'Unknown date';
    }
  };

  const getDepartmentColor = (department) => {
    const colors = {
      HR: 'bg-pink-50 text-pink-700 border border-pink-100',
      IT: 'bg-blue-50 text-blue-700 border border-blue-100',
      Finance: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
      Marketing: 'bg-violet-50 text-violet-700 border border-violet-100',
      Operations: 'bg-orange-50 text-orange-700 border border-orange-100',
      Sales: 'bg-amber-50 text-amber-700 border border-amber-100'
    };
    return colors[department] || 'bg-slate-100 text-slate-500 border border-slate-200';
  };

  const isEventSoon = (dateString, timeString) => {
    try {
      const eventDate = new Date(`${dateString} ${timeString}`);
      const now = new Date();
      const diffInHours = (eventDate - now) / (1000 * 60 * 60);
      return diffInHours <= 24 && diffInHours > 0;
    } catch {
      return false;
    }
  };

  const getEventPath = (event) => {
    const type = String(event?.type || '').toLowerCase();
    const title = String(event?.title || event?.description || '').toLowerCase();

    if (type.includes('leave') || title.includes('leave')) return '/admin/leaves';
    if (type.includes('task') || title.includes('task')) return '/admin/tasks';
    if (type.includes('attendance') || title.includes('attendance')) return '/admin/attendance';
    if (type.includes('employee') || title.includes('employee')) return '/admin/employees';
    if (type.includes('department') || title.includes('department')) return '/admin/department';
    if (type.includes('holiday') || title.includes('holiday')) return '/admin/holidays';
    if (type.includes('payslip') || title.includes('payslip')) return '/admin/payslips';
    if (type.includes('expense') || title.includes('expense')) return '/admin/expense-tracker';

    return '/admin/dashboard';
  };

  const handleEventClick = (event) => {
    navigate(getEventPath(event));
  };

  if (loading) {
    return (
      <div className="dashboard-panel bg-white border border-slate-200/70 rounded-2xl p-4 sm:p-6 shadow-[0_10px_28px_rgba(15,23,42,0.07)]">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">Upcoming Events</h2>
          <Calendar className="w-5 h-5 text-blue-600 animate-pulse" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="p-4 rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-6 bg-slate-200 rounded-full w-16"></div>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="h-3 bg-slate-200 rounded w-20"></div>
                  <div className="h-3 bg-slate-200 rounded w-16"></div>
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
      <div className="dashboard-card-wash absolute -top-20 -right-20 h-40 w-40 rounded-full bg-pink-50" />
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="relative text-base sm:text-lg font-bold text-slate-950">Upcoming Events</h2>
        <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-pink-50 border border-pink-100 flex items-center justify-center">
          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-pink-600" />
        </div>
      </div>
      <div className="scrollbar-hide relative space-y-3 sm:space-y-4 max-h-[18rem] sm:max-h-80 overflow-y-auto overscroll-contain">
        {events.length > 0 ? (
          events.map((event, index) => (
            <button
              type="button"
              key={event.id || index}
              onClick={() => handleEventClick(event)}
              className={`dashboard-sub-card group w-full rounded-xl border p-3 text-left shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-pink-500/30 sm:p-4 ${
                isEventSoon(event.date, event.time)
                  ? 'border-pink-200 bg-pink-50/60 hover:border-pink-300'
                  : 'border-slate-200 hover:border-pink-200 hover:bg-pink-50/40'
              }`}
              title={`Open ${event.type || 'event'} page`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <h4 className="text-slate-900 text-sm sm:text-base font-medium group-hover:text-pink-700 transition-colors truncate flex-1">
                  {event.title}
                </h4>
                {event.department && (
                  <span className={`text-[11px] sm:text-xs px-2 py-1 rounded-full flex-shrink-0 ${getDepartmentColor(event.department)}`}>
                    {event.department}
                  </span>
                )}
              </div>
              <div className="flex items-start justify-between gap-2 text-xs sm:text-sm text-slate-500">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatEventDate(event.date)}
                  </span>
                  {event.time && (
                    <span className="flex items-center">
                      🕐 {event.time}
                    </span>
                  )}
                </div>
                {isEventSoon(event.date, event.time) && (
                  <span className="text-xs px-2 py-1 bg-pink-50 text-pink-700 rounded-full border border-pink-100 animate-pulse">
                    Soon
                  </span>
                )}
              </div>
              {event.description && (
                <p className="text-slate-500 text-xs mt-2 line-clamp-2">
                  {event.description}
                </p>
              )}
            </button>
          ))
        ) : (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 text-lg">No upcoming events</p>
            <p className="text-slate-500 text-sm mt-2">Events will be displayed here when scheduled</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpcomingEvents;
