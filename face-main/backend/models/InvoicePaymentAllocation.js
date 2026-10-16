import { and, asc, desc, eq, gte, inArray, isNull, lt, lte, or, sql } from 'drizzle-orm';
import db, { pool } from '../db/index.js';
import {
  customerInvoices,
  customerInvoiceItems,
  invoicePaymentAllocations,
} from '../db/schema/customerInvoice.js';
import { expenseTransactions } from '../db/schema/expenseTransaction.js';
import { projects } from '../db/schema/project.js';
import { leads } from '../db/schema/lead.js';

export class InvoicePaymentAllocationModel {
  /**
   * Allocate an incoming payment (expenseTransaction with type='payment') to an issued customer invoice.
   */
  static async allocate({ paymentTransactionId, invoiceId, amount, notes, user }) {
    const allocAmount = Math.round(Number(amount || 0) * 100) / 100;
    if (allocAmount <= 0) {
      throw new Error('Allocation amount must be greater than zero.');
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Fetch payment transaction with row-level lock
      const paymentRes = await client.query(
        `SELECT * FROM "expenseTransactions" WHERE id = $1 FOR UPDATE`,
        [paymentTransactionId]
      );
      if (paymentRes.rowCount === 0) {
        throw new Error('Payment record not found.');
      }
      const payment = paymentRes.rows[0];

      if (payment.type !== 'payment') {
        throw new Error(
          `Only incoming client payment transactions (type='payment') can be allocated to invoices. This transaction has type='${payment.type}'.`
        );
      }

      const paymentTotal = Math.round(Number(payment.amount || 0) * 100) / 100;
      if (paymentTotal <= 0) {
        throw new Error('Payment transaction amount must be greater than zero.');
      }

      // Sum existing allocations on this payment
      const existingPaymentAllocRes = await client.query(
        `SELECT COALESCE(SUM("allocatedAmount"), 0) AS total_allocated FROM "invoice_payment_allocations" WHERE "paymentTransactionId" = $1`,
        [paymentTransactionId]
      );
      const totalAllocatedOnPayment = Math.round(Number(existingPaymentAllocRes.rows[0]?.total_allocated || 0) * 100) / 100;
      const unallocatedOnPayment = Math.round((paymentTotal - totalAllocatedOnPayment) * 100) / 100;

      if (allocAmount > unallocatedOnPayment) {
        throw new Error(
          `Cannot allocate Rs. ${allocAmount.toLocaleString('en-IN')}: Only Rs. ${unallocatedOnPayment.toLocaleString('en-IN')} remains unallocated on this receipt (Total: Rs. ${paymentTotal.toLocaleString('en-IN')}, Already Allocated: Rs. ${totalAllocatedOnPayment.toLocaleString('en-IN')}).`
        );
      }

      // 2. Fetch invoice with row-level lock
      const invoiceRes = await client.query(
        `SELECT * FROM "customer_invoices" WHERE id = $1 FOR UPDATE`,
        [invoiceId]
      );
      if (invoiceRes.rowCount === 0) {
        throw new Error('Invoice not found.');
      }
      const invoice = invoiceRes.rows[0];

      if (invoice.status === 'draft') {
        throw new Error(
          'Cannot allocate payment to a draft invoice. Please issue the invoice first.'
        );
      }
      if (invoice.status === 'cancelled') {
        throw new Error('Cannot allocate payment to a cancelled invoice.');
      }
      if (invoice.status === 'paid') {
        throw new Error(`Invoice #${invoice.invoiceNumber || invoice.id} is already fully paid.`);
      }

      const invoiceTotal = Math.round(Number(invoice.totalAmount || 0) * 100) / 100;
      const currentPaid = Math.round(Number(invoice.paidAmount || 0) * 100) / 100;
      const outstanding = Math.round((invoiceTotal - currentPaid) * 100) / 100;

      if (allocAmount > outstanding) {
        throw new Error(
          `Allocation amount (Rs. ${allocAmount.toLocaleString('en-IN')}) exceeds the outstanding balance (Rs. ${outstanding.toLocaleString('en-IN')}) of invoice #${invoice.invoiceNumber || invoice.id}.`
        );
      }

      // 3. Compatibility checks
      const invClient = invoice.clientId || invoice.leadId;
      const payClient = payment.leadId;
      if (payClient && invClient && String(payClient) !== String(invClient)) {
        throw new Error(
          `Client mismatch: Payment is linked to lead/client ${payClient}, but invoice is for client ${invClient}. Cannot cross-allocate without matching client.`
        );
      }

      const invProject = invoice.projectId;
      const payProject = payment.projectId;
      if (payProject && invProject && String(payProject) !== String(invProject)) {
        throw new Error(
          `Project mismatch: Payment is tagged for project ${payProject}, but invoice is for project ${invProject}.`
        );
      }

      // 4. Insert allocation
      const insertAllocRes = await client.query(
        `INSERT INTO "invoice_payment_allocations" ("paymentTransactionId", "invoiceId", "allocatedAmount", "notes", "allocatedBy")
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [paymentTransactionId, invoiceId, String(allocAmount), notes || null, user?.id || null]
      );
      const allocationRecord = insertAllocRes.rows[0];

      // 5. Recompute invoice paidAmount & status
      const sumAllocRes = await client.query(
        `SELECT COALESCE(SUM("allocatedAmount"), 0) AS total_paid FROM "invoice_payment_allocations" WHERE "invoiceId" = $1`,
        [invoiceId]
      );
      const newPaidAmount = Math.round(Number(sumAllocRes.rows[0]?.total_paid || 0) * 100) / 100;
      const newOutstanding = Math.max(0, Math.round((invoiceTotal - newPaidAmount) * 100) / 100);

      let newStatus = invoice.status;
      if (newOutstanding <= 0.01) {
        newStatus = 'paid';
      } else if (newPaidAmount > 0) {
        newStatus = 'partially_paid';
      } else {
        newStatus = 'issued';
      }

      await client.query(
        `UPDATE "customer_invoices"
         SET "paidAmount" = $1, "outstandingAmount" = $2, "status" = $3, "updatedAt" = now()
         WHERE id = $4`,
        [String(newPaidAmount), String(newOutstanding), newStatus, invoiceId]
      );

      await client.query('COMMIT');
      return allocationRecord;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Deallocate a payment allocation and safely update invoice status
   */
  static async deallocate(allocationId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const allocRes = await client.query(
        `SELECT * FROM "invoice_payment_allocations" WHERE id = $1 FOR UPDATE`,
        [allocationId]
      );
      if (allocRes.rowCount === 0) {
        throw new Error('Allocation record not found.');
      }
      const allocation = allocRes.rows[0];
      const invoiceId = allocation.invoiceId;

      await client.query(`DELETE FROM "invoice_payment_allocations" WHERE id = $1`, [allocationId]);

      // Recompute invoice status
      const invRes = await client.query(
        `SELECT * FROM "customer_invoices" WHERE id = $1 FOR UPDATE`,
        [invoiceId]
      );
      if (invRes.rowCount > 0) {
        const invoice = invRes.rows[0];
        const sumAllocRes = await client.query(
          `SELECT COALESCE(SUM("allocatedAmount"), 0) AS total_paid FROM "invoice_payment_allocations" WHERE "invoiceId" = $1`,
          [invoiceId]
        );
        const newPaidAmount = Math.round(Number(sumAllocRes.rows[0]?.total_paid || 0) * 100) / 100;
        const invoiceTotal = Math.round(Number(invoice.totalAmount || 0) * 100) / 100;
        const newOutstanding = Math.max(0, Math.round((invoiceTotal - newPaidAmount) * 100) / 100);

        let newStatus = invoice.status;
        if (invoice.status !== 'cancelled') {
          if (newOutstanding <= 0.01 && invoiceTotal > 0) {
            newStatus = 'paid';
          } else if (newPaidAmount > 0) {
            newStatus = 'partially_paid';
          } else {
            newStatus = 'issued';
          }
        }

        await client.query(
          `UPDATE "customer_invoices"
           SET "paidAmount" = $1, "outstandingAmount" = $2, "status" = $3, "updatedAt" = now()
           WHERE id = $4`,
          [String(newPaidAmount), String(newOutstanding), newStatus, invoiceId]
        );
      }

      await client.query('COMMIT');
      return { success: true, deallocatedId: allocationId };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Get all incoming payments (type='payment') with their allocated and unallocated amounts
   */
  static async getPaymentsWithAllocationStatus(filter = {}) {
    let whereClause = `WHERE p.type = 'payment'`;
    const params = [];

    if (filter.scoped) {
      const pIds = (filter.projectIds || []).filter(Boolean);
      const cIds = (filter.clientIds || []).filter(Boolean);
      if (pIds.length === 0 && cIds.length === 0) {
        return [];
      }
      const orClauses = [];
      if (pIds.length > 0) {
        params.push(pIds);
        orClauses.push(`p."projectId" = ANY($${params.length})`);
      }
      if (cIds.length > 0) {
        params.push(cIds);
        orClauses.push(`p."leadId" = ANY($${params.length})`);
      }
      whereClause += ` AND (${orClauses.join(' OR ')})`;
    }

    const query = `
      SELECT
        p.id,
        p.date,
        p.amount,
        p."paymentMethod" AS "paymentMethod",
        p."referenceNumber" AS "reference",
        p.description,
        p.category,
        p."projectId",
        p."leadId",
        p."createdAt",
        COALESCE(SUM(a."allocatedAmount"), 0) AS "allocatedAmount",
        (p.amount - COALESCE(SUM(a."allocatedAmount"), 0)) AS "unallocatedAmount",
        proj.name AS "projectName",
        proj."projectCode",
        COALESCE(lead.company, CONCAT(lead."firstName", ' ', lead."lastName")) AS "clientName",
        lead.company AS "companyName"
      FROM "expenseTransactions" p
      LEFT JOIN "invoice_payment_allocations" a ON p.id = a."paymentTransactionId"
      LEFT JOIN "projects" proj ON p."projectId" = proj.id
      LEFT JOIN "leads" lead ON p."leadId" = lead.id
      ${whereClause}
      GROUP BY p.id, proj.id, lead.id, lead.company, lead."firstName", lead."lastName"
      ORDER BY p.date DESC, p."createdAt" DESC
    `;

    const res = await pool.query(query, params);
    const rows = res.rows.map((row) => ({
      ...row,
      amount: Number(row.amount || 0),
      allocatedAmount: Number(row.allocatedAmount || 0),
      unallocatedAmount: Math.max(0, Number(row.unallocatedAmount || 0)),
    }));

    if (filter.unallocatedOnly) {
      return rows.filter((r) => r.unallocatedAmount > 0);
    }
    return rows;
  }

  /**
   * Generate Accounts Receivable metrics, summary cards, and breakdowns
   */
  static async getAccountsReceivableSummary(options = {}) {
    const today = new Date().toISOString().split('T')[0];

    const pIds = (options.projectIds || []).filter(Boolean);
    const cIds = (options.clientIds || []).filter(Boolean);

    if (options.scoped && pIds.length === 0 && cIds.length === 0) {
      return {
        metrics: {
          totalIssued: 0,
          totalAllocated: 0,
          totalOutstanding: 0,
          overdueReceivables: 0,
          overdueCount: 0,
          partiallyPaidCount: 0,
          unpaidCount: 0,
          dueSoonCount: 0,
          totalReceiptsRecorded: 0,
          totalUnallocatedReceipts: 0,
        },
        clientBreakdown: [],
        projectBreakdown: [],
      };
    }

    let invScopeClause = '';
    let payScopeClause = '';
    const invScopeParams = [];
    const payScopeParams = [];

    if (options.scoped) {
      const orInv = [];
      if (pIds.length > 0) {
        invScopeParams.push(pIds);
        orInv.push(`inv."projectId" = ANY($${invScopeParams.length})`);
      }
      if (cIds.length > 0) {
        invScopeParams.push(cIds);
        orInv.push(`COALESCE(inv."clientId", inv."leadId") = ANY($${invScopeParams.length})`);
      }
      if (orInv.length > 0) {
        invScopeClause = ` AND (${orInv.join(' OR ')})`;
      }

      const orPay = [];
      if (pIds.length > 0) {
        payScopeParams.push(pIds);
        orPay.push(`p."projectId" = ANY($${payScopeParams.length})`);
      }
      if (cIds.length > 0) {
        payScopeParams.push(cIds);
        orPay.push(`p."leadId" = ANY($${payScopeParams.length})`);
      }
      if (orPay.length > 0) {
        payScopeClause = ` AND (${orPay.join(' OR ')})`;
      }
    }

    // 1. Invoices metrics
    const invoiceQuery = `
      SELECT
        status,
        "dueDate",
        "totalAmount",
        "paidAmount",
        "outstandingAmount"
      FROM "customer_invoices" inv
      WHERE inv.status != 'cancelled' AND inv.status != 'draft' ${invScopeClause}
    `;
    const invRes = await pool.query(invoiceQuery, invScopeParams);

    let totalIssued = 0;
    let totalAllocated = 0;
    let totalOutstanding = 0;
    let overdueReceivables = 0;
    let overdueCount = 0;
    let partiallyPaidCount = 0;
    let unpaidCount = 0;
    let dueSoonCount = 0;

    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    for (const row of invRes.rows) {
      const tot = Number(row.totalAmount || 0);
      const paid = Number(row.paidAmount || 0);
      const out = Number(row.outstandingAmount || 0);

      totalIssued += tot;
      totalAllocated += paid;
      totalOutstanding += out;

      if (out > 0) {
        if (row.dueDate < today) {
          overdueReceivables += out;
          overdueCount++;
        } else if (row.dueDate <= sevenDaysFromNow) {
          dueSoonCount++;
        }

        if (paid > 0) {
          partiallyPaidCount++;
        } else {
          unpaidCount++;
        }
      }
    }

    // 2. Payments recorded and unallocated receipts
    const paymentQuery = `
      SELECT
        p.amount,
        COALESCE(SUM(a."allocatedAmount"), 0) AS "allocated"
      FROM "expenseTransactions" p
      LEFT JOIN "invoice_payment_allocations" a ON p.id = a."paymentTransactionId"
      WHERE p.type = 'payment' ${payScopeClause}
      GROUP BY p.id
    `;
    const payRes = await pool.query(paymentQuery, payScopeParams);

    let totalReceiptsRecorded = 0;
    let totalUnallocatedReceipts = 0;

    for (const row of payRes.rows) {
      const amt = Number(row.amount || 0);
      const alloc = Number(row.allocated || 0);
      totalReceiptsRecorded += amt;
      const unalloc = Math.max(0, amt - alloc);
      totalUnallocatedReceipts += unalloc;
    }

    // 3. Client-wise breakdown
    const clientParams = [today];
    let clientScopeClause = '';
    if (options.scoped) {
      const orInv = [];
      if (pIds.length > 0) {
        clientParams.push(pIds);
        orInv.push(`inv."projectId" = ANY($${clientParams.length})`);
      }
      if (cIds.length > 0) {
        clientParams.push(cIds);
        orInv.push(`COALESCE(inv."clientId", inv."leadId") = ANY($${clientParams.length})`);
      }
      if (orInv.length > 0) {
        clientScopeClause = ` AND (${orInv.join(' OR ')})`;
      }
    }

    const clientQuery = `
      SELECT
        COALESCE(l.id, inv."clientId", inv."leadId") AS "clientId",
        COALESCE(l.company, CONCAT(l."firstName", ' ', l."lastName"), inv."clientName", 'Direct Client') AS "clientName",
        COUNT(inv.id) AS "invoiceCount",
        SUM(CASE WHEN inv.status != 'draft' AND inv.status != 'cancelled' THEN inv."totalAmount"::numeric ELSE 0 END) AS "totalInvoiced",
        SUM(CASE WHEN inv.status != 'draft' AND inv.status != 'cancelled' THEN inv."paidAmount"::numeric ELSE 0 END) AS "totalPaid",
        SUM(CASE WHEN inv.status != 'draft' AND inv.status != 'cancelled' THEN inv."outstandingAmount"::numeric ELSE 0 END) AS "totalOutstanding",
        SUM(CASE WHEN inv.status != 'draft' AND inv.status != 'cancelled' AND inv."dueDate" < $1 THEN inv."outstandingAmount"::numeric ELSE 0 END) AS "overdueAmount"
      FROM "customer_invoices" inv
      LEFT JOIN "leads" l ON COALESCE(inv."clientId", inv."leadId") = l.id
      WHERE inv.status != 'cancelled' AND inv.status != 'draft' ${clientScopeClause}
      GROUP BY l.id, inv."clientId", inv."leadId", inv."clientName", l.company, l."firstName", l."lastName"
      HAVING SUM(inv."outstandingAmount"::numeric) > 0 OR SUM(inv."totalAmount"::numeric) > 0
      ORDER BY "totalOutstanding" DESC
    `;
    const clientRes = await pool.query(clientQuery, clientParams);

    // 4. Project-wise breakdown
    const projectParams = [today];
    let projectScopeClause = '';
    if (options.scoped) {
      if (pIds.length > 0) {
        projectParams.push(pIds);
        projectScopeClause = ` AND inv."projectId" = ANY($${projectParams.length})`;
      } else {
        projectScopeClause = ` AND 1=0`;
      }
    }

    const projectQuery = `
      SELECT
        p.id AS "projectId",
        p.name AS "projectName",
        p."projectCode",
        p."contractValue"::numeric AS "contractValue",
        COUNT(inv.id) AS "invoiceCount",
        SUM(CASE WHEN inv.status != 'draft' AND inv.status != 'cancelled' THEN inv."totalAmount"::numeric ELSE 0 END) AS "totalInvoiced",
        SUM(CASE WHEN inv.status != 'draft' AND inv.status != 'cancelled' THEN inv."paidAmount"::numeric ELSE 0 END) AS "totalPaid",
        SUM(CASE WHEN inv.status != 'draft' AND inv.status != 'cancelled' THEN inv."outstandingAmount"::numeric ELSE 0 END) AS "totalOutstanding",
        SUM(CASE WHEN inv.status != 'draft' AND inv.status != 'cancelled' AND inv."dueDate" < $1 THEN inv."outstandingAmount"::numeric ELSE 0 END) AS "overdueAmount"
      FROM "customer_invoices" inv
      JOIN "projects" p ON inv."projectId" = p.id
      WHERE inv.status != 'cancelled' AND inv.status != 'draft' ${projectScopeClause}
      GROUP BY p.id, p.name, p."projectCode", p."contractValue"
      ORDER BY "totalOutstanding" DESC
    `;
    const projRes = await pool.query(projectQuery, projectParams);

    return {
      metrics: {
        totalIssued: Math.round(totalIssued * 100) / 100,
        totalAllocated: Math.round(totalAllocated * 100) / 100,
        totalOutstanding: Math.round(totalOutstanding * 100) / 100,
        overdueReceivables: Math.round(overdueReceivables * 100) / 100,
        overdueCount,
        partiallyPaidCount,
        unpaidCount,
        dueSoonCount,
        totalReceiptsRecorded: Math.round(totalReceiptsRecorded * 100) / 100,
        totalUnallocatedReceipts: Math.round(totalUnallocatedReceipts * 100) / 100,
      },
      clientBreakdown: clientRes.rows.map((r) => ({
        ...r,
        totalInvoiced: Number(r.totalInvoiced || 0),
        totalPaid: Number(r.totalPaid || 0),
        totalOutstanding: Number(r.totalOutstanding || 0),
        overdueAmount: Number(r.overdueAmount || 0),
      })),
      projectBreakdown: projRes.rows.map((r) => ({
        ...r,
        contractValue: Number(r.contractValue || 0),
        totalInvoiced: Number(r.totalInvoiced || 0),
        totalPaid: Number(r.totalPaid || 0),
        totalOutstanding: Number(r.totalOutstanding || 0),
        overdueAmount: Number(r.overdueAmount || 0),
      })),
    };
  }
}

export default InvoicePaymentAllocationModel;
