import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Building2,
  FolderKanban,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  Search,
} from 'lucide-react';
import toast from 'react-hot-toast';

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

const AccountsReceivableTab = ({
  receivablesData = null,
  unallocatedPayments = [],
  loading = false,
  onRefresh,
  onOpenAllocate,
}) => {
  const [subTab, setSubTab] = useState('clients'); // 'clients' | 'projects' | 'unallocated'
  const [search, setSearch] = useState('');

  const metrics = receivablesData?.metrics || {};
  const clientBreakdown = receivablesData?.clientBreakdown || [];
  const projectBreakdown = receivablesData?.projectBreakdown || [];

  const filteredClients = useMemo(() => {
    if (!search) return clientBreakdown;
    const q = search.toLowerCase();
    return clientBreakdown.filter((c) => (c.clientName || '').toLowerCase().includes(q));
  }, [clientBreakdown, search]);

  const filteredProjects = useMemo(() => {
    if (!search) return projectBreakdown;
    const q = search.toLowerCase();
    return projectBreakdown.filter(
      (p) =>
        (p.projectName || '').toLowerCase().includes(q) ||
        (p.projectCode || '').toLowerCase().includes(q)
    );
  }, [projectBreakdown, search]);

  const filteredUnallocated = useMemo(() => {
    if (!search) return unallocatedPayments;
    const q = search.toLowerCase();
    return unallocatedPayments.filter(
      (u) =>
        (u.clientName || '').toLowerCase().includes(q) ||
        (u.projectName || '').toLowerCase().includes(q) ||
        (u.reference || '').toLowerCase().includes(q)
    );
  }, [unallocatedPayments, search]);

  return (
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Issued Invoices */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Issued Invoices
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {formatINR(metrics.totalIssued)}
          </div>
          <p className="text-[11px] text-slate-500">
            Valid issued commercial billings excluding draft or cancelled invoices
          </p>
        </div>

        {/* Card 2: Allocated Receipts */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Allocated Receipts
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {formatINR(metrics.totalAllocated)}
          </div>
          <p className="text-[11px] text-slate-500">
            Recorded receipts reconciled directly against issued invoices
          </p>
        </div>

        {/* Card 3: Outstanding Receivables */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Outstanding Balance
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {formatINR(metrics.totalOutstanding)}
          </div>
          <div className="text-[11px] text-rose-600 font-medium">
            Overdue:{' '}
            <strong>
              {formatINR(metrics.overdueReceivables)} ({metrics.overdueCount || 0} overdue)
            </strong>
          </div>
        </div>

        {/* Card 4: Unallocated Receipts */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Unallocated Receipts
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
            {formatINR(metrics.totalUnallocatedReceipts)}
          </div>
          <p className="text-[11px] text-slate-500">
            Total recorded client payments not yet allocated to invoices
          </p>
        </div>
      </div>

      {/* Subtab Navigation & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          {[
            { id: 'clients', label: 'Client Aging & Summary', count: clientBreakdown.length },
            { id: 'projects', label: 'Project Aging & Summary', count: projectBreakdown.length },
            {
              id: 'unallocated',
              label: 'Unallocated Receipts',
              count: unallocatedPayments.length,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                subTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  subTab === tab.id
                    ? 'bg-indigo-700 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative min-w-[200px] max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search records..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* SUBTAB 1: CLIENT AGING */}
      {subTab === 'clients' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-3 px-4 font-semibold">Client Name</th>
                  <th className="py-3 px-4 font-semibold text-center">Invoices</th>
                  <th className="py-3 px-4 font-semibold text-right">Total Invoiced</th>
                  <th className="py-3 px-4 font-semibold text-right">Total Paid</th>
                  <th className="py-3 px-4 font-semibold text-right">Outstanding Due</th>
                  <th className="py-3 px-4 font-semibold text-right">Overdue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400">
                      No client receivables recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((c, idx) => (
                    <tr
                      key={c.clientId || idx}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                    >
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-500" />
                        {c.clientName}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">
                        {c.invoiceCount}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700 dark:text-slate-300">
                        {formatINR(c.totalInvoiced)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-emerald-600">
                        {formatINR(c.totalPaid)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                        {formatINR(c.totalOutstanding)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold">
                        {Number(c.overdueAmount || 0) > 0 ? (
                          <span className="text-rose-600 font-bold">{formatINR(c.overdueAmount)}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2: PROJECT AGING */}
      {subTab === 'projects' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-3 px-4 font-semibold">Project Name & Code</th>
                  <th className="py-3 px-4 font-semibold text-right">Contract Value</th>
                  <th className="py-3 px-4 font-semibold text-center">Invoices</th>
                  <th className="py-3 px-4 font-semibold text-right">Invoiced</th>
                  <th className="py-3 px-4 font-semibold text-right">Paid</th>
                  <th className="py-3 px-4 font-semibold text-right">Outstanding</th>
                  <th className="py-3 px-4 font-semibold text-right">Overdue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      No project receivables recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((p, idx) => (
                    <tr
                      key={p.projectId || idx}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <FolderKanban className="w-4 h-4 text-indigo-500" />
                          <div>
                            <span>{p.projectName}</span>
                            <span className="block font-mono text-[10px] text-slate-400">
                              {p.projectCode}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-600 dark:text-slate-400">
                        {formatINR(p.contractValue)}
                      </td>
                      <td className="py-3 px-4 text-center">{p.invoiceCount}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700 dark:text-slate-300">
                        {formatINR(p.totalInvoiced)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-emerald-600">
                        {formatINR(p.totalPaid)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                        {formatINR(p.totalOutstanding)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold">
                        {Number(p.overdueAmount || 0) > 0 ? (
                          <span className="text-rose-600">{formatINR(p.overdueAmount)}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: UNALLOCATED RECEIPTS */}
      {subTab === 'unallocated' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 border-b border-purple-100 dark:border-purple-900/30 flex justify-between items-center text-xs">
            <span className="text-purple-900 dark:text-purple-300 font-medium">
              These are recorded client payment receipts from Expense Tracker that have remaining unallocated funds.
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-3 px-4 font-semibold">Payment Date</th>
                  <th className="py-3 px-4 font-semibold">Client & Project</th>
                  <th className="py-3 px-4 font-semibold">Method & Reference</th>
                  <th className="py-3 px-4 font-semibold text-right">Total Receipt</th>
                  <th className="py-3 px-4 font-semibold text-right">Allocated</th>
                  <th className="py-3 px-4 font-semibold text-right">Available Unallocated</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUnallocated.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      All incoming client payments are fully reconciled and allocated!
                    </td>
                  </tr>
                ) : (
                  filteredUnallocated.map((u) => (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                        {formatDate(u.date)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 dark:text-white block">
                          {u.clientName || 'Direct Client'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {u.projectCode ? `[${u.projectCode}] ` : ''}
                          {u.projectName || 'General'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-800 dark:text-slate-200 font-medium block">
                          {u.paymentMethod || 'Wire / Bank'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Ref: {u.reference || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700 dark:text-slate-300">
                        {formatINR(u.amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-emerald-600">
                        {formatINR(u.allocatedAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-purple-600 dark:text-purple-400">
                        {formatINR(u.unallocatedAmount)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onOpenAllocate(u)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
                        >
                          <DollarSign className="w-3.5 h-3.5" /> Allocate
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsReceivableTab;
