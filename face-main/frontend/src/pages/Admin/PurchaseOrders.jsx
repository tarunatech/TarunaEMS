import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AdminLayout from '../../components/Admin/layout/AdminLayout';
import {
  FileText, Plus, Search, Filter, Download, Edit3, Trash2, Eye,
  XCircle, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { leadAPI, purchaseAPI } from '../../utils/api';

const SERVICE_TYPES = [
  'Domain',
  'Hosting',
  'VPS Server',
  'Cloud Server',
  'SSL Certificate',
  'Business Email',
  'API Subscription',
  'Software License',
  'Other'
];

const VENDORS = [
  'GoDaddy',
  'Namecheap',
  'Hostinger',
  'AWS',
  'Azure',
  'Google Cloud',
  'Cloudflare',
  'DigitalOcean',
  'OpenAI',
  'Twilio',
  'Razorpay',
  'Other'
];

const BILLING_CYCLES = ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'One Time'];
const STATUSES = ['Active', 'Pending', 'Expired', 'Cancelled'];

const serviceMeta = {
  Domain: { label: 'Domain', icon: '🌐', color: 'text-blue-700 bg-blue-50 border border-blue-100' },
  Hosting: { label: 'Hosting', icon: '☁️', color: 'text-cyan-700 bg-cyan-50 border border-cyan-100' },
  'VPS Server': { label: 'VPS', icon: '🖥️', color: 'text-violet-700 bg-violet-50 border border-violet-100' },
  'Cloud Server': { label: 'Hosting', icon: '☁️', color: 'text-sky-700 bg-sky-50 border border-sky-100' },
  'SSL Certificate': { label: 'SSL', icon: '🔒', color: 'text-emerald-700 bg-emerald-50 border border-emerald-100' },
  'Business Email': { label: 'Email', icon: '📧', color: 'text-indigo-700 bg-indigo-50 border border-indigo-100' },
  'API Subscription': { label: 'API', icon: '🤖', color: 'text-amber-700 bg-amber-50 border border-amber-100' },
  'Software License': { label: 'License', icon: '💻', color: 'text-slate-700 bg-slate-50 border border-slate-200' },
  Other: { label: 'Other', icon: '•', color: 'text-slate-700 bg-slate-50 border border-slate-200' }
};

const defaultForm = () => ({
  client: '',
  clientName: '',
  project: '',
  serviceType: 'Domain',
  vendor: 'GoDaddy',
  serviceName: '',
  billingCycle: 'Yearly',
  purchaseDate: new Date().toISOString().slice(0, 10),
  renewalDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10),
  amount: '',
  status: 'Active',
  notes: ''
});

const getStoredOptions = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value.filter(Boolean) : [];
  } catch {
    return [];
  }
};

const mergeOptions = (...groups) => [...new Set(groups.flat().filter(Boolean).map(option => String(option).trim()).filter(Boolean))];

