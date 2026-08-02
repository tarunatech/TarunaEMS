import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/Admin/layout/AdminLayout';
import {
  TrendingUp, DollarSign, Target, Award, Users, Calendar,
  Search, Filter, Download, Edit3, Trash2, Eye, User,
  RefreshCw, AlertCircle, CheckCircle, XCircle, Phone,
  Building2, UserCheck, Clock, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { leadAPI } from '../../utils/api';

const AdminSalesDashboard = () => {
  // State
  const [leads, setLeads] = useState([]);
  const [summary, setSummary] = useState(null);
  const [funnelData, setFunnelData] = useState([]);
  const [employees, setEmployees] = useState([]);
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
      const [leadsRes, summaryRes] = await Promise.all([
        leadAPI.getLeads({ ...filters, includeAll: true }),
        leadAPI.getLeadStats({ ...filters })
      ]);

      const fetchedLeads = leadsRes.data.success ? leadsRes.data.data.leads || [] : [];
      if (leadsRes.data.success) setLeads(fetchedLeads);
      if (summaryRes.data.success) setSummary(summaryRes.data.data);
      setFunnelData([
        { name: 'New', count: fetchedLeads.filter(l => l.status === 'New').length },
        { name: 'Contacted', count: fetchedLeads.filter(l => l.status === 'Contacted').length },
        { name: 'Qualified', count: fetchedLeads.filter(l => l.status === 'Qualified').length },
        { name: 'Proposal', count: fetchedLeads.filter(l => l.status === 'Proposal').length },
        { name: 'Negotiation', count: fetchedLeads.filter(l => l.status === 'Negotiation').length },
        { name: 'Won', count: fetchedLeads.filter(l => l.status === 'Won').length }
      ]);
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

  return (
    <AdminLayout>
      <div className="w-full min-h-[calc(100vh-7rem)] space-y-6">
        {/* Header */}
        <div className="glass-morphism neon-border rounded-2xl p-3 sm:p-4 md:p-6">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
              color="neon-pink"
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
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <div className="glass-morphism neon-border rounded-2xl p-3 sm:p-4 md:p-6">
            <h3 className="text-base sm:text-lg font-bold text-white mb-3">Filters</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm text-secondary-400 mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 bg-secondary-800 border border-secondary-600 rounded-lg text-white text-xs sm:text-sm focus:border-neon-pink"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-secondary-400 mb-1.5">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 bg-secondary-800 border border-secondary-600 rounded-lg text-white text-xs sm:text-sm focus:border-neon-pink"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-secondary-400 mb-1.5">Department</label>
                <select
                  value={filters.department}
                  onChange={(e) => handleFilterChange('department', e.target.value)}
                  className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 bg-secondary-800 border border-secondary-600 rounded-lg text-white text-xs sm:text-sm focus:border-neon-pink"
                >
                  <option value="">All Departments</option>
                  <option value="Sales">Sales</option>
                  <option value="Marketing">Marketing</option>
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-secondary-900 mb-1.5">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 bg-secondary-800 border border-secondary-600 rounded-lg text-white text-xs sm:text-sm focus:border-neon-pink"
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
                <label className="block text-xs sm:text-sm text-secondary-900 mb-1.5">Search</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-secondary-400" />
                  <input
                    type="text"
                    placeholder="Lead name, email..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 sm:py-2 bg-secondary-800 border border-secondary-600 rounded-lg text-white placeholder-secondary-400 text-xs sm:text-sm focus:border-neon-pink"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Funnel Chart */}
        {funnelData.length > 0 && (
          <div className="glass-morphism neon-border rounded-2xl p-3 sm:p-4">
            <h3 className="text-base sm:text-lg font-bold text-slate-500 mb-3 sm:mb-4">Sales Funnel</h3>
            <div className="space-y-3 sm:space-y-2">
              {funnelData.map((stage, i) => (
                <div key={stage.name} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0">
                  <div className="w-full sm:w-20 text-secondary-400 text-sm font-medium">{stage.name}</div>
                  <div className="flex-1 bg-secondary-700 rounded-full h-2 mx-0 sm:mx-4">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 transition-all duration-500"
                      style={{ width: `${(stage.count / funnelData[0].count) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between sm:justify-start sm:w-20 text-slate-500 text-sm font-medium">
                    <span>{stage.count}</span>
                    <span className="sm:hidden text-secondary-400">leads</span>
                  </div>
                  <div className="hidden sm:block w-16 text-slate-500 text-sm">{stage.conversionRate}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leads Table */}
        <div className="glass-morphism neon-border rounded-2xl overflow-hidden">
          <div className="p-3 sm:p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <h2 className="text-base sm:text-lg font-bold text-slate-500">All Leads & Deals</h2>
              <p className="text-secondary-400 text-xs sm:text-sm">
                Showing {leads.length} leads
              </p>
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto -mx-3 px-3">
              <table className="w-full min-w-[600px]">
                <thead className="border-b border-secondary-700">
                  <tr>
                    <th className="text-left p-2 sm:p-3 text-secondary-900 font-medium text-xs sm:text-sm">Lead</th>
                    <th className="text-left p-2 sm:p-3 text-secondary-900 font-medium text-xs sm:text-sm">Status</th>
                    <th className="text-left p-2 sm:p-3 text-secondary-900 font-medium text-xs sm:text-sm">Value</th>
                    <th className="text-left p-2 sm:p-3 text-secondary-900 font-medium text-xs sm:text-sm">Assigned To</th>
                    <th className="text-left p-2 sm:p-3 text-secondary-900 font-medium text-xs sm:text-sm">Next Follow-up</th>
                    <th className="text-left p-2 sm:p-3 text-secondary-900 font-medium text-xs sm:text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="6" className="py-6 text-center text-slate-500">Loading...</td></tr>
                  ) : leads.length === 0 ? (
                    <tr><td colSpan="6" className="py-8 text-center text-slate-500">No leads found</td></tr>
                  ) : (
                    leads.map(lead => (
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
                        <td className="p-2 sm:p-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setSelectedLead(lead);
                                setShowViewModal(true);
                              }}
                              className="p-1 text-secondary-400 hover:text-blue-400"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedLead(lead);
                                setReassignTo(lead.assignedTo?._id || '');
                                setShowReassignModal(true);
                              }}
                              className="p-1 text-secondary-400 hover:text-purple-400"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(lead._id)}
                              className="p-1 text-secondary-400 hover:text-red-400"
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

            {/* Mobile Cards */}
            <div className="block sm:hidden space-y-4">
              {loading ? (
                <div className="text-center py-8 text-secondary-400">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-neon-pink mx-auto"></div>
                  <p className="mt-2">Loading leads...</p>
                </div>
              ) : leads.length === 0 ? (
                <div className="text-center py-8">
                  <User className="w-10 h-10 text-secondary-600 mx-auto mb-2" />
                  <p className="text-secondary-400">No leads found</p>
                </div>
              ) : (
                leads.map(lead => (
                  <div key={lead._id} className="glass-morphism rounded-lg p-4 border border-secondary-700">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-neon-pink to-neon-purple rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-medium text-base">{lead.firstName} {lead.lastName}</p>
                          <p className="text-sm text-secondary-400">{lead.company || '—'}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setSelectedLead(lead);
                            setShowViewModal(true);
                          }}
                          className="p-2 text-secondary-400 hover:text-blue-400"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedLead(lead);
                            setReassignTo(lead.assignedTo?._id || '');
                            setShowReassignModal(true);
                          }}
                          className="p-2 text-secondary-400 hover:text-purple-400"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(lead._id)}
                          className="p-2 text-secondary-400 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-secondary-400">Status</p>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(lead.status)}`}>
                          {lead.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-secondary-400">Value</p>
                        <p className="text-neon-pink font-medium">{formatCurrency(lead.estimatedValue || lead.actualValue)}</p>
                      </div>
                      <div>
                        <p className="text-secondary-400">Assigned To</p>
                        <p className="text-white">
                          {lead.assignedTo?.personalInfo
                            ? `${lead.assignedTo.personalInfo.firstName} ${lead.assignedTo.personalInfo.lastName}`
                            : 'Unassigned'}
                        </p>
                      </div>
                      <div>
                        <p className="text-secondary-400">Next Follow-up</p>
                        <p className="text-white">{formatDate(lead.nextFollowUpDate)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reassign Modal */}
      {showReassignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-morphism neon-border rounded-2xl p-4 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-3">Reassign Lead</h3>
            <p className="text-secondary-400 text-sm mb-4">
              Reassign <span className="text-white">{selectedLead?.firstName} {selectedLead?.lastName}</span>
            </p>
            <select
              value={reassignTo}
              onChange={(e) => setReassignTo(e.target.value)}
              className="w-full px-3 py-2 bg-secondary-800 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink mb-4"
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
                className="flex-1 px-3 py-2 bg-gradient-to-r from-neon-pink to-neon-purple text-white rounded-lg text-sm disabled:opacity-50"
              >
                Reassign
              </button>
              <button
                onClick={() => setShowReassignModal(false)}
                className="flex-1 px-3 py-2 bg-secondary-700 text-white rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Lead Modal */}
      {showViewModal && selectedLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-morphism neon-border rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-white">Lead Details</h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-secondary-400 hover:text-white"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <p className="text-secondary-400 text-xs">Name</p>
                  <p className="text-white font-medium">{selectedLead.firstName} {selectedLead.lastName}</p>
                </div>
                <div>
                  <p className="text-secondary-400 text-xs">Email</p>
                  <p className="text-white">{selectedLead.email || '—'}</p>
                </div>
                <div>
                  <p className="text-secondary-400 text-xs">Phone</p>
                  <p className="text-white">{selectedLead.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-secondary-400 text-xs">Company</p>
                  <p className="text-white">{selectedLead.company || '—'}</p>
                </div>
                <div>
                  <p className="text-secondary-400 text-xs">Position</p>
                  <p className="text-white">{selectedLead.position || '—'}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-secondary-400 text-xs">Status</p>
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(selectedLead.status)}`}>
                    {selectedLead.status}
                  </span>
                </div>
                <div>
                  <p className="text-secondary-400 text-xs">Priority</p>
                  <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(selectedLead.priority)}`}>
                    {selectedLead.priority || 'Medium'}
                  </span>
                </div>
                <div>
                  <p className="text-secondary-400 text-xs">Estimated Value</p>
                  <p className="text-neon-pink font-medium">{formatCurrency(selectedLead.estimatedValue)}</p>
                </div>
                <div>
                  <p className="text-secondary-400 text-xs">Source</p>
                  <p className="text-white">{selectedLead.source || '—'}</p>
                </div>
                <div>
                  <p className="text-secondary-400 text-xs">Assigned To</p>
                  <p className="text-white">
                    {selectedLead.assignedTo?.personalInfo
                      ? `${selectedLead.assignedTo.personalInfo.firstName} ${selectedLead.assignedTo.personalInfo.lastName}`
                      : 'Unassigned'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-secondary-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-secondary-400 text-xs">Next Follow-up</p>
                  <p className="text-white">{formatDate(selectedLead.nextFollowUpDate)}</p>
                </div>
                <div>
                  <p className="text-secondary-400 text-xs">Expected Close</p>
                  <p className="text-white">{formatDate(selectedLead.expectedCloseDate)}</p>
                </div>
                <div>
                  <p className="text-secondary-400 text-xs">Created</p>
                  <p className="text-white">{formatDate(selectedLead.createdAt)}</p>
                </div>
                <div>
                  <p className="text-secondary-400 text-xs">Lead ID</p>
                  <p className="text-white">{selectedLead.leadId || selectedLead._id}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 bg-secondary-700 hover:bg-secondary-600 text-white rounded-lg text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, color }) => {
  const colorClasses = {
    green: 'text-green-400',
    'neon-pink': 'text-neon-pink',
    blue: 'text-blue-400',
    purple: 'text-purple-400'
  };
  
  return (
    <div className="glass-morphism neon-border rounded-xl p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-secondary-400 text-xs">{title}</p>
          <p className={`text-lg sm:text-xl font-bold ${colorClasses[color] || 'text-white'}`}>
            {value}
          </p>
        </div>
        <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${colorClasses[color] || 'text-white'}`} />
      </div>
    </div>
  );
};

export default AdminSalesDashboard;
