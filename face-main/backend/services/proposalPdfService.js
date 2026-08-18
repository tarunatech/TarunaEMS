import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import PDFDocument from 'pdfkit';
import { uploadPublicPath, uploadsDir } from '../config/uploadPaths.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const proposalDir = path.join(uploadsDir, 'proposals');
const logoPath = path.resolve(__dirname, '../../frontend/public/Taruna-logo-text.png');
const ensureProposalDir = () => fs.mkdirSync(proposalDir, { recursive: true });
const value = (input, fallback = '-') => input === undefined || input === null || input === '' ? fallback : String(input);
const list = (input) => Array.isArray(input) ? input : [];
const hasText = (input) => String(input || '').trim().length > 0;
const hasContent = (input) => Array.isArray(input)
  ? input.some(item => typeof item === 'string'
    ? hasText(item)
    : Object.values(item || {}).some(val => Array.isArray(val) ? val.length : hasText(val)))
  : hasText(input);

const formatMoney = (amount, currency = 'INR') => {
  const number = Number(amount || 0);
  if (!number) return '-';
  const prefix = currency === 'INR' ? 'Rs. ' : `${currency} `;
  return `${prefix}${number.toLocaleString('en-IN')}`;
};

const formatDateDisplay = (dateVal) => {
  if (!dateVal) return '-';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleDateString('en-IN');
};

const drawDotGrid = (doc, startX, startY, cols = 8, rows = 6) => {
  doc.save();
  doc.opacity(0.6).fillColor('#a855f7');
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      doc.circle(startX + (col * 14), startY + (row * 14), 1.5).fill();
    }
  }
  doc.restore();
};

const drawBottomArc = (doc) => {
  doc.save();
  doc.rect(0, 0, doc.page.width, doc.page.height).clip();
  doc.opacity(0.85).fillColor('#c026d3');
  doc.circle(doc.page.width - 10, doc.page.height - 10, 110).fill();
  doc.fillColor('#ffffff').circle(doc.page.width - 10, doc.page.height - 10, 55).fill();
  doc.restore();
};

const drawCircuitLines = (doc) => {
  doc.save();
  doc.lineWidth(1.5).strokeColor('#9333ea');
  doc.moveTo(doc.page.width - 160, 360).lineTo(doc.page.width - 98, 360).lineTo(doc.page.width - 78, 348).lineTo(doc.page.width - 20, 348).stroke();
  doc.moveTo(doc.page.width - 190, 374).lineTo(doc.page.width - 108, 374).lineTo(doc.page.width - 88, 386).lineTo(doc.page.width - 20, 386).stroke();
  doc.fillColor('#9333ea').circle(doc.page.width - 164, 360, 2.5).fill().circle(doc.page.width - 194, 374, 2.5).fill();
  doc.restore();
};

const drawGlobeIcon = (doc, cx, cy, r = 13) => {
  doc.save();
  doc.fillColor('#4338ca').circle(cx, cy, r).fill();
  doc.lineWidth(1).strokeColor('#ffffff');
  doc.circle(cx, cy, r * 0.62).stroke();
  doc.moveTo(cx - (r * 0.62), cy).lineTo(cx + (r * 0.62), cy).stroke();
  doc.moveTo(cx, cy - (r * 0.62)).lineTo(cx, cy + (r * 0.62)).stroke();
  doc.restore();
};

const drawPhoneIcon = (doc, cx, cy, r = 13) => {
  doc.save();
  doc.fillColor('#db2777').circle(cx, cy, r).fill();
  doc.lineWidth(1.2).strokeColor('#ffffff').lineCap('round');
  doc.moveTo(cx - 3.5, cy - 4.5)
    .lineTo(cx - 1.5, cy - 4.5)
    .lineTo(cx - 0.5, cy - 2.5)
    .lineTo(cx - 2, cy - 1)
    .bezierCurveTo(cx - 1, cy + 1.5, cx + 1.5, cy + 4, cx + 4, cy + 5)
    .lineTo(cx + 5.5, cy + 3.5)
    .lineTo(cx + 7.5, cy + 4.5)
    .lineTo(cx + 7.5, cy + 6.5)
    .bezierCurveTo(cx + 4, cy + 8, cx - 5, cy - 1, cx - 3.5, cy - 4.5)
    .stroke();
  doc.restore();
};

