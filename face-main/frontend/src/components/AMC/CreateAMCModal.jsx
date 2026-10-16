import React, { useState, useEffect, useMemo } from 'react';
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
  Plus,
  Trash2,
  UploadCloud,
  File,
  Check,
  Info,
  Clock,
  Layers
} from 'lucide-react';
import toast from 'react-hot-toast';
import { amcAPI, leadAPI, projectAPI } from '../../utils/api';

const DEFAULT_COVERED_SERVICES = [
  'Quarterly Preventive Maintenance Visits',
  'Breakdown Call Support (Working Hours)',
  'Emergency 24x7 Breakdown Response',
  'Routine System Cleaning & Inspection',
  'Software & Firmware Diagnostics / Patches',
  'Labour & Service Charges Included',
  'Spare Parts Replacement (OEM)',
];

const DEFAULT_EXCLUDED_SERVICES = [
  'Physical or Water Damage',
  'Electrical Short-Circuit / Voltage Surges',
  'Consumable Items (Filters, Lubricants, Batteries)',
  'Unauthorized Third-Party Repairs / Modifications',
  'Civil & Structural Works',
  'Acts of God / Force Majeure Events',
];

const BILLING_FREQUENCIES = [
  'Annual',
  'Half-Yearly',
  'Quarterly',
  'Monthly',
  'One-Time',
];

const COVERAGE_TYPES = [
  'Comprehensive',
  'Non-Comprehensive',
  'Labor Only',
  'Preventive Only',
  'Custom',
];

const formatINR = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

