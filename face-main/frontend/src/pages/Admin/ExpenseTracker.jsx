import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/Admin/layout/AdminLayout';
import { expenseTrackerAPI } from '../../utils/api';
import { RefreshCw, Search, Trash2, Edit3, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import io from 'socket.io-client';

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
  amount: '',
  paymentMethod: '',
  referenceNumber: '',
  invoiceNumber: '',
  remarks: ''
};

const ExpenseTracker = () => {
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

  const currency = (value) => Number(value || 0).toLocaleString('en-IN');
  const displayDate = (value) => value ? new Date(value).toLocaleDateString('en-IN') : '-';

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
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: { token: localStorage.getItem('token') }
    });

    socket.on('expense-tracker:updated', loadData);
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
      if (editing) {
        await expenseTrackerAPI.updateTransaction(editing._id, payload);
        toast.success('Record updated successfully');
      } else {
        await expenseTrackerAPI.createTransaction(payload);
        toast.success(form.type === 'expense' ? 'Expense saved successfully' : 'Incoming payment saved successfully');
      }
      resetForm();
      setEditing(null);
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
      setPaymentForm({
        type: 'payment',
        date: item.date?.slice(0, 10),
        clientName: item.clientName || '',
        amount: item.amount || '',
        paymentMethod: item.paymentMethod || '',
        referenceNumber: item.referenceNumber || '',
        invoiceNumber: item.invoiceNumber || '',
        remarks: item.remarks || ''
      });
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
    setActiveView('add-payment');
  };

  return (
    <AdminLayout>
      <div className="admin-page-shell w-full min-h-[calc(100vh-7rem)] space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            {/* <p className="text-xs font-bold uppercase tracking-[0.32em] text-blue-600">Admin Only</p> */}
            <h1 className="premium-page-title mt-2 text-2xl font-bold sm:text-3xl">Expense Tracker</h1>
            <p className="mt-1 text-sm text-slate-500">Manage company spending and incoming client payments.</p>
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

        <nav className="premium-panel flex w-full flex-wrap gap-2 rounded-2xl p-2">
          <TabButton active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')}>Dashboard</TabButton>
          <TabButton active={activeView === 'payments'} onClick={() => setActiveView('payments')}>Incoming Payments</TabButton>
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
                onSubmit={(event) => {
                  event.preventDefault();
                  saveTransaction(paymentForm, () => setPaymentForm(emptyPayment), 'payments');
                }}
              />
            )}
        </section>

        {viewing && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-950">Expense Details</h3>
                <button onClick={() => setViewing(null)} className="rounded-lg px-3 py-1 text-slate-500 hover:bg-slate-100">Close</button>
              </div>
              <div className="space-y-3 text-sm">
                <Info label="Date" value={displayDate(viewing.date)} />
                <Info label="Paid To" value={viewing.paidTo || '-'} />
                <Info label="Category" value={viewing.category || '-'} />
                <Info label="Amount" value={currency(viewing.amount)} />
                <Info label="Payment Method" value={viewing.paymentMethod || '-'} />
                <Info label="Description" value={viewing.description || '-'} />
                <Info label="Reference Number" value={viewing.referenceNumber || '-'} />
                <Info label="Remarks" value={viewing.remarks || '-'} />
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`min-h-11 flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition sm:min-w-40 ${
      active
        ? 'bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white shadow-[0_10px_22px_rgba(37,99,235,0.22)]'
        : 'bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-700'
    }`}
  >
    {children}
  </button>
);

const SummaryCard = ({ label, value }) => (
  <div className="premium-stat-card rounded-2xl p-4 sm:p-5">
    <p className="text-sm text-slate-500">{label}</p>
    <p className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">{value}</p>
  </div>
);

const DashboardView = ({ summary, expenses, search, setSearch, loading, currency, displayDate, openExpenseForm, onRefresh, onView, onEdit, onDelete }) => (
  <div className="premium-panel rounded-2xl p-4 sm:p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Expense List</h2>
        <p className="mt-1 text-sm text-slate-500">Search, filter, and manage company expenses.</p>
      </div>
      <div className="flex gap-2">
        <button onClick={onRefresh} className="rounded-xl border border-slate-200 bg-white p-3 text-slate-600 shadow-sm hover:bg-slate-50" aria-label="Refresh">
          <RefreshCw className="h-5 w-5" />
        </button>
        <button onClick={openExpenseForm} className="premium-primary-button rounded-xl px-4 py-3 text-sm font-semibold">
          Add Expense
        </button>
      </div>
    </div>

    <div className="mt-6 grid gap-4 md:grid-cols-3">
      <SummaryCard label="Total Received" value={currency(summary.totalReceived)} />
      <SummaryCard label="Total Spent" value={currency(summary.totalSpent)} />
      <SummaryCard label="Remaining Balance" value={currency(summary.remainingBalance)} />
    </div>

    <div className="relative mt-6">
      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search expenses" className="premium-input w-full rounded-xl py-3 pl-12 pr-4 text-sm text-slate-900 placeholder-slate-400" />
    </div>

    <ExpenseTable expenses={expenses} loading={loading} currency={currency} displayDate={displayDate} onView={onView} onEdit={onEdit} onDelete={onDelete} />
  </div>
);

