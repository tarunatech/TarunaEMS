import { and, asc, desc, eq, gte, ilike, inArray, isNull, lt, lte, or, sql } from 'drizzle-orm';
import db, { pool } from '../db/index.js';
import {
  customerInvoices,
  customerInvoiceItems,
  invoicePaymentAllocations,
} from '../db/schema/customerInvoice.js';
import { projects } from '../db/schema/project.js';
import { leads } from '../db/schema/lead.js';
import { users } from '../db/schema/user.js';
import { expenseTransactions } from '../db/schema/expenseTransaction.js';

export const INVOICE_STATUSES = ['draft', 'issued', 'partially_paid', 'paid', 'cancelled'];
export const TAX_TYPES = ['CGST_SGST', 'IGST', 'None'];

export const toUuidOrNull = (val) => {
  if (!val) return null;
  let str = val;
  if (typeof val === 'object') {
    str = val.id || val._id || val.value || null;
  }
  if (typeof str !== 'string') return null;
  str = str.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str) ? str : null;
};

export const generateInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const res = await pool.query("SELECT nextval('customer_invoice_number_seq') AS seq");
  const seq = String(res.rows[0]?.seq || 1).padStart(4, '0');
  return `INV-${year}-${seq}`;
};

/**
 * Recalculate tax and totals deterministically from line items, discount, and tax configuration.
 * Avoids any floating-point arithmetic inaccuracies by rounding to 2 decimal places.
 */
export const calculateInvoiceFinancials = (items = [], taxType = 'CGST_SGST', discountAmount = 0, customTaxRate = null) => {
  let subtotal = 0;
  const processedItems = items.map((item, idx) => {
    const qty = Math.max(0, Number(item.quantity ?? 1));
    const price = Math.max(0, Number(item.unitPrice ?? 0));
    const lineSubtotal = Math.round(qty * price * 100) / 100;
    subtotal += lineSubtotal;
    return {
      description: String(item.description || '').trim(),
      quantity: qty,
      unitPrice: price,
      taxableAmount: lineSubtotal,
      taxRate: 0,
      taxAmount: 0,
      lineTotal: lineSubtotal,
      sortOrder: Number(item.sortOrder ?? idx),
    };
  });

  subtotal = Math.round(subtotal * 100) / 100;
  const discount = Math.min(subtotal, Math.max(0, Number(discountAmount ?? 0)));
  const taxableAmount = Math.round((subtotal - discount) * 100) / 100;

  let taxRate = 18;
  if (customTaxRate !== null && customTaxRate !== undefined) {
    taxRate = Number(customTaxRate);
  } else if (taxType === 'None') {
    taxRate = 0;
  }

  let cgstRate = 0;
  let sgstRate = 0;
  let igstRate = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let taxAmount = 0;

  if (taxType === 'CGST_SGST') {
    cgstRate = taxRate / 2;
    sgstRate = taxRate / 2;
    cgstAmount = Math.round(taxableAmount * (cgstRate / 100) * 100) / 100;
    sgstAmount = Math.round(taxableAmount * (sgstRate / 100) * 100) / 100;
    taxAmount = Math.round((cgstAmount + sgstAmount) * 100) / 100;
  } else if (taxType === 'IGST') {
    igstRate = taxRate;
    igstAmount = Math.round(taxableAmount * (igstRate / 100) * 100) / 100;
    taxAmount = igstAmount;
  } else {
    // None
    taxRate = 0;
    taxAmount = 0;
  }

  const totalAmount = Math.round((taxableAmount + taxAmount) * 100) / 100;

  return {
    subtotal,
    discountAmount: discount,
    taxableAmount,
    taxType,
    taxRate,
    cgstRate,
    sgstRate,
    igstRate,
    cgstAmount,
    sgstAmount,
    igstAmount,
    taxAmount,
    totalAmount,
    items: processedItems,
  };
};

