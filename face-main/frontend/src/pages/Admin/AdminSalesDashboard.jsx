import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import AdminLayout from '../../components/Admin/layout/AdminLayout';
import {
  TrendingUp, DollarSign, Target, Award, Users, Calendar,
  Download, Edit3, Trash2, Eye, User, Plus,
  RefreshCw, AlertCircle, CheckCircle, XCircle, Phone,
  Building2, UserCheck, Clock, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { leadAPI, salesPipelineAPI } from '../../utils/api';
import SalesPipelineModal from '../../components/Sales/SalesPipelineModal';
import SearchWithSuggestions from '../../components/Common/SearchWithSuggestions';

const AdminSalesDashboard = () => {
  const location = useLocation();
  const initialSearch = location.state?.employeeFilter || location.state?.search || location.state?.leadName || location.state?.leadFilter || '';

  // State
  const [leads, setLeads] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [leadSuggestions, setLeadSuggestions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [funnelData, setFunnelData] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(() => ({
    startDate: initialSearch ? '' : new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10),
    endDate: initialSearch ? '' : new Date().toISOString().slice(0, 10),
    department: '',
    status: 'all',
    search: initialSearch
  }));
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [reassignTo, setReassignTo] = useState('');
  const defaultNewLead = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    source: 'Referral',
    priority: 'Medium',
    estimatedValue: '',
    expectedCloseDate: '',
    nextFollowUpDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    assignedTo: '',
    notes: ''
  };
  const [newLead, setNewLead] = useState(defaultNewLead);
  const pendingScrollLeadRef = useRef(null);

  const getLeadStageValue = (lead) => {
    if (!lead) return 0;
    const pipeline = (pipelines || []).find(p => String(p.lead?._id || p.lead) === String(lead._id));

    const isWon = lead.status === 'Won' || lead.status === 'won' || pipeline?.outcome?.status === 'won' || pipeline?.currentStage === 'won_closed' || (lead.wonDetails?.finalValue !== undefined && lead.wonDetails?.finalValue !== null && Number(lead.wonDetails?.finalValue) > 0) || (pipeline?.outcome?.finalValue !== undefined && pipeline?.outcome?.finalValue !== null && Number(pipeline?.outcome?.finalValue) > 0) || !!lead.wonDetails?.wonDate;

    if (isWon) {
      const finalVal = pipeline?.outcome?.finalValue !== undefined && pipeline?.outcome?.finalValue !== null && pipeline?.outcome?.finalValue !== ''
        ? Number(pipeline.outcome.finalValue)
        : (lead.wonDetails?.finalValue !== undefined && lead.wonDetails?.finalValue !== null && lead.wonDetails?.finalValue !== ''
          ? Number(lead.wonDetails.finalValue)
          : Number(lead.actualValue || lead.estimatedValue || 0));
      return isNaN(finalVal) ? 0 : finalVal;
    }

    const stageVal = pipeline?.outcome?.finalValue || pipeline?.proposal?.pricing?.totalPrice || pipeline?.quotation?.totalAmount || pipeline?.quotation?.amount || lead.wonDetails?.finalValue || lead.proposalData?.pricing?.totalPrice || lead.quotationData?.amount || lead.actualValue || lead.estimatedValue || 0;

    const num = Number(stageVal);
    return isNaN(num) ? 0 : num;
  };

  const calculateDashboardStats = (leadEntries = [], pipelineEntries = []) => {
    const pipelineByLeadId = new Map(
      (pipelineEntries || [])
        .filter(p => p?.lead?._id || p?.lead)
        .map(p => [String(p.lead?._id || p.lead), p])
    );

    const wonLeads = leadEntries.filter(lead => {
      const pipeline = pipelineByLeadId.get(String(lead._id));
      return lead.status === 'Won' || lead.status === 'won' || pipeline?.outcome?.status === 'won' || pipeline?.currentStage === 'won_closed' || (lead.wonDetails?.finalValue !== undefined && lead.wonDetails?.finalValue !== null && Number(lead.wonDetails?.finalValue) > 0) || (pipeline?.outcome?.finalValue !== undefined && pipeline?.outcome?.finalValue !== null && Number(pipeline?.outcome?.finalValue) > 0) || !!lead.wonDetails?.wonDate;
    });

    const totalRevenue = wonLeads.reduce((sum, lead) => {
      const pipeline = pipelineByLeadId.get(String(lead._id));
      const finalValue = pipeline?.outcome?.finalValue !== undefined && pipeline?.outcome?.finalValue !== null && pipeline?.outcome?.finalValue !== ''
        ? Number(pipeline.outcome.finalValue)
        : (lead.wonDetails?.finalValue !== undefined && lead.wonDetails?.finalValue !== null && lead.wonDetails?.finalValue !== ''
          ? Number(lead.wonDetails.finalValue)
          : Number(lead.actualValue || lead.estimatedValue || 0));
      return sum + (isNaN(finalValue) ? 0 : finalValue);
    }, 0);

    const targetValue = leadEntries.reduce((sum, lead) => sum + Number(lead.estimatedValue || 0), 0);
    const activeLeads = leadEntries.filter(lead => !['Won', 'Lost'].includes(lead.status)).length;
    const scheduledMeetings = leadEntries.flatMap(lead => lead.meetings || [])
      .filter(meeting => meeting.status === 'Scheduled' && new Date(meeting.scheduledDate) >= new Date());
    const pendingPipelineApprovals = (pipelineEntries || []).filter(pipeline => pipeline.approval?.status === 'pending');

    return {
      totalRevenue,
      targetAchievement: targetValue ? Math.round((totalRevenue / targetValue) * 100) : 0,
      winRate: leadEntries.length ? Math.round((wonLeads.length / leadEntries.length) * 100) : 0,
      activeLeads,
      upcomingMeetings: scheduledMeetings.length,
      pendingApprovals: pendingPipelineApprovals.length
    };
  };

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

  const fetchLeadSuggestions = async () => {
    try {
      const res = await leadAPI.getLeads({ includeAll: true, limit: 500 });
      console.log('[lead suggestions] response:', res.data);
      if (res.data.success) {
        const list = Array.isArray(res.data.data?.leads)
          ? res.data.data.leads
          : Array.isArray(res.data.data)
            ? res.data.data
            : [];
        console.log('[lead suggestions] count:', list.length);
        setLeadSuggestions(list);
      }
    } catch (err) {
      console.error('[lead suggestions] FAILED:', err.response?.data || err.message || err);
    }
  };

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      const queryParams = { ...filters, includeAll: true };
      if (filters.search) {
        delete queryParams.startDate;
        delete queryParams.endDate;
      }
      const [leadsRes, pipelinesRes] = await Promise.all([
        leadAPI.getLeads(queryParams),
        salesPipelineAPI.getAll()
      ]);

      const fetchedLeads = leadsRes.data.success ? leadsRes.data.data.leads || [] : [];
      const pendingScrollLead = pendingScrollLeadRef.current;
      const displayLeads = pendingScrollLead && !fetchedLeads.some((lead) => lead._id === pendingScrollLead._id)
        ? [pendingScrollLead, ...fetchedLeads]
        : fetchedLeads;
      if (leadsRes.data.success) setLeads(displayLeads);
      const fetchedPipelines = pipelinesRes.data.success ? pipelinesRes.data.data || [] : [];
      setPipelines(fetchedPipelines);
      setSummary(calculateDashboardStats(fetchedLeads, fetchedPipelines));
      setFunnelData(buildPipelineFunnel(fetchedLeads, fetchedPipelines));
    } catch (err) {
      console.error('Failed to load sales data:', err);
      toast.error('Failed to load sales dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBDEEmployees();
    fetchLeadSuggestions();
  }, []);

  useEffect(() => {
    const passedSearch = location.state?.employeeFilter || location.state?.search || location.state?.leadName || location.state?.leadFilter;
    if (passedSearch) {
      setFilters(prev => ({
        ...prev,
        startDate: '',
        endDate: '',
        search: passedSearch
      }));
    }
  }, [location.state]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(timeout);
  }, [filters]);

  useEffect(() => {
    if (pendingScrollLeadRef.current) {
      scrollToLead(pendingScrollLeadRef.current);
    }
  }, [leads]);

  const buildPipelineFunnel = (leadEntries, pipelineEntries) => {
    const funnelStages = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won'];
    const counts = funnelStages.reduce((acc, stage) => ({ ...acc, [stage]: 0 }), {});
    const stageLeads = funnelStages.reduce((acc, stage) => ({ ...acc, [stage]: [] }), {});

    const pipelineByLeadId = new Map(
      pipelineEntries
        .filter(pipeline => pipeline.lead?._id)
        .map(pipeline => [pipeline.lead._id, pipeline])
    );

    leadEntries.forEach((lead) => {
      const pipeline = pipelineByLeadId.get(lead._id);
      const stage = getFunnelStageForLead(lead, pipeline);
      counts[stage] += 1;
      const leadName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || lead.fullName || lead.company || 'Lead';
      stageLeads[stage].push(leadName);
    });

    const total = leadEntries.length;
    return funnelStages.map((stage) => ({
      name: stage,
      count: counts[stage],
      leads: stageLeads[stage],
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
    if (pipeline.currentStage === 'proposal' || pipeline.proposal?.status === 'generated' || pipeline.proposal?.status === 'finalized') {
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
      const response = await leadAPI.reassignLead(selectedLead._id, { assignedTo: reassignTo });
      if (response.data.success && response.data.data) {
        setSelectedLead(response.data.data);
        setLeads((prev) => prev.map((lead) => lead._id === response.data.data._id ? response.data.data : lead));
        setLeadSuggestions((prev) => prev.map((lead) => lead._id === response.data.data._id ? response.data.data : lead));
      }
      toast.success('Lead reassigned successfully!');
      setShowReassignModal(false);
      setReassignTo('');
      fetchData();
      fetchLeadSuggestions();
    } catch {
      toast.error('Failed to reassign lead');
    }
  };

  const handleAddLead = async (event) => {
    event.preventDefault();
    if (!newLead.assignedTo) {
      toast.error('Please select employee to assign this lead');
      return;
    }

    try {
      const leadData = {
        ...newLead,
        estimatedValue: newLead.estimatedValue ? Number(newLead.estimatedValue) : undefined,
        expectedCloseDate: newLead.expectedCloseDate || undefined,
        nextFollowUpDate: newLead.nextFollowUpDate || undefined
      };
      const response = await leadAPI.createLead(leadData);
      if (response.data.success) {
        const createdLead = response.data.data;
        toast.success('Lead added and assigned successfully!');
        setNewLead(defaultNewLead);
        setShowAddModal(false);
        if (createdLead?._id) pendingScrollLeadRef.current = createdLead;
        await Promise.all([fetchData(), fetchLeadSuggestions()]);
      }
    } catch (error) {
      toast.error(error.response?.data?.errors?.[0]?.msg || error.response?.data?.message || 'Failed to add lead');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this lead permanently?')) return;
    try {
      await leadAPI.deleteLead(id);
      toast.success('Lead deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete lead');
    }
  };

  const isInteractiveClick = (event) =>
    event.target.closest('button, a, input, select, textarea, label');

  const openLeadDetails = (event, lead) => {
    if (isInteractiveClick(event)) return;
    setSelectedLead(lead);
    setShowViewModal(true);
  };

  const openSelectedLeadPipeline = () => {
    setShowViewModal(false);
    setShowPipelineModal(true);
  };

  const getLeadSearchValue = (lead) => [lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.email || lead.company || '';

  const isSalesEmployee = (employee) => {
    const department = String(employee?.department || '').replace(/\s+/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
    return new Set([
      'bde',
      'businessdevelopmentexecutive',
      'sales',
      'businessdevelopment',
      'bd',
      'bdexecutive',
      'salesdepartment',
      'salesteam'
    ]).has(department);
  };

  const scrollToLead = (lead, attempt = 0) => {
    if (!lead?._id) return;
    window.setTimeout(() => {
      const candidates = Array.from(document.querySelectorAll(`[data-lead-id="${lead._id}"]`));
      const target = candidates.find((element) => element.offsetParent !== null) || candidates[0];
      if (!target && attempt < 12) {
        scrollToLead(lead, attempt + 1);
        return;
      }
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target?.classList.add('ring-2', 'ring-blue-400', 'ring-offset-2');
      window.setTimeout(() => {
        target?.classList.remove('ring-2', 'ring-blue-400', 'ring-offset-2');
        if (pendingScrollLeadRef.current?._id === lead._id) {
          pendingScrollLeadRef.current = null;
        }
      }, 1600);
    }, 180);
  };

  const handleLeadSuggestionSelect = (lead) => {
    pendingScrollLeadRef.current = lead;
    setFilters((prev) => ({
      ...prev,
      startDate: '',
      endDate: '',
      status: 'all',
      search: getLeadSearchValue(lead)
    }));
    scrollToLead(lead);
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
      <div className="admin-page-shell w-full min-h-[calc(100vh-7rem)] space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="premium-panel rounded-2xl p-3 sm:p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-1">
                Sales <span className="text-blue-600">Dashboard</span>
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm">Monitor and manage your sales pipeline</p>
            </div>
            <div className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="justify-center px-1.5 py-1.5 sm:px-4 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg sm:rounded-xl flex items-center gap-1 text-[11px] sm:text-sm font-semibold transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="truncate">Add Lead</span>
              </button>
              <button
                onClick={exportData}
                disabled={leads.length === 0}
                className="justify-center px-1.5 py-1.5 sm:px-4 sm:py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg sm:rounded-xl border border-blue-100 flex items-center gap-1 text-[11px] sm:text-sm font-semibold transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="truncate">Export</span>
              </button>
              <button
                onClick={fetchData}
                className="justify-center px-1.5 py-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg sm:rounded-xl flex items-center gap-1 text-[11px] sm:text-sm font-semibold transition-colors shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${loading ? 'animate-spin' : ''}`} />
                <span className="truncate">Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
            <StatCard 
              title="Total Revenue" 
              value={formatCurrency(summary.totalRevenue)} 
              icon={DollarSign}
              color="green"
            />
            <StatCard 
              title="Target Achievement" 
              value={`${summary.targetAchievement || 0}%`} 
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
              value={summary.upcomingMeetings || 0}
              icon={Calendar}
              color="blue"
            />
            <StatCard
              title="Pending Approvals"
              value={summary.pendingApprovals || 0}
              icon={ShieldCheckIcon}
              color="indigo"
            />
          </div>
        )}

        {/* Filters */}
        <div className="premium-panel rounded-2xl p-3 sm:p-4">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-3">Filters</h3>
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
                {/* <label className="block text-xs sm:text-sm text-slate-600 mb-1.5">Department</label>
                <select
                  value={filters.department}
                  onChange={(e) => handleFilterChange('department', e.target.value)}
                  className="premium-input w-full px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-slate-900 text-xs sm:text-sm"
                >
                  <option value="">All Departments</option>
                  <option value="Sales">Sales</option>
                  <option value="Marketing">Marketing</option>
                </select> */}
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
               <div>
                <label className="block text-xs sm:text-sm text-slate-600 mb-1.5">Search</label>
                <SearchWithSuggestions
                  value={filters.search}
                  onChange={(value) => handleFilterChange('search', value)}
                  onSelect={handleLeadSuggestionSelect}
                  items={leadSuggestions}
                  getSuggestionValue={getLeadSearchValue}
                  getSuggestionTitle={(lead) => getLeadSearchValue(lead)}
                  getSuggestionSubtitle={(lead) => [lead.email, lead.company, lead.leadId].filter(Boolean).join(' • ')}
                  placeholder="Lead name, email..."
                  inputClassName="premium-input !py-1.5 sm:!py-2 !rounded-lg !text-xs sm:!text-sm !border-slate-200"
                  maxSuggestions={8}
                />
              </div>
              </div>
             
            </div>
          </div>

        {/* Funnel Chart */}
        {!filters.search && funnelData.length > 0 && (
          <div className="premium-panel !overflow-visible rounded-xl sm:rounded-2xl p-3 sm:p-4">
            <div className="mb-2.5 sm:mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-lg font-bold text-slate-900">Sales Funnel</h3>
                <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                  {funnelData.reduce((sum, stage) => sum + stage.count, 0)} total leads
                </span>
              </div>
            </div>
            <div className="space-y-1.5 sm:space-y-2.5">
              {funnelData.map((stage, idx) => {
                const isTopRow = idx === 0;
                return (
                  <div key={stage.name} className="flex items-center justify-between gap-2 p-1.5 sm:p-0 rounded-lg sm:rounded-none bg-slate-50/70 sm:bg-transparent border sm:border-0 border-slate-100">
                    <div className="w-20 sm:w-24 text-slate-700 text-xs sm:text-sm font-semibold truncate shrink-0">{stage.name}</div>
                    
                    {/* Progress Bar Container with Hover Tooltip */}
                    <div className="relative group flex-1 mx-1.5 sm:mx-4 py-1 cursor-pointer">
                      <div className="bg-slate-200/80 rounded-full h-2 sm:h-2.5 overflow-hidden shadow-inner">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 transition-all duration-500 group-hover:brightness-110"
                          style={{ width: `${stage.percentage}%` }}
                        ></div>
                      </div>

                      {/* Tooltip on Hover */}
                      <div className={`absolute left-1/2 -translate-x-1/2 z-40 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 ease-out transform ${
                        isTopRow 
                          ? 'top-full mt-2 group-hover:translate-y-0 -translate-y-1' 
                          : 'bottom-full mb-2 group-hover:translate-y-0 translate-y-1'
                      }`}>
                        <div className="bg-slate-900/95 text-white backdrop-blur-md rounded-xl p-2.5 shadow-2xl border border-slate-700/60 min-w-[150px] max-w-[240px]">
                          <div className="flex items-center justify-between gap-2 mb-1.5 border-b border-slate-800 pb-1">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400">
                              {stage.name} Leads
                            </span>
                            <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full border border-blue-400/30">
                              {stage.count}
                            </span>
                          </div>
                          {stage.leads && stage.leads.length > 0 ? (
                            <ul className="space-y-1 max-h-32 overflow-y-auto pr-0.5 custom-tooltip-scroll">
                              {stage.leads.map((name, i) => (
                                <li key={i} className="text-[11px] font-medium text-slate-200 truncate flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                                  <span className="truncate">{name}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-[10px] text-slate-400 italic">No leads in stage</p>
                          )}
                        </div>
                        {/* Triangle Pointer */}
                        <div className={`w-2 h-2 bg-slate-900/95 border-slate-700/60 rotate-45 absolute left-1/2 -translate-x-1/2 ${
                          isTopRow 
                            ? '-top-1 border-l border-t' 
                            : '-bottom-1 border-r border-b'
                        }`}></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1 sm:w-28 text-xs sm:text-sm font-semibold shrink-0">
                      <span className="text-slate-900">{stage.count}</span>
                      <span className="text-[10px] sm:text-xs font-bold text-blue-600">({stage.percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <style>{`
              .custom-tooltip-scroll::-webkit-scrollbar { width: 2.5px; }
              .custom-tooltip-scroll::-webkit-scrollbar-track { background: transparent; }
              .custom-tooltip-scroll::-webkit-scrollbar-thumb { background: rgba(147,197,253,0.4); border-radius: 99px; }
              .custom-tooltip-scroll { scrollbar-width: thin; scrollbar-color: rgba(147,197,253,0.4) transparent; }
            `}</style>
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
                      <tr
                        key={lead._id}
                        data-lead-id={lead._id}
                        onClick={(event) => openLeadDetails(event, lead)}
                        className="border-b border-slate-200 hover:bg-blue-50 transition-all duration-300 cursor-pointer"
                      >
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
<td className="p-2 sm:p-3 text-blue-700 font-semibold text-xs sm:text-sm">                          {formatCurrency(getLeadStageValue(lead))}
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
                              className="rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 transition-colors hover:border-blue-200 hover:bg-blue-100"
                              title="View Pipeline"
                            >
                              View Pipeline
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
            <div className="scrollbar-hide block sm:hidden max-h-[68dvh] space-y-3 overflow-y-auto overscroll-contain pr-1">
              {loading ? (
                <div className="text-center py-8 text-slate-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-xs">Loading leads...</p>
                </div>
              ) : leads.length === 0 ? (
                <div className="text-center py-8">
                  <User className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-500 text-xs">No leads found</p>
                </div>
              ) : (
                leads.map(lead => {
                  const nextMeeting = getNextMeeting(lead);
                  return (
                  <div
                    key={lead._id}
                    data-lead-id={lead._id}
                    onClick={(event) => openLeadDetails(event, lead)}
                    className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm active:bg-blue-50/40 hover:border-blue-200 hover:bg-blue-50/40 transition-all duration-300 cursor-pointer space-y-2.5"
                  >
                    {/* Header: Lead Name & Company + Main Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 shrink-0 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm shadow-blue-500/20">
                          {lead.firstName ? lead.firstName[0]?.toUpperCase() : <User className="w-4 h-4 text-white" />}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 leading-snug truncate">
                            {lead.firstName} {lead.lastName}
                          </h4>
                          <p className="text-xs font-medium text-slate-500 truncate flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0 inline" />
                            <span>{lead.company || 'Individual Lead'}</span>
                          </p>
                        </div>
                      </div>
                      <span className={`inline-flex shrink-0 whitespace-nowrap px-2 py-0.5 rounded-full text-[11px] font-semibold ${getStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                    </div>

                    {/* Details Box */}
                    <div className="space-y-1.5 rounded-lg bg-slate-50/80 p-2.5 text-xs border border-slate-100">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 font-medium">Stage Value</span>
                        <span className="text-blue-700 font-bold">{formatCurrency(getLeadStageValue(lead))}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 font-medium">Assigned To</span>
                        <span className="font-semibold text-slate-800 truncate">
                          {lead.assignedTo?.personalInfo
                            ? `${lead.assignedTo.personalInfo.firstName} ${lead.assignedTo.personalInfo.lastName}`
                            : 'Unassigned'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 font-medium">Next Follow-up</span>
                        <span className="font-semibold text-slate-800">{formatDate(lead.nextFollowUpDate)}</span>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-slate-500 font-medium shrink-0">Meeting</span>
                        <span className="text-right font-medium text-slate-800 truncate">
                          {nextMeeting ? `${nextMeeting.type} - ${formatDateTime(nextMeeting.scheduledDate)}` : 'No meeting'}
                        </span>
                      </div>
                    </div>

                    {/* Card Actions Row: Neat icon buttons on left + View Pipeline pill on right */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLead(lead);
                            setReassignTo(lead.assignedTo?._id || '');
                            setShowReassignModal(true);
                          }}
                          className="p-1 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Reassign Lead"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(lead._id);
                          }}
                          className="p-1 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLead(lead);
                          setShowPipelineModal(true);
                        }}
                        className="rounded-lg border border-blue-200 bg-blue-50/80 px-2 py-0.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition-colors shrink-0"
                      >
                        View Pipeline
                      </button>
                    </div>
                  </div>
                )})
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-slate-950/35 backdrop-blur-md" onClick={() => setShowAddModal(false)} />
          <div className="premium-panel relative w-full max-w-4xl max-h-[90dvh] overflow-y-auto rounded-2xl p-4 sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add New Lead</h3>
                <p className="mt-1 text-sm text-slate-500">Create a lead and assign it directly to a sales employee.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                title="Close"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddLead} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <AdminLeadInput label="First Name *" value={newLead.firstName} onChange={(value) => setNewLead({ ...newLead, firstName: value })} required />
                <AdminLeadInput label="Last Name *" value={newLead.lastName} onChange={(value) => setNewLead({ ...newLead, lastName: value })} required />
                <AdminLeadInput label="Email *" type="email" value={newLead.email} onChange={(value) => setNewLead({ ...newLead, email: value })} required />
                <AdminLeadInput label="Phone *" value={newLead.phone} onChange={(value) => setNewLead({ ...newLead, phone: value })} required />
                <AdminLeadInput label="Company" value={newLead.company} onChange={(value) => setNewLead({ ...newLead, company: value })} />
                <AdminLeadInput label="Position" value={newLead.position} onChange={(value) => setNewLead({ ...newLead, position: value })} />
                <AdminLeadSelect
                  label="Assign To *"
                  value={newLead.assignedTo}
                  onChange={(value) => setNewLead({ ...newLead, assignedTo: value })}
                  options={employees.filter(isSalesEmployee).map((emp) => ({
                    value: emp._id,
                    label: `${emp.personalInfo?.firstName || ''} ${emp.personalInfo?.lastName || ''}`.trim() || emp.employeeId || 'Sales Employee'
                  }))}
                  placeholder="Select Sales Rep"
                  required
                />
                <AdminLeadSelect
                  label="Source"
                  value={newLead.source}
                  onChange={(value) => setNewLead({ ...newLead, source: value })}
                  options={['Website', 'Social Media', 'Email Campaign', 'Cold Call', 'Referral', 'Trade Show', 'Advertisement', 'Other'].map((item) => ({ value: item, label: item }))}
                />
                <AdminLeadSelect
                  label="Priority"
                  value={newLead.priority}
                  onChange={(value) => setNewLead({ ...newLead, priority: value })}
                  options={['Low', 'Medium', 'High', 'Hot'].map((item) => ({ value: item, label: item }))}
                />
                <AdminLeadInput label="Estimated Value (Rs.)" type="number" value={newLead.estimatedValue} onChange={(value) => setNewLead({ ...newLead, estimatedValue: value })} />
                <AdminLeadInput label="Expected Close Date" type="date" value={newLead.expectedCloseDate} onChange={(value) => setNewLead({ ...newLead, expectedCloseDate: value })} />
                <AdminLeadInput label="Next Follow-up" type="date" value={newLead.nextFollowUpDate} onChange={(value) => setNewLead({ ...newLead, nextFollowUpDate: value })} />
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs sm:text-sm text-slate-600">Notes</span>
                <textarea
                  value={newLead.notes}
                  onChange={(event) => setNewLead({ ...newLead, notes: event.target.value })}
                  rows={3}
                  className="premium-input w-full resize-y rounded-lg px-3 py-2 text-sm text-slate-900"
                  placeholder="Lead context, requirements, or first discussion notes"
                />
              </label>

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="premium-primary-button px-4 py-2 rounded-lg text-sm"
                >
                  Add Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reassign Modal */}
      {showReassignModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-slate-950/35 backdrop-blur-md" onClick={() => setShowReassignModal(false)} />
          <div className="premium-panel relative rounded-2xl p-4 sm:p-5 w-full max-w-md">
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
              {employees.filter(isSalesEmployee).map(emp => (
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
        <div
          className="fixed inset-0 bg-slate-950/35 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-4"
          onClick={() => setShowViewModal(false)}
        >
          <style>{`
            .lead-details-scroll {
              scrollbar-width: none;
              -ms-overflow-style: none;
            }
            .lead-details-scroll::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <div
            className="lead-details-scroll premium-panel w-full max-w-6xl max-h-[76dvh] overflow-y-auto rounded-xl p-3 shadow-[0_28px_80px_rgba(15,23,42,0.24)] sm:max-h-[calc(100dvh-1.5rem)] sm:rounded-2xl sm:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex justify-between items-start gap-3 mb-3 sm:mb-4">
              <div className="min-w-0">
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5 sm:mb-2 sm:gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedLead.status)}`}>
                    {selectedLead.status}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityColor(selectedLead.priority)}`}>
                    {selectedLead.priority || 'Medium'}
                  </span>
                </div>
                <h3 className="truncate text-lg font-bold text-slate-900 sm:text-2xl">{selectedLead.firstName} {selectedLead.lastName}</h3>
                <p className="truncate text-xs text-slate-500 sm:text-sm">{selectedLead.company || 'No company'}{selectedLead.position ? ` • ${selectedLead.position}` : ''}</p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={openSelectedLeadPipeline}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-blue-100 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 sm:text-sm"
                  title="View Pipeline"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden sm:inline">View Pipeline</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowViewModal(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  title="Close"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-[1.4fr_0.9fr]">
              <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 sm:gap-3 sm:text-sm lg:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-2.5 sm:rounded-xl sm:p-3">
                <div>
                  <p className="text-slate-500 text-xs">Name</p>
                  <p className="text-slate-900 font-medium">{selectedLead.firstName} {selectedLead.lastName}</p>
                </div>
              </div>
                <div className="rounded-lg border border-slate-200 bg-white p-2.5 sm:rounded-xl sm:p-3">
                  <p className="text-slate-500 text-xs">Email</p>
                  <p className="text-slate-900">{selectedLead.email || '—'}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-2.5 sm:rounded-xl sm:p-3">
                  <p className="text-slate-500 text-xs">Phone</p>
                  <p className="text-slate-900">{selectedLead.phone || '—'}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-2.5 sm:rounded-xl sm:p-3">
                  <p className="text-slate-500 text-xs">Company</p>
                  <p className="text-slate-900">{selectedLead.company || '—'}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-2.5 sm:rounded-xl sm:p-3">
                  <p className="text-slate-500 text-xs">Position</p>
                  <p className="text-slate-900">{selectedLead.position || '—'}</p>
                </div>
              
                <div className="rounded-lg border border-slate-200 bg-white p-2.5 sm:rounded-xl sm:p-3">
                  <p className="text-slate-500 text-xs">Status</p>
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(selectedLead.status)}`}>
                    {selectedLead.status}
                  </span>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-2.5 sm:rounded-xl sm:p-3">
                  <p className="text-slate-500 text-xs">Priority</p>
                  <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(selectedLead.priority)}`}>
                    {selectedLead.priority || 'Medium'}
                  </span>
                </div>
                <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-2.5 sm:rounded-xl sm:p-3">
                  <p className="text-slate-500 text-xs">Estimated Value</p>
                  <p className="text-blue-700 font-bold">{formatCurrency(selectedLead.estimatedValue)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-2.5 sm:rounded-xl sm:p-3">
                  <p className="text-slate-500 text-xs">Source</p>
                  <p className="text-slate-900">{selectedLead.source || '—'}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-2.5 sm:rounded-xl sm:p-3">
                  <p className="text-slate-500 text-xs">Assigned To</p>
                  <p className="text-slate-900">
                    {selectedLead.assignedTo?.personalInfo
                      ? `${selectedLead.assignedTo.personalInfo.firstName} ${selectedLead.assignedTo.personalInfo.lastName}`
                      : 'Unassigned'}
                  </p>
                </div>
              </div>
            
            <div className="border-t border-slate-200 pt-3 sm:pt-4">
              <div className="grid grid-cols-1 gap-2 text-xs min-[420px]:grid-cols-2 sm:gap-3 sm:text-sm lg:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-white p-2.5 sm:rounded-xl sm:p-3">
                  <p className="text-slate-500 text-xs">Next Follow-up</p>
                  <p className="text-slate-900">{formatDate(selectedLead.nextFollowUpDate)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-2.5 sm:rounded-xl sm:p-3">
                  <p className="text-slate-500 text-xs">Expected Close</p>
                  <p className="text-slate-900">{formatDate(selectedLead.expectedCloseDate)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-2.5 sm:rounded-xl sm:p-3">
                  <p className="text-slate-500 text-xs">Created</p>
                  <p className="text-slate-900">{formatDate(selectedLead.createdAt)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-2.5 sm:rounded-xl sm:p-3">
                  <p className="text-slate-500 text-xs">Lead ID</p>
                  <p className="break-all text-slate-900">{selectedLead.leadId || selectedLead._id}</p>
                </div>
              </div>
            </div>
              </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 sm:rounded-xl sm:p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-slate-900">Scheduled Meetings</h4>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-500">{selectedLead.meetings?.length || 0}</span>
              </div>
              {selectedLead.meetings?.length ? (
                <div className="lead-details-scroll max-h-[26dvh] space-y-2 overflow-y-auto pr-1 sm:max-h-[45dvh]">
                  {selectedLead.meetings
                    .slice()
                    .sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate))
                    .map((meeting) => (
                      <div key={meeting._id || meeting.meetingId} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{meeting.type}</p>
                            <p className="text-xs text-slate-500">{formatDateTime(meeting.scheduledDate)} • {meeting.duration || 30} min</p>
                          </div>
                          <span className="flex-shrink-0 rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {meeting.status}
                          </span>
                        </div>
                        {meeting.agenda && (
                          <p className="mt-2 line-clamp-2 text-xs text-slate-600">{meeting.agenda}</p>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">No meetings scheduled yet.</div>
              )}
            </div>
            </div>
            
            <div className="mt-3 flex justify-end sm:mt-4">
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
const StatCard = ({ title, value, icon, color }) => {
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
    <div className="premium-stat-card rounded-xl p-3 sm:p-4 md:p-5" style={{ '--stat-soft': theme.soft }}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-slate-500 text-[11px] sm:text-xs font-medium leading-tight">{title}</p>
          <p className={`truncate text-lg sm:text-xl font-bold leading-tight ${theme.value}`}>
            {value}
          </p>
        </div>
        <div className={`h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 rounded-xl ${theme.iconBg} flex items-center justify-center shadow-sm`}>
          {React.createElement(icon, { className: `w-4 h-4 sm:w-5 sm:h-5 ${theme.icon}` })}
        </div>
      </div>
    </div>
  );
};

const AdminLeadInput = ({ label, value, onChange, type = 'text', ...props }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs sm:text-sm text-slate-600">{label}</span>
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="premium-input w-full rounded-lg px-3 py-2 text-sm text-slate-900"
      {...props}
    />
  </label>
);

const AdminLeadSelect = ({ label, value, onChange, options, placeholder, ...props }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs sm:text-sm text-slate-600">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="premium-input w-full rounded-lg px-3 py-2 text-sm text-slate-900"
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

export default AdminSalesDashboard;
