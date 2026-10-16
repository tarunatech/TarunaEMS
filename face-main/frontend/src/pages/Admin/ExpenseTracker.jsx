import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/Admin/layout/AdminLayout';
import { expenseTrackerAPI, leadAPI, projectAPI } from '../../utils/api';
import { RefreshCw, Trash2, Edit3, Eye, Plus, Users, UserPlus, X, List } from 'lucide-react';
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
  const [summary, setSummary] = useState({ totalReceived: 0, totalSpent: 0, remainingBalance: 0 });
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
      const [summaryRes, expenseRes, paymentRes] = await Promise.all([
        expenseTrackerAPI.getSummary(),
        expenseTrackerAPI.getTransactions({ type: 'expense' }),
        expenseTrackerAPI.getTransactions({ type: 'payment' })
      ]);
      setSummary(summaryRes.data.data || {});
      setExpenses(expenseRes.data.data || []);
      setPayments(paymentRes.data.data || []);
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

  const filteredExpenses = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return expenses;
    return expenses.filter((item) =>
      [item.paidTo, item.category, item.paymentMethod, item.description, item.referenceNumber, item.remarks]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [expenses, search]);

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
      <div className="admin-page-shell w-full min-h-[calc(100vh-7rem)] space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            {/* <p className="text-xs font-bold uppercase tracking-[0.32em] text-blue-600">Admin Only</p> */}
            <h1 className="premium-page-title mt-2 text-xl font-bold sm:text-2xl md:text-3xl">Expense Tracker</h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">Manage company spending and incoming client payments.</p>
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

        <nav className="premium-panel grid w-full grid-cols-2 gap-2 rounded-2xl p-2 sm:flex sm:flex-wrap">
          <TabButton active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')}>Dashboard</TabButton>
          <TabButton active={activeView === 'payments'} onClick={() => setActiveView('payments')}>Payments</TabButton>
          <TabButton active={activeView === 'add-expense'} onClick={openExpenseForm}>Add Expense</TabButton>
          <TabButton active={activeView === 'add-payment'} onClick={openPaymentForm}>Add Payment</TabButton>
        </nav>

        <section>
            {activeView === 'dashboard' && (
              <DashboardView
                summary={summary}
                expenses={filteredExpenses}
                search={search}
                setSearch={setSearch}
                loading={loading}
                currency={currency}
                displayDate={displayDate}
                openExpenseForm={openExpenseForm}
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
            <div className="fixed inset-0 bg-slate-955/35 backdrop-blur-sm" onClick={() => setViewing(null)} />
            <div className="relative flex max-h-[42dvh] sm:max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-6 shadow-xl">
              <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-white/95 pb-2 backdrop-blur sm:border-b-0 sm:pb-3 mb-2.5 sm:mb-4">
                <h3 className="text-base font-bold text-slate-955 sm:text-xl">Expense Details</h3>
                <button onClick={() => setViewing(null)} className="shrink-0 rounded-lg px-2.5 py-1 text-xs sm:text-sm text-slate-500 hover:bg-slate-100">Close</button>
              </div>
              <div className="task-details-modal-scroll flex-1 overflow-y-auto overscroll-contain space-y-2 sm:space-y-3 text-xs sm:text-sm">
                <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm sm:grid-cols-2 sm:gap-3">
                  <Info label="Date" value={displayDate(viewing.date)} />
                  <Info label="Paid To" value={viewing.paidTo || '-'} />
                  <Info label="Category" value={viewing.category || '-'} />
                  <Info label="Amount" value={currency(viewing.amount)} />
                  <Info label="Payment Method" value={viewing.paymentMethod || '-'} />
                  <Info label="Reference Number" value={viewing.referenceNumber || '-'} />
                </div>
                <Info label="Description" value={viewing.description || '-'} />
                <Info label="Remarks" value={viewing.remarks || '-'} />
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
            <div className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 sm:p-6 z-10 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Add New Client</h3>
                    <p className="text-xs text-slate-500">Create client in CRM and auto-select</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddClientModal(false)}
                  disabled={creatingClient}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateClient} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Company / Organization Name
                  </label>
                  <input
                    type="text"
                    value={newClientForm.company}
                    onChange={(e) => setNewClientForm(p => ({ ...p, company: e.target.value }))}
                    placeholder="e.g. Acme Technologies Ltd"
                    className="premium-input w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newClientForm.firstName}
                      onChange={(e) => setNewClientForm(p => ({ ...p, firstName: e.target.value }))}
                      placeholder="e.g. Rahul"
                      className="premium-input w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Last Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newClientForm.lastName}
                      onChange={(e) => setNewClientForm(p => ({ ...p, lastName: e.target.value }))}
                      placeholder="e.g. Sharma"
                      className="premium-input w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={newClientForm.phone}
                      onChange={(e) => setNewClientForm(p => ({ ...p, phone: e.target.value }))}
                      placeholder="+91 9876543210"
                      className="premium-input w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={newClientForm.email}
                      onChange={(e) => setNewClientForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="client@example.com"
                      className="premium-input w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lead Source
                  </label>
                  <select
                    value={newClientForm.source}
                    onChange={(e) => setNewClientForm(p => ({ ...p, source: e.target.value }))}
                    className="premium-input w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-900 bg-white"
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

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowAddClientModal(false)}
                    disabled={creatingClient}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingClient}
                    className="premium-primary-button px-5 py-2.5 rounded-xl text-xs font-semibold text-white disabled:opacity-50"
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
    className={`min-h-11 rounded-xl px-3 py-2.5 text-center text-xs font-semibold transition sm:flex-1 sm:min-w-40 sm:px-4 sm:text-sm ${
      active
        ? 'bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white shadow-[0_10px_22px_rgba(37,99,235,0.22)]'
        : 'bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-700'
    }`}
  >
    {children}
  </button>
);