export class CustomerInvoiceModel {
  static async findById(id) {
    const cleanId = toUuidOrNull(id);
    if (!cleanId) return null;
    const [inv] = await db.select().from(customerInvoices).where(eq(customerInvoices.id, cleanId));
    if (!inv) return null;

    const items = await db
      .select()
      .from(customerInvoiceItems)
      .where(eq(customerInvoiceItems.invoiceId, cleanId))
      .orderBy(asc(customerInvoiceItems.sortOrder), asc(customerInvoiceItems.createdAt));

    const allocations = await db
      .select({
        id: invoicePaymentAllocations.id,
        paymentTransactionId: invoicePaymentAllocations.paymentTransactionId,
        invoiceId: invoicePaymentAllocations.invoiceId,
        allocatedAmount: invoicePaymentAllocations.allocatedAmount,
        allocatedAt: invoicePaymentAllocations.allocatedAt,
        allocatedBy: invoicePaymentAllocations.allocatedBy,
        notes: invoicePaymentAllocations.notes,
        paymentDate: expenseTransactions.date,
        paymentMethod: expenseTransactions.paymentMethod,
        paymentReference: expenseTransactions.referenceNumber,
        paymentDescription: expenseTransactions.description,
        paymentTotal: expenseTransactions.amount,
      })
      .from(invoicePaymentAllocations)
      .leftJoin(
        expenseTransactions,
        eq(invoicePaymentAllocations.paymentTransactionId, expenseTransactions.id)
      )
      .where(eq(invoicePaymentAllocations.invoiceId, cleanId))
      .orderBy(desc(invoicePaymentAllocations.allocatedAt));

    let project = null;
    const projectRefId = toUuidOrNull(inv.projectId);
    if (projectRefId) {
      const [p] = await db.select().from(projects).where(eq(projects.id, projectRefId));
      project = p || null;
    }

    let client = null;
    const clientRefId = toUuidOrNull(inv.clientId || inv.leadId);
    if (clientRefId) {
      const [l] = await db.select().from(leads).where(eq(leads.id, clientRefId));
      client = l || null;
    }

    return {
      ...inv,
      items,
      allocations,
      project,
      client,
    };
  }

  static async find(query = {}) {
    const conditions = [];

    const pId = toUuidOrNull(query.projectId);
    if (pId) {
      conditions.push(eq(customerInvoices.projectId, pId));
    }
    const cId = toUuidOrNull(query.clientId || query.leadId);
    if (cId) {
      conditions.push(or(eq(customerInvoices.clientId, cId), eq(customerInvoices.leadId, cId)));
    }
    if (Array.isArray(query.projectIds) && Array.isArray(query.clientIds)) {
      const pIds = query.projectIds.map(toUuidOrNull).filter(Boolean);
      const cIds = query.clientIds.map(toUuidOrNull).filter(Boolean);
      if (pIds.length > 0 && cIds.length > 0) {
        conditions.push(or(inArray(customerInvoices.projectId, pIds), inArray(customerInvoices.clientId, cIds)));
      } else if (pIds.length > 0) {
        conditions.push(inArray(customerInvoices.projectId, pIds));
      } else if (cIds.length > 0) {
        conditions.push(inArray(customerInvoices.clientId, cIds));
      } else {
        conditions.push(sql`1=0`);
      }
    } else if (Array.isArray(query.projectIds)) {
      const pIds = query.projectIds.map(toUuidOrNull).filter(Boolean);
      if (pIds.length > 0) {
        conditions.push(inArray(customerInvoices.projectId, pIds));
      } else {
        conditions.push(sql`1=0`);
      }
    } else if (Array.isArray(query.clientIds)) {
      const cIds = query.clientIds.map(toUuidOrNull).filter(Boolean);
      if (cIds.length > 0) {
        conditions.push(inArray(customerInvoices.clientId, cIds));
      } else {
        conditions.push(sql`1=0`);
      }
    }
    if (query.status && query.status !== 'all') {
      conditions.push(eq(customerInvoices.status, query.status));
    }
    if (query.invoiceNumber) {
      conditions.push(ilike(customerInvoices.invoiceNumber, `%${query.invoiceNumber}%`));
    }

    let q = db.select().from(customerInvoices);
    if (conditions.length > 0) {
      q = q.where(and(...conditions));
    }

    const invoices = await q.orderBy(desc(customerInvoices.createdAt));

    // Enrich with client and project info
    const enriched = await Promise.all(
      invoices.map(async (inv) => {
        let project = null;
        const projectRefId = toUuidOrNull(inv.projectId);
        if (projectRefId) {
          const [p] = await db.select().from(projects).where(eq(projects.id, projectRefId));
          project = p || null;
        }

        let client = null;
        const clientRefId = toUuidOrNull(inv.clientId || inv.leadId);
        if (clientRefId) {
          const [l] = await db.select().from(leads).where(eq(leads.id, clientRefId));
          client = l || null;
        }

        return {
          ...inv,
          project,
          client,
        };
      })
    );

    return enriched;
  }

