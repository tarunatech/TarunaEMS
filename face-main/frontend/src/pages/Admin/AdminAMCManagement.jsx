import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/Admin/layout/AdminLayout';
import {
  ShieldCheck,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Eye,
  Edit3,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Calendar,
  DollarSign,
  Building2,
  FolderKanban,
  Download,
  Layers,
  ArrowUpRight,
  TrendingUp,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { amcAPI, leadAPI, projectAPI } from '../../utils/api';
import CreateAMCModal from '../../components/AMC/CreateAMCModal';
import AMCDetailModal from '../../components/AMC/AMCDetailModal';
import RenewAMCModal from '../../components/AMC/RenewAMCModal';

const STATUS_CONFIG = {
  Draft: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-700' },
  'Pending Approval': { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  Active: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  Expired: { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' },
  Cancelled: { bg: 'bg-slate-200 dark:bg-slate-800/80', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-300 dark:border-slate-700' },
  Renewed: { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
};

const formatINR = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const AdminAMCManagement = ({ Layout = AdminLayout }) => {
  const [searchParams] = useSearchParams();

  // State for metrics and contracts
  const [metrics, setMetrics] = useState({
    totalContracts: 0,
    activeContracts: 0,
    expiringSoonContracts: 0,
    expiredContracts: 0,
    totalActiveValue: 0,
  });
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states (initialized from searchParams if present)
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expiryPeriodFilter, setExpiryPeriodFilter] = useState('ALL');
  const [clientFilter, setClientFilter] = useState(() => searchParams.get('client') || searchParams.get('clientId') || 'ALL');
  const [projectFilter, setProjectFilter] = useState(() => searchParams.get('project') || searchParams.get('projectId') || 'ALL');

  // Master records for dropdowns
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editContract, setEditContract] = useState(null);
  const [detailContract, setDetailContract] = useState(null);
  const [renewTargetContract, setRenewTargetContract] = useState(null);

  // Sync URL search params to filter state when params change
  useEffect(() => {
    const qProj = searchParams.get('project') || searchParams.get('projectId');
    if (qProj) setProjectFilter(qProj);

    const qCli = searchParams.get('client') || searchParams.get('clientId');
    if (qCli) setClientFilter(qCli);

    const qSrch = searchParams.get('search');
    if (qSrch) setSearchTerm(qSrch);
  }, [searchParams]);

  // When contracts are loaded or contractId is in URL, auto-open the detail modal
  useEffect(() => {
    const qContractId = searchParams.get('contractId') || searchParams.get('contract');
    if (!qContractId) return;

    if (contracts.length > 0) {
      const match = contracts.find(
        (c) => String(c.id) === String(qContractId) || c.contractNumber === qContractId
      );
      if (match) {
        setDetailContract(match);
        return;
      }
    }

    // Direct fetch fallback if not in the initial contracts list
    amcAPI.getContractById(qContractId)
      .then((res) => {
        if (res.data?.success && res.data.data) {
          setDetailContract(res.data.data);
        }
      })
      .catch((err) => {
        console.warn('Could not load target AMC contract from query parameter:', err);
      });
  }, [searchParams, contracts]);

  // Fetch metrics and master data
  const fetchData = async () => {
    try {
      setLoading(true);

      const [metricsRes, contractsRes, leadsRes, projectsRes] = await Promise.allSettled([
        amcAPI.getDashboard(),
        amcAPI.getContracts({ limit: 150 }),
        leadAPI.getLeads({ limit: 200 }),
        projectAPI.getProjects({ limit: 200 }),
      ]);

      if (metricsRes.status === 'fulfilled' && metricsRes.value.data?.success) {
        setMetrics(metricsRes.value.data.data);
      }

      if (contractsRes.status === 'fulfilled' && contractsRes.value.data?.success) {
        setContracts(contractsRes.value.data.data || []);
      }

      if (leadsRes.status === 'fulfilled') {
        const rawLeads = leadsRes.value.data?.data?.leads || leadsRes.value.data?.leads || leadsRes.value.data?.data || [];
        setClients(Array.isArray(rawLeads) ? rawLeads : []);
      }

      if (projectsRes.status === 'fulfilled') {
        const rawProjects = Array.isArray(projectsRes.value.data?.data)
          ? projectsRes.value.data.data
          : (projectsRes.value.data?.data?.projects || projectsRes.value.data?.projects || []);
        setProjects(Array.isArray(rawProjects) ? rawProjects : []);
      }
    } catch (err) {
      console.error('Failed to load AMC data:', err);
      toast.error(err.response?.data?.message || 'Failed to load AMC data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter contracts on the client side
  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      // Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchNumber = c.contractNumber?.toLowerCase().includes(term);
        const matchTitle = c.title?.toLowerCase().includes(term);
        const matchClient = c.clientName?.toLowerCase().includes(term);
        const matchProjCode = c.projectCode?.toLowerCase().includes(term);
        const matchProjName = c.projectName?.toLowerCase().includes(term);
        if (!matchNumber && !matchTitle && !matchClient && !matchProjCode && !matchProjName) {
          return false;
        }
      }

      // Status Filter
      if (statusFilter !== 'ALL' && c.status !== statusFilter) {
        return false;
      }

      // Expiry Period Filter
      if (expiryPeriodFilter !== 'ALL') {
        if (expiryPeriodFilter === 'active') {
          if (c.status !== 'Active' || c.daysUntilExpiry < 0) return false;
        } else if (expiryPeriodFilter === 'expiring_30') {
          if (c.status !== 'Active' || c.daysUntilExpiry < 0 || c.daysUntilExpiry > 30) return false;
        } else if (expiryPeriodFilter === 'expiring_60') {
          if (c.status !== 'Active' || c.daysUntilExpiry < 0 || c.daysUntilExpiry > 60) return false;
        } else if (expiryPeriodFilter === 'expired') {
          if (c.status !== 'Expired' && !(c.status === 'Active' && c.daysUntilExpiry < 0)) return false;
        }
      }

      // Client Filter
      if (clientFilter !== 'ALL' && c.clientId !== clientFilter) {
        return false;
      }

      // Project Filter
      if (projectFilter !== 'ALL') {
        const qContractId = searchParams.get('contractId') || searchParams.get('contract');
        const isTargetContract = qContractId && (String(c.id) === String(qContractId) || c.contractNumber === qContractId);

        if (!isTargetContract) {
          const pFilter = String(projectFilter).toLowerCase();
          const matchesProjectId = String(c.projectId || '').toLowerCase() === pFilter;
          const matchesProjectCode = String(c.projectCode || '').toLowerCase() === pFilter;
          const matchesProjectName = String(c.projectName || '').toLowerCase() === pFilter;
          if (!matchesProjectId && !matchesProjectCode && !matchesProjectName) {
            return false;
          }
        }
      }

      return true;
    });
  }, [contracts, searchTerm, statusFilter, expiryPeriodFilter, clientFilter, projectFilter]);

  // Activate contract handler
  const handleActivate = async (id) => {
    if (!window.confirm('Are you sure you want to approve and activate this AMC Contract?')) return;
    try {
      const res = await amcAPI.updateContractStatus(id, 'Active');
      if (res.data?.success) {
        toast.success('Contract approved and activated');
        fetchData();
        if (detailContract && detailContract.id === id) {
          setDetailContract(res.data.data);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to activate contract');
    }
  };

  // Cancel contract handler
  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this AMC Contract?')) return;
    try {
      const res = await amcAPI.updateContractStatus(id, 'Cancelled');
      if (res.data?.success) {
        toast.success('Contract cancelled');
        fetchData();
        if (detailContract && detailContract.id === id) {
          setDetailContract(res.data.data);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel contract');
    }
  };

  return (
    <Layout title="AMC Contract Management">
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Top Header & Action */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <ShieldCheck className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              Annual Maintenance Contracts (AMC)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Manage client service contracts, preventive visits, coverage scope, and renewals.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition shadow-sm"
              title="Refresh contract records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => {
                setEditContract(null);
                setShowCreateModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow transition"
            >
              <Plus className="w-4 h-4" />
              Create AMC Contract
            </button>
          </div>
        </div>

        {/* 1. AMC DASHBOARD CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Card 1: Total Contracts */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Total Contracts</span>
              <FileText className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {metrics.totalContracts}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">All Records</span>
            </div>
          </div>

          {/* Card 2: Active Contracts */}
          <div className="p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
              <span className="text-xs font-bold">Active Contracts</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">
                {metrics.activeContracts}
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                In Coverage
              </span>
            </div>
          </div>

          {/* Card 3: Expiring Soon */}
          <div className="p-4 rounded-xl border border-amber-200/80 dark:border-amber-800/60 bg-amber-50/30 dark:bg-amber-950/20 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-2">
              <span className="text-xs font-bold">Expiring Soon (≤30d)</span>
              <Clock className="w-4 h-4" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-amber-700 dark:text-amber-400">
                {metrics.expiringSoonContracts}
              </span>
              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                Renewal Due
              </span>
            </div>
          </div>

          {/* Card 4: Expired Contracts */}
          <div className="p-4 rounded-xl border border-rose-200/80 dark:border-rose-800/60 bg-rose-50/30 dark:bg-rose-950/20 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-2">
              <span className="text-xs font-bold">Expired Contracts</span>
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-rose-700 dark:text-rose-400">
                {metrics.expiredContracts}
              </span>
              <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                Past End Date
              </span>
            </div>
          </div>

          {/* Card 5: Total Active AMC Value */}
          <div className="p-4 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 bg-gradient-to-br from-indigo-50/50 to-violet-50/30 dark:from-indigo-950/30 dark:to-violet-950/20 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-2">
              <span className="text-xs font-bold">Active Contract Value</span>
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-extrabold text-slate-900 dark:text-white truncate" title={formatINR(metrics.totalActiveValue)}>
                {formatINR(metrics.totalActiveValue)}
              </span>
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                Active AMC
              </span>
            </div>
          </div>
        </div>

        {/* 2. SEARCH & FILTER TOOLBAR */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Search Input */}
            <div className="relative sm:col-span-2 lg:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search contract #, client, project, or title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="ALL">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Pending Approval">Pending Approval</option>
                <option value="Active">Active</option>
                <option value="Expired">Expired</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Renewed">Renewed</option>
              </select>
            </div>

            {/* Expiry Period Filter */}
            <div>
              <select
                value={expiryPeriodFilter}
                onChange={(e) => setExpiryPeriodFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="ALL">All Expiry Periods</option>
                <option value="active">Active Only</option>
                <option value="expiring_30">Expiring in ≤ 30 Days</option>
                <option value="expiring_60">Expiring in ≤ 60 Days</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            {/* Client Filter */}
            <div>
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="ALL">All Clients</option>
                {clients.map((c) => {
                  const id = c.id || c._id;
                  const name = c.companyName || c.clientName || c.company || c.fullName || 'Client';
                  return (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Project Filter */}
            <div>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
              >
                <option value="ALL">All Projects</option>
                {projects.map((p) => {
                  const id = p.id || p._id;
                  const label = `${p.projectCode ? p.projectCode + ' - ' : ''}${p.name || 'Project'}`;
                  return (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <span>
                Showing <strong className="text-slate-900 dark:text-white">{filteredContracts.length}</strong> of{' '}
                {contracts.length} AMC contracts
              </span>
              {projectFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  <FolderKanban className="w-3 h-3" />
                  <span>
                    Project: {projects.find((p) => String(p.id || p._id) === String(projectFilter))?.name || projectFilter}
                  </span>
                  <button
                    type="button"
                    onClick={() => setProjectFilter('ALL')}
                    className="hover:text-rose-500 ml-0.5 text-xs font-bold leading-none"
                    title="Clear project filter"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
            {(searchTerm || statusFilter !== 'ALL' || expiryPeriodFilter !== 'ALL' || clientFilter !== 'ALL' || projectFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                  setExpiryPeriodFilter('ALL');
                  setClientFilter('ALL');
                  setProjectFilter('ALL');
                }}
                className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                Reset All Filters
              </button>
            )}
          </div>
        </div>

        {/* 3. AMC CONTRACTS TABLE */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Contract #</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Related Project</th>
                  <th className="py-3 px-4">Period & Duration</th>
                  <th className="py-3 px-4 text-right">Value & Frequency</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Expiry Timeline</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredContracts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <ShieldCheck className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                      <p className="font-semibold text-slate-600 dark:text-slate-400 text-sm">
                        No AMC contracts found matching current filters
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Try modifying search filters or create a new AMC contract.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredContracts.map((c) => {
                    const statusClass = STATUS_CONFIG[c.status] || STATUS_CONFIG.Draft;
                    const isExpiringSoon = c.status === 'Active' && c.daysUntilExpiry >= 0 && c.daysUntilExpiry <= 30;

                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition group"
                      >
                        {/* Contract # */}
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => setDetailContract(c)}
                            className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline text-left block"
                          >
                            {c.contractNumber}
                          </button>
                          <div className="flex items-center gap-1 mt-0.5">
                            {c.contractType === 'Renewal' ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300">
                                Renewal
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                New
                              </span>
                            )}
                            <span className="text-slate-500 truncate max-w-[140px]" title={c.title}>
                              {c.title}
                            </span>
                          </div>
                        </td>

                        {/* Client */}
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900 dark:text-white block truncate max-w-[160px]">
                            {c.clientName}
                          </span>
                        </td>

                        {/* Related Project */}
                        <td className="py-3 px-4">
                          {c.projectId ? (
                            <div>
                              <span className="font-mono font-bold text-[11px] text-indigo-600 dark:text-indigo-400">
                                {c.projectCode}
                              </span>
                              <span className="text-slate-500 block truncate max-w-[150px]">
                                {c.projectName}
                              </span>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              Standalone AMC
                            </span>
                          )}
                        </td>

                        {/* Period & Duration */}
                        <td className="py-3 px-4">
                          <div className="text-slate-800 dark:text-slate-200">
                            {formatDate(c.startDate)} to {formatDate(c.endDate)}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {c.durationMonths} Months ({c.coverageType})
                          </span>
                        </td>

                        {/* Value & Frequency */}
                        <td className="py-3 px-4 text-right">
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {formatINR(c.contractValue)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {c.billingFrequency}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border ${statusClass.bg} ${statusClass.text} ${statusClass.border}`}
                          >
                            {c.status}
                          </span>
                        </td>

                        {/* Days Until Expiry */}
                        <td className="py-3 px-4">
                          {c.status === 'Active' ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                                isExpiringSoon
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              {c.daysUntilExpiry >= 0
                                ? `${c.daysUntilExpiry} days left`
                                : `Expired ${Math.abs(c.daysUntilExpiry)}d ago`}
                            </span>
                          ) : c.status === 'Expired' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300">
                              <AlertCircle className="w-3 h-3" />
                              Expired
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setDetailContract(c)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {(c.status === 'Draft' || c.status === 'Pending Approval') && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditContract(c);
                                  setShowCreateModal(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                                title="Edit Draft"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}

                            {(c.status === 'Draft' || c.status === 'Pending Approval') && (
                              <button
                                type="button"
                                onClick={() => handleActivate(c.id)}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                                title="Approve & Activate"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}

                            {(c.status === 'Active' || c.status === 'Expired') && (
                              <button
                                type="button"
                                onClick={() => setRenewTargetContract(c)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                                title="Renew Contract"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            )}

                            {c.documentPath && (
                              <a
                                href={c.documentPath}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                                title="Download Document"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create / Edit Modal */}
        {showCreateModal && (
          <CreateAMCModal
            isOpen={showCreateModal}
            onClose={() => {
              setShowCreateModal(false);
              setEditContract(null);
            }}
            onSuccess={() => {
              fetchData();
            }}
            editContract={editContract}
            clients={clients}
            projects={projects}
            initialProjectId={projectFilter !== 'ALL' ? projectFilter : ''}
          />
        )}

        {/* Details Modal */}
        {detailContract && (
          <AMCDetailModal
            isOpen={Boolean(detailContract)}
            onClose={() => setDetailContract(null)}
            contract={detailContract}
            onEdit={(c) => {
              setDetailContract(null);
              setEditContract(c);
              setShowCreateModal(true);
            }}
            onActivate={handleActivate}
            onRenew={(c) => {
              setDetailContract(null);
              setRenewTargetContract(c);
            }}
            onCancel={handleCancel}
          />
        )}

        {/* Renew Modal */}
        {renewTargetContract && (
          <RenewAMCModal
            isOpen={Boolean(renewTargetContract)}
            onClose={() => setRenewTargetContract(null)}
            contract={renewTargetContract}
            onSuccess={() => {
              fetchData();
            }}
          />
        )}
      </div>
    </Layout>
  );
};

export { AdminAMCManagement as AMCManagementView };
export default AdminAMCManagement;
