import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Download,
  CheckCircle2,
  XCircle,
  CreditCard,
  DollarSign,
  AlertCircle,
  Calendar,
  Layers,
  Building2,
  FolderKanban,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { financeAPI } from '../../utils/api';

const formatINR = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

const formatDate = (val) => {
  if (!val) return '-';
  try {
    return new Date(val).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return val;
  }
};

const STATUS_BADGES = {
  draft: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400',
  issued: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-400',
  partially_paid: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:text-purple-400',
  paid: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400',
  cancelled: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400',
};

const CustomerInvoicesTab = ({
  invoices = [],
  projectsList = [],
  loading = false,
  onRefresh,
  onOpenCreateModal,
  onViewInvoice,
  onOpenAllocate,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  // Filtering
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
      if (projectFilter && inv.projectId !== projectFilter) return false;
      if (search) {
        const query = search.toLowerCase();
        const numMatch = (inv.invoiceNumber || '').toLowerCase().includes(query);
        const clientMatch = (
          inv.client?.company_name ||
          inv.client?.name ||
          ''
        ).toLowerCase().includes(query);
        const projMatch = (inv.project?.name || '').toLowerCase().includes(query);
        const milestoneMatch = (inv.milestoneName || '').toLowerCase().includes(query);
        if (!numMatch && !clientMatch && !projMatch && !milestoneMatch) return false;
      }
      return true;
    });
  }, [invoices, statusFilter, projectFilter, search]);

  // Counts
  const stats = useMemo(() => {
    const total = invoices.length;
    const draft = invoices.filter((i) => i.status === 'draft').length;
    const issued = invoices.filter((i) => i.status === 'issued').length;
    const partiallyPaid = invoices.filter((i) => i.status === 'partially_paid').length;
    const paid = invoices.filter((i) => i.status === 'paid').length;
    const cancelled = invoices.filter((i) => i.status === 'cancelled').length;

    const totalIssuedVal = invoices
      .filter((i) => ['issued', 'partially_paid', 'paid'].includes(i.status))
      .reduce((sum, i) => sum + Number(i.totalAmount || 0), 0);

    const totalOutstandingVal = invoices
      .filter((i) => ['issued', 'partially_paid'].includes(i.status))
      .reduce((sum, i) => sum + Number(i.outstandingAmount || 0), 0);

    return { total, draft, issued, partiallyPaid, paid, cancelled, totalIssuedVal, totalOutstandingVal };
  }, [invoices]);

  const handleDownloadPdf = async (inv) => {
    try {
      setDownloadingId(inv.id);
      const res = await financeAPI.downloadInvoicePdf(inv.id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice_${inv.invoiceNumber || inv.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Invoice PDF downloaded successfully');
    } catch (err) {
      toast.error('Failed to download invoice PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleIssueInvoice = async (inv) => {
    if (!window.confirm(`Issue invoice #${inv.invoiceNumber || inv.id}? This will assign an official number and make it payable.`)) {
      return;
    }
    try {
      const res = await financeAPI.issueInvoice(inv.id);
      if (res.data?.success) {
        toast.success(`Invoice issued as #${res.data.data?.invoiceNumber}`);
        onRefresh();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to issue invoice');
    }
  };

  return (
    <div className="space-y-5">
      {/* KPI Stats Top Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Invoices
          </span>
          <span className="text-xl font-bold text-slate-900 dark:text-white mt-0.5 block">
            {stats.total}
          </span>
        </div>
        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">
            Drafts
          </span>
          <span className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">
            {stats.draft}
          </span>
        </div>
        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block">
            Issued (Unpaid)
          </span>
          <span className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-0.5 block">
            {stats.issued}
          </span>
        </div>
        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wider block">
            Partially Paid
          </span>
          <span className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-0.5 block">
            {stats.partiallyPaid}
          </span>
        </div>
        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">
            Fully Paid
          </span>
          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
            {stats.paid}
          </span>
        </div>
        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">
            Outstanding Due
          </span>
          <span className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-1 block">
            {formatINR(stats.totalOutstandingVal)}
          </span>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by invoice #, client, project..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="issued">Issued</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Fully Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white max-w-[220px]"
          >
            <option value="">All Projects</option>
            {projectsList.map((p) => (
              <option key={p.id || p._id} value={p.id || p._id}>
                {p.projectCode} - {p.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-600/20 transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Create Invoice
        </button>
      </div>

      {/* Invoices Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <th className="py-3 px-4 font-semibold">Invoice #</th>
                <th className="py-3 px-4 font-semibold">Client & Project</th>
                <th className="py-3 px-4 font-semibold">Milestone</th>
                <th className="py-3 px-4 font-semibold">Issue Date / Due Date</th>
                <th className="py-3 px-4 font-semibold text-right">Total Amount</th>
                <th className="py-3 px-4 font-semibold text-right">Balance Due</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    Loading customer invoices...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    No customer invoices found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const clientName = inv.client?.company_name || inv.client?.name || 'Direct Client';
                  const projectName = inv.project?.name || 'General';
                  const isOverdue =
                    ['issued', 'partially_paid'].includes(inv.status) &&
                    Number(inv.outstandingAmount || 0) > 0 &&
                    inv.dueDate < today;

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 dark:text-white block">
                          {inv.invoiceNumber || 'DRAFT'}
                        </span>
                        <span className="text-[10px] text-slate-400">ID: {inv.id.slice(0, 8)}...</span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 dark:text-white block">
                          {clientName}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {inv.project?.projectCode ? `[${inv.project.projectCode}] ` : ''}
                          {projectName}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {inv.milestoneName ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {inv.milestoneName}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-slate-700 dark:text-slate-300 block">
                          {formatDate(inv.invoiceDate)}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] text-slate-500">
                            Due: {formatDate(inv.dueDate)}
                          </span>
                          {isOverdue && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
                              OVERDUE
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {formatINR(inv.totalAmount)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Tax: {formatINR(inv.taxAmount)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-bold block ${
                            Number(inv.outstandingAmount || 0) > 0
                              ? isOverdue
                                ? 'text-rose-600'
                                : 'text-slate-900 dark:text-white'
                              : 'text-emerald-600'
                          }`}
                        >
                          {formatINR(inv.outstandingAmount)}
                        </span>
                        {Number(inv.paidAmount || 0) > 0 && (
                          <span className="text-[10px] text-emerald-600">
                            Paid: {formatINR(inv.paidAmount)}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                            STATUS_BADGES[inv.status] || ''
                          }`}
                        >
                          {inv.status.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => onViewInvoice(inv)}
                            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                            title="View Invoice Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDownloadPdf(inv)}
                            disabled={downloadingId === inv.id}
                            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                            title="Download PDF"
                          >
                            <Download className={`w-3.5 h-3.5 ${downloadingId === inv.id ? 'animate-bounce' : ''}`} />
                          </button>

                          {inv.status === 'draft' && (
                            <button
                              onClick={() => handleIssueInvoice(inv)}
                              className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded transition-colors"
                              title="Issue Invoice"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {['issued', 'partially_paid'].includes(inv.status) && (
                            <button
                              onClick={() => onOpenAllocate(inv)}
                              className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded transition-colors"
                              title="Allocate Incoming Payment"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>
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
    </div>
  );
};

export default CustomerInvoicesTab;