const drawMailIcon = (doc, cx, cy, r = 13) => {
  doc.save();
  doc.fillColor('#1e1b4b').circle(cx, cy, r).fill();
  doc.lineWidth(1).strokeColor('#ffffff');
  const w = 12;
  const h = 8;
  const x = cx - (w / 2);
  const y = cy - (h / 2);
  doc.rect(x, y, w, h).stroke();
  doc.moveTo(x, y).lineTo(cx, y + 4.5).lineTo(x + w, y).stroke();
  doc.restore();
};

const addPageHeader = (doc, proposal) => {
  doc.save();
  if (fs.existsSync(logoPath)) doc.image(logoPath, 42, 16, { width: 50 });
  doc.fillColor('#db2777').fontSize(8.5).text(value(proposal.proposalType, 'Project Proposal'), doc.page.width - 220, 24, { width: 178, align: 'right' });
  doc.moveTo(42, 42).lineTo(doc.page.width - 42, 42).strokeColor('#f1f5f9').lineWidth(0.8).stroke();
  doc.restore();
};

const addWatermark = (doc) => {
  doc.save();
  if (fs.existsSync(logoPath)) {
    doc.opacity(0.12).image(logoPath, (doc.page.width - 340) / 2, (doc.page.height - 340) / 2, { width: 340 });
  }
  doc.restore();
};

const addCoverPage = (doc, proposal) => {
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, (doc.page.width - 210) / 2, 45, { width: 210 });
  }

  const subTitle = value(proposal.subtitle || proposal.proposalType || 'CUSTOM ERP & PRODUCTION MANAGEMENT SYSTEM').toUpperCase();
  doc.fillColor('#db2777').font('Helvetica-Bold').fontSize(11).text(subTitle, 54, 225, { width: 480 });

  doc.fillColor('#312e81').font('Helvetica-Bold').fontSize(40).text('PROJECT', 54, 248, { width: 400 });
  doc.text('PROPOSAL', 54, 290, { width: 400 });

  drawCircuitLines(doc);

  const desc = proposal.description || `Project details and budget projections for ${proposal.proposalType || 'WEB APP Development'}`;
  doc.fillColor('#1e293b').font('Helvetica').fontSize(12).text(desc, 54, 355, { width: 340, lineGap: 3 });

  const presY = 445;
  doc.strokeColor('#db2777').lineWidth(2.5).moveTo(54, presY).lineTo(54, presY + 95).stroke();
  doc.fillColor('#db2777').font('Helvetica-Bold').fontSize(11).text('Presented to', 68, presY + 4);
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12).text(value(proposal.companyName, 'Client'), 68, presY + 22, { width: 320 });
  if (hasText(proposal.customerName)) {
    doc.fillColor('#475569').font('Helvetica').fontSize(10).text(value(proposal.customerName), 68, presY + 38, { width: 320 });
  }

  const presByY = presY + 54;
  doc.fillColor('#db2777').font('Helvetica-Bold').fontSize(11).text('Presented by', 68, presByY);
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12).text('TARUNA TECHNOLOGY', 68, presByY + 18);

  drawDotGrid(doc, 54, 670, 8, 6);
  drawBottomArc(doc);
};

