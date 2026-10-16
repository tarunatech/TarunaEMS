import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import { uploadsDir } from '../config/uploadPaths.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const invoicesDir = path.join(uploadsDir, 'invoices');
const logoPath = path.resolve(__dirname, '../../frontend/public/Taruna-logo-text.png');

const ensureInvoiceDir = () => fs.mkdirSync(invoicesDir, { recursive: true });

const companyDetails = {
  name: 'TARUNA TECHNOLOGY',
  tagline: 'Enterprise Software & IT Solutions',
  address: '709, 710, Broadway Empire, Nilamber Circle, Vasna Bhayli Main Rd, Bhayli, Vadodara, Gujarat 391410',
  phone: '+91 910 6610 595',
  email: 'tarunatechnology@gmail.com',
  website: 'www.tarunatech.com',
};

const formatINR = (val) => {
  const n = Number(val || 0);
  return 'Rs. ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (val) => {
  if (!val) return '-';
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

/**
 * Generate a PDF invoice for a CustomerInvoice object.
 * Returns { filePath, fileName }
 */
export const generateCustomerInvoicePdf = async (invoice) => {
  ensureInvoiceDir();
  const safeNumber = (invoice.invoiceNumber || invoice.id).replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Invoice_${safeNumber}.pdf`;
  const filePath = path.join(invoicesDir, fileName);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    const primaryColor = '#4338ca'; // Indigo
    const secondaryColor = '#0f172a'; // Slate 900
    const mutedColor = '#64748b'; // Slate 500
    const lightBg = '#f8fafc'; // Slate 50
    const borderColor = '#e2e8f0'; // Slate 200

    // Header Background Accent Bar
    doc.save();
    doc.rect(0, 0, doc.page.width, 10).fill(primaryColor);
    doc.restore();

    // Top Header: Logo or Company Name
    const topY = 28;
    const logoWidth = 145;
    const logoHeight = 58; // 145 * (793 / 1983) ≈ 57.98 pt
    let logoLoaded = false;
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, 40, topY, { width: logoWidth });
        logoLoaded = true;
      } catch (e) {
        logoLoaded = false;
      }
    }

    if (!logoLoaded) {
      doc
        .font('Helvetica-Bold')
        .fontSize(18)
        .fillColor(primaryColor)
        .text(companyDetails.name, 40, topY);
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(mutedColor)
        .text(companyDetails.tagline, 40, topY + 20);
    }

    // Company Contact Information (placed cleanly below logo with proper padding)
    const compY = topY + (logoLoaded ? logoHeight + 10 : 38);
    doc.font('Helvetica').fontSize(8).fillColor(mutedColor);

    const addressLines = [
      '709, 710, Broadway Empire, Nilamber Circle,',
      'Vasna Bhayli Main Rd, Bhayli, Vadodara, Gujarat 391410',
      `Email: ${companyDetails.email}  •  Phone: ${companyDetails.phone}`,
      `Website: ${companyDetails.website}`,
    ];

    let compCurY = compY;
    addressLines.forEach((line) => {
      doc.text(line, 40, compCurY, { width: 280 });
      compCurY += 11;
    });
    const compBottomY = compCurY;

    // Right Column: Title and Status Badge
    const rightX = doc.page.width - 240;
    doc
      .font('Helvetica-Bold')
      .fontSize(22)
      .fillColor(secondaryColor)
      .text('TAX INVOICE', rightX, topY, { width: 200, align: 'right' });

    const STATUS_CONFIG = {
      DRAFT: { text: '#d97706', bg: '#fef3c7', border: '#fde68a' },
      ISSUED: { text: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
      PARTIALLY_PAID: { text: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
      PAID: { text: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
      CANCELLED: { text: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
    };
    const statusKey = (invoice.status || 'DRAFT').toUpperCase();
    const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.DRAFT;
    const statusLabel = statusKey.replace('_', ' ');

    doc.font('Helvetica-Bold').fontSize(8.5);
    const badgeW = Math.max(76, doc.widthOfString(statusLabel) + 18);
    const badgeH = 18;
    const badgeX = doc.page.width - 40 - badgeW;
    const badgeY = topY + 28;

    doc.save();
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 9).fillAndStroke(statusCfg.bg, statusCfg.border);
    doc.fillColor(statusCfg.text).text(statusLabel, badgeX, badgeY + 4.5, { width: badgeW, align: 'center' });
    doc.restore();

    // Invoice Meta Box (Right Side)
    const metaBoxY = topY + 54;
    const metaBoxW = 200;
    const metaBoxH = 58;

    doc.save();
    doc.roundedRect(rightX, metaBoxY, metaBoxW, metaBoxH, 6).fillAndStroke(lightBg, borderColor);
    doc.restore();

    const metaRow = (label, val, yOff) => {
      doc.font('Helvetica').fontSize(8.5).fillColor(mutedColor).text(label, rightX + 12, metaBoxY + yOff);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(secondaryColor).text(val, rightX + 12, metaBoxY + yOff, { width: metaBoxW - 24, align: 'right' });
    };

    metaRow('Invoice Number:', invoice.invoiceNumber || 'DRAFT', 9);
    metaRow('Invoice Date:', formatDate(invoice.invoiceDate), 24);
    metaRow('Due Date:', formatDate(invoice.dueDate), 39);

    const metaBottomY = metaBoxY + metaBoxH;

    // Divider Line
    const div1Y = Math.max(compBottomY, metaBottomY) + 14;
    doc.lineWidth(1).strokeColor(borderColor).moveTo(40, div1Y).lineTo(doc.page.width - 40, div1Y).stroke();

    // Client and Project Info Card
    const clientBoxY = div1Y + 14;
    doc
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .fillColor(primaryColor)
      .text('BILLED TO', 40, clientBoxY);

    const clientName = invoice.client?.company_name || invoice.client?.name || 'Direct Client';
    const clientContact = invoice.client?.email || invoice.client?.phone || '';
    const clientAddr = invoice.client?.address || invoice.client?.city || '';

    let clientCurY = clientBoxY + 15;
    doc
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .fillColor(secondaryColor)
      .text(clientName, 40, clientCurY, { width: 280 });
    clientCurY += 14;

    if (invoice.client?.company_name && invoice.client?.name) {
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(mutedColor)
        .text(`Attn: ${invoice.client.name}`, 40, clientCurY, { width: 280 });
      clientCurY += 12;
    }
    if (clientContact) {
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(mutedColor)
        .text(`Contact: ${clientContact}`, 40, clientCurY, { width: 280 });
      clientCurY += 12;
    }
    if (clientAddr) {
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(mutedColor)
        .text(clientAddr, 40, clientCurY, { width: 280 });
      clientCurY += 12;
    }

    // Project & Milestone (Right column of Billed To)
    const projBoxX = doc.page.width - 240;
    doc
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .fillColor(primaryColor)
      .text('PROJECT REFERENCE', projBoxX, clientBoxY);

    const projectName = invoice.project?.name || 'General Invoicing';
    const projectCode = invoice.project?.projectCode ? `[${invoice.project.projectCode}] ` : '';

    let projCurY = clientBoxY + 15;
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(secondaryColor)
      .text(`${projectCode}${projectName}`, projBoxX, projCurY, { width: 200 });
    projCurY += 15;

    if (invoice.milestoneName) {
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor(mutedColor)
        .text('Milestone: ', projBoxX, projCurY, { continued: true })
        .font('Helvetica')
        .text(invoice.milestoneName, { width: 200 });
      projCurY += 14;
    }

    // Line Items Table Header
    const tableTop = Math.max(clientCurY, projCurY, clientBoxY + 65) + 12;
    doc.save();
    doc.rect(40, tableTop, doc.page.width - 80, 22).fill(primaryColor);
    doc.restore();

    doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff');
    doc.text('#', 46, tableTop + 6, { width: 20 });
    doc.text('DESCRIPTION', 75, tableTop + 6, { width: 240 });
    doc.text('QTY', 320, tableTop + 6, { width: 45, align: 'right' });
    doc.text('UNIT PRICE', 375, tableTop + 6, { width: 70, align: 'right' });
    doc.text('AMOUNT', 455, tableTop + 6, { width: doc.page.width - 495, align: 'right' });

    let itemY = tableTop + 24;
    const items = invoice.items || [];

    items.forEach((item, index) => {
      const isEven = index % 2 === 0;
      doc.save();
      doc
        .rect(40, itemY, doc.page.width - 80, 22)
        .fill(isEven ? '#ffffff' : lightBg);
      doc.restore();

      doc.font('Helvetica').fontSize(8.5).fillColor(secondaryColor);
      doc.text(String(index + 1), 46, itemY + 6, { width: 20 });
      doc.text(item.description || 'Service / Product Item', 75, itemY + 6, { width: 240 });
      doc.text(String(item.quantity || 1), 320, itemY + 6, { width: 45, align: 'right' });
      doc.text(formatINR(item.unitPrice), 375, itemY + 6, { width: 70, align: 'right' });
      doc.text(formatINR(item.lineTotal), 455, itemY + 6, { width: doc.page.width - 495, align: 'right' });

      itemY += 22;
    });

    // Table bottom border
    doc.lineWidth(1).strokeColor(borderColor).moveTo(40, itemY).lineTo(doc.page.width - 40, itemY).stroke();

    // Summary Section
    const sumX = doc.page.width - 240;
    let sumY = itemY + 12;

    const printSumRow = (label, valueText, isBold = false, color = secondaryColor, size = 9) => {
      doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).fillColor(color);
      doc.text(label, sumX, sumY, { width: 110 });
      doc.text(valueText, sumX + 110, sumY, { width: 90, align: 'right' });
      sumY += 16;
    };

    printSumRow('Subtotal:', formatINR(invoice.subtotal));

    if (Number(invoice.discountAmount || 0) > 0) {
      printSumRow('Discount:', `- ${formatINR(invoice.discountAmount)}`, false, '#ef4444');
    }

    printSumRow('Taxable Amount:', formatINR(invoice.taxableAmount));

    if (invoice.taxType === 'CGST_SGST') {
      printSumRow(`CGST (${invoice.cgstRate || 9}%):`, formatINR(invoice.cgstAmount));
      printSumRow(`SGST (${invoice.sgstRate || 9}%):`, formatINR(invoice.sgstAmount));
    } else if (invoice.taxType === 'IGST') {
      printSumRow(`IGST (${invoice.igstRate || 18}%):`, formatINR(invoice.igstAmount));
    }

    sumY += 4;
    doc.lineWidth(1).strokeColor(borderColor).moveTo(sumX, sumY).lineTo(doc.page.width - 40, sumY).stroke();
    sumY += 8;

    printSumRow('Total Amount:', formatINR(invoice.totalAmount), true, primaryColor, 11);

    if (Number(invoice.paidAmount || 0) > 0) {
      printSumRow('Amount Paid:', formatINR(invoice.paidAmount), true, '#10b981', 9.5);
    }
    printSumRow('Balance Due:', formatINR(invoice.outstandingAmount), true, Number(invoice.outstandingAmount) > 0 ? '#dc2626' : '#10b981', 11);

    // Terms and Payment Info on Left of summary
    let notesY = itemY + 14;
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(primaryColor)
      .text('PAYMENT INSTRUCTIONS', 40, notesY);

    notesY += 14;
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(mutedColor)
      .text('Account Name: Taruna Technology', 40, notesY)
      .text('Bank: HDFC Bank', 40, notesY + 11)
      .text('Account No: 50200067891234', 40, notesY + 22)
      .text('IFSC Code: HDFC0001234', 40, notesY + 33);

    if (invoice.notes) {
      notesY += 48;
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor(secondaryColor)
        .text('Notes / Instructions:', 40, notesY);
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(mutedColor)
        .text(invoice.notes, 40, notesY + 12, { width: 230 });
    }

    // Footer with Watermark if Draft or Cancelled
    if (invoice.status === 'draft') {
      doc.save();
      doc.rotate(45, { origin: [doc.page.width / 2, doc.page.height / 2] });
      doc.opacity(0.12).font('Helvetica-Bold').fontSize(64).fillColor('#64748b').text('DRAFT INVOICE', 120, 300);
      doc.restore();
    } else if (invoice.status === 'cancelled') {
      doc.save();
      doc.rotate(45, { origin: [doc.page.width / 2, doc.page.height / 2] });
      doc.opacity(0.15).font('Helvetica-Bold').fontSize(64).fillColor('#ef4444').text('CANCELLED', 160, 300);
      doc.restore();
    }

    // Signatory block
    const signY = doc.page.height - 85;
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(mutedColor)
      .text('This is a computer-generated invoice. Authorized Signatory for Taruna Technology.', 40, signY);

    doc.end();

    writeStream.on('finish', () => resolve({ filePath, fileName }));
    writeStream.on('error', (err) => reject(err));
  });
};

export default { generateCustomerInvoicePdf };
