import React, { useCallback, useEffect, useMemo, useState } from 'react';
import EmployeeLayout from '../../components/Employee/EmployeeLayout/EmployeeLayout';
import { expenseTrackerAPI } from '../../utils/api';
import { Edit3, Plus, RefreshCw, Trash2, WalletCards } from 'lucide-react';
import toast from 'react-hot-toast';
import io from 'socket.io-client';
import SearchWithSuggestions from '../../components/Common/SearchWithSuggestions';

const paymentMethods = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Other'];
const expenseCategories = ['Office Supplies', 'Travel', 'Utilities', 'Salary', 'Marketing', 'Maintenance', 'Software', 'Miscellaneous'];

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

const EmployeeExpenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({ totalSpent: 0, expenseCount: 0 });
  const [form, setForm] = useState(emptyExpense);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const currency = (value) => Number(value || 0).toLocaleString('en-IN');
  const displayDate = (value) => value ? new Date(value).toLocaleDateString('en-IN') : '-';

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [summaryRes, expensesRes] = await Promise.all([
        expenseTrackerAPI.getSummary(),
        expenseTrackerAPI.getTransactions({ type: 'expense' })
      ]);
      setSummary(summaryRes.data.data || {});
      setExpenses(expensesRes.data.data || []);
    } catch (error) {
      console.error('Failed to load employee expenses:', error);
      toast.error('Failed to load expenses');
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const payload = { ...form, type: 'expense', amount: Number(form.amount) };
      if (editing) {
        await expenseTrackerAPI.updateTransaction(editing._id, payload);
        toast.success('Expense updated successfully');
      } else {
        await expenseTrackerAPI.createTransaction(payload);
        toast.success('Expense submitted successfully');
      }
      setForm(emptyExpense);
      setEditing(null);
      loadData();
    } catch (error) {
      console.error('Failed to save employee expense:', error);
      toast.error(error.response?.data?.errors?.[0]?.msg || error.response?.data?.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (expense) => {
    setEditing(expense);
    setForm({
      type: 'expense',
      date: expense.date?.slice(0, 10) || emptyExpense.date,
      paidTo: expense.paidTo || '',
      category: expense.category || '',
      amount: expense.amount || '',
      paymentMethod: expense.paymentMethod || '',
      description: expense.description || '',
      referenceNumber: expense.referenceNumber || '',
      remarks: expense.remarks || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteExpense = async (id) => {
    if (!window.confirm('Delete this expense permanently?')) return;
    try {
      await expenseTrackerAPI.deleteTransaction(id);
      toast.success('Expense deleted');
      loadData();
    } catch (error) {
      console.error('Failed to delete employee expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  return (
    <EmployeeLayout>
      <div className="w-full min-h-[calc(100vh-7rem)] space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">My Expenses</h1>
            <p className="mt-1 text-sm text-slate-500">Submit and track your company expense records.</p>
          </div>
          <button onClick={loadData} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard label="Submitted Expenses" value={summary.expenseCount || expenses.length} />
          <SummaryCard label="Total Amount" value={currency(summary.totalSpent)} />
          <SummaryCard label="Latest Records" value={expenses.length} />
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{editing ? 'Edit Expense' : 'Add Expense'}</h2>
              <p className="text-sm text-slate-500">Use the same fields required by the admin expense tracker.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Expense Date" type="date" value={form.date} onChange={(value) => setForm(prev => ({ ...prev, date: value }))} required />
            <Input label="Paid To" value={form.paidTo} onChange={(value) => setForm(prev => ({ ...prev, paidTo: value }))} required />
            <Select label="Category" value={form.category} onChange={(value) => setForm(prev => ({ ...prev, category: value }))} options={expenseCategories} placeholder="Select category" required />
            <Input label="Amount" type="number" value={form.amount} onChange={(value) => setForm(prev => ({ ...prev, amount: value }))} required />
            <Select label="Payment Method" value={form.paymentMethod} onChange={(value) => setForm(prev => ({ ...prev, paymentMethod: value }))} options={paymentMethods} placeholder="Select payment method" required />
            <Input label="Reference Number" value={form.referenceNumber} onChange={(value) => setForm(prev => ({ ...prev, referenceNumber: value }))} />
            <TextArea label="Description / Purpose" value={form.description} onChange={(value) => setForm(prev => ({ ...prev, description: value }))} className="md:col-span-2" />
            <Input label="Remarks" value={form.remarks} onChange={(value) => setForm(prev => ({ ...prev, remarks: value }))} className="md:col-span-2" />
          </div>

          <div className="mt-5 flex justify-end gap-3">
            {editing && (
              <button type="button" onClick={() => { setEditing(null); setForm(emptyExpense); }} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
            )}
            <button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Saving...' : editing ? 'Update Expense' : 'Submit Expense'}
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Expense History</h2>
              <p className="text-sm text-slate-500">Only your submitted expense records are shown here.</p>
            </div>
            <SearchWithSuggestions
              value={search}
              onChange={setSearch}
              items={expenses}
              getSuggestionValue={(item) => item.paidTo || item.description || item.category || ''}
              getSuggestionTitle={(item) => item.paidTo || item.category || 'Expense'}
              getSuggestionSubtitle={(item) => [item.category, item.paymentMethod, item.description].filter(Boolean).join(' • ')}
              placeholder="Search expenses"
              className="w-full sm:max-w-sm"
              inputClassName="rounded-xl py-2.5 focus:border-blue-500 focus:ring-blue-100"
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px]">
                <thead className="bg-slate-50">
                  <tr>
                    {['Date', 'Paid To', 'Category', 'Amount', 'Payment Method', 'Description', 'Actions'].map((head) => (
                      <th key={head} className="border-b border-slate-200 p-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="7" className="p-8 text-center text-slate-500">Loading expenses...</td></tr>
                  ) : filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-10 text-center">
                        <WalletCards className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                        <p className="font-medium text-slate-500">No expenses found</p>
                      </td>
                    </tr>
                  ) : filteredExpenses.map((expense) => (
                    <tr key={expense._id} className="border-b border-slate-100 hover:bg-blue-50/60">
                      <td className="p-4 text-slate-700">{displayDate(expense.date)}</td>
                      <td className="p-4 text-slate-900">{expense.paidTo}</td>
                      <td className="p-4 text-slate-700">{expense.category}</td>
                      <td className="p-4 font-semibold text-blue-700">{currency(expense.amount)}</td>
                      <td className="p-4 text-slate-700">{expense.paymentMethod}</td>
                      <td className="p-4 text-slate-500">{expense.description || '-'}</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button onClick={() => startEdit(expense)} className="rounded-lg border border-blue-100 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50">
                            <Edit3 className="mr-1 inline h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button onClick={() => deleteExpense(expense._id)} className="rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">
                            <Trash2 className="mr-1 inline h-3.5 w-3.5" />
                            Delete
                          </button>
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
    </EmployeeLayout>
  );
};

const SummaryCard = ({ label, value }) => (
  <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
    <p className="text-sm text-slate-500">{label}</p>
    <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
  </div>
);

const Input = ({ label, value, onChange, className = '', ...props }) => (
  <label className={`block ${className}`}>
    <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
    <input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" {...props} />
  </label>
);

const Select = ({ label, value, onChange, options, placeholder, className = '', ...props }) => (
  <label className={`block ${className}`}>
    <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
    <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" {...props}>
      <option value="">{placeholder}</option>
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  </label>
);

const TextArea = ({ label, value, onChange, className = '', ...props }) => (
  <label className={`block ${className}`}>
    <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
    <textarea value={value} onChange={(event) => onChange(event.target.value)} rows="3" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" {...props} />
  </label>
);

export default EmployeeExpenses;