const addThankYouPage = (doc, proposal) => {
  doc.addPage();

  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, (doc.page.width - 220) / 2, 45, { width: 220 });
  }

  doc.fillColor('#db2777').font('Helvetica-Bold').fontSize(26).text('FOR INQUIRIES,', 54, 230, { width: 480 });
  doc.fillColor('#312e81').font('Helvetica-Bold').fontSize(26).text('CONTACT US', 54, 262, { width: 480 });

  const contact = proposal.contactDetails || {};
  const web = value(contact.website, 'www.tarunatech.com');
  const phone = value(contact.phone, '+91 910 6610 595');
  const email = value(contact.email, 'tarunatechnology@gmail.com');
  const address = value(contact.address, '709,710, Broadway Empire, Nilamber circle, Vasna Bhayli Main Rd, Bhayli, Vadodara, Gujarat 391410');

  let itemY = 325;

  // Globe + Website
  drawGlobeIcon(doc, 70, itemY + 8, 13);
  doc.fillColor('#0f172a').font('Helvetica').fontSize(11).text(web, 94, itemY + 2, { width: 420 });
  itemY += 38;

  // Phone
  drawPhoneIcon(doc, 70, itemY + 8, 13);
  doc.fillColor('#0f172a').font('Helvetica').fontSize(11).text(phone, 94, itemY + 2, { width: 420 });
  itemY += 38;

  // Mail
  drawMailIcon(doc, 70, itemY + 8, 13);
  doc.fillColor('#0f172a').font('Helvetica').fontSize(11).text(email, 94, itemY + 2, { width: 420 });

  drawDotGrid(doc, 54, 600, 8, 5);

  doc.fillColor('#334155').font('Helvetica').fontSize(10).text(address, 54, 675, { width: doc.page.width - 108, align: 'center', lineGap: 3 });
  doc.fillColor('#db2777').font('Helvetica-Bold').fontSize(10.5).text(web, 54, doc.y + 8, { width: doc.page.width - 108, align: 'center' });

  drawBottomArc(doc);
};

const ensureSpace = (doc, height = 80, proposal) => {
  if (doc.y + height < doc.page.height - 54) return;
  doc.addPage();
  addPageHeader(doc, proposal);
  addWatermark(doc);
  doc.y = 54;
};

const sectionTitle = (doc, title, proposal) => {
  ensureSpace(doc, 44, proposal);
  doc.moveDown(0.5);
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(14).text(title, 48, doc.y, { width: doc.page.width - 96 });
  doc.moveTo(48, doc.y + 3).lineTo(168, doc.y + 3).strokeColor('#db2777').lineWidth(1.2).stroke();
  doc.fillColor('#0f172a');
  doc.y += 14;
};

const ensureSectionLeadSpace = (doc, estimate, proposal) => {
  ensureSpace(doc, estimate, proposal);
};

const paragraph = (doc, text, proposal) => {
  if (!hasText(text)) return;
  ensureSpace(doc, 36, proposal);
  doc.fillColor('#334155').font('Helvetica').fontSize(11).text(String(text).trim(), 48, doc.y, {
    width: doc.page.width - 96,
    align: 'justify',
    lineGap: 4
  });
  doc.moveDown(0.6);
};

const bullets = (doc, items, proposal) => {
  list(items).filter(hasContent).forEach((item) => {
    ensureSpace(doc, 22, proposal);
    const startY = doc.y;
    const itemText = typeof item === 'string' ? item.replace(/^[-•]\s*/, '') : value(item.title || item.description);
    if (!hasText(itemText)) return;
    doc.fillColor('#db2777').font('Helvetica-Bold').fontSize(10).text('•', 48, startY);
    doc.fillColor('#334155').font('Helvetica').fontSize(10).text(itemText.trim(), 62, startY, {
      width: doc.page.width - 110,
      lineGap: 3
    });
    doc.moveDown(0.35);
  });
  doc.moveDown(0.3);
};

const modules = (doc, items, proposal) => {
  list(items).filter(hasContent).forEach((item) => {
    ensureSpace(doc, 50, proposal);
    if (typeof item === 'string') {
      paragraph(doc, item, proposal);
    } else {
      if (hasText(item.title)) {
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11).text(item.title, 48, doc.y, { width: doc.page.width - 96 });
      }
      if (hasText(item.description)) paragraph(doc, item.description, proposal);
      if (hasContent(item.features)) bullets(doc, item.features, proposal);
    }
    doc.moveDown(0.4);
  });
};

const pairedList = (doc, items, proposal, titleKey = 'title', bodyKey = 'description') => {
  list(items).filter(hasContent).forEach((item) => {
    ensureSpace(doc, 42, proposal);
    if (typeof item === 'string') {
      paragraph(doc, item, proposal);
    } else {
      const t = value(item[titleKey] || item.technology);
      const d = value(item[bodyKey] || item.purpose, '');
      if (hasText(t)) {
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10.5).text(t, 48, doc.y, { width: doc.page.width - 96 });
        if (hasText(d)) {
          doc.fillColor('#334155').font('Helvetica').fontSize(10.5).text(d, 48, doc.y + 14, { width: doc.page.width - 96, lineGap: 3 });
          doc.y += 14;
        }
      }
    }
    doc.moveDown(0.6);
  });
};

