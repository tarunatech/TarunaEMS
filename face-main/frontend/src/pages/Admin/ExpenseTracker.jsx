import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/Admin/layout/AdminLayout';
import { expenseTrackerAPI, leadAPI, projectAPI } from '../../utils/api';
import { RefreshCw, Trash2, Edit3, Eye, Plus, Users, UserPlus, X, List, ArrowDownLeft, ArrowUpRight, TrendingUp, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import io from 'socket.io-client';
import SearchWithSuggestions from '../../components/Common/SearchWithSuggestions';

const paymentMethods = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Other'];
const expenseCategories = ['Office Supplies', 'Food', 'Travel', 'Utilities', 'Salary', 'Marketing', 'Maintenance', 'Software', 'Miscellaneous'];

const emptyExpense = {
  type: 'expense',
  date: new Date().toISOString().slice(0, 10),
  paidTo: '',
  category: '',
  amount: '',
  paymentMethod: '',
  description: '',
  referenceNumber: '',
  remarks: ''
};

const emptyPayment = {
  type: 'payment',
  date: new Date().toISOString().slice(0, 10),
  clientName: '',
  leadId: null,
  projectId: null,
  amount: '',
  paymentMethod: '',
  referenceNumber: '',
  invoiceNumber: '',
  remarks: ''
};

const ExpenseTracker = ({ Layout = AdminLayout }) => {
  const [activeView, setActiveView] = useState('dashboard');
  const [dashboardFilter, setDashboardFilter] = useState('all'); // 'all' | 'payment' | 'expense'
  const [summary, setSummary] = useState({ totalReceived: 0, totalSpent: 0, remainingBalance: 0 });
  const [allTransactions, setAllTransactions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [filters, setFilters] = useState({ startDate: '', endDate: '' });
  const [expenseForm, setExpenseForm] = useState(emptyExpense);
  const [paymentForm, setPaymentForm] = useState(emptyPayment);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);

  // Clients from Leads for Incoming Payments
  const [leads, setLeads] = useState([]);
  const [bdeEmployees, setBdeEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [isCustomClient, setIsCustomClient] = useState(false);
  const [creatingClient, setCreatingClient] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    firstName: '',
    lastName: '',
    company: '',
    phone: '',
    email: '',
    source: 'Referral',
  });

  const currency = (value) => Number(value || 0).toLocaleString('en-IN');
  const displayDate = (value) => value ? new Date(value).toLocaleDateString('en-IN') : '-';

  const fetchLeads = useCallback(async () => {
    try {
      const [leadsRes, bdeRes, projectsRes] = await Promise.all([
        leadAPI.getLeads({ includeAll: true, limit: 1000 }).catch(() => ({ data: { success: false } })),
        leadAPI.getBDEEmployees().catch(() => ({ data: { success: false } })),
        projectAPI.getProjects({ limit: 1000 }).catch(() => ({ data: { success: false } }))
      ]);
      if (leadsRes.data?.success) {
        setLeads(leadsRes.data.data?.leads || leadsRes.data.leads || []);
      }
      if (bdeRes.data?.success) {
        setBdeEmployees(bdeRes.data.data || []);
      }
      if (projectsRes.data?.success) {
        setProjects(projectsRes.data.data?.projects || projectsRes.data.projects || []);
      }
    } catch (err) {
      console.warn('Failed to load leads for client dropdown:', err);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const clientOptions = useMemo(() => {
    const list = [];
    const seen = new Set();

    const projectByLeadId = {};
    const projectByClientName = {};
    (projects || []).forEach((prj) => {
      const pid = prj._id || prj.id;
      if (prj.leadId) {
        const lid = typeof prj.leadId === 'object' ? (prj.leadId._id || prj.leadId.id) : prj.leadId;
        if (lid) projectByLeadId[String(lid)] = pid;
      }
      if (prj.clientName) {
        projectByClientName[String(prj.clientName).trim().toLowerCase()] = pid;
      }
      if (prj.name) {
        projectByClientName[String(prj.name).trim().toLowerCase()] = pid;
      }
    });

    (leads || []).forEach((lead) => {
      const company = lead.company?.trim();
      const personName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim();
      const primaryName = company || personName || lead.email;
      if (!primaryName || seen.has(primaryName.toLowerCase())) return;

      seen.add(primaryName.toLowerCase());
      const displayName = company && personName && company.toLowerCase() !== personName.toLowerCase()
        ? `${company} (${personName})`
        : primaryName;

      const leadIdStr = String(lead._id || lead.id);
      const matchedProjectId = projectByLeadId[leadIdStr] ||
        (company && projectByClientName[company.toLowerCase()]) ||
        (personName && projectByClientName[personName.toLowerCase()]) || null;

      list.push({
        id: lead._id || lead.id,
        name: primaryName,
        displayName,
        leadId: lead._id || lead.id,
        projectId: matchedProjectId,
        email: lead.email,
        phone: lead.phone,
        company,
      });
    });

    (payments || []).forEach((p) => {
      const name = p.clientName?.trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        const leadIdStr = p.leadId ? String(p.leadId) : null;
        const matchedProjectId = p.projectId ||
          (leadIdStr && projectByLeadId[leadIdStr]) ||
          projectByClientName[name.toLowerCase()] || null;

        list.push({
          id: p.leadId || name,
          name,
          displayName: name,
          leadId: p.leadId || null,
          projectId: matchedProjectId,
        });
      }
    });

    return list.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [leads, payments, projects]);

  const handleCreateClient = async (e) => {
    e.preventDefault();
    if (!newClientForm.firstName.trim() || !newClientForm.lastName.trim() || !newClientForm.email.trim() || !newClientForm.phone.trim()) {
      toast.error('First name, last name, email, and phone are required');
      return;
    }
    try {
      setCreatingClient(true);
      const assignedEmployee = bdeEmployees[0]?._id || bdeEmployees[0]?.id;
      const leadData = {
        firstName: newClientForm.firstName.trim(),
        lastName: newClientForm.lastName.trim(),
        company: newClientForm.company.trim(),
        email: newClientForm.email.trim().toLowerCase(),
        phone: newClientForm.phone.trim(),
        source: newClientForm.source || 'Referral',
        status: 'Contacted',
        priority: 'Medium',
        ...(assignedEmployee ? { assignedTo: assignedEmployee } : {})
      };
      const res = await leadAPI.createLead(leadData);
      if (res.data?.success) {
        const created = res.data.data?.lead || res.data.data || res.data.lead;
        const companyName = created?.company?.trim();
        const personName = `${created?.firstName || ''} ${created?.lastName || ''}`.trim();
        const clientName = companyName || personName || created?.email;

        setLeads((prev) => [created, ...prev]);
        setPaymentForm((prev) => ({
          ...prev,
          clientName,
          leadId: created?._id || created?.id,
        }));
        setIsCustomClient(false);
        setShowAddClientModal(false);
        setNewClientForm({
          firstName: '',
          lastName: '',
          company: '',
          phone: '',
          email: '',
          source: 'Referral',
        });
        toast.success(`Client "${clientName}" added successfully!`);
      }
    } catch (err) {
      console.error('Failed to create client:', err);
      toast.error(err.response?.data?.errors?.[0]?.msg || err.response?.data?.message || 'Failed to add client');
    } finally {
      setCreatingClient(false);
    }
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [summaryRes, transactionsRes] = await Promise.all([
        expenseTrackerAPI.getSummary(),
        expenseTrackerAPI.getTransactions()
      ]);
      const txs = transactionsRes.data?.data || [];
      const exp = txs.filter((t) => t.type === 'expense');
      const pay = txs.filter((t) => t.type === 'payment');
      setSummary(summaryRes.data?.data || {});
      setAllTransactions(txs);
      setExpenses(exp);
      setPayments(pay);
    } catch (error) {
      console.error('Failed to load expense tracker data:', error);
      toast.error('Failed to load expense tracker data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin.replace(/:\d+$/, ':5000');
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: { token: localStorage.getItem('token') }
    });

    socket.on('expense-tracker:updated', loadData);
    socket.on('finance:updated', loadData);
    return () => socket.disconnect();
  }, [loadData]);

  const displayedDashboardTransactions = useMemo(() => {
    let list = allTransactions;
    if (dashboardFilter === 'expense') {
      list = expenses;
    } else if (dashboardFilter === 'payment') {
      list = payments;
    }
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter((item) => {
      const empName = item.employee
        ? `${item.employee.personalInfo?.firstName || ''} ${item.employee.personalInfo?.lastName || ''}`.trim()
        : '';
      return [
        item.clientName,
        item.paidTo,
        item.category,
        item.paymentMethod,
        item.description,
        item.referenceNumber,
        item.invoiceNumber,
        item.remarks,
        empName,
        item.createdBy?.name
      ].filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
    });
  }, [allTransactions, expenses, payments, dashboardFilter, search]);

  const filteredPayments = useMemo(() => {
    const term = paymentSearch.trim().toLowerCase();
    return payments.filter((item) => {
      const matchesSearch = !term || [item.clientName, item.paymentMethod, item.invoiceNumber, item.referenceNumber, item.remarks]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term));
      const date = item.date ? new Date(item.date) : null;
      const startsAfter = !filters.startDate || (date && date >= new Date(filters.startDate));
      const endsBefore = !filters.endDate || (date && date <= new Date(`${filters.endDate}T23:59:59`));
      return matchesSearch && startsAfter && endsBefore;
    });
  }, [payments, paymentSearch, filters]);

  const saveTransaction = async (form, resetForm, nextView) => {
    try {
      setSaving(true);
      const payload = { ...form, amount: Number(form.amount) };
      if (!payload.leadId) {
        delete payload.leadId;
      }
      if (!payload.projectId) {
        delete payload.projectId;
      }
      if (editing) {
        await expenseTrackerAPI.updateTransaction(editing._id, payload);
        toast.success('Record updated successfully');
      } else {
        await expenseTrackerAPI.createTransaction(payload);
        toast.success(form.type === 'expense' ? 'Expense saved successfully' : 'Incoming payment saved successfully');
      }
      resetForm();
      setEditing(null);
      setIsCustomClient(false);
      setActiveView(nextView);
      loadData();
    } catch (error) {
      console.error('Save transaction failed:', error);
      toast.error(error.response?.data?.errors?.[0]?.msg || error.response?.data?.message || 'Failed to save record');
    } finally {
      setSaving(false);
    }
  };

  const deleteTransaction = async (id) => {
    if (!window.confirm('Delete this record permanently?')) return;
    try {
      await expenseTrackerAPI.deleteTransaction(id);
      toast.success('Record deleted');
      loadData();
    } catch (error) {
      console.error('Delete transaction failed:', error);
      toast.error('Failed to delete record');
    }
  };

  const startEdit = (item) => {
    setEditing(item);
    if (item.type === 'expense') {
      setExpenseForm({
        type: 'expense',
        date: item.date?.slice(0, 10),
        paidTo: item.paidTo || '',
        category: item.category || '',
        amount: item.amount || '',
        paymentMethod: item.paymentMethod || '',
        description: item.description || '',
        referenceNumber: item.referenceNumber || '',
        remarks: item.remarks || ''
      });
      setActiveView('add-expense');
    } else {
      const itemLeadId = item.leadId?._id || item.leadId?.id || item.leadId || null;
      const itemProjectId = item.projectId?._id || item.projectId?.id || item.projectId || null;
      setPaymentForm({
        type: 'payment',
        date: item.date?.slice(0, 10),
        clientName: item.clientName || '',
        leadId: itemLeadId,
        projectId: itemProjectId,
        amount: item.amount || '',
        paymentMethod: item.paymentMethod || '',
        referenceNumber: item.referenceNumber || '',
        invoiceNumber: item.invoiceNumber || '',
        remarks: item.remarks || ''
      });
      setIsCustomClient(false);
      setActiveView('add-payment');
    }
  };

  const openExpenseForm = () => {
    setEditing(null);
    setExpenseForm(emptyExpense);
    setActiveView('add-expense');
  };

  const openPaymentForm = () => {
    setEditing(null);
    setPaymentForm(emptyPayment);
    setIsCustomClient(false);
    setActiveView('add-payment');
  };

  return (
    <Layout>
      <div className="admin-page-shell w-full min-h-[calc(100vh-7rem)] space-y-3 sm:space-y-4">
        <div className="flex flex-col gap-2 sm:gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            {/* <p className="text-xs font-bold uppercase tracking-[0.32em] text-blue-600">Admin Only</p> */}
            <h1 className="premium-page-title mt-1 text-lg font-bold sm:text-xl md:text-2xl">Expense Tracker</h1>
            <p className="mt-0.5 text-xs text-slate-500">Manage company spending and incoming client payments.</p>
          </div>
          {/* <div className="flex flex-wrap gap-2">
            <button onClick={openExpenseForm} className="premium-primary-button inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold">
              Add Expense
            </button>
            <button onClick={openPaymentForm} className="rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-50">
              Add Payment
            </button>
          </div> */}
        </div>

        <nav className="premium-panel grid w-full grid-cols-2 gap-1.5 rounded-xl p-1.5 sm:flex sm:flex-wrap">
          <TabButton active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')}>Dashboard</TabButton>
          <TabButton active={activeView === 'payments'} onClick={() => setActiveView('payments')}>Payments</TabButton>
          <TabButton active={activeView === 'add-expense'} onClick={openExpenseForm}>Add Expense</TabButton>
          <TabButton active={activeView === 'add-payment'} onClick={openPaymentForm}>Add Payment</TabButton>
        </nav>

        <section>
            {activeView === 'dashboard' && (
              <DashboardView
                summary={summary}
                transactions={displayedDashboardTransactions}
                allTransactions={allTransactions}
                expensesCount={expenses.length}
                paymentsCount={payments.length}
                dashboardFilter={dashboardFilter}
                setDashboardFilter={setDashboardFilter}
                search={search}
                setSearch={setSearch}
                loading={loading}
                currency={currency}
                displayDate={displayDate}
                openExpenseForm={openExpenseForm}
                openPaymentForm={openPaymentForm}
                onRefresh={loadData}
                onView={setViewing}
                onEdit={startEdit}
                onDelete={deleteTransaction}
              />
            )}
            {activeView === 'payments' && (
              <PaymentsView
                payments={filteredPayments}
                filters={filters}
                setFilters={setFilters}
                paymentSearch={paymentSearch}
                setPaymentSearch={setPaymentSearch}
                loading={loading}
                currency={currency}
                displayDate={displayDate}
                openPaymentForm={openPaymentForm}
                onRefresh={loadData}
                onView={setViewing}
                onEdit={startEdit}
                onDelete={deleteTransaction}
              />
            )}
            {activeView === 'add-expense' && (
              <ExpenseForm
                form={expenseForm}
                setForm={setExpenseForm}
                saving={saving}
                editing={editing?.type === 'expense'}
                onSubmit={(event) => {
                  event.preventDefault();
                  saveTransaction(expenseForm, () => setExpenseForm(emptyExpense), 'dashboard');
                }}
              />
            )}
            {activeView === 'add-payment' && (
              <PaymentForm
                form={paymentForm}
                setForm={setPaymentForm}
                saving={saving}
                editing={editing?.type === 'payment'}
                clientOptions={clientOptions}
                onOpenAddClientModal={() => setShowAddClientModal(true)}
                isCustomClient={isCustomClient}
                setIsCustomClient={setIsCustomClient}
                onSubmit={(event) => {
                  event.preventDefault();
                  saveTransaction(paymentForm, () => setPaymentForm(emptyPayment), 'payments');
                }}
              />
            )}
        </section>

        {viewing && (
          <div className="fixed inset-0 z-[9999] flex items-start sm:items-center justify-center p-2.5 pt-14 sm:p-4">
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setViewing(null)} />
            <div className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 sm:p-4.5 shadow-xl">
              <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 pb-2.5 backdrop-blur mb-3">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${
                    viewing.type === 'payment'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  }`}>
                    {viewing.type === 'payment' ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
                      {viewing.type === 'payment' ? 'Incoming Payment Details' : 'Expense Details'}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {viewing.type === 'payment' ? 'Client Payment Record' : 'Company Spending Record'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewing(null)}
                  className="shrink-0 rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Amount Highlight Banner */}
              <div className={`rounded-lg p-2.5 mb-3 border ${
                viewing.type === 'payment'
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {viewing.type === 'payment' ? 'Amount Received' : 'Amount Spent'}
                  </span>
                  <span className={`text-lg sm:text-xl font-black ${
                    viewing.type === 'payment'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {viewing.type === 'payment' ? '+' : '-'} ₹{currency(viewing.amount)}
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 text-xs pr-1">
                <div className="grid grid-cols-2 gap-2">
                  <Info label="Date" value={displayDate(viewing.date)} />
                  <Info label="Payment Method" value={viewing.paymentMethod || '-'} />
                  {viewing.type === 'payment' ? (
                    <>
                      <Info label="Client Name" value={viewing.clientName || '-'} />
                      <Info label="Invoice Number" value={viewing.invoiceNumber || '-'} />
                    </>
                  ) : (
                    <>
                      <Info label="Paid To" value={viewing.paidTo || '-'} />
                      <Info label="Category" value={viewing.category || '-'} />
                    </>
                  )}
                  <Info label="Reference Number" value={viewing.referenceNumber || '-'} />
                  <Info
                    label="Recorded By"
                    value={
                      viewing.employee
                        ? `${viewing.employee.personalInfo?.firstName || ''} ${viewing.employee.personalInfo?.lastName || ''}`.trim() || viewing.createdBy?.name || 'Employee'
                        : viewing.source === 'admin' ? 'Admin' : viewing.createdBy?.name || '-'
                    }
                  />
                </div>
                {viewing.description && <Info label="Description" value={viewing.description} />}
                {viewing.remarks && <Info label="Remarks" value={viewing.remarks} />}
              </div>
            </div>
          </div>
        )}

        {/* Quick Add Client Modal */}
        {showAddClientModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
            <div
              className="fixed inset-0"
              onClick={() => !creatingClient && setShowAddClientModal(false)}
            />
            <div className="relative w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl p-4 sm:p-5 z-10 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                    <UserPlus className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Add New Client</h3>
                    <p className="text-[11px] text-slate-500">Create client in CRM and auto-select</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddClientModal(false)}
                  disabled={creatingClient}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreateClient} className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Company / Organization Name
                  </label>
                  <input
                    type="text"
                    value={newClientForm.company}
                    onChange={(e) => setNewClientForm(p => ({ ...p, company: e.target.value }))}
                    placeholder="e.g. Acme Technologies Ltd"
                    className="premium-input w-full rounded-lg px-3 py-1.5 text-xs text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newClientForm.firstName}
                      onChange={(e) => setNewClientForm(p => ({ ...p, firstName: e.target.value }))}
                      placeholder="e.g. Rahul"
                      className="premium-input w-full rounded-lg px-3 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Last Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newClientForm.lastName}
                      onChange={(e) => setNewClientForm(p => ({ ...p, lastName: e.target.value }))}
                      placeholder="e.g. Sharma"
                      className="premium-input w-full rounded-lg px-3 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={newClientForm.phone}
                      onChange={(e) => setNewClientForm(p => ({ ...p, phone: e.target.value }))}
                      placeholder="+91 9876543210"
                      className="premium-input w-full rounded-lg px-3 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={newClientForm.email}
                      onChange={(e) => setNewClientForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="client@example.com"
                      className="premium-input w-full rounded-lg px-3 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Lead Source
                  </label>
                  <select
                    value={newClientForm.source}
                    onChange={(e) => setNewClientForm(p => ({ ...p, source: e.target.value }))}
                    className="premium-input w-full rounded-lg px-3 py-1.5 text-xs text-slate-900 bg-white"
                  >
                    <option value="Referral">Referral</option>
                    <option value="Website">Website</option>
                    <option value="Direct">Direct</option>
                    <option value="Cold Call">Cold Call</option>
                    <option value="Trade Show">Trade Show</option>
                    <option value="Advertisement">Advertisement</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="pt-1.5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddClientModal(false)}
                    disabled={creatingClient}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingClient}
                    className="premium-primary-button px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {creatingClient ? 'Creating Client...' : 'Create & Select Client'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`min-h-9 rounded-lg px-3 py-1.5 text-center text-xs font-semibold transition sm:flex-1 sm:min-w-32 sm:px-3 sm:text-xs ${
      active
        ? 'bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white shadow-[0_6px_16px_rgba(37,99,235,0.2)]'
        : 'bg-white dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800/80 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-700 dark:hover:text-blue-400'
    }`}
  >
    {children}
  </button>
);

const SummaryCard = ({ label, value, type = 'default' }) => {
  let valueColor = 'text-slate-900 dark:text-white';
  let badgeColor = 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
  let Icon = DollarSign;

  if (type === 'received') {
    valueColor = 'text-emerald-600 dark:text-emerald-400';
    badgeColor = 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
    Icon = ArrowDownLeft;
  } else if (type === 'spent') {
    valueColor = 'text-rose-600 dark:text-rose-400';
    badgeColor = 'bg-rose-500/15 text-rose-600 dark:text-rose-400';
    Icon = ArrowUpRight;
  } else if (type === 'balance') {
    valueColor = 'text-blue-600 dark:text-blue-400';
    badgeColor = 'bg-blue-500/15 text-blue-600 dark:text-blue-400';
    Icon = TrendingUp;
  }

  return (
    <div className="premium-stat-card rounded-xl p-3 sm:p-3.5 relative overflow-hidden border border-slate-200/70 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <span className={`p-1 rounded-md ${badgeColor}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className={`mt-1.5 text-base sm:text-lg md:text-xl font-bold ${valueColor}`}>{value}</p>
    </div>
  );
};

const DashboardView = ({
  summary,
  transactions,
  allTransactions,
  expensesCount,
  paymentsCount,
  dashboardFilter,
  setDashboardFilter,
  search,
  setSearch,
  loading,
  currency,
  displayDate,
  openExpenseForm,
  openPaymentForm,
  onRefresh,
  onView,
  onEdit,
  onDelete
}) => (
  <div className="premium-panel rounded-xl p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4">
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div>
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
          Transactions & Spending
        </h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Track company expenses and incoming client payments in one place.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onRefresh}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-600 dark:text-slate-300 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          aria-label="Refresh"
          title="Refresh transactions"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={openExpenseForm}
          className="premium-primary-button inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-xs"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
          <span>Add Expense</span>
        </button>
        <button
          onClick={openPaymentForm}
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 shadow-xs transition"
        >
          <ArrowDownLeft className="h-3.5 w-3.5" />
          <span>Add Payment</span>
        </button>
      </div>
    </div>

    {/* Summary Stat Cards */}
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
      <SummaryCard label="Total Received" value={`₹${currency(summary.totalReceived)}`} type="received" />
      <SummaryCard label="Total Spent" value={`₹${currency(summary.totalSpent)}`} type="spent" />
      <SummaryCard label="Remaining Balance" value={`₹${currency(summary.remainingBalance)}`} type="balance" />
    </div>

    {/* Controls Bar: Filter Tabs + Search */}
    <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between pt-0.5">
      {/* Filter Tabs */}
      <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 p-0.5 border border-slate-200/60 dark:border-slate-700/60 self-start sm:self-auto overflow-x-auto max-w-full">
        <button
          type="button"
          onClick={() => setDashboardFilter('all')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition whitespace-nowrap ${
            dashboardFilter === 'all'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>All Transactions</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            dashboardFilter === 'all'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
              : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}>
            {allTransactions.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setDashboardFilter('payment')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition whitespace-nowrap ${
            dashboardFilter === 'payment'
              ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-300'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>Incoming Payments</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            dashboardFilter === 'payment'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
              : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}>
            {paymentsCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setDashboardFilter('expense')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition whitespace-nowrap ${
            dashboardFilter === 'expense'
              ? 'bg-white dark:bg-slate-700 text-rose-700 dark:text-rose-300 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-300'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          <span>Expenses</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            dashboardFilter === 'expense'
              ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
              : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}>
            {expensesCount}
          </span>
        </button>
      </div>

      {/* Search Input with Suggestions */}
      <div className="w-full lg:max-w-xs">
        <SearchWithSuggestions
          value={search}
          onChange={setSearch}
          items={allTransactions}
          getSuggestionValue={(item) => item.clientName || item.paidTo || item.description || item.category || ''}
          getSuggestionTitle={(item) => item.clientName || item.paidTo || (item.type === 'payment' ? 'Client Payment' : 'Expense')}
          getSuggestionSubtitle={(item) => [
            item.type === 'payment' ? 'Incoming Payment' : item.category || 'Expense',
            item.paymentMethod,
            item.invoiceNumber ? `Inv: ${item.invoiceNumber}` : null,
            item.referenceNumber ? `Ref: ${item.referenceNumber}` : null
          ].filter(Boolean).join(' • ')}
          placeholder="Search by client, vendor, category..."
          inputClassName="premium-input rounded-lg py-1.5 px-3 text-xs"
        />
      </div>
    </div>

    {/* Table / List */}
    <TransactionTable
      transactions={transactions}
      loading={loading}
      currency={currency}
      displayDate={displayDate}
      onView={onView}
      onEdit={onEdit}
      onDelete={onDelete}
      openExpenseForm={openExpenseForm}
      openPaymentForm={openPaymentForm}
      dashboardFilter={dashboardFilter}
    />
  </div>
);

const TransactionTable = ({
  transactions,
  loading,
  currency,
  displayDate,
  onView,
  onEdit,
  onDelete,
  openExpenseForm,
  openPaymentForm,
  dashboardFilter
}) => {
  const isInteractiveClick = (event) =>
    event.target.closest('button, a, input, select, textarea, label');

  const openDetails = (event, item) => {
    if (isInteractiveClick(event)) return;
    onView(item);
  };

  return (
    <div className="mt-1 sm:mt-2">
      {/* Mobile Card List */}
      <div className="space-y-2.5 md:hidden">
        {loading ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-center text-xs text-slate-500 dark:text-slate-400">
            Loading transactions...
          </div>
        ) : transactions.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {dashboardFilter === 'expense'
                ? 'No expenses found'
                : dashboardFilter === 'payment'
                  ? 'No incoming payments found'
                  : 'No transactions found'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {dashboardFilter === 'expense'
                ? 'No company expenses logged yet.'
                : dashboardFilter === 'payment'
                  ? 'No client payments logged yet.'
                  : 'Start adding expenses or payments.'}
            </p>
            <div className="mt-2.5 flex items-center justify-center gap-2">
              <button
                onClick={openExpenseForm}
                className="premium-primary-button rounded-lg px-2.5 py-1 text-xs font-semibold"
              >
                + Expense
              </button>
              <button
                onClick={openPaymentForm}
                className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 text-xs font-semibold"
              >
                + Payment
              </button>
            </div>
          </div>
        ) : (
          transactions.map((item) => (
            <div
              key={item._id || item.id}
              onClick={(event) => openDetails(event, item)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xs cursor-pointer hover:border-blue-300 dark:hover:border-blue-800/80 hover:bg-blue-50/20 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    {item.type === 'payment' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold">
                        <ArrowDownLeft className="h-2.5 w-2.5" /> Incoming
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 text-[10px] font-semibold">
                        <ArrowUpRight className="h-2.5 w-2.5" /> Expense
                      </span>
                    )}
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{displayDate(item.date)}</span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {item.type === 'payment' ? item.clientName : item.paidTo}
                  </p>
                </div>
                <p className={`text-xs sm:text-sm font-bold whitespace-nowrap ${
                  item.type === 'payment'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {item.type === 'payment' ? '+' : '-'} ₹{currency(item.amount)}
                </p>
              </div>

              <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
                {item.type === 'payment' ? (
                  <span className="rounded bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 font-medium text-blue-700 dark:text-blue-300">
                    Client Payment
                  </span>
                ) : (
                  item.category && (
                    <span className="rounded bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 font-medium text-blue-700 dark:text-blue-300">
                      {item.category}
                    </span>
                  )
                )}
                {item.paymentMethod && (
                  <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-medium text-slate-600 dark:text-slate-300">
                    {item.paymentMethod}
                  </span>
                )}
                {item.invoiceNumber && (
                  <span className="rounded bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 font-medium text-indigo-700 dark:text-indigo-300">
                    Inv #{item.invoiceNumber}
                  </span>
                )}
              </div>

              {(item.description || item.remarks) && (
                <p className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-400 line-clamp-1">
                  {item.description || item.remarks}
                </p>
              )}

              <div className="mt-2 flex gap-1.5 border-t border-slate-100 dark:border-slate-800 pt-2">
                <ActionButton onClick={() => onView(item)} icon={Eye}>View</ActionButton>
                <ActionButton onClick={() => onEdit(item)} icon={Edit3}>Edit</ActionButton>
                <ActionButton danger onClick={() => onDelete(item._id || item.id)} icon={Trash2}>Delete</ActionButton>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop / Tablet Table */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-slate-50/90 dark:bg-slate-800/80">
              <tr>
                {['Type', 'Date', 'Party / Name', 'Category / Details', 'Amount', 'Method', 'Reference / Remarks', 'Actions'].map((head) => (
                  <th
                    key={head}
                    className="border-b border-slate-200 dark:border-slate-800 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-3 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                    Loading transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-3 py-8 text-center">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {dashboardFilter === 'expense'
                        ? 'No expenses found'
                        : dashboardFilter === 'payment'
                          ? 'No incoming payments found'
                          : 'No transactions found'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                      {dashboardFilter === 'expense'
                        ? 'Record company expenses to track spending and keep financial balances updated.'
                        : dashboardFilter === 'payment'
                          ? 'Record incoming client payments to see received funds reflected here.'
                          : 'Start logging company spending and incoming client payments to track balances.'}
                    </p>
                    <div className="mt-3 flex items-center justify-center gap-2">
                      {(dashboardFilter === 'all' || dashboardFilter === 'expense') && (
                        <button
                          onClick={openExpenseForm}
                          className="premium-primary-button rounded-lg px-3 py-1.5 text-xs font-semibold"
                        >
                          + Add Expense
                        </button>
                      )}
                      {(dashboardFilter === 'all' || dashboardFilter === 'payment') && (
                        <button
                          onClick={openPaymentForm}
                          className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/60"
                        >
                          + Add Payment
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((item) => (
                  <tr
                    key={item._id || item.id}
                    onClick={(event) => openDetails(event, item)}
                    className="premium-table-row border-b border-slate-100 dark:border-slate-800/80 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    {/* Type Badge */}
                    <td className="px-3 py-2">
                      {item.type === 'payment' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap">
                          <ArrowDownLeft className="h-3 w-3" /> Incoming
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap">
                          <ArrowUpRight className="h-3 w-3" /> Expense
                        </span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-3 py-2 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {displayDate(item.date)}
                    </td>

                    {/* Party / Client / Paid To */}
                    <td className="px-3 py-2">
                      <div className="font-semibold text-slate-900 dark:text-white text-xs">
                        {item.type === 'payment' ? item.clientName : item.paidTo}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {item.employee
                          ? `${item.employee.personalInfo?.firstName || ''} ${item.employee.personalInfo?.lastName || ''}`.trim() || item.createdBy?.name || 'Employee'
                          : item.source === 'admin' ? 'Admin' : item.createdBy?.name || '-'}
                        {item.employee?.employeeId && ` · ${item.employee.employeeId}`}
                      </div>
                    </td>

                    {/* Category / Details */}
                    <td className="px-3 py-2">
                      {item.type === 'payment' ? (
                        <div>
                          <span className="inline-block rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 text-[10px] font-medium">
                            Client Payment
                          </span>
                          {item.invoiceNumber && (
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Inv: {item.invoiceNumber}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-block rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 text-[10px] font-medium">
                          {item.category || 'Expense'}
                        </span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`font-bold text-xs sm:text-sm ${
                        item.type === 'payment'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {item.type === 'payment' ? '+' : '-'} ₹{currency(item.amount)}
                      </span>
                    </td>

                    {/* Payment Method */}
                    <td className="px-3 py-2 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {item.paymentMethod || '-'}
                    </td>

                    {/* Reference / Remarks / Description */}
                    <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400 max-w-[180px]">
                      <span className="truncate block" title={item.description || item.remarks || item.referenceNumber || ''}>
                        {item.description || item.remarks || item.referenceNumber || '-'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <ActionButton onClick={() => onView(item)} icon={Eye}>View</ActionButton>
                        <ActionButton onClick={() => onEdit(item)} icon={Edit3}>Edit</ActionButton>
                        <ActionButton danger onClick={() => onDelete(item._id || item.id)} icon={Trash2}>Delete</ActionButton>
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
  );
};

const PaymentsView = ({ payments, filters, setFilters, paymentSearch, setPaymentSearch, loading, currency, displayDate, openPaymentForm, onRefresh, onView, onEdit, onDelete }) => (
  <div className="premium-panel rounded-xl p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4">
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div>
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Incoming Payments</h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Track client payments received by the admin team.</p>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onRefresh} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-600 dark:text-slate-300 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition" aria-label="Refresh">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        <button onClick={openPaymentForm} className="premium-primary-button inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-xs">
          <ArrowDownLeft className="h-3.5 w-3.5" />
          <span>Add Payment</span>
        </button>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
      <SearchWithSuggestions
        value={paymentSearch}
        onChange={setPaymentSearch}
        items={payments}
        getSuggestionValue={(item) => item.clientName || item.invoiceNumber || item.referenceNumber || ''}
        getSuggestionTitle={(item) => item.clientName || 'Payment'}
        getSuggestionSubtitle={(item) => [item.paymentMethod, item.invoiceNumber, item.referenceNumber].filter(Boolean).join(' • ')}
        placeholder="Search client name..."
        inputClassName="premium-input rounded-lg py-1.5 px-3 text-xs"
      />
      <input type="date" value={filters.startDate} onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))} className="premium-input rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white" />
      <input type="date" value={filters.endDate} onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))} className="premium-input rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white" />
      <button onClick={onRefresh} className="premium-primary-button rounded-lg px-3 py-1.5 text-xs font-semibold">Filter</button>
    </div>

    <div className="mt-1 sm:mt-2">
      {/* Mobile: card list */}
      <div className="space-y-2.5 md:hidden">
        {loading ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-center text-xs text-slate-500 dark:text-slate-400">Loading payments...</div>
        ) : payments.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-center text-xs text-slate-500 dark:text-slate-400">No incoming payments found</div>
        ) : payments.map((item) => (
          <div key={item._id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xs">
            <div className="flex items-start justify-between gap-2.5">
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-white">{item.clientName}</p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{displayDate(item.date)}</p>
              </div>
              <p className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">₹{currency(item.amount)}</p>
            </div>
            <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
              {item.paymentMethod && <span className="rounded bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 font-medium text-blue-700 dark:text-blue-300">{item.paymentMethod}</span>}
              {item.invoiceNumber && <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-medium text-slate-600 dark:text-slate-300">Inv: {item.invoiceNumber}</span>}
            </div>
            {item.remarks && <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">{item.remarks}</p>}
            <div className="mt-2 flex gap-1.5 border-t border-slate-100 dark:border-slate-800 pt-2">
              {onView && <ActionButton onClick={() => onView(item)} icon={Eye}>View</ActionButton>}
              <ActionButton onClick={() => onEdit(item)} icon={Edit3}>Edit</ActionButton>
              <ActionButton danger onClick={() => onDelete(item._id)} icon={Trash2}>Delete</ActionButton>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop / tablet: table */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-slate-50 dark:bg-slate-800/80">
              <tr>
                {['Date', 'Client', 'Amount', 'Method', 'Invoice', 'Remarks', 'Actions'].map((head) => (
                <th key={head} className="border-b border-slate-200 dark:border-slate-800 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {loading ? (
                <tr><td colSpan="7" className="px-3 py-6 text-center text-xs text-slate-500 dark:text-slate-400">Loading payments...</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan="7" className="px-3 py-6 text-center text-xs text-slate-500 dark:text-slate-400">No incoming payments found</td></tr>
              ) : payments.map((item) => (
                <tr key={item._id} className="premium-table-row border-b border-slate-100 dark:border-slate-800/80">
                  <td className="px-3 py-2 text-xs text-slate-800 dark:text-slate-200 whitespace-nowrap">{displayDate(item.date)}</td>
                  <td className="px-3 py-2 text-xs font-medium text-slate-800 dark:text-white">{item.clientName}</td>
                  <td className="px-3 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">₹{currency(item.amount)}</td>
                  <td className="px-3 py-2 text-xs text-slate-800 dark:text-slate-300 whitespace-nowrap">{item.paymentMethod}</td>
                  <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400">{item.invoiceNumber || '-'}</td>
                  <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400 max-w-[200px] truncate">{item.remarks || '-'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      {onView && <ActionButton onClick={() => onView(item)} icon={Eye}>View</ActionButton>}
                      <ActionButton onClick={() => onEdit(item)} icon={Edit3}>Edit</ActionButton>
                      <ActionButton danger onClick={() => onDelete(item._id)} icon={Trash2}>Delete</ActionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
);

const ExpenseForm = ({ form, setForm, saving, editing, onSubmit }) => (
  <FormPanel title={editing ? 'Edit Expense' : 'Add Expense'} subtitle="Keep the form simple and quick for daily admin use." onSubmit={onSubmit} buttonText={saving ? 'Saving...' : 'Save Expense'}>
    <Input label="Expense Date" type="date" value={form.date} onChange={(value) => setForm(prev => ({ ...prev, date: value }))} required />
    <Input label="Paid To" value={form.paidTo} onChange={(value) => setForm(prev => ({ ...prev, paidTo: value }))} required />
    <Select label="Category" value={form.category} onChange={(value) => setForm(prev => ({ ...prev, category: value }))} options={expenseCategories} placeholder="Select category" required />
    <Input label="Amount" type="number" value={form.amount} onChange={(value) => setForm(prev => ({ ...prev, amount: value }))} required />
    <Select label="Payment Method" value={form.paymentMethod} onChange={(value) => setForm(prev => ({ ...prev, paymentMethod: value }))} options={paymentMethods} placeholder="Select payment method" required />
    <TextArea label="Description / Purpose" value={form.description} onChange={(value) => setForm(prev => ({ ...prev, description: value }))} className="md:col-span-2" />
    <Input label="Reference Number" value={form.referenceNumber} onChange={(value) => setForm(prev => ({ ...prev, referenceNumber: value }))} />
    <Input label="Remarks" value={form.remarks} onChange={(value) => setForm(prev => ({ ...prev, remarks: value }))} />
  </FormPanel>
);

const ClientSelectWithAdd = ({
  value,
  leadId,
  onChange,
  clientOptions = [],
  onOpenAddClientModal,
  isCustomClient,
  setIsCustomClient,
  className = '',
  required = true,
}) => {
  const hasMatchedOption = clientOptions.some((c) => c.name === value);

  return (
    <div className={`block ${className}`}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="block text-xs font-bold text-slate-700">
          Client Name {required && <span className="text-rose-500">*</span>}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenAddClientModal}
            className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 shadow-2xs hover:bg-indigo-100 transition-colors"
            title="Add a new client to leads CRM and select"
          >
            <UserPlus className="h-3 w-3" />
            <span>+ Add New Client</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCustomClient(!isCustomClient)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            title={isCustomClient ? "Select from available leads" : "Type custom client name directly"}
          >
            {isCustomClient ? (
              <>
                <List className="h-3 w-3" />
                <span>Select from leads</span>
              </>
            ) : (
              <>
                <Edit3 className="h-3 w-3" />
                <span>Type custom</span>
              </>
            )}
          </button>
        </div>
      </div>

      {isCustomClient ? (
        <div className="space-y-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value, null)}
            placeholder="Type client name..."
            className="premium-input w-full rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400"
            required={required}
          />
          <p className="text-[10px] text-slate-500">
            Entering custom name. Click "Select from leads" above to pick an existing lead.
          </p>
        </div>
      ) : (
        <div className="relative">
          <select
            value={value}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '__ADD_NEW__') {
                onOpenAddClientModal();
                return;
              }
              if (val === '__CUSTOM__') {
                setIsCustomClient(true);
                return;
              }
              const selected = clientOptions.find((c) => c.name === val);
              onChange(val, selected?.leadId || null, selected?.projectId || null);
            }}
            className="premium-input w-full rounded-lg px-3 py-2 text-xs text-slate-900 bg-white"
            required={required}
          >
            <option value="">-- Select Client from Leads ({clientOptions.length} available) --</option>
            {value && !hasMatchedOption && (
              <option value={value}>
                {value} (Current)
              </option>
            )}
            {clientOptions.map((client) => (
              <option key={client.id || client.name} value={client.name}>
                {client.displayName}
              </option>
            ))}
            <optgroup label="Actions">
              <option value="__ADD_NEW__">+ Add New Client...</option>
              <option value="__CUSTOM__">✎ Type custom client name...</option>
            </optgroup>
          </select>
        </div>
      )}
    </div>
  );
};

const PaymentForm = ({
  form,
  setForm,
  saving,
  editing,
  clientOptions,
  onOpenAddClientModal,
  isCustomClient,
  setIsCustomClient,
  onSubmit,
}) => (
  <FormPanel
    title={editing ? 'Edit Incoming Payment' : 'Add Incoming Payment'}
    subtitle="Record client payments so the dashboard always reflects money received."
    onSubmit={onSubmit}
    buttonText={saving ? 'Saving...' : 'Save Incoming Payment'}
  >
    <Input
      label="Payment Date"
      type="date"
      value={form.date}
      onChange={(value) => setForm(prev => ({ ...prev, date: value }))}
      required
    />
    <ClientSelectWithAdd
      value={form.clientName}
      leadId={form.leadId}
      onChange={(name, leadId, projectId) => setForm(prev => ({
        ...prev,
        clientName: name,
        leadId,
        projectId: projectId || null
      }))}
      clientOptions={clientOptions}
      onOpenAddClientModal={onOpenAddClientModal}
      isCustomClient={isCustomClient}
      setIsCustomClient={setIsCustomClient}
      required
    />
    <Input
      label="Amount"
      type="number"
      value={form.amount}
      onChange={(value) => setForm(prev => ({ ...prev, amount: value }))}
      required
    />
    <Select
      label="Payment Method"
      value={form.paymentMethod}
      onChange={(value) => setForm(prev => ({ ...prev, paymentMethod: value }))}
      options={paymentMethods}
      placeholder="Select payment method"
      required
    />
    <Input
      label="Reference Number"
      value={form.referenceNumber}
      onChange={(value) => setForm(prev => ({ ...prev, referenceNumber: value }))}
    />
    <Input
      label="Invoice Number"
      value={form.invoiceNumber}
      onChange={(value) => setForm(prev => ({ ...prev, invoiceNumber: value }))}
    />
    <TextArea
      label="Remarks"
      value={form.remarks}
      onChange={(value) => setForm(prev => ({ ...prev, remarks: value }))}
      className="md:col-span-2"
    />
  </FormPanel>
);

const FormPanel = ({ title, subtitle, onSubmit, buttonText, children }) => (
  <form onSubmit={onSubmit} className="premium-panel rounded-xl p-3 sm:p-4 md:p-5">
    <h2 className="text-base sm:text-lg font-bold text-slate-900 sm:text-lg">{title}</h2>
    <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
    <div className="mt-3.5 grid grid-cols-1 gap-3 sm:mt-4 md:grid-cols-2">{children}</div>
    <div className="mt-4 flex justify-end">
      <button type="submit" className="premium-primary-button w-full rounded-lg px-4 py-2 text-xs font-semibold sm:w-auto">
        {buttonText}
      </button>
    </div>
  </form>
);

const Input = ({ label, value, onChange, className = '', ...props }) => (
  <label className={`block ${className}`}>
    <span className="mb-1 block text-xs font-bold text-slate-700">{label}</span>
    <input value={value} onChange={(event) => onChange(event.target.value)} className="premium-input w-full rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400" {...props} />
  </label>
);

const Select = ({ label, value, onChange, options, placeholder, className = '', ...props }) => (
  <label className={`block ${className}`}>
    <span className="mb-1 block text-xs font-bold text-slate-700">{label}</span>
    <select value={value} onChange={(event) => onChange(event.target.value)} className="premium-input w-full rounded-lg px-3 py-2 text-xs text-slate-900" {...props}>
      <option value="">{placeholder}</option>
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  </label>
);

const TextArea = ({ label, value, onChange, className = '', ...props }) => (
  <label className={`block ${className}`}>
    <span className="mb-1 block text-xs font-bold text-slate-700">{label}</span>
    <textarea value={value} onChange={(event) => onChange(event.target.value)} rows="3" className="premium-input w-full rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400" {...props} />
  </label>
);

const ActionButton = ({ children, onClick, icon: Icon, danger = false }) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition ${
      danger
        ? 'border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400'
    }`}
  >
    {React.createElement(Icon, { className: 'h-3 w-3' })}
    <span className="hidden sm:inline">{children}</span>
  </button>
);

const Info = ({ label, value }) => (
  <div className="flex flex-col gap-0.5 border-b border-slate-100 dark:border-slate-800 pb-1.5 sm:flex-row sm:justify-between sm:gap-2">
    <span className="font-medium text-slate-500 dark:text-slate-400 text-[11px] sm:text-xs">{label}</span>
    <span className="text-left font-semibold text-slate-900 dark:text-slate-100 sm:text-right text-xs">{value}</span>
  </div>
);

export { ExpenseTracker as ExpenseTrackerView };
export default ExpenseTracker;