const PurchaseOrders = () => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    vendor: '',
    serviceType: 'all',
    renewalMonth: '',
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [formData, setFormData] = useState(defaultForm());
  const [customClients, setCustomClients] = useState(() => getStoredOptions('itPurchaseClients'));
  const [customProjects, setCustomProjects] = useState(() => getStoredOptions('itPurchaseProjects'));
  const [customServiceTypes, setCustomServiceTypes] = useState(() => getStoredOptions('itPurchaseServiceTypes'));
  const [customVendors, setCustomVendors] = useState(() => getStoredOptions('itPurchaseVendors'));

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [poRes, leadRes] = await Promise.all([
        purchaseAPI.getPurchaseOrders(filters),
        leadAPI.getLeads({ includeAll: true, status: 'Won', limit: 200 })
      ]);

      if (poRes.data.success) setPurchaseOrders(poRes.data.data.purchaseOrders || []);
      if (leadRes.data.success) setClients(leadRes.data.data.leads || []);
    } catch (err) {
      console.error('Failed to load service purchases:', err);
      toast.error('Failed to load service purchases');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getClientName = (client) => client?.company || `${client?.firstName || ''} ${client?.lastName || ''}`.trim() || client?.email || 'Client';

  const selectedClient = useMemo(
    () => clients.find(client => client._id === formData.client),
    [clients, formData.client]
  );

  const projectOptions = useMemo(() => {
    if (!selectedClient) return customProjects;
    const options = [
      selectedClient.company,
      ...(selectedClient.interestedProducts || []),
      ...customProjects
    ].filter(Boolean);
    return [...new Set(options)];
  }, [selectedClient, customProjects]);

  const clientOptions = useMemo(
    () => mergeOptions(clients.map(client => getClientName(client)), customClients),
    [clients, customClients]
  );
  const serviceTypeOptions = useMemo(() => mergeOptions(SERVICE_TYPES, customServiceTypes), [customServiceTypes]);
  const vendorOptions = useMemo(() => mergeOptions(VENDORS, customVendors), [customVendors]);

  const getPOClientName = (po) => po.clientName || getClientName(po.client);
  const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString()}`;
  const formatDate = (date) => date ? new Date(date).toLocaleDateString() : '—';
  const formatDateInput = (date) => date ? new Date(date).toISOString().slice(0, 10) : '';

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'text-emerald-700 bg-emerald-50 border border-emerald-100';
      case 'Pending': return 'text-amber-700 bg-amber-50 border border-amber-100';
      case 'Expired': return 'text-red-700 bg-red-50 border border-red-100';
      case 'Cancelled': return 'text-slate-600 bg-slate-100 border border-slate-200';
      default: return 'text-slate-600 bg-slate-100 border border-slate-200';
    }
  };

  const getRenewalBadge = (po) => {
    const renewal = po.renewalDate ? new Date(po.renewalDate) : null;
    if (!renewal) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.ceil((renewal - today) / 86400000);

    if (days < 0 || po.status === 'Expired') return { label: 'Expired', color: 'text-red-700 bg-red-50 border border-red-100' };
    if (days <= 30) return { label: 'Renewal soon', color: 'text-orange-700 bg-orange-50 border border-orange-100' };
    if (po.status === 'Active') return { label: 'Active', color: 'text-emerald-700 bg-emerald-50 border border-emerald-100' };
    return null;
  };

  const ServiceBadge = ({ type }) => {
    const meta = serviceMeta[type] || serviceMeta.Other;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium ${meta.color}`}>
        <span aria-hidden="true">{meta.icon}</span>
        {meta.label}
      </span>
    );
  };

  const handleFilterChange = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'clientName') {
      const client = clients.find(item => getClientName(item).toLowerCase() === value.trim().toLowerCase());
      const firstProject = client?.company || client?.interestedProducts?.[0] || '';
      setFormData(prev => ({
        ...prev,
        client: client?._id || '',
        clientName: value,
        project: client && !prev.project ? firstProject : prev.project
      }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const rememberCustomOptions = () => {
    const nextClients = mergeOptions(customClients, formData.clientName);
    const nextProjects = mergeOptions(customProjects, formData.project);
    const nextServiceTypes = mergeOptions(customServiceTypes, formData.serviceType);
    const nextVendors = mergeOptions(customVendors, formData.vendor);

    localStorage.setItem('itPurchaseClients', JSON.stringify(nextClients));
    localStorage.setItem('itPurchaseProjects', JSON.stringify(nextProjects));
    localStorage.setItem('itPurchaseServiceTypes', JSON.stringify(nextServiceTypes));
    localStorage.setItem('itPurchaseVendors', JSON.stringify(nextVendors));

    setCustomClients(nextClients);
    setCustomProjects(nextProjects);
    setCustomServiceTypes(nextServiceTypes);
    setCustomVendors(nextVendors);
  };

  const buildPayload = () => {
    const payload = {
      ...formData,
      clientName: formData.clientName.trim(),
      project: formData.project.trim(),
      serviceType: formData.serviceType.trim(),
      vendor: formData.vendor.trim(),
      serviceName: formData.serviceName.trim(),
      amount: Number(formData.amount || 0)
    };

    if (!payload.client) {
      delete payload.client;
    }

    return payload;
  };

  const handleCreatePO = async (e) => {
    e.preventDefault();
    try {
      const response = await purchaseAPI.createPurchaseOrder(buildPayload());
      if (response.data.success) {
        rememberCustomOptions();
        toast.success('Service purchase created successfully!');
        fetchData();
        resetForm();
        setShowCreateModal(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create service purchase');
    }
  };

  const handleUpdatePO = async (e) => {
    e.preventDefault();
    try {
      await purchaseAPI.updatePurchaseOrder(selectedPO._id, buildPayload());
      rememberCustomOptions();
      toast.success('Service purchase updated!');
      fetchData();
      setShowEditModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update  service purchase');
    }
  };

  const handleDeletePO = async (id) => {
    if (!window.confirm('Delete this service purchase permanently?')) return;
    try {
      await purchaseAPI.deletePurchaseOrder(id);
      toast.success('Service purchase deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete service purchase');
    }
  };

  const resetForm = () => setFormData(defaultForm());

  const openEditModal = (po) => {
    setSelectedPO(po);
    setFormData({
      client: po.client?._id || po.client || '',
      clientName: getPOClientName(po),
      project: po.project || '',
      serviceType: po.serviceType || 'Domain',
      vendor: po.vendor || 'GoDaddy',
      serviceName: po.serviceName || '',
      billingCycle: po.billingCycle || 'Yearly',
      purchaseDate: formatDateInput(po.purchaseDate || po.createdAt),
      renewalDate: formatDateInput(po.renewalDate || po.deliveryDate),
      amount: po.amount || po.grandTotal || '',
      status: po.status || 'Active',
      notes: po.notes || ''
    });
    setShowEditModal(true);
  };

  const openViewModal = (po) => {
    setSelectedPO(po);
    setShowViewModal(true);
  };

  const exportData = () => {
    const csvContent = [
      ['PO Number', 'Client', 'Project', 'Service Type', 'Vendor', 'Renewal Date', 'Amount', 'Status'],
      ...purchaseOrders.map(po => [
        po.poNumber || '—',
        getPOClientName(po),
        po.project || '—',
        po.serviceType || '—',
        po.vendor || '—',
        formatDate(po.renewalDate),
        formatCurrency(po.amount || po.grandTotal),
        po.status
      ])
    ];
    const csv = csvContent.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `it_service_purchases_${filters.startDate}_to_${filters.endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Service purchases exported!');
  };

  return (
    <AdminLayout>
      <div className="w-full min-h-[calc(100vh-7rem)] space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 sm:p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-1">
                Purchase <span className="text-blue-600"> Management</span>
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm">Manage client domains, hosting, APIs, licenses, and renewals</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setShowFilters(!showFilters)} className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-1.5 text-xs sm:text-sm transition-all duration-200">
                <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Filters</span>
              </button>
              <button onClick={exportData} disabled={purchaseOrders.length === 0} className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-600 rounded-lg flex items-center gap-1.5 text-xs sm:text-sm transition-all duration-200 disabled:opacity-50">
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Export</span>
              </button>
              <button onClick={fetchData} className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white border border-blue-200 hover:bg-blue-50 text-blue-600 rounded-lg flex items-center gap-1.5 text-xs sm:text-sm transition-all duration-200">
                <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Refresh</span>
              </button>
              <button onClick={() => { resetForm(); setShowCreateModal(true); }} className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white rounded-lg flex items-center gap-1.5 text-xs sm:text-sm shadow-sm hover:shadow-md transition-all duration-200">
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>New Purchase</span>
              </button>
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 sm:p-4 md:p-6">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3">Filters</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
              <Field label="Purchase Date">
                <input type="date" value={filters.startDate} onChange={(e) => handleFilterChange('startDate', e.target.value)} className={inputClass} />
              </Field>
              <Field label="Renewal Month">
                <input type="month" value={filters.renewalMonth} onChange={(e) => handleFilterChange('renewalMonth', e.target.value)} className={inputClass} />
              </Field>
              <Field label="Status">
                <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)} className={inputClass}>
                  <option value="all">All Status</option>
                  {STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                </select>
              </Field>
              <Field label="Vendor">
                <select value={filters.vendor} onChange={(e) => handleFilterChange('vendor', e.target.value)} className={inputClass}>
                  <option value="">All Vendors</option>
                  {vendorOptions.map(vendor => <option key={vendor} value={vendor}>{vendor}</option>)}
                </select>
              </Field>
              <Field label="Service Type">
                <select value={filters.serviceType} onChange={(e) => handleFilterChange('serviceType', e.target.value)} className={inputClass}>
                  <option value="all">All Services</option>
                  {serviceTypeOptions.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </Field>
              <Field label="Search Client / Domain / Project">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input type="text" placeholder="Client, domain, project..." value={filters.search} onChange={(e) => handleFilterChange('search', e.target.value)} className={`${inputClass} pl-8`} />
                </div>
              </Field>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-3 sm:p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">All Service Purchases</h2>
              <p className="text-slate-500 text-xs sm:text-sm">Showing {purchaseOrders.length} records</p>
            </div>

            <div className="hidden sm:block overflow-x-auto -mx-3 px-3">
              <table className="w-full min-w-[900px]">
                <thead className="bg-white border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    {['PO #', 'Client', 'Project', 'Service Type', 'Vendor', 'Renewal Date', 'Amount', 'Status', 'Actions'].map(column => (
                      <th key={column} className="text-left p-2 sm:p-3 text-slate-600 font-semibold text-xs sm:text-sm">{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr><td colSpan="9" className="py-6 text-center text-slate-500">Loading...</td></tr>
                  ) : purchaseOrders.length === 0 ? (
                    <tr><td colSpan="9" className="py-16 text-center text-slate-500">No service purchases found</td></tr>
                  ) : purchaseOrders.map(po => {
                    const renewalBadge = getRenewalBadge(po);
                    return (
                      <tr key={po._id} className="hover:bg-blue-50 transition-all duration-200">
                        <td className="p-2 sm:p-3 text-slate-900 font-medium text-xs sm:text-sm">{po.poNumber || '—'}</td>
                        <td className="p-2 sm:p-3 text-slate-700 text-xs sm:text-sm">{getPOClientName(po)}</td>
                        <td className="p-2 sm:p-3 text-slate-700 text-xs sm:text-sm">{po.project || '—'}</td>
                        <td className="p-2 sm:p-3"><ServiceBadge type={po.serviceType} /></td>
                        <td className="p-2 sm:p-3 text-slate-700 text-xs sm:text-sm">{po.vendor || '—'}</td>
                        <td className="p-2 sm:p-3 text-slate-500 text-xs sm:text-sm">
                          <div className="flex flex-col gap-1">
                            <span>{formatDate(po.renewalDate)}</span>
                            {renewalBadge && <span className={`w-fit px-2 py-0.5 rounded-full text-[10px] ${renewalBadge.color}`}>{renewalBadge.label}</span>}
                          </div>
                        </td>
                        <td className="p-2 sm:p-3 text-blue-600 font-medium text-xs sm:text-sm">{formatCurrency(po.amount || po.grandTotal)}</td>
                        <td className="p-2 sm:p-3"><span className={`px-1.5 py-0.5 text-[10px] rounded-full ${getStatusColor(po.status)}`}>{po.status}</span></td>
                        <td className="p-2 sm:p-3"><ActionButtons po={po} onView={openViewModal} onEdit={openEditModal} onDelete={handleDeletePO} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="sm:hidden space-y-4">
              {loading ? (
                <div className="text-center py-8 text-slate-500"><Loader2AsSpinner /><p className="mt-2">Loading service purchases...</p></div>
              ) : purchaseOrders.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No service purchases found</div>
              ) : purchaseOrders.map(po => (
                <div key={po._id} className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-slate-900 font-medium text-base">PO: {po.poNumber || '—'}</p>
                      <p className="text-sm text-slate-500">{getPOClientName(po)}</p>
                    </div>
                    <ActionButtons po={po} onView={openViewModal} onEdit={openEditModal} onDelete={handleDeletePO} />
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <InfoBlock label="Project" value={po.project || '—'} />
                    <InfoBlock label="Vendor" value={po.vendor || '—'} />
                    <InfoBlock label="Renewal" value={formatDate(po.renewalDate)} />
                    <InfoBlock label="Amount" value={formatCurrency(po.amount || po.grandTotal)} accent />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <ServiceBadge type={po.serviceType} />
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(po.status)}`}>{po.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {(showCreateModal || showEditModal) && (
        <PurchaseModal
          title={showCreateModal ? 'New Service Purchase' : 'Edit Service Purchase'}
          formData={formData}
          clientOptions={clientOptions}
          projectOptions={projectOptions}
          serviceTypeOptions={serviceTypeOptions}
          vendorOptions={vendorOptions}
          onChange={handleInputChange}
          onSubmit={showCreateModal ? handleCreatePO : handleUpdatePO}
          onClose={() => { setShowCreateModal(false); setShowEditModal(false); }}
          submitLabel={showCreateModal ? 'Create Purchase' : 'Update Purchase'}
          formatCurrency={formatCurrency}
        />
      )}

      {showViewModal && selectedPO && (
        <ViewModal
          po={selectedPO}
          getClientName={getPOClientName}
          getStatusColor={getStatusColor}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          ServiceBadge={ServiceBadge}
          onClose={() => setShowViewModal(false)}
        />
      )}
    </AdminLayout>
  );
};

const inputClass = 'w-full px-2.5 py-1.5 sm:px-3 sm:py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs sm:text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200';

const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs sm:text-sm text-slate-500 mb-1.5">{label}</label>
    {children}
  </div>
);

const InfoBlock = ({ label, value, accent = false }) => (
  <div>
    <p className="text-slate-500">{label}</p>
    <p className={accent ? 'text-blue-600 font-medium' : 'text-slate-900'}>{value}</p>
  </div>
);

const ActionButtons = ({ po, onView, onEdit, onDelete }) => (
  <div className="flex gap-1">
    <button onClick={() => onView(po)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200" title="View">
      <Eye className="w-4 h-4" />
    </button>
    <button onClick={() => onEdit(po)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200" title="Edit">
      <Edit3 className="w-4 h-4" />
    </button>
    <button onClick={() => onDelete(po._id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200" title="Delete">
      <Trash2 className="w-4 h-4" />
    </button>
  </div>
);

const EditableDropdown = ({ name, value, options, onChange, placeholder, listId, required = false }) => (
  <>
    <input
      name={name}
      value={value}
      onChange={onChange}
      list={listId}
      placeholder={placeholder}
      className={modalInputClass}
      required={required}
      autoComplete="off"
    />
    <datalist id={listId}>
      {options.map(option => (
        <option key={option} value={option} />
      ))}
    </datalist>
  </>
);

const PurchaseModal = ({ title, formData, clientOptions, projectOptions, serviceTypeOptions, vendorOptions, onChange, onSubmit, onClose, submitLabel, formatCurrency }) => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4">
    <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
    <div className="relative flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="text-base font-bold text-slate-900 sm:text-lg">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close purchase modal"
        >
          <XCircle className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:space-y-4 sm:py-4 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
          <Field label="Client *">
            <EditableDropdown
              name="clientName"
              value={formData.clientName}
              options={clientOptions}
              onChange={onChange}
              placeholder="Select or type client"
              listId="it-purchase-client-options"
              required
            />
          </Field>
          <Field label="Project *">
            <EditableDropdown
              name="project"
              value={formData.project}
              options={projectOptions}
              onChange={onChange}
              placeholder="Select or type project"
              listId="it-purchase-project-options"
              required
            />
          </Field>
          <Field label="Service Type *">
            <EditableDropdown
              name="serviceType"
              value={formData.serviceType}
              options={serviceTypeOptions}
              onChange={onChange}
              placeholder="Select or type service type"
              listId="it-purchase-service-type-options"
              required
            />
          </Field>
          <Field label="Vendor *">
            <EditableDropdown
              name="vendor"
              value={formData.vendor}
              options={vendorOptions}
              onChange={onChange}
              placeholder="Select or type vendor"
              listId="it-purchase-vendor-options"
              required
            />
          </Field>
          <Field label="Service Name *">
            <input name="serviceName" value={formData.serviceName} onChange={onChange} placeholder="example.com, OpenAI API, AWS EC2" className={modalInputClass} required />
          </Field>
          <Field label="Billing Cycle *">
            <select name="billingCycle" value={formData.billingCycle} onChange={onChange} className={modalInputClass} required>
              {BILLING_CYCLES.map(cycle => <option key={cycle} value={cycle}>{cycle}</option>)}
            </select>
          </Field>
          <Field label="Purchase Date *">
            <input type="date" name="purchaseDate" value={formData.purchaseDate} onChange={onChange} className={modalInputClass} required />
          </Field>
          <Field label="Renewal Date *">
            <input type="date" name="renewalDate" value={formData.renewalDate} onChange={onChange} className={modalInputClass} required />
          </Field>
          <Field label="Amount *">
            <input type="number" name="amount" value={formData.amount} onChange={onChange} min="0" step="0.01" className={modalInputClass} required />
          </Field>
          <Field label="Status">
            <select name="status" value={formData.status} onChange={onChange} className={modalInputClass}>
              {STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Notes">
          <textarea name="notes" value={formData.notes} onChange={onChange} rows="2" className={modalInputClass} />
        </Field>
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-3">
          <div className="mb-2 text-sm font-medium text-slate-900 sm:mb-0 sm:inline-block">Amount: {formatCurrency(formData.amount)}</div>
          <div className="grid grid-cols-2 gap-2 sm:float-right sm:flex">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition-all duration-200 hover:bg-slate-50">Cancel</button>
            <button type="submit" className="rounded-lg bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 px-3 py-2 text-sm text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md">{submitLabel}</button>
          </div>
        </div>
      </form>
    </div>
  </div>
);

const ViewModal = ({ po, getClientName, getStatusColor, formatCurrency, formatDate, ServiceBadge: ServiceBadgeComponent, onClose }) => (
  <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-4 w-full max-w-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-slate-900">Service Purchase Details</h3>
        <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all duration-200">
          <XCircle className="w-5 h-5" />
        </button>
      </div>
      <div className="space-y-4 text-sm">
        <Section title="Client">
          <InfoRow label="Client" value={getClientName(po)} />
          <InfoRow label="Project" value={po.project || '—'} />
        </Section>
        <Section title="Service">
          <InfoRow label="Service Type" value={ServiceBadgeComponent({ type: po.serviceType })} />
          <InfoRow label="Service Name" value={po.serviceName || '—'} />
          <InfoRow label="Vendor" value={po.vendor || '—'} />
        </Section>
        <Section title="Subscription">
          <InfoRow label="Billing Cycle" value={po.billingCycle || '—'} />
          <InfoRow label="Purchase Date" value={formatDate(po.purchaseDate)} />
          <InfoRow label="Renewal Date" value={formatDate(po.renewalDate)} />
          <InfoRow label="Status" value={<span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(po.status)}`}>{po.status}</span>} />
        </Section>
        <Section title="Financial">
          <InfoRow label="Amount" value={formatCurrency(po.amount || po.grandTotal)} />
        </Section>
        {po.notes && <Section title="Notes"><p className="text-slate-700 text-sm">{po.notes}</p></Section>}
      </div>
    </div>
  </div>
);

const Section = ({ title, children }) => (
  <div>
    <p className="text-slate-900 font-semibold mb-2">{title}</p>
    <div className="space-y-2">{children}</div>
  </div>
);

const InfoRow = ({ label, value }) => (
  <div className="flex justify-between gap-4 border-b border-slate-200 pb-2">
    <span className="text-slate-500 text-sm">{label}</span>
    <span className="text-slate-900 text-sm text-right">{value}</span>
  </div>
);

const modalInputClass = 'w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200';

const Loader2AsSpinner = () => (
  <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-200 border-t-blue-600 mx-auto"></div>
);

export default PurchaseOrders;