const ExpenseTable = ({ expenses, loading, currency, displayDate, onView, onEdit, onDelete }) => (
  <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
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
            <tr key={item._id} className="premium-table-row border-b border-slate-100">
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
);

const PaymentsView = ({ payments, filters, setFilters, paymentSearch, setPaymentSearch, loading, currency, displayDate, openPaymentForm, onRefresh, onEdit, onDelete }) => (
  <div className="premium-panel rounded-2xl p-4 sm:p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Incoming Payments</h2>
        <p className="mt-1 text-sm text-slate-500">Track client payments received by the admin team.</p>
      </div>
      <div className="flex gap-2">
        <button onClick={onRefresh} className="rounded-xl border border-slate-200 bg-white p-3 text-slate-600 shadow-sm hover:bg-slate-50" aria-label="Refresh">
          <RefreshCw className="h-5 w-5" />
        </button>
        <button onClick={openPaymentForm} className="premium-primary-button rounded-xl px-4 py-3 text-sm font-semibold">
          Add Payment
        </button>
      </div>
    </div>

    <div className="mt-6 grid gap-4 md:grid-cols-2">
      <input value={paymentSearch} onChange={(e) => setPaymentSearch(e.target.value)} placeholder="Search by client name" className="premium-input rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400" />
      <input type="date" value={filters.startDate} onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))} className="premium-input rounded-xl px-4 py-3 text-sm text-slate-900" />
      <input type="date" value={filters.endDate} onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))} className="premium-input rounded-xl px-4 py-3 text-sm text-slate-900" />
      <button onClick={onRefresh} className="premium-primary-button rounded-xl px-4 py-3 text-sm font-semibold">Filter</button>
    </div>

    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
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

const PaymentForm = ({ form, setForm, saving, editing, onSubmit }) => (
  <FormPanel title={editing ? 'Edit Incoming Payment' : 'Add Incoming Payment'} subtitle="Record client payments so the dashboard always reflects money received." onSubmit={onSubmit} buttonText={saving ? 'Saving...' : 'Save Incoming Payment'}>
    <Input label="Payment Date" type="date" value={form.date} onChange={(value) => setForm(prev => ({ ...prev, date: value }))} required />
    <Input label="Client Name" value={form.clientName} onChange={(value) => setForm(prev => ({ ...prev, clientName: value }))} required />
    <Input label="Amount" type="number" value={form.amount} onChange={(value) => setForm(prev => ({ ...prev, amount: value }))} required />
    <Select label="Payment Method" value={form.paymentMethod} onChange={(value) => setForm(prev => ({ ...prev, paymentMethod: value }))} options={paymentMethods} placeholder="Select payment method" required />
    <Input label="Reference Number" value={form.referenceNumber} onChange={(value) => setForm(prev => ({ ...prev, referenceNumber: value }))} />
    <Input label="Invoice Number" value={form.invoiceNumber} onChange={(value) => setForm(prev => ({ ...prev, invoiceNumber: value }))} />
    <TextArea label="Remarks" value={form.remarks} onChange={(value) => setForm(prev => ({ ...prev, remarks: value }))} className="md:col-span-2" />
  </FormPanel>
);

const FormPanel = ({ title, subtitle, onSubmit, buttonText, children }) => (
  <form onSubmit={onSubmit} className="premium-panel rounded-2xl p-4 sm:p-6">
    <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h2>
    <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    <div className="mt-6 grid gap-4 md:grid-cols-2">{children}</div>
    <div className="mt-6 flex justify-end">
      <button type="submit" className="premium-primary-button rounded-xl px-5 py-3 text-sm font-semibold">
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
  <button onClick={onClick} className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold ${danger ? 'border-red-100 text-red-600 hover:bg-red-50' : 'border-blue-100 text-blue-600 hover:bg-blue-50'}`}>
    {React.createElement(Icon, { className: 'h-4 w-4' })}
    {children}
  </button>
);

const Info = ({ label, value }) => (
  <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
    <span className="font-semibold text-slate-500">{label}</span>
    <span className="text-right font-semibold text-slate-900">{value}</span>
  </div>
);

export default ExpenseTracker;
