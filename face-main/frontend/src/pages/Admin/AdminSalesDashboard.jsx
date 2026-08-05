import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/Admin/layout/AdminLayout';
import {
  TrendingUp, DollarSign, Target, Award, Users, Calendar,
  Search, Filter, Download, Edit3, Trash2, Eye, User,
  RefreshCw, AlertCircle, CheckCircle, XCircle, Phone,
  Building2, GitBranch, UserCheck, Clock, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { leadAPI, salesPipelineAPI } from '../../utils/api';
import SalesPipelineModal from '../../components/Sales/SalesPipelineModal';

const AdminSalesDashboard = () => {
  // State
  const [leads, setLeads] = useState([]);
  const [summary, setSummary] = useState(null);
  const [funnelData, setFunnelData] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    department: '',
    status: 'all',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [reassignTo, setReassignTo] = useState('');

  // Fetch BDE employees for reassign dropdown
  const fetchBDEEmployees = async () => {
    try {
      const res = await leadAPI.getBDEEmployees();
      if (res.data.success) {
        setEmployees(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch BDE employees:', err);
    }
  };

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [leadsRes, summaryRes, meetingsRes, approvalsRes, pipelinesRes] = await Promise.all([
        leadAPI.getLeads({ ...filters, includeAll: true }),
        leadAPI.getLeadStats({ ...filters }),
        leadAPI.getUpcomingMeetings({ days: 30 }),
        salesPipelineAPI.getPendingApprovals(),
        salesPipelineAPI.getAll()
      ]);

      const fetchedLeads = leadsRes.data.success ? leadsRes.data.data.leads || [] : [];
      if (leadsRes.data.success) setLeads(fetchedLeads);
      if (summaryRes.data.success) setSummary(summaryRes.data.data);
      if (meetingsRes.data.success) setUpcomingMeetings(meetingsRes.data.data || []);
      if (approvalsRes.data.success) setPendingApprovals(approvalsRes.data.data || []);
      const fetchedPipelines = pipelinesRes.data.success ? pipelinesRes.data.data || [] : [];
      setFunnelData(buildPipelineFunnel(fetchedLeads, fetchedPipelines));
    } catch (err) {
      console.error('Failed to load sales data:', err);
      toast.error('Failed to load sales dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchBDEEmployees();
  }, []);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const buildPipelineFunnel = (leadEntries, pipelineEntries) => {
    const funnelStages = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won'];
    const counts = funnelStages.reduce((acc, stage) => ({ ...acc, [stage]: 0 }), {});
    const pipelineByLeadId = new Map(
      pipelineEntries
        .filter(pipeline => pipeline.lead?._id)
        .map(pipeline => [pipeline.lead._id, pipeline])
    );

    leadEntries.forEach((lead) => {
      const pipeline = pipelineByLeadId.get(lead._id);
      const stage = getFunnelStageForLead(lead, pipeline);
      counts[stage] += 1;
    });

    const total = leadEntries.length;
    return funnelStages.map((stage) => ({
      name: stage,
      count: counts[stage],
      percentage: total ? Math.round((counts[stage] / total) * 100) : 0
    }));
  };

  const getFunnelStageForLead = (lead, pipeline) => {
    if (!pipeline) {
      return lead.status === 'Won' ? 'Won' : 'New';
    }

    if (pipeline.outcome?.status === 'won' || pipeline.currentStage === 'won_closed') {
      return 'Won';
    }
    if (pipeline.currentStage === 'negotiation' || pipeline.negotiation?.enteredAt) {
      return 'Negotiation';
    }
    if (pipeline.currentStage === 'sent_to_client' || pipeline.sentToClient?.sentAt) {
      return 'Proposal';
    }
    if (pipeline.approval?.status === 'approved') {
      return 'Qualified';
    }
    if (
      pipeline.currentStage === 'quotation' ||
      pipeline.currentStage === 'admin_approval' ||
      pipeline.quotation?.quotationNumber ||
      pipeline.quotation?.amount ||
      ['pending', 'rejected', 'revision_requested'].includes(pipeline.approval?.status)
    ) {
      return 'Contacted';
    }
    return 'New';
  };

  // Helpers
  const getStatusColor = (status) => {
    switch (status) {
      case 'Won': return 'text-emerald-700 bg-emerald-50 border border-emerald-100';
      case 'Lost': return 'text-red-700 bg-red-50 border border-red-100';
      case 'Negotiation': return 'text-violet-700 bg-violet-50 border border-violet-100';
      case 'Proposal': return 'text-orange-700 bg-orange-50 border border-orange-100';
      case 'Qualified': return 'text-blue-700 bg-blue-50 border border-blue-100';
      case 'Contacted': return 'text-amber-700 bg-amber-50 border border-amber-100';
      default: return 'text-slate-600 bg-slate-100 border border-slate-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'text-red-700 bg-red-50 border border-red-100';
      case 'Medium': return 'text-amber-700 bg-amber-50 border border-amber-100';
      case 'Low': return 'text-emerald-700 bg-emerald-50 border border-emerald-100';
      default: return 'text-slate-600 bg-slate-100 border border-slate-200';
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleReassign = async () => {
    try {
      await leadAPI.reassignLead(selectedLead._id, { assignedTo: reassignTo });
      toast.success('Lead reassigned successfully!');
      setShowReassignModal(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to reassign lead');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this lead permanently?')) return;
    try {
      await leadAPI.deleteLead(id);
      toast.success('Lead deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete lead');
    }
  };

  const exportData = () => {
    const csvContent = [
      ['Lead ID', 'Name', 'Email', 'Company', 'Status', 'Priority', 'Value', 'Assigned To', 'Created At'],
      ...leads.map(l => [
        l.leadId || '',
        `${l.firstName} ${l.lastName}`,
        l.email,
        l.company || '',
        l.status,
        l.priority,
        l.estimatedValue || l.actualValue || 0,
        l.assignedTo?.personalInfo 
          ? `${l.assignedTo.personalInfo.firstName} ${l.assignedTo.personalInfo.lastName}`
          : 'Unassigned',
        new Date(l.createdAt).toLocaleDateString()
      ])
    ];
    const csv = csvContent.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_report_${filters.startDate}_to_${filters.endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Sales report exported!');
  };

  // Format helpers
  const formatCurrency = (value) => `₹${(value || 0).toLocaleString()}`;
  const formatDate = (date) => date ? new Date(date).toLocaleDateString() : '—';
  const formatDateTime = (date) => date ? new Date(date).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : '—';
  const getNextMeeting = (lead) => {
    return (lead.meetings || [])
      .filter(meeting => meeting.status === 'Scheduled' && new Date(meeting.scheduledDate) >= new Date())
      .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))[0];
  };

  return (
    <AdminLayout>
      <div className="admin-page-shell w-full min-h-[calc(100vh-7rem)] space-y-6">
        {/* Header */}
        <div className="premium-panel rounded-2xl p-3 sm:p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-1">
                Sales <span className="text-blue-600">Dashboard</span>
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm">Monitor and manage your sales pipeline</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-slate-200 flex items-center gap-1.5 text-xs sm:text-sm transition-colors shadow-sm"
              >
                <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Filters</span>
              </button>
              <button
                onClick={exportData}
                disabled={leads.length === 0}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl border border-blue-100 flex items-center gap-1.5 text-xs sm:text-sm transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Export</span>
              </button>
              <button
                onClick={fetchData}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-1.5 text-xs sm:text-sm transition-colors shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <StatCard 
              title="Total Revenue" 
              value={formatCurrency(summary.wonStats?.totalRevenue)} 
              icon={DollarSign}
              color="green"
            />
            <StatCard 
              title="Target Achievement" 
              value={`${summary.achievementRate || 0}%`} 
              icon={Target}
              color="indigo"
            />
            <StatCard 
              title="Win Rate" 
              value={`${summary.winRate || 0}%`} 
              icon={Award}
              color="blue"
            />
            <StatCard 
              title="Active Leads" 
              value={summary.activeLeads || 0} 
              icon={Users}
              color="purple"
            />
            <StatCard
              title="Upcoming Meetings"
              value={upcomingMeetings.length}
              icon={Calendar}
              color="blue"
            />
            <StatCard
              title="Pending Approvals"
              value={pendingApprovals.length}
              icon={ShieldCheckIcon}
              color="indigo"
            />
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <div className="premium-panel rounded-2xl p-3 sm:p-4 md:p-6">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3">Filters</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm text-slate-600 mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="premium-input w-full px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-slate-900 text-xs sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-slate-600 mb-1.5">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="premium-input w-full px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-slate-900 text-xs sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-slate-600 mb-1.5">Department</label>
                <select
                  value={filters.department}
                  onChange={(e) => handleFilterChange('department', e.target.value)}
                  className="premium-input w-full px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-slate-900 text-xs sm:text-sm"
                >
                  <option value="">All Departments</option>
                  <option value="Sales">Sales</option>
                  <option value="Marketing">Marketing</option>
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-slate-600 mb-1.5">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="premium-input w-full px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-slate-900 text-xs sm:text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="Won">Won</option>
                  <option value="Lost">Lost</option>
                  <option value="Negotiation">Negotiation</option>
                  <option value="Proposal">Proposal</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Contacted">Contacted</option>
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-slate-600 mb-1.5">Search</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Lead name, email..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="premium-input w-full pl-8 pr-3 py-1.5 sm:py-2 rounded-lg text-slate-900 placeholder-slate-400 text-xs sm:text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Funnel Chart */}
        {funnelData.length > 0 && (
          <div className="premium-panel rounded-2xl p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between sm:mb-4">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Sales Funnel</h3>
              <span className="text-xs font-medium text-slate-500">
                {funnelData.reduce((sum, stage) => sum + stage.count, 0)} leads
              </span>
            </div>
            <div className="space-y-3 sm:space-y-2">
              {funnelData.map((stage) => (
                <div key={stage.name} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0">
                  <div className="w-full sm:w-20 text-slate-600 text-sm font-medium">{stage.name}</div>
                  <div className="flex-1 bg-slate-100 rounded-full h-2 mx-0 sm:mx-4 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 transition-all duration-500"
                      style={{ width: `${stage.percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between sm:w-28 sm:justify-end sm:gap-3 text-sm font-medium">
                    <span className="text-slate-700">{stage.count}</span>
                    <span className="text-slate-400 sm:hidden">leads</span>
                    <span className="text-blue-700">{stage.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leads Table */}
        <div className="premium-panel rounded-2xl overflow-hidden">
          <div className="p-3 sm:p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">All Leads & Deals</h2>
              <p className="text-slate-500 text-xs sm:text-sm">
                Showing {leads.length} leads
              </p>
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto -mx-3 px-3">
              <table className="w-full min-w-[600px]">
                <thead className="border-b border-slate-200">
                  <tr>
                    <th className="text-left p-2 sm:p-3 text-slate-500 font-semibold text-xs sm:text-sm">Lead</th>
                    <th className="text-left p-2 sm:p-3 text-slate-500 font-semibold text-xs sm:text-sm">Status</th>
                    <th className="text-left p-2 sm:p-3 text-slate-500 font-semibold text-xs sm:text-sm">Value</th>
                    <th className="text-left p-2 sm:p-3 text-slate-500 font-semibold text-xs sm:text-sm">Assigned To</th>
                    <th className="text-left p-2 sm:p-3 text-slate-500 font-semibold text-xs sm:text-sm">Follow-up</th>
                    <th className="text-left p-2 sm:p-3 text-slate-500 font-semibold text-xs sm:text-sm">Next Meeting</th>
                    <th className="text-left p-2 sm:p-3 text-slate-500 font-semibold text-xs sm:text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="7" className="py-6 text-center text-slate-500">Loading...</td></tr>
                  ) : leads.length === 0 ? (
                    <tr><td colSpan="7" className="py-8 text-center text-slate-500">No leads found</td></tr>
                  ) : (
                    leads.map(lead => {
                      const nextMeeting = getNextMeeting(lead);
                      return (
                      <tr key={lead._id} className="border-b border-slate-200 hover:bg-blue-50 transition-colors duration-200">
                        <td className="p-2 sm:p-3">
                          <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center ">
                              <User className="w-3 h-3 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-slate-900 font-semibold text-xs sm:text-sm">
                                {lead.firstName} {lead.lastName}
                              </p>
                              <p className="text-[10px] text-slate-500">{lead.company || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-2 sm:p-3">
                          <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${getStatusColor(lead.status)}`}>
                            {lead.status}
                          </span>
                        </td>
<td className="p-2 sm:p-3 text-blue-700 font-semibold text-xs sm:text-sm">                          {formatCurrency(lead.estimatedValue || lead.actualValue)}
                        </td>
                        <td className="p-2 sm:p-3 text-slate-700 text-xs sm:text-sm">
                          {lead.assignedTo?.personalInfo
                            ? `${lead.assignedTo.personalInfo.firstName} ${lead.assignedTo.personalInfo.lastName}`
                            : 'Unassigned'}
                        </td>
                        <td className="p-2 sm:p-3 text-slate-500 text-xs sm:text-sm">
                          {formatDate(lead.nextFollowUpDate)}
                        </td>
                        <td className="p-2 sm:p-3 text-xs sm:text-sm">
                          {nextMeeting ? (
                            <div>
                              <p className="font-semibold text-slate-900">{nextMeeting.type}</p>
                              <p className="text-slate-500">{formatDateTime(nextMeeting.scheduledDate)}</p>
                            </div>
                          ) : (
                            <span className="text-slate-400">No meeting</span>
                          )}
                        </td>
                        <td className="p-2 sm:p-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setSelectedLead(lead);
                                setShowViewModal(true);
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedLead(lead);
                                setReassignTo(lead.assignedTo?._id || '');
                                setShowReassignModal(true);
                              }}
                              className="p-1 text-slate-400 hover:text-indigo-600"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(lead._id)}
                              className="p-1 text-slate-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedLead(lead);
                                setShowPipelineModal(true);
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600"
                              title="View Pipeline"
                            >
                              <GitBranch className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )})
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="block sm:hidden space-y-4">
              {loading ? (
                <div className="text-center py-8 text-slate-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2">Loading leads...</p>
                </div>
              ) : leads.length === 0 ? (
                <div className="text-center py-8">
                  <User className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-500">No leads found</p>
                </div>
              ) : (
                leads.map(lead => {
                  const nextMeeting = getNextMeeting(lead);
                  return (
                  <div key={lead._id} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:border-blue-200 hover:bg-blue-50/40 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-sm shadow-blue-500/20">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-slate-900 font-semibold text-base">{lead.firstName} {lead.lastName}</p>
                          <p className="text-sm text-slate-500">{lead.company || '—'}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setSelectedLead(lead);
                            setShowViewModal(true);
                          }}
                          className="p-2 text-slate-400 hover:text-blue-600"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedLead(lead);
                            setReassignTo(lead.assignedTo?._id || '');
                            setShowReassignModal(true);
                          }}
                          className="p-2 text-slate-400 hover:text-indigo-600"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(lead._id)}
                          className="p-2 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedLead(lead);
                            setShowPipelineModal(true);
                          }}
                          className="p-2 text-slate-400 hover:text-blue-600"
                          title="View Pipeline"
                        >
                          <GitBranch className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500">Status</p>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(lead.status)}`}>
                          {lead.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-slate-500">Value</p>
                        <p className="text-blue-700 font-semibold">{formatCurrency(lead.estimatedValue || lead.actualValue)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Assigned To</p>
                        <p className="text-slate-900">
                          {lead.assignedTo?.personalInfo
                            ? `${lead.assignedTo.personalInfo.firstName} ${lead.assignedTo.personalInfo.lastName}`
                            : 'Unassigned'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Next Follow-up</p>
                        <p className="text-slate-900">{formatDate(lead.nextFollowUpDate)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Next Meeting</p>
                        <p className="text-slate-900">
                          {nextMeeting ? `${nextMeeting.type} - ${formatDateTime(nextMeeting.scheduledDate)}` : 'No meeting'}
                        </p>
                      </div>
                    </div>
                  </div>
                )})
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reassign Modal */}
      {showReassignModal && (
        <div className="fixed inset-0 bg-slate-950/35 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="premium-panel rounded-2xl p-4 sm:p-5 w-full max-w-md">
            <h3 className="text-lg font-bold text-slate-900 mb-3">Reassign Lead</h3>
            <p className="text-slate-500 text-sm mb-4">
              Reassign <span className="font-semibold text-slate-900">{selectedLead?.firstName} {selectedLead?.lastName}</span>
            </p>
            <select
              value={reassignTo}
              onChange={(e) => setReassignTo(e.target.value)}
              className="premium-input w-full px-3 py-2 rounded-lg text-slate-900 text-sm mb-4"
            >
              <option value="">Select Sales Rep</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp._id}>
                  {emp.personalInfo?.firstName} {emp.personalInfo?.lastName}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={handleReassign}
                disabled={!reassignTo}
                className="premium-primary-button flex-1 px-3 py-2 rounded-lg text-sm disabled:opacity-50"
              >
                Reassign
              </button>
              <button
                onClick={() => setShowReassignModal(false)}
                className="flex-1 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Lead Modal */}
      {showViewModal && selectedLead && (
        <div className="fixed inset-0 bg-slate-950/35 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="premium-panel rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-slate-900">Lead Details</h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <p className="text-slate-500 text-xs">Name</p>
                  <p className="text-slate-900 font-medium">{selectedLead.firstName} {selectedLead.lastName}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Email</p>
                  <p className="text-slate-900">{selectedLead.email || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Phone</p>
                  <p className="text-slate-900">{selectedLead.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Company</p>
                  <p className="text-slate-900">{selectedLead.company || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Position</p>
                  <p className="text-slate-900">{selectedLead.position || '—'}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-slate-500 text-xs">Status</p>
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(selectedLead.status)}`}>
                    {selectedLead.status}
                  </span>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Priority</p>
                  <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(selectedLead.priority)}`}>
                    {selectedLead.priority || 'Medium'}
                  </span>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Estimated Value</p>
                  <p className="text-blue-700 font-semibold">{formatCurrency(selectedLead.estimatedValue)}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Source</p>
                  <p className="text-slate-900">{selectedLead.source || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Assigned To</p>
                  <p className="text-slate-900">
                    {selectedLead.assignedTo?.personalInfo
                      ? `${selectedLead.assignedTo.personalInfo.firstName} ${selectedLead.assignedTo.personalInfo.lastName}`
                      : 'Unassigned'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-500 text-xs">Next Follow-up</p>
                  <p className="text-slate-900">{formatDate(selectedLead.nextFollowUpDate)}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Expected Close</p>
                  <p className="text-slate-900">{formatDate(selectedLead.expectedCloseDate)}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Created</p>
                  <p className="text-slate-900">{formatDate(selectedLead.createdAt)}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Lead ID</p>
                  <p className="break-all text-slate-900">{selectedLead.leadId || selectedLead._id}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Scheduled Meetings</h4>
              {selectedLead.meetings?.length ? (
                <div className="space-y-2">
                  {selectedLead.meetings
                    .slice()
                    .sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate))
                    .map((meeting) => (
                      <div key={meeting._id || meeting.meetingId} className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{meeting.type}</p>
                            <p className="text-xs text-slate-500">{formatDateTime(meeting.scheduledDate)} • {meeting.duration || 30} min</p>
                          </div>
                          <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {meeting.status}
                          </span>
                        </div>
                        {meeting.agenda && (
                          <p className="mt-2 text-xs text-slate-600">{meeting.agenda}</p>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No meetings scheduled yet.</p>
              )}
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showPipelineModal && selectedLead && (
        <SalesPipelineModal
          lead={selectedLead}
          role="admin"
          onClose={() => setShowPipelineModal(false)}
          onUpdated={fetchData}
        />
      )}
    </AdminLayout>
  );
};

const ShieldCheckIcon = ({ className }) => <CheckCircle className={className} />;

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, color }) => {
  const themes = {
    green: {
      value: 'text-emerald-700',
      icon: 'text-white',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      soft: 'rgba(16,185,129,0.10)'
    },
    indigo: {
      value: 'text-indigo-700',
      icon: 'text-white',
      iconBg: 'bg-gradient-to-br from-indigo-500 to-violet-600',
      soft: 'rgba(99,102,241,0.10)'
    },
    blue: {
      value: 'text-blue-700',
      icon: 'text-white',
      iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-600',
      soft: 'rgba(59,130,246,0.10)'
    },
    purple: {
      value: 'text-violet-700',
      icon: 'text-white',
      iconBg: 'bg-gradient-to-br from-violet-500 to-fuchsia-600',
      soft: 'rgba(124,58,237,0.10)'
    }
  };
  const theme = themes[color] || themes.blue;
  
  return (
    <div className="premium-stat-card rounded-xl p-3 sm:p-4" style={{ '--stat-soft': theme.soft }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500 text-xs font-medium">{title}</p>
          <p className={`text-lg sm:text-xl font-bold ${theme.value}`}>
            {value}
          </p>
        </div>
        <div className={`h-9 w-9 rounded-xl ${theme.iconBg} flex items-center justify-center shadow-sm`}>
          <Icon className={`w-5 h-5 ${theme.icon}`} />
        </div>
      </div>
    </div>
  );
};

export default AdminSalesDashboard;
