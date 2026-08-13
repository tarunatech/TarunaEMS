import React, { useEffect, useState } from 'react';
import { CheckCircle, FileText, Loader2, Send, ShieldCheck, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { salesPipelineAPI } from '../../utils/api';

const stages = [
  ['client_details', 'Client Details'],
  ['quotation', 'Quotation Details'],
  ['admin_approval', 'Admin Approval'],
  ['sent_to_client', 'Sent to Client'],
  ['negotiation', 'Negotiation'],
  ['won_closed', 'Won / Closed']
];

const emptyForms = {
  clientDetails: { requirements: '', decisionMaker: '', businessNeed: '', budgetRange: '', timeline: '', notes: '' },
  quotation: { quotationNumber: '', amount: '', currency: 'INR', validUntil: '', notes: '', fileUrl: '' },
  sentToClient: { sentAt: '', method: 'Email', recipientEmail: '', notes: '' },
  negotiation: { expectedCloseDate: '', notes: '' },
  outcome: { status: 'open', finalValue: '', reason: '', notes: '' }
};

const toInputDate = (value) => value ? new Date(value).toISOString().slice(0, 10) : '';
const toInputDateTime = (value) => value ? new Date(value).toISOString().slice(0, 16) : '';
const formatDateTime = (value) => value ? new Date(value).toLocaleString() : '-';

const SalesPipelineModal = ({ lead, role = 'employee', onClose, onUpdated, embedded = false }) => {
  const [pipeline, setPipeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeStage, setActiveStage] = useState('client_details');
  const [approvalComments, setApprovalComments] = useState('');
  const [forms, setForms] = useState(emptyForms);

  const isAdmin = role === 'admin';

  const loadPipeline = async () => {
    try {
      setLoading(true);
      const res = await salesPipelineAPI.getByLead(lead._id);
      if (res.data.success) {
        hydrate(res.data.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load pipeline');
    } finally {
      setLoading(false);
    }
  };

  const hydrate = (data) => {
    setPipeline(data);
    setActiveStage(prev => prev || data.currentStage || 'client_details');
    setForms({
      clientDetails: {
        ...emptyForms.clientDetails,
        ...(data.clientDetails || {})
      },
      quotation: {
        ...emptyForms.quotation,
        ...(data.quotation || {}),
        validUntil: toInputDate(data.quotation?.validUntil),
        amount: data.quotation?.amount || ''
      },
      sentToClient: {
        ...emptyForms.sentToClient,
        ...(data.sentToClient || {}),
        sentAt: toInputDateTime(data.sentToClient?.sentAt),
        recipientEmail: data.sentToClient?.recipientEmail || lead.email || ''
      },
      negotiation: {
        ...emptyForms.negotiation,
        ...(data.negotiation || {}),
        expectedCloseDate: toInputDate(data.negotiation?.expectedCloseDate)
      },
      outcome: {
        ...emptyForms.outcome,
        ...(data.outcome || {}),
        finalValue: data.outcome?.finalValue || ''
      }
    });
  };

  useEffect(() => {
    if (lead?._id) loadPipeline();
  }, [lead?._id]);

  const updateForm = (section, key, value) => {
    setForms(prev => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
  };

  const saveSection = async (section) => {
    try {
      setSaving(true);
      const res = await salesPipelineAPI.updateSection(lead._id, section, forms[section]);
      if (res.data.success) {
        hydrate(res.data.data);
        onUpdated?.();
        toast.success('Pipeline updated');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update pipeline');
    } finally {
      setSaving(false);
    }
  };

  const transition = async (stage, comments) => {
    try {
      setSaving(true);
      const res = await salesPipelineAPI.transitionStage(lead._id, { stage, comments });
      if (res.data.success) {
        hydrate(res.data.data);
        onUpdated?.();
        toast.success('Stage updated');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update stage');
    } finally {
      setSaving(false);
    }
  };

  const approve = async (status) => {
    try {
      setSaving(true);
      const res = await salesPipelineAPI.updateApproval(lead._id, { status, comments: approvalComments });
      if (res.data.success) {
        hydrate(res.data.data);
        setApprovalComments('');
        onUpdated?.();
        toast.success('Approval updated');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update approval');
    } finally {
      setSaving(false);
    }
  };

  const content = (
      <div className={`${embedded ? 'w-full' : 'pipeline-modal-scroll max-h-[92vh] w-full max-w-5xl overflow-y-auto'} rounded-xl border border-slate-200 bg-white p-4 shadow-xl sm:p-6`}>
        <style>{`
          @keyframes pipelineStageIn {
            from { opacity: 0; transform: translateY(10px) scale(0.99); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          .pipeline-stage-panel {
            animation: pipelineStageIn 0.28s ease-out both;
          }
          .pipeline-modal-scroll {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .pipeline-modal-scroll::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Sales Pipeline</h2>
            <p className="text-sm text-slate-500">{lead.firstName} {lead.lastName} • {lead.company || 'No company'}</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <XCircle className="h-5 w-5" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600" />
            Loading pipeline...
          </div>
        ) : (
          <div className="space-y-5">
            <StageStepper currentStage={pipeline?.currentStage} activeStage={activeStage} onSelect={setActiveStage} />

            <div key={activeStage} className="pipeline-stage-panel rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm sm:p-5">
            {activeStage === 'client_details' && (
            <section>
              <StageHeading title="Client Details" subtitle="Core lead information and qualification notes" />
              <div className="grid gap-3 text-sm sm:grid-cols-3">
                <Info label="Name" value={`${lead.firstName} ${lead.lastName}`} />
                <Info label="Email" value={lead.email} />
                <Info label="Phone" value={lead.phone} />
                <Info label="Company" value={lead.company || '-'} />
                <Info label="Estimated Value" value={lead.estimatedValue ? `₹${lead.estimatedValue.toLocaleString()}` : '-'} />
                <Info label="Lead Status" value={lead.status} />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Input label="Decision Maker" value={forms.clientDetails.decisionMaker} onChange={v => updateForm('clientDetails', 'decisionMaker', v)} />
                <Input label="Budget Range" value={forms.clientDetails.budgetRange} onChange={v => updateForm('clientDetails', 'budgetRange', v)} />
                <Input label="Timeline" value={forms.clientDetails.timeline} onChange={v => updateForm('clientDetails', 'timeline', v)} />
                <Input label="Business Need" value={forms.clientDetails.businessNeed} onChange={v => updateForm('clientDetails', 'businessNeed', v)} />
                <Textarea label="Requirements" value={forms.clientDetails.requirements} onChange={v => updateForm('clientDetails', 'requirements', v)} />
                <Textarea label="Notes" value={forms.clientDetails.notes} onChange={v => updateForm('clientDetails', 'notes', v)} />
              </div>
              <SectionActions onSave={() => saveSection('clientDetails')} disabled={saving} />
            </section>
            )}

            {activeStage === 'quotation' && (
            <section>
              <StageHeading title="Quotation Details" subtitle="Prepare pricing, validity, and quotation notes" icon={<FileText className="h-4 w-4 text-blue-600" />} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Quotation Number" value={forms.quotation.quotationNumber} onChange={v => updateForm('quotation', 'quotationNumber', v)} />
                <Input label="Amount" type="number" value={forms.quotation.amount} onChange={v => updateForm('quotation', 'amount', v)} />
                <Input label="Currency" value={forms.quotation.currency} onChange={v => updateForm('quotation', 'currency', v)} />
                <Input label="Valid Until" type="date" value={forms.quotation.validUntil} onChange={v => updateForm('quotation', 'validUntil', v)} />
                <Input label="Quotation File URL" value={forms.quotation.fileUrl} onChange={v => updateForm('quotation', 'fileUrl', v)} />
                <Textarea label="Quotation Notes" value={forms.quotation.notes} onChange={v => updateForm('quotation', 'notes', v)} />
              </div>
              <SectionActions onSave={() => saveSection('quotation')} disabled={saving} />
              <button onClick={() => transition('admin_approval', 'Submitted quotation for approval')} disabled={saving} className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                Submit for Approval
              </button>
            </section>
            )}

            {activeStage === 'admin_approval' && (
            <section>
              <StageHeading title="Admin Approval" subtitle="Track approval status and admin comments" icon={<ShieldCheck className="h-4 w-4 text-indigo-600" />} />
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge status={pipeline?.approval?.status} />
                <span className="text-xs text-slate-500">Submitted: {formatDateTime(pipeline?.approval?.submittedAt)}</span>
              </div>
              {isAdmin && (
                <div className="rounded-xl bg-slate-50 p-3">
                  <Textarea label="Approval Comments" value={approvalComments} onChange={setApprovalComments} />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => approve('approved')} disabled={saving} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Approve</button>
                    <button onClick={() => approve('rejected')} disabled={saving} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700">Reject</button>
                    <button onClick={() => approve('revision_requested')} disabled={saving} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100">Request Revision</button>
                  </div>
                </div>
              )}
            </section>
            )}

            {activeStage === 'sent_to_client' && (
            <section>
              <StageHeading title="Sent to Client" subtitle="Record when and how the quotation was sent" icon={<Send className="h-4 w-4 text-blue-600" />} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Sent At" type="datetime-local" value={forms.sentToClient.sentAt} onChange={v => updateForm('sentToClient', 'sentAt', v)} />
                <Select label="Method" value={forms.sentToClient.method} onChange={v => updateForm('sentToClient', 'method', v)} options={['Email', 'WhatsApp', 'Portal', 'In-Person', 'Other']} />
                <Input label="Recipient Email" value={forms.sentToClient.recipientEmail} onChange={v => updateForm('sentToClient', 'recipientEmail', v)} />
                <Textarea label="Send Notes" value={forms.sentToClient.notes} onChange={v => updateForm('sentToClient', 'notes', v)} />
              </div>
              <SectionActions onSave={() => saveSection('sentToClient')} disabled={saving} />
            </section>
            )}

            {activeStage === 'negotiation' && (
            <section>
              <StageHeading title="Negotiation" subtitle="Capture closing date expectations and negotiation notes" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Expected Close Date" type="date" value={forms.negotiation.expectedCloseDate} onChange={v => updateForm('negotiation', 'expectedCloseDate', v)} />
                <Textarea label="Negotiation Notes" value={forms.negotiation.notes} onChange={v => updateForm('negotiation', 'notes', v)} />
              </div>
              <SectionActions onSave={() => saveSection('negotiation')} disabled={saving} />
            </section>
            )}

            {activeStage === 'won_closed' && (
            <section>
              <StageHeading title="Won / Closed" subtitle="Finalize the outcome and closure details" icon={<CheckCircle className="h-4 w-4 text-emerald-600" />} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Select label="Outcome" value={forms.outcome.status} onChange={v => updateForm('outcome', 'status', v)} options={['open', 'won', 'lost']} />
                <Input label="Final Value" type="number" value={forms.outcome.finalValue} onChange={v => updateForm('outcome', 'finalValue', v)} />
                <Input label="Reason" value={forms.outcome.reason} onChange={v => updateForm('outcome', 'reason', v)} />
                <Textarea label="Outcome Notes" value={forms.outcome.notes} onChange={v => updateForm('outcome', 'notes', v)} />
              </div>
              <SectionActions onSave={() => saveSection('outcome')} disabled={saving} />
            </section>
            )}
            </div>

            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="mb-3 text-sm font-bold text-slate-900">Stage History</h3>
              <div className="space-y-2">
                {(pipeline?.stageHistory || []).slice().reverse().map((item, index) => (
                  <div key={`${item.toStage}-${item.changedAt}-${index}`} className="text-xs text-slate-600">
                    <span className="font-semibold text-slate-900">{labelForStage(item.toStage)}</span>
                    <span> • {formatDateTime(item.changedAt)}</span>
                    {item.changedBy?.name && <span> • {item.changedBy.name}</span>}
                    {item.comments && <span> • {item.comments}</span>}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
  );

  if (embedded) return content;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/30 p-3 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="w-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
        {content}
      </div>
    </div>
  );
};

const labelForStage = (stage) => stages.find(([value]) => value === stage)?.[1] || stage;

const StageStepper = ({ currentStage, activeStage, onSelect }) => {
  const currentIndex = stages.findIndex(([value]) => value === currentStage);
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-2 shadow-inner">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        {stages.map(([value, label], index) => {
          const isActive = activeStage === value;
          const isReached = currentIndex >= 0 && index <= currentIndex;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onSelect(value)}
              className={`group relative min-h-12 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-all duration-300 ${
                isActive
                  ? 'border-indigo-300 bg-white text-indigo-700 shadow-md shadow-indigo-900/10 ring-2 ring-indigo-100'
                  : isReached
                    ? 'border-blue-100 bg-blue-50/70 text-blue-700 hover:border-blue-200 hover:bg-white'
                    : 'border-slate-200 bg-white/70 text-slate-500 hover:border-slate-300 hover:bg-white hover:text-slate-700'
              }`}
            >
              <span className={`mb-1 block h-1 w-8 rounded-full transition-all duration-300 ${isActive ? 'bg-indigo-500' : isReached ? 'bg-blue-400' : 'bg-slate-200'}`} />
              <span className="block leading-snug">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const StageHeading = ({ title, subtitle, icon }) => (
  <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
    <div>
      <div className="flex items-center gap-2">
        {icon && <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200">{icon}</span>}
        <h3 className="text-base font-bold text-slate-950">{title}</h3>
      </div>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
  </div>
);

const Badge = ({ status }) => {
  const classes = {
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    revision_requested: 'bg-amber-100 text-amber-700',
    pending: 'bg-blue-100 text-blue-700',
    not_submitted: 'bg-slate-100 text-slate-600'
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${classes[status] || classes.not_submitted}`}>{(status || 'not_submitted').replaceAll('_', ' ')}</span>;
};

const Info = ({ label, value }) => (
  <div>
    <p className="text-xs text-slate-500">{label}</p>
    <p className="font-medium text-slate-900">{value || '-'}</p>
  </div>
);

const Input = ({ label, value, onChange, type = 'text' }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
    <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
  </label>
);

const Textarea = ({ label, value, onChange }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
    <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} rows="3" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
  </label>
);

const Select = ({ label, value, onChange, options }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
    <select value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
      {options.map(option => <option key={option} value={option}>{option}</option>)}
    </select>
  </label>
);

const SectionActions = ({ onSave, disabled }) => (
  <div className="mt-3 flex justify-end">
    <button onClick={onSave} disabled={disabled} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
      Save Section
    </button>
  </div>
);

export default SalesPipelineModal;