const SummaryCard = ({ label, value }) => (
  <div className="premium-stat-card rounded-2xl p-3 sm:p-4 md:p-5">
    <p className="text-xs text-slate-500 sm:text-sm">{label}</p>
    <p className="mt-2 text-lg font-bold text-slate-900 sm:mt-3 sm:text-2xl md:text-3xl">{value}</p>
  </div>
);

const DashboardView = ({ summary, expenses, search, setSearch, loading, currency, displayDate, openExpenseForm, onRefresh, onView, onEdit, onDelete }) => (
  <div className="premium-panel rounded-2xl p-3 sm:p-4 md:p-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900 sm:text-xl md:text-2xl">Expense List</h2>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">Search, filter, and manage company expenses.</p>
      </div>
      <div className="flex gap-2">
        <button onClick={onRefresh} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm hover:bg-slate-50 sm:p-3" aria-label="Refresh">
          <RefreshCw className="h-5 w-5" />
        </button>
        <button onClick={openExpenseForm} className="premium-primary-button flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold sm:flex-none sm:py-3">
          Add Expense
        </button>
      </div>
    </div>

    <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-6 sm:grid-cols-3 sm:gap-4">
      <SummaryCard label="Total Received" value={currency(summary.totalReceived)} />
      <SummaryCard label="Total Spent" value={currency(summary.totalSpent)} />
      <SummaryCard label="Remaining Balance" value={currency(summary.remainingBalance)} />
    </div>

    <SearchWithSuggestions
      value={search}
      onChange={setSearch}
      items={expenses}
      getSuggestionValue={(item) => item.paidTo || item.description || item.category || ''}
      getSuggestionTitle={(item) => item.paidTo || item.category || 'Expense'}
      getSuggestionSubtitle={(item) => [item.category, item.paymentMethod, item.description].filter(Boolean).join(' • ')}
      placeholder="Search expenses"
      className="mt-4 sm:mt-6"
      inputClassName="premium-input rounded-xl py-3 text-sm"
    />

    <ExpenseTable expenses={expenses} loading={loading} currency={currency} displayDate={displayDate} onView={onView} onEdit={onEdit} onDelete={onDelete} />
  </div>
);