  static async create(data = {}, user = null) {
    const {
      projectId,
      clientId,
      leadId,
      milestoneName,
      invoiceDate = new Date().toISOString().split('T')[0],
      dueDate,
      taxType = 'CGST_SGST',
      taxRate = 18,
      discountAmount = 0,
      notes,
      terms,
      items = [],
      currency = 'INR',
      issueImmediately = false,
      allowOverbilling = false,
    } = data;

    const actualProjectId = toUuidOrNull(projectId);
    const actualClientId = toUuidOrNull(clientId || leadId);

    // 1. Milestone linkage & duplicate milestone validation
    if (actualProjectId && milestoneName) {
      const existingWithMilestone = await db
        .select()
        .from(customerInvoices)
        .where(
          and(
            eq(customerInvoices.projectId, actualProjectId),
            eq(customerInvoices.milestoneName, milestoneName),
            sql`${customerInvoices.status} != 'cancelled'`
          )
        );

      if (existingWithMilestone.length > 0) {
        throw new Error(
          `Billing milestone "${milestoneName}" has already been invoiced for this project (Invoice #${existingWithMilestone[0].invoiceNumber || 'Draft'}). Duplicate milestone billing is rejected.`
        );
      }
    }

    // 2. Financial calculation validation
    const financials = calculateInvoiceFinancials(items, taxType, discountAmount, taxRate);

    // 3. Project overbilling validation
    let projectRow = null;
    if (actualProjectId) {
      const [proj] = await db.select().from(projects).where(eq(projects.id, actualProjectId));
      projectRow = proj || null;
      if (proj && Number(proj.contractValue || 0) > 0) {
        const existingInvoices = await db
          .select({
            totalAmount: customerInvoices.totalAmount,
          })
          .from(customerInvoices)
          .where(
            and(
              eq(customerInvoices.projectId, actualProjectId),
              sql`${customerInvoices.status} != 'cancelled'`
            )
          );

        const currentInvoicedSum = existingInvoices.reduce(
          (sum, inv) => sum + Number(inv.totalAmount || 0),
          0
        );

        const proposedTotal = currentInvoicedSum + financials.totalAmount;
        const contractVal = Number(proj.contractValue);

        if (proposedTotal > contractVal && !allowOverbilling) {
          throw new Error(
            `Contract overbilling detected: Total invoiced with this invoice (Rs. ${proposedTotal.toLocaleString(
              'en-IN'
            )}) exceeds the approved contract value (Rs. ${contractVal.toLocaleString(
              'en-IN'
            )}). Check the commercial agreement or explicitly approve overbilling.`
          );
        }
      }
    }

    const calculatedDueDate =
      dueDate ||
      new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let actualClientName = data.clientName || '';
    if (actualClientId) {
      const [l] = await db.select().from(leads).where(eq(leads.id, actualClientId));
      if (l) {
        actualClientName = l.company || `${l.firstName || ''} ${l.lastName || ''}`.trim() || actualClientName || 'Direct Client';
      }
    }
    if (!actualClientName && projectRow?.clientName) {
      actualClientName = projectRow.clientName;
    }
    if (!actualClientName) {
      actualClientName = 'Direct Client';
    }

    let invoiceNumber = null;
    let status = 'draft';
    let issuedAt = null;
    let issuedBy = null;

    if (issueImmediately) {
      invoiceNumber = await generateInvoiceNumber();
      status = 'issued';
      issuedAt = new Date();
      issuedBy = user?.id || null;
    }

    const [created] = await db
      .insert(customerInvoices)
      .values({
        invoiceNumber,
        clientId: actualClientId,
        leadId: actualClientId,
        clientName: actualClientName,
        projectId: actualProjectId,
        milestoneName: milestoneName || null,
        invoiceDate: String(invoiceDate),
        dueDate: String(calculatedDueDate),
        status,
        currency,
        subtotal: String(financials.subtotal),
        discountAmount: String(financials.discountAmount),
        taxableAmount: String(financials.taxableAmount),
        taxType: financials.taxType,
        taxRate: String(financials.taxRate),
        cgstRate: String(financials.cgstRate),
        sgstRate: String(financials.sgstRate),
        igstRate: String(financials.igstRate),
        cgstAmount: String(financials.cgstAmount),
        sgstAmount: String(financials.sgstAmount),
        igstAmount: String(financials.igstAmount),
        taxAmount: String(financials.taxAmount),
        totalAmount: String(financials.totalAmount),
        paidAmount: '0',
        outstandingAmount: String(financials.totalAmount),
        notes: notes || null,
        terms: terms || null,
        createdBy: user?.id || null,
        issuedAt,
        issuedBy,
      })
      .returning();

    // Insert line items
    if (financials.items.length > 0) {
      await db.insert(customerInvoiceItems).values(
        financials.items.map((item) => ({
          invoiceId: created.id,
          description: item.description,
          quantity: String(item.quantity),
          unitPrice: String(item.unitPrice),
          taxableAmount: String(item.taxableAmount),
          taxRate: String(item.taxRate),
          taxAmount: String(item.taxAmount),
          lineTotal: String(item.lineTotal),
          sortOrder: item.sortOrder,
        }))
      );
    }

    return this.findById(created.id);
  }

