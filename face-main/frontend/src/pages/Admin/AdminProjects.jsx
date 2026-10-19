import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/Admin/layout/AdminLayout';
import {
  FolderKanban,
  Search,
  Filter,
  Eye,
  Edit3,
  Calendar,
  DollarSign,
  TrendingUp,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Layers,
  FileText,
  RefreshCw,
  Plus,
  Briefcase,
  ShieldCheck,
  ShoppingBag,
  Receipt,
  CreditCard,
  Cpu,
  Building,
  Phone,
  Mail,
  Tag,
  ChevronLeft,
  ChevronRight,
  Info,
  Check,
  Percent,
  AlertTriangle,
  Download,
  ArrowUpRight,
  CheckCircle,
  ClipboardList,
  UserCheck,
  GitBranch,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { projectAPI, taskAPI, financeAPI } from '../../utils/api';

const STATUS_CONFIG = {
  Planning: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800/60', dot: 'bg-amber-500' },
  Active: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800/60', dot: 'bg-emerald-500' },
  'On Hold': { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800/60', dot: 'bg-blue-500' },
  Completed: { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800/60', dot: 'bg-purple-500' },
  Cancelled: { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800/60', dot: 'bg-rose-500' }
};

const AMC_STATUS_CONFIG = {
  Active: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800/60' },
  Draft: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700' },
  'Pending Approval': { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800/60' },
  Expired: { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800/60' },
  Renewed: { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800/60' },
  Cancelled: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-500 dark:text-slate-400', border: 'border-slate-300 dark:border-slate-700' },
};

const PO_STATUS_CONFIG = {
  Active: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800/60' },
  Pending: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800/60' },
  Expired: { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800/60' },
  Cancelled: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-500 dark:text-slate-400', border: 'border-slate-300 dark:border-slate-700' },
};

const INVOICE_STATUS_CONFIG = {
  paid: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800/60' },
  partially_paid: { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800/60' },
  issued: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800/60' },
  draft: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700' },
  cancelled: { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800/60' },
};

const formatINR = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

const getSalesPersonDisplay = (p) => {
  if (!p) return 'Unassigned';
  if (p.salesPerson?.name && p.salesPerson.name !== 'Unassigned') {
    return p.salesPerson.name;
  }
  const leadAssigned = p.leadId?.assignedTo;
  if (leadAssigned) {
    if (typeof leadAssigned === 'object') {
      const name = `${leadAssigned.personalInfo?.firstName || ''} ${leadAssigned.personalInfo?.lastName || ''}`.trim() || leadAssigned.name || leadAssigned.employeeId;
      if (name) return name;
    } else if (typeof leadAssigned === 'string') {
      return leadAssigned;
    }
  }
  if (p.createdBy) {
    if (typeof p.createdBy === 'object' && p.createdBy.name) {
      return p.createdBy.name;
    }
  }
  if (p.projectManager) {
    const pmName = typeof p.projectManager === 'object'
      ? (`${p.projectManager.personalInfo?.firstName || ''} ${p.projectManager.personalInfo?.lastName || ''}`.trim() || p.projectManager.name)
      : p.projectManager;
    if (pmName) return pmName;
  }
  return 'Unassigned';
};

export const ProjectsView = ({ Layout = AdminLayout, isEmployee = false }) => {
  const [searchParams] = useSearchParams();
  const urlProjectId = searchParams.get('projectId');
  const urlProjectCode = searchParams.get('projectCode') || searchParams.get('search');
  const urlLeadId = searchParams.get('leadId');

  const [projects, setProjects] = useState([]);
  const basePath = isEmployee || Layout !== AdminLayout ? '/employee' : '/admin';
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(() => urlProjectCode || '');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [clientFilter, setClientFilter] = useState('ALL');

  // Selected project for Details Modal
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedProjectData, setSelectedProjectData] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsTab, setDetailsTab] = useState('overview');
  const [downloadingPdfId, setDownloadingPdfId] = useState(null);
  const navigate = useNavigate();

  const navigateToPipelineStage = (stage = 'client_details') => {
    const targetLeadId =
      selectedProject?.leadId?._id ||
      selectedProject?.leadId?.id ||
      (typeof selectedProject?.leadId === 'string' ? selectedProject.leadId : null) ||
      selectedProjectData?.pipeline?.lead ||
      selectedProject?.pipeline?.lead ||
      urlLeadId ||
      '';

    if (!targetLeadId) {
      toast.error('No originating sales lead found for this project.');
      return;
    }

    setSelectedProject(null);
    navigate(`${basePath}/sales-pipeline?leadId=${targetLeadId}&stage=${stage}`);
  };

  // Tabs scroll management
  const projectTabsRef = useRef(null);
  const [canScrollTabsLeft, setCanScrollTabsLeft] = useState(false);
  const [canScrollTabsRight, setCanScrollTabsRight] = useState(false);

  const checkTabsScroll = () => {
    if (!projectTabsRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = projectTabsRef.current;
    setCanScrollTabsLeft(scrollLeft > 6);
    setCanScrollTabsRight(scrollLeft + clientWidth < scrollWidth - 6);
  };

  const scrollTabs = (dir) => {
    if (!projectTabsRef.current) return;
    const amount = dir === 'left' ? -220 : 220;
    projectTabsRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  useEffect(() => {
    if (selectedProject) {
      setTimeout(checkTabsScroll, 50);
      if (detailsTab === 'overview') {
        projectTabsRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
      }
    }
  }, [detailsTab, selectedProject]);

  // Status edit state
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await projectAPI.getProjects({ limit: 100 });
      if (res.data?.success) {
        const raw = res.data.data;
        const list = Array.isArray(raw)
          ? raw
          : (raw?.projects || res.data.projects || []);
        setProjects(list);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Fetch full project details including linked AMCs, POs, Invoices, Expenses, Tasks, and Equipment
  const openProjectDetails = async (proj) => {
    setSelectedProject(proj);
    setSelectedProjectData(null);
    setNewStatus(proj.status);
    setEditingStatus(false);
    setDetailsLoading(true);
    setDetailsTab('overview');
    try {
      const res = await projectAPI.getProjectById(proj.id || proj._id);
      if (res.data?.success && res.data.data) {
        setSelectedProjectData(res.data.data);
        if (res.data.data.project) {
          setSelectedProject(res.data.data.project);
          setNewStatus(res.data.data.project.status);
        }
      }
    } catch (err) {
      console.error('Failed to load project details:', err);
      toast.error('Failed to load complete project details');
    } finally {
      setDetailsLoading(false);
    }
  };

  // Auto-open modal if projectId, projectCode, or leadId is in URL
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    if (urlProjectCode) {
      setSearchTerm(urlProjectCode);
    }
  }, [urlProjectCode]);

  useEffect(() => {
    if (autoOpenedRef.current) return;
    if (!urlProjectId && !urlProjectCode && !urlLeadId) return;
    if (loading) return;

    let match = null;
    if (projects.length > 0) {
      match = projects.find((p) => {
        const idMatch = urlProjectId && String(p.id || p._id) === String(urlProjectId);
        const codeMatch = urlProjectCode && p.projectCode?.toLowerCase() === urlProjectCode.toLowerCase();
        const leadMatch = urlLeadId && (
          String(p.leadId?._id || p.leadId?.id || p.leadId) === String(urlLeadId)
        );
        return idMatch || codeMatch || leadMatch;
      });
    }

    if (match) {
      autoOpenedRef.current = true;
      openProjectDetails(match);
    } else if (urlProjectId) {
      autoOpenedRef.current = true;
      openProjectDetails({ id: urlProjectId, _id: urlProjectId, projectCode: urlProjectCode || 'PRJ' });
    } else if (urlLeadId) {
      autoOpenedRef.current = true;
      projectAPI.getProjectByLead(urlLeadId).then((res) => {
        if (res.data?.success && res.data.data) {
          openProjectDetails(res.data.data);
        }
      }).catch(() => {});
    }
  }, [projects, loading, urlProjectId, urlProjectCode, urlLeadId]);

  const handleDownloadInvoicePdf = async (inv) => {
    try {
      setDownloadingPdfId(inv.id);
      const res = await financeAPI.downloadInvoicePdf(inv.id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice_${inv.invoiceNumber || inv.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Invoice PDF downloaded');
    } catch {
      toast.error('Failed to download invoice PDF');
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedProject || !newStatus || newStatus === selectedProject.status) {
      setEditingStatus(false);
      return;
    }
    try {
      setStatusUpdating(true);
      const res = await projectAPI.updateProject(selectedProject.id || selectedProject._id, {
        status: newStatus
      });
      if (res.data?.success) {
        toast.success(`Status updated to ${newStatus}`);
        const updated = res.data.data;
        setSelectedProject(updated);
        setSelectedProjectData((prev) => (prev ? { ...prev, project: updated } : null));
        setEditingStatus(false);
        // Refresh project list
        setProjects((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          return list.map((p) =>
            (p.id || p._id) === (updated.id || updated._id) ? updated : p
          );
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update project status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const safeProjects = useMemo(() => Array.isArray(projects) ? projects : [], [projects]);

  // Distinct clients for filtering
  const uniqueClients = useMemo(() => {
    const set = new Set();
    safeProjects.forEach((p) => {
      const c = p.clientName || p.leadId?.company || p.leadId?.name;
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [safeProjects]);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return safeProjects.filter((p) => {
      const term = searchTerm.toLowerCase().trim();
      const salesPersonName = getSalesPersonDisplay(p).toLowerCase();
      const matchSearch =
        !term ||
        p.projectCode?.toLowerCase().includes(term) ||
        p.name?.toLowerCase().includes(term) ||
        p.clientName?.toLowerCase().includes(term) ||
        salesPersonName.includes(term);

      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;

      const clientName = p.clientName || p.leadId?.company || p.leadId?.name || '';
      const matchClient = clientFilter === 'ALL' || clientName === clientFilter;

      return matchSearch && matchStatus && matchClient;
    });
  }, [safeProjects, searchTerm, statusFilter, clientFilter]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = safeProjects.length;
    const active = safeProjects.filter((p) => p.status === 'Active').length;
    const totalContractValue = safeProjects.reduce((acc, p) => acc + (Number(p.contractValue) || 0), 0);
    const totalBudget = safeProjects.reduce((acc, p) => acc + (Number(p.approvedBudget) || 0), 0);
    return { total, active, totalContractValue, totalBudget };
  }, [safeProjects]);

  return (
    <Layout>
      <div className="space-y-6 pb-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-900/60">
                <FolderKanban className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Project Management</h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Relational project tracking originated from Won deals & commercial contracts
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={fetchProjects}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <div className="rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 sm:p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between gap-1 sm:gap-2">
              <span className="text-[10px] sm:text-xs font-semibold sm:font-medium text-slate-500 dark:text-slate-400 uppercase tracking-tight sm:tracking-wider leading-tight">Total Projects</span>
              <div className="p-1 sm:p-1.5 rounded-md sm:rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0">
                <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-2">
              <div className="flex items-baseline gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-base sm:text-2xl font-bold sm:font-extrabold text-slate-900 dark:text-white tracking-tight">{stats.total}</span>
                <span className="text-[10px] sm:text-xs font-semibold sm:font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{stats.active} Active</span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-400 mt-0.5 leading-tight truncate sm:whitespace-normal" title="All registered projects">
                All registered projects
              </p>
            </div>
          </div>

          <div className="rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 sm:p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between gap-1 sm:gap-2">
              <span className="text-[10px] sm:text-xs font-semibold sm:font-medium text-slate-500 dark:text-slate-400 uppercase tracking-tight sm:tracking-wider leading-tight">Total Contract Value</span>
              <div className="p-1 sm:p-1.5 rounded-md sm:rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shrink-0">
                <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-2">
              <span className="text-base sm:text-2xl font-bold sm:font-extrabold text-slate-900 dark:text-white tracking-tight block whitespace-nowrap truncate" title={formatINR(stats.totalContractValue)}>
                {formatINR(stats.totalContractValue)}
              </span>
              <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-400 mt-0.5 leading-tight truncate sm:whitespace-normal" title="Agreed commercial revenue">
                Agreed commercial revenue
              </p>
            </div>
          </div>

          <div className="rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 sm:p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between gap-1 sm:gap-2">
              <span className="text-[10px] sm:text-xs font-semibold sm:font-medium text-slate-500 dark:text-slate-400 uppercase tracking-tight sm:tracking-wider leading-tight">Approved Delivery Budget</span>
              <div className="p-1 sm:p-1.5 rounded-md sm:rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shrink-0">
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-2">
              <span className="text-base sm:text-2xl font-bold sm:font-extrabold text-slate-900 dark:text-white tracking-tight block whitespace-nowrap truncate" title={formatINR(stats.totalBudget)}>
                {formatINR(stats.totalBudget)}
              </span>
              <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-400 mt-0.5 leading-tight truncate sm:whitespace-normal" title="Authorized internal execution cost">
                Authorized internal execution cost
              </p>
            </div>
          </div>

          <div className="rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 sm:p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between gap-1 sm:gap-2">
              <span className="text-[10px] sm:text-xs font-semibold sm:font-medium text-slate-500 dark:text-slate-400 uppercase tracking-tight sm:tracking-wider leading-tight">Gross Target Margin</span>
              <div className="p-1 sm:p-1.5 rounded-md sm:rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 shrink-0">
                <Briefcase className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-2">
              <span className="text-base sm:text-2xl font-bold sm:font-extrabold text-slate-900 dark:text-white tracking-tight block whitespace-nowrap truncate">
                {stats.totalContractValue > 0
                  ? `${Math.round(((stats.totalContractValue - stats.totalBudget) / stats.totalContractValue) * 100)}%`
                  : '0%'}
              </span>
              <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-400 mt-0.5 leading-tight truncate sm:whitespace-normal" title="Commercial vs execution allocation">
                Commercial vs execution allocation
              </p>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3">
          <div className="relative flex-1 min-w-0 md:min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by project code, name, or client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 focus:border-indigo-500 transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Status Filter */}
            <div className="flex-1 md:flex-initial flex items-center gap-1.5 min-w-0">
              <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full md:w-auto text-xs font-semibold px-2.5 sm:px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 truncate cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="Planning">Planning</option>
                <option value="Active">Active</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {/* Client Filter */}
            {uniqueClients.length > 0 && (
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="flex-1 md:flex-initial w-full md:w-auto text-xs font-semibold px-2.5 sm:px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 md:max-w-[180px] min-w-0 truncate cursor-pointer"
              >
                <option value="ALL">All Clients</option>
                {uniqueClients.map((client) => (
                  <option key={client} value={client}>
                    {client}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Project Table */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4 text-right">Contract Value</th>
                  <th className="py-3 px-4 text-right">Approved Budget</th>
                  <th className="py-3 px-4">Sales Person</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
                        <span>Loading projects...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FolderKanban className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                        <span className="font-medium text-slate-600 dark:text-slate-300">No projects found</span>
                        <p className="text-xs text-slate-400">
                          Projects are created automatically when sales deals are marked as Won in the Sales Pipeline.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((p) => {
                    const statusCfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.Planning;
                    const salesDisplay = getSalesPersonDisplay(p);
                    const client = p.clientName || p.leadId?.company || p.leadId?.name || 'Client';

                    return (
                      <tr key={p.id || p._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                        <td className="py-3.5 px-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/60">
                                {p.projectCode}
                              </span>
                              <span className="font-semibold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer" onClick={() => openProjectDetails(p)}>
                                {p.name}
                              </span>
                            </div>
                            {p.description && (
                              <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 max-w-xs">{p.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">{client}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white">{formatINR(p.contractValue)}</td>
                        <td className="py-3.5 px-4 text-right font-semibold text-slate-700 dark:text-slate-300">{formatINR(p.approvedBudget)}</td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                            <span className="text-xs font-medium text-slate-800 dark:text-slate-200">{salesDisplay}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">{formatDate(p.createdAt)}</td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => openProjectDetails(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/60 dark:border-slate-700 transition"
                            title="View Project Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Project Details Modal */}
        {selectedProject && typeof document !== 'undefined' && createPortal(
          (() => {
            const projectTasks = selectedProjectData?.tasks || [];
            const projectPOs = selectedProjectData?.purchaseOrders || [];
            const projectAMCs = selectedProjectData?.amcContracts || [];
            const projectEquipment = selectedProjectData?.equipment || [];
            const projectInvoices = selectedProjectData?.invoices || [];
            const projectExpenses = selectedProjectData?.expenses || [];
            const projectPayments = selectedProjectData?.payments || [];
            const projectBudgets = selectedProjectData?.budgets || [];
            const latestApprovedBudget = selectedProjectData?.latestApprovedBudget || null;

            const projectPipeline = selectedProjectData?.pipeline || selectedProject?.pipeline || null;
            const clientDetails = projectPipeline?.clientDetails || null;
            const clientRequirements = clientDetails?.requirements || null;
            const clientBusinessNeed = clientDetails?.businessNeed || null;

            const financialSummary = selectedProjectData?.financialSummary || {
              contractValue: Number(selectedProject?.contractValue || 0),
              approvedBudget: Number(selectedProject?.approvedBudget || 0),
              actualCosts: 0,
              openCommitments: 0,
              committedCosts: 0,
              incurredProjectCosts: 0,
              availableBudget: Number(selectedProject?.approvedBudget || 0),
              budgetUtilization: 0,
              incomingPayments: 0,
              invoicedAmount: 0,
              invoicePaidAmount: 0,
              outstandingReceivables: 0,
            };

            const detailTabs = [
              { id: 'overview', label: 'Overview & Commercials', icon: Layers, count: null },
              { id: 'amc', label: 'AMC Services', icon: ShieldCheck, count: projectAMCs.length },
              { id: 'purchaseOrders', label: 'Purchase Orders', icon: ShoppingBag, count: projectPOs.length },
              { id: 'invoices', label: 'Invoices & Billing', icon: Receipt, count: projectInvoices.length },
              { id: 'expenses', label: 'Expenses & Payments', icon: CreditCard, count: projectExpenses.length + projectPayments.length },
              { id: 'tasks', label: 'Tasks', icon: CheckCircle2, count: projectTasks.length },
              { id: 'equipment', label: 'Equipment / Assets', icon: Cpu, count: projectEquipment.length },
            ];

            return (
              <div
                className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setSelectedProject(null);
                }}
              >
                <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 flex flex-col h-[94vh] sm:h-auto sm:max-h-[92vh]">
                  {/* Modal Header */}
                  <div className="px-3.5 sm:px-5 py-2.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 flex-shrink-0">
                    <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                      <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
                        <FolderKanban className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span
                            onClick={() => {
                              if (selectedProject.projectCode) {
                                navigator.clipboard?.writeText(selectedProject.projectCode);
                                toast.success('Project ID copied to clipboard!');
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-mono text-[10px] sm:text-xs font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 tracking-wider shrink-0 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition shadow-2xs"
                            title="Click to copy Project ID"
                          >
                            <Tag className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-indigo-500 dark:text-indigo-400" />
                            {selectedProject.projectCode}
                          </span>
                          <h3 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white truncate max-w-[140px] sm:max-w-none" title={selectedProject.name}>
                            {selectedProject.name}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold border ${
                              STATUS_CONFIG[selectedProject.status]?.bg || 'bg-slate-100 dark:bg-slate-800'
                            } ${STATUS_CONFIG[selectedProject.status]?.text || 'text-slate-700 dark:text-slate-300'} ${
                              STATUS_CONFIG[selectedProject.status]?.border || 'border-slate-200 dark:border-slate-700'
                            } shadow-2xs shrink-0`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_CONFIG[selectedProject.status]?.dot || 'bg-slate-500'}`} />
                            {selectedProject.status}
                          </span>
                        </div>
                        <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-slate-400 dark:text-slate-500">Client:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px] sm:max-w-none">{selectedProject.clientName || 'Client'}</span>
                          {selectedProject.leadId?.company && selectedProject.leadId?.company !== selectedProject.clientName && (
                            <span className="text-slate-400 dark:text-slate-500 truncate max-w-[100px] sm:max-w-none">({selectedProject.leadId.company})</span>
                          )}
                          {selectedProject.leadId?.phone && (
                            <>
                              <span className="text-slate-300 dark:text-slate-600">•</span>
                              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 whitespace-nowrap">
                                <Phone className="h-3 w-3 text-slate-400" />
                                {selectedProject.leadId.phone}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <button
                        onClick={() => navigateToPipelineStage('client_details')}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-semibold rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 transition shadow-2xs group"
                        title="Open originating Sales Pipeline"
                      >
                        <GitBranch className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 group-hover:rotate-12 transition-transform" />
                        <span className="hidden sm:inline">Pipeline</span>
                        <ExternalLink className="h-3 w-3 opacity-60" />
                      </button>
                      <button
                        onClick={() => setSelectedProject(null)}
                        className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition"
                        title="Close"
                      >
                        <X className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Financial & Status Summary Strip (Desktop: Always Visible) */}
                  <div className="hidden sm:block px-5 py-3 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-700/60 flex-shrink-0">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                      {/* Contract Revenue */}
                      <div className="p-2.5 bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">Contract Value</span>
                        <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                          {formatINR(financialSummary.contractValue)}
                        </p>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Revenue</span>
                      </div>

                      {/* Approved Budget */}
                      <div className="p-2.5 bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">Approved Budget</span>
                        <p className="text-sm sm:text-base font-extrabold text-indigo-900 dark:text-indigo-300 mt-0.5">
                          {formatINR(financialSummary.approvedBudget)}
                        </p>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">Execution Cap</span>
                      </div>

                      {/* Actual Costs (Expenses) */}
                      <div className="p-2.5 bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">Actual Costs</span>
                        <p className="text-sm sm:text-base font-extrabold text-rose-900 dark:text-rose-300 mt-0.5">
                          {formatINR(financialSummary.actualCosts)}
                        </p>
                        <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">Recorded Expenses</span>
                      </div>

                      {/* Open PO Commitments */}
                      <div className="p-2.5 bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">Open POs</span>
                        <p className="text-sm sm:text-base font-extrabold text-amber-900 dark:text-amber-300 mt-0.5">
                          {formatINR(financialSummary.openCommitments)}
                        </p>
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">{projectPOs.length} PO(s) Linked</span>
                      </div>

                      {/* Available Budget */}
                      <div className="p-2.5 bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">Available Budget</span>
                        <p className={`text-sm sm:text-base font-extrabold mt-0.5 ${
                          financialSummary.availableBudget >= 0
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-rose-700 dark:text-rose-400'
                        }`}>
                          {formatINR(financialSummary.availableBudget)}
                        </p>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          {financialSummary.budgetUtilization}% utilized
                        </span>
                      </div>

                      {/* Invoiced & Collected */}
                      <div className="p-2.5 bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">Invoiced / Paid</span>
                        <p className="text-sm sm:text-base font-extrabold text-blue-900 dark:text-blue-300 mt-0.5">
                          {formatINR(financialSummary.invoicedAmount)}
                        </p>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          {formatINR(financialSummary.invoicePaidAmount)} collected
                        </span>
                      </div>
                    </div>

                    {/* Quick Status & Dates bar */}
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/50 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <span className="text-slate-400 font-semibold">Status:</span>
                          {!editingStatus ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-800 dark:text-slate-100">{selectedProject.status}</span>
                              <button
                                onClick={() => setEditingStatus(true)}
                                className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-0.5"
                                title="Change status"
                              >
                                <Edit3 className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <select
                                value={newStatus}
                                onChange={(e) => setNewStatus(e.target.value)}
                                className="text-xs font-semibold px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100"
                              >
                                <option value="Planning">Planning</option>
                                <option value="Active">Active</option>
                                <option value="On Hold">On Hold</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                              <button
                                onClick={handleUpdateStatus}
                                disabled={statusUpdating}
                                className="px-2 py-0.5 text-xs font-semibold bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                              >
                                {statusUpdating ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={() => setEditingStatus(false)}
                                className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="hidden sm:flex items-center gap-1.5 text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-700 pl-3">
                          <UserCheck className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                          <span>Sales: <strong className="text-slate-800 dark:text-slate-200">{getSalesPersonDisplay(selectedProject)}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Start: <strong>{formatDate(selectedProject.startDate)}</strong></span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Target: <strong>{formatDate(selectedProject.endDate)}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sub-Tab Navigation */}
                  <div className="relative flex-shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 group">
                    {/* Left scroll control button */}
                    {canScrollTabsLeft && (
                      <button
                        type="button"
                        onClick={() => scrollTabs('left')}
                        className="absolute left-0 top-0 bottom-0 z-10 px-2 bg-gradient-to-r from-white via-white/95 to-transparent dark:from-slate-900 dark:via-slate-900/95 dark:to-transparent flex items-center justify-center text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition"
                        title="Scroll to Overview"
                      >
                        <span className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 shadow-xs border border-slate-200 dark:border-slate-700">
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </span>
                      </button>
                    )}

                    {/* Scrollable Tabs Bar (Hidden Scrollbar, Smooth Scroll) */}
                    <div
                      ref={projectTabsRef}
                      onScroll={checkTabsScroll}
                      onWheel={(e) => {
                        if (e.deltaY !== 0 && projectTabsRef.current) {
                          projectTabsRef.current.scrollLeft += e.deltaY;
                        }
                      }}
                      className="px-4 sm:px-5 overflow-x-auto scrollbar-hide flex items-center gap-1 scroll-smooth select-none [&::-webkit-scrollbar]:hidden"
                      style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                      }}
                    >
                      {detailTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = detailsTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            id={`project-detail-tab-${tab.id}`}
                            onClick={() => {
                              setDetailsTab(tab.id);
                              if (tab.id === 'overview') {
                                projectTabsRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
                              }
                            }}
                            className={`flex items-center gap-2 py-3 px-3.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap shrink-0 ${
                              isActive
                                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold'
                                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                          >
                            <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                            <span>{tab.label}</span>
                            {tab.count !== null && (
                              <span
                                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold shrink-0 ${
                                  isActive
                                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                }`}
                              >
                                {tab.count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Right scroll control button */}
                    {canScrollTabsRight && (
                      <button
                        type="button"
                        onClick={() => scrollTabs('right')}
                        className="absolute right-0 top-0 bottom-0 z-10 px-2 bg-gradient-to-l from-white via-white/95 to-transparent dark:from-slate-900 dark:via-slate-900/95 dark:to-transparent flex items-center justify-center text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition"
                        title="Scroll tabs right"
                      >
                        <span className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 shadow-xs border border-slate-200 dark:border-slate-700">
                          <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Modal Body / Tab Content */}
                  <div className="p-3 sm:p-5 flex-1 overflow-y-auto space-y-4 sm:space-y-5">
                    {detailsLoading ? (
                      <div className="py-16 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-indigo-600 border-t-transparent dark:border-indigo-400 mb-2" />
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Loading linked project contracts, purchase orders, invoices, and financials...
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* TAB 1: OVERVIEW & COMMERCIALS */}
                        {detailsTab === 'overview' && (
                          <div className="space-y-4 sm:space-y-5">
                            {/* Mobile-Only Financial & Status Summary Strip */}
                            <div className="sm:hidden p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-2">
                              <div className="grid grid-cols-3 gap-1.5">
                                {/* Contract Revenue */}
                                <div className="p-2 bg-white dark:bg-slate-800/90 rounded-lg border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-tight block truncate">Contract</span>
                                  <p className="text-xs font-extrabold text-slate-900 dark:text-white mt-0.5 truncate" title={formatINR(financialSummary.contractValue)}>
                                    {formatINR(financialSummary.contractValue)}
                                  </p>
                                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium block truncate">Revenue</span>
                                </div>

                                {/* Approved Budget */}
                                <div className="p-2 bg-white dark:bg-slate-800/90 rounded-lg border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-tight block truncate">Budget</span>
                                  <p className="text-xs font-extrabold text-indigo-900 dark:text-indigo-300 mt-0.5 truncate" title={formatINR(financialSummary.approvedBudget)}>
                                    {formatINR(financialSummary.approvedBudget)}
                                  </p>
                                  <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-medium block truncate">Approved</span>
                                </div>

                                {/* Actual Costs */}
                                <div className="p-2 bg-white dark:bg-slate-800/90 rounded-lg border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-tight block truncate">Actual Costs</span>
                                  <p className="text-xs font-extrabold text-rose-900 dark:text-rose-300 mt-0.5 truncate" title={formatINR(financialSummary.actualCosts)}>
                                    {formatINR(financialSummary.actualCosts)}
                                  </p>
                                  <span className="text-[9px] text-rose-600 dark:text-rose-400 font-medium block truncate">Expenses</span>
                                </div>

                                {/* Open POs */}
                                <div className="p-2 bg-white dark:bg-slate-800/90 rounded-lg border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-tight block truncate">Open POs</span>
                                  <p className="text-xs font-extrabold text-amber-900 dark:text-amber-300 mt-0.5 truncate" title={formatINR(financialSummary.openCommitments)}>
                                    {formatINR(financialSummary.openCommitments)}
                                  </p>
                                  <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium block truncate">{projectPOs.length} Linked</span>
                                </div>

                                {/* Available Budget */}
                                <div className="p-2 bg-white dark:bg-slate-800/90 rounded-lg border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-tight block truncate">Available</span>
                                  <p className={`text-xs font-extrabold mt-0.5 truncate ${
                                    financialSummary.availableBudget >= 0
                                      ? 'text-emerald-700 dark:text-emerald-300'
                                      : 'text-rose-700 dark:text-rose-400'
                                  }`} title={formatINR(financialSummary.availableBudget)}>
                                    {formatINR(financialSummary.availableBudget)}
                                  </p>
                                  <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium block truncate">
                                    {financialSummary.budgetUtilization}% used
                                  </span>
                                </div>

                                {/* Invoiced */}
                                <div className="p-2 bg-white dark:bg-slate-800/90 rounded-lg border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-tight block truncate">Invoiced</span>
                                  <p className="text-xs font-extrabold text-blue-900 dark:text-blue-300 mt-0.5 truncate" title={formatINR(financialSummary.invoicedAmount)}>
                                    {formatINR(financialSummary.invoicedAmount)}
                                  </p>
                                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium block truncate">
                                    {formatINR(financialSummary.invoicePaidAmount)} pd
                                  </span>
                                </div>
                              </div>

                              {/* Mobile Status & Dates bar */}
                              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/50 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                                  <span className="text-slate-400 font-semibold">Status:</span>
                                  {!editingStatus ? (
                                    <div className="flex items-center gap-1">
                                      <span className="font-semibold text-slate-800 dark:text-slate-100">{selectedProject.status}</span>
                                      <button
                                        onClick={() => setEditingStatus(true)}
                                        className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-0.5"
                                        title="Change status"
                                      >
                                        <Edit3 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <select
                                        value={newStatus}
                                        onChange={(e) => setNewStatus(e.target.value)}
                                        className="text-xs font-semibold px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100"
                                      >
                                        <option value="Planning">Planning</option>
                                        <option value="Active">Active</option>
                                        <option value="On Hold">On Hold</option>
                                        <option value="Completed">Completed</option>
                                        <option value="Cancelled">Cancelled</option>
                                      </select>
                                      <button
                                        onClick={handleUpdateStatus}
                                        disabled={statusUpdating}
                                        className="px-2 py-0.5 text-xs font-semibold bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                                      >
                                        {statusUpdating ? '...' : 'Save'}
                                      </button>
                                      <button
                                        onClick={() => setEditingStatus(false)}
                                        className="text-xs text-slate-400 hover:text-slate-200"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                  <UserCheck className="h-3 w-3 text-indigo-500 dark:text-indigo-400" />
                                  <span>Sales: <strong className="text-slate-800 dark:text-slate-200">{getSalesPersonDisplay(selectedProject)}</strong></span>
                                </div>

                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[10px]">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(selectedProject.startDate)}
                                  </span>
                                  <span>→</span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDate(selectedProject.endDate)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Commercial Cushion & Margin */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                              <div className="p-3 sm:p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/40 rounded-xl">
                                <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block">Contract Revenue</span>
                                <p className="text-lg sm:text-xl font-extrabold text-emerald-950 dark:text-emerald-200 mt-1">{formatINR(selectedProject.contractValue)}</p>
                                <span className="text-[10px] sm:text-[11px] text-emerald-700 dark:text-emerald-400/80">Client agreed commercial value</span>
                              </div>

                              <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800/40 rounded-xl">
                                <span className="text-[10px] font-bold text-indigo-800 dark:text-indigo-400 uppercase tracking-wider block">Internal Approved Budget</span>
                                <p className="text-xl font-extrabold text-indigo-950 dark:text-indigo-200 mt-1">{formatINR(selectedProject.approvedBudget)}</p>
                                <span className="text-[11px] text-indigo-700 dark:text-indigo-400/80">Delivery execution allocation</span>
                              </div>

                              <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-800/40 rounded-xl">
                                <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider block">Target Margin</span>
                                <p className="text-xl font-extrabold text-amber-950 dark:text-amber-200 mt-1">
                                  {selectedProject.contractValue > 0
                                    ? `${Math.round(
                                        ((Number(selectedProject.contractValue) - Number(selectedProject.approvedBudget)) /
                                          Number(selectedProject.contractValue)) *
                                          100
                                      )}%`
                                    : '0%'}
                                </p>
                                <span className="text-[11px] text-amber-700 dark:text-amber-400/80">
                                  Cushion: {formatINR(Math.max(0, Number(selectedProject.contractValue || 0) - Number(selectedProject.approvedBudget || 0)))}
                                </span>
                              </div>
                            </div>

                            {/* Scope & Origin */}
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Project Scope & Origin</h4>
                              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 space-y-4">
                                <div>
                                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                                    Project Scope Description
                                  </span>
                                  <p className="whitespace-pre-line leading-relaxed text-slate-700 dark:text-slate-300">
                                    {selectedProject.description || 'No detailed scope description provided.'}
                                  </p>
                                </div>

                                {/* Requirements Section from Sales Pipeline Client Details */}
                                <div className="pt-3 border-t border-slate-200/80 dark:border-slate-700/60 space-y-2.5">
                                  <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-2">
                                      <ClipboardList className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                        Client Requirements
                                      </h5>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/70">
                                        <Briefcase className="h-3 w-3" />
                                        Sales Pipeline • Client Details
                                      </span>
                                      <button
                                        onClick={() => navigateToPipelineStage('client_details')}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 transition shadow-2xs group cursor-pointer"
                                        title="Edit Requirements in Sales Pipeline (Client Details Section)"
                                      >
                                        <Edit3 className="h-3 w-3 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
                                        <span>Edit in Client Details</span>
                                        <ExternalLink className="h-3 w-3 opacity-60" />
                                      </button>
                                    </div>
                                  </div>

                                  {clientRequirements ? (
                                    <div className="p-3.5 bg-white dark:bg-slate-900/80 rounded-xl border border-slate-200/90 dark:border-slate-700/70 shadow-xs">
                                      <p className="whitespace-pre-line leading-relaxed text-slate-800 dark:text-slate-200 font-normal">
                                        {clientRequirements}
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="p-3 bg-white/70 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 text-xs flex items-center justify-between flex-wrap gap-2">
                                      <span>No requirements mentioned in Sales Pipeline Client Details.</span>
                                      <button
                                        onClick={() => navigateToPipelineStage('client_details')}
                                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                                      >
                                        <Edit3 className="h-3 w-3" />
                                        Add Requirements in Client Details →
                                      </button>
                                    </div>
                                  )}

                                  {/* Business Need if specified in Client Details */}
                                  {clientBusinessNeed && (
                                    <div className="space-y-1 mt-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                                          Business Need
                                        </span>
                                        <button
                                          onClick={() => navigateToPipelineStage('client_details')}
                                          className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                                        >
                                          <Edit3 className="h-2.5 w-2.5" />
                                          Edit in Client Details
                                        </button>
                                      </div>
                                      <div className="p-3 bg-white dark:bg-slate-900/80 rounded-xl border border-slate-200/90 dark:border-slate-700/70 shadow-xs">
                                        <p className="whitespace-pre-line leading-relaxed text-slate-800 dark:text-slate-200 font-normal">
                                          {clientBusinessNeed}
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Client Details Highlights Grid (Decision Maker, Timeline, Stated Budget, Payment Terms) */}
                                  {clientDetails && (clientDetails.timeline || clientDetails.decisionMaker || clientDetails.budgetRange || clientDetails.clientBudgetAmount || clientDetails.paymentTerms || clientDetails.billingType) && (
                                    <div className="space-y-1.5 pt-1">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                          Client Details & Commercial Terms
                                        </span>
                                        <button
                                          onClick={() => navigateToPipelineStage('client_details')}
                                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                                        >
                                          <Edit3 className="h-2.5 w-2.5" />
                                          Edit in Client Details
                                        </button>
                                      </div>
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                                        {clientDetails.decisionMaker && (
                                          <div className="p-2.5 bg-white dark:bg-slate-900/60 rounded-lg border border-slate-200/60 dark:border-slate-800">
                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold uppercase tracking-wider">Decision Maker</span>
                                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate block mt-0.5">{clientDetails.decisionMaker}</span>
                                          </div>
                                        )}
                                        {clientDetails.timeline && (
                                          <div className="p-2.5 bg-white dark:bg-slate-900/60 rounded-lg border border-slate-200/60 dark:border-slate-800">
                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold uppercase tracking-wider">Expected Timeline</span>
                                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate block mt-0.5">{clientDetails.timeline}</span>
                                          </div>
                                        )}
                                        {(clientDetails.clientBudgetAmount || clientDetails.budgetRange) && (
                                          <div className="p-2.5 bg-white dark:bg-slate-900/60 rounded-lg border border-slate-200/60 dark:border-slate-800">
                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold uppercase tracking-wider">Stated Client Budget</span>
                                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                                              {clientDetails.clientBudgetAmount ? formatINR(clientDetails.clientBudgetAmount) : clientDetails.budgetRange}
                                            </span>
                                          </div>
                                        )}
                                        {(clientDetails.paymentTerms || clientDetails.billingType) && (
                                          <div className="p-2.5 bg-white dark:bg-slate-900/60 rounded-lg border border-slate-200/60 dark:border-slate-800">
                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold uppercase tracking-wider">Billing & Terms</span>
                                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                                              {[clientDetails.billingType, clientDetails.paymentTerms].filter(Boolean).join(' • ')}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="pt-3 border-t border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
                                  <span className="flex items-center gap-1.5">
                                    <UserCheck className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                                    Sales Person: <strong className="text-slate-800 dark:text-slate-200">{getSalesPersonDisplay(selectedProject)}</strong>
                                  </span>
                                  {selectedProject.leadId && (
                                    <span>
                                      Originating Client Lead: <strong className="text-slate-700 dark:text-slate-200">{selectedProject.leadId.name || (selectedProject.leadId.firstName ? `${selectedProject.leadId.firstName} ${selectedProject.leadId.lastName || ''}`.trim() : null) || selectedProject.clientName}</strong>
                                    </span>
                                  )}
                                  {selectedProject.leadId?.email && (
                                    <span>Email: <strong className="text-slate-700 dark:text-slate-200">{selectedProject.leadId.email}</strong></span>
                                  )}
                                  {selectedProject.leadId?.phone && (
                                    <span>Phone: <strong className="text-slate-700 dark:text-slate-200">{selectedProject.leadId.phone}</strong></span>
                                  )}
                                  {selectedProject.pipelineId && (
                                    <button
                                      onClick={() => navigateToPipelineStage('won_closed')}
                                      className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                                    >
                                      <span>Originated from Sales Pipeline Won Deal</span>
                                      <ExternalLink className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Billing Schedule Milestones */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                  <Receipt className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                    Client Billing Schedule Milestones ({Array.isArray(selectedProject.billingSchedule) ? selectedProject.billingSchedule.length : 0})
                                  </h4>
                                  {Array.isArray(selectedProject.billingSchedule) && selectedProject.billingSchedule.length > 0 && (
                                    <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
                                      • Total: {formatINR(selectedProject.billingSchedule.reduce((sum, b) => sum + Number(b.amount || 0), 0))}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/70">
                                    <CheckCircle className="h-3 w-3" />
                                    Won / Closed Stage
                                  </span>
                                  <button
                                    onClick={() => navigateToPipelineStage('won_closed')}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 transition shadow-2xs group cursor-pointer"
                                    title="Edit Milestones in Sales Pipeline (Won / Closed Section)"
                                  >
                                    <Edit3 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                                    <span>Edit in Won / Closed</span>
                                    <ExternalLink className="h-3 w-3 opacity-60" />
                                  </button>
                                </div>
                              </div>

                              {Array.isArray(selectedProject.billingSchedule) && selectedProject.billingSchedule.length > 0 ? (
                                <div className="border border-slate-200 dark:border-slate-700/80 rounded-xl overflow-x-auto text-xs">
                                  <table className="w-full min-w-[500px] text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/80">
                                      <tr>
                                        <th className="py-2.5 px-3">Milestone</th>
                                        <th className="py-2.5 px-3">Scope Description</th>
                                        <th className="py-2.5 px-3 text-right">%</th>
                                        <th className="py-2.5 px-3 text-right">Amount</th>
                                        <th className="py-2.5 px-3">Due Date</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                      {selectedProject.billingSchedule.map((b, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                          <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{b.milestone || `Milestone ${idx + 1}`}</td>
                                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{b.description || '-'}</td>
                                          <td className="py-2.5 px-3 text-right font-semibold text-slate-600 dark:text-slate-400">{b.percentage ? `${b.percentage}%` : '-'}</td>
                                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">{formatINR(b.amount)}</td>
                                          <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{formatDate(b.dueDate)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div className="p-3.5 bg-white/70 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 text-xs flex items-center justify-between flex-wrap gap-2">
                                  <span>No billing schedule milestones configured.</span>
                                  <button
                                    onClick={() => navigateToPipelineStage('won_closed')}
                                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Edit3 className="h-3 w-3" />
                                    Configure Milestones in Won / Closed →
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Internal Budget Details */}
                            {latestApprovedBudget && (
                              <div className="space-y-2">
                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                  Approved Financial Budget (Version {latestApprovedBudget.version})
                                </h4>
                                <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-800/30 text-xs flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                      Budget #{latestApprovedBudget.budgetNumber || 'Formal Budget'}
                                    </span>
                                    <span className="ml-2 text-[11px] text-slate-500 dark:text-slate-400">
                                      Approved on {formatDate(latestApprovedBudget.approvedAt)} by {latestApprovedBudget.approvedBy?.name || 'Authorized Approver'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                      {formatINR(latestApprovedBudget.totalApprovedAmount || latestApprovedBudget.totalPlannedAmount)}
                                    </span>
                                    <a
                                      href={`${basePath}/finance`}
                                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                                    >
                                      Finance Module <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* TAB 2: AMC SERVICES */}
                        {detailsTab === 'amc' && (
                          <div className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                              <div>
                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                  Linked Annual Maintenance Contracts ({projectAMCs.length})
                                </h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  Maintenance agreements, support SLAs, and warranty coverage linked to this project
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Link
                                  to={`${basePath}/amc?project=${encodeURIComponent(selectedProject.id || selectedProject._id || '')}`}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Manage AMC
                                </Link>
                              </div>
                            </div>

                            {projectAMCs.length === 0 ? (
                              <div className="py-12 px-4 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                <ShieldCheck className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                                <h5 className="text-sm font-bold text-slate-700 dark:text-slate-200">No AMC Contracts Linked</h5>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                                  There are currently no maintenance contracts linked to this project. Create an Annual Maintenance Contract in AMC Management to track SLAs, visits, and recurring support.
                                </p>
                                <Link
                                  to={`${basePath}/amc?project=${encodeURIComponent(selectedProject.id || selectedProject._id || '')}`}
                                  className="inline-flex items-center gap-1.5 mt-4 px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                                >
                                  Go to AMC Management
                                </Link>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                {projectAMCs.map((contract) => {
                                  const statusCfg = AMC_STATUS_CONFIG[contract.status] || AMC_STATUS_CONFIG.Draft;
                                  const daysLeft = contract.daysUntilExpiry ?? null;
                                  return (
                                    <div
                                      key={contract.id}
                                      className="p-4 bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-600 transition space-y-3"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                              {contract.contractNumber}
                                            </span>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                                              {contract.status}
                                            </span>
                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                              {contract.coverageType}
                                            </span>
                                          </div>
                                          <h5 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                                            {contract.title}
                                          </h5>
                                        </div>
                                        <div className="text-right">
                                          <span className="text-sm font-extrabold text-slate-900 dark:text-white block">
                                            {formatINR(contract.contractValue)}
                                          </span>
                                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                            {contract.billingFrequency}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-700/60 text-slate-600 dark:text-slate-300">
                                        <div>
                                          <span className="text-slate-400 text-[11px] block">Duration Period:</span>
                                          <span className="font-medium text-slate-700 dark:text-slate-200">
                                            {formatDate(contract.startDate)} - {formatDate(contract.endDate)}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-slate-400 text-[11px] block">Expiry Status:</span>
                                          {daysLeft !== null && (
                                            <span className={`font-semibold ${
                                              daysLeft < 0
                                                ? 'text-rose-600 dark:text-rose-400'
                                                : daysLeft <= 30
                                                ? 'text-amber-600 dark:text-amber-400'
                                                : 'text-emerald-600 dark:text-emerald-400'
                                            }`}>
                                              {daysLeft < 0 ? `Expired ${Math.abs(daysLeft)}d ago` : `${daysLeft} days remaining`}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Services & Equipment info */}
                                      {Array.isArray(contract.coveredServices) && contract.coveredServices.length > 0 && (
                                        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
                                          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Covered Services</span>
                                          <div className="flex flex-wrap gap-1">
                                            {contract.coveredServices.map((srv, idx) => (
                                              <span
                                                key={idx}
                                                className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                                              >
                                                {srv}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      <div className="pt-2 flex items-center justify-between text-xs">
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                          Preventive Visits: <strong>{contract.preventiveVisitCount || 0}/yr</strong>
                                        </span>
                                        <Link
                                          to={`${basePath}/amc?contractId=${encodeURIComponent(contract.id || contract._id || '')}&project=${encodeURIComponent(selectedProject.id || selectedProject._id || '')}`}
                                          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                                        >
                                          View in AMC Panel <ArrowUpRight className="h-3 w-3" />
                                        </Link>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* TAB 3: PURCHASE ORDERS */}
                        {detailsTab === 'purchaseOrders' && (
                          <div className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                              <div>
                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                  Linked Procurement & Purchase Orders ({projectPOs.length})
                                </h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  Server hosting, cloud licenses, domains, APIs, and business purchases assigned to this project
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {(() => {
                                  const targetProjId = selectedProject.id || selectedProject._id || '';
                                  const targetProjName = selectedProject.projectCode
                                    ? `${selectedProject.projectCode} - ${selectedProject.name}`
                                    : (selectedProject.name || '');
                                  const targetClientId =
                                    selectedProject.leadId?._id ||
                                    selectedProject.leadId?.id ||
                                    (typeof selectedProject.leadId === 'string' ? selectedProject.leadId : '') ||
                                    selectedProject.client?._id ||
                                    selectedProject.client?.id ||
                                    '';
                                  const leadFullName = `${selectedProject.leadId?.firstName || ''} ${selectedProject.leadId?.lastName || ''}`.trim();
                                  const leadCompany = selectedProject.leadId?.company || selectedProject.client?.company || selectedProject.clientName || '';
                                  const targetClientName = (leadCompany && leadFullName)
                                    ? `${leadCompany} (${leadFullName})`
                                    : (selectedProject.clientName || leadCompany || leadFullName || '');

                                  const newPoSearch = new URLSearchParams({
                                    create: 'true',
                                    new: 'true',
                                    projectId: targetProjId,
                                    project: targetProjName,
                                    projectName: selectedProject.name || '',
                                    clientId: targetClientId,
                                    clientName: targetClientName
                                  }).toString();

                                  return (
                                    <Link
                                      to={{
                                        pathname: `${basePath}/purchase-orders`,
                                        search: `?${newPoSearch}`
                                      }}
                                      state={{
                                        openCreateModal: true,
                                        projectId: targetProjId,
                                        project: targetProjName,
                                        projectName: selectedProject.name || '',
                                        clientId: targetClientId,
                                        clientName: targetClientName
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                      New Purchase Order
                                    </Link>
                                  );
                                })()}
                              </div>
                            </div>

                            {projectPOs.length === 0 ? (
                              <div className="py-12 px-4 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                <ShoppingBag className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                                <h5 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Purchase Orders Linked</h5>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                                  No purchase orders or cloud services are linked to this project. Link software licenses, cloud servers, domains, and vendor services from the Purchase Orders section.
                                </p>
                                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                                  {(() => {
                                    const targetProjId = selectedProject.id || selectedProject._id || '';
                                    const targetProjName = selectedProject.projectCode
                                      ? `${selectedProject.projectCode} - ${selectedProject.name}`
                                      : (selectedProject.name || '');
                                    const targetClientId =
                                      selectedProject.leadId?._id ||
                                      selectedProject.leadId?.id ||
                                      (typeof selectedProject.leadId === 'string' ? selectedProject.leadId : '') ||
                                      selectedProject.client?._id ||
                                      selectedProject.client?.id ||
                                      '';
                                    const leadFullName = `${selectedProject.leadId?.firstName || ''} ${selectedProject.leadId?.lastName || ''}`.trim();
                                    const leadCompany = selectedProject.leadId?.company || selectedProject.client?.company || selectedProject.clientName || '';
                                    const targetClientName = (leadCompany && leadFullName)
                                      ? `${leadCompany} (${leadFullName})`
                                      : (selectedProject.clientName || leadCompany || leadFullName || '');

                                    const newPoSearch = new URLSearchParams({
                                      create: 'true',
                                      new: 'true',
                                      projectId: targetProjId,
                                      project: targetProjName,
                                      projectName: selectedProject.name || '',
                                      clientId: targetClientId,
                                      clientName: targetClientName
                                    }).toString();

                                    return (
                                      <Link
                                        to={{
                                          pathname: `${basePath}/purchase-orders`,
                                          search: `?${newPoSearch}`
                                        }}
                                        state={{
                                          openCreateModal: true,
                                          projectId: targetProjId,
                                          project: targetProjName,
                                          projectName: selectedProject.name || '',
                                          clientId: targetClientId,
                                          clientName: targetClientName
                                        }}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                                      >
                                        <Plus className="h-3.5 w-3.5" />
                                        New Purchase Order
                                      </Link>
                                    );
                                  })()}
                                  <Link
                                    to={`${basePath}/purchase-orders?project=${encodeURIComponent(selectedProject.name || selectedProject.id || selectedProject._id || '')}`}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                                  >
                                    Go to Purchase Orders
                                  </Link>
                                </div>
                              </div>
                            ) : (
                              <div className="border border-slate-200 dark:border-slate-700/80 rounded-xl overflow-x-auto text-xs">
                                <table className="w-full min-w-[640px] text-left">
                                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/80">
                                    <tr>
                                      <th className="py-2.5 px-3">PO Number</th>
                                      <th className="py-2.5 px-3">Vendor</th>
                                      <th className="py-2.5 px-3">Service & Category</th>
                                      <th className="py-2.5 px-3">Billing Cycle</th>
                                      <th className="py-2.5 px-3 text-right">Amount</th>
                                      <th className="py-2.5 px-3">Status</th>
                                      <th className="py-2.5 px-3">Purchase Date</th>
                                      <th className="py-2.5 px-3">Renewal / End</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                    {projectPOs.map((po) => {
                                      const poStatusCfg = PO_STATUS_CONFIG[po.status] || PO_STATUS_CONFIG.Pending;
                                      return (
                                        <tr key={po.id || po._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                            {po.poNumber || 'PO-RECORD'}
                                          </td>
                                          <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                                            {po.vendor || po.supplier || '-'}
                                          </td>
                                          <td className="py-2.5 px-3">
                                            <span className="font-medium text-slate-800 dark:text-slate-200 block">
                                              {po.serviceName || po.serviceType || 'Service'}
                                            </span>
                                            {po.serviceType && (
                                              <span className="text-[10px] text-slate-400 block">{po.serviceType}</span>
                                            )}
                                          </td>
                                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                                            {po.billingCycle || 'One Time'}
                                          </td>
                                          <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 dark:text-white">
                                            {formatINR(po.amount)}
                                          </td>
                                          <td className="py-2.5 px-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${poStatusCfg.bg} ${poStatusCfg.text} ${poStatusCfg.border}`}>
                                              {po.status}
                                            </span>
                                          </td>
                                          <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                                            {formatDate(po.purchaseDate || po.createdAt)}
                                          </td>
                                          <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                                            {formatDate(po.renewalDate || po.deliveryDate)}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}

                        {/* TAB 4: INVOICES & BILLING */}
                        {detailsTab === 'invoices' && (
                          <div className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                              <div>
                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                  Customer Invoices Linked to Project ({projectInvoices.length})
                                </h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  Commercial invoices issued to the client for this project
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {(() => {
                                  const targetProjId = selectedProject.id || selectedProject._id || '';
                                  const targetProjName = selectedProject.projectCode
                                    ? `${selectedProject.projectCode} - ${selectedProject.name}`
                                    : (selectedProject.name || '');

                                  const invoiceParams = new URLSearchParams({
                                    tab: 'invoices',
                                    createInvoice: 'true',
                                    newInvoice: 'true',
                                    projectId: targetProjId,
                                    project: targetProjName
                                  }).toString();

                                  return (
                                    <Link
                                      to={{
                                        pathname: `${basePath}/finance`,
                                        search: `?${invoiceParams}`
                                      }}
                                      state={{
                                        openCreateInvoiceModal: true,
                                        tab: 'invoices',
                                        projectId: targetProjId,
                                        project: targetProjName
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                      Issue Invoice
                                    </Link>
                                  );
                                })()}
                              </div>
                            </div>

                            {projectInvoices.length === 0 ? (
                              <div className="py-12 px-4 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                <Receipt className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                                <h5 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Invoices Issued Yet</h5>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                                  No customer invoices have been issued for this project. Issue milestone invoices in Finance Management to bill the client.
                                </p>
                                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                                  {(() => {
                                    const targetProjId = selectedProject.id || selectedProject._id || '';
                                    const targetProjName = selectedProject.projectCode
                                      ? `${selectedProject.projectCode} - ${selectedProject.name}`
                                      : (selectedProject.name || '');

                                    const invoiceParams = new URLSearchParams({
                                      tab: 'invoices',
                                      createInvoice: 'true',
                                      newInvoice: 'true',
                                      projectId: targetProjId,
                                      project: targetProjName
                                    }).toString();

                                    return (
                                      <Link
                                        to={{
                                          pathname: `${basePath}/finance`,
                                          search: `?${invoiceParams}`
                                        }}
                                        state={{
                                          openCreateInvoiceModal: true,
                                          tab: 'invoices',
                                          projectId: targetProjId,
                                          project: targetProjName
                                        }}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                                      >
                                        <Plus className="h-3.5 w-3.5" />
                                        Issue Invoice
                                      </Link>
                                    );
                                  })()}
                                  <Link
                                    to={`${basePath}/finance?tab=invoices`}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                                  >
                                    Go to Finance Management
                                  </Link>
                                </div>
                              </div>
                            ) : (
                              <div className="border border-slate-200 dark:border-slate-700/80 rounded-xl overflow-x-auto text-xs">
                                <table className="w-full min-w-[680px] text-left">
                                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/80">
                                    <tr>
                                      <th className="py-2.5 px-3">Invoice #</th>
                                      <th className="py-2.5 px-3">Milestone / Scope</th>
                                      <th className="py-2.5 px-3">Invoice Date</th>
                                      <th className="py-2.5 px-3">Due Date</th>
                                      <th className="py-2.5 px-3 text-right">Total Amount</th>
                                      <th className="py-2.5 px-3 text-right">Paid Amount</th>
                                      <th className="py-2.5 px-3 text-right">Balance Due</th>
                                      <th className="py-2.5 px-3">Status</th>
                                      <th className="py-2.5 px-3 text-center">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                    {projectInvoices.map((inv) => {
                                      const invStatusCfg = INVOICE_STATUS_CONFIG[inv.status] || INVOICE_STATUS_CONFIG.draft;
                                      const balanceDue = Number(inv.outstandingAmount ?? inv.balanceDue ?? (Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0)));
                                      return (
                                        <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                            {inv.invoiceNumber}
                                          </td>
                                          <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                                            {inv.milestoneName || 'Commercial Invoice'}
                                          </td>
                                          <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                                            {formatDate(inv.invoiceDate)}
                                          </td>
                                          <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                                            {formatDate(inv.dueDate)}
                                          </td>
                                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                                            {formatINR(inv.totalAmount)}
                                          </td>
                                          <td className="py-2.5 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                                            {formatINR(inv.paidAmount)}
                                          </td>
                                          <td className="py-2.5 px-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                                            {formatINR(balanceDue)}
                                          </td>
                                          <td className="py-2.5 px-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${invStatusCfg.bg} ${invStatusCfg.text} ${invStatusCfg.border}`}>
                                              {inv.status}
                                            </span>
                                          </td>
                                          <td className="py-2.5 px-3 text-center">
                                            <button
                                              onClick={() => handleDownloadInvoicePdf(inv)}
                                              disabled={downloadingPdfId === inv.id}
                                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                                              title="Download Invoice PDF"
                                            >
                                              <Download className="h-3 w-3" />
                                              {downloadingPdfId === inv.id ? '...' : 'PDF'}
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}

                        {/* TAB 5: EXPENSES & INCOMING PAYMENTS */}
                        {detailsTab === 'expenses' && (
                          <div className="space-y-5">
                            {/* Recorded Project Expenses */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                  Recorded Project Expenses ({projectExpenses.length})
                                </h4>
                                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                                  Total: {formatINR(projectExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0))}
                                </span>
                              </div>

                              {projectExpenses.length === 0 ? (
                                <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                                  No direct project expenses recorded yet. Log project expenses in Expense Tracker.
                                </div>
                              ) : (
                                <div className="border border-slate-200 dark:border-slate-700/80 rounded-xl overflow-x-auto text-xs">
                                  <table className="w-full min-w-[500px] text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/80">
                                      <tr>
                                        <th className="py-2.5 px-3">Date</th>
                                        <th className="py-2.5 px-3">Category</th>
                                        <th className="py-2.5 px-3">Description</th>
                                        <th className="py-2.5 px-3">Paid To</th>
                                        <th className="py-2.5 px-3 text-right">Amount</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                      {projectExpenses.map((exp) => (
                                        <tr key={exp.id || exp._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                                          <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{formatDate(exp.date)}</td>
                                          <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{exp.category || 'Direct Expense'}</td>
                                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{exp.description || '-'}</td>
                                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{exp.paidTo || '-'}</td>
                                          <td className="py-2.5 px-3 text-right font-bold text-rose-600 dark:text-rose-400">{formatINR(exp.amount)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>

                            {/* Client Incoming Payments */}
                            <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                  Client Incoming Payments ({projectPayments.length})
                                </h4>
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                  Total Received: {formatINR(projectPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0))}
                                </span>
                              </div>

                              {projectPayments.length === 0 ? (
                                <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                                  No client incoming payment transactions linked directly. Payments allocated to invoices will appear in Invoices & Billing.
                                </div>
                              ) : (
                                <div className="border border-slate-200 dark:border-slate-700/80 rounded-xl overflow-x-auto text-xs">
                                  <table className="w-full min-w-[500px] text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/80">
                                      <tr>
                                        <th className="py-2.5 px-3">Date</th>
                                        <th className="py-2.5 px-3">Method</th>
                                        <th className="py-2.5 px-3">Reference #</th>
                                        <th className="py-2.5 px-3">Remarks</th>
                                        <th className="py-2.5 px-3 text-right">Amount</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                      {projectPayments.map((pay) => (
                                        <tr key={pay.id || pay._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                                          <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{formatDate(pay.date)}</td>
                                          <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{pay.paymentMethod || 'Transfer'}</td>
                                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">{pay.referenceNumber || '-'}</td>
                                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{pay.remarks || pay.description || '-'}</td>
                                          <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatINR(pay.amount)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* TAB 6: TASKS & DELIVERY */}
                        {detailsTab === 'tasks' && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                              <div>
                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                  Project Execution Tasks ({projectTasks.length})
                                </h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  Delivery tasks, developmental milestones, and assignees
                                </p>
                              </div>
                              <a
                                href="/admin/tasks"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
                              >
                                Task Management <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>

                            {projectTasks.length === 0 ? (
                              <div className="py-12 px-4 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                <CheckCircle2 className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                                <h5 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Tasks Linked</h5>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                                  No tasks are linked to this project yet. Link tasks from the Task Management module to track development progress.
                                </p>
                              </div>
                            ) : (
                              <div className="border border-slate-200 dark:border-slate-700/80 rounded-xl overflow-hidden text-xs divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                {projectTasks.map((t) => (
                                  <div key={t._id || t.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                                    <div className="space-y-1">
                                      <span className="font-semibold text-slate-900 dark:text-white text-xs">{t.title}</span>
                                      {t.description && (
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{t.description}</p>
                                      )}
                                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                                        <span>Assignee: <strong>{t.assignedTo?.personalInfo?.name || t.assignedTo?.workInfo?.employeeId || 'Unassigned'}</strong></span>
                                        {t.dueDate && <span>Due: <strong>{formatDate(t.dueDate)}</strong></span>}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                        {t.priority}
                                      </span>
                                      <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                          t.status === 'Completed'
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                                            : t.status === 'In Progress'
                                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50'
                                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50'
                                        }`}
                                      >
                                        {t.status}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* TAB 7: EQUIPMENT / ASSETS */}
                        {detailsTab === 'equipment' && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                              <div>
                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                  Customer Equipment & Registered Assets ({projectEquipment.length})
                                </h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  Hardware, server appliances, cloud instances, and client assets covered under this project
                                </p>
                              </div>
                            </div>

                            {projectEquipment.length === 0 ? (
                              <div className="py-12 px-4 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                <Cpu className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                                <h5 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Equipment Registered</h5>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                                  No customer equipment or hardware units are registered for this project.
                                </p>
                              </div>
                            ) : (
                              <div className="border border-slate-200 dark:border-slate-700/80 rounded-xl overflow-x-auto text-xs">
                                <table className="w-full min-w-[640px] text-left">
                                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/80">
                                    <tr>
                                      <th className="py-2.5 px-3">Equipment / Asset Name</th>
                                      <th className="py-2.5 px-3">Model / Serial #</th>
                                      <th className="py-2.5 px-3">Category</th>
                                      <th className="py-2.5 px-3">Location</th>
                                      <th className="py-2.5 px-3">Status</th>
                                      <th className="py-2.5 px-3">Installed</th>
                                      <th className="py-2.5 px-3">Warranty End</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                    {projectEquipment.map((eq) => (
                                      <tr key={eq.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                                          {eq.equipmentName}
                                        </td>
                                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-mono">
                                          {eq.modelNumber || eq.serialNumber ? (
                                            <>
                                              {eq.modelNumber && <span>{eq.modelNumber}</span>}
                                              {eq.serialNumber && <span className="text-[10px] text-slate-400 block">{eq.serialNumber}</span>}
                                            </>
                                          ) : (
                                            '-'
                                          )}
                                        </td>
                                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                                          {eq.category || 'General'}
                                        </td>
                                        <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                                          {eq.location || '-'}
                                        </td>
                                        <td className="py-2.5 px-3">
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                                            {eq.status || 'Operational'}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                                          {formatDate(eq.installationDate)}
                                        </td>
                                        <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                                          {formatDate(eq.warrantyEndDate)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="px-3.5 sm:px-5 py-2.5 sm:py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
                    <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate mr-2">
                      Project Code: <strong className="text-slate-700 dark:text-slate-200">{selectedProject.projectCode}</strong> • Created {formatDate(selectedProject.createdAt)}
                    </div>
                    <button
                      onClick={() => setSelectedProject(null)}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition shrink-0"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            );
          })(),
          document.body
        )}
      </div>
    </Layout>
  );
};

const AdminProjects = () => <ProjectsView Layout={AdminLayout} isEmployee={false} />;

export default AdminProjects;
