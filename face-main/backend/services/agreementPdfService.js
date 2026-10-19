import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import { agreementsDir, uploadPublicPath } from '../config/uploadPaths.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const possibleLogoPaths = [
  path.resolve(__dirname, '../../frontend/public/Taruna-logo-text.png'),
  path.resolve(__dirname, '../public/Taruna-logo-text.png'),
  path.resolve(__dirname, '../uploads/Taruna-logo-text.png'),
  path.resolve(__dirname, '../../frontend/public/taruna_logo.png'),
  path.resolve(__dirname, '../../frontend/src/assets/logo.jpg'),
];

const possibleWatermarkPaths = [
  path.resolve(__dirname, '../../frontend/public/taruna_logo.png'),
  path.resolve(__dirname, '../public/taruna_logo.png'),
  path.resolve(__dirname, '../uploads/taruna_logo.png'),
  path.resolve(__dirname, '../../frontend/public/Taruna-logo-text.png'),
];

const getLogoPath = () => {
  for (const p of possibleLogoPaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
};

const getWatermarkPath = () => {
  for (const p of possibleWatermarkPaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
};

/**
 * Draw circuit watermark in center of page (Pages 1 to 4)
 */
const drawWatermark = (doc) => {
  const watermark = getWatermarkPath();
  if (watermark) {
    try {
      doc.save();
      const wmWidth = 420;
      const wmX = (doc.page.width - wmWidth) / 2;
      const wmY = (doc.page.height - wmWidth) / 2 + 10;
      doc.opacity(0.10).image(watermark, wmX, wmY, { width: wmWidth });
      doc.restore();
    } catch (err) {
      console.warn('Could not draw watermark:', err.message);
    }
  }
};

/**
 * Draw top-left logo on Pages 1 to 4 with clean dimensions
 */
const drawTopLeftLogo = (doc, width = 165) => {
  const logo = getLogoPath();
  if (logo) {
    try {
      doc.image(logo, 48, 22, { width });
    } catch (err) {
      doc.fillColor('#1E1B4B').font('Helvetica-Bold').fontSize(14).text('TARUNA TECHNOLOGY', 48, 26);
    }
  } else {
    doc.fillColor('#1E1B4B').font('Helvetica-Bold').fontSize(14).text('TARUNA TECHNOLOGY', 48, 26);
  }
};

/**
 * Draw top-left circuit accent line (for Pages 5 & 6)
 */
const drawTopLeftAccent = (doc) => {
  doc.save();
  doc.lineWidth(1.5).strokeColor('#4F46E5');
  doc.moveTo(0, 0).lineTo(40, 80).stroke();
  doc.restore();
};

/**
 * Vector Icon 1: Globe inside Royal Blue / Indigo circular badge (matching Image 2)
 */
const drawGlobeBadge = (doc, cx, cy, r = 20) => {
  doc.save();
  doc.fillColor('#4338CA').circle(cx, cy, r).fill(); // Royal Blue / Indigo
  doc.lineWidth(1.2).strokeColor('#FFFFFF');
  doc.circle(cx, cy, r * 0.65).stroke();
  doc.moveTo(cx - r * 0.65, cy).lineTo(cx + r * 0.65, cy).stroke();
  doc.moveTo(cx, cy - r * 0.65).lineTo(cx, cy + r * 0.65).stroke();
  doc.moveTo(cx - r * 0.52, cy - r * 0.35).bezierCurveTo(cx - r * 0.2, cy - r * 0.22, cx + r * 0.2, cy - r * 0.22, cx + r * 0.52, cy - r * 0.35).stroke();
  doc.moveTo(cx - r * 0.52, cy + r * 0.35).bezierCurveTo(cx - r * 0.2, cy + r * 0.22, cx + r * 0.2, cy + r * 0.22, cx + r * 0.52, cy + r * 0.35).stroke();
  doc.ellipse(cx, cy, r * 0.33, r * 0.65).stroke();
  doc.restore();
};

/**
 * Vector Icon 2: Phone Handset inside Vibrant Rose / Magenta badge (matching Image 2)
 */
const drawPhoneBadge = (doc, cx, cy, r = 20) => {
  doc.save();
  doc.fillColor('#DB2777').circle(cx, cy, r).fill(); // Vibrant Magenta / Rose
  doc.save();
  doc.translate(cx, cy);
  doc.path('M -5,-6 C -5,-6.8 -4.2,-7.4 -3.4,-7.4 L -1.2,-7.4 C -0.4,-7.4 0.3,-6.9 0.5,-6.1 L 1.3,-3.8 C 1.5,-3.1 1.3,-2.4 0.7,-1.9 L -0.4,-1.0 C 0.8,1.3 2.6,3.1 4.9,4.2 L 5.9,3.1 C 6.4,2.6 7.1,2.4 7.8,2.6 L 10.1,3.4 C 10.9,3.6 11.4,4.3 11.4,5.1 L 11.4,7.3 C 11.4,8.1 10.7,8.9 9.8,8.9 C 2.0,8.9 -5.0,1.9 -5.0,-6.0 Z').fill('#FFFFFF');
  doc.restore();
  doc.restore();
};

/**
 * Vector Icon 3: Mail Envelope inside Deep Navy badge (matching Image 2)
 */
const drawMailBadge = (doc, cx, cy, r = 20) => {
  doc.save();
  doc.fillColor('#1E1B4B').circle(cx, cy, r).fill(); // Deep Midnight Navy
  doc.lineWidth(1.4).strokeColor('#FFFFFF').lineJoin('round').lineCap('round');
  const mw = 20, mh = 14;
  doc.rect(cx - mw / 2, cy - mh / 2, mw, mh).stroke();
  doc.moveTo(cx - mw / 2, cy - mh / 2).lineTo(cx, cy + 1.5).lineTo(cx + mw / 2, cy - mh / 2).stroke();
  doc.restore();
};

/**
 * Vector Icon 4: Location Pin inside Electric Cyan / Blue badge (matching Image 2)
 */
const drawPinBadge = (doc, cx, cy, r = 20) => {
  doc.save();
  doc.fillColor('#0284C7').circle(cx, cy, r).fill(); // Electric Cyan / Blue
  doc.save();
  doc.translate(cx, cy);
  doc.lineWidth(1.6).strokeColor('#FFFFFF').lineCap('round').lineJoin('round');
  doc.path('M 0,11 C -1,9.5 -6,3 -6,-3 C -6,-6.3 -3.3,-9 0,-9 C 3.3,-9 6,-6.3 6,-3 C 6,3 1,9.5 0,11 Z').stroke();
  doc.circle(0, -3, 2.2).stroke();
  doc.restore();
  doc.restore();
};

/**
 * Helper to draw section title with colorful number badge
 */
const drawSectionTitle = (doc, numberStr, titleStr, x, y, fontSize = 15) => {
  doc.save();
  doc.font('Helvetica-Bold').fontSize(fontSize).fillColor('#4F46E5').text(`${numberStr}. `, x, y, { continued: true });
  doc.fillColor('#0F172A').text(titleStr, { continued: false });
  doc.restore();
};

/**
 * Helper to draw a bullet point with colored bullet marker
 */
const drawBullet = (doc, textStr, x, y, width, lineGap = 4.5, bulletColor = '#4F46E5', fontSize = 12.5) => {
  doc.save();
  doc.font('Helvetica-Bold').fontSize(fontSize).fillColor(bulletColor).text('•  ', x, y, { continued: true });
  doc.font('Helvetica').fontSize(fontSize).fillColor('#1E293B').text(textStr, { width: width - 16, lineGap });
  doc.restore();
};

/**
 * Generate Internship Agreement PDF with polished typography, colorful elements, and perfect alignment
 */
export const generateAgreementPDF = async (agreementData, { saveToFile = true, fileName = null } = {}) => {
  const {
    id: agreementId = 'AGR-DOC',
    employeeName = 'sudhanshu naik',
    employeeEmail = 'sudhanshunaikbaroda@gmail.com',
    employeePhone = '+91 7984845651',
    jobRole = 'MERN Stack Developer',
    commencementDate = '09 Juy 2026',
    duration = 'three (3) months',
    signatureData = null,
    signaturePath = null,
    signedAt = new Date(),
    signatoryName = 'Tisha Bhadja',
    signatoryRole = 'Operational Manager',
    companyName = 'Taruna Technology',
    companyAddress = '709,710 Broadway Empire, circle, Vasna\nBhayli Main Rd, Vadodara, Gujarat 391410',
    companyEmail = 'tarunatechnology@gmail.com',
    companyPhone = '+91 9106610595',
  } = agreementData || {};

  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    info: {
      Title: `Internship Agreement - ${employeeName}`,
      Author: companyName,
      Subject: 'Internship Agreement',
      Creator: 'Taruna Technology EMS',
    },
  });

  const buffers = [];
  doc.on('data', buffers.push.bind(buffers));

  const contentLeft = 48;
  const contentWidth = doc.page.width - 96; // ~499 pt

  // =========================================================================
  // PAGE 1: Header, Company Info, Intern Details, Purpose, Duration, Footer URL
  // =========================================================================
  drawWatermark(doc);
  drawTopLeftLogo(doc, 170);

  // Document Title (with clear breathing space below logo)
  let y = 115;
  doc.fillColor('#0F172A')
    .font('Helvetica-Bold')
    .fontSize(20)
    .text('INTERNSHIP AGREEMENT', contentLeft, y, { width: contentWidth, align: 'center' });

  // Subtle dual-accent bar under title
  doc.save();
  doc.fillColor('#4F46E5').rect(contentLeft + 150, y + 26, 100, 2).fill();
  doc.fillColor('#DB2777').rect(contentLeft + 250, y + 26, 100, 2).fill();
  doc.restore();

  // Company Details Block
  y = 155;
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(14).text('Taruna Technology', contentLeft, y);
  y += 19;
  doc.font('Helvetica-Bold').fontSize(11.5).fillColor('#DB2777').text('A Software Development & IT Services Company', contentLeft, y);
  y += 17;
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#1E293B').text('Registered Office: 709,710 Broadway Empire, circle, Vasna', contentLeft, y);
  y += 15;
  doc.text('Bhayli Main Rd, Vadodara, Gujarat 391410', contentLeft, y);
  y += 15;
  doc.text(`Email: ${companyEmail}`, contentLeft, y);
  y += 15;
  doc.text(`Contact: ${companyPhone}`, contentLeft, y);
  y += 24;

  // Intern Details Card (with stylish left accent border)
  const cardY = y;
  const cardH = 88;
  doc.save();
  doc.fillColor('#F8FAFC').roundedRect(contentLeft, cardY, contentWidth, cardH, 6).fill();
  doc.strokeColor('#E2E8F0').lineWidth(1).roundedRect(contentLeft, cardY, contentWidth, cardH, 6).stroke();
  // Left colored accent border
  doc.fillColor('#4F46E5').roundedRect(contentLeft, cardY, 4, cardH, 2).fill();
  doc.restore();

  let cy = cardY + 12;
  doc.font('Helvetica-Bold').fontSize(13.5).fillColor('#1E1B4B').text('Intern Details', contentLeft + 16, cy);
  cy += 18;
  doc.font('Helvetica-Bold').fontSize(11.5).fillColor('#64748B').text('Name: ', contentLeft + 16, cy, { continued: true });
  doc.font('Helvetica-Bold').fillColor('#0F172A').text(employeeName);
  cy += 17;
  doc.font('Helvetica-Bold').fontSize(11.5).fillColor('#64748B').text('Email: ', contentLeft + 16, cy, { continued: true });
  doc.font('Helvetica-Bold').fillColor('#0F172A').text(employeeEmail);
  cy += 17;
  doc.font('Helvetica-Bold').fontSize(11.5).fillColor('#64748B').text('Contact Number: ', contentLeft + 16, cy, { continued: true });
  doc.font('Helvetica-Bold').fillColor('#0F172A').text(employeePhone);

  y = cardY + cardH + 24;

  // 1. PURPOSE OF INTERNSHIP
  drawSectionTitle(doc, '1', 'PURPOSE OF INTERNSHIP', contentLeft, y, 14.5);
  y += 20;
  doc.font('Helvetica').fontSize(12).fillColor('#1E293B').text(
    `This Agreement outlines the terms and conditions under which the Intern shall participate in the ${jobRole} Internship Program conducted by the Company. The objective is to provide structured training, hands-on project experience, and exposure to industry standards in full-stack development.`,
    contentLeft,
    y,
    { width: contentWidth, lineGap: 4.5 }
  );
  y = doc.y + 20;

  // 2. DURATION
  drawSectionTitle(doc, '2', 'DURATION', contentLeft, y, 14.5);
  y += 20;
  doc.font('Helvetica').fontSize(12).fillColor('#1E293B').text(
    `The internship shall commence on ${commencementDate} and shall continue for a period of ${duration}, unless terminated earlier in accordance with this Agreement.`,
    contentLeft,
    y,
    { width: contentWidth, lineGap: 4.5 }
  );
  y = doc.y + 10;
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#1E293B').text('The Company reserves the right to:', contentLeft, y);
  y += 16;
  drawBullet(doc, 'Extend the internship based on performance', contentLeft + 16, y, contentWidth, 4, '#4F46E5', 12);
  y = doc.y + 6;
  drawBullet(doc, 'Terminate the internship at its sole discretion', contentLeft + 16, y, contentWidth, 4, '#4F46E5', 12);

  // Page 1 Footer URL
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#4F46E5').text(
    'www.tarunatech.com',
    contentLeft,
    doc.page.height - 38,
    { width: contentWidth, align: 'center' }
  );

  // =========================================================================
  // PAGE 2: Sections 5, 6, 7 (Spacious, airy top space after logo)
  // =========================================================================
  doc.addPage();
  drawWatermark(doc);
  drawTopLeftLogo(doc, 170);

  // Generous breathing space below logo
  y = 125;

  // 5. PERFORMANCE & EVALUATION
  drawSectionTitle(doc, '5', 'PERFORMANCE & EVALUATION', contentLeft, y, 15.5);
  y += 24;
  drawBullet(doc, "The Intern's performance shall be continuously monitored.", contentLeft + 16, y, contentWidth, 5, '#4F46E5', 13);
  y = doc.y + 12;
  drawBullet(doc, 'Regular assessments, tasks, and project submissions are mandatory.', contentLeft + 16, y, contentWidth, 5, '#4F46E5', 13);
  y = doc.y + 12;
  drawBullet(doc, 'Certification will be granted only upon satisfactory performance.', contentLeft + 16, y, contentWidth, 5, '#4F46E5', 13);
  y = doc.y + 40;

  // 6. STIPEND & EMPLOYMENT STATUS
  drawSectionTitle(doc, '6', 'STIPEND & EMPLOYMENT STATUS', contentLeft, y, 15.5);
  y += 24;
  drawBullet(doc, 'This is an unpaid internship.', contentLeft + 16, y, contentWidth, 5, '#4F46E5', 13);
  y = doc.y + 12;
  drawBullet(doc, 'The Intern shall not be considered an employee of the Company.', contentLeft + 16, y, contentWidth, 5, '#4F46E5', 13);
  y = doc.y + 12;
  drawBullet(doc, 'No salary, stipend, or benefits shall be provided.', contentLeft + 16, y, contentWidth, 5, '#4F46E5', 13);
  y = doc.y + 14;
  doc.font('Helvetica').fontSize(13).fillColor('#1E293B').text(
    'However, exceptional performers may be considered for a full-time role, subject to Company requirements.',
    contentLeft,
    y,
    { width: contentWidth, lineGap: 5 }
  );
  y = doc.y + 40;

  // 7. CONFIDENTIALITY
  drawSectionTitle(doc, '7', 'CONFIDENTIALITY', contentLeft, y, 15.5);
  y += 22;
  doc.font('Helvetica').fontSize(13).fillColor('#1E293B').text('The Intern agrees that:', contentLeft, y);
  y += 18;
  drawBullet(doc, 'All data, code, designs, and business information are confidential.', contentLeft + 16, y, contentWidth, 5, '#4F46E5', 13);
  y = doc.y + 12;
  drawBullet(doc, 'No information shall be disclosed to any third party.', contentLeft + 16, y, contentWidth, 5, '#4F46E5', 13);
  y = doc.y + 12;
  drawBullet(doc, 'Confidentiality obligations continue even after completion or termination.', contentLeft + 16, y, contentWidth, 5, '#4F46E5', 13);

  // =========================================================================
  // PAGE 3: Sections 8, 9, 10 (Operational Obligations, perfectly aligned)
  // =========================================================================
  doc.addPage();
  drawWatermark(doc);
  drawTopLeftLogo(doc, 170);

  // Generous breathing space below logo
  y = 125;

  // 8. INTELLECTUAL PROPERTY RIGHTS
  drawSectionTitle(doc, '8', 'INTELLECTUAL PROPERTY RIGHTS', contentLeft, y, 15);
  y += 22;
  drawBullet(doc, 'All work created during the internship shall be the sole property of the Company.', contentLeft + 16, y, contentWidth, 4.5, '#4F46E5', 12.5);
  y = doc.y + 10;
  drawBullet(doc, 'The Intern shall not claim ownership or reuse any code or project without written permission.', contentLeft + 16, y, contentWidth, 4.5, '#4F46E5', 12.5);
  y = doc.y + 28;

  // 9. CODE OF CONDUCT
  drawSectionTitle(doc, '9', 'CODE OF CONDUCT', contentLeft, y, 15);
  y += 20;
  doc.font('Helvetica').fontSize(12.5).fillColor('#1E293B').text('The Intern must:', contentLeft, y);
  y += 16;
  drawBullet(doc, 'Maintain professional behavior', contentLeft + 16, y, contentWidth, 4.5, '#4F46E5', 12.5);
  y = doc.y + 8;
  drawBullet(doc, 'Follow all company rules and policies', contentLeft + 16, y, contentWidth, 4.5, '#4F46E5', 12.5);
  y = doc.y + 8;
  drawBullet(doc, 'Respect team members and management', contentLeft + 16, y, contentWidth, 4.5, '#4F46E5', 12.5);
  y = doc.y + 8;
  drawBullet(doc, 'Avoid plagiarism, cheating, or misuse of resources', contentLeft + 16, y, contentWidth, 4.5, '#4F46E5', 12.5);
  y = doc.y + 14;
  doc.font('Helvetica').fontSize(12.5).fillColor('#1E293B').text(
    'Any misconduct may result in immediate termination without notice.',
    contentLeft,
    y,
    { width: contentWidth, lineGap: 4.5 }
  );
  y = doc.y + 28;

  // 10. TERMINATION POLICY
  drawSectionTitle(doc, '10', 'TERMINATION POLICY', contentLeft, y, 15);
  y += 20;
  doc.font('Helvetica').fontSize(12.5).fillColor('#1E293B').text('The Company reserves the right to terminate the internship:', contentLeft, y);
  y += 16;
  drawBullet(doc, 'Due to poor performance', contentLeft + 16, y, contentWidth, 4.5, '#4F46E5', 12.5);
  y = doc.y + 7;
  drawBullet(doc, 'Misconduct or violation of policies', contentLeft + 16, y, contentWidth, 4.5, '#4F46E5', 12.5);
  y = doc.y + 7;
  drawBullet(doc, 'Breach of confidentiality', contentLeft + 16, y, contentWidth, 4.5, '#4F46E5', 12.5);
  y = doc.y + 14;

  doc.font('Helvetica').fontSize(12.5).fillColor('#1E293B').text('The Intern may terminate this Agreement only under the following conditions:', contentLeft, y, { width: contentWidth, lineGap: 4 });
  y = doc.y + 10;
  drawBullet(doc, 'A mandatory prior notice of 30 (thirty) days must be given', contentLeft + 16, y, contentWidth, 4.5, '#4F46E5', 12.5);
  y = doc.y + 7;
  drawBullet(doc, "The Intern must send an official resignation request via email to the Company's official email ID", contentLeft + 16, y, contentWidth, 4.5, '#4F46E5', 12.5);
  y = doc.y + 7;
  drawBullet(doc, 'The notice period shall be considered valid only after written acknowledgment by the Company', contentLeft + 16, y, contentWidth, 4.5, '#4F46E5', 12.5);
  y = doc.y + 14;

  doc.font('Helvetica').fontSize(12.5).fillColor('#1E293B').text('Failure to comply with the notice period or communication process may result in:', contentLeft, y, { width: contentWidth, lineGap: 4 });
  y = doc.y + 10;
  drawBullet(doc, 'No issuance of certificate', contentLeft + 16, y, contentWidth, 4.5, '#DB2777', 12.5);
  y = doc.y + 7;
  drawBullet(doc, 'Blacklisting from future opportunities with the Company', contentLeft + 16, y, contentWidth, 4.5, '#DB2777', 12.5);

  // =========================================================================
  // PAGE 4: Sections 11, 12, 13, 14 (Legal & Completion Terms, well aligned)
  // =========================================================================
  doc.addPage();
  drawWatermark(doc);
  drawTopLeftLogo(doc, 170);

  // Generous breathing space below logo
  y = 125;

  // 11. NON-COMPETE & NON-SOLICITATION
  drawSectionTitle(doc, '11', 'NON-COMPETE & NON-SOLICITATION', contentLeft, y, 15.5);
  y += 24;
  doc.font('Helvetica').fontSize(13).fillColor('#1E293B').text(
    'During the internship and for a period of 6 months after completion, the Intern shall not:',
    contentLeft,
    y,
    { width: contentWidth, lineGap: 5 }
  );
  y = doc.y + 14;
  drawBullet(doc, 'Work with direct competitors', contentLeft + 16, y, contentWidth, 5, '#4F46E5', 13);
  y = doc.y + 10;
  drawBullet(doc, 'Solicit Company clients or employees', contentLeft + 16, y, contentWidth, 5, '#4F46E5', 13);
  y = doc.y + 45;

  // 12. CERTIFICATION
  drawSectionTitle(doc, '12', 'CERTIFICATION', contentLeft, y, 15.5);
  y += 24;
  doc.font('Helvetica').fontSize(13).fillColor('#1E293B').text('The Intern shall receive an Internship Certificate upon:', contentLeft, y);
  y += 18;
  drawBullet(doc, 'Successful completion of duration', contentLeft + 16, y, contentWidth, 5, '#4F46E5', 13);
  y = doc.y + 10;
  drawBullet(doc, 'Submission of assigned projects', contentLeft + 16, y, contentWidth, 5, '#4F46E5', 13);
  y = doc.y + 10;
  drawBullet(doc, 'Meeting performance standards', contentLeft + 16, y, contentWidth, 5, '#4F46E5', 13);
  y = doc.y + 45;

  // 13. LEGAL JURISDICTION
  drawSectionTitle(doc, '13', 'LEGAL JURISDICTION', contentLeft, y, 15.5);
  y += 24;
  doc.font('Helvetica').fontSize(13).fillColor('#1E293B').text(
    'This Agreement shall be governed by the laws of India. Any disputes shall be subject to the jurisdiction of courts located in Vadodara, Gujarat.',
    contentLeft,
    y,
    { width: contentWidth, lineGap: 5 }
  );
  y = doc.y + 45;

  // 14. DECLARATION
  drawSectionTitle(doc, '14', 'DECLARATION', contentLeft, y, 15.5);
  y += 24;
  doc.font('Helvetica').fontSize(13).fillColor('#1E293B').text(
    'Both parties confirm that they have read, understood, and agreed to all terms and conditions stated in this Agreement.',
    contentLeft,
    y,
    { width: contentWidth, lineGap: 5 }
  );

  // =========================================================================
  // PAGE 5: Formal Signatures & Execution (Guaranteed ZERO overlap with name!)
  // =========================================================================
  doc.addPage();
  drawTopLeftAccent(doc);

  y = 95;

  // For Taruna Technology Header
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(18).text('For Taruna Technology', contentLeft, y);
  y += 36;

  // Authorized Signatory Line
  doc.font('Helvetica-Bold').fontSize(14.5).fillColor('#0F172A').text('Authorized Signatory: ', contentLeft, y);
  doc.strokeColor('#000000').lineWidth(1.2).moveTo(contentLeft + 165, y + 14).lineTo(contentLeft + contentWidth, y + 14).stroke();
  y += 36;

  doc.font('Helvetica-Bold').fontSize(14.5).fillColor('#64748B').text('Name: ', contentLeft, y, { continued: true });
  doc.font('Helvetica-Bold').fillColor('#0F172A').text(signatoryName);
  y += 32;

  doc.font('Helvetica-Bold').fontSize(14.5).fillColor('#64748B').text('Designation: ', contentLeft, y, { continued: true });
  doc.font('Helvetica-Bold').fillColor('#0F172A').text(signatoryRole);
  y += 32;

  // Signature Line
  doc.font('Helvetica-Bold').fontSize(14.5).fillColor('#0F172A').text('Signature: ', contentLeft, y);
  doc.strokeColor('#000000').lineWidth(1.2).moveTo(contentLeft + 85, y + 14).lineTo(contentLeft + 360, y + 14).stroke();
  y += 32;

  // Date Line
  doc.font('Helvetica-Bold').fontSize(14.5).fillColor('#0F172A').text('Date: ', contentLeft, y);
  doc.strokeColor('#000000').lineWidth(1.2).moveTo(contentLeft + 55, y + 14).lineTo(contentLeft + 310, y + 14).stroke();
  y += 120;

  // For the Intern Header
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(18).text('For the Intern', contentLeft, y);
  y += 36;

  // Name line
  doc.font('Helvetica-Bold').fontSize(14.5).fillColor('#64748B').text('Name: ', contentLeft, y, { continued: true });
  doc.font('Helvetica-Bold').fillColor('#0F172A').text(employeeName);

  // CRITICAL FIX: Give a generous 65 pt vertical gap between Name and Signature
  // so the drawn signature NEVER overlaps the name!
  y += 65;

  // Signature Line
  doc.font('Helvetica-Bold').fontSize(14.5).fillColor('#0F172A').text('Signature: ', contentLeft, y);
  const sigStartX = contentLeft + 85;
  const sigEndX = contentLeft + 360;
  const sigLineY = y + 14;
  doc.strokeColor('#000000').lineWidth(1.2).moveTo(sigStartX, sigLineY).lineTo(sigEndX, sigLineY).stroke();

  // Embed the intern's drawn signature sitting cleanly directly above the signature line
  // Height is 34 pt, so top is sigLineY - 36, which is ~43 pt below the Name line!
  if (signaturePath && fs.existsSync(signaturePath)) {
    try {
      doc.image(signaturePath, sigStartX + 20, sigLineY - 36, { width: 130, height: 34, fit: [130, 34] });
    } catch (e) {
      console.warn('Could not embed signature image from file:', e.message);
    }
  } else if (signatureData && signatureData.startsWith('data:image')) {
    try {
      const base64Data = signatureData.replace(/^data:image\/\w+;base64,/, '');
      const sigBuffer = Buffer.from(base64Data, 'base64');
      doc.image(sigBuffer, sigStartX + 20, sigLineY - 36, { width: 130, height: 34, fit: [130, 34] });
    } catch (e) {
      console.warn('Could not embed signature image from data URL:', e.message);
    }
  }

  // Generous gap before Date
  y += 55;

  // Date Line with execution date
  doc.font('Helvetica-Bold').fontSize(14.5).fillColor('#0F172A').text('Date: ', contentLeft, y);
  const dateStartX = contentLeft + 55;
  const dateEndX = contentLeft + 310;
  const dateLineY = y + 14;
  doc.strokeColor('#000000').lineWidth(1.2).moveTo(dateStartX, dateLineY).lineTo(dateEndX, dateLineY).stroke();

  const d = signedAt ? new Date(signedAt) : new Date();
  const formattedSignedDate = `${d.getDate()} - ${d.getMonth() + 1} - ${d.getFullYear()}`;
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#0F172A').text(formattedSignedDate, dateStartX + 30, y - 1);

  // =========================================================================
  // PAGE 6: Inquiries / Contact Us (EXACTLY MATCHING IMAGE 2 with Colorful Badges)
  // =========================================================================
  doc.addPage();
  drawTopLeftAccent(doc);

  // Center-top Logo
  const pageLogo = getLogoPath();
  if (pageLogo) {
    try {
      const pWidth = 280;
      doc.image(pageLogo, (doc.page.width - pWidth) / 2, 45, { width: pWidth });
    } catch (err) {
      console.warn('Could not render logo on contact page:', err.message);
    }
  }

  // Heading: FOR INQUIRIES, CONTACT US (matching Image 2)
  // "FOR INQUIRIES," in Vibrant Magenta/Pink (#DB2777)
  // "CONTACT US" in Deep Indigo/Navy (#1E1B4B)
  y = 175;
  doc.fillColor('#DB2777')
    .font('Helvetica-Bold')
    .fontSize(28)
    .text('FOR INQUIRIES,', contentLeft, y, { width: contentWidth, align: 'left' });
  y += 36;
  doc.fillColor('#1E1B4B')
    .text('CONTACT US', contentLeft, y, { width: contentWidth, align: 'left' });
  y += 65;

  // 4 Contact Items with Colorful Badges (matching Image 2)
  const badgeX = contentLeft + 22;
  const textX = contentLeft + 58;

  // 1. Website (Royal Indigo Badge #4338CA)
  let cy1 = y + 12;
  drawGlobeBadge(doc, badgeX, cy1, 20);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(16.5).text('www.tarunatech.com', textX, cy1 - 8);

  // 2. Phone (Vibrant Magenta Badge #DB2777)
  let cy2 = cy1 + 78;
  drawPhoneBadge(doc, badgeX, cy2, 20);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(16.5).text('+91 910 6610 595', textX, cy2 - 8);

  // 3. Email (Deep Midnight Navy Badge #1E1B4B)
  let cy3 = cy2 + 78;
  drawMailBadge(doc, badgeX, cy3, 20);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(16.5).text('tarunatechnology@gmail.com', textX, cy3 - 8);

  // 4. Address (Electric Cyan Badge #0284C7)
  let cy4 = cy3 + 82;
  drawPinBadge(doc, badgeX, cy4, 20);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(15).text('709,710 Broadway Empire, circle,', textX, cy4 - 18, { lineGap: 4.5 });
  doc.text('Vasna Bhayli Main Rd, Vadodara,', textX, cy4 + 1, { lineGap: 4.5 });
  doc.text('Gujarat 391410', textX, cy4 + 20);

  // Decorative dots pattern (bottom-left, 9 cols x 4 rows)
  doc.save();
  doc.fillColor('#94A3B8');
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 9; c++) {
      doc.circle(contentLeft + c * 15, doc.page.height - 110 + r * 15, 1.8).fill();
    }
  }
  doc.restore();

  // Decorative dark arc / corner on bottom-right matching screenshot
  doc.save();
  doc.fillColor('#1E293B');
  doc.path(`M ${doc.page.width} ${doc.page.height - 130} A 130 130 0 0 0 ${doc.page.width - 130} ${doc.page.height} L ${doc.page.width} ${doc.page.height} Z`).fill();
  doc.restore();

  // Finalize PDF stream
  doc.end();

  const buffer = await new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
  });

  let filePath = null;
  let publicPath = null;

  if (saveToFile) {
    if (!fs.existsSync(agreementsDir)) {
      fs.mkdirSync(agreementsDir, { recursive: true });
    }
    const safeName = fileName || `agreement_${agreementId}_${Date.now()}.pdf`;
    filePath = path.join(agreementsDir, safeName);
    fs.writeFileSync(filePath, buffer);
    publicPath = uploadPublicPath('agreements', safeName);
  }

  return { buffer, filePath, publicPath };
};

export default {
  generateAgreementPDF,
};