const table = (doc, title, rows, columns, proposal) => {
  if (!hasContent(rows)) return;
  ensureSectionLeadSpace(doc, 72, proposal);
  sectionTitle(doc, title, proposal);
  const width = doc.page.width - 96;
  const colWidth = width / columns.length;
  const headerY = doc.y;

  doc.fillColor('#0f172a').roundedRect(48, headerY, width, 24, 4).fill();
  columns.forEach((column, index) => {
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8.5).text(
      column.label,
      54 + (index * colWidth),
      headerY + 7,
      { width: colWidth - 12, height: 14 }
    );
  });

  doc.y = headerY + 28;

  list(rows).forEach((row) => {
    ensureSpace(doc, 32, proposal);
    const startY = doc.y;
    doc.fillColor('#f8fafc').rect(48, startY, width, 26).fill();
    columns.forEach((column, index) => {
      const raw = row?.[column.key];
      const display = column.format ? column.format(raw, row) : value(raw);
      doc.fillColor('#334155').font('Helvetica').fontSize(8.5).text(
        display,
        54 + (index * colWidth),
        startY + 7,
        { width: colWidth - 12, height: 18 }
      );
    });
    doc.y = startY + 28;
  });
  doc.moveDown(0.5);
};

const renderSection = (doc, title, body, proposal) => {
  if (!hasContent(body)) return;
  ensureSectionLeadSpace(doc, Array.isArray(body) ? 56 : 72, proposal);
  sectionTitle(doc, title, proposal);

  if (typeof body === 'string') {
    const blocks = body.split(/\n\s*\n/).filter(hasText);
    blocks.forEach(block => {
      const lines = block.split('\n').map(s => s.trim()).filter(Boolean);
      if (lines.length > 0 && lines.every(l => l.startsWith('-') || l.startsWith('•'))) {
        bullets(doc, lines, proposal);
      } else {
        paragraph(doc, block, proposal);
      }
    });
  } else if (Array.isArray(body)) {
    bullets(doc, body, proposal);
  }
};