  static async update(id, data = {}, user = null) {
    const cleanId = toUuidOrNull(id);
    if (!cleanId) {
      throw new Error('Invalid invoice ID');
    }
    const existing = await this.findById(cleanId);
    if (!existing) {
      throw new Error('Invoice not found');
    }

    if (existing.status !== 'draft') {
      throw new Error(`Only draft invoices can be edited. This invoice is in "${existing.status}" status.`);
    }

    const {
      milestoneName,
      invoiceDate,
      dueDate,
      taxType = existing.taxType,
      taxRate = Number(existing.taxRate),
      discountAmount = Number(existing.discountAmount),
      notes,
      terms,
      items,
      allowOverbilling = false,
    } = data;

    const existingProjectId = toUuidOrNull(existing.projectId);

    // Milestone uniqueness check if changed
    const targetMilestone = milestoneName !== undefined ? milestoneName : existing.milestoneName;
    if (existingProjectId && targetMilestone && targetMilestone !== existing.milestoneName) {
      const duplicate = await db
        .select()
        .from(customerInvoices)
        .where(
          and(
            eq(customerInvoices.projectId, existingProjectId),
            eq(customerInvoices.milestoneName, targetMilestone),
            sql`${customerInvoices.id} != ${cleanId}`,
            sql`${customerInvoices.status} != 'cancelled'`
          )
        );
      if (duplicate.length > 0) {
        throw new Error(`Milestone "${targetMilestone}" is already invoiced in invoice #${duplicate[0].invoiceNumber || 'Draft'}`);
      }
    }

    const lineItemsToUse = items !== undefined ? items : existing.items;
    const financials = calculateInvoiceFinancials(
      lineItemsToUse,
      taxType,
      discountAmount,
      taxRate
    );

    // Overbilling check
    if (existingProjectId) {
      const [proj] = await db.select().from(projects).where(eq(projects.id, existingProjectId));
      if (proj && Number(proj.contractValue || 0) > 0) {
        const otherInvoices = await db
          .select({ totalAmount: customerInvoices.totalAmount })
          .from(customerInvoices)
          .where(
            and(
              eq(customerInvoices.projectId, existingProjectId),
              sql`${customerInvoices.id} != ${cleanId}`,
              sql`${customerInvoices.status} != 'cancelled'`
            )
          );
        const sumOther = otherInvoices.reduce((s, i) => s + Number(i.totalAmount || 0), 0);
        const proposedTotal = sumOther + financials.totalAmount;
        if (proposedTotal > Number(proj.contractValue) && !allowOverbilling) {
          throw new Error(
            `Contract overbilling detected: Rs. ${proposedTotal.toLocaleString('en-IN')} exceeds contract value of Rs. ${Number(proj.contractValue).toLocaleString('en-IN')}`
          );
        }
      }
    }

    await db
      .update(customerInvoices)
      .set({
        milestoneName: targetMilestone || null,
        invoiceDate: invoiceDate || existing.invoiceDate,
        dueDate: dueDate || existing.dueDate,
        subtotal: String(financials.subtotal),
        discountAmount: String(financials.discountAmount),
        taxableAmount: String(financials.taxableAmount),
        taxType: financials.taxType,
        taxRate: String(financials.taxRate),
        cgstRate: String(financials.cgstRate),
        sgstRate: String(financials.sgstRate),
        igstRate: String(financials.igstRate),
        cgstAmount: String(financials.cgstAmount),
        sgstAmount: String(financials.sgstAmount),
        igstAmount: String(financials.igstAmount),
        taxAmount: String(financials.taxAmount),
        totalAmount: String(financials.totalAmount),
        outstandingAmount: String(financials.totalAmount),
        notes: notes !== undefined ? notes : existing.notes,
        terms: terms !== undefined ? terms : existing.terms,
        updatedAt: new Date(),
      })
      .where(eq(customerInvoices.id, cleanId));

    if (items !== undefined) {
      // Re-insert line items
      await db.delete(customerInvoiceItems).where(eq(customerInvoiceItems.invoiceId, cleanId));
      if (financials.items.length > 0) {
        await db.insert(customerInvoiceItems).values(
          financials.items.map((item) => ({
            invoiceId: cleanId,
            description: item.description,
            quantity: String(item.quantity),
            unitPrice: String(item.unitPrice),
            taxableAmount: String(item.taxableAmount),
            taxRate: String(item.taxRate),
            taxAmount: String(item.taxAmount),
            lineTotal: String(item.lineTotal),
            sortOrder: item.sortOrder,
          }))
        );
      }
    }

    return this.findById(cleanId);
  }

