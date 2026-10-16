import path from 'path';
import fs from 'fs';
import CustomerInvoiceModel, {
  calculateInvoiceFinancials,
} from '../models/CustomerInvoice.js';
import InvoicePaymentAllocationModel from '../models/InvoicePaymentAllocation.js';
import { generateCustomerInvoicePdf } from '../services/invoicePdfService.js';
import { getSalesEmployeeScope } from '../utils/salesScope.js';

/**
 * GET /api/finance/invoices
 * List customer invoices with filtering and search
 */
export const getInvoices = async (req, res) => {
  try {
    const scope = await getSalesEmployeeScope(req.user);
    const { projectId, clientId, status, invoiceNumber } = req.query;
    const filter = {};

    if (scope.isScoped) {
      if (projectId && !scope.projectIds.includes(String(projectId))) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
      if (clientId && !scope.leadIds.includes(String(clientId))) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
      if (!projectId && !clientId) {
        filter.projectIds = scope.projectIds;
        filter.clientIds = scope.leadIds;
      } else {
        if (projectId) filter.projectId = projectId;
        if (clientId) filter.clientId = clientId;
      }
    } else {
      if (projectId) filter.projectId = projectId;
      if (clientId) filter.clientId = clientId;
    }

    if (status && status !== 'all') filter.status = status;
    if (invoiceNumber) filter.invoiceNumber = invoiceNumber;

    const invoices = await CustomerInvoiceModel.find(filter);
    res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices,
    });
  } catch (error) {
    console.error('Error in getInvoices:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/finance/invoices/:id
 * Get single invoice with items, allocations, client, and project
 */
export const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await CustomerInvoiceModel.findById(id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const scope = await getSalesEmployeeScope(req.user);
    if (scope.isScoped) {
      const pId = invoice.projectId ? String(invoice.projectId) : null;
      const cId = (invoice.clientId || invoice.leadId) ? String(invoice.clientId || invoice.leadId) : null;
      const hasAccess = (pId && scope.projectIds.includes(pId)) || (cId && scope.leadIds.includes(cId));
      if (!hasAccess) {
        return res.status(403).json({ success: false, message: 'Access denied to this invoice' });
      }
    }

    res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    console.error('Error in getInvoiceById:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/finance/invoices
 * Create a new draft or issued customer invoice
 */
export const createInvoice = async (req, res) => {
  try {
    const scope = await getSalesEmployeeScope(req.user);
    if (scope.isScoped) {
      const pId = req.body.projectId ? String(req.body.projectId) : null;
      const cId = (req.body.clientId || req.body.leadId) ? String(req.body.clientId || req.body.leadId) : null;
      if (pId && !scope.projectIds.includes(pId)) {
        return res.status(403).json({ success: false, message: 'Access denied: You can only create invoices for your assigned projects' });
      }
      if (cId && !scope.leadIds.includes(cId)) {
        return res.status(403).json({ success: false, message: 'Access denied: You can only create invoices for your assigned clients' });
      }
    }

    const invoice = await CustomerInvoiceModel.create(req.body, req.user);
    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: invoice,
    });
  } catch (error) {
    console.error('Error in createInvoice:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/finance/invoices/:id
 * Update a draft invoice
 */
export const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const scope = await getSalesEmployeeScope(req.user);
    if (scope.isScoped) {
      const invoice = await CustomerInvoiceModel.findById(id);
      if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
      const pId = invoice.projectId ? String(invoice.projectId) : null;
      const cId = (invoice.clientId || invoice.leadId) ? String(invoice.clientId || invoice.leadId) : null;
      if ((!pId || !scope.projectIds.includes(pId)) && (!cId || !scope.leadIds.includes(cId))) {
        return res.status(403).json({ success: false, message: 'Access denied to this invoice' });
      }
    }

    const updated = await CustomerInvoiceModel.update(id, req.body, req.user);
    res.status(200).json({
      success: true,
      message: 'Draft invoice updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error in updateInvoice:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/finance/invoices/:id/issue
 * Issue an invoice (assigns sequence number, snapshots, and marks issued)
 */
export const issueInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const scope = await getSalesEmployeeScope(req.user);
    if (scope.isScoped) {
      const invoice = await CustomerInvoiceModel.findById(id);
      if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
      const pId = invoice.projectId ? String(invoice.projectId) : null;
      const cId = (invoice.clientId || invoice.leadId) ? String(invoice.clientId || invoice.leadId) : null;
      if ((!pId || !scope.projectIds.includes(pId)) && (!cId || !scope.leadIds.includes(cId))) {
        return res.status(403).json({ success: false, message: 'Access denied to this invoice' });
      }
    }

    const issued = await CustomerInvoiceModel.issue(id, req.user);
    res.status(200).json({
      success: true,
      message: `Invoice #${issued.invoiceNumber} issued successfully`,
      data: issued,
    });
  } catch (error) {
    console.error('Error in issueInvoice:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/finance/invoices/:id/cancel
 * Cancel an invoice with reason
 */
export const cancelInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const scope = await getSalesEmployeeScope(req.user);
    if (scope.isScoped) {
      const invoice = await CustomerInvoiceModel.findById(id);
      if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
      const pId = invoice.projectId ? String(invoice.projectId) : null;
      const cId = (invoice.clientId || invoice.leadId) ? String(invoice.clientId || invoice.leadId) : null;
      if ((!pId || !scope.projectIds.includes(pId)) && (!cId || !scope.leadIds.includes(cId))) {
        return res.status(403).json({ success: false, message: 'Access denied to this invoice' });
      }
    }

    const cancelled = await CustomerInvoiceModel.cancel(id, reason, req.user);
    res.status(200).json({
      success: true,
      message: 'Invoice cancelled successfully',
      data: cancelled,
    });
  } catch (error) {
    console.error('Error in cancelInvoice:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/finance/invoices/:id/pdf
 * Generate and download invoice PDF
 */
export const downloadInvoicePdf = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await CustomerInvoiceModel.findById(id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const { filePath, fileName } = await generateCustomerInvoicePdf(invoice);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/finance/invoices/allocations
 * Allocate an incoming payment to an invoice
 */
export const allocatePayment = async (req, res) => {
  try {
    const { paymentTransactionId, invoiceId, amount, notes } = req.body;
    if (!paymentTransactionId || !invoiceId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'paymentTransactionId, invoiceId, and amount are required.',
      });
    }

    const allocation = await InvoicePaymentAllocationModel.allocate({
      paymentTransactionId,
      invoiceId,
      amount,
      notes,
      user: req.user,
    });

    const updatedInvoice = await CustomerInvoiceModel.findById(invoiceId);

    res.status(200).json({
      success: true,
      message: 'Payment allocated successfully',
      data: {
        allocation,
        invoice: updatedInvoice,
      },
    });
  } catch (error) {
    console.error('Error allocating payment:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/finance/invoices/allocations/:id
 * Deallocate an allocation
 */
export const deallocatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await InvoicePaymentAllocationModel.deallocate(id);
    res.status(200).json({
      success: true,
      message: 'Payment deallocated successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error deallocating payment:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/finance/payments/unallocated
 * List incoming payments with unallocated balances
 */
export const getUnallocatedPayments = async (req, res) => {
  try {
    const scope = await getSalesEmployeeScope(req.user);
    const options = { unallocatedOnly: true };
    if (scope.isScoped) {
      options.scoped = true;
      options.projectIds = scope.projectIds;
      options.clientIds = scope.leadIds;
    }
    const unallocated = await InvoicePaymentAllocationModel.getPaymentsWithAllocationStatus(options);
    res.status(200).json({
      success: true,
      count: unallocated.length,
      data: unallocated,
    });
  } catch (error) {
    console.error('Error in getUnallocatedPayments:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/finance/receivables/summary
 * Accounts Receivable summary, client aging, and project aging
 */
export const getAccountsReceivableSummary = async (req, res) => {
  try {
    const scope = await getSalesEmployeeScope(req.user);
    const options = {};
    if (scope.isScoped) {
      options.scoped = true;
      options.projectIds = scope.projectIds;
      options.clientIds = scope.leadIds;
    }
    const summary = await InvoicePaymentAllocationModel.getAccountsReceivableSummary(options);
    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Error in getAccountsReceivableSummary:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export default {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  issueInvoice,
  cancelInvoice,
  downloadInvoicePdf,
  allocatePayment,
  deallocatePayment,
  getUnallocatedPayments,
  getAccountsReceivableSummary,
};