export const generateProposalPdf = async ({ proposal }) => {
  console.log('[Proposal PDF] started');
  try {
    ensureProposalDir();
    const fileName = `proposal_${uuidv4().slice(0, 8)}.pdf`;
    const filePath = path.join(proposalDir, fileName);

    console.log('[Proposal PDF] renderer initialized');
    const doc = new PDFDocument({ size: 'A4', margin: 42, bufferPages: false });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    addCoverPage(doc, proposal);
    doc.addPage();
    addPageHeader(doc, proposal);
    addWatermark(doc);
    doc.y = 64;

    const pricing = proposal.pricing || {};
    const commercialRows = [
      ['Total Price', formatMoney(pricing.totalPrice, pricing.currency)],
      ['Discounted Price', formatMoney(pricing.discountedPrice, pricing.currency)],
      ['AMC Cost', pricing.amcCost ? `${formatMoney(pricing.amcCost, pricing.currency)} / year` : '-'],
      ['Valid Until', formatDateDisplay(proposal.validity?.validUntil)]
    ].filter(([, val]) => val !== '-');
    if (commercialRows.length) sectionTitle(doc, 'Commercial Summary', proposal);
    commercialRows.forEach(([label, val]) => {
      ensureSpace(doc, 28, proposal);
      doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(9).text(label, 54, doc.y, { width: 160 });
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11).text(val, 220, doc.y, { width: 260 });
      doc.moveDown(0.7);
    });

    const sections = proposal.sections || {};
    [
      ['Company Introduction', sections.companyIntroduction],
      ['Executive Summary', sections.executiveSummary],
      ['Project Objectives', sections.projectObjectives],
      ['Scope of Work', sections.scopeOfWork],
      ['Proposed Solution / Basic Phrases', sections.proposedSolution]
    ].forEach(([title, body]) => renderSection(doc, title, body, proposal));

    if (hasContent(sections.technologyStack)) {
      sectionTitle(doc, 'Technology Stack', proposal);
      pairedList(doc, sections.technologyStack, proposal, 'technology', 'purpose');
    }

    if (hasContent(sections.coreModules)) {
      sectionTitle(doc, 'Core Modules & Features', proposal);
      modules(doc, sections.coreModules, proposal);
    }

    if (hasContent(sections.systemWorkflow)) {
      sectionTitle(doc, 'System Workflow', proposal);
      pairedList(doc, sections.systemWorkflow, proposal);
    }

    const costRows = list(sections.projectCostBreakdown);
    table(doc, 'Project Cost Breakdown', costRows, [
      { key: 'component', label: 'Module / Service' },
      { key: 'cost', label: 'Cost', format: item => formatMoney(item, pricing.currency) }
    ], proposal);
    const totalCost = costRows.reduce((sum, row) => sum + Number(row?.cost || 0), 0);
    paragraph(doc, `Total Project Cost: ${formatMoney(totalCost || pricing.totalPrice, pricing.currency)}`, proposal);

    [
      ['Project Investment Details', sections.projectInvestmentDetails],
      ['Security & Data Protection', sections.securityAndDataProtection],
      ['Support & Maintenance', sections.supportAndMaintenance],
      ['Deliverables', sections.deliverables],
      ['Why Taruna Technology', sections.whyUs],
      ['Terms & Conditions', sections.termsAndConditions]
    ].forEach(([title, items]) => renderSection(doc, title, items, proposal));

    const timelineRows = list(sections.projectTimeline);
    const timelineHasNotes = timelineRows.some(row => hasText(row?.notes));
    table(doc, 'Project Timeline', timelineRows, timelineHasNotes ? [
      { key: 'phase', label: 'Phase' },
      { key: 'duration', label: 'Duration' },
      { key: 'notes', label: 'Notes' }
    ] : [
      { key: 'phase', label: 'Phase' },
      { key: 'duration', label: 'Duration' }
    ], proposal);

    table(doc, 'Payment Terms', sections.paymentTerms, [
      { key: 'milestone', label: 'Milestone' },
      { key: 'description', label: 'Description' },
      { key: 'percentage', label: '%', format: item => item ? `${item}%` : '-' }
    ], proposal);

    [
      ['Software Development Agreement', sections.agreement],
      ['Intellectual Property Rights', sections.intellectualPropertyRights],
      ['Hosting & Third-Party Services', sections.hostingThirdPartyServices],
      ['Termination', sections.termination],
      ['Limitation of Liability', sections.limitationOfLiability],
      ['Governing Law', sections.governingLaw]
    ].forEach(([title, body]) => renderSection(doc, title, body, proposal));

    const signatures = proposal.signatureDetails || {};
    sectionTitle(doc, 'Agreement & Signatures', proposal);
    bullets(doc, [
      `Client Name: ${value(signatures.clientName)}`,
      `Client Date: ${value(signatures.clientDate)}`,
      `Place: ${value(signatures.place)}`,
      `Client Signature: ${value(signatures.clientSignature, '________________')}`,
      `For Taruna Technology: ${value(signatures.authorizedSignatory, 'Authorized Signatory')}`,
      `Taruna Date: ${value(signatures.tarunaDate)}`
    ], proposal);

    // Add final separate Thank You / Contact Us Page
    addThankYouPage(doc, proposal);

    doc.end();

    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    // TASK 12: size and response diagnostics
    let sizeBytes = 0;
    try { sizeBytes = fs.statSync(filePath).size; } catch (_) {}
    console.log(`[Proposal PDF] PDF generated: true, sizeBytes: ${sizeBytes}`);

    const publicUrl = uploadPublicPath('proposals', fileName);
    console.log('[Proposal PDF] response sent');
    return publicUrl;
  } catch (pdfError) {
    console.error('[Proposal PDF] PDF generation FAILED:', pdfError.message);
    console.error('[Proposal PDF] Stack:', pdfError.stack?.split('\n').slice(0, 5).join('\n'));
    throw pdfError;
  }
};
