import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import AdminLayout from '../../components/Admin/layout/AdminLayout';
import api from '../../utils/api';
import {
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  User,
  Loader2,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import './AdminHolidayCalendar.css';

const AdminHolidayCalendar = () => {
  const [date, setDate] = useState(new Date());
  const [holidays, setHolidays] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHoliday, setNewHoliday] = useState({
    title: '',
    date: '',
    description: '',
    type: 'Public'
  });

  const fetchData = async () => {
    try {
      const [holidayRes, leaveRes] = await Promise.all([
        api.get('/holidays'),
        api.get('/leaves', { params: { status: 'Approved', limit: 1000 } })
      ]);

      if (holidayRes.data.success) {
        setHolidays(holidayRes.data.holidays);
      }
      if (leaveRes.data.success) {
        setLeaves(leaveRes.data.leaves);
      }
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      toast.error('Failed to load calendar data');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/holidays', newHoliday);
      if (response.data.success) {
        toast.success('Holiday added successfully');
        setShowAddModal(false);
        setNewHoliday({ title: '', date: '', description: '', type: 'Public' });
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add holiday');
    }
  };

  const handleDeleteHoliday = async (id) => {
    if (window.confirm('Are you sure you want to delete this holiday?')) {
      try {
        await api.delete(`/holidays/${id}`);
        toast.success('Holiday deleted successfully');
        fetchData();
      } catch {
        toast.error('Failed to delete holiday');
      }
    }
  };

  const formatDate = (input) => {
    const d = new Date(input);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const formatUTCDate = (input) => {
    const d = new Date(input);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  };

  const formatCalendarDay = (_, day) => String(day.getDate());

  const tileContent = ({ date, view }) => {
    if (view !== 'month') return null;

    const dateString = formatDate(date);
    const dayHolidays = holidays.filter(h => formatUTCDate(h.date) === dateString);
    const dayLeaves = leaves.filter(l => {
      const start = formatUTCDate(l.startDate);
      const end = formatUTCDate(l.endDate);
      return dateString >= start && dateString <= end;
    });

    return (
      <div className="flex flex-col items-center mt-1 space-y-1">
        {dayHolidays.length > 0 && (
          <div className="w-2 h-2 bg-blue-600 rounded-full" title={dayHolidays.map(h => h.title).join(', ')}></div>
        )}
        {dayLeaves.length > 0 && (
          <div className="w-2 h-2 bg-slate-400 rounded-full" title={`${dayLeaves.length} leaves`}></div>
        )}
      </div>
    );
  };

  const selectedDateHolidays = holidays.filter(h => formatUTCDate(h.date) === formatDate(date));
  const selectedDateLeaves = leaves.filter(l => {
    const dateString = formatDate(date);
    const start = formatUTCDate(l.startDate);
    const end = formatUTCDate(l.endDate);
    return dateString >= start && dateString <= end;
  });

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6 bg-slate-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">Holiday & Leave Calendar</h1>
            <p className="text-sm sm:text-base text-slate-500 mt-1">View and manage company holidays and employee leaves</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto justify-center px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-all duration-200 flex items-center hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Holiday
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 shadow-sm rounded-xl p-3 sm:p-6 min-w-0">
            <Calendar
              onChange={setDate}
              value={date}
              formatDay={formatCalendarDay}
              tileContent={tileContent}
              className="admin-calendar w-full bg-transparent border-none text-slate-900"
            />

            <div className="mt-4 sm:mt-6 flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                <span className="text-slate-500">Public Holiday</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-slate-400 rounded-full"></div>
                <span className="text-slate-500">Employee Leave</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6 min-w-0">
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-4 flex items-center">
                <CalendarIcon className="w-5 h-5 mr-2 text-blue-600" />
                {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </h2>

              <div className="space-y-4 max-h-none sm:max-h-[28rem] sm:overflow-y-auto sm:pr-1">
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Holidays</h3>
                  {selectedDateHolidays.length > 0 ? (
                    selectedDateHolidays.map(h => (
                      <div key={h._id} className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl p-3">
                        <div className="min-w-0">
                          <p className="text-slate-900 font-medium truncate">{h.title}</p>
                          <p className="text-xs text-slate-500">{h.type}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteHoliday(h._id)}
                          className="text-slate-500 hover:text-red-600 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 italic">No holidays scheduled</p>
                  )}
                </div>

                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Employee Leaves</h3>
                  {selectedDateLeaves.length > 0 ? (
                    <div className="space-y-2">
                      {selectedDateLeaves.map(l => (
                        <div key={l._id} className="flex items-center space-x-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
                          <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-900 text-sm font-medium truncate">
                              {l.employee?.fullName || l.employee?.user?.name || 'Unknown'}
                            </p>
                            <p className="text-xs text-slate-500">{l.leaveType}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No leaves on this date</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-4">Upcoming Holidays</h2>
              <div className="space-y-3">
                {holidays
                  .filter(h => new Date(h.date) >= new Date())
                  .slice(0, 5)
                  .map(h => (
                    <div key={h._id} className="flex items-center justify-between gap-3 p-2 border-b border-slate-100">
                      <div className="min-w-0">
                        <p className="text-slate-900 text-sm font-medium truncate">{h.title}</p>
                        <p className="text-xs text-slate-500">{new Date(h.date).toLocaleDateString()}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 flex-shrink-0">
                        {h.type}
                      </span>
                    </div>
                  ))}
                {holidays.length === 0 && <p className="text-sm text-slate-500">No upcoming holidays</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/20" onClick={() => setShowAddModal(false)}></div>
          <div className="relative bg-white border border-slate-200 shadow-xl rounded-2xl p-4 sm:p-6 w-full max-w-md max-h-[calc(100dvh-1.5rem)] overflow-y-auto">
            <div className="flex items-center justify-between gap-3 mb-5 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Add Company Holiday</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-900">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddHoliday} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Holiday Title</label>
                <input
                  type="text"
                  required
                  value={newHoliday.title}
                  onChange={(e) => setNewHoliday({ ...newHoliday, title: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                  placeholder="e.g., New Year's Day"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={newHoliday.date}
                    onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Type</label>
                  <select
                    value={newHoliday.type}
                    onChange={(e) => setNewHoliday({ ...newHoliday, type: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                  >
                    <option value="Public">Public</option>
                    <option value="Optional">Optional</option>
                    <option value="Company">Company</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Description (Optional)</label>
                <textarea
                  value={newHoliday.description}
                  onChange={(e) => setNewHoliday({ ...newHoliday, description: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none resize-none"
                  placeholder="Add some details..."
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-all duration-200 hover:-translate-y-0.5"
              >
                Save Holiday
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminHolidayCalendar;