const ExpenseTable = ({ expenses, loading, currency, displayDate, onView, onEdit, onDelete }) => {
  const isInteractiveClick = (event) =>
    event.target.closest('button, a, input, select, textarea, label');

  const openExpenseDetails = (event, item) => {
    if (isInteractiveClick(event)) return;
    onView(item);
  };

  return (
  <div className="mt-4 sm:mt-6">
    {/* Mobile: card list */}
    <div className="space-y-3 md:hidden">
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">Loading expenses...</div>
      ) : expenses.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">No expenses found</div>
      ) : expenses.map((item) => (
        <div key={item._id} onClick={(event) => openExpenseDetails(event, item)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm cursor-pointer hover:border-blue-200 hover:bg-blue-50/40 transition-colors">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{item.paidTo}</p>
              <p className="mt-0.5 text-xs text-slate-500">{displayDate(item.date)}</p>
            </div>
            <p className="text-base font-bold text-slate-950">₹{currency(item.amount)}</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
            {item.category && <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">{item.category}</span>}
            {item.paymentMethod && <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">{item.paymentMethod}</span>}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {item.employee
              ? `${item.employee.personalInfo?.firstName || ''} ${item.employee.personalInfo?.lastName || ''}`.trim() || item.createdBy?.name || 'Employee'
              : item.source === 'admin' ? 'Admin' : item.createdBy?.name || '-'}
            {item.employee?.employeeId && ` · ${item.employee.employeeId}`}
          </p>
          {item.description && <p className="mt-2 text-sm text-slate-600">{item.description}</p>}
          <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
            <ActionButton onClick={() => onView(item)} icon={Eye}>View</ActionButton>
            <ActionButton onClick={() => onEdit(item)} icon={Edit3}>Edit</ActionButton>
            <ActionButton danger onClick={() => onDelete(item._id)} icon={Trash2}>Delete</ActionButton>
          </div>
        </div>
      ))}
    </div>

    {/* Desktop / tablet: table */}
    <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white md:block">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px]">
          <thead className="bg-slate-50/90">
            <tr>
              {['Date', 'Employee', 'Paid To', 'Category', 'Amount', 'Payment Method', 'Description', 'Actions'].map((head) => (
                <th key={head} className="border-b border-slate-200 p-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" className="p-8 text-center text-slate-500">Loading expenses...</td></tr>
            ) : expenses.length === 0 ? (
              <tr><td colSpan="8" className="p-8 text-center text-slate-500">No expenses found</td></tr>
            ) : expenses.map((item) => (
              <tr key={item._id} onClick={(event) => openExpenseDetails(event, item)} className="premium-table-row border-b border-slate-100 cursor-pointer">
                <td className="p-4 text-slate-800">{displayDate(item.date)}</td>
                <td className="p-4 text-slate-800">
                  {item.employee
                    ? `${item.employee.personalInfo?.firstName || ''} ${item.employee.personalInfo?.lastName || ''}`.trim() || item.createdBy?.name || 'Employee'
                    : item.source === 'admin' ? 'Admin' : item.createdBy?.name || '-'}
                  {item.employee?.employeeId && <p className="text-xs text-slate-500">{item.employee.employeeId}</p>}
                </td>
                <td className="p-4 text-slate-800">{item.paidTo}</td>
                <td className="p-4 text-slate-800">{item.category}</td>
                <td className="p-4 font-semibold text-slate-950">{currency(item.amount)}</td>
                <td className="p-4 text-slate-800">{item.paymentMethod}</td>
                <td className="p-4 text-slate-600">{item.description || '-'}</td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <ActionButton onClick={() => onView(item)} icon={Eye}>View</ActionButton>
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
  );
};

const PaymentsView = ({ payments, filters, setFilters, paymentSearch, setPaymentSearch, loading, currency, displayDate, openPaymentForm, onRefresh, onEdit, onDelete }) => (
  <div className="premium-panel rounded-2xl p-3 sm:p-4 md:p-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900 sm:text-xl md:text-2xl">Incoming Payments</h2>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">Track client payments received by the admin team.</p>
      </div>
      <div className="flex gap-2">
        <button onClick={onRefresh} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm hover:bg-slate-50 sm:p-3" aria-label="Refresh">
          <RefreshCw className="h-5 w-5" />
        </button>
        <button onClick={openPaymentForm} className="premium-primary-button flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold sm:flex-none sm:py-3">
          Add Payment
        </button>
      </div>
    </div>

    <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-6 sm:grid-cols-2">
      <SearchWithSuggestions
        value={paymentSearch}
        onChange={setPaymentSearch}
        items={payments}
        getSuggestionValue={(item) => item.clientName || item.invoiceNumber || item.referenceNumber || ''}
        getSuggestionTitle={(item) => item.clientName || 'Payment'}
        getSuggestionSubtitle={(item) => [item.paymentMethod, item.invoiceNumber, item.referenceNumber].filter(Boolean).join(' • ')}
        placeholder="Search by client name"
        inputClassName="premium-input rounded-xl py-3 text-sm"
      />
      <input type="date" value={filters.startDate} onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))} className="premium-input rounded-xl px-4 py-3 text-sm text-slate-900" />
      <input type="date" value={filters.endDate} onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))} className="premium-input rounded-xl px-4 py-3 text-sm text-slate-900" />
      <button onClick={onRefresh} className="premium-primary-button rounded-xl px-4 py-3 text-sm font-semibold">Filter</button>
    </div>

    <div className="mt-4 sm:mt-6">
      {/* Mobile: card list */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">Loading payments...</div>
        ) : payments.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">No incoming payments found</div>
        ) : payments.map((item) => (
          <div key={item._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.clientName}</p>
                <p className="mt-0.5 text-xs text-slate-500">{displayDate(item.date)}</p>
              </div>
              <p className="text-base font-bold text-slate-950">₹{currency(item.amount)}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
              {item.paymentMethod && <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">{item.paymentMethod}</span>}
              {item.invoiceNumber && <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">Inv: {item.invoiceNumber}</span>}
            </div>
            {item.remarks && <p className="mt-2 text-sm text-slate-600">{item.remarks}</p>}
            <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
              <ActionButton onClick={() => onEdit(item)} icon={Edit3}>Edit</ActionButton>
              <ActionButton danger onClick={() => onDelete(item._id)} icon={Trash2}>Delete</ActionButton>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop / tablet: table */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-slate-50">
              <tr>
                {['Date', 'Client', 'Amount', 'Method', 'Invoice', 'Remarks', 'Actions'].map((head) => (
                <th key={head} className="border-b border-slate-200 p-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="p-8 text-center text-slate-500">Loading payments...</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-slate-500">No incoming payments found</td></tr>
              ) : payments.map((item) => (
                <tr key={item._id} className="premium-table-row border-b border-slate-100">
                  <td className="p-4 text-slate-800">{displayDate(item.date)}</td>
                  <td className="p-4 text-slate-800">{item.clientName}</td>
                  <td className="p-4 font-semibold text-slate-950">{currency(item.amount)}</td>
                  <td className="p-4 text-slate-800">{item.paymentMethod}</td>
                  <td className="p-4 text-slate-600">{item.invoiceNumber || '-'}</td>
                  <td className="p-4 text-slate-600">{item.remarks || '-'}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
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
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="block text-sm font-bold text-slate-700">
          Client Name {required && <span className="text-rose-500">*</span>}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenAddClientModal}
            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 shadow-xs hover:bg-indigo-100 transition-colors"
            title="Add a new client to leads CRM and select"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>+ Add New Client</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCustomClient(!isCustomClient)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            title={isCustomClient ? "Select from available leads" : "Type custom client name directly"}
          >
            {isCustomClient ? (
              <>
                <List className="h-3.5 w-3.5" />
                <span>Select from leads</span>
              </>
            ) : (
              <>
                <Edit3 className="h-3.5 w-3.5" />
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
            className="premium-input w-full rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400"
            required={required}
          />
          <p className="text-[11px] text-slate-500">
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
            className="premium-input w-full rounded-xl px-4 py-3 text-sm text-slate-900 bg-white"
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
  <form onSubmit={onSubmit} className="premium-panel rounded-2xl p-3 sm:p-4 md:p-6">
    <h2 className="text-lg font-bold text-slate-900 sm:text-xl md:text-2xl">{title}</h2>
    <p className="mt-1 text-xs text-slate-500 sm:text-sm">{subtitle}</p>
    <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-6 md:grid-cols-2">{children}</div>
    <div className="mt-6 flex justify-end">
      <button type="submit" className="premium-primary-button w-full rounded-xl px-5 py-3 text-sm font-semibold sm:w-auto">
        {buttonText}
      </button>
    </div>
  </form>
);

const Input = ({ label, value, onChange, className = '', ...props }) => (
  <label className={`block ${className}`}>
    <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
    <input value={value} onChange={(event) => onChange(event.target.value)} className="premium-input w-full rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400" {...props} />
  </label>
);

const Select = ({ label, value, onChange, options, placeholder, className = '', ...props }) => (
  <label className={`block ${className}`}>
    <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
    <select value={value} onChange={(event) => onChange(event.target.value)} className="premium-input w-full rounded-xl px-4 py-3 text-sm text-slate-900" {...props}>
      <option value="">{placeholder}</option>
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  </label>
);

const TextArea = ({ label, value, onChange, className = '', ...props }) => (
  <label className={`block ${className}`}>
    <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
    <textarea value={value} onChange={(event) => onChange(event.target.value)} rows="4" className="premium-input w-full rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400" {...props} />
  </label>
);

const ActionButton = ({ children, onClick, icon: Icon, danger = false }) => (
  <button onClick={onClick} className={`inline-flex flex-1 items-center justify-center gap-1 rounded-lg border px-2.5 py-2 text-xs font-semibold sm:flex-none sm:px-3 ${danger ? 'border-red-100 text-red-600 hover:bg-red-50' : 'border-blue-100 text-blue-600 hover:bg-blue-50'}`}>
    {React.createElement(Icon, { className: 'h-4 w-4' })}
    <span className="hidden sm:inline">{children}</span>
  </button>
);

const Info = ({ label, value }) => (
  <div className="flex flex-col gap-0.5 border-b border-slate-100 pb-2 sm:flex-row sm:justify-between sm:gap-4">
    <span className="font-semibold text-slate-500">{label}</span>
    <span className="text-left font-semibold text-slate-900 sm:text-right">{value}</span>
  </div>
);

export { ExpenseTracker as ExpenseTrackerView };
export default ExpenseTracker;
