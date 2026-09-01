import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AdminLayout from '../../components/Admin/layout/AdminLayout';
import {
  FileText, Plus, Search, Download, Edit3, Trash2, Eye,
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

  const isInteractiveClick = (event) =>
    event.target.closest('button, a, input, select, textarea, label');

  const openPODetails = (event, po) => {
    if (isInteractiveClick(event)) return;
    openViewModal(po);
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

  const handleGenerateInvoicePDF = (po) => {
    try {
      const invoiceNum = po.poNumber ? (po.poNumber.startsWith('PO') ? po.poNumber.replace('PO', 'INV') : `INV-${po.poNumber}`) : `INV-${String(po._id || Date.now()).slice(-6).toUpperCase()}`;
      const clientNameStr = getPOClientName(po);
      const purchaseDateStr = formatDate(po.purchaseDate || po.createdAt);
      const renewalDateStr = formatDate(po.renewalDate);
      const formattedAmount = formatCurrency(po.amount || po.grandTotal);
      const serviceTypeStr = po.serviceType || 'IT Service';
      const serviceNameStr = po.serviceName || po.serviceType || 'Service Purchase';
      const vendorStr = po.vendor || 'N/A';
      const billingCycleStr = po.billingCycle || 'Yearly';

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Please allow popups to generate and view the invoice PDF.');
        return;
      }

      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice_${invoiceNum}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color: #0f172a;
      background-color: #f8fafc;
      padding: 24px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .no-print-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #0f172a;
      color: #ffffff;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-primary { background: #2563eb; color: white; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-secondary { background: #334155; color: white; }
    .btn-secondary:hover { background: #475569; }
    .invoice-card {
      max-width: 800px;
      margin: 60px auto 0 auto;
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.05);
      padding: 40px;
    }
    @media print {
      body { background: white; padding: 0; }
      .no-print-bar { display: none !important; }
      .invoice-card { margin: 0; border: none; box-shadow: none; padding: 20px; max-width: 100%; }
      @page { margin: 12mm; size: A4; }
    }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f1f5f9; padding-bottom: 24px; margin-bottom: 24px; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-logo { width: 44px; height: 44px; background: linear-gradient(135deg, #2563eb, #4f46e5); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 20px; }
    .company-name { font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }
    .company-sub { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
    .invoice-title-box { text-align: right; }
    .invoice-badge { display: inline-block; background: #eff6ff; color: #1d4ed8; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; border: 1px solid #bfdbfe; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .invoice-num { font-size: 22px; font-weight: 900; color: #0f172a; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; }
    .meta-block label { display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 4px; }
    .meta-block p { font-size: 13px; font-weight: 600; color: #0f172a; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .items-table th { background: #f1f5f9; text-align: left; padding: 12px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; }
    .items-table td { padding: 16px; font-size: 13px; color: #334155; border-bottom: 1px solid #f1f5f9; }
    .items-table th:last-child, .items-table td:last-child { text-align: right; }
    .summary-box { display: flex; justify-content: flex-end; margin-bottom: 28px; }
    .summary-table { width: 280px; }
    .summary-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; color: #64748b; }
    .summary-row.total { font-size: 16px; font-weight: 900; color: #0f172a; border-top: 2px solid #0f172a; padding-top: 12px; margin-top: 4px; }
    .summary-row.total .amount { color: #2563eb; }
    .notes-card { background: #fafafa; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 28px; }
    .notes-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
    .notes-content { font-size: 12px; color: #475569; line-height: 1.5; }
    .footer { border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: flex-end; margin-top: 32px; padding-top: 20px; }
    .sign-box { text-align: right; }
    .sign-line { width: 160px; height: 1px; background: #cbd5e1; margin-left: auto; margin-bottom: 6px; }
    .sign-title { font-size: 11px; font-weight: 700; color: #0f172a; }
    .sign-company { font-size: 10px; color: #64748b; }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <span style="font-weight: 600; font-size: 14px;">Service Purchase Invoice Preview</span>
    <div style="display: flex; gap: 8px;">
      <button class="btn btn-primary" onclick="window.print()">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>
        Print / Save as PDF
      </button>
      <button class="btn btn-secondary" onclick="window.close()">Close</button>
    </div>
  </div>

  <div class="invoice-card">
    <div class="header">
      <div class="brand">
        <div class="brand-logo">T</div>
        <div>
          <div class="company-name">TARUNA TECHNOLOGY</div>
          <div class="company-sub">IT & Software Solutions</div>
        </div>
      </div>
      <div class="invoice-title-box">
        <div class="invoice-badge">Purchase Invoice</div>
        <div class="invoice-num">${invoiceNum}</div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-block">
        <label>Billed To (Client / Project)</label>
        <p style="font-size: 15px; font-weight: 800; color: #2563eb;">${clientNameStr}</p>
        <p style="color: #475569; margin-top: 2px;">Project: ${po.project || 'General Service'}</p>
      </div>
      <div class="meta-block">
        <label>Invoice Details</label>
        <p>Purchase Date: ${purchaseDateStr}</p>
        <p>Renewal Date: ${renewalDateStr}</p>
        <p>PO Reference: ${po.poNumber || '—'}</p>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Service Description</th>
          <th>Type</th>
          <th>Vendor</th>
          <th>Billing Cycle</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong style="color: #0f172a; font-size: 14px;">${serviceNameStr}</strong>
            ${po.project ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">Project: ${po.project}</div>` : ''}
          </td>
          <td>${serviceTypeStr}</td>
          <td>${vendorStr}</td>
          <td>${billingCycleStr}</td>
          <td style="font-weight: 700; color: #0f172a;">${formattedAmount}</td>
        </tr>
      </tbody>
    </table>

    <div class="summary-box">
      <div class="summary-table">
        <div class="summary-row">
          <span>Subtotal</span>
          <span>${formattedAmount}</span>
        </div>
        <div class="summary-row">
          <span>Status</span>
          <span style="font-weight: 700; color: ${po.status === 'Active' ? '#059669' : '#dc2626'};">${po.status || 'Active'}</span>
        </div>
        <div class="summary-row total">
          <span>Total Amount</span>
          <span class="amount">${formattedAmount}</span>
        </div>
      </div>
    </div>

    ${po.notes ? `
      <div class="notes-card">
        <div class="notes-title">Notes / Remarks</div>
        <div class="notes-content">${po.notes}</div>
      </div>
    ` : ''}

    <div class="footer">
      <div style="font-size: 11px; color: #94a3b8; max-width: 340px;">
        This is a computer-generated purchase order invoice issued by Taruna Technology.
      </div>
      <div class="sign-box">
        <div class="sign-line"></div>
        <div class="sign-title">Authorized Signatory</div>
        <div class="sign-company">Taruna Technology</div>
      </div>
    </div>
  </div>
</body>
</html>`;

      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      toast.success('Invoice generated!');
    } catch (err) {
      console.error('Invoice generation error:', err);
      toast.error('Failed to generate invoice');
    }
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

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3.5 sm:p-4">
          <h3 className="text-base font-bold text-slate-900 mb-3">Filters</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 items-end">
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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Client, domain, project..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs sm:text-sm placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                />
              </div>
            </Field>
          </div>
        </div>

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
                      <tr key={po._id} onClick={(event) => openPODetails(event, po)} className="hover:bg-blue-50 transition-all duration-200 cursor-pointer">
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
                        <td className="p-2 sm:p-3"><ActionButtons po={po} onView={openViewModal} onEdit={openEditModal} onDelete={handleDeletePO} onGenerateInvoice={handleGenerateInvoicePDF} /></td>
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
                <div key={po._id} onClick={(event) => openPODetails(event, po)} className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 cursor-pointer hover:border-blue-200 hover:bg-blue-50/40 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-slate-900 font-medium text-base">PO: {po.poNumber || '—'}</p>
                      <p className="text-sm text-slate-500">{getPOClientName(po)}</p>
                    </div>
                    <ActionButtons po={po} onView={openViewModal} onEdit={openEditModal} onDelete={handleDeletePO} onGenerateInvoice={handleGenerateInvoicePDF} />
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
          onGenerateInvoice={handleGenerateInvoicePDF}
          onClose={() => setShowViewModal(false)}
        />
      )}
    </AdminLayout>
  );
};

const ActionButtons = ({ po, onView, onEdit, onDelete, onGenerateInvoice }) => (
  <div className="flex gap-1">
    <button onClick={() => onView(po)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200" title="View Details">
      <Eye className="w-4 h-4" />
    </button>
    <button onClick={() => onGenerateInvoice(po)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all duration-200" title="Generate Invoice PDF">
      <FileText className="w-4 h-4" />
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
  <div className="fixed inset-0 z-[9999] flex items-start sm:items-center justify-center p-2.5 pt-14 sm:p-4">
    <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
    <div className="relative flex max-h-[40dvh] sm:max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 shadow-xl">
      <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-slate-100 bg-white/95 pb-2 backdrop-blur sm:pb-3">
        <h3 className="text-base font-bold text-slate-900 sm:text-lg">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close purchase modal"
        >
          <XCircle className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="task-details-modal-scroll min-h-0 flex-1 space-y-2.5 overflow-y-auto py-2.5 sm:space-y-4 sm:py-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-3 md:grid-cols-2 md:gap-4">
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

        <div className="sticky bottom-0 z-10 flex shrink-0 items-center justify-between border-t border-slate-100 bg-white/95 pt-2 backdrop-blur sm:pt-3">
          <div className="text-xs sm:text-sm font-semibold text-slate-900">Amount: {formatCurrency(formData.amount)}</div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" className="rounded-lg bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white shadow-sm hover:shadow-md">{submitLabel}</button>
          </div>
        </div>
      </form>
    </div>
  </div>
);

const ViewModal = ({ po, getClientName, getStatusColor, formatCurrency, formatDate, ServiceBadge: ServiceBadgeComponent, onGenerateInvoice, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2.5 pt-14 sm:p-4">
    <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
    <div className="relative flex max-h-[40dvh] sm:max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
      <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-white/95 pb-2 backdrop-blur sm:pb-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-slate-900 sm:text-xl">Service Purchase Details</h3>
          <p className="truncate text-xs text-slate-500 sm:text-sm">{po.poNumber || 'Purchase record'}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* <button
            type="button"
            onClick={() => onGenerateInvoice(po)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 hover:border-blue-300 shadow-sm"
            title="Generate Invoice PDF"
          >
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
            <span className="hidden min-[400px]:inline">Generate Invoice</span>
          </button> */}
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-600">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="task-details-modal-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain py-2.5 sm:py-5">
        {/* Invoice Banner Card */}
        <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white p-3.5 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Purchase Invoice PDF</p>
              <p className="text-xs font-medium text-slate-500">Generate, view, and print/download official invoice PDF for this purchase</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onGenerateInvoice(po)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
          >
            <Download className="h-4 w-4" />
            <span>Generate Invoice PDF</span>
          </button>
        </div>

        <div className="grid gap-2.5 text-xs sm:text-sm lg:grid-cols-[1.08fr_0.92fr] lg:gap-4">
          <div className="space-y-2.5 sm:space-y-4">
            <Section title="Client">
              <InfoRow label="Client" value={getClientName(po)} />
              <InfoRow label="Project" value={po.project || '—'} />
            </Section>
            <Section title="Service">
              <InfoRow label="Service Type" value={ServiceBadgeComponent({ type: po.serviceType })} />
              <InfoRow label="Service Name" value={po.serviceName || '—'} />
              <InfoRow label="Vendor" value={po.vendor || '—'} />
            </Section>
          </div>
          <div className="space-y-2.5 sm:space-y-4">
            <Section title="Subscription">
              <InfoRow label="Billing Cycle" value={po.billingCycle || '—'} />
              <InfoRow label="Purchase Date" value={formatDate(po.purchaseDate)} />
              <InfoRow label="Renewal Date" value={formatDate(po.renewalDate)} />
              <InfoRow label="Status" value={<span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${getStatusColor(po.status)}`}>{po.status}</span>} />
            </Section>
            <Section title="Financial">
              <InfoRow label="Amount" value={formatCurrency(po.amount || po.grandTotal)} />
            </Section>
            {po.notes && (
              <Section title="Notes">
                <p className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs sm:text-sm leading-relaxed text-slate-700">
                  {po.notes}
                </p>
              </Section>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const Section = ({ title, children }) => (
  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-2.5 shadow-sm sm:p-4">
    <p className="mb-1.5 text-xs sm:text-sm font-semibold text-slate-900">{title}</p>
    <div className="space-y-1.5 sm:space-y-2">{children}</div>
  </div>
);

const InfoRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 pb-1.5 last:border-b-0 last:pb-0">
    <span className="text-xs font-medium text-slate-500 sm:text-sm">{label}</span>
    <span className="max-w-[65%] text-right text-xs font-medium text-slate-900 sm:text-sm">{value}</span>
  </div>
);

const InfoBlock = ({ label, value, accent = false }) => (
  <div>
    <p className="text-slate-500 text-xs">{label}</p>
    <p className={accent ? 'text-blue-600 font-semibold text-xs sm:text-sm' : 'text-slate-900 font-medium text-xs sm:text-sm'}>{value}</p>
  </div>
);

const Field = ({ label, children, className = '' }) => (
  <div className={`flex flex-col min-w-0 ${className}`}>
    {label && (
      <label className="block text-xs font-semibold text-slate-700 mb-1 truncate" title={label}>
        {label}
      </label>
    )}
    {children}
  </div>
);

const inputClass = 'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs sm:text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200';
const modalInputClass = 'w-full px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs sm:text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200';

const Loader2AsSpinner = () => (
  <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-200 border-t-blue-600 mx-auto"></div>
);

export default PurchaseOrders;