  static async issue(id, user = null) {
    const cleanId = toUuidOrNull(id);
    if (!cleanId) {
      throw new Error('Invalid invoice ID');
    }
    const existing = await this.findById(cleanId);
    if (!existing) {
      throw new Error('Invoice not found');
    }
    if (existing.status !== 'draft') {
      throw new Error(`Cannot issue an invoice with status "${existing.status}". Only draft invoices can be issued.`);
    }

    if (Number(existing.totalAmount || 0) <= 0) {
      throw new Error('Cannot issue an invoice with a total amount of zero or less. Please add valid line items.');
    }

    // Assign concurrency-safe invoice number
    const invoiceNumber = existing.invoiceNumber || (await generateInvoiceNumber());

    const [updated] = await db
      .update(customerInvoices)
      .set({
        invoiceNumber,
        status: 'issued',
        issuedAt: new Date(),
        issuedBy: user?.id || null,
        updatedAt: new Date(),
      })
      .where(eq(customerInvoices.id, cleanId))
      .returning();

    return this.findById(cleanId);
  }

  static async cancel(id, reason = '', user = null) {
    const cleanId = toUuidOrNull(id);
    if (!cleanId) {
      throw new Error('Invalid invoice ID');
    }
    const existing = await this.findById(cleanId);
    if (!existing) {
      throw new Error('Invoice not found');
    }
    if (existing.status === 'cancelled') {
      throw new Error('Invoice is already cancelled');
    }

    // Check if there are active payment allocations
    if (existing.allocations && existing.allocations.length > 0) {
      throw new Error(
        `Cannot cancel invoice #${existing.invoiceNumber || existing.id} because it has active payment allocations (Rs. ${Number(existing.paidAmount || 0).toLocaleString('en-IN')}). Please deallocate or reallocate the payments first.`
      );
    }

    const [updated] = await db
      .update(customerInvoices)
      .set({
        status: 'cancelled',
        cancellationReason: String(reason || 'Cancelled by authorized user').trim(),
        cancelledAt: new Date(),
        cancelledBy: user?.id || null,
        outstandingAmount: '0',
        updatedAt: new Date(),
      })
      .where(eq(customerInvoices.id, cleanId))
      .returning();

    return this.findById(cleanId);
  }
}

export default CustomerInvoiceModel;
