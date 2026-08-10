import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import EmployeeLayout from '../../components/Employee/EmployeeLayout/EmployeeLayout';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  AlertCircle,
  FileText,
  User,
  X,
  Save,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const EmployeeLeaveRequests = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
 const [leaveBalance, setLeaveBalance] = useState({
  total: 30,
  used: 0,
  remaining: 30
});

  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [newLeave, setNewLeave] = useState({
    leaveType: 'casual',
    startDate: '',
    endDate: '',
    reason: '',
    isHalfDay: false,
    halfDaySession: 'Morning'
  });

  const leaveTypes = ['casual', 'sick', 'earned', 'emergency', 'personal'];

  // Fetch employee's leave requests
  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const response = await api.get('/leaves');
      
      if (response.data.success) {
        setLeaveRequests(response.data.leaves || []);
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      toast.error('Failed to fetch leave requests');
    } finally {
      setLoading(false);
    }
  };

// Update the fetchLeaveBalance function
const fetchLeaveBalance = async () => {
  try {
    const response = await api.get('/leaves/balance');
    
    if (response.data.success) {
      setLeaveBalance(response.data.balance);
    }
  } catch (error) {
    console.error('Error fetching leave balance:', error);
    toast.error('Failed to fetch leave balance');
  }
};

  useEffect(() => {
    fetchLeaveRequests();
    fetchLeaveBalance();
  }, []);

  const calculateDays = (start, end, isHalfDay) => {
    if (isHalfDay) return 0.5;
    if (!start || !end) return 0;
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

// Update the leave validation in handleApplyLeave
const handleApplyLeave = async (e) => {
  e.preventDefault();

  // Validate reason length
  if (newLeave.reason.trim().length < 10) {
    toast.error('Reason must be at least 10 characters long');
    return;
  }

  const totalDays = calculateDays(newLeave.startDate, newLeave.endDate, newLeave.isHalfDay);
  const availableBalance = leaveBalance.remaining || 0;

  if (totalDays > availableBalance) {
    toast.error(`Insufficient leave balance. Available: ${availableBalance} days`);
    return;
  }

  try {
    setSubmitLoading(true);
    const token = localStorage.getItem('token');
    
    const leaveData = {
      ...newLeave,
      leaveType: newLeave.leaveType.toLowerCase(),
      totalDays,
      endDate: newLeave.isHalfDay ? newLeave.startDate : newLeave.endDate
    };

    if (!newLeave.isHalfDay) delete leaveData.halfDaySession;

    console.log('Sending leave data:', leaveData); // Debug log

    const response = await api.post('/leaves', leaveData);

    if (response.data.success) {
      toast.success('Leave application submitted successfully!');
      setNewLeave({
        leaveType: 'casual',
        startDate: '',
        endDate: '',
        reason: '',
        isHalfDay: false,
        halfDaySession: 'Morning'
      });
      setShowModal(false);
      fetchLeaveRequests();
      fetchLeaveBalance();
    }
  } catch (error) {
    console.error('Error applying for leave:', error);
    console.error('Error response data:', error.response?.data); // Debug log
    console.error('Error response status:', error.response?.status); // Debug log
    if (error.response?.data?.errors) {
      console.error('Validation errors:', error.response.data.errors); // Debug log
      // Log each individual error
      error.response.data.errors.forEach((err, index) => {
        console.error(`Validation error ${index + 1}:`, err);
      });
    }
    toast.error(error.response?.data?.message || 'Failed to submit leave application');
  } finally {
    setSubmitLoading(false);
  }
};

  const handleCancelLeave = async (leaveId) => {
    if (window.confirm('Are you sure you want to cancel this leave request?')) {
      try {
        await api.put(`/leaves/${leaveId}/cancel`, {});
        
        toast.success('Leave request cancelled!');
        fetchLeaveRequests();
        fetchLeaveBalance();
      } catch (error) {
        console.error('Error cancelling leave:', error);
        toast.error(error.response?.data?.message || 'Failed to cancel leave request');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'text-amber-700 bg-amber-100';
      case 'approved': return 'text-green-700 bg-green-100';
      case 'rejected': return 'text-red-700 bg-red-100';
      case 'cancelled': return 'text-slate-600 bg-slate-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  const getLeaveTypeColor = (type) => {
    switch (type.toLowerCase()) {
      case 'casual': return 'bg-blue-100 text-blue-700';
      case 'sick': return 'bg-red-100 text-red-700';
      case 'earned': return 'bg-green-100 text-green-700';
      case 'emergency': return 'bg-orange-100 text-orange-700';
      default: return 'bg-indigo-100 text-indigo-700';
    }
  };

  const ApplyLeaveModal = () => (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4">
      {/* Enhanced backdrop with blur */}
      <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => !submitLoading && setShowModal(false)} />

      {/* Modal content */}
      <div className="relative flex max-h-[calc(100dvh-1rem)] w-full max-w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:max-h-[90vh] sm:max-w-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-3 py-2.5 sm:border-b-0 sm:px-6 sm:pb-0 sm:pt-6">
          <h2 className="text-base font-bold text-slate-900 sm:text-2xl">Apply for Leave</h2>
          <button 
            onClick={() => setShowModal(false)}
            className="rounded-lg p-1.5 text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-600"
            disabled={submitLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleApplyLeave} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3 pb-4 sm:space-y-6 sm:px-6 sm:py-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 sm:mb-2">Leave Type</label>
              <select
                value={newLeave.leaveType}
                onChange={(e) => setNewLeave({...newLeave, leaveType: e.target.value})}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:px-4 sm:py-3 sm:text-base"
                required
                disabled={submitLoading}
              >
                {leaveTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
  Available: {leaveBalance.remaining || 0} days
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-0 md:pt-8">
              <input
                type="checkbox"
                id="halfDay"
                checked={newLeave.isHalfDay}
                onChange={(e) => setNewLeave({...newLeave, isHalfDay: e.target.checked})}
                className="w-4 h-4 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500/30"
                disabled={submitLoading}
              />
              <label htmlFor="halfDay" className="text-sm text-slate-700">Half Day Leave</label>
            </div>
          </div>

          {newLeave.isHalfDay && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 sm:mb-2">Half Day Session</label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="halfDaySession"
                    value="Morning"
                    checked={newLeave.halfDaySession === 'Morning'}
                    onChange={(e) => setNewLeave({...newLeave, halfDaySession: e.target.value})}
                    className="w-4 h-4 text-blue-600"
                    disabled={submitLoading}
                  />
                  <span className="ml-2 text-slate-900">Morning</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="halfDaySession"
                    value="Evening"
                    checked={newLeave.halfDaySession === 'Evening'}
                    onChange={(e) => setNewLeave({...newLeave, halfDaySession: e.target.value})}
                    className="w-4 h-4 text-blue-600"
                    disabled={submitLoading}
                  />
                  <span className="ml-2 text-slate-900">Evening</span>
                </label>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 sm:mb-2">Start Date</label>
              <input
                type="date"
                value={newLeave.startDate}
                onChange={(e) => setNewLeave({...newLeave, startDate: e.target.value})}
                min={new Date().toISOString().split('T')[0]}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:px-4 sm:py-3 sm:text-base"
                required
                disabled={submitLoading}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 sm:mb-2">
                {newLeave.isHalfDay ? 'Date' : 'End Date'}
              </label>
              <input
                type="date"
                value={newLeave.isHalfDay ? newLeave.startDate : newLeave.endDate}
                onChange={(e) => setNewLeave({...newLeave, endDate: newLeave.isHalfDay ? newLeave.startDate : e.target.value})}
                min={newLeave.startDate || new Date().toISOString().split('T')[0]}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:px-4 sm:py-3 sm:text-base"
                required
                disabled={newLeave.isHalfDay || submitLoading}
              />
            </div>
          </div>

          {newLeave.startDate && (newLeave.endDate || newLeave.isHalfDay) && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 sm:p-4">
              <p className="text-sm text-slate-500">Total Days: 
                <span className="text-blue-600 font-medium ml-2">
                  {calculateDays(newLeave.startDate, newLeave.endDate || newLeave.startDate, newLeave.isHalfDay)} 
                  {newLeave.isHalfDay ? ' (Half Day)' : ' days'}
                </span>
              </p>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 sm:mb-2">Reason for Leave</label>
            <input
              type="text"
              value={newLeave.reason}
              onChange={(e) => setNewLeave({...newLeave, reason: e.target.value})}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:px-4 sm:py-3 sm:text-base"
              placeholder="Please provide reason for your leave request..."
              required
              disabled={submitLoading}
              maxLength={500}
              autoFocus
            />
            <p className="text-xs text-slate-400 mt-1">{newLeave.reason.length}/500 characters (minimum 10)</p>
          </div>

          </div>

          <div className="shrink-0 border-t border-slate-100 bg-white px-3 py-2.5 sm:flex sm:justify-end sm:gap-4 sm:border-t-0 sm:px-6 sm:pb-6 sm:pt-0">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end sm:gap-4">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition-all duration-200 hover:bg-slate-50 sm:px-6 sm:py-3 sm:text-base"
              disabled={submitLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex min-w-0 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md disabled:opacity-50 disabled:hover:scale-100 sm:px-6 sm:py-3 sm:text-base"
              disabled={submitLoading}
            >
              {submitLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              <span className="truncate">{submitLoading ? 'Submitting...' : 'Submit'}</span>
              <span className="hidden sm:inline">{!submitLoading && ' Application'}</span>
            </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  const ViewLeaveModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-2 backdrop-blur-sm sm:p-4">
      <div className="flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:max-h-[90vh]">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3 sm:border-b-0 sm:px-6 sm:pb-0 sm:pt-6">
          <h2 className="text-lg font-bold text-slate-900 sm:text-2xl">Leave Request Details</h2>
          <button
            onClick={() => setShowViewModal(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {selectedLeave && (
          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3 sm:space-y-6 sm:px-6 sm:py-6">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 sm:text-lg">{selectedLeave.leaveType} Leave</h3>
                <p className="text-xs text-slate-500 sm:text-base">Applied on {new Date(selectedLeave.appliedDate).toLocaleDateString()}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs sm:px-3 sm:text-sm ${getStatusColor(selectedLeave.status)}`}>
                {selectedLeave.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-6">
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="text-sm text-slate-500">Start Date</label>
                  <p className="text-slate-900 font-medium">{new Date(selectedLeave.startDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-500">End Date</label>
                  <p className="text-slate-900 font-medium">{new Date(selectedLeave.endDate).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="text-sm text-slate-500">Total Days</label>
                  <p className="text-slate-900 font-medium">
                    {selectedLeave.isHalfDay ? `0.5 day (${selectedLeave.halfDaySession})` : `${selectedLeave.totalDays} days`}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-slate-500">Status</label>
                  <span className={`inline-block px-3 py-1 text-xs rounded-full ${getStatusColor(selectedLeave.status)}`}>
                    {selectedLeave.status}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-500">Reason</label>
              <p className="mt-1 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-900 sm:p-3 sm:text-base">{selectedLeave.reason}</p>
            </div>

            {selectedLeave.adminComments && (
              <div>
                <label className="text-sm text-slate-500">Admin Comments</label>
                <p className="mt-1 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-900 sm:p-3 sm:text-base">{selectedLeave.adminComments}</p>
              </div>
            )}

            {selectedLeave.actionDate && selectedLeave.status !== 'pending' && (
              <div>
                <label className="text-sm text-slate-500">Action Date</label>
                <p className="text-slate-900 font-medium">{new Date(selectedLeave.actionDate).toLocaleDateString()}</p>
              </div>
            )}

            {selectedLeave.status === 'Pending' && (
              <div className="sticky bottom-0 -mx-3 flex justify-end border-t border-slate-100 bg-white px-3 pt-2 sm:static sm:mx-0 sm:border-t-0 sm:px-0 sm:pt-0">
                <button
                  onClick={() => {
                    handleCancelLeave(selectedLeave._id);
                    setShowViewModal(false);
                  }}
                  className="w-full rounded-lg border border-red-300 bg-white px-4 py-2 text-sm text-red-600 transition-all duration-200 hover:bg-red-50 sm:w-auto sm:px-6 sm:py-3 sm:text-base"
                >
                  Cancel Request
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const CalendarModal = () => {
    const getLeaveDates = () => {
      const dates = [];
      leaveRequests.forEach(leave => {
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          dates.push({
            date: new Date(d),
            status: leave.status,
            type: leave.leaveType
          });
        }
      });
      return dates;
    };

    const leaveDates = getLeaveDates();

    const tileClassName = ({ date, view }) => {
      if (view === 'month') {
        const leaveDate = leaveDates.find(d =>
          d.date.toDateString() === date.toDateString()
        );
        if (leaveDate) {
          switch (leaveDate.status.toLowerCase()) {
            case 'approved': return 'employee-leave-calendar-approved';
            case 'pending': return 'employee-leave-calendar-pending';
            case 'rejected': return 'employee-leave-calendar-rejected';
            case 'cancelled': return 'employee-leave-calendar-cancelled';
            default: return '';
          }
        }
      }
      return '';
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-2 backdrop-blur-sm sm:p-4">
        <div className="employee-leave-calendar-modal flex max-h-[calc(100dvh-1rem)] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:max-h-[90vh]">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3 sm:border-b-0 sm:px-6 sm:pb-0 sm:pt-6">
            <h2 className="text-lg font-bold text-slate-900 sm:text-2xl">Leave Calendar</h2>
            <button
              onClick={() => setShowCalendarModal(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          <div className="mb-4">
            <div className="flex flex-wrap gap-3 text-xs sm:gap-4 sm:text-sm">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-100 rounded mr-2"></div>
                <span className="text-slate-500">Approved</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-amber-100 rounded mr-2"></div>
                <span className="text-slate-500">Pending</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-100 rounded mr-2"></div>
                <span className="text-slate-500">Rejected</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-slate-100 rounded mr-2"></div>
                <span className="text-slate-500">Cancelled</span>
              </div>
            </div>
          </div>

          <Calendar
            tileClassName={tileClassName}
            className="employee-leave-calendar w-full rounded-lg p-2 sm:p-4"
          />
          </div>
        </div>
      </div>
    );
  };

  const getLeaveStats = () => {
    const approved = leaveRequests.filter(l => l.status === 'Approved').length;
    const pending = leaveRequests.filter(l => l.status === 'Pending').length;
    const rejected = leaveRequests.filter(l => l.status === 'Rejected').length;
    const cancelled = leaveRequests.filter(l => l.status === 'Cancelled').length;
    
    return { approved, pending, rejected, cancelled, total: leaveRequests.length };
  };

  const stats = getLeaveStats();

  return (
    <EmployeeLayout>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-enter {
          animation: fadeSlideUp 0.4s ease-out both;
        }
      `}</style>
      <div className="space-y-6 bg-slate-50">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Leave Requests</h1>
            <p className="text-slate-500">Manage your leave applications</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Apply for Leave
          </button>
        </div>
{/* // Update the JSX for Leave Balance Card (keep only one card) */}
{/* Leave Balance Card - Single Total Card */}
<div className="grid grid-cols-1 gap-6">
  <div className="animate-enter bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-bold text-slate-900">Total Leave Balance</h3>
      <CalendarIcon className="w-6 h-6 text-blue-600 cursor-pointer" onClick={() => setShowCalendarModal(true)} />
    </div>
    <div className="space-y-2">
      <div className="flex justify-between">
        <span className="text-slate-500">Total Allocated</span>
        <span className="text-slate-900 font-medium">{leaveBalance.total}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-500">Used</span>
        <span className="text-red-600 font-medium">{leaveBalance.used}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-500">Remaining</span>
        <span className="text-green-600 font-medium">{leaveBalance.remaining}</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 mt-3">
        <div 
          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${leaveBalance.total > 0 ? (leaveBalance.used / leaveBalance.total) * 100 : 0}%` }}
        />
      </div>
    </div>
  </div>
</div>

        {/* Leave Requests Table */}
        <div className="animate-enter bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden" style={{ animationDelay: '80ms' }}>
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">My Leave Requests</h2>
          </div>
          
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 text-blue-600 mx-auto mb-4 animate-spin" />
              <p className="text-slate-500">Loading your leave requests...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] sm:min-w-full">
            <thead className="bg-white border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="text-left p-4 sm:p-6 text-slate-600 font-semibold">Leave Type</th>
                <th className="text-left p-4 sm:p-6 text-slate-600 font-semibold">Duration</th>
                <th className="hidden sm:table-cell text-left p-4 sm:p-6 text-slate-600 font-semibold">Applied Date</th>
                <th className="text-left p-4 sm:p-6 text-slate-600 font-semibold">Status</th>
                <th className="text-left p-4 sm:p-6 text-slate-600 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {leaveRequests.map((leave) => (
                <tr key={leave._id} className="hover:bg-blue-50 transition-all duration-200">
                  <td className="p-4 sm:p-6">
                    <span className={`px-2 sm:px-3 py-1 text-sm rounded-full ${getLeaveTypeColor(leave.leaveType)}`}>
                      {leave.leaveType}
                    </span>
                  </td>
                  <td className="p-4 sm:p-6 text-slate-900">
                    <div>
                      <p>{new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}</p>
                      <p className="text-sm text-slate-500">
                        {leave.isHalfDay ? `0.5 day (${leave.halfDaySession})` : `${leave.totalDays} days`}
                      </p>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell p-4 sm:p-6 text-slate-500">
                    {new Date(leave.appliedDate).toLocaleDateString()}
                  </td>
                  <td className="p-4 sm:p-6">
                    <span className={`px-2 sm:px-3 py-1 text-xs rounded-full ${getStatusColor(leave.status)}`}>
                      {leave.status}
                    </span>
                  </td>
                  <td className="p-4 sm:p-6">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedLeave(leave);
                          setShowViewModal(true);
                        }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {leave.status === 'Pending' && (
                        <button
                          onClick={() => handleCancelLeave(leave._id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                          title="Cancel Request"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
            </div>
          )}

          {!loading && leaveRequests.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <CalendarIcon className="w-7 h-7 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-500 mb-2">No leave requests</h3>
              <p className="text-slate-400">You haven't applied for any leaves yet.</p>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="animate-enter bg-white border border-slate-200 shadow-sm rounded-2xl p-6" style={{ animationDelay: '120ms' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Leave Statistics</h2>
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-500">Total Applications</span>
                <span className="text-slate-900 font-bold">{stats.total}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-500">Approved</span>
                <span className="text-green-600 font-bold">{stats.approved}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-500">Pending</span>
                <span className="text-amber-600 font-bold">{stats.pending}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-500">Rejected</span>
                <span className="text-red-600 font-bold">{stats.rejected}</span>
              </div>
            </div>
          </div>

          <div className="animate-enter bg-white border border-slate-200 shadow-sm rounded-2xl p-6" style={{ animationDelay: '160ms' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Recent Activity</h2>
              <Clock className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="space-y-4">
              {leaveRequests.slice(0, 4).map((leave) => (
                <div key={leave._id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div>
                    <p className="text-slate-900 font-medium">{leave.leaveType} Leave</p>
                    <p className="text-sm text-slate-500">
                      {leave.isHalfDay ? `0.5 day` : `${leave.totalDays} days`} • {new Date(leave.appliedDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(leave.status)}`}>
                    {leave.status}
                  </span>
                </div>
              ))}
              {leaveRequests.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-slate-400">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showModal && <ApplyLeaveModal />}
      {showViewModal && <ViewLeaveModal />}
      {showCalendarModal && <CalendarModal />}
    </EmployeeLayout>
  );
};

export default EmployeeLeaveRequests;
