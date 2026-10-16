import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import AdminLayout from '../../components/Admin/layout/AdminLayout';
import {
  Landmark,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Plus,
  Search,
  Filter,
  RefreshCw,
  FolderKanban,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Edit3,
  Eye,
  Link as LinkIcon,
  HelpCircle,
  X,
  CreditCard,
  Building2,
  Briefcase
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { financeAPI, projectAPI } from '../../utils/api';
import CustomerInvoicesTab from '../../components/Finance/CustomerInvoicesTab';
import AccountsReceivableTab from '../../components/Finance/AccountsReceivableTab';
import CreateInvoiceModal from '../../components/Finance/CreateInvoiceModal';
import InvoiceDetailModal from '../../components/Finance/InvoiceDetailModal';
import AllocatePaymentModal from '../../components/Finance/AllocatePaymentModal';

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

const BUDGET_STATUS_COLORS = {
  Draft: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300',
  'Pending Approval': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400',
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400',
  Superseded: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400',
};

const AdminFinanceManagement = ({ Layout = AdminLayout }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'projects' | 'budgets' | 'transactions' | 'analysis'
  const [loading, setLoading] = useState(false);

  // Projects list for selectors
  const [projectsList, setProjectsList] = useState([]);

  // 1. Overview state
  const [overviewData, setOverviewData] = useState(null);
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('');

  // 2. Project Finance state
  const [projectFinanceList, setProjectFinanceList] = useState([]);
  const [projectSearch, setProjectSearch] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState('all');
  const [selectedProjectDetail, setSelectedProjectDetail] = useState(null);
  const [detailModalTab, setDetailModalTab] = useState('overview'); // 'overview' | 'budget' | 'purchases' | 'expenses' | 'payments'
  const [detailLoading, setDetailLoading] = useState(false);

  // 3. Budgets state
  const [budgets, setBudgets] = useState([]);
  const [budgetStatusFilter, setBudgetStatusFilter] = useState('all');
  const [budgetProjectFilter, setBudgetProjectFilter] = useState('');
  const [showCreateBudgetModal, setShowCreateBudgetModal] = useState(false);
  const [newBudget, setNewBudget] = useState({
    projectId: '',
    notes: '',
    items: [{ category: 'Software & Tools', description: '', plannedAmount: 0 }],
  });
  const [savingBudget, setSavingBudget] = useState(false);
  const [viewingBudget, setViewingBudget] = useState(null);

  // 4. Consolidated Transactions state
  const [transactions, setTransactions] = useState([]);
  const [txPagination, setTxPagination] = useState({ page: 1, limit: 30, total: 0, totalPages: 1 });
  const [txStreamFilter, setTxStreamFilter] = useState('all');
  const [txCategoryFilter, setTxCategoryFilter] = useState('');
  const [txSearch, setTxSearch] = useState('');
  const [linkingTx, setLinkingTx] = useState(null);
  const [targetProjectId, setTargetProjectId] = useState('');
  const [linkingLoading, setLinkingLoading] = useState(false);

  // 5. Spending Analysis state
  const [analysisData, setAnalysisData] = useState(null);

  // 6. Phase 3: Customer Invoices state
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);

  // 7. Phase 3: Accounts Receivable & Payment Allocations state
  const [receivablesData, setReceivablesData] = useState(null);
  const [loadingReceivables, setLoadingReceivables] = useState(false);
  const [unallocatedPayments, setUnallocatedPayments] = useState([]);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [paymentToAllocate, setPaymentToAllocate] = useState(null);
  const [invoiceToAllocate, setInvoiceToAllocate] = useState(null);

  const fetchInvoices = async () => {
    try {
      setLoadingInvoices(true);
      const res = await financeAPI.getInvoices();
      if (res.data?.success) {
        setInvoices(res.data.data || []);
      }
    } catch (err) {
      toast.error('Failed to load customer invoices');
    } finally {
      setLoadingInvoices(false);
    }
  };

  const fetchReceivables = async () => {
    try {
      setLoadingReceivables(true);
      const [recRes, unallocRes] = await Promise.all([
        financeAPI.getReceivablesSummary(),
        financeAPI.getUnallocatedPayments(),
      ]);
      if (recRes.data?.success) {
        setReceivablesData(recRes.data.data);
      }
      if (unallocRes.data?.success) {
        setUnallocatedPayments(unallocRes.data.data || []);
      }
    } catch (err) {
      toast.error('Failed to load accounts receivable summary');
    } finally {
      setLoadingReceivables(false);
    }
  };

  // Fetch projects list for dropdowns
  const fetchProjectsList = async () => {
    try {
      const res = await projectAPI.getProjects({ limit: 100 });
      if (res.data?.success) {
        setProjectsList(res.data.data?.projects || res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load projects list:', err);
    }
  };

  // Fetch Overview
  const fetchOverview = async () => {
    try {
      setLoading(true);
      const params = {};
      if (dateFilter.start) params.startDate = dateFilter.start;
      if (dateFilter.end) params.endDate = dateFilter.end;
      if (selectedProjectFilter) params.projectId = selectedProjectFilter;

      const res = await financeAPI.getOverview(params);
      if (res.data?.success) {
        setOverviewData(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load finance overview');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Project Finance List
  const fetchProjectFinance = async () => {
    try {
      setLoading(true);
      const params = { status: projectStatusFilter, search: projectSearch };
      const res = await financeAPI.getProjects(params);
      if (res.data?.success) {
        setProjectFinanceList(res.data.data?.projects || []);
      }
    } catch (err) {
      toast.error('Failed to load project finance list');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Single Project Detail
  const fetchProjectDetail = async (projectId) => {
    try {
      setDetailLoading(true);
      const res = await financeAPI.getProjectDetails(projectId);
      if (res.data?.success) {
        setSelectedProjectDetail(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load project financial details');
    } finally {
      setDetailLoading(false);
    }
  };

  // Fetch Budgets
  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const params = {
        status: budgetStatusFilter,
        projectId: budgetProjectFilter,
      };
      const res = await financeAPI.getBudgets(params);
      if (res.data?.success) {
        setBudgets(res.data.data || []);
      }
    } catch (err) {
      toast.error('Failed to load budgets');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Transactions
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = {
        stream: txStreamFilter,
        category: txCategoryFilter,
        search: txSearch,
        page: txPagination.page,
        limit: txPagination.limit,
      };
      const res = await financeAPI.getTransactions(params);
      if (res.data?.success) {
        setTransactions(res.data.data?.transactions || []);
        setTxPagination(res.data.data?.pagination || { page: 1, limit: 30, total: 0, totalPages: 1 });
      }
    } catch (err) {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Spending Analysis
  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const res = await financeAPI.getSpendingAnalysis();
      if (res.data?.success) {
        setAnalysisData(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load spending analysis');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchProjectsList();
  }, []);

  // Tab change trigger
  useEffect(() => {
    if (activeTab === 'overview') fetchOverview();
    else if (activeTab === 'invoices') fetchInvoices();
    else if (activeTab === 'receivables') fetchReceivables();
    else if (activeTab === 'projects') fetchProjectFinance();
    else if (activeTab === 'budgets') fetchBudgets();
    else if (activeTab === 'transactions') fetchTransactions();
    else if (activeTab === 'analysis') fetchAnalysis();
  }, [activeTab, dateFilter, selectedProjectFilter, projectStatusFilter, budgetStatusFilter, budgetProjectFilter, txStreamFilter]);

  // Handle Budget Item changes
  const handleAddBudgetItem = () => {
    setNewBudget((prev) => ({
      ...prev,
      items: [...prev.items, { category: '', description: '', plannedAmount: 0 }],
    }));
  };

  const handleRemoveBudgetItem = (idx) => {
    setNewBudget((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const handleBudgetItemChange = (idx, field, val) => {
    setNewBudget((prev) => {
      const items = [...prev.items];
      items[idx][field] = field === 'plannedAmount' ? Number(val || 0) : val;
      return { ...prev, items };
    });
  };

  // Create Budget
  const handleCreateBudgetSubmit = async (e) => {
    e.preventDefault();
    if (!newBudget.projectId) {
      toast.error('Please select a project');
      return;
    }
    try {
      setSavingBudget(true);
      const res = await financeAPI.createBudget(newBudget);
      if (res.data?.success) {
        toast.success('Budget draft created successfully');
        setShowCreateBudgetModal(false);
        setNewBudget({
          projectId: '',
          notes: '',
          items: [{ category: 'Software & Tools', description: '', plannedAmount: 0 }],
        });
        fetchBudgets();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create budget');
    } finally {
      setSavingBudget(false);
    }
  };

  // Budget Actions
  const handleSubmitBudgetForApproval = async (id) => {
    try {
      const res = await financeAPI.submitBudget(id);
      if (res.data?.success) {
        toast.success('Budget submitted for approval');
        fetchBudgets();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit budget');
    }
  };

  const handleApproveBudget = async (id) => {
    if (!window.confirm('Are you sure you want to approve this budget? This will update the project approved budget.')) return;
    try {
      const res = await financeAPI.approveBudget(id);
      if (res.data?.success) {
        toast.success('Budget approved and synchronized with project');
        fetchBudgets();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve budget');
    }
  };

  const handleRejectBudget = async (id) => {
    const reason = window.prompt('Enter reason for rejection:');
    if (reason === null) return;
    try {
      const res = await financeAPI.rejectBudget(id, { reason });
      if (res.data?.success) {
        toast.success('Budget rejected');
        fetchBudgets();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject budget');
    }
  };

  const handleReviseBudget = async (id) => {
    if (!window.confirm('Create a new revised version (Draft) based on this budget?')) return;
    try {
      const res = await financeAPI.reviseBudget(id, {});
      if (res.data?.success) {
        toast.success('Revision created as Draft');
        fetchBudgets();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create revision');
    }
  };

  // Link Unallocated Transaction
  const handleLinkTransaction = async (e) => {
    e.preventDefault();
    if (!targetProjectId) {
      toast.error('Please select a project');
      return;
    }
    try {
      setLinkingLoading(true);
      const res = await financeAPI.linkTransaction({
        stream: linkingTx.stream,
        transactionId: linkingTx.id,
        projectId: targetProjectId,
      });
      if (res.data?.success) {
        toast.success('Transaction linked to project successfully');
        setLinkingTx(null);
        setTargetProjectId('');
        fetchTransactions();
        if (activeTab === 'projects') fetchProjectFinance();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to link transaction');
    } finally {
      setLinkingLoading(false);
    }
  };

  const metrics = overviewData?.metrics || {};

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Finance Management
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Consolidated financial control, project budgets, actual expenditure & purchase commitments
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (activeTab === 'overview') fetchOverview();
                else if (activeTab === 'invoices') fetchInvoices();
                else if (activeTab === 'receivables') fetchReceivables();
                else if (activeTab === 'projects') fetchProjectFinance();
                else if (activeTab === 'budgets') fetchBudgets();
                else if (activeTab === 'transactions') fetchTransactions();
                else if (activeTab === 'analysis') fetchAnalysis();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-sm transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading || loadingInvoices || loadingReceivables ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {activeTab === 'invoices' && (
              <button
                onClick={() => {
                  setEditingInvoice(null);
                  setShowCreateInvoiceModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Invoice
              </button>
            )}
            {activeTab === 'budgets' && (
              <button
                onClick={() => setShowCreateBudgetModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Budget
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none gap-2">
          {[
            { id: 'overview', label: 'Overview', icon: Landmark },
            { id: 'invoices', label: 'Customer Invoices', icon: FileText },
            { id: 'receivables', label: 'Customer Payments / Collections', icon: CreditCard },
            { id: 'expense-tracker', label: 'Expense Tracker', icon: DollarSign, route: '/admin/expense-tracker' },
            { id: 'purchase-orders', label: 'Purchase Orders', icon: Briefcase, route: '/admin/purchase-orders' },
            { id: 'projects', label: 'Project Finance', icon: FolderKanban },
            { id: 'budgets', label: 'Budget Management', icon: ShieldCheck },
            { id: 'transactions', label: 'Consolidated Transactions', icon: Layers },
            { id: 'analysis', label: 'Spending Analysis', icon: PieChart },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.route) {
                    navigate(tab.route);
                    return;
                  }
                  setActiveTab(tab.id);
                }}
                className={`inline-flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Filters Bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center gap-3 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" /> Filters:
              </span>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">From:</span>
                <input
                  type="date"
                  value={dateFilter.start}
                  onChange={(e) => setDateFilter((prev) => ({ ...prev, start: e.target.value }))}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">To:</span>
                <input
                  type="date"
                  value={dateFilter.end}
                  onChange={(e) => setDateFilter((prev) => ({ ...prev, end: e.target.value }))}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Project:</span>
                <select
                  value={selectedProjectFilter}
                  onChange={(e) => setSelectedProjectFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="">All Projects</option>
                  {projectsList.map((p) => (
                    <option key={p.id || p._id} value={p.id || p._id}>
                      {p.projectCode} - {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {(dateFilter.start || dateFilter.end || selectedProjectFilter) && (
                <button
                  onClick={() => {
                    setDateFilter({ start: '', end: '' });
                    setSelectedProjectFilter('');
                  }}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline ml-auto"
                >
                  Reset Filters
                </button>
              )}
            </div>

            {/* Operational KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Contract Value */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Contract Value</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {formatINR(metrics.totalContractValue)}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Sum of signed project contracts
                  </p>
                </div>
              </div>

              {/* Card 2: Total Approved Budgets */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Approved Project Budgets</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {formatINR(metrics.totalApprovedBudget)}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Authoritative approved internal caps
                  </p>
                </div>
              </div>

              {/* Card 3: Actual Project Costs */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Actual Project Costs</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {formatINR(metrics.totalActualProjectCosts)}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Recognized project expense records
                  </p>
                </div>
              </div>

              {/* Card 4: Open Purchase Commitments */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Open PO Commitments</span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {formatINR(metrics.totalOpenCommitments)}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Pending/Active PO obligations
                  </p>
                </div>
              </div>

              {/* Card 5: Available Project Budget */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Available Project Budget</span>
                  <div className={`w-8 h-8 rounded-lg ${
                    metrics.totalAvailableProjectBudget >= 0 ? 'bg-teal-50 text-teal-600' : 'bg-rose-50 text-rose-600'
                  } flex items-center justify-center`}>
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className={`text-2xl font-bold ${
                    metrics.totalAvailableProjectBudget >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {formatINR(metrics.totalAvailableProjectBudget)}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Approved Cap − Actual − Open Commitments
                  </p>
                </div>
              </div>

              {/* Card 6: Total Recorded Expenses (Company-wide) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Recorded Expenses</span>
                  <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {formatINR(metrics.totalRecordedExpenses)}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Company-wide (Project + Overheads)
                  </p>
                </div>
              </div>

              {/* Card 7: Incoming Client Payments */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Incoming Client Payments</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                    <ArrowDownRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatINR(metrics.totalIncomingPayments)}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Actual receipts recorded in tracker
                  </p>
                </div>
              </div>

              {/* Card 8: Active & Total Projects */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Project Portfolio</span>
                  <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
                    <FolderKanban className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {metrics.activeProjectCount || 0} / {metrics.projectCount || 0}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Active projects / Total projects
                  </p>
                </div>
              </div>
            </div>

            {/* Informational Guidance Notice on Financial Definitions */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 leading-relaxed">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Operational Finance Rule Enforcement:
                </span>
                <p>
                  • <strong>Contract Value</strong> represents total agreed contract value and is not treated as cash received.
                  • <strong>Available Project Budget</strong> is derived strictly as Approved Budget − Actual Recognized Costs − Open Purchase Commitments.
                  • <strong>Commitments vs Costs</strong>: Open POs are treated as obligations, while recognized expenses represent actual incurred costs.
                  • <strong>Paid Payroll Operational Cost</strong>: Recorded as {formatINR(metrics.totalPaidPayroll)} from paid employee payslips without double-counting general expenses.
                </p>
              </div>
            </div>

            {/* Recent Activity Stream */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  Recent Consolidated Transactions
                </h3>
                <button
                  onClick={() => setActiveTab('transactions')}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  View All Transactions →
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {(overviewData?.recentActivity || []).length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-500">No recent transactions recorded</div>
                ) : (
                  (overviewData?.recentActivity || []).map((item) => (
                    <div key={item.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold ${
                          item.stream === 'payment'
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40'
                            : item.stream === 'purchase'
                            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40'
                            : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40'
                        }`}>
                          {item.stream === 'payment' ? 'IN' : item.stream === 'purchase' ? 'PO' : 'EX'}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-white">{item.title}</div>
                          <div className="text-xs text-slate-500">
                            {formatDate(item.date)} • {item.party || 'General'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`text-sm font-semibold ${
                          item.stream === 'payment' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                        }`}>
                          {item.stream === 'payment' ? '+' : '-'}{formatINR(item.amount)}
                        </div>
                        <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PROJECT FINANCE */}
        {activeTab === 'projects' && (
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchProjectFinance()}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <select
                  value={projectStatusFilter}
                  onChange={(e) => setProjectStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="Planning">Planning</option>
                  <option value="Active">Active</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
                <button
                  onClick={fetchProjectFinance}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  Filter
                </button>
              </div>
            </div>

            {/* Projects Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Project</th>
                      <th className="py-3 px-4">Client</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Contract Value</th>
                      <th className="py-3 px-4 text-right">Approved Budget</th>
                      <th className="py-3 px-4 text-right">Actual Costs</th>
                      <th className="py-3 px-4 text-right">Open Commitments</th>
                      <th className="py-3 px-4 text-right">Available Budget</th>
                      <th className="py-3 px-4 text-right">Incoming Payments</th>
                      <th className="py-3 px-4 text-center">Utilization</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {projectFinanceList.length === 0 ? (
                      <tr>
                        <td colSpan="11" className="py-8 text-center text-slate-500">
                          No project financial records found
                        </td>
                      </tr>
                    ) : (
                      projectFinanceList.map((prj) => (
                        <tr key={prj.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900 dark:text-white">{prj.name}</div>
                            <div className="text-[11px] text-slate-400">{prj.projectCode}</div>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                            {prj.clientName || '-'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {prj.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-slate-900 dark:text-white">
                            {formatINR(prj.contractValue)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-semibold text-slate-900 dark:text-white">
                            {formatINR(prj.approvedBudget)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-amber-600 dark:text-amber-400">
                            {formatINR(prj.actualCosts)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-indigo-600 dark:text-indigo-400">
                            {formatINR(prj.openCommitments)}
                          </td>
                          <td className={`py-3.5 px-4 text-right font-bold ${
                            prj.availableBudget >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {formatINR(prj.availableBudget)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-emerald-600 dark:text-emerald-400">
                            {formatINR(prj.incomingPayments)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                                {prj.budgetUtilization}%
                              </span>
                              <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
                                <div
                                  className={`h-full ${
                                    prj.budgetUtilization > 100
                                      ? 'bg-rose-500'
                                      : prj.budgetUtilization > 80
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.min(100, prj.budgetUtilization)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => {
                                fetchProjectDetail(prj.id);
                                setDetailModalTab('overview');
                              }}
                              className="px-2.5 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg hover:bg-indigo-100 transition-colors"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BUDGET MANAGEMENT */}
        {activeTab === 'budgets' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Filter by Project:</span>
                <select
                  value={budgetProjectFilter}
                  onChange={(e) => setBudgetProjectFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="">All Projects</option>
                  {projectsList.map((p) => (
                    <option key={p.id || p._id} value={p.id || p._id}>
                      {p.projectCode} - {p.name}
                    </option>
                  ))}
                </select>

                <span className="text-xs text-slate-500 ml-2">Status:</span>
                <select
                  value={budgetStatusFilter}
                  onChange={(e) => setBudgetStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="Pending Approval">Pending Approval</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Superseded">Superseded</option>
                </select>
              </div>

              <button
                onClick={() => setShowCreateBudgetModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Project Budget
              </button>
            </div>

            {/* Budgets List */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Budget No.</th>
                      <th className="py-3 px-4">Project</th>
                      <th className="py-3 px-4">Version</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Planned Cap</th>
                      <th className="py-3 px-4 text-right">Approved Cap</th>
                      <th className="py-3 px-4">Created By</th>
                      <th className="py-3 px-4">Approved By</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {budgets.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="py-8 text-center text-slate-500">
                          No budgets created yet. Click "Create Project Budget" to begin.
                        </td>
                      </tr>
                    ) : (
                      budgets.map((b) => (
                        <tr key={b.id || b._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 dark:text-white">
                            {b.budgetNumber}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                            {b.projectId?.name || 'Project'}
                            <span className="block text-[10px] text-slate-400">
                              {b.projectId?.projectCode}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono">v{b.version}</td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                              BUDGET_STATUS_COLORS[b.status] || 'bg-slate-100 text-slate-700'
                            }`}>
                              {b.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-slate-900 dark:text-white">
                            {formatINR(b.totalPlannedAmount)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            {formatINR(b.totalApprovedAmount)}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">
                            {b.createdBy?.name || 'Admin'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">
                            {b.approvedBy?.name ? (
                              <span>
                                {b.approvedBy.name}
                                <span className="block text-[10px] text-slate-400">
                                  {formatDate(b.approvedAt)}
                                </span>
                              </span>
                            ) : '-'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setViewingBudget(b)}
                                title="View Items"
                                className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {(b.status === 'Draft' || b.status === 'Rejected') && (
                                <button
                                  onClick={() => handleSubmitBudgetForApproval(b.id || b._id)}
                                  className="px-2 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 hover:bg-amber-100 rounded border border-amber-200"
                                >
                                  Submit
                                </button>
                              )}

                              {b.status === 'Pending Approval' && (
                                <>
                                  <button
                                    onClick={() => handleApproveBudget(b.id || b._id)}
                                    className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-100 rounded border border-emerald-200"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleRejectBudget(b.id || b._id)}
                                    className="px-2 py-0.5 text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 hover:bg-rose-100 rounded border border-rose-200"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}

                              {b.status === 'Approved' && (
                                <button
                                  onClick={() => handleReviseBudget(b.id || b._id)}
                                  className="px-2 py-0.5 text-[11px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 hover:bg-purple-100 rounded border border-purple-200"
                                >
                                  Revise
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CONSOLIDATED TRANSACTIONS */}
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by vendor, client, category, reference..."
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchTransactions()}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <select
                  value={txStreamFilter}
                  onChange={(e) => setTxStreamFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="all">All Streams</option>
                  <option value="purchase">Purchase Orders (PO)</option>
                  <option value="expense">Expenses</option>
                  <option value="payment">Client Payments</option>
                </select>
                <button
                  onClick={fetchTransactions}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  Filter
                </button>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Stream & Type</th>
                      <th className="py-3 px-4">Reference</th>
                      <th className="py-3 px-4">Party / Vendor</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Project Allocation</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="py-8 text-center text-slate-500">
                          No transactions found
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx) => (
                        <tr key={`${tx.stream}-${tx.id}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 whitespace-nowrap">{formatDate(tx.date)}</td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                              tx.stream === 'payment'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                : tx.stream === 'purchase'
                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                            }`}>
                              {tx.type}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono">{tx.reference || '-'}</td>
                          <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                            {tx.party || '-'}
                          </td>
                          <td className="py-3.5 px-4">{tx.category || '-'}</td>
                          <td className="py-3.5 px-4">
                            {tx.isAllocated ? (
                              <span className="inline-flex items-center gap-1 text-slate-800 dark:text-slate-200 font-medium">
                                <FolderKanban className="w-3.5 h-3.5 text-indigo-500" />
                                {tx.projectCode ? `${tx.projectCode} - ` : ''}{tx.projectName || 'Project'}
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500">
                                Unallocated (Overhead)
                              </span>
                            )}
                          </td>
                          <td className={`py-3.5 px-4 text-right font-bold ${
                            tx.stream === 'payment' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                          }`}>
                            {tx.stream === 'payment' ? '+' : '-'}{formatINR(tx.amount)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {tx.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {!tx.isAllocated && (
                              <button
                                onClick={() => {
                                  setLinkingTx(tx);
                                  setTargetProjectId('');
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 rounded"
                              >
                                <LinkIcon className="w-3 h-3" />
                                Link Project
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SPENDING ANALYSIS */}
        {activeTab === 'analysis' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Card 1: Expense Breakdown by Category */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-indigo-500" />
                  Actual Expenditure by Expense Category
                </h3>
                <div className="space-y-3">
                  {(analysisData?.byCategory || []).length === 0 ? (
                    <p className="text-xs text-slate-500">No categorized expenses recorded</p>
                  ) : (
                    analysisData.byCategory.map((item) => (
                      <div key={item.category} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-slate-700 dark:text-slate-300">{item.category}</span>
                          <span className="text-slate-900 dark:text-white font-semibold">{formatINR(item.amount)}</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                (item.amount / (analysisData.overheadVsProject?.total || 1)) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Card 2: Purchases by Vendor */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-500" />
                  IT Service & Infrastructure Purchases by Vendor
                </h3>
                <div className="space-y-3">
                  {(analysisData?.byVendor || []).length === 0 ? (
                    <p className="text-xs text-slate-500">No purchase vendor data recorded</p>
                  ) : (
                    analysisData.byVendor.map((item) => (
                      <div key={item.vendor} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-slate-700 dark:text-slate-300">{item.vendor}</span>
                          <span className="text-slate-900 dark:text-white font-semibold">{formatINR(item.amount)}</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-violet-500 rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                (item.amount /
                                  (analysisData.byVendor.reduce((sum, v) => sum + v.amount, 0) || 1)) *
                                  100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Card 3: Overhead vs Project Expenditure */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-500" />
                  Company Overhead vs Project Expenditure
                </h3>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">Direct Project Expenses:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {formatINR(analysisData?.overheadVsProject?.project)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">Company Overhead (Unallocated):</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {formatINR(analysisData?.overheadVsProject?.overhead)}
                    </span>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between items-center font-bold">
                    <span className="text-slate-900 dark:text-white">Total Recorded Expenditure:</span>
                    <span className="text-slate-900 dark:text-white">
                      {formatINR(analysisData?.overheadVsProject?.total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 4: Project Budget Utilization */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-indigo-500" />
                  Project Budget Utilization Summary
                </h3>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {(analysisData?.budgetUtilization || []).length === 0 ? (
                    <p className="text-xs text-slate-500">No project budget data available</p>
                  ) : (
                    analysisData.budgetUtilization.map((item) => (
                      <div key={item.projectCode} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg space-y-1.5 text-xs">
                        <div className="flex justify-between font-medium">
                          <span className="text-slate-900 dark:text-white">{item.projectCode} - {item.name}</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{item.utilizationRate}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              item.utilizationRate > 100
                                ? 'bg-rose-500'
                                : item.utilizationRate > 80
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, item.utilizationRate)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500">
                          <span>Cap: {formatINR(item.approvedBudget)}</span>
                          <span>Spent: {formatINR(item.totalUtilized)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: PHASE 3 CUSTOMER INVOICES */}
        {activeTab === 'invoices' && (
          <CustomerInvoicesTab
            invoices={invoices}
            projectsList={projectsList}
            loading={loadingInvoices}
            onRefresh={fetchInvoices}
            onOpenCreateModal={() => {
              setEditingInvoice(null);
              setShowCreateInvoiceModal(true);
            }}
            onViewInvoice={(inv) => setViewingInvoice(inv)}
            onOpenAllocate={(inv) => {
              setInvoiceToAllocate(inv);
              setPaymentToAllocate(null);
              setShowAllocateModal(true);
            }}
          />
        )}

        {/* TAB 7: PHASE 3 ACCOUNTS RECEIVABLE */}
        {activeTab === 'receivables' && (
          <AccountsReceivableTab
            receivablesData={receivablesData}
            unallocatedPayments={unallocatedPayments}
            loading={loadingReceivables}
            onRefresh={fetchReceivables}
            onOpenAllocate={(pm) => {
              setPaymentToAllocate(pm);
              setInvoiceToAllocate(null);
              setShowAllocateModal(true);
            }}
          />
        )}

        {/* ================= MODALS ================= */}

        {/* MODAL 1: Create Budget Modal */}
        {showCreateBudgetModal && typeof document !== 'undefined' && createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowCreateBudgetModal(false);
            }}
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Project Budget</h3>
                  <p className="text-xs text-slate-500">Add structured category line items to be submitted for approval</p>
                </div>
                <button
                  onClick={() => setShowCreateBudgetModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateBudgetSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Project *
                  </label>
                  <select
                    value={newBudget.projectId}
                    onChange={(e) => setNewBudget((prev) => ({ ...prev, projectId: e.target.value }))}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="">-- Choose Project --</option>
                    {projectsList.map((p) => (
                      <option key={p.id || p._id} value={p.id || p._id}>
                        {p.projectCode} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Budget Categories & Items
                    </label>
                    <button
                      type="button"
                      onClick={handleAddBudgetItem}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Category Item
                    </button>
                  </div>

                  {newBudget.items.map((item, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2 border border-slate-200 dark:border-slate-700">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Category (e.g. Infrastructure, Software, Personnel)"
                          value={item.category}
                          onChange={(e) => handleBudgetItemChange(idx, 'category', e.target.value)}
                          required
                          className="flex-1 px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                        />
                        <input
                          type="number"
                          placeholder="Planned Amount (INR)"
                          value={item.plannedAmount || ''}
                          onChange={(e) => handleBudgetItemChange(idx, 'plannedAmount', e.target.value)}
                          required
                          min="0"
                          className="w-36 px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-right font-medium"
                        />
                        {newBudget.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveBudgetItem(idx)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="Description / Remarks (Optional)"
                        value={item.description}
                        onChange={(e) => handleBudgetItemChange(idx, 'description', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300"
                      />
                    </div>
                  ))}

                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl flex justify-between items-center text-xs font-bold text-indigo-900 dark:text-indigo-200">
                    <span>Total Planned Budget:</span>
                    <span>{formatINR(newBudget.items.reduce((sum, i) => sum + Number(i.plannedAmount || 0), 0))}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Notes / Justification
                  </label>
                  <textarea
                    rows="2"
                    value={newBudget.notes}
                    onChange={(e) => setNewBudget((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Provide any planning context or milestone assumptions..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateBudgetModal(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingBudget}
                    className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                  >
                    {savingBudget ? 'Saving...' : 'Save as Draft'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

        {/* MODAL 2: View Budget Items Modal */}
        {viewingBudget && typeof document !== 'undefined' && createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setViewingBudget(null);
            }}
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {viewingBudget.budgetNumber}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      BUDGET_STATUS_COLORS[viewingBudget.status] || ''
                    }`}>
                      {viewingBudget.status}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {viewingBudget.projectId?.name || 'Project'} • Version {viewingBudget.version}
                  </p>
                </div>
                <button
                  onClick={() => setViewingBudget(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3 text-right">Planned Cap</th>
                        <th className="py-2.5 px-3 text-right">Approved Cap</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(viewingBudget.items || []).length === 0 ? (
                        <tr>
                          <td colSpan="4" className="py-4 text-center text-slate-500">No items specified</td>
                        </tr>
                      ) : (
                        viewingBudget.items.map((item, i) => (
                          <tr key={i}>
                            <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{item.category}</td>
                            <td className="py-2.5 px-3 text-slate-500">{item.description || '-'}</td>
                            <td className="py-2.5 px-3 text-right font-medium">{formatINR(item.plannedAmount)}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{formatINR(item.approvedAmount)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs">
                  <div>
                    <span className="text-slate-500">Total Planned: </span>
                    <strong className="text-slate-900 dark:text-white">{formatINR(viewingBudget.totalPlannedAmount)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Total Approved: </span>
                    <strong className="text-emerald-600 dark:text-emerald-400">{formatINR(viewingBudget.totalApprovedAmount)}</strong>
                  </div>
                </div>

                {viewingBudget.notes && (
                  <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg">
                    <strong>Notes:</strong> {viewingBudget.notes}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* MODAL 3: Link Transaction to Project Modal */}
        {linkingTx && typeof document !== 'undefined' && createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setLinkingTx(null);
            }}
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-indigo-500" />
                  Link Transaction to Project
                </h3>
                <button onClick={() => setLinkingTx(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1 text-xs">
                <div><span className="text-slate-500">Reference:</span> <strong>{linkingTx.reference}</strong></div>
                <div><span className="text-slate-500">Party:</span> <strong>{linkingTx.party}</strong></div>
                <div><span className="text-slate-500">Amount:</span> <strong>{formatINR(linkingTx.amount)}</strong></div>
              </div>

              <form onSubmit={handleLinkTransaction} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Target Project *
                  </label>
                  <select
                    value={targetProjectId}
                    onChange={(e) => setTargetProjectId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="">-- Choose Project --</option>
                    {projectsList.map((p) => (
                      <option key={p.id || p._id} value={p.id || p._id}>
                        {p.projectCode} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setLinkingTx(null)}
                    className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={linkingLoading}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                  >
                    {linkingLoading ? 'Linking...' : 'Confirm Link'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

        {/* MODAL 4: Project Financial Deep-dive Modal */}
        {selectedProjectDetail && typeof document !== 'undefined' && createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedProjectDetail(null);
            }}
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {selectedProjectDetail.project?.name}
                    </h3>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {selectedProjectDetail.project?.projectCode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Client: {selectedProjectDetail.project?.clientName || 'N/A'} • Status: {selectedProjectDetail.project?.status}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedProjectDetail(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Subtabs */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 gap-4 text-xs font-medium bg-slate-50/50 dark:bg-slate-800/30">
                {[
                  { id: 'overview', label: 'Financial Overview' },
                  { id: 'budget', label: `Budgets (${selectedProjectDetail.budgets?.length || 0})` },
                  { id: 'purchases', label: `Purchases (${selectedProjectDetail.purchases?.length || 0})` },
                  { id: 'expenses', label: `Expenses (${selectedProjectDetail.expenses?.length || 0})` },
                  { id: 'payments', label: `Client Payments (${selectedProjectDetail.payments?.length || 0})` },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setDetailModalTab(st.id)}
                    className={`py-2.5 border-b-2 transition-colors ${
                      detailModalTab === st.id
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                {detailModalTab === 'overview' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                        <span className="text-[11px] text-slate-500">Contract Value</span>
                        <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                          {formatINR(selectedProjectDetail.summary?.contractValue)}
                        </div>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                        <span className="text-[11px] text-slate-500">Approved Budget</span>
                        <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                          {formatINR(selectedProjectDetail.summary?.approvedBudget)}
                        </div>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                        <span className="text-[11px] text-slate-500">Actual Costs</span>
                        <div className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-1">
                          {formatINR(selectedProjectDetail.summary?.actualCosts)}
                        </div>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                        <span className="text-[11px] text-slate-500">Open Commitments</span>
                        <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                          {formatINR(selectedProjectDetail.summary?.openCommitments)}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Remaining Available Budget Cap:
                        </span>
                        <div className="text-xl font-bold text-indigo-950 dark:text-indigo-200 mt-0.5">
                          {formatINR(selectedProjectDetail.summary?.availableBudget)}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500">Budget Utilization</span>
                        <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                          {selectedProjectDetail.summary?.utilization}%
                        </div>
                      </div>
                    </div>

                    {/* Category Breakdown */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Expenditure Breakdown by Category
                      </h4>
                      <div className="space-y-1.5">
                        {(selectedProjectDetail.spendingByCategory || []).length === 0 ? (
                          <p className="text-xs text-slate-500">No project expenses recorded yet</p>
                        ) : (
                          selectedProjectDetail.spendingByCategory.map((c) => (
                            <div key={c.category} className="flex justify-between items-center text-xs p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                              <span className="font-medium text-slate-800 dark:text-slate-200">{c.category}</span>
                              <div className="text-right">
                                <span className="font-bold text-slate-900 dark:text-white">{formatINR(c.amount)}</span>
                                <span className="text-[11px] text-slate-400 ml-2">({c.percentage}%)</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {detailModalTab === 'budget' && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Budget Versions & Revisions History
                    </h4>
                    {(selectedProjectDetail.budgets || []).map((b) => (
                      <div key={b.id || b._id} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-2 border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-mono font-bold text-slate-900 dark:text-white">{b.budgetNumber}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            BUDGET_STATUS_COLORS[b.status] || ''
                          }`}>
                            {b.status}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                          <span>Planned: <strong>{formatINR(b.totalPlannedAmount)}</strong></span>
                          <span>Approved: <strong className="text-emerald-600">{formatINR(b.totalApprovedAmount)}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {detailModalTab === 'purchases' && (
                  <div className="space-y-2">
                    {(selectedProjectDetail.purchases || []).length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-6">No purchases linked to this project</p>
                    ) : (
                      selectedProjectDetail.purchases.map((p) => (
                        <div key={p.id || p._id} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl flex justify-between items-center text-xs">
                          <div>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">{p.poNumber}</span>
                            <span className="block text-[11px] text-slate-500">{p.vendor} • {p.serviceName}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-900 dark:text-white">{formatINR(p.amount)}</span>
                            <span className="block text-[10px] text-slate-400">{p.status}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {detailModalTab === 'expenses' && (
                  <div className="space-y-2">
                    {(selectedProjectDetail.expenses || []).length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-6">No actual expenses linked to this project</p>
                    ) : (
                      selectedProjectDetail.expenses.map((e) => (
                        <div key={e.id || e._id} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl flex justify-between items-center text-xs">
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white">{e.category || 'General'}</span>
                            <span className="block text-[11px] text-slate-500">{e.paidTo || 'Direct'} • {formatDate(e.date)}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-amber-600 dark:text-amber-400">{formatINR(e.amount)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {detailModalTab === 'payments' && (
                  <div className="space-y-2">
                    {(selectedProjectDetail.payments || []).length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-6">No client payments linked to this project</p>
                    ) : (
                      selectedProjectDetail.payments.map((pm) => (
                        <div key={pm.id || pm._id} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl flex justify-between items-center text-xs">
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white">{pm.clientName || 'Client'}</span>
                            <span className="block text-[11px] text-slate-500">{formatDate(pm.date)} • Ref: {pm.referenceNumber || '-'}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatINR(pm.amount)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* PHASE 3 MODAL: Create / Edit Customer Invoice */}
        <CreateInvoiceModal
          isOpen={showCreateInvoiceModal}
          onClose={() => {
            setShowCreateInvoiceModal(false);
            setEditingInvoice(null);
          }}
          onSuccess={() => {
            fetchInvoices();
            if (activeTab === 'receivables') fetchReceivables();
          }}
          projectsList={projectsList}
          initialInvoice={editingInvoice}
        />

        {/* PHASE 3 MODAL: Invoice Details & PDF */}
        <InvoiceDetailModal
          isOpen={Boolean(viewingInvoice)}
          onClose={() => setViewingInvoice(null)}
          invoice={viewingInvoice}
          onRefresh={async () => {
            if (viewingInvoice?.id) {
              const res = await financeAPI.getInvoiceById(viewingInvoice.id);
              if (res.data?.success) setViewingInvoice(res.data.data);
            }
            fetchInvoices();
            if (activeTab === 'receivables') fetchReceivables();
          }}
          onOpenAllocate={(inv) => {
            setViewingInvoice(null);
            setInvoiceToAllocate(inv);
            setPaymentToAllocate(null);
            setShowAllocateModal(true);
          }}
        />

        {/* PHASE 3 MODAL: Payment Allocation */}
        <AllocatePaymentModal
          isOpen={showAllocateModal}
          onClose={() => {
            setShowAllocateModal(false);
            setPaymentToAllocate(null);
            setInvoiceToAllocate(null);
          }}
          onSuccess={() => {
            fetchInvoices();
            fetchReceivables();
          }}
          preselectedPayment={paymentToAllocate}
          preselectedInvoice={invoiceToAllocate}
        />
      </div>
    </Layout>
  );
};

export { AdminFinanceManagement as FinanceManagementView };
export default AdminFinanceManagement;