const CreateAMCModal = ({
  isOpen,
  onClose,
  onSuccess,
  editContract = null,
  clients = [],
  projects = [],
  initialProjectId = '',
}) => {
  const isEdit = Boolean(editContract);

  // Dynamic state for clients and projects (fallback auto-fetch if empty)
  const [availableClients, setAvailableClients] = useState(clients || []);
  const [availableProjects, setAvailableProjects] = useState(projects || []);

  useEffect(() => {
    if (Array.isArray(clients) && clients.length > 0) {
      setAvailableClients(clients);
    }
  }, [clients]);

  useEffect(() => {
    if (Array.isArray(projects) && projects.length > 0) {
      setAvailableProjects(projects);
    }
  }, [projects]);

  useEffect(() => {
    if (!isOpen) return;

    if (!availableClients || availableClients.length === 0) {
      leadAPI.getLeads({ limit: 200 })
        .then((res) => {
          const raw = res.data?.data?.leads || res.data?.leads || res.data?.data || [];
          if (Array.isArray(raw) && raw.length > 0) {
            setAvailableClients(raw);
          }
        })
        .catch((err) => console.warn('Could not auto-fetch leads in CreateAMCModal:', err));
    }

    if (!availableProjects || availableProjects.length === 0) {
      projectAPI.getProjects({ limit: 200 })
        .then((res) => {
          const raw = Array.isArray(res.data?.data)
            ? res.data.data
            : (res.data?.data?.projects || res.data?.projects || []);
          if (Array.isArray(raw) && raw.length > 0) {
            setAvailableProjects(raw);
          }
        })
        .catch((err) => console.warn('Could not auto-fetch projects in CreateAMCModal:', err));
    }
  }, [isOpen, availableClients?.length, availableProjects?.length]);

  // Active section tab
  const [activeTab, setActiveTab] = useState('client'); // 'client' | 'details' | 'coverage' | 'commercial' | 'documents'

  // Section A: Client & Project
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [isStandalone, setIsStandalone] = useState(false);
  const [contractType, setContractType] = useState('New');
  const [previousContractId, setPreviousContractId] = useState('');
  const [existingClientContracts, setExistingClientContracts] = useState([]);

  // Section B: Contract Details
  const [title, setTitle] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [durationMonths, setDurationMonths] = useState(12);
  const [signingDate, setSigningDate] = useState('');
  const [contractStatus, setContractStatus] = useState('Draft');
  const [internalNotes, setInternalNotes] = useState('');

  // Section C: Coverage
  const [coverageType, setCoverageType] = useState('Comprehensive');
  const [availableEquipment, setAvailableEquipment] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [coveredServices, setCoveredServices] = useState(DEFAULT_COVERED_SERVICES.slice(0, 5));
  const [newCoveredService, setNewCoveredService] = useState('');
  const [excludedServices, setExcludedServices] = useState(DEFAULT_EXCLUDED_SERVICES.slice(0, 4));
  const [newExcludedService, setNewExcludedService] = useState('');
  const [preventiveVisitCount, setPreventiveVisitCount] = useState(4);
  const [coverageNotes, setCoverageNotes] = useState('');

  // Quick Add Equipment Sub-form
  const [showAddEquipment, setShowAddEquipment] = useState(false);
  const [newEqName, setNewEqName] = useState('');
  const [newEqModel, setNewEqModel] = useState('');
  const [newEqSerial, setNewEqSerial] = useState('');
  const [newEqLocation, setNewEqLocation] = useState('');
  const [savingEquipment, setSavingEquipment] = useState(false);

  // Section D: Commercial Terms
  const [contractValue, setContractValue] = useState(0);
  const [currency, setCurrency] = useState('INR');
  const [billingFrequency, setBillingFrequency] = useState('Quarterly');
  const [billingStartDate, setBillingStartDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30 Days');
  const [renewalTerms, setRenewalTerms] = useState('Auto-renewal with 30-day written notice. 5% standard annual escalation upon renewal.');
  const [commercialNotes, setCommercialNotes] = useState('');
  const [plannedInstallments, setPlannedInstallments] = useState([]);

  // Section E: Documents
  const [documentFile, setDocumentFile] = useState(null);
  const [existingDocPath, setExistingDocPath] = useState('');
  const [existingDocName, setExistingDocName] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Populate data when editing or opening
  useEffect(() => {
    if (editContract) {
      setClientId(editContract.clientId || '');
      setProjectId(editContract.projectId || '');
      setIsStandalone(!editContract.projectId);
      setContractType(editContract.contractType || 'New');
      setPreviousContractId(editContract.previousContractId || '');
      setTitle(editContract.title || '');
      setContractNumber(editContract.contractNumber || '');
      setStartDate(editContract.startDate || '');
      setEndDate(editContract.endDate || '');
      setDurationMonths(editContract.durationMonths || 12);
      setSigningDate(editContract.signingDate || '');
      setContractStatus(editContract.status || 'Draft');
      setInternalNotes(editContract.internalNotes || '');
      setCoverageType(editContract.coverageType || 'Comprehensive');
      setSelectedEquipment(editContract.coveredEquipment || []);
      setCoveredServices(editContract.coveredServices || DEFAULT_COVERED_SERVICES.slice(0, 5));
      setExcludedServices(editContract.excludedServices || DEFAULT_EXCLUDED_SERVICES.slice(0, 4));
      setPreventiveVisitCount(editContract.preventiveVisitCount ?? 4);
      setCoverageNotes(editContract.coverageNotes || '');
      setContractValue(editContract.contractValue || 0);
      setCurrency(editContract.currency || 'INR');
      setBillingFrequency(editContract.billingFrequency || 'Quarterly');
      setBillingStartDate(editContract.billingStartDate || editContract.startDate || '');
      setPaymentTerms(editContract.paymentTerms || 'Net 30 Days');
      setRenewalTerms(editContract.renewalTerms || '');
      setCommercialNotes(editContract.commercialNotes || '');
      setPlannedInstallments(editContract.plannedInstallments || []);
      setExistingDocPath(editContract.documentPath || '');
      setExistingDocName(editContract.documentOriginalName || '');
    } else {
      // Default new contract
      const today = new Date();
      const nextYear = new Date(today);
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      nextYear.setDate(nextYear.getDate() - 1);

      const todayStr = today.toISOString().slice(0, 10);
      const nextYearStr = nextYear.toISOString().slice(0, 10);

      if (initialProjectId) {
        setProjectId(initialProjectId);
        setIsStandalone(false);
        const matched = availableProjects.find((p) => String(p.id || p._id) === String(initialProjectId));
        if (matched?.leadId) {
          const lId = typeof matched.leadId === 'object' ? (matched.leadId._id || matched.leadId.id) : matched.leadId;
          setClientId(lId ? String(lId) : '');
        } else {
          setClientId('');
        }
      } else {
        setClientId('');
        setProjectId('');
        setIsStandalone(false);
      }
      setContractType('New');
      setPreviousContractId('');
      setTitle('');
      setContractNumber('');
      setStartDate(todayStr);
      setEndDate(nextYearStr);
      setDurationMonths(12);
      setSigningDate('');
      setContractStatus('Draft');
      setInternalNotes('');
      setCoverageType('Comprehensive');
      setSelectedEquipment([]);
      setCoveredServices(DEFAULT_COVERED_SERVICES.slice(0, 5));
      setExcludedServices(DEFAULT_EXCLUDED_SERVICES.slice(0, 4));
      setPreventiveVisitCount(4);
      setCoverageNotes('');
      setContractValue(120000);
      setCurrency('INR');
      setBillingFrequency('Quarterly');
      setBillingStartDate(todayStr);
      setPaymentTerms('Net 30 Days');
      setRenewalTerms('Auto-renewal with 30-day written notice. 5% standard annual escalation upon renewal.');
      setCommercialNotes('');
      setDocumentFile(null);
      setExistingDocPath('');
      setExistingDocName('');
      setActiveTab('client');
    }
  }, [editContract, isOpen, availableProjects]);

  // Get currently selected client record
  const selectedClient = useMemo(() => {
    if (!clientId) return null;
    return availableClients.find((c) => String(c.id || c._id) === String(clientId)) || null;
  }, [clientId, availableClients]);

  // Filter projects belonging to selected client (safely handles leadId as object or string, and clientName fallback)
  const { clientProjects, otherProjects } = useMemo(() => {
    if (!clientId) {
      return { clientProjects: availableProjects, otherProjects: [] };
    }

    const cId = String(clientId).trim();
    const clientCompany = selectedClient?.company?.trim().toLowerCase();
    const clientFirst = selectedClient?.firstName?.trim().toLowerCase();
    const clientLast = selectedClient?.lastName?.trim().toLowerCase();
    const clientFull = `${clientFirst || ''} ${clientLast || ''}`.trim();
    const clientDisplayName = (selectedClient?.companyName || selectedClient?.clientName || clientCompany || clientFull || '').toLowerCase();

    const matching = [];
    const others = [];

    availableProjects.forEach((p) => {
      const pLeadId = p.leadId?._id || p.leadId?.id || (typeof p.leadId === 'string' ? p.leadId : null);
      const pClientName = (p.clientName || '').trim().toLowerCase();

      const isMatch =
        (pLeadId && String(pLeadId) === cId) ||
        (clientCompany && pClientName === clientCompany) ||
        (clientFull && pClientName === clientFull) ||
        (clientDisplayName && pClientName === clientDisplayName);

      if (isMatch) {
        matching.push(p);
      } else {
        others.push(p);
      }
    });

    return { clientProjects: matching, otherProjects: others };
  }, [clientId, availableProjects, selectedClient]);

  // Handlers for bi-directional auto-linking between Client and Project
  const handleClientChange = (newClientId) => {
    setClientId(newClientId);

    if (!newClientId) {
      setProjectId('');
      return;
    }

    const cId = String(newClientId).trim();
    const clientObj = availableClients.find((c) => String(c.id || c._id) === cId);
    const clientCompany = clientObj?.company?.trim().toLowerCase();
    const clientFirst = clientObj?.firstName?.trim().toLowerCase();
    const clientLast = clientObj?.lastName?.trim().toLowerCase();
    const clientFull = `${clientFirst || ''} ${clientLast || ''}`.trim();
    const clientDisplayName = (clientObj?.companyName || clientObj?.clientName || clientCompany || clientFull || '').toLowerCase();

    // Find if this client has an existing project
    const matchingProject = availableProjects.find((p) => {
      const pLeadId = p.leadId?._id || p.leadId?.id || (typeof p.leadId === 'string' ? p.leadId : null);
      const pClientName = (p.clientName || '').trim().toLowerCase();
      return (
        (pLeadId && String(pLeadId) === cId) ||
        (clientCompany && pClientName === clientCompany) ||
        (clientFull && pClientName === clientFull) ||
        (clientDisplayName && pClientName === clientDisplayName)
      );
    });

    if (matchingProject) {
      const projId = String(matchingProject.id || matchingProject._id);
      setProjectId(projId);
      setIsStandalone(false);
      if (!title || title.startsWith('AMC - ')) {
        setTitle(`AMC - ${matchingProject.name}`);
      }
    } else {
      setProjectId('');
    }
  };

  const handleProjectChange = (newProjectId) => {
    setProjectId(newProjectId);
    if (!newProjectId) return;

    const proj = availableProjects.find((p) => String(p.id || p._id) === String(newProjectId));
    if (proj) {
      if (!title || title.startsWith('AMC - ')) {
        setTitle(`AMC - ${proj.name}`);
      }
      // If client is not yet selected or different, auto-link the client from this project
      const projLeadId = proj.leadId?._id || proj.leadId?.id || (typeof proj.leadId === 'string' ? proj.leadId : null);
      if (projLeadId && String(projLeadId) !== String(clientId)) {
        setClientId(String(projLeadId));
      } else if (!clientId && proj.clientName) {
        const matchingClient = availableClients.find((c) => {
          const comp = c.company?.trim().toLowerCase();
          const full = `${c.firstName || ''} ${c.lastName || ''}`.trim().toLowerCase();
          const name = (c.companyName || c.clientName || '').trim().toLowerCase();
          const pName = proj.clientName.trim().toLowerCase();
          return comp === pName || full === pName || name === pName;
        });
        if (matchingClient) {
          setClientId(String(matchingClient.id || matchingClient._id));
        }
      }
    }
  };

  // Auto-calculate duration and end date
  const handleStartDateChange = (val) => {
    setStartDate(val);
    if (!billingStartDate) setBillingStartDate(val);
    if (val && durationMonths) {
      const s = new Date(val);
      if (!isNaN(s.getTime())) {
        const e = new Date(s);
        e.setMonth(e.getMonth() + parseInt(durationMonths, 10));
        e.setDate(e.getDate() - 1);
        setEndDate(e.toISOString().slice(0, 10));
      }
    }
  };

  const handleDurationChange = (months) => {
    const m = parseInt(months, 10) || 12;
    setDurationMonths(m);
    if (startDate) {
      const s = new Date(startDate);
      if (!isNaN(s.getTime())) {
        const e = new Date(s);
        e.setMonth(e.getMonth() + m);
        e.setDate(e.getDate() - 1);
        setEndDate(e.toISOString().slice(0, 10));
      }
    }
  };

  // Fetch client equipment and previous contracts when client changes
  useEffect(() => {
    if (!clientId) {
      setAvailableEquipment([]);
      setExistingClientContracts([]);
      return;
    }

    const loadClientData = async () => {
      try {
        const [eqRes, contractRes] = await Promise.all([
          amcAPI.getEquipment({ clientId }),
          amcAPI.getContracts({ clientId, limit: 50 }),
        ]);

        if (eqRes.data?.success) {
          setAvailableEquipment(eqRes.data.data || []);
        }
        if (contractRes.data?.success) {
          const cList = contractRes.data.data || [];
          setExistingClientContracts(
            editContract ? cList.filter((c) => c.id !== editContract.id) : cList
          );
        }
      } catch (err) {
        console.error('Failed to fetch client details:', err);
      }
    };

    loadClientData();
  }, [clientId, editContract]);

  // Recalculate planned installments live
  useEffect(() => {
    const val = Number(contractValue) || 0;
    if (val <= 0 || !startDate) {
      setPlannedInstallments([]);
      return;
    }

    let count = 1;
    let step = 12;
    switch (billingFrequency) {
      case 'Monthly':
        count = Math.max(1, durationMonths);
        step = 1;
        break;
      case 'Quarterly':
        count = Math.max(1, Math.round(durationMonths / 3));
        step = 3;
        break;
      case 'Half-Yearly':
        count = Math.max(1, Math.round(durationMonths / 6));
        step = 6;
        break;
      case 'Annual':
      case 'One-Time':
      default:
        count = 1;
        step = durationMonths;
        break;
    }

    const raw = Math.floor((val / count) * 100) / 100;
    const installments = [];
    let acc = 0;
    const base = new Date(billingStartDate || startDate);

    for (let i = 0; i < count; i++) {
      const d = new Date(base);
      d.setMonth(d.getMonth() + i * step);
      const isLast = i === count - 1;
      const amt = isLast ? Math.round((val - acc) * 100) / 100 : raw;
      acc += amt;
      const pct = val > 0 ? Math.round((amt / val) * 10000) / 100 : 0;

      installments.push({
        installmentNumber: i + 1,
        dueDate: d.toISOString().slice(0, 10),
        amount: amt,
        percentage: pct,
      });
    }

    setPlannedInstallments(installments);
  }, [contractValue, billingFrequency, startDate, billingStartDate, durationMonths]);

  // Toggle equipment selection
  const toggleEquipment = (eqItem) => {
    const exists = selectedEquipment.some((item) => item.id === eqItem.id);
    if (exists) {
      setSelectedEquipment((prev) => prev.filter((item) => item.id !== eqItem.id));
    } else {
      setSelectedEquipment((prev) => [
        ...prev,
        {
          id: eqItem.id,
          equipmentName: eqItem.equipmentName,
          modelNumber: eqItem.modelNumber,
          serialNumber: eqItem.serialNumber,
          location: eqItem.location,
        },
      ]);
    }
  };

  // Add new equipment inline
  const handleCreateEquipment = async (e) => {
    e.preventDefault();
    if (!clientId) {
      toast.error('Please select a client first');
      return;
    }
    if (!newEqName.trim()) {
      toast.error('Equipment name is required');
      return;
    }

    try {
      setSavingEquipment(true);
      const res = await amcAPI.createEquipment({
        clientId,
        projectId: isStandalone ? null : projectId || null,
        equipmentName: newEqName.trim(),
        modelNumber: newEqModel.trim(),
        serialNumber: newEqSerial.trim(),
        location: newEqLocation.trim(),
      });

      if (res.data?.success) {
        const created = res.data.data;
        toast.success('Equipment added');
        setAvailableEquipment((prev) => [created, ...prev]);
        toggleEquipment(created);
        setNewEqName('');
        setNewEqModel('');
        setNewEqSerial('');
        setNewEqLocation('');
        setShowAddEquipment(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add equipment');
    } finally {
      setSavingEquipment(false);
    }
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!clientId) {
      toast.error('Client is required');
      setActiveTab('client');
      return;
    }

    if (!isStandalone && !projectId) {
      toast.error('Please select a related project or enable Standalone Client AMC');
      setActiveTab('client');
      return;
    }

    if (!title.trim()) {
      toast.error('Contract Title is required');
      setActiveTab('details');
      return;
    }

    if (!startDate || !endDate) {
      toast.error('Start date and End date are required');
      setActiveTab('details');
      return;
    }

    if (new Date(endDate) <= new Date(startDate)) {
      toast.error('Contract End date must be after Start date');
      setActiveTab('details');
      return;
    }

    if (contractValue < 0) {
      toast.error('Contract Value cannot be negative');
      setActiveTab('commercial');
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('clientId', clientId);
      if (!isStandalone && projectId) {
        formData.append('projectId', projectId);
      }
      formData.append('contractType', contractType);
      if (contractType === 'Renewal' && previousContractId) {
        formData.append('previousContractId', previousContractId);
      }
      formData.append('status', contractStatus);
      formData.append('startDate', startDate);
      formData.append('endDate', endDate);
      formData.append('durationMonths', durationMonths);
      if (signingDate) formData.append('signingDate', signingDate);
      if (internalNotes) formData.append('internalNotes', internalNotes);

      formData.append('coverageType', coverageType);
      formData.append('coveredEquipment', JSON.stringify(selectedEquipment));
      formData.append('coveredServices', JSON.stringify(coveredServices));
      formData.append('excludedServices', JSON.stringify(excludedServices));
      formData.append('preventiveVisitCount', preventiveVisitCount);
      if (coverageNotes) formData.append('coverageNotes', coverageNotes);

      formData.append('contractValue', contractValue);
      formData.append('currency', currency);
      formData.append('billingFrequency', billingFrequency);
      formData.append('billingStartDate', billingStartDate || startDate);
      formData.append('paymentTerms', paymentTerms);
      if (renewalTerms) formData.append('renewalTerms', renewalTerms);
      if (commercialNotes) formData.append('commercialNotes', commercialNotes);
      formData.append('plannedInstallments', JSON.stringify(plannedInstallments));

      if (documentFile) {
        formData.append('document', documentFile);
      }

      let res;
      if (isEdit) {
        res = await amcAPI.updateContract(editContract.id, formData);
      } else {
        res = await amcAPI.createContract(formData);
      }

      if (res.data?.success) {
        toast.success(res.data.message || (isEdit ? 'Contract updated' : 'Contract created'));
        onSuccess(res.data.data);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center ring-1 ring-indigo-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {isEdit ? `Edit AMC Contract (${editContract.contractNumber})` : 'Create Annual Maintenance Contract'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure client, coverage, commercial terms, and signed documents
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none bg-white dark:bg-slate-900">
          {[
            { id: 'client', label: '1. Client & Project', icon: Building2 },
            { id: 'details', label: '2. Contract Details', icon: FileText },
            { id: 'coverage', label: '3. Coverage & SLA', icon: Layers },
            { id: 'commercial', label: '4. Commercial Terms', icon: DollarSign },
            { id: 'documents', label: '5. Documents', icon: UploadCloud },
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
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: CLIENT & PROJECT */}
          {activeTab === 'client' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Client Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Client / Customer <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={clientId}
                    onChange={(e) => handleClientChange(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition text-slate-900 dark:text-white"
                  >
                    <option value="">Select Existing Client...</option>
                    {availableClients.map((c) => {
                      const id = String(c.id || c._id);
                      const contactName = [c.firstName, c.lastName].filter(Boolean).join(' ').trim();
                      const companyName = (c.company || c.companyName || '').trim();
                      const displayName = companyName && contactName && companyName.toLowerCase() !== contactName.toLowerCase()
                        ? `${companyName} (${contactName})`
                        : (companyName || contactName || c.clientName || c.name || 'Client');
                      return (
                        <option key={id} value={id}>
                          {displayName} {c.email ? `• ${c.email}` : ''}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">Reuses existing client accounts without duplicates.</p>
                </div>

                {/* Contract Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Contract Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setContractType('New')}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border text-center transition ${
                        contractType === 'New'
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 ring-1 ring-indigo-500'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      New AMC
                    </button>
                    <button
                      type="button"
                      onClick={() => setContractType('Renewal')}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border text-center transition ${
                        contractType === 'Renewal'
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 ring-1 ring-indigo-500'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      Renewal AMC
                    </button>
                  </div>
                </div>
              </div>

              {/* Renewal Reference */}
              {contractType === 'Renewal' && (
                <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900 dark:text-indigo-200">
                    <Info className="w-4 h-4 text-indigo-500" />
                    Previous AMC Contract Reference
                  </div>
                  <select
                    value={previousContractId}
                    onChange={(e) => setPreviousContractId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-indigo-200 dark:border-indigo-900/60 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="">Select Prior AMC to link renewal...</option>
                    {existingClientContracts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.contractNumber} — {c.title} ({c.startDate} to {c.endDate}) [{c.status}]
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                    Linking preserves historical records while designating the prior contract as Renewed.
                  </p>
                </div>
              )}

              {/* Standalone AMC Checkbox */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl">
                <div>
                  <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Standalone Client Contract (No Project Linkage)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Check if this AMC is directly for the client facility rather than a specific project.
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="standalone-toggle"
                  checked={isStandalone}
                  onChange={(e) => {
                    setIsStandalone(e.target.checked);
                    if (e.target.checked) setProjectId('');
                  }}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
              </div>

              {/* Project Selection */}
              {!isStandalone && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Related Project <span className="text-rose-500">*</span>
                    </label>
                    {projectId && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Project linked
                      </span>
                    )}
                  </div>
                  <select
                    value={projectId}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    required={!isStandalone}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition text-slate-900 dark:text-white"
                  >
                    <option value="">
                      {clientId
                        ? (clientProjects.length > 0 ? 'Select Project for this client...' : '-- No project linked to this client (choose from other projects below) --')
                        : 'Select Project...'}
                    </option>
                    {clientId && clientProjects.length > 0 && (
                      <optgroup label={`Projects for Selected Client (${clientProjects.length})`}>
                        {clientProjects.map((p) => (
                          <option key={p.id || p._id} value={p.id || p._id}>
                            {p.projectCode} — {p.name} ({p.status})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {(!clientId || clientProjects.length === 0) && clientProjects.map((p) => (
                      <option key={p.id || p._id} value={p.id || p._id}>
                        {p.projectCode} — {p.name} ({p.status})
                      </option>
                    ))}
                    {clientId && otherProjects.length > 0 && (
                      <optgroup label="Other Available Projects">
                        {otherProjects.map((p) => (
                          <option key={p.id || p._id} value={p.id || p._id}>
                            {p.projectCode} — {p.name} ({p.status})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Validated against client relationships. Original project status and warranty remain completely untouched.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CONTRACT DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Contract Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Annual Maintenance Contract for MEP Systems 2026-27"
                  required
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Duration (Months)
                  </label>
                  <select
                    value={durationMonths}
                    onChange={(e) => handleDurationChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition text-slate-900 dark:text-white"
                  >
                    <option value={3}>3 Months (Quarterly)</option>
                    <option value={6}>6 Months (Half-Year)</option>
                    <option value={12}>12 Months (1 Year)</option>
                    <option value={24}>24 Months (2 Years)</option>
                    <option value={36}>36 Months (3 Years)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    End Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Agreement Signing Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={signingDate}
                    onChange={(e) => setSigningDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Initial Status
                  </label>
                  <select
                    value={contractStatus}
                    onChange={(e) => setContractStatus(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition text-slate-900 dark:text-white"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Pending Approval">Pending Approval</option>
                    <option value="Active">Active</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Internal Notes
                </label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  rows={2}
                  placeholder="Internal administrative or client relationship notes..."
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* TAB 3: COVERAGE & SLA */}
          {activeTab === 'coverage' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Coverage Scope Type
                  </label>
                  <select
                    value={coverageType}
                    onChange={(e) => setCoverageType(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition text-slate-900 dark:text-white"
                  >
                    {COVERAGE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Planned Preventive Maintenance Visits
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={52}
                    value={preventiveVisitCount}
                    onChange={(e) => setPreventiveVisitCount(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition text-slate-900 dark:text-white"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Visits agreed during contract period (e.g. 4 for quarterly)</p>
                </div>
              </div>

              {/* Covered Equipment Selection */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Covered Customer Equipment ({selectedEquipment.length} selected)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Select specific client equipment units covered under this AMC contract.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddEquipment(!showAddEquipment)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {showAddEquipment ? 'Cancel' : 'Add New Equipment'}
                  </button>
                </div>

                {/* Inline Add Equipment Form */}
                {showAddEquipment && (
                  <div className="p-3 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-lg space-y-3 animate-in fade-in duration-150">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Quick Add Equipment</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <input
                        type="text"
                        placeholder="Equipment Name *"
                        value={newEqName}
                        onChange={(e) => setNewEqName(e.target.value)}
                        className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded text-slate-900 dark:text-white"
                      />
                      <input
                        type="text"
                        placeholder="Model Number"
                        value={newEqModel}
                        onChange={(e) => setNewEqModel(e.target.value)}
                        className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded text-slate-900 dark:text-white"
                      />
                      <input
                        type="text"
                        placeholder="Serial Number"
                        value={newEqSerial}
                        onChange={(e) => setNewEqSerial(e.target.value)}
                        className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded text-slate-900 dark:text-white"
                      />
                      <input
                        type="text"
                        placeholder="Installation Location"
                        value={newEqLocation}
                        onChange={(e) => setNewEqLocation(e.target.value)}
                        className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded text-slate-900 dark:text-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateEquipment}
                      disabled={savingEquipment}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-700 transition"
                    >
                      {savingEquipment ? 'Saving...' : 'Save & Select Equipment'}
                    </button>
                  </div>
                )}

                {/* Available Equipment List */}
                {availableEquipment.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">
                    No customer equipment registered yet for this client. You can add equipment above or proceed with service-only coverage.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {availableEquipment.map((eqItem) => {
                      const isSelected = selectedEquipment.some((item) => item.id === eqItem.id);
                      return (
                        <div
                          key={eqItem.id}
                          onClick={() => toggleEquipment(eqItem)}
                          className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer text-xs transition ${
                            isSelected
                              ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 text-indigo-900 dark:text-indigo-200'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="mt-0.5 rounded text-indigo-600 focus:ring-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{eqItem.equipmentName}</p>
                            <p className="text-[10px] text-slate-500 truncate">
                              Model: {eqItem.modelNumber || 'N/A'} | S/N: {eqItem.serialNumber || 'N/A'}
                            </p>
                            {eqItem.location && (
                              <p className="text-[10px] text-slate-400 truncate">Loc: {eqItem.location}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Covered Services Pills */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Included / Covered Services
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {coveredServices.map((srv, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full"
                    >
                      <Check className="w-3 h-3 text-emerald-500" />
                      {srv}
                      <button
                        type="button"
                        onClick={() => setCoveredServices((prev) => prev.filter((_, i) => i !== idx))}
                        className="hover:text-rose-500 ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add custom covered service..."
                    value={newCoveredService}
                    onChange={(e) => setNewCoveredService(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newCoveredService.trim()) {
                        setCoveredServices((prev) => [...prev, newCoveredService.trim()]);
                        setNewCoveredService('');
                      }
                    }}
                    className="px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold rounded-lg"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Excluded Services Pills */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Excluded Services & Situations
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {excludedServices.map((srv, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-full"
                    >
                      <X className="w-3 h-3 text-rose-500" />
                      {srv}
                      <button
                        type="button"
                        onClick={() => setExcludedServices((prev) => prev.filter((_, i) => i !== idx))}
                        className="hover:text-rose-600 ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add custom excluded situation..."
                    value={newExcludedService}
                    onChange={(e) => setNewExcludedService(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newExcludedService.trim()) {
                        setExcludedServices((prev) => [...prev, newExcludedService.trim()]);
                        setNewExcludedService('');
                      }
                    }}
                    className="px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold rounded-lg"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Additional Coverage & SLA Notes
                </label>
                <textarea
                  value={coverageNotes}
                  onChange={(e) => setCoverageNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. 4-hour critical response time SLA, standby technician availability on holidays..."
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* TAB 4: COMMERCIAL TERMS */}
          {activeTab === 'commercial' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Contract Value (INR) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      min={0}
                      value={contractValue}
                      onChange={(e) => setContractValue(e.target.value)}
                      required
                      className="w-full pl-7 pr-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Billing Frequency
                  </label>
                  <select
                    value={billingFrequency}
                    onChange={(e) => setBillingFrequency(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    {BILLING_FREQUENCIES.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Billing Start Date
                  </label>
                  <input
                    type="date"
                    value={billingStartDate}
                    onChange={(e) => setBillingStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    placeholder="e.g. Net 30 Days, In Advance"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Renewal Terms
                  </label>
                  <input
                    type="text"
                    value={renewalTerms}
                    onChange={(e) => setRenewalTerms(e.target.value)}
                    placeholder="e.g. 5% annual escalation"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Planned Installments Preview */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    Planned Commercial Installment Breakdown ({plannedInstallments.length} Installments)
                  </h4>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                    Calculated for schedule planning only. Invoices are NOT auto-generated.
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500">
                        <th className="py-1.5 px-2">Installment #</th>
                        <th className="py-1.5 px-2">Scheduled Due Date</th>
                        <th className="py-1.5 px-2 text-right">Percentage</th>
                        <th className="py-1.5 px-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {plannedInstallments.map((inst) => (
                        <tr key={inst.installmentNumber} className="text-slate-700 dark:text-slate-300">
                          <td className="py-2 px-2 font-semibold">Installment {inst.installmentNumber}</td>
                          <td className="py-2 px-2">{inst.dueDate}</td>
                          <td className="py-2 px-2 text-right text-slate-500">{inst.percentage}%</td>
                          <td className="py-2 px-2 text-right font-bold text-slate-900 dark:text-white">
                            {formatINR(inst.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Signed AMC Agreement Document
              </label>

              {existingDocPath && !documentFile && (
                <div className="flex items-center justify-between p-3.5 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs">
                  <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-medium">
                    <File className="w-4 h-4 text-indigo-500" />
                    <span>Current document: {existingDocName || 'AMC Agreement File'}</span>
                  </div>
                  <a
                    href={existingDocPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                  >
                    View File
                  </a>
                </div>
              )}

              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center hover:border-indigo-500 transition bg-slate-50/30 dark:bg-slate-800/20">
                <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {documentFile ? documentFile.name : 'Upload signed contract agreement'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 mb-3">
                  Allowed formats: PDF, DOC, DOCX, JPG, PNG (Max 15MB)
                </p>
                <input
                  type="file"
                  id="amc-file-input"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setDocumentFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <label
                  htmlFor="amc-file-input"
                  className="inline-block px-4 py-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold cursor-pointer hover:bg-indigo-100 transition"
                >
                  {documentFile ? 'Choose Different File' : 'Browse Files'}
                </label>
              </div>
            </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            {activeTab !== 'client' && (
              <button
                type="button"
                onClick={() => {
                  const tabs = ['client', 'details', 'coverage', 'commercial', 'documents'];
                  const curIdx = tabs.indexOf(activeTab);
                  if (curIdx > 0) setActiveTab(tabs[curIdx - 1]);
                }}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Previous Step
              </button>
            )}
            {activeTab !== 'documents' && (
              <button
                type="button"
                onClick={() => {
                  const tabs = ['client', 'details', 'coverage', 'commercial', 'documents'];
                  const curIdx = tabs.indexOf(activeTab);
                  if (curIdx < tabs.length - 1) setActiveTab(tabs[curIdx + 1]);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg hover:bg-indigo-100 transition"
              >
                Next Step
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm transition disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {submitting ? 'Saving Contract...' : isEdit ? 'Update Contract' : 'Create AMC Contract'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CreateAMCModal;
