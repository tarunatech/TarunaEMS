import React, { useState, useEffect } from 'react';
import ReactCalendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import api from '../../utils/api';
import AdminLayout from '../../components/Admin/layout/AdminLayout';
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Filter,
  Download,
  User,
  FileText,
  Loader
} from 'lucide-react';
import toast from 'react-hot-toast';
import SearchWithSuggestions from '../../components/Common/SearchWithSuggestions';

const AdminLeaveManagement = () => {
  const leaveTypeOptions = [
    { value: 'casual', label: 'Casual' },
    { value: 'sick', label: 'Sick' },
    { value: 'earned', label: 'Earned' },
    { value: 'emergency', label: 'Emergency' },
    { value: 'personal', label: 'Personal' }
  ];

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('');
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const response = await api.get('/leaves', {
        params: {
          search: searchTerm,
          status: statusFilter,
          leaveType: leaveTypeFilter
        }
      });

      if (response.data.success) {
        setLeaves(response.data.leaves || []);
      }
    } catch (error) {
      console.error('Error fetching leaves:', error);
      toast.error('Failed to fetch leave applications');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/leaves/stats');
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching leave stats:', error);
    }
  };

  useEffect(() => {
    fetchLeaves();
    fetchStats();
  }, [searchTerm, statusFilter, leaveTypeFilter]);

  const handleApprove = async (leaveId, comments = '') => {
    try {
      setActionLoading(true);
      await api.put(`/leaves/${leaveId}/approve`, { comments });
      toast.success('Leave application approved!');
      fetchLeaves();
      fetchStats();
      setShowModal(false);
    } catch (error) {
      console.error('Error approving leave:', error);
      toast.error(error.response?.data?.message || 'Failed to approve leave');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (leaveId, comments = '') => {
    try {
      setActionLoading(true);
      await api.put(`/leaves/${leaveId}/reject`, { comments });
      toast.success('Leave application rejected!');
      fetchLeaves();
      fetchStats();
      setShowModal(false);
    } catch (error) {
      console.error('Error rejecting leave:', error);
      toast.error(error.response?.data?.message || 'Failed to reject leave');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'text-yellow-700 bg-yellow-100 border border-yellow-200';
      case 'approved': return 'text-green-700 bg-green-100 border border-green-200';
      case 'rejected': return 'text-red-700 bg-red-100 border border-red-200';
      case 'cancelled': return 'text-slate-700 bg-slate-100 border border-slate-200';
      default: return 'text-slate-700 bg-slate-100 border border-slate-200';
    }
  };

  const isInteractiveClick = (event) =>
    event.target.closest('button, a, input, select, textarea, label');

  const openLeaveDetails = (event, leave) => {
    if (isInteractiveClick(event)) return;
    setSelectedLeave(leave);
    setShowModal(true);
  };

  const getLeaveTypeColor = (type) => {
    switch (type.toLowerCase()) {
      case 'casual': return 'bg-blue-100 text-blue-700 border border-blue-200';
      case 'sick': return 'bg-red-100 text-red-700 border border-red-200';
      case 'earned': return 'bg-green-100 text-green-700 border border-green-200';
      case 'emergency': return 'bg-orange-100 text-orange-700 border border-orange-200';
      default: return 'bg-purple-100 text-purple-700 border border-purple-200';
    }
  };

  const getEmployeeName = (employee) => {
    if (!employee) return 'Unknown Employee';
    if (employee.fullName) return employee.fullName;
    if (employee.personalInfo?.firstName || employee.personalInfo?.lastName) {
      return `${employee.personalInfo?.firstName || ''} ${employee.personalInfo?.lastName || ''}`.trim();
    }
    return employee.user?.name || 'Unknown Employee';
  };

  const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
  };

  const getEmployeeId = (employee) => (
    employee?.employeeId ||
    employee?.user?.employeeId ||
    ''
  );

  const escapeCsvValue = (value) => {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
  };

  const exportLeaveReport = () => {
    if (leaves.length === 0) {
      toast.error('No leave applications to export');
      return;
    }

    const rows = [
      [
        'Employee Name',
        'Employee ID',
        'Leave Type',
        'Start Date',
        'End Date',
        'Total Days',
        'Half Day',
        'Half Day Session',
        'Applied Date',
        'Status',
        'Reason',
        'Approver Comments'
      ],
      ...leaves.map((leave) => [
        getEmployeeName(leave.employee),
        getEmployeeId(leave.employee),
        leave.leaveType,
        formatDate(leave.startDate),
        formatDate(leave.endDate),
        leave.isHalfDay ? '0.5' : leave.totalDays,
        leave.isHalfDay ? 'Yes' : 'No',
        leave.halfDaySession || '',
        formatDate(leave.appliedDate),
        leave.status,
        leave.reason,
        leave.approverComments
      ])
    ];

    const csv = rows
      .map((row) => row.map(escapeCsvValue).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    const reportDate = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `leave_report_${reportDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success('Leave report exported successfully');
  };

  const isSameDate = (a, b) => a.toDateString() === b.toDateString();

  const getLeavesForDate = (date) => {
    return leaves.filter((leave) => {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    });
  };

  const getCalendarStatusClass = (dayLeaves) => {
    if (dayLeaves.some((leave) => leave.status?.toLowerCase() === 'pending')) return 'admin-leave-calendar-pending';
    if (dayLeaves.some((leave) => leave.status?.toLowerCase() === 'approved')) return 'admin-leave-calendar-approved';
    if (dayLeaves.some((leave) => leave.status?.toLowerCase() === 'rejected')) return 'admin-leave-calendar-rejected';
    if (dayLeaves.some((leave) => leave.status?.toLowerCase() === 'cancelled')) return 'admin-leave-calendar-cancelled';
    return null;
  };

  const LeaveCalendarModal = () => {
    const selectedDayLeaves = getLeavesForDate(selectedCalendarDate);

    const tileClassName = ({ date, view }) => {
      if (view !== 'month') return null;

      const dayLeaves = getLeavesForDate(date);
      const statusClass = getCalendarStatusClass(dayLeaves);
      const selectedClass = isSameDate(date, selectedCalendarDate) ? 'admin-leave-calendar-selected' : '';

      return [statusClass, selectedClass].filter(Boolean).join(' ');
    };

    const tileContent = ({ date, view }) => {
      if (view !== 'month') return null;

      const count = getLeavesForDate(date).length;
      if (!count) return null;

      return (
        <span className="admin-leave-calendar-count">
          {count}
        </span>
      );
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setShowCalendarModal(false)} />
        <div className="premium-panel relative w-full max-w-5xl overflow-hidden rounded-2xl shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4 sm:p-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 sm:text-2xl">Leave Calendar</h2>
              <p className="text-xs text-slate-500 sm:text-sm">View all leave requests by date and status</p>
            </div>
            <button
              onClick={() => setShowCalendarModal(false)}
              className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Close leave calendar"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>

          <div className="grid max-h-[85vh] gap-4 overflow-y-auto p-3 sm:max-h-[80vh] sm:gap-6 sm:p-5 lg:grid-cols-[1.35fr_0.9fr]">
            <div>
              <div className="mb-4 flex flex-wrap gap-2 text-xs sm:gap-3 sm:text-sm">
                {[
                  ['Approved', 'bg-emerald-500'],
                  ['Pending', 'bg-amber-500'],
                  ['Rejected', 'bg-red-500'],
                  ['Cancelled', 'bg-slate-400'],
                ].map(([label, color]) => (
                  <div key={label} className="flex items-center gap-1.5 text-slate-600 sm:gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full sm:h-3 sm:w-3 ${color}`} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto">
                <ReactCalendar
                  value={selectedCalendarDate}
                  onChange={setSelectedCalendarDate}
                  tileClassName={tileClassName}
                  tileContent={tileContent}
                  className="admin-leave-calendar w-full"
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-500 sm:text-sm">Selected Date</p>
                <h3 className="text-lg font-bold text-slate-900 sm:text-xl">
                  {selectedCalendarDate.toLocaleDateString()}
                </h3>
              </div>

              {selectedDayLeaves.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500 sm:p-5">
                  No leave requests on this date
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayLeaves.map((leave) => (
                    <button
                      key={leave._id}
                      type="button"
                      onClick={() => {
                        setSelectedLeave(leave);
                        setShowModal(true);
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors hover:bg-blue-50 sm:p-4"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900 sm:text-base">{getEmployeeName(leave.employee)}</p>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${getStatusColor(leave.status)}`}>
                          {leave.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 sm:text-sm">{leave.leaveType} | {leave.totalDays} days</p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-600 sm:text-sm">{leave.reason}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const LeaveDetailModal = () => {
    const [comments, setComments] = useState('');

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
        <div className="fixed inset-0 bg-slate-900/20" onClick={() => setShowModal(false)} />
        <div className="premium-panel relative z-10 w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4 sm:p-6">
            <h2 className="text-lg font-bold text-slate-900 sm:text-2xl">Leave Application Details</h2>
            <button
              onClick={() => setShowModal(false)}
              className="shrink-0 text-slate-500 hover:text-slate-900"
            >
              <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {selectedLeave && (
            <div className="space-y-3 sm:space-y-6 p-3 sm:p-6">
              <div className="flex items-center space-x-2.5 sm:space-x-4 rounded-xl border border-slate-200 bg-slate-50 p-2.5 sm:p-4">
                <div className="premium-icon h-9 w-9 shrink-0 rounded-full sm:h-12 sm:w-12" style={{ '--icon-gradient': 'linear-gradient(135deg,#6366f1,#7c3aed)', '--icon-shadow': '0 12px 24px rgba(99,102,241,0.25)' }}>
                  <User className="h-4 w-4 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-sm sm:text-lg font-bold text-slate-900">
                    {selectedLeave.employee?.fullName ||
                      selectedLeave.employee?.personalInfo?.firstName + ' ' + selectedLeave.employee?.personalInfo?.lastName ||
                      selectedLeave.employee?.user?.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-blue-600">{selectedLeave.employee?.employeeId || selectedLeave.employee?.user?.employeeId}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 sm:p-0 sm:border-0 sm:bg-transparent">
                <div>
                  <label className="text-[11px] sm:text-sm font-medium text-slate-500">Leave Type</label>
                  <p className="text-xs sm:text-base font-semibold text-slate-900 capitalize">{selectedLeave.leaveType}</p>
                </div>
                <div>
                  <label className="text-[11px] sm:text-sm font-medium text-slate-500">Duration</label>
                  <p className="text-xs sm:text-base font-semibold text-slate-900">
                    {selectedLeave.isHalfDay ? `0.5 day (${selectedLeave.halfDaySession})` : `${selectedLeave.totalDays} days`}
                  </p>
                </div>
                <div>
                  <label className="text-[11px] sm:text-sm font-medium text-slate-500">Start Date</label>
                  <p className="text-xs sm:text-base font-semibold text-slate-900">{new Date(selectedLeave.startDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-[11px] sm:text-sm font-medium text-slate-500">End Date</label>
                  <p className="text-xs sm:text-base font-semibold text-slate-900">{new Date(selectedLeave.endDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-[11px] sm:text-sm font-medium text-slate-500">Applied Date</label>
                  <p className="text-xs sm:text-base font-semibold text-slate-900">{new Date(selectedLeave.appliedDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="block text-[11px] sm:text-sm font-medium text-slate-500 mb-0.5">Status</label>
                  <span className={`inline-block px-2 py-0.5 text-[11px] sm:text-xs font-semibold rounded-full ${getStatusColor(selectedLeave.status)}`}>
                    {selectedLeave.status}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[11px] sm:text-sm font-medium text-slate-500">Reason</label>
                <p className="text-xs sm:text-base text-slate-900 bg-slate-50 border border-slate-200 p-2 sm:p-3 rounded-lg sm:rounded-xl mt-0.5">{selectedLeave.reason}</p>
              </div>

              {selectedLeave.approverComments && (
                <div>
                  <label className="text-[11px] sm:text-sm font-medium text-slate-500">Previous Comments</label>
                  <p className="text-xs sm:text-base text-slate-900 bg-slate-50 border border-slate-200 p-2 sm:p-3 rounded-lg sm:rounded-xl mt-0.5">{selectedLeave.approverComments}</p>
                </div>
              )}

              {selectedLeave.status.toLowerCase() === 'pending' && (
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="text-[11px] sm:text-sm font-medium text-slate-500">Comments (Optional)</label>
                    <textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      rows="2"
                      className="premium-input w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 mt-1"
                      placeholder="Add comments for the employee..."
                      maxLength="300"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:justify-end sm:space-x-4">
                    <button
                      onClick={() => handleReject(selectedLeave._id, comments)}
                      disabled={actionLoading}
                      className="flex items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-2 sm:px-6 sm:py-3 text-xs sm:text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
                    >
                      {actionLoading ? <Loader className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5 mr-1.5" />}
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(selectedLeave._id, comments)}
                      disabled={actionLoading}
                      className="premium-primary-button flex items-center justify-center rounded-lg px-3 py-2 sm:px-6 sm:py-3 text-xs sm:text-sm font-semibold transition-all duration-200 disabled:opacity-50"
                    >
                      {actionLoading ? <Loader className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5 mr-1.5" />}
                      Approve
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="admin-page-shell space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="premium-page-title text-xl font-bold sm:text-2xl md:text-3xl">Leave Management</h1>
            <p className="text-xs text-slate-500 sm:text-sm">Manage employee leave requests and approvals</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:gap-3">
            <button
              onClick={() => setShowCalendarModal(true)}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:px-6 sm:py-3"
            >
              <CalendarIcon className="mr-1.5 h-4 w-4 sm:mr-2" />
              <span className="whitespace-nowrap">Leave Calendar</span>
            </button>
            <button
              onClick={exportLeaveReport}
              disabled={leaves.length === 0}
              className="premium-primary-button flex items-center justify-center rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 sm:px-6 sm:py-3"
            >
              <Download className="mr-1.5 h-4 w-4 sm:mr-2" />
              <span className="whitespace-nowrap">Export Report</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-4 md:gap-6">
          <div className="premium-stat-card rounded-xl sm:rounded-2xl p-2 sm:p-4 md:p-6" style={{ '--stat-soft': 'rgba(99,102,241,0.10)', '--icon-gradient': 'linear-gradient(135deg,#6366f1,#7c3aed)', '--icon-shadow': '0 12px 24px rgba(99,102,241,0.25)' }}>
            <div className="flex items-center justify-between gap-1.5 sm:gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 sm:text-xl md:text-2xl">{stats.total}</h3>
                <p className="text-[11px] text-slate-500 sm:text-sm">Total Applications</p>
              </div>
              <div className="premium-icon h-7 w-7 shrink-0 rounded-lg sm:h-10 sm:w-10 sm:rounded-xl md:h-12 md:w-12">
                <FileText className="h-3.5 w-3.5 sm:h-5 sm:w-5 md:h-6 md:w-6" />
              </div>
            </div>
          </div>

          <div className="premium-stat-card rounded-xl sm:rounded-2xl p-2 sm:p-4 md:p-6" style={{ '--stat-soft': 'rgba(245,158,11,0.10)', '--icon-gradient': 'linear-gradient(135deg,#f59e0b,#ea580c)', '--icon-shadow': '0 12px 24px rgba(245,158,11,0.25)' }}>
            <div className="flex items-center justify-between gap-1.5 sm:gap-2">
              <div>
                <h3 className="text-base font-bold text-yellow-700 sm:text-xl md:text-2xl">{stats.pending}</h3>
                <p className="text-[11px] text-slate-500 sm:text-sm">Pending</p>
              </div>
              <div className="premium-icon h-7 w-7 shrink-0 rounded-lg sm:h-10 sm:w-10 sm:rounded-xl md:h-12 md:w-12">
                <Clock className="h-3.5 w-3.5 sm:h-5 sm:w-5 md:h-6 md:w-6" />
              </div>
            </div>
          </div>

          <div className="premium-stat-card rounded-xl sm:rounded-2xl p-2 sm:p-4 md:p-6" style={{ '--stat-soft': 'rgba(16,185,129,0.10)', '--icon-gradient': 'linear-gradient(135deg,#10b981,#0d9488)', '--icon-shadow': '0 12px 24px rgba(16,185,129,0.25)' }}>
            <div className="flex items-center justify-between gap-1.5 sm:gap-2">
              <div>
                <h3 className="text-base font-bold text-green-700 sm:text-xl md:text-2xl">{stats.approved}</h3>
                <p className="text-[11px] text-slate-500 sm:text-sm">Approved</p>
              </div>
              <div className="premium-icon h-7 w-7 shrink-0 rounded-lg sm:h-10 sm:w-10 sm:rounded-xl md:h-12 md:w-12">
                <CheckCircle className="h-3.5 w-3.5 sm:h-5 sm:w-5 md:h-6 md:w-6" />
              </div>
            </div>
          </div>

          <div className="premium-stat-card rounded-xl sm:rounded-2xl p-2 sm:p-4 md:p-6" style={{ '--stat-soft': 'rgba(236,72,153,0.10)', '--icon-gradient': 'linear-gradient(135deg,#ec4899,#e11d48)', '--icon-shadow': '0 12px 24px rgba(236,72,153,0.25)' }}>
            <div className="flex items-center justify-between gap-1.5 sm:gap-2">
              <div>
                <h3 className="text-base font-bold text-red-700 sm:text-xl md:text-2xl">{stats.rejected}</h3>
                <p className="text-[11px] text-slate-500 sm:text-sm">Rejected</p>
              </div>
              <div className="premium-icon h-7 w-7 shrink-0 rounded-lg sm:h-10 sm:w-10 sm:rounded-xl md:h-12 md:w-12">
                <XCircle className="h-3.5 w-3.5 sm:h-5 sm:w-5 md:h-6 md:w-6" />
              </div>
            </div>
          </div>
        </div>

        <div className="premium-panel rounded-2xl p-3 sm:p-4 md:p-6">
          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-4">
            <SearchWithSuggestions
              value={searchTerm}
              onChange={setSearchTerm}
              items={leaves}
              getSuggestionValue={(leave) => leave.employee?.user?.name || leave.employee?.fullName || leave.employee?.employeeId || ''}
              getSuggestionTitle={(leave) => leave.employee?.user?.name || leave.employee?.fullName || 'Employee'}
              getSuggestionSubtitle={(leave) => [leave.employee?.employeeId, leave.leaveType, leave.status].filter(Boolean).join(' • ')}
              placeholder="Search employees..."
              inputClassName="premium-input rounded-xl py-3 text-sm"
            />

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="premium-input w-full rounded-xl py-3 pl-10 pr-4 text-sm text-slate-900"
              >
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-slate-400" />
              <select
                value={leaveTypeFilter}
                onChange={(e) => setLeaveTypeFilter(e.target.value)}
                className="premium-input w-full rounded-xl py-3 pl-10 pr-4 text-sm text-slate-900"
              >
                <option value="">All Types</option>
                {leaveTypeOptions.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setLeaveTypeFilter('');
              }}
              className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 transition-colors hover:bg-slate-50"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <div className="premium-panel overflow-hidden rounded-2xl">
          {loading ? (
            <div className="p-8 text-center sm:p-12">
              <Loader className="mx-auto mb-4 h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm text-slate-500">Loading leave applications...</p>
            </div>
          ) : (
            <>
              <div className="scrollbar-hide grid max-h-[68dvh] gap-3 overflow-y-auto overscroll-contain p-3 sm:gap-4 sm:p-4 md:hidden">
                {leaves.map((leave) => (
                  <div key={leave._id} onClick={(event) => openLeaveDetails(event, leave)} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200 cursor-pointer hover:border-blue-200 hover:bg-blue-50/40 active:bg-indigo-50/60 sm:p-4">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-center space-x-2.5 sm:space-x-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-blue-50 sm:h-10 sm:w-10">
                          <User className="h-4 w-4 text-blue-600 sm:h-5 sm:w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {leave.employee?.fullName ||
                              (leave.employee?.personalInfo?.firstName + ' ' + leave.employee?.personalInfo?.lastName) ||
                              leave.employee?.user?.name}
                          </p>
                          <p className="flex items-center text-xs text-slate-500">
                            <span className="truncate">{leave.employee?.employeeId || leave.employee?.user?.employeeId}</span>
                          </p>
                        </div>
                      </div>
                      <div className="ml-2 flex shrink-0 items-center space-x-1">
                        <button
                          onClick={() => {
                            setSelectedLeave(leave);
                            setShowModal(true);
                          }}
                          className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {leave.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(leave._id)}
                              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-green-50 hover:text-green-600"
                              title="Quick Approve"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleReject(leave._id, 'Application rejected')}
                              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                              title="Quick Reject"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Leave Type</span>
                        <span className={`inline-flex flex-shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium leading-none ${getLeaveTypeColor(leave.leaveType)}`}>
                          {leave.leaveType}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="shrink-0 text-slate-500">Duration</span>
                        <span className="text-right font-medium text-slate-900">
                          {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Days</span>
                        <span className="font-medium text-slate-900">{leave.totalDays} days</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Applied</span>
                        <span className="font-medium text-slate-900">
                          {new Date(leave.appliedDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Status</span>
                        <span className={`inline-flex flex-shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium leading-none ${getStatusColor(leave.status)}`}>
                          {leave.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr>
                        <th className="p-6 text-left font-semibold text-slate-500">Employee</th>
                        <th className="p-6 text-left font-semibold text-slate-500">Leave Type</th>
                        <th className="p-6 text-left font-semibold text-slate-500">Duration</th>
                        <th className="p-6 text-left font-semibold text-slate-500">Applied Date</th>
                        <th className="p-6 text-left font-semibold text-slate-500">Status</th>
                        <th className="p-6 text-left font-semibold text-slate-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaves.map((leave) => (
                        <tr key={leave._id} onClick={(event) => openLeaveDetails(event, leave)} className="premium-table-row border-b border-slate-100 cursor-pointer">
                          <td className="p-6">
                            <div className="flex items-center space-x-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-100 bg-blue-50">
                                <User className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">
                                  {leave.employee?.fullName ||
                                    (leave.employee?.personalInfo?.firstName + ' ' + leave.employee?.personalInfo?.lastName) ||
                                    leave.employee?.user?.name}
                                </p>
                                <p className="text-sm text-slate-500">{leave.employee?.employeeId || leave.employee?.user?.employeeId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-6">
                            <span className={`rounded-full px-3 py-1 text-xs ${getLeaveTypeColor(leave.leaveType)}`}>
                              {leave.leaveType}
                            </span>
                          </td>
                          <td className="p-6 text-slate-900">
                            <div>
                              <p>{new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}</p>
                              <p className="text-sm text-slate-500">{leave.totalDays} days</p>
                            </div>
                          </td>
                          <td className="p-6 text-slate-500">
                            {new Date(leave.appliedDate).toLocaleDateString()}
                          </td>
                          <td className="p-6">
                            <span className={`rounded-full px-3 py-1 text-xs ${getStatusColor(leave.status)}`}>
                              {leave.status}
                            </span>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedLeave(leave);
                                  setShowModal(true);
                                }}
                                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {leave.status === 'Pending' && (
                                <>
                                  <button
                                    onClick={() => handleApprove(leave._id)}
                                    className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-green-50 hover:text-green-600"
                                    title="Quick Approve"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleReject(leave._id, 'Application rejected')}
                                    className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                                    title="Quick Reject"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {!loading && leaves.length === 0 && (
            <div className="p-8 text-center sm:p-12">
              <CalendarIcon className="mx-auto mb-4 h-10 w-10 text-slate-300 sm:h-12 sm:w-12" />
              <h3 className="mb-2 text-base font-medium text-slate-900 sm:text-lg">No leave applications found</h3>
              <p className="text-sm text-slate-500">
                {searchTerm || statusFilter || leaveTypeFilter
                  ? 'Try adjusting your search filters'
                  : 'No leave applications have been submitted yet'}
              </p>
            </div>
          )}
        </div>
      </div>

      {showModal && <LeaveDetailModal />}
      {showCalendarModal && <LeaveCalendarModal />}
    </AdminLayout>
  );
};

export default AdminLeaveManagement;
