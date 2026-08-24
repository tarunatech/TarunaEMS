import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AdminLayout from '../../components/Admin/layout/AdminLayout';
import { 
  Users, Calendar, Clock, MapPin, Search, Download,
  Edit3, Trash2, CheckCircle, XCircle, AlertCircle, Timer,
  TrendingUp, Building2, User, MoreVertical, RefreshCw, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import { attendanceAPI, departmentAPI } from '../../utils/api';

const ATTENDANCE_STATUS_OPTIONS = ['Present', 'Late', 'Half Day', 'Absent', 'Work from Home'];

const AdminAttendance = () => {
  const location = useLocation();
  const initialSearch = location.state?.employeeFilter || location.state?.search || '';
  const today = new Date().toISOString().slice(0, 10);

  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [selectedDate] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [filters, setFilters] = useState({
    startDate: today,
    endDate: today,
    department: '',
    status: '',
    search: initialSearch
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  });
  const [editingRecord, setEditingRecord] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [editForm, setEditForm] = useState({
    status: '',
    notes: '',
    isManualEntry: false,
    manualEntryReason: ''
  });
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    fetchAttendanceData();
    fetchAttendanceSummary();
  }, [filters, pagination.current, selectedDate]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    const navSearch = location.state?.employeeFilter || location.state?.search || '';
    if (navSearch) {
      setFilters(prev => ({
        ...prev,
        search: navSearch,
        startDate: today,
        endDate: today
      }));
      setSelectedMonth('');
    }
  }, [location.state]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.current,
        limit: 20,
        ...filters
      };

      const response = await attendanceAPI.getAllAttendance(params);
      if (response.data.success) {
        setAttendanceRecords(response.data.data || []);
        setPagination(response.data.pagination || { current: 1, pages: 1, total: 0 });
      }

    } catch (error) {
      console.error('Error fetching attendance data:', error);
      toast.error('Failed to fetch attendance records');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceSummary = async () => {
    try {
      const response = await attendanceAPI.getAttendanceSummary({ date: selectedDate });
      if (response.data.success) {
        setAttendanceSummary(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching attendance summary:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await departmentAPI.getDepartments();
      if (response.data.success) {
        setDepartments(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Failed to fetch department filter options');
    }
  };

  const handleFilterChange = (key, value) => {
    if (key === 'startDate' || key === 'endDate') {
      setSelectedMonth('');
    }
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleMonthChange = (monthStr) => {
    setSelectedMonth(monthStr);
    if (!monthStr) return;
    const [year, month] = monthStr.split('-').map(Number);
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDayNum = new Date(year, month, 0).getDate();
    const lastDay = `${year}-${String(month).padStart(2, '0')}-${String(lastDayNum).padStart(2, '0')}`;

    setFilters(prev => ({
      ...prev,
      startDate: firstDay,
      endDate: lastDay
    }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const clearFilters = () => {
    const today = new Date().toISOString().slice(0, 10);
    setFilters({
      startDate: today,
      endDate: today,
      department: '',
      status: '',
      search: ''
    });
    setSelectedMonth('');
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleEditRecord = (record) => {
    setEditingRecord(record);
    setEditForm({
      status: record.status,
      notes: record.notes || '',
      isManualEntry: record.isManualEntry || false,
      manualEntryReason: record.manualEntryReason || ''
    });
  };

  const handleUpdateRecord = async () => {
    try {
      const response = await attendanceAPI.updateAttendance(editingRecord._id, editForm);
      if (response.data.success) {
        toast.success('Attendance record updated successfully');
        setEditingRecord(null);
        fetchAttendanceData();
      }
    } catch (error) {
      console.error('Error updating record:', error);
      toast.error('Failed to update attendance record');
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm('Are you sure you want to delete this attendance record?')) {
      return;
    }

    try {
      await attendanceAPI.deleteAttendance(recordId);
      toast.success('Attendance record deleted successfully');
      fetchAttendanceData();
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error('Failed to delete attendance record');
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'present': return 'text-emerald-700 bg-emerald-50 border border-emerald-200';
      case 'late': return 'text-amber-700 bg-amber-50 border border-amber-200';
      case 'half day': return 'text-orange-700 bg-orange-50 border border-orange-200';
      case 'absent': return 'text-red-700 bg-red-50 border border-red-200';
      case 'work from home': return 'text-blue-700 bg-blue-50 border border-blue-200';
      default: return 'text-slate-700 bg-slate-100 border border-slate-200';
    }
  };

  const StatEmployeePopover = ({ employees = [] }) => {
    const visibleEmployees = employees.slice(0, 6);
    const remainingCount = Math.max(0, employees.length - visibleEmployees.length);

    return (
      <div className="pointer-events-none absolute left-3 right-3 top-[calc(100%+0.5rem)] z-50 hidden rounded-xl border border-slate-200 bg-white p-3 text-left shadow-2xl shadow-slate-900/15 group-hover:block group-focus-within:block">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Employee Details
        </p>
        {visibleEmployees.length === 0 ? (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">No employees</p>
        ) : (
          <div className="max-h-52 space-y-1 overflow-y-auto pr-1 scrollbar-hide">
            {visibleEmployees.map((employee) => (
              <div key={employee.id || `${employee.employeeId}-${employee.name}`} className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="truncate text-xs font-semibold text-slate-900">{employee.name}</p>
                <p className="truncate text-[11px] text-slate-500">ID: {employee.employeeId || 'N/A'}</p>
              </div>
            ))}
          </div>
        )}
        {remainingCount > 0 && (
          <p className="mt-2 text-xs font-medium text-slate-500">+{remainingCount} more</p>
        )}
      </div>
    );
  };

  const statEmployees = (key) => attendanceSummary?.employeeDetails?.[key] || [];

  const formatTime = (dateString) => {
    if (!dateString) return '--:--';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getWorkingMinutes = (recordOrMinutes, checkInTime, checkOutTime) => {
    if (typeof recordOrMinutes === 'object' && recordOrMinutes !== null) {
      if (recordOrMinutes.workingHours > 0) return recordOrMinutes.workingHours;
      if (recordOrMinutes.checkInTime && !recordOrMinutes.checkOutTime) {
        return Math.max(0, Math.round((currentTime - new Date(recordOrMinutes.checkInTime).getTime()) / (1000 * 60)));
      }
      return 0;
    }

    if (recordOrMinutes > 0) return recordOrMinutes;
    if (checkInTime && !checkOutTime) {
      return Math.max(0, Math.round((currentTime - new Date(checkInTime).getTime()) / (1000 * 60)));
    }
    return 0;
  };

  const formatWorkingTime = (recordOrMinutes, checkInTime, checkOutTime) => {
    const totalMinutes = getWorkingMinutes(recordOrMinutes, checkInTime, checkOutTime);
    if (!totalMinutes || totalMinutes === 0) return '0h 0m';
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getDepartmentName = (record) => {
    const department = record?.employeeData?.workInfo?.department;
    const departmentName = record?.employeeData?.workInfo?.departmentName;

    if (departmentName) return departmentName;
    if (department && typeof department === 'object') return department.name || department.code || 'N/A';
    return department || 'N/A';
  };

  const getLocationText = (location) => {
    if (!location) return 'Location unavailable';
    return location.address || location.displayName || location.name || 'Location unavailable';
  };

  const isInteractiveClick = (event) =>
    event.target.closest('button, a, input, select, textarea, label');

  const openAttendanceDetails = (event, record) => {
    if (isInteractiveClick(event)) return;
    setViewingRecord(record);
  };

  const exportAttendanceData = () => {
    const csvContent = [
      ['Date', 'Employee', 'Employee ID', 'Department', 'Check In', 'Check Out', 'Working Time', 'Status'],
      ...attendanceRecords.map(record => [
        formatDate(record.date),
        record.employeeData?.personalInfo ? 
          `${record.employeeData.personalInfo.firstName} ${record.employeeData.personalInfo.lastName}` :
          record.userData?.name || 'Unknown',
        record.userData?.employeeId || '',
        getDepartmentName(record),
        formatTime(record.checkInTime),
        formatTime(record.checkOutTime),
        formatWorkingTime(record),
        record.status
      ])
    ];

    const csv = csvContent.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_report_${filters.startDate}_to_${filters.endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Attendance report exported successfully');
  };

  return (
    <AdminLayout>
        <div className="admin-page-shell w-full min-h-[calc(100vh-7rem)] space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="glass-morphism neon-border rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                Attendance <span className="text-blue-600">Management</span>
              </h1>
              <p className="text-slate-500">Monitor and manage employee attendance records</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 md:mt-0 md:flex md:flex-row md:space-x-3">
              <button
                onClick={exportAttendanceData}
                disabled={attendanceRecords.length === 0}
                className="flex items-center justify-center space-x-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-sm text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 md:py-2"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
              <button
                onClick={fetchAttendanceData}
                className="col-span-2 flex items-center justify-center space-x-2 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 sm:px-4 md:col-span-1 md:py-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {attendanceSummary && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
            <div tabIndex={0} className="premium-stat-card group relative !overflow-visible rounded-xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/70 p-3 before:hidden hover:z-40 focus:z-40 sm:rounded-2xl sm:p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-blue-800 text-[11px] sm:text-sm font-semibold leading-tight">Total Employees</p>
                  <p className="text-lg sm:text-3xl font-extrabold text-blue-700 leading-tight mt-1">{attendanceSummary.overallStats?.totalEmployees || 0}</p>
                </div>
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 shadow-lg shadow-blue-600/20 sm:h-10 sm:w-10 sm:rounded-xl">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <StatEmployeePopover employees={statEmployees('totalEmployees')} />
            </div>
            <div tabIndex={0} className="premium-stat-card group relative !overflow-visible rounded-xl border border-emerald-200 bg-gradient-to-br from-white to-emerald-50/70 p-3 before:hidden hover:z-40 focus:z-40 sm:rounded-2xl sm:p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-emerald-800 text-[11px] sm:text-sm font-semibold leading-tight">Present Employees</p>
                  <p className="text-lg sm:text-3xl font-extrabold text-emerald-700 leading-tight mt-1">{attendanceSummary.overallStats?.present || 0}</p>
                </div>
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/20 flex-shrink-0">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <StatEmployeePopover employees={statEmployees('present')} />
            </div>
            <div tabIndex={0} className="premium-stat-card group relative !overflow-visible rounded-xl border border-amber-200 bg-gradient-to-br from-white to-amber-50/70 p-3 before:hidden hover:z-40 focus:z-40 sm:rounded-2xl sm:p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-amber-800 text-[11px] sm:text-sm font-semibold leading-tight">Late</p>
                  <p className="text-lg sm:text-3xl font-extrabold text-amber-700 leading-tight mt-1">{attendanceSummary.overallStats?.late || 0}</p>
                </div>
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500 shadow-lg shadow-amber-500/20 sm:h-10 sm:w-10 sm:rounded-xl">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <StatEmployeePopover employees={statEmployees('late')} />
            </div>
            <div tabIndex={0} className="premium-stat-card group relative !overflow-visible rounded-xl border border-orange-200 bg-gradient-to-br from-white to-orange-50/70 p-3 before:hidden hover:z-40 focus:z-40 sm:rounded-2xl sm:p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-orange-800 text-[11px] sm:text-sm font-semibold leading-tight">Half Day</p>
                  <p className="text-lg sm:text-3xl font-extrabold text-orange-600 leading-tight mt-1">{attendanceSummary.overallStats?.halfDay || 0}</p>
                </div>
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-orange-500 shadow-lg shadow-orange-500/20 sm:h-10 sm:w-10 sm:rounded-xl">
                  <Timer className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <StatEmployeePopover employees={statEmployees('halfDay')} />
            </div>
            <div tabIndex={0} className="premium-stat-card group relative !overflow-visible rounded-xl border border-red-200 bg-gradient-to-br from-white to-red-50/70 p-3 before:hidden hover:z-40 focus:z-40 sm:rounded-2xl sm:p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-red-800 text-[11px] sm:text-sm font-semibold leading-tight">Absent</p>
                  <p className="text-lg sm:text-3xl font-extrabold text-red-600 leading-tight mt-1">{attendanceSummary.overallStats?.absent || 0}</p>
                </div>
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-red-500 shadow-lg shadow-red-500/20 sm:h-10 sm:w-10 sm:rounded-xl">
                  <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <StatEmployeePopover employees={statEmployees('absent')} />
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="premium-panel rounded-2xl p-4 sm:p-5">
            <h3 className="text-base font-bold text-slate-900 mb-3">Filters & Search</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm text-slate-600 mb-1 sm:mb-2">Select Month</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="premium-input w-full px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-slate-900 focus:outline-none text-xs sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-slate-600 mb-1 sm:mb-2">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="premium-input w-full px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-slate-900 focus:outline-none text-xs sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-slate-600 mb-1 sm:mb-2">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="premium-input w-full px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-slate-900 focus:outline-none text-xs sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-slate-600 mb-1 sm:mb-2">Department</label>
                <select
                  value={filters.department}
                  onChange={(e) => handleFilterChange('department', e.target.value)}
                  className="premium-input w-full px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-slate-900 focus:outline-none text-xs sm:text-sm"
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept._id || dept.id} value={dept._id || dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-slate-600 mb-1 sm:mb-2">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="premium-input w-full px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-slate-900 focus:outline-none text-xs sm:text-sm"
                >
                  <option value="">All Status</option>
                  {ATTENDANCE_STATUS_OPTIONS.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:mt-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="w-full sm:max-w-sm">
                <label className="block text-xs sm:text-sm text-slate-600 mb-1 sm:mb-2">Search Employee</label>
                <div className="relative">
                  <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-3 sm:w-4 h-3 sm:h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Name or employee ID..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="premium-input w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none text-xs sm:text-sm"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:text-sm"
              >
                Clear Filters
              </button>
            </div>
          </div>

        {/* Attendance Records Table */}
        <div className="premium-panel rounded-2xl p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3 mb-4 sm:mb-6">
            <h2 className="text-xl font-bold text-slate-900">Attendance Records</h2>
            <p className="text-slate-500 text-sm text-right">
              Showing {attendanceRecords.length} of {pagination.total} records
            </p>
          </div>

          <>
            {/* Mobile Cards */}
            <div className="scrollbar-hide md:hidden grid max-h-[62dvh] gap-3 overflow-y-auto overscroll-contain pr-1">
              {loading ? (
                <div className="col-span-full text-center py-8 text-slate-500">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black/30"></div>
                    <span className="text-xs sm:text-sm">Loading attendance records...</span>
                  </div>
                </div>
              ) : attendanceRecords.length === 0 ? (
                <div className="col-span-full text-center py-8 text-slate-500">
                  <div className="flex flex-col items-center space-y-2">
                    <Users className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400" />
                    <span className="text-xs sm:text-sm">No attendance records found</span>
                    <span className="text-xs">Try adjusting your filters</span>
                  </div>
                </div>
              ) : (
                attendanceRecords.map((record) => (
                  <div key={record._id} onClick={(event) => openAttendanceDetails(event, record)} className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm hover:border-blue-200 hover:bg-blue-50/40 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between mb-2 sm:mb-3">
                      <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-500/20">
                          <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-slate-900 font-medium text-xs sm:text-sm truncate">
                            {record.employeeData?.personalInfo ?
                              `${record.employeeData.personalInfo.firstName} ${record.employeeData.personalInfo.lastName}` :
                              record.userData?.name || 'Unknown'}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            ID: {record.userData?.employeeId || 'N/A'} • {getDepartmentName(record)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 ml-1 sm:ml-2">
                        <button
                          onClick={() => setViewingRecord(record)}
                          className="p-1 sm:p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={() => handleEditRecord(record)}
                          className="p-1 sm:p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Record"
                        >
                          <Edit3 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(record._id)}
                          className="p-1 sm:p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1 sm:space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-xs">Date</span>
                        <span className="text-slate-800 text-xs sm:text-sm">{formatDate(record.date)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-xs">Check In</span>
                        <span className="text-slate-800 text-xs sm:text-sm">{formatTime(record.checkInTime)}</span>
                        {record.isLate && (
                          <span className="text-red-400 text-xs ml-1">{record.lateMinutes}m late</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-xs">Check Out</span>
                        <span className="text-slate-800 text-xs sm:text-sm">{formatTime(record.checkOutTime)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-xs">Working Time</span>
                        <div className="text-right">
                          <span className="rounded-lg bg-blue-50 px-2 py-1 text-blue-800 text-xs sm:text-sm font-bold border border-blue-100">{formatWorkingTime(record)}</span>
                          {record.checkInTime && !record.checkOutTime && (
                            <div className="mt-1  text-[11px] font-medium text-emerald-700">Live</div>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-xs">Status</span>
                        <span className={`text-xs px-1 sm:px-2 py-1 rounded-full ${getStatusColor(record.status)}`}>
                          {record.status}
                        </span>
                        {record.isManualEntry && (
                          <span className="text-amber-600 text-xs ml-1">Manual</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center pt-1 sm:pt-2 border-t border-slate-200">
                        <span className="text-slate-500 text-xs">Location</span>
                        <span className="text-slate-500 text-xs truncate max-w-24 sm:max-w-32">
                          {record.checkInLocation?.address || 'Unavailable'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="pb-3 text-slate-500 font-semibold text-sm">Employee</th>
                      <th className="pb-3 text-slate-500 font-semibold text-sm">Date</th>
                      <th className="pb-3 text-slate-500 font-semibold text-sm">Check In</th>
                      <th className="pb-3 text-slate-500 font-semibold text-sm">Check Out</th>
                      <th className="pb-3 text-slate-500 font-semibold text-sm">Working Time</th>
                      <th className="pb-3 text-slate-500 font-semibold text-sm">Status</th>
                      <th className="pb-3 text-slate-500 font-semibold text-sm">Location</th>
                      <th className="pb-3 text-slate-500 font-semibold text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan="8" className="py-8 text-center text-slate-500">
                          <div className="flex items-center justify-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            <span>Loading attendance records...</span>
                          </div>
                        </td>
                      </tr>
                    ) : attendanceRecords.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-8 text-center text-slate-500">
                          <div className="flex flex-col items-center space-y-2">
                            <Users className="w-8 h-8 text-slate-400" />
                            <span>No attendance records found</span>
                            <span className="text-xs">Try adjusting your filters</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      attendanceRecords.map((record) => (
                        <tr key={record._id} onClick={(event) => openAttendanceDetails(event, record)} className="premium-table-row transition-colors cursor-pointer">
                          <td className="py-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm shadow-blue-500/20">
                                <User className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <p className="text-slate-900 font-medium">
                                  {record.employeeData?.personalInfo ? 
                                    `${record.employeeData.personalInfo.firstName} ${record.employeeData.personalInfo.lastName}` :
                                    record.userData?.name || 'Unknown'}
                                </p>
                                <p className="text-xs text-slate-500">
                                  ID: {record.userData?.employeeId || 'N/A'} • {getDepartmentName(record)}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 text-slate-700">{formatDate(record.date)}</td>
                          <td className="py-3">
                            <div className="text-slate-700">{formatTime(record.checkInTime)}</div>
                            {record.isLate && (
                              <div className="text-xs text-red-400">
                                {record.lateMinutes}m late
                              </div>
                            )}
                          </td>
                          <td className="py-3 text-slate-700">{formatTime(record.checkOutTime)}</td>
                          <td className="py-3">
                            <span className="inline-flex min-w-[4.5rem] items-center justify-center rounded-lg bg-blue-50 px-2.5 py-1 text-sm font-bold text-blue-800 border border-blue-100">
                              {formatWorkingTime(record)}
                            </span>
                            {record.checkInTime && !record.checkOutTime && (
                              <div className="mt-1 text-xs font-medium text-emerald-700">Live</div>
                            )}
                          </td>
                          <td className="py-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(record.status)}`}>
                              {record.status}
                            </span>
                            {record.isManualEntry && (
                              <div className="text-xs text-amber-600 mt-1">Manual Entry</div>
                            )}
                          </td>
                          <td className="py-3">
                            <div className="flex items-center text-slate-500 text-xs">
                              <MapPin className="w-3 h-3 mr-1" />
                              <span className="truncate max-w-24">
                                {record.checkInLocation?.address || 'Location unavailable'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => setViewingRecord(record)}
                                className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEditRecord(record)}
                                className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                                title="Edit Record"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(record._id)}
                                className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                title="Delete Record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-6 border-t border-slate-200 gap-4 sm:gap-0">
              <div className="text-slate-500 text-xs sm:text-sm text-center sm:text-left">
                Page {pagination.current} of {pagination.pages} ({pagination.total} total records)
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, current: Math.max(1, prev.current - 1) }))}
                  disabled={pagination.current === 1}
                  className="px-2 sm:px-3 py-1 bg-white text-slate-700 rounded border border-slate-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors text-xs sm:text-sm"
                >
                  Previous
                </button>
                <span className="px-2 sm:px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded text-xs sm:text-sm">
                  {pagination.current}
                </span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, current: Math.min(prev.pages, prev.current + 1) }))}
                  disabled={pagination.current === pagination.pages}
                  className="px-2 sm:px-3 py-1 bg-white text-slate-700 rounded border border-slate-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors text-xs sm:text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* View Record Modal */}
        {viewingRecord && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4">
            {/* Enhanced backdrop with blur */}
            <div className="fixed inset-0 bg-slate-950/35 backdrop-blur-md" onClick={() => setViewingRecord(null)} />

            {/* Modal content */}
            <div className="relative premium-panel w-[calc(100vw-1rem)] max-w-[22rem] overflow-hidden rounded-xl shadow-2xl sm:w-full sm:max-w-2xl sm:rounded-2xl">
              <style>{`
                .attendance-detail-row {
                  display: grid;
                  grid-template-columns: minmax(5.75rem, 0.8fr) minmax(0, 1fr);
                  align-items: center;
                  gap: 0.5rem;
                  border-radius: 0.625rem;
                  padding: 0.35rem 0.55rem;
                  background: rgb(248 250 252);
                }
                .attendance-detail-row label,
                .attendance-detail-block label {
                  display: block;
                  color: rgb(100 116 139);
                  font-size: 0.75rem;
                  line-height: 0.95rem;
                  margin-bottom: 0;
                }
                .attendance-detail-row p,
                .attendance-detail-block p {
                  min-width: 0;
                  color: rgb(15 23 42);
                  font-size: 0.75rem;
                  line-height: 1rem;
                  font-weight: 500;
                  overflow-wrap: anywhere;
                  word-break: normal;
                }
                .attendance-detail-row p {
                  text-align: right;
                }
                .attendance-detail-block {
                  border-radius: 0.625rem;
                  padding: 0.35rem 0.55rem;
                  background: rgb(248 250 252);
                }
                @media (min-width: 640px) {
                  .attendance-detail-row,
                  .attendance-detail-block {
                    display: block;
                    padding: 0;
                    background: transparent;
                  }
                  .attendance-detail-row label,
                  .attendance-detail-block label {
                    margin-bottom: 0;
                  }
                  .attendance-detail-row p {
                    text-align: left;
                    font-size: 0.875rem;
                    line-height: 1.25rem;
                  }
                }
              `}</style>
              <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-3 py-1.5 backdrop-blur sm:px-5 sm:py-3">
                <h3 className="min-w-0 truncate text-sm font-bold text-slate-900 sm:text-lg">Attendance Details</h3>
                <button
                  onClick={() => setViewingRecord(null)}
                  className="shrink-0 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-800 sm:px-3 sm:text-sm"
                >
                  Close
                </button>
              </div>
              
              <div className="max-h-[calc(90dvh-2.75rem)] overflow-y-auto overscroll-contain p-2 sm:max-h-[78vh] sm:p-5">
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 sm:gap-3">
                  <div className="attendance-detail-row">
                    <label>Employee</label>
                    <p>
                      {viewingRecord.employeeData?.personalInfo ? 
                        `${viewingRecord.employeeData.personalInfo.firstName} ${viewingRecord.employeeData.personalInfo.lastName}` :
                        viewingRecord.userData?.name || 'Unknown'}
                    </p>
                  </div>
                  
                  <div className="attendance-detail-row">
                    <label>Date</label>
                    <p>{formatDate(viewingRecord.date)}</p>
                  </div>
                  
                  <div className="attendance-detail-row">
                    <label>Check In</label>
                    <p>{formatTime(viewingRecord.checkInTime)}</p>
                  </div>
                  
                  <div className="attendance-detail-row">
                    <label>Check Out</label>
                    <p>{formatTime(viewingRecord.checkOutTime)}</p>
                  </div>
                  
                  <div className="attendance-detail-row">
                    <label>Working Hours</label>
                    <div className="min-w-0 text-right sm:text-left">
                      <p className="inline-flex rounded-lg border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-800">
                        {formatWorkingTime(viewingRecord)}
                      </p>
                      {viewingRecord.checkInTime && !viewingRecord.checkOutTime && (
                        <p className="mt-0.5 whitespace-normal text-[10px] font-medium leading-tight text-emerald-700 sm:text-xs">Live since check-in</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="attendance-detail-row">
                    <label>Status</label>
                    <span className={`inline-flex rounded-full px-1.5 py-0.5 text-xs sm:px-2 sm:py-1 ${getStatusColor(viewingRecord.status)}`}>
                      {viewingRecord.status}
                    </span>
                  </div>

                  <div className="attendance-detail-block">
                    <label className="block">Check In Location</label>
                    <p className="mt-0.5">
                      {getLocationText(viewingRecord.checkInLocation)}
                    </p>
                  </div>
                  
                  {viewingRecord.checkOutLocation && (
                    <div className="attendance-detail-block">
                      <label className="block">Check Out Location</label>
                      <p className="mt-0.5">
                        {getLocationText(viewingRecord.checkOutLocation)}
                      </p>
                    </div>
                  )}
                  
                  <div className="attendance-detail-row">
                    <label>Device</label>
                    <p>
                      {viewingRecord.deviceInfo?.browser || 'Unknown'} on {viewingRecord.deviceInfo?.platform || 'Unknown'}
                    </p>
                  </div>
                  
                  {viewingRecord.notes && (
                    <div className="attendance-detail-block sm:col-span-2">
                      <label className="block">Notes</label>
                      <p className="mt-0.5">{viewingRecord.notes}</p>
                    </div>
                  )}
                  
                  {viewingRecord.isLate && (
                    <div className="attendance-detail-row bg-red-50">
                      <label>Late</label>
                      <p className="!text-red-600">{viewingRecord.lateMinutes} minutes late</p>
                    </div>
                  )}
                  
                  {viewingRecord.isManualEntry && (
                    <div className="attendance-detail-block bg-amber-50 sm:col-span-2">
                      <label className="block">Manual Entry Reason</label>
                      <p className="mt-0.5 !text-amber-600">
                        {viewingRecord.manualEntryReason || 'No reason provided'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Record Modal */}
        {editingRecord && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="fixed inset-0 bg-slate-950/35 backdrop-blur-md" onClick={() => setEditingRecord(null)} />
            <div className="premium-panel relative rounded-xl sm:rounded-2xl p-4 sm:p-5 w-full max-w-full sm:max-w-md">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3">Edit Attendance Record</h3>
              
              <div className="space-y-2 sm:space-y-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Employee</label>
                  <p className="text-slate-900 text-xs sm:text-sm">
                    {editingRecord.employeeData?.personalInfo ? 
                      `${editingRecord.employeeData.personalInfo.firstName} ${editingRecord.employeeData.personalInfo.lastName}` :
                      editingRecord.userData?.name || 'Unknown'}
                  </p>
                  <p className="text-xs text-slate-500">{formatDate(editingRecord.date)}</p>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                    className="premium-input w-full px-2 py-1.5 rounded-lg text-slate-900 focus:outline-none text-xs sm:text-sm"
                  >
                    <option value="Present">Present</option>
                    <option value="Late">Late</option>
                    <option value="Half Day">Half Day</option>
                    <option value="Absent">Absent</option>
                    <option value="Work from Home">Work from Home</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">Notes</label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows="3"
                    className="premium-input w-full px-2 py-1.5 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none text-xs sm:text-sm"
                    placeholder="Add any additional notes..."
                  />
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={editForm.isManualEntry}
                      onChange={(e) => setEditForm(prev => ({ ...prev, isManualEntry: e.target.checked }))}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-600 text-xs">Manual Entry</span>
                  </label>
                </div>

                {editForm.isManualEntry && (
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Manual Entry Reason</label>
                    <input
                      type="text"
                      value={editForm.manualEntryReason}
                      onChange={(e) => setEditForm(prev => ({ ...prev, manualEntryReason: e.target.value }))}
                      className="premium-input w-full px-2 py-1.5 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none text-xs sm:text-sm"
                      placeholder="Reason for manual entry..."
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 mt-4">
                <button
                  onClick={handleUpdateRecord}
                  className="premium-primary-button flex-1 px-2 sm:px-3 py-1.5 font-medium rounded-lg transition-all duration-300 text-xs sm:text-sm"
                >
                  Update Record
                </button>
                <button
                  onClick={() => setEditingRecord(null)}
                  className="flex-1 px-2 sm:px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium rounded-lg transition-colors text-xs sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Department-wise Summary (if available) */}
        {attendanceSummary && attendanceSummary.departmentStats && attendanceSummary.departmentStats.length > 0 && (
          <div className="premium-panel rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Department-wise Attendance</h2>
              <Building2 className="w-5 h-5 text-indigo-600" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {attendanceSummary.departmentStats.map((dept, index) => (
                <div key={index} className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-blue-200 hover:bg-blue-50/40 transition-colors">
                  <h4 className="text-slate-900 font-medium mb-2">{dept.departmentName || dept._id || 'Unknown Department'}</h4>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Present:</span>
                    <span className="text-emerald-600 font-medium">{dept.present}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Late:</span>
                    <span className="text-amber-600 font-medium">{dept.late}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Total:</span>
                    <span className="text-slate-900 font-medium">{dept.total}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAttendance;
