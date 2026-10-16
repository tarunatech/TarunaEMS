import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  RefreshCw,
  Calendar,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { amcAPI } from '../../utils/api';

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

const RenewAMCModal = ({ isOpen, onClose, contract, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [durationMonths, setDurationMonths] = useState(12);
  const [contractValue, setContractValue] = useState(0);
  const [billingFrequency, setBillingFrequency] = useState('Quarterly');
  const [renewalNotes, setRenewalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (contract) {
      setTitle(`${contract.title} (Renewal)`);
      setContractValue(contract.contractValue || 0);
      setBillingFrequency(contract.billingFrequency || 'Quarterly');

      // Default new dates: start on next day after original contract end date
      if (contract.endDate) {
        const origEnd = new Date(contract.endDate);
        if (!isNaN(origEnd.getTime())) {
          const nextStart = new Date(origEnd);
          nextStart.setDate(nextStart.getDate() + 1);

          const nextEnd = new Date(nextStart);
          nextEnd.setFullYear(nextEnd.getFullYear() + 1);
          nextEnd.setDate(nextEnd.getDate() - 1);

          setStartDate(nextStart.toISOString().slice(0, 10));
          setEndDate(nextEnd.toISOString().slice(0, 10));
        }
      }
      setRenewalNotes(`Renewed from prior contract ${contract.contractNumber}.`);
    }
  }, [contract, isOpen]);

  // Handle escalation shortcuts
  const applyEscalation = (pct) => {
    const orig = Number(contract?.contractValue) || 0;
    const factor = 1 + pct / 100;
    const escalated = Math.round(orig * factor);
    setContractValue(escalated);
  };

  const handleStartDateChange = (val) => {
    setStartDate(val);
    if (val) {
      const s = new Date(val);
      if (!isNaN(s.getTime())) {
        const e = new Date(s);
        e.setMonth(e.getMonth() + parseInt(durationMonths, 10));
        e.setDate(e.getDate() - 1);
        setEndDate(e.toISOString().slice(0, 10));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      toast.error('Start and end dates are required');
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      toast.error('End date must be after start date');
      return;
    }

    try {
      setSubmitting(true);
      const res = await amcAPI.renewContract(contract.id, {
        title: title.trim(),
        startDate,
        endDate,
        durationMonths,
        contractValue,
        billingFrequency,
        renewalTerms: contract.renewalTerms,
        commercialNotes: renewalNotes,
        internalNotes: renewalNotes,
      });

      if (res.data?.success) {
        toast.success(res.data.message || 'AMC Contract renewed successfully');
        onSuccess(res.data.data);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to renew AMC contract');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !contract) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center ring-1 ring-indigo-500/30">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Renew AMC Contract
              </h2>
              <p className="text-xs text-slate-500">
                Creates a renewal contract linked to {contract.contractNumber}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Prior Contract Banner */}
          <div className="p-3 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider block">
                Existing Prior Contract
              </span>
              <p className="font-mono font-bold text-slate-900 dark:text-white">
                {contract.contractNumber} — {contract.title}
              </p>
              <p className="text-[11px] text-slate-500">
                Term: {formatDate(contract.startDate)} to {formatDate(contract.endDate)}
              </p>
            </div>
            <div className="text-right">
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                {formatINR(contract.contractValue)}
              </span>
              <p className="text-[10px] text-slate-400 font-medium">Original Value</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Renewal Contract Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                New Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                New End Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Value and Escalation */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Renewed Contract Value (INR) <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400">Escalate:</span>
                <button
                  type="button"
                  onClick={() => applyEscalation(0)}
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-[10px] font-bold"
                >
                  +0%
                </button>
                <button
                  type="button"
                  onClick={() => applyEscalation(5)}
                  className="px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-bold"
                >
                  +5%
                </button>
                <button
                  type="button"
                  onClick={() => applyEscalation(10)}
                  className="px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-bold"
                >
                  +10%
                </button>
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2.5 font-bold text-slate-400">₹</span>
              <input
                type="number"
                min={0}
                value={contractValue}
                onChange={(e) => setContractValue(e.target.value)}
                required
                className="w-full pl-7 pr-3 py-2 text-sm font-bold bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Renewal & Negotiation Notes
            </label>
            <textarea
              value={renewalNotes}
              onChange={(e) => setRenewalNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <p className="text-[11px] text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
            <strong>Historical Integrity:</strong> The existing contract {contract.contractNumber} will be updated to "Renewed" status and kept intact in audit history. The new contract will link back to it.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {submitting ? 'Renewing...' : 'Confirm Renewal Contract'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default RenewAMCModal;
