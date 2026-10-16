import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Download,
  CheckCircle2,
  XCircle,
  CreditCard,
  Building2,
  FolderKanban,
  FileText,
  DollarSign,
  AlertCircle,
  Trash2,
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

const InvoiceDetailModal = ({
  isOpen,
  onClose,
  invoice,
  onRefresh,
  onOpenAllocate,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  if (!isOpen || !invoice || typeof document === 'undefined') return null;

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      const res = await financeAPI.downloadInvoicePdf(invoice.id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice_${invoice.invoiceNumber || invoice.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Invoice PDF downloaded successfully');
    } catch (err) {
      toast.error('Failed to download invoice PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handleIssueInvoice = async () => {
    if (!window.confirm('Issue this invoice? This will freeze line items and assign an official invoice number.')) {
      return;
    }
    try {
      setActionLoading(true);
      const res = await financeAPI.issueInvoice(invoice.id);
      if (res.data?.success) {
        toast.success(`Invoice issued as #${res.data.data?.invoiceNumber}`);
        onRefresh();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to issue invoice');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelInvoice = async () => {
    const reason = window.prompt('Enter reason for cancelling this invoice:');
    if (reason === null) return;
    try {
      setActionLoading(true);
      const res = await financeAPI.cancelInvoice(invoice.id, { reason });
      if (res.data?.success) {
        toast.success('Invoice cancelled successfully');
        onRefresh();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel invoice');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeallocate = async (allocationId) => {
    if (!window.confirm('Deallocate this payment? The payment balance will be returned to unallocated.')) {
      return;
    }
    try {
      setActionLoading(true);
      const res = await financeAPI.deallocatePayment(allocationId);
      if (res.data?.success) {
        toast.success('Payment deallocated successfully');
        onRefresh();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deallocate payment');
    } finally {
      setActionLoading(false);
    }
  };

  const clientName = invoice.client?.company_name || invoice.client?.name || 'Direct Client';
  const projectName = invoice.project?.name || 'General Invoicing';

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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {invoice.invoiceNumber || 'Draft Invoice'}
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded text-[11px] font-bold border uppercase tracking-wider ${
                    STATUS_BADGES[invoice.status] || ''
                  }`}
                >
                  {invoice.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Issued on {formatDate(invoice.invoiceDate)} • Due on {formatDate(invoice.dueDate)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Download className={`w-3.5 h-3.5 ${downloading ? 'animate-bounce' : ''}`} />
              {downloading ? 'Exporting...' : 'PDF'}
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Key Parties Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Billed Client
              </span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-500" />
                {clientName}
              </h4>
              {invoice.client?.email && (
                <p className="text-xs text-slate-500">Email: {invoice.client.email}</p>
              )}
              {invoice.client?.phone && (
                <p className="text-xs text-slate-500">Phone: {invoice.client.phone}</p>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Project & Commercial Milestone
              </span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-indigo-500" />
                {invoice.project?.projectCode ? `[${invoice.project.projectCode}] ` : ''}
                {projectName}
              </h4>
              {invoice.milestoneName ? (
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Milestone: <strong>{invoice.milestoneName}</strong>
                </p>
              ) : (
                <p className="text-xs text-slate-400">General Billing (No milestone)</p>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Invoice Items Breakdown
            </h4>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-2.5 px-3 font-semibold w-10">#</th>
                    <th className="py-2.5 px-3 font-semibold">Description</th>
                    <th className="py-2.5 px-3 font-semibold text-right w-16">Qty</th>
                    <th className="py-2.5 px-3 font-semibold text-right w-28">Unit Price</th>
                    <th className="py-2.5 px-3 font-semibold text-right w-28">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(invoice.items || []).map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                        {item.description}
                      </td>
                      <td className="py-2.5 px-3 text-right">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-medium">{formatINR(item.unitPrice)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                        {formatINR(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Totals Breakdown */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
              <div>Subtotal: <strong>{formatINR(invoice.subtotal)}</strong></div>
              {Number(invoice.discountAmount || 0) > 0 && (
                <div>Discount: <strong className="text-rose-600">- {formatINR(invoice.discountAmount)}</strong></div>
              )}
              <div>Taxable Amount: <strong>{formatINR(invoice.taxableAmount)}</strong></div>
              {invoice.taxType === 'CGST_SGST' && (
                <div>
                  CGST ({invoice.cgstRate}%): <strong>{formatINR(invoice.cgstAmount)}</strong> | SGST ({invoice.sgstRate}%):{' '}
                  <strong>{formatINR(invoice.sgstAmount)}</strong>
                </div>
              )}
              {invoice.taxType === 'IGST' && (
                <div>IGST ({invoice.igstRate}%): <strong>{formatINR(invoice.igstAmount)}</strong></div>
              )}
            </div>

            <div className="text-right space-y-1 w-full md:w-auto">
              <div className="flex justify-between md:justify-end gap-6 text-xs text-slate-500">
                <span>Total Amount:</span>
                <strong className="text-slate-900 dark:text-white font-bold">{formatINR(invoice.totalAmount)}</strong>
              </div>
              <div className="flex justify-between md:justify-end gap-6 text-xs text-emerald-600">
                <span>Allocated Paid:</span>
                <strong className="font-bold">{formatINR(invoice.paidAmount)}</strong>
              </div>
              <div className="flex justify-between md:justify-end gap-6 text-sm font-bold text-indigo-600 dark:text-indigo-400 pt-1 border-t border-slate-200 dark:border-slate-700">
                <span>Balance Due:</span>
                <span>{formatINR(invoice.outstandingAmount)}</span>
              </div>
            </div>
          </div>

          {/* Payment Allocations Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                Allocated Payment Receipts ({invoice.allocations?.length || 0})
              </h4>
              {['issued', 'partially_paid'].includes(invoice.status) && (
                <button
                  type="button"
                  onClick={() => onOpenAllocate(invoice)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <DollarSign className="w-3.5 h-3.5" /> Allocate Incoming Payment
                </button>
              )}
            </div>

            {(invoice.allocations || []).length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center bg-slate-50/50 dark:bg-slate-800/20 rounded-xl">
                No payments allocated to this invoice yet.
              </p>
            ) : (
              <div className="space-y-2">
                {invoice.allocations.map((alloc) => (
                  <div
                    key={alloc.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatINR(alloc.allocatedAmount)}
                      </span>
                      <span className="text-slate-500 ml-2">
                        allocated on {formatDate(alloc.allocatedAt)}
                      </span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Ref: {alloc.paymentReference || 'Direct'} • Method: {alloc.paymentMethod || 'Wire'} •{' '}
                        {alloc.notes || 'Payment applied'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeallocate(alloc.id)}
                      disabled={actionLoading}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition-colors"
                      title="Deallocate this payment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            {invoice.status === 'draft' && (
              <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Draft invoice does not count toward official receivables.
              </span>
            )}
            {invoice.status === 'cancelled' && (
              <span className="text-xs text-rose-600 font-medium">
                Cancelled Reason: {invoice.cancellationReason || 'Cancelled by admin'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {invoice.status === 'draft' && (
              <button
                type="button"
                onClick={handleIssueInvoice}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Issue Invoice
              </button>
            )}

            {invoice.status !== 'cancelled' && (!invoice.allocations || invoice.allocations.length === 0) && (
              <button
                type="button"
                onClick={handleCancelInvoice}
                disabled={actionLoading}
                className="px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors flex items-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" /> Cancel Invoice
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default InvoiceDetailModal;
