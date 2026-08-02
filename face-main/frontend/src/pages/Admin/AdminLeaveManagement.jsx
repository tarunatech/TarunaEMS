import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import AdminLayout from '../../components/Admin/layout/AdminLayout';
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Filter,
  Search,
  Download,
  User,
  FileText,
  Loader
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminLeaveManagement = () => {
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
  const [showModal, setShowModal] = useState(false);
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

  const getLeaveTypeColor = (type) => {
    switch (type.toLowerCase()) {
      case 'casual': return 'bg-blue-100 text-blue-700 border border-blue-200';
      case 'sick': return 'bg-red-100 text-red-700 border border-red-200';
      case 'earned': return 'bg-green-100 text-green-700 border border-green-200';
      case 'emergency': return 'bg-orange-100 text-orange-700 border border-orange-200';
      default: return 'bg-purple-100 text-purple-700 border border-purple-200';
    }
  };

  const LeaveDetailModal = () => {
    const [comments, setComments] = useState('');

    return (
      <div className="fixed inset-0 bg-slate-900/20 flex items-center justify-center z-50 p-4">
        <div className="premium-panel rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">Leave Application Details</h2>
            <button
              onClick={() => setShowModal(false)}
              className="text-slate-500 hover:text-slate-900"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          {selectedLeave && (
            <div className="p-6 space-y-6">
              <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="premium-icon w-12 h-12 rounded-full" style={{ '--icon-gradient': 'linear-gradient(135deg,#6366f1,#7c3aed)', '--icon-shadow': '0 12px 24px rgba(99,102,241,0.25)' }}>
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {selectedLeave.employee?.fullName ||
                      selectedLeave.employee?.personalInfo?.firstName + ' ' + selectedLeave.employee?.personalInfo?.lastName ||
                      selectedLeave.employee?.user?.name}
                  </h3>
                  <p className="text-blue-600">{selectedLeave.employee?.employeeId || selectedLeave.employee?.user?.employeeId}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-slate-500">Leave Type</label>
                    <p className="text-slate-900 font-medium">{selectedLeave.leaveType}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">Start Date</label>
                    <p className="text-slate-900 font-medium">{new Date(selectedLeave.startDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">End Date</label>
                    <p className="text-slate-900 font-medium">{new Date(selectedLeave.endDate).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-slate-500">Duration</label>
                    <p className="text-slate-900 font-medium">
                      {selectedLeave.isHalfDay ? `0.5 day (${selectedLeave.halfDaySession})` : `${selectedLeave.totalDays} days`}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">Applied Date</label>
                    <p className="text-slate-900 font-medium">{new Date(selectedLeave.appliedDate).toLocaleDateString()}</p>
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
                <p className="text-slate-900 bg-slate-50 border border-slate-200 p-3 rounded-xl mt-1">{selectedLeave.reason}</p>
              </div>

              {selectedLeave.approverComments && (
                <div>
                  <label className="text-sm text-slate-500">Previous Comments</label>
                  <p className="text-slate-900 bg-slate-50 border border-slate-200 p-3 rounded-xl mt-1">{selectedLeave.approverComments}</p>
                </div>
              )}

              {selectedLeave.status.toLowerCase() === 'pending' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-500">Comments (Optional)</label>
                    <textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      rows="3"
                      className="premium-input w-full px-4 py-3 rounded-xl text-slate-900 placeholder-slate-400 mt-1"
                      placeholder="Add comments for the employee..."
                      maxLength="300"
                    />
                  </div>

                  <div className="flex justify-end space-x-4">
                    <button
                      onClick={() => handleReject(selectedLeave._id, comments)}
                      disabled={actionLoading}
                      className="px-6 py-3 border border-red-200 text-red-700 rounded-lg bg-white hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center"
                    >
                      {actionLoading ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(selectedLeave._id, comments)}
                      disabled={actionLoading}
                      className="premium-primary-button px-6 py-3 font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center"
                    >
                      {actionLoading ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
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
      <div className="admin-page-shell space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="premium-page-title text-3xl font-bold">Leave Management</h1>
            <p className="text-slate-500">Manage employee leave requests and approvals</p>
          </div>
          <button className="premium-primary-button px-6 py-3 font-semibold rounded-xl transition-all duration-200 flex items-center">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="premium-stat-card rounded-2xl p-6" style={{ '--stat-soft': 'rgba(99,102,241,0.10)', '--icon-gradient': 'linear-gradient(135deg,#6366f1,#7c3aed)', '--icon-shadow': '0 12px 24px rgba(99,102,241,0.25)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">{stats.total}</h3>
                <p className="text-slate-500">Total Applications</p>
              </div>
              <div className="premium-icon w-12 h-12 rounded-xl">
                <FileText className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="premium-stat-card rounded-2xl p-6" style={{ '--stat-soft': 'rgba(245,158,11,0.10)', '--icon-gradient': 'linear-gradient(135deg,#f59e0b,#ea580c)', '--icon-shadow': '0 12px 24px rgba(245,158,11,0.25)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-yellow-700">{stats.pending}</h3>
                <p className="text-slate-500">Pending</p>
              </div>
              <div className="premium-icon w-12 h-12 rounded-xl">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="premium-stat-card rounded-2xl p-6" style={{ '--stat-soft': 'rgba(16,185,129,0.10)', '--icon-gradient': 'linear-gradient(135deg,#10b981,#0d9488)', '--icon-shadow': '0 12px 24px rgba(16,185,129,0.25)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-green-700">{stats.approved}</h3>
                <p className="text-slate-500">Approved</p>
              </div>
              <div className="premium-icon w-12 h-12 rounded-xl">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="premium-stat-card rounded-2xl p-6" style={{ '--stat-soft': 'rgba(236,72,153,0.10)', '--icon-gradient': 'linear-gradient(135deg,#ec4899,#e11d48)', '--icon-shadow': '0 12px 24px rgba(236,72,153,0.25)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-red-700">{stats.rejected}</h3>
                <p className="text-slate-500">Rejected</p>
              </div>
              <div className="premium-icon w-12 h-12 rounded-xl">
                <XCircle className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        <div className="premium-panel rounded-2xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="premium-input w-full pl-10 pr-4 py-3 rounded-xl text-slate-900 placeholder-slate-400"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="premium-input w-full pl-10 pr-4 py-3 rounded-xl text-slate-900"
              >
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select
                value={leaveTypeFilter}
                onChange={(e) => setLeaveTypeFilter(e.target.value)}
                className="premium-input w-full pl-10 pr-4 py-3 rounded-xl text-slate-900"
              >
                <option value="">All Types</option>
                <option value="Casual">Casual</option>
                <option value="Sick">Sick</option>
                <option value="Earned">Earned</option>
                <option value="Emergency">Emergency</option>
                <option value="Personal">Personal</option>
              </select>
            </div>

            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setLeaveTypeFilter('');
              }}
              className="px-4 py-3 border border-slate-300 text-slate-700 rounded-lg bg-white hover:bg-slate-50 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <div className="premium-panel rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <Loader className="w-8 h-8 text-blue-600 mx-auto mb-4 animate-spin" />
              <p className="text-slate-500">Loading leave applications...</p>
            </div>
          ) : (
            <>
              <div className="md:hidden grid gap-4 p-4">
                {leaves.map((leave) => (
                  <div key={leave._id} className="bg-white border border-slate-200 rounded-xl p-4 hover:bg-indigo-50/60 transition-all duration-200 shadow-sm hover:-translate-y-0.5 hover:shadow-md">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-900 font-medium text-sm truncate">
                            {leave.employee?.fullName ||
                              (leave.employee?.personalInfo?.firstName + ' ' + leave.employee?.personalInfo?.lastName) ||
                              leave.employee?.user?.name}
                          </p>
                          <p className="text-slate-500 text-xs flex items-center">
                            <span className="truncate">{leave.employee?.employeeId || leave.employee?.user?.employeeId}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-2">
                        <button
                          onClick={() => {
                            setSelectedLeave(leave);
                            setShowModal(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {leave.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(leave._id)}
                              className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Quick Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(leave._id, 'Application rejected')}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Quick Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-xs">Leave Type</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${getLeaveTypeColor(leave.leaveType)}`}>
                          {leave.leaveType}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-xs">Duration</span>
                        <span className="text-slate-900 text-sm">
                          {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-xs">Days</span>
                        <span className="text-slate-900 text-sm">{leave.totalDays} days</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-xs">Applied Date</span>
                        <span className="text-slate-500 text-sm">
                          {new Date(leave.appliedDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-xs">Status</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(leave.status)}`}>
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
                        <th className="text-left p-6 text-slate-500 font-semibold">Employee</th>
                        <th className="text-left p-6 text-slate-500 font-semibold">Leave Type</th>
                        <th className="text-left p-6 text-slate-500 font-semibold">Duration</th>
                        <th className="text-left p-6 text-slate-500 font-semibold">Applied Date</th>
                        <th className="text-left p-6 text-slate-500 font-semibold">Status</th>
                        <th className="text-left p-6 text-slate-500 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaves.map((leave) => (
                        <tr key={leave._id} className="premium-table-row border-b border-slate-100">
                          <td className="p-6">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-slate-900 font-medium">
                                  {leave.employee?.fullName ||
                                    (leave.employee?.personalInfo?.firstName + ' ' + leave.employee?.personalInfo?.lastName) ||
                                    leave.employee?.user?.name}
                                </p>
                                <p className="text-slate-500 text-sm">{leave.employee?.employeeId || leave.employee?.user?.employeeId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-6">
                            <span className={`px-3 py-1 text-xs rounded-full ${getLeaveTypeColor(leave.leaveType)}`}>
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
                            <span className={`px-3 py-1 text-xs rounded-full ${getStatusColor(leave.status)}`}>
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
                                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {leave.status === 'Pending' && (
                                <>
                                  <button
                                    onClick={() => handleApprove(leave._id)}
                                    className="p-2 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                    title="Quick Approve"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleReject(leave._id, 'Application rejected')}
                                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Quick Reject"
                                  >
                                    <XCircle className="w-4 h-4" />
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
            <div className="p-12 text-center">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No leave applications found</h3>
              <p className="text-slate-500">
                {searchTerm || statusFilter || leaveTypeFilter
                  ? 'Try adjusting your search filters'
                  : 'No leave applications have been submitted yet'}
              </p>
            </div>
          )}
        </div>
      </div>

      {showModal && <LeaveDetailModal />}
    </AdminLayout>
  );
};

export default AdminLeaveManagement;
