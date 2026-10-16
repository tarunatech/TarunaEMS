import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ShieldCheck,
  Calendar,
  DollarSign,
  FileText,
  Building2,
  FolderKanban,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Download,
  ExternalLink,
  Edit3,
  RefreshCw,
  XCircle,
  File,
  Check,
  Tag
} from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_BADGES = {
  Draft: { bg: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300' },
  'Pending Approval': { bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300' },
  Active: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' },
  Expired: { bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300' },
  Cancelled: { bg: 'bg-slate-200 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400' },
  Renewed: { bg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300' },
};

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

const AMCDetailModal = ({
  isOpen,
  onClose,
  contract,
  onEdit,
  onActivate,
  onRenew,
  onCancel,
}) => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'coverage' | 'commercial' | 'renewal' | 'document'

  if (!isOpen || !contract) return null;

  const statusStyle = STATUS_BADGES[contract.status]?.bg || STATUS_BADGES.Draft.bg;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center ring-1 ring-indigo-500/30 flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  {contract.contractNumber}
                </span>
                <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full border ${statusStyle}`}>
                  {contract.status}
                </span>
                {contract.contractType === 'Renewal' && (
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-full border bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300">
                    Renewal
                  </span>
                )}
                {/* Days remaining badge */}
                {contract.status === 'Active' && (
                  <span
                    className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border ${
                      contract.daysUntilExpiry <= 30
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                    }`}
                  >
                    <Clock className="w-3 h-3 inline mr-1" />
                    {contract.daysUntilExpiry >= 0
                      ? `${contract.daysUntilExpiry} days left`
                      : `Expired ${Math.abs(contract.daysUntilExpiry)} days ago`}
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white truncate mt-0.5">
                {contract.title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-100/60 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            {/* Edit Draft */}
            {(contract.status === 'Draft' || contract.status === 'Pending Approval') && (
              <button
                type="button"
                onClick={() => onEdit(contract)}
                className="flex items-center gap-1.5 px-3 py-1.5 font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition"
              >
                <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
                Edit Draft
              </button>
            )}

            {/* Activate */}
            {(contract.status === 'Draft' || contract.status === 'Pending Approval') && (
              <button
                type="button"
                onClick={() => onActivate(contract.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approve & Activate
              </button>
            )}

            {/* Renew */}
            {(contract.status === 'Active' || contract.status === 'Expired') && (
              <button
                type="button"
                onClick={() => onRenew(contract)}
                className="flex items-center gap-1.5 px-3 py-1.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Renew Contract
              </button>
            )}

            {/* Cancel */}
            {contract.status !== 'Cancelled' && contract.status !== 'Renewed' && (
              <button
                type="button"
                onClick={() => onCancel(contract.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 font-semibold text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900 rounded-lg hover:bg-rose-50 transition"
              >
                <XCircle className="w-3.5 h-3.5" />
                Cancel Contract
              </button>
            )}
          </div>

          {contract.documentPath && (
            <a
              href={contract.documentPath}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Download Agreement File
            </a>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none bg-white dark:bg-slate-900">
          {[
            { id: 'overview', label: 'Overview & Terms', icon: FileText },
            { id: 'coverage', label: `Coverage (${contract.coveredEquipment?.length || 0} Equipment)`, icon: Layers },
            { id: 'commercial', label: 'Commercial & Installments', icon: DollarSign },
            { id: 'renewal', label: 'Renewal & History', icon: RefreshCw },
            { id: 'document', label: 'Documents & Notes', icon: File },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300 ring-1 ring-indigo-500/20'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Client & Project Card */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-500" />
                    Customer & Project Linkage
                  </h4>
                  <div className="space-y-1.5">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Client / Account:</span>
                      <span className="font-semibold text-slate-900 dark:text-white text-sm">
                        {contract.clientName}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Associated Project:</span>
                      {contract.projectId ? (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 rounded border border-indigo-200 dark:border-indigo-800 font-bold">
                            {contract.projectCode}
                          </span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {contract.projectName}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded font-medium mt-0.5">
                          Standalone Client AMC (No project linkage)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Period & Duration Card */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    Contract Period & Lifecycle
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Start Date:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {formatDate(contract.startDate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">End Date:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {formatDate(contract.endDate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Contract Duration:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {contract.durationMonths} Months
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Signing Date:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {contract.signingDate ? formatDate(contract.signingDate) : 'Pending / Not Recorded'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Commercial Summary Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider block">
                    Total Contract Value
                  </span>
                  <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                    {formatINR(contract.contractValue)} {contract.currency}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider block">
                    Billing Frequency
                  </span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {contract.billingFrequency}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COVERAGE & EQUIPMENT */}
          {activeTab === 'coverage' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl">
                <div>
                  <span className="text-slate-400 block text-[10px]">Coverage Type:</span>
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {contract.coverageType}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Preventive Maintenance:</span>
                  <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">
                    {contract.preventiveVisitCount} Scheduled Visits
                  </span>
                </div>
              </div>

              {/* Covered Equipment List */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  Covered Equipment Units ({contract.coveredEquipment?.length || 0})
                </h4>
                {(!contract.coveredEquipment || contract.coveredEquipment.length === 0) ? (
                  <p className="text-xs text-slate-400 italic p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg">
                    Non-equipment specific AMC (Covers overall client installation / services).
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {contract.coveredEquipment.map((eq, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1"
                      >
                        <p className="font-bold text-slate-900 dark:text-white">{eq.equipmentName}</p>
                        <p className="text-[11px] text-slate-500">
                          Model: {eq.modelNumber || 'N/A'} | Serial: {eq.serialNumber || 'N/A'}
                        </p>
                        {eq.location && (
                          <p className="text-[10px] text-slate-400">Location: {eq.location}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Included Services */}
              <div className="space-y-2">
                <h4 className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Covered / Included Services
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {contract.coveredServices?.map((srv, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center gap-1"
                    >
                      <Check className="w-3 h-3 text-emerald-500" />
                      {srv}
                    </span>
                  ))}
                </div>
              </div>

              {/* Excluded Services */}
              <div className="space-y-2">
                <h4 className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5" />
                  Excluded Services & Conditions
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {contract.excludedServices?.map((srv, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs flex items-center gap-1"
                    >
                      <X className="w-3 h-3 text-rose-500" />
                      {srv}
                    </span>
                  ))}
                </div>
              </div>

              {contract.coverageNotes && (
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-slate-400 block text-[10px] font-bold">Coverage & SLA Notes:</span>
                  <p className="text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap">
                    {contract.coverageNotes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: COMMERCIAL & INSTALLMENTS */}
          {activeTab === 'commercial' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl">
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Value:</span>
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {formatINR(contract.contractValue)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Frequency:</span>
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {contract.billingFrequency}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Payment Terms:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {contract.paymentTerms || 'Net 30 Days'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Renewal Terms:</span>
                  <span className="font-semibold text-slate-900 dark:text-white truncate block" title={contract.renewalTerms}>
                    {contract.renewalTerms || 'Standard'}
                  </span>
                </div>
              </div>

              {/* Installments Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">
                    Planned Commercial Billing Schedule
                  </h4>
                  <span className="text-[10px] text-slate-500">
                    Stage 1 Planning Reference
                  </span>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2 px-3">Installment #</th>
                      <th className="py-2 px-3">Scheduled Date</th>
                      <th className="py-2 px-3 text-right">Percentage</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {contract.plannedInstallments?.map((inst) => (
                      <tr key={inst.installmentNumber} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          Installment {inst.installmentNumber}
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                          {formatDate(inst.dueDate)}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-500">
                          {inst.percentage}%
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white">
                          {formatINR(inst.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: RENEWAL & HISTORY */}
          {activeTab === 'renewal' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {contract.previousContract ? (
                <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/30 space-y-2">
                  <span className="text-purple-600 dark:text-purple-400 font-bold text-[10px] uppercase tracking-wider block">
                    Prior Historical Contract (Renewed from)
                  </span>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                        {contract.previousContract.contractNumber}
                      </p>
                      <p className="text-slate-600 dark:text-slate-300 font-medium">
                        {contract.previousContract.title}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatINR(contract.previousContract.contractValue)}
                      </span>
                      <p className="text-[10px] text-slate-500">
                        {formatDate(contract.previousContract.startDate)} to {formatDate(contract.previousContract.endDate)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 italic p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg">
                  This contract was created as a new AMC, not a renewal.
                </p>
              )}

              {contract.renewedBy && (
                <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 space-y-2">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold text-[10px] uppercase tracking-wider block">
                    Succeeded by Renewal Contract
                  </span>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono font-bold text-indigo-600 dark:text-indigo-300 text-sm">
                        {contract.renewedBy.contractNumber}
                      </p>
                      <p className="text-slate-600 dark:text-slate-300 font-medium">
                        {contract.renewedBy.title}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                      {contract.renewedBy.status}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: DOCUMENTS & NOTES */}
          {activeTab === 'document' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {contract.documentPath ? (
                <div className="flex items-center justify-between p-4 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <File className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {contract.documentOriginalName || 'Signed Agreement Document'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {contract.documentMimeType || 'Document'} | Uploaded: {formatDate(contract.createdAt)}
                      </p>
                    </div>
                  </div>
                  <a
                    href={contract.documentPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download File
                  </a>
                </div>
              ) : (
                <p className="text-slate-400 italic p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg">
                  No signed agreement document has been uploaded for this contract yet.
                </p>
              )}

              {contract.internalNotes && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <span className="text-slate-400 block text-[10px] font-bold">Internal Administrative Notes:</span>
                  <p className="text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap">
                    {contract.internalNotes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition"
          >
            Close View
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AMCDetailModal;
