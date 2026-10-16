import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  FileText,
  DollarSign,
  Calendar,
  Layers,
  ShieldAlert,
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

const CreateInvoiceModal = ({
  isOpen,
  onClose,
  onSuccess,
  projectsList = [],
  initialInvoice = null,
}) => {
  const [projectId, setProjectId] = useState('');
  const [milestoneName, setMilestoneName] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [taxType, setTaxType] = useState('CGST_SGST');
  const [taxRate, setTaxRate] = useState(18);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState(
    'Payment due within 15 days of invoice date. Please transfer to the bank account specified.'
  );
  const [items, setItems] = useState([
    { description: 'Consulting & Implementation Services', quantity: 1, unitPrice: 0 },
  ]);
  const [allowOverbilling, setAllowOverbilling] = useState(false);
  const [issueImmediately, setIssueImmediately] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Selected project details & billing schedule
  const selectedProject = useMemo(() => {
    return projectsList.find((p) => String(p.id || p._id) === String(projectId)) || null;
  }, [projectsList, projectId]);

  // Billing schedule milestones
  const availableMilestones = useMemo(() => {
    if (!selectedProject?.billingSchedule) return [];
    if (Array.isArray(selectedProject.billingSchedule)) return selectedProject.billingSchedule;
    return [];
  }, [selectedProject]);

  useEffect(() => {
    if (initialInvoice) {
      setProjectId(initialInvoice.projectId || '');
      setMilestoneName(initialInvoice.milestoneName || '');
      setInvoiceDate(initialInvoice.invoiceDate || new Date().toISOString().split('T')[0]);
      setDueDate(initialInvoice.dueDate || new Date().toISOString().split('T')[0]);
      setTaxType(initialInvoice.taxType || 'CGST_SGST');
      setTaxRate(Number(initialInvoice.taxRate ?? 18));
      setDiscountAmount(Number(initialInvoice.discountAmount ?? 0));
      setNotes(initialInvoice.notes || '');
      setTerms(initialInvoice.terms || '');
      if (initialInvoice.items && initialInvoice.items.length > 0) {
        setItems(
          initialInvoice.items.map((i) => ({
            description: i.description,
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
          }))
        );
      }
    } else {
      // Reset form
      setProjectId('');
      setMilestoneName('');
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      setDueDate(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      setTaxType('CGST_SGST');
      setTaxRate(18);
      setDiscountAmount(0);
      setNotes('');
      setItems([{ description: 'Consulting & Implementation Services', quantity: 1, unitPrice: 0 }]);
      setAllowOverbilling(false);
      setIssueImmediately(false);
    }
  }, [initialInvoice, isOpen]);

  // Handle milestone selection
  const handleSelectMilestone = (m) => {
    setMilestoneName(m.milestone || '');
    if (m.amount) {
      setItems([
        {
          description: `Milestone: ${m.milestone || 'Project Phase'} (${m.percentage ? m.percentage + '%' : ''})`,
          quantity: 1,
          unitPrice: Number(m.amount),
        },
      ]);
    }
    if (m.dueDate) {
      setDueDate(m.dueDate);
    }
  };

  // Line item handlers
  const handleAddItem = () => {
    setItems((prev) => [...prev, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: field === 'description' ? value : Math.max(0, Number(value || 0)),
      };
      return next;
    });
  };

  // Financial Calculations Preview
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const q = Math.max(0, Number(item.quantity || 0));
      const p = Math.max(0, Number(item.unitPrice || 0));
      return sum + Math.round(q * p * 100) / 100;
    }, 0);
  }, [items]);

  const disc = Math.min(subtotal, Math.max(0, Number(discountAmount || 0)));
  const taxableAmount = Math.round((subtotal - disc) * 100) / 100;

  const { cgstAmount, sgstAmount, igstAmount, totalTax, totalAmount } = useMemo(() => {
    let rate = taxType === 'None' ? 0 : Number(taxRate || 18);
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (taxType === 'CGST_SGST') {
      cgst = Math.round(taxableAmount * (rate / 2 / 100) * 100) / 100;
      sgst = Math.round(taxableAmount * (rate / 2 / 100) * 100) / 100;
    } else if (taxType === 'IGST') {
      igst = Math.round(taxableAmount * (rate / 100) * 100) / 100;
    }

    const tTax = Math.round((cgst + sgst + igst) * 100) / 100;
    const tot = Math.round((taxableAmount + tTax) * 100) / 100;

    return {
      cgstAmount: cgst,
      sgstAmount: sgst,
      igstAmount: igst,
      totalTax: tTax,
      totalAmount: tot,
    };
  }, [taxableAmount, taxType, taxRate]);

  // Overbilling check
  const isOverbilling = useMemo(() => {
    if (!selectedProject || !selectedProject.contractValue) return false;
    const contractVal = Number(selectedProject.contractValue);
    return totalAmount > contractVal;
  }, [selectedProject, totalAmount]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!items.length || items.some((i) => !i.description?.trim())) {
      toast.error('Please provide a valid description for all line items');
      return;
    }

    if (totalAmount <= 0) {
      toast.error('Invoice total amount must be greater than zero');
      return;
    }

    if (isOverbilling && !allowOverbilling) {
      toast.error(
        'Invoice total exceeds project contract value. Please check the contract or approve overbilling.'
      );
      return;
    }

    try {
      setSubmitting(true);
      const rawLead = selectedProject?.leadId;
      const resolvedClientId = typeof rawLead === 'object' && rawLead !== null
        ? (rawLead.id || rawLead._id || null)
        : (rawLead || null);
      const resolvedClientName = selectedProject?.clientName
        || (typeof rawLead === 'object' && rawLead !== null
          ? (rawLead.company || `${rawLead.firstName || ''} ${rawLead.lastName || ''}`.trim())
          : '');

      const payload = {
        projectId: projectId || null,
        clientId: resolvedClientId,
        clientName: resolvedClientName || undefined,
        milestoneName: milestoneName || null,
        invoiceDate,
        dueDate,
        taxType,
        taxRate,
        discountAmount: disc,
        notes,
        terms,
        items,
        issueImmediately,
        allowOverbilling,
      };

      if (initialInvoice?.id) {
        await financeAPI.updateInvoice(initialInvoice.id, payload);
        toast.success('Invoice updated successfully');
      } else {
        await financeAPI.createInvoice(payload);
        toast.success(
          issueImmediately ? 'Invoice created and issued successfully' : 'Draft invoice created successfully'
        );
      }

      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save invoice');
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {initialInvoice ? 'Edit Draft Invoice' : 'Create Customer Invoice'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Generate structured tax invoice with GST breakdown, milestone links, and project validation
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Top Row: Project & Milestone Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Link to Project (Optional)
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="">-- Direct Client Invoicing (No Project) --</option>
                {projectsList.map((p) => (
                  <option key={p.id || p._id} value={p.id || p._id}>
                    {p.projectCode} - {p.name} {p.contractValue ? `(${formatINR(p.contractValue)})` : ''}
                  </option>
                ))}
              </select>
              {selectedProject && (
                <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-500">
                  <span>Client: <strong>{selectedProject.clientName || 'N/A'}</strong></span>
                  <span>Contract Value: <strong>{formatINR(selectedProject.contractValue)}</strong></span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Milestone Name / Commercial Stage
              </label>
              <input
                type="text"
                value={milestoneName}
                onChange={(e) => setMilestoneName(e.target.value)}
                placeholder="e.g. Advance 30%, Phase 1 Delivery, Milestone 2"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
              {/* Milestone picker pills */}
              {availableMilestones.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-slate-400 self-center">Project Milestones:</span>
                  {availableMilestones.map((m, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectMilestone(m)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                        milestoneName === m.milestone
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                      }`}
                    >
                      {m.milestone} ({m.percentage}% - {formatINR(m.amount)})
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dates Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Invoice Date *
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Due Date *
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tax Treatment *
              </label>
              <select
                value={taxType}
                onChange={(e) => setTaxType(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="CGST_SGST">Intra-State: CGST (9%) + SGST (9%) = 18%</option>
                <option value="IGST">Inter-State: IGST (18%)</option>
                <option value="None">Tax Exempt / None (0%)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Discount Amount (INR)
              </label>
              <input
                type="number"
                min="0"
                value={discountAmount || ''}
                onChange={(e) => setDiscountAmount(Number(e.target.value || 0))}
                placeholder="0"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Line Items Breakdown
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Add Line Item
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 flex flex-col md:flex-row gap-2.5 items-start md:items-center"
                >
                  <span className="text-xs font-mono font-bold text-slate-400 w-6 text-center">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    placeholder="Item or service description..."
                    value={item.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    required
                    className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="w-20">
                      <input
                        type="number"
                        placeholder="Qty"
                        min="1"
                        value={item.quantity || ''}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        required
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-center"
                      />
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        placeholder="Price (INR)"
                        min="0"
                        value={item.unitPrice || ''}
                        onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                        required
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-right font-medium"
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-28 text-right">
                      {formatINR((item.quantity || 1) * (item.unitPrice || 0))}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Calculations Summary Box */}
          <div className="bg-gradient-to-r from-slate-50 to-indigo-50/40 dark:from-slate-800/40 dark:to-indigo-950/20 rounded-xl p-4 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between gap-4">
            <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
              <div>Subtotal: <strong>{formatINR(subtotal)}</strong></div>
              {disc > 0 && <div>Discount: <strong className="text-rose-600">- {formatINR(disc)}</strong></div>}
              <div>Taxable Base: <strong>{formatINR(taxableAmount)}</strong></div>
              {taxType === 'CGST_SGST' && (
                <div>
                  CGST (9%): <strong>{formatINR(cgstAmount)}</strong> | SGST (9%):{' '}
                  <strong>{formatINR(sgstAmount)}</strong>
                </div>
              )}
              {taxType === 'IGST' && (
                <div>IGST (18%): <strong>{formatINR(igstAmount)}</strong></div>
              )}
            </div>

            <div className="text-right flex flex-col justify-center">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                Total Invoice Value
              </span>
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {formatINR(totalAmount)}
              </span>
            </div>
          </div>

          {/* Overbilling Warning */}
          {isOverbilling && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 text-xs font-bold">
                <ShieldAlert className="w-4 h-4" />
                Contract Overbilling Warning
              </div>
              <p className="text-xs text-rose-600 dark:text-rose-300">
                This invoice amount ({formatINR(totalAmount)}) exceeds the project approved contract value (
                {formatINR(selectedProject?.contractValue)}).
              </p>
              <label className="flex items-center gap-2 text-xs text-rose-800 dark:text-rose-200 font-semibold cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={allowOverbilling}
                  onChange={(e) => setAllowOverbilling(e.target.checked)}
                  className="rounded text-rose-600"
                />
                Authorized Commercial Overbilling Exception
              </label>
            </div>
          )}

          {/* Notes and Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Invoice Notes
              </label>
              <textarea
                rows="2"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Client specific notes, purchase order references..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Terms & Conditions
              </label>
              <textarea
                rows="2"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Payment terms, bank wire instructions..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {!initialInvoice && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Issue Immediately Upon Creation
                </span>
                <span className="text-[11px] text-slate-500">
                  Assigns official sequence number (INV-YYYY-XXXX) and makes invoice eligible for payment allocations
                </span>
              </div>
              <input
                type="checkbox"
                checked={issueImmediately}
                onChange={(e) => setIssueImmediately(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600"
              />
            </div>
          )}

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
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-600/20 transition-colors flex items-center gap-1.5"
            >
              {submitting ? 'Saving...' : issueImmediately ? 'Create & Issue Invoice' : initialInvoice ? 'Save Changes' : 'Save Draft Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default CreateInvoiceModal;
