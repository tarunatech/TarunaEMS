import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  CreditCard,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Building2,
  FolderKanban,
  FileText,
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

const AllocatePaymentModal = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedPayment = null,
  preselectedInvoice = null,
}) => {
  const [unallocatedPayments, setUnallocatedPayments] = useState([]);
  const [eligibleInvoices, setEligibleInvoices] = useState([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load available unallocated receipts and eligible invoices
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      try {
        setLoadingData(true);
        const [payRes, invRes] = await Promise.all([
          financeAPI.getUnallocatedPayments(),
          financeAPI.getInvoices(),
        ]);

        if (payRes.data?.success) {
          setUnallocatedPayments(payRes.data.data || []);
        }

        if (invRes.data?.success) {
          const eligible = (invRes.data.data || []).filter(
            (inv) => ['issued', 'partially_paid'].includes(inv.status) && Number(inv.outstandingAmount || 0) > 0
          );
          setEligibleInvoices(eligible);
        }
      } catch (err) {
        toast.error('Failed to load eligible payments or invoices');
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [isOpen]);

  useEffect(() => {
    if (preselectedPayment) {
      setSelectedPaymentId(preselectedPayment.id);
    }
    if (preselectedInvoice) {
      setSelectedInvoiceId(preselectedInvoice.id);
    }
  }, [preselectedPayment, preselectedInvoice, isOpen]);

  // Selected payment record
  const selectedPayment = useMemo(() => {
    return unallocatedPayments.find((p) => String(p.id) === String(selectedPaymentId)) || preselectedPayment || null;
  }, [unallocatedPayments, selectedPaymentId, preselectedPayment]);

  // Selected invoice record
  const selectedInvoice = useMemo(() => {
    return eligibleInvoices.find((i) => String(i.id) === String(selectedInvoiceId)) || preselectedInvoice || null;
  }, [eligibleInvoices, selectedInvoiceId, preselectedInvoice]);

  // Available amounts
  const unallocatedOnPayment = Number(selectedPayment?.unallocatedAmount ?? selectedPayment?.amount ?? 0);
  const outstandingOnInvoice = Number(selectedInvoice?.outstandingAmount ?? selectedInvoice?.totalAmount ?? 0);

  // Auto-fill optimal amount
  const handleAutoFillAmount = () => {
    if (unallocatedOnPayment > 0 && outstandingOnInvoice > 0) {
      const optimal = Math.min(unallocatedOnPayment, outstandingOnInvoice);
      setAmount(String(optimal));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const allocNum = Number(amount || 0);

    if (!selectedPaymentId) {
      toast.error('Please select an incoming payment receipt');
      return;
    }
    if (!selectedInvoiceId) {
      toast.error('Please select an eligible customer invoice');
      return;
    }
    if (allocNum <= 0) {
      toast.error('Allocation amount must be greater than zero');
      return;
    }
    if (allocNum > unallocatedOnPayment) {
      toast.error(`Amount exceeds available unallocated receipt balance (${formatINR(unallocatedOnPayment)})`);
      return;
    }
    if (allocNum > outstandingOnInvoice) {
      toast.error(`Amount exceeds invoice balance due (${formatINR(outstandingOnInvoice)})`);
      return;
    }

    try {
      setSubmitting(true);
      const res = await financeAPI.allocatePayment({
        paymentTransactionId: selectedPaymentId,
        invoiceId: selectedInvoiceId,
        amount: allocNum,
        notes,
      });

      if (res.data?.success) {
        toast.success(`Successfully allocated ${formatINR(allocNum)} to invoice`);
        onSuccess();
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to allocate payment');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Allocate Incoming Payment
              </h3>
              <p className="text-xs text-slate-500">
                Connect recorded incoming receipts to customer invoices to reduce outstanding receivables
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Step 1: Select Payment */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Incoming Client Payment Receipt *
            </label>
            <select
              value={selectedPaymentId}
              onChange={(e) => setSelectedPaymentId(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              <option value="">-- Choose Unallocated Receipt --</option>
              {unallocatedPayments.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatDate(p.date)} • {p.clientName || 'Direct'} • Total: {formatINR(p.amount)} (Available:{' '}
                  {formatINR(p.unallocatedAmount)}) • Ref: {p.reference || 'N/A'}
                </option>
              ))}
            </select>
            {selectedPayment && (
              <div className="mt-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/40 text-xs flex justify-between items-center text-emerald-900 dark:text-emerald-200">
                <div>
                  <span className="font-bold">Total Receipt: {formatINR(selectedPayment.amount)}</span>
                  <span className="text-[11px] block text-emerald-700 dark:text-emerald-400">
                    Client: {selectedPayment.clientName || 'Direct'} • Project:{' '}
                    {selectedPayment.projectName || 'General'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 block">Available</span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {formatINR(unallocatedOnPayment)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Select Invoice */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Target Customer Invoice *
            </label>
            <select
              value={selectedInvoiceId}
              onChange={(e) => setSelectedInvoiceId(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              <option value="">-- Choose Eligible Invoice --</option>
              {eligibleInvoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  #{inv.invoiceNumber || inv.id} • {inv.client?.company_name || inv.client?.name || 'Client'} •{' '}
                  {inv.project?.name || 'Project'} • Total: {formatINR(inv.totalAmount)} • Balance Due:{' '}
                  {formatINR(inv.outstandingAmount)}
                </option>
              ))}
            </select>
            {selectedInvoice && (
              <div className="mt-2 p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-800/40 text-xs flex justify-between items-center text-indigo-900 dark:text-indigo-200">
                <div>
                  <span className="font-bold">
                    Invoice #{selectedInvoice.invoiceNumber || selectedInvoice.id}
                  </span>
                  <span className="text-[11px] block text-indigo-700 dark:text-indigo-400">
                    Total: {formatINR(selectedInvoice.totalAmount)} • Paid: {formatINR(selectedInvoice.paidAmount)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-indigo-600 block">Balance Due</span>
                  <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                    {formatINR(outstandingOnInvoice)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Allocation Amount */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Amount to Allocate (INR) *
              </label>
              {unallocatedOnPayment > 0 && outstandingOnInvoice > 0 && (
                <button
                  type="button"
                  onClick={handleAutoFillAmount}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                >
                  Auto-fill ({formatINR(Math.min(unallocatedOnPayment, outstandingOnInvoice))})
                </button>
              )}
            </div>
            <input
              type="number"
              min="1"
              max={Math.min(unallocatedOnPayment || 99999999, outstandingOnInvoice || 99999999)}
              step="any"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Allocation Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Cleared Milestone 1 via NEFT transfer"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          {/* Action Buttons */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-md shadow-emerald-600/20 transition-colors flex items-center gap-1.5"
            >
              {submitting ? 'Allocating...' : 'Confirm Allocation'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default AllocatePaymentModal;
