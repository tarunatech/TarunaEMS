import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import { offerLettersDir, uploadPublicPath } from '../config/uploadPaths.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const possibleLogoPaths = [
  path.resolve(__dirname, '../../frontend/public/Taruna-logo-text.png'),
  path.resolve(__dirname, '../public/Taruna-logo-text.png'),
  path.resolve(__dirname, '../../frontend/public/taruna_logo.png'),
  path.resolve(__dirname, '../../frontend/src/assets/logo.jpg'),
];

const possibleWatermarkPaths = [
  path.resolve(__dirname, '../../frontend/public/taruna_logo.png'),
  path.resolve(__dirname, '../public/taruna_logo.png'),
  path.resolve(__dirname, '../../frontend/public/Taruna-logo-text.png'),
];

const possibleSignPaths = [
  path.resolve(__dirname, '../../frontend/public/sign_img.png'),
  path.resolve(__dirname, '../public/sign_img.png'),
  path.resolve(__dirname, '../../frontend/public/offer_letter_sign.jpeg'),
  path.resolve(__dirname, '../../frontend/public/offer_letter_sign.jpg'),
  path.resolve(__dirname, '../../frontend/public/offer_letter_sign.png'),
  path.resolve(__dirname, '../public/offer_letter_sign.jpeg'),
  path.resolve(__dirname, '../public/offer_letter_sign.jpg'),
  path.resolve(__dirname, '../public/offer_letter_sign.png'),
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

const getSignPath = () => {
  for (const p of possibleSignPaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
};

/**
 * Draw background geometric decorations matching the Sudhanshu offer letter reference image exactly.
 *
 * Top-right: wide diagonal pink→purple gradient shape
 * Top-left: small pink triangle corner
 * Bottom-left: two overlapping magenta / pink polygon ribbons
 * Center: large circuit-T logo watermark
 */
const drawBackgroundDecorations = (doc) => {
  const width  = doc.page.width;   // 595
  const height = doc.page.height;  // 842

  doc.save();

  // ── TOP RIGHT ────────────────────────────────────────────────────────────────
  // Large diagonal shape going from roughly x=310,y=0 → full right edge → down ~200px
  // Outer lighter magenta/pink layer
  doc.fillColor('#E91E8C')          // vivid magenta-pink
    .polygon(
      [width - 260, 0],            // left point on top edge
      [width, 0],                  // top-right corner
      [width, 195],                // right edge down
      [width - 80, 195],           // small horizontal ledge
      [width - 260, 0]
    )
    .fill();

  // Inner darker violet overlay (gives the two-tone gradient look)
  doc.fillColor('#5B21B6')          // medium violet
    .polygon(
      [width - 165, 0],
      [width, 0],
      [width, 195],
      [width - 80, 195],
      [width - 165, 0]
    )
    .fill();

  // Darkest innermost triangle (deep purple/indigo)
  doc.fillColor('#2E1065')
    .polygon(
      [width - 100, 0],
      [width, 0],
      [width, 100]
    )
    .fill();

  // Small horizontal ledge accent at base of top-right block
  doc.fillColor('#7C3AED')
    .polygon(
      [width - 80, 195],
      [width, 195],
      [width, 215],
      [width - 30, 215]
    )
    .fill();

  // ── TOP LEFT ─────────────────────────────────────────────────────────────────
  // Small bright pink/magenta triangle corner
  doc.fillColor('#E91E8C')
    .polygon([0, 0], [38, 0], [0, 38])
    .fill();

  // Slightly larger violet accent below it
  doc.fillColor('#7C3AED')
    .polygon([0, 38], [18, 18], [0, 65])
    .fill();

  // ── BOTTOM LEFT ──────────────────────────────────────────────────────────────
  // Rear larger magenta block
  doc.fillColor('#E91E8C')
    .polygon(
      [0, height - 210],           // top of block
      [22, height - 190],          // slight inward
      [0, height - 105]            // back to left edge
    )
    .fill();

  // Front bigger two-tone polygon
  doc.fillColor('#E91E8C')
    .polygon(
      [0, height - 110],
      [110, height],
      [0, height]
    )
    .fill();

  doc.fillColor('#C2185B')          // darker magenta for depth
    .polygon(
      [0, height - 60],
      [60, height],
      [0, height]
    )
    .fill();

  // ── CENTER WATERMARK LOGO ─────────────────────────────────────────────────────
  const watermark = getWatermarkPath();
  if (watermark) {
    try {
      // Large logo centred on the page, matching the reference image
      const wmWidth = 460;
      const wmX = (width - wmWidth) / 2;
      // Offset slightly upward so it sits nicely behind the text body
      const wmY = (height - wmWidth) / 2 - 10;
      doc.opacity(0.16)
        .image(watermark, wmX, wmY, { width: wmWidth });
    } catch (err) {
      console.warn('Could not draw watermark image:', err.message);
    }
  }

  doc.restore();
};

/**
 * Generate Offer Letter PDF buffer or save to file
 */
export const generateOfferLetterPDF = async (data, { saveToFile = true, fileName = null } = {}) => {
  const {
    employeeName   = 'Employee Name',
    role           = 'Junior MERN Stack Developer',
    joiningDate    = '09 July 2026',
    companyName    = 'Taruna Technology',
    location       = 'Vadodara',
    duration       = 'three (3) months',
    workingHours   = '10:00 AM to 7:00 PM, Monday to Saturday',
    signatoryName  = 'MIHIR MAKWANA',
    signatoryRole  = 'Operational Manager',
  } = data;

  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    info: {
      Title:   `Offer Letter - ${employeeName}`,
      Author:  companyName,
      Subject: 'Employment Offer Letter',
      Creator: 'Taruna EMS',
    },
  });

  const buffers = [];
  doc.on('data', buffers.push.bind(buffers));

  // 1. Draw geometric decorations + watermark
  drawBackgroundDecorations(doc);

  // 2. Company Logo (top-left header)
  const logo = getLogoPath();
  if (logo) {
    try {
      doc.image(logo, 50, 28, { width: 215 });
    } catch (err) {
      console.warn('Could not render logo image in offer letter:', err.message);
    }
  }

  // 3. Document Title
  doc.fillColor('#0F172A')
    .font('Helvetica-Bold')
    .fontSize(19)
    .text('Offer Letter', 50, 168, {
      width: doc.page.width - 100,
      align: 'center',
    });

  // 4. Salutation
  const textX       = 52;
  const contentWidth = 491;

  doc.fillColor('#0F172A')
    .font('Helvetica-Bold')
    .fontSize(11.5)
    .text(`Dear ${employeeName},`, textX, 235);

  // 5. Body Paragraphs
  const bodyStyle = { width: contentWidth, align: 'left', lineGap: 4.5 };

  doc.font('Helvetica').fontSize(11.2).fillColor('#0F172A')
    .text(
      `We are pleased to offer you an Internship with ${companyName}, ${location}. Your internship will commence on ${joiningDate} and will continue for a period of ${duration}. During this period, you will receive practical training and hands-on experience by working on real-world projects and assigned responsibilities.`,
      textX, 268, bodyStyle
    );

  doc.font('Helvetica').fontSize(11.2).fillColor('#0F172A')
    .text(
      `Your working hours will be ${workingHours}. You are expected to maintain professionalism, punctuality, and comply with all company policies and procedures throughout the internship period.`,
      textX, 356, bodyStyle
    );

  doc.font('Helvetica').fontSize(11.2).fillColor('#0F172A')
    .text(
      `You shall maintain strict confidentiality regarding all company information, client data, project details, and business operations. Any breach of confidentiality or company policies may result in the immediate termination of the internship.`,
      textX, 432, bodyStyle
    );

  doc.font('Helvetica').fontSize(11.2).fillColor('#0F172A')
    .text(
      `Upon successful completion of the internship, you will be awarded an Internship Completion Certificate. Based on your performance, technical skills, dedication, and overall contribution during the internship, you may also be considered for a full-time position as a ${role} at ${companyName}.`,
      textX, 508, bodyStyle
    );

  doc.font('Helvetica').fontSize(11.2).fillColor('#0F172A')
    .text(
      `We are excited to welcome you to our team and look forward to supporting your professional growth. We wish you a successful and rewarding internship experience with us.`,
      textX, 600, bodyStyle
    );

  // 6. Signatory Block (right-aligned)
  const signX     = 365;
  const signWidth = 180;
  let   currentY  = 660;

  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A')
    .text('Best Regards,', signX, currentY, { width: signWidth, align: 'left' });

  currentY += 16;
  doc.font('Helvetica-Bold').fontSize(11.5).fillColor('#0F172A')
    .text(signatoryName.toUpperCase(), signX, currentY, { width: signWidth, align: 'left' });

  // Horizontal signature image placed between MIHIR MAKWANA and Operational Manager
  const signPath = getSignPath();
  if (signPath) {
    try {
      doc.image(signPath, signX + 25, currentY - 6, { width: 100 });
      currentY += 46; // Add space so Operational Manager sits comfortably below the signature
    } catch (err) {
      console.warn('Could not render signature image:', err.message);
      currentY += 24;
    }
  } else {
    currentY += 24;
  }

  doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#0F172A')
    .text(signatoryRole, signX, currentY, { width: signWidth, align: 'left' });

  currentY += 15;
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A')
    .text(companyName, signX, currentY, { width: signWidth, align: 'left' });

  // 7. Footer
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A')
    .text('www.tarunatech.com', 50, 802, {
      width: doc.page.width - 100,
      align: 'center',
    });

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);

      if (saveToFile) {
        fs.mkdirSync(offerLettersDir, { recursive: true });
        const finalFileName = fileName || `offer_letter_${Date.now()}_${employeeName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
        const filePath = path.join(offerLettersDir, finalFileName);
        fs.writeFileSync(filePath, pdfBuffer);
        const publicUrl = uploadPublicPath('offer-letters', finalFileName);
        resolve({ pdfBuffer, filePath, publicUrl, fileName: finalFileName });
      } else {
        resolve({ pdfBuffer });
      }
    });

    doc.on('error', reject);
  });
};

/**
 * Generate Completion Letter PDF buffer or save to file
 */
export const generateCompletionLetterPDF = async (data, { saveToFile = true, fileName = null } = {}) => {
  const {
    employeeName   = 'Employee Name',
    role           = 'Junior MERN Stack Developer',
    joiningDate    = '09 July 2026',
    completionDate = '09 October 2026',
    employmentType = 'Internship',
    letterDate     = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
    companyName    = 'Taruna Technology',
    location       = 'Vadodara',
    signatoryName  = 'MIHIR MAKWANA',
    signatoryRole  = 'Operational Manager',
  } = data;

  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    info: {
      Title:   `Completion Letter - ${employeeName}`,
      Author:  companyName,
      Subject: `Completion Letter – ${role}`,
      Creator: 'Taruna EMS',
    },
  });

  const buffers = [];
  doc.on('data', buffers.push.bind(buffers));

  // 1. Draw geometric decorations + watermark
  drawBackgroundDecorations(doc);

  // 2. Company Logo (top-left header)
  const logo = getLogoPath();
  if (logo) {
    try {
      doc.image(logo, 50, 28, { width: 215 });
    } catch (err) {
      console.warn('Could not render logo image in completion letter:', err.message);
    }
  }

  // 3. Document Title
  doc.fillColor('#0F172A')
    .font('Helvetica-Bold')
    .fontSize(19)
    .text('COMPLETION LETTER', 50, 155, {
      width: doc.page.width - 100,
      align: 'center',
    });

  const textX = 52;
  const contentWidth = 491;

  // 4. Date
  doc.fillColor('#0F172A')
    .font('Helvetica')
    .fontSize(11)
    .text(`Date: ${letterDate}`, textX, 195);

  // 5. To Block
  doc.fillColor('#0F172A')
    .font('Helvetica-Bold')
    .fontSize(11)
    .text('To,', textX, 222);

  doc.font('Helvetica-Bold')
    .fontSize(11.5)
    .text(employeeName, textX, 237);

  // 6. Subject
  doc.font('Helvetica-Bold')
    .fontSize(11.5)
    .text(`Subject: Completion Letter – ${role}`, textX, 265);

  // 7. Salutation
  doc.font('Helvetica-Bold')
    .fontSize(11.5)
    .text(`Dear ${employeeName},`, textX, 295);

  // 8. Body Paragraphs
  const bodyStyle = { width: contentWidth, align: 'left', lineGap: 4.5 };

  // Paragraph 1
  doc.font('Helvetica').fontSize(11.2).fillColor('#0F172A')
    .text(
      `This is to certify that ${employeeName} has successfully completed their ${employmentType} as a ${role} at ${companyName}, ${location}, from ${joiningDate} to ${completionDate}.`,
      textX, 325, bodyStyle
    );

  // Paragraph 2
  doc.font('Helvetica').fontSize(11.2).fillColor('#0F172A')
    .text(
      `During this period, they were involved in assigned responsibilities and organizational activities related to their role. We appreciate their dedication, efforts, and contribution to the organization throughout their tenure.`,
      textX, 395, bodyStyle
    );

  // Paragraph 3
  doc.font('Helvetica').fontSize(11.2).fillColor('#0F172A')
    .text(
      `We thank them for their association with ${companyName} and wish them continued success in their future professional endeavors.`,
      textX, 465, bodyStyle
    );

  // Paragraph 4
  doc.font('Helvetica').fontSize(11.2).fillColor('#0F172A')
    .text(
      `This letter is issued upon completion of their tenure with the organization for official and professional reference purposes.`,
      textX, 520, bodyStyle
    );

  // 9. Signatory Block (right-aligned)
  const signX = 365;
  const signWidth = 180;
  let currentY = 585;

  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A')
    .text('Best Regards,', signX, currentY, { width: signWidth, align: 'left' });

  currentY += 16;
  doc.font('Helvetica-Bold').fontSize(11.5).fillColor('#0F172A')
    .text(signatoryName.toUpperCase(), signX, currentY, { width: signWidth, align: 'left' });

  const signPath = getSignPath();
  if (signPath) {
    try {
      doc.image(signPath, signX + 25, currentY - 6, { width: 100 });
      currentY += 46;
    } catch (err) {
      console.warn('Could not render signature image:', err.message);
      currentY += 24;
    }
  } else {
    currentY += 24;
  }

  doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#0F172A')
    .text(signatoryRole, signX, currentY, { width: signWidth, align: 'left' });

  currentY += 15;
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A')
    .text(companyName, signX, currentY, { width: signWidth, align: 'left' });

  // 10. Footer
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A')
    .text('www.tarunatech.com', 50, 802, {
      width: doc.page.width - 100,
      align: 'center',
    });

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);

      if (saveToFile) {
        fs.mkdirSync(offerLettersDir, { recursive: true });
        const finalFileName = fileName || `completion_letter_${Date.now()}_${employeeName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
        const filePath = path.join(offerLettersDir, finalFileName);
        fs.writeFileSync(filePath, pdfBuffer);
        const publicUrl = uploadPublicPath('offer-letters', finalFileName);
        resolve({ pdfBuffer, filePath, publicUrl, fileName: finalFileName });
      } else {
        resolve({ pdfBuffer });
      }
    });

    doc.on('error', reject);
  });
};

/**
 * Generate Experience Letter PDF buffer or save to file
 */
export const generateExperienceLetterPDF = async (data, { saveToFile = true, fileName = null } = {}) => {
  const {
    employeeName    = 'Employee Name',
    role            = 'Software Engineer',
    department      = 'Engineering',
    joiningDate     = '01 January 2025',
    lastWorkingDate = '31 December 2025',
    letterDate      = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
    companyName     = 'Taruna Technology',
    location        = 'Vadodara',
    signatoryName   = 'MIHIR MAKWANA',
    signatoryRole   = 'Operational Manager',
  } = data;

  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    info: {
      Title:   `Experience Letter - ${employeeName}`,
      Author:  companyName,
      Subject: `Experience Letter – ${role}`,
      Creator: 'Taruna EMS',
    },
  });

  const buffers = [];
  doc.on('data', buffers.push.bind(buffers));

  // 1. Draw geometric decorations + watermark
  drawBackgroundDecorations(doc);

  // 2. Company Logo (top-left header)
  const logo = getLogoPath();
  if (logo) {
    try {
      doc.image(logo, 50, 28, { width: 215 });
    } catch (err) {
      console.warn('Could not render logo image in experience letter:', err.message);
    }
  }

  // 3. Document Title
  doc.fillColor('#0F172A')
    .font('Helvetica-Bold')
    .fontSize(19)
    .text('EXPERIENCE LETTER', 50, 155, {
      width: doc.page.width - 100,
      align: 'center',
    });

  const textX = 52;
  const contentWidth = 491;

  // 4. Date
  doc.fillColor('#0F172A')
    .font('Helvetica')
    .fontSize(11)
    .text(`Date: ${letterDate}`, textX, 195);

  // 5. TO WHOM IT MAY CONCERN
  doc.fillColor('#0F172A')
    .font('Helvetica-Bold')
    .fontSize(12)
    .text('TO WHOM IT MAY CONCERN', textX, 230);

  // 6. Body Paragraphs
  const bodyStyle = { width: contentWidth, align: 'left', lineGap: 4.5 };

  // Paragraph 1
  doc.font('Helvetica').fontSize(11.2).fillColor('#0F172A')
    .text(
      `This is to certify that ${employeeName} was employed with ${companyName}, ${location}, as a ${role} in the ${department} department from ${joiningDate} to ${lastWorkingDate}.`,
      textX, 265, bodyStyle
    );

  // Paragraph 2
  doc.font('Helvetica').fontSize(11.2).fillColor('#0F172A')
    .text(
      `During their tenure with the organization, they were responsible for duties and responsibilities associated with their position. Their role involved contributing to assigned projects, collaborating with team members, and supporting the organization's operational objectives.`,
      textX, 335, bodyStyle
    );

  // Paragraph 3
  doc.font('Helvetica').fontSize(11.2).fillColor('#0F172A')
    .text(
      `We appreciate their contributions during their association with ${companyName} and wish them success in their future professional endeavors.`,
      textX, 420, bodyStyle
    );

  // Paragraph 4
  doc.font('Helvetica').fontSize(11.2).fillColor('#0F172A')
    .text(
      `This letter is issued upon request for official and professional reference purposes.`,
      textX, 480, bodyStyle
    );

  // 7. Signatory Block (right-aligned)
  const signX = 350;
  const signWidth = 195;
  let currentY = 550;

  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A')
    .text('Best Regards,', signX, currentY, { width: signWidth, align: 'left' });

  currentY += 16;
  doc.font('Helvetica-Bold').fontSize(11.5).fillColor('#0F172A')
    .text(signatoryName.toUpperCase(), signX, currentY, { width: signWidth, align: 'left' });

  const signPath = getSignPath();
  if (signPath) {
    try {
      doc.image(signPath, signX + 25, currentY - 6, { width: 100 });
      currentY += 46;
    } catch (err) {
      console.warn('Could not render signature image:', err.message);
      currentY += 24;
    }
  } else {
    currentY += 24;
  }

  doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#0F172A')
    .text(signatoryRole, signX, currentY, { width: signWidth, align: 'left' });

  currentY += 15;
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A')
    .text(companyName, signX, currentY, { width: signWidth, align: 'left' });

  currentY += 14;
  doc.font('Helvetica').fontSize(10.5).fillColor('#0F172A')
    .text('Vadodara, Gujarat, India', signX, currentY, { width: signWidth, align: 'left' });

  // 8. Footer
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A')
    .text('www.tarunatech.com', 50, 802, {
      width: doc.page.width - 100,
      align: 'center',
    });

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);

      if (saveToFile) {
        fs.mkdirSync(offerLettersDir, { recursive: true });
        const finalFileName = fileName || `experience_letter_${Date.now()}_${employeeName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
        const filePath = path.join(offerLettersDir, finalFileName);
        fs.writeFileSync(filePath, pdfBuffer);
        const publicUrl = uploadPublicPath('offer-letters', finalFileName);
        resolve({ pdfBuffer, filePath, publicUrl, fileName: finalFileName });
      } else {
        resolve({ pdfBuffer });
      }
    });

    doc.on('error', reject);
  });
};

/**
 * Generate Relieving Letter PDF buffer or save to file
 */
export const generateRelievingLetterPDF = async (data, { saveToFile = true, fileName = null } = {}) => {
  const {
    employeeName    = 'Employee Name',
    role            = 'Software Engineer',
    relievingDate   = '31 December 2025',
    lastWorkingDate = '31 December 2025',
    letterDate      = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
    companyName     = 'Taruna Technology',
    location        = 'Vadodara',
    signatoryName   = 'MIHIR MAKWANA',
    signatoryRole   = 'Operational Manager',
  } = data;

  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    info: {
      Title:   `Relieving Letter - ${employeeName}`,
      Author:  companyName,
      Subject: `Relieving Letter – ${role}`,
      Creator: 'Taruna EMS',
    },
  });

  const buffers = [];
  doc.on('data', buffers.push.bind(buffers));

  // 1. Draw geometric decorations + watermark
  drawBackgroundDecorations(doc);

  // 2. Company Logo (top-left header)
  const logo = getLogoPath();
  if (logo) {
    try {
      doc.image(logo, 50, 28, { width: 215 });
    } catch (err) {
      console.warn('Could not render logo image in relieving letter:', err.message);
    }
  }

  // 3. Document Title
  doc.fillColor('#0F172A')
    .font('Helvetica-Bold')
    .fontSize(19)
    .text('RELIEVING LETTER', 50, 155, {
      width: doc.page.width - 100,
      align: 'center',
    });

  const textX = 52;
  const contentWidth = 491;

  // 4. Date
  doc.fillColor('#0F172A')
    .font('Helvetica')
    .fontSize(11)
    .text(`Date: ${letterDate}`, textX, 195);

  // 5. To Block
  doc.fillColor('#0F172A')
    .font('Helvetica-Bold')
    .fontSize(11)
    .text('To,', textX, 222);

  doc.font('Helvetica-Bold')
    .fontSize(11.5)
    .text(employeeName, textX, 237);

  // 6. Subject
  doc.font('Helvetica-Bold')
    .fontSize(11.5)
    .text('Subject: Relieving Letter', textX, 265);

  // 7. Salutation
  doc.font('Helvetica-Bold')
    .fontSize(11.5)
    .text(`Dear ${employeeName},`, textX, 295);

  // 8. Body Paragraphs
  const bodyStyle = { width: contentWidth, align: 'left', lineGap: 4.5 };

  // Paragraph 1
  doc.font('Helvetica').fontSize(11.2).fillColor('#0F172A')
    .text(
      `This is to confirm that your resignation from the position of ${role} at ${companyName}, ${location}, has been accepted, and you are hereby formally relieved from your duties with effect from ${relievingDate}.`,
      textX, 325, bodyStyle
    );

  // Paragraph 2
  doc.font('Helvetica').fontSize(11.2).fillColor('#0F172A')
    .text(
      `Your last working day with the organization was ${lastWorkingDate}. We acknowledge your association with the company and appreciate your contributions during your tenure.`,
      textX, 395, bodyStyle
    );

  // Paragraph 3
  doc.font('Helvetica').fontSize(11.2).fillColor('#0F172A')
    .text(
      `We wish you success in your future professional and personal endeavors.`,
      textX, 465, bodyStyle
    );

  // Paragraph 4
  doc.font('Helvetica').fontSize(11.2).fillColor('#0F172A')
    .text(
      `Thank you for your association with ${companyName}.`,
      textX, 515, bodyStyle
    );

  // 9. Signatory Block (right-aligned)
  const signX = 350;
  const signWidth = 195;
  let currentY = 560;

  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A')
    .text('Best Regards,', signX, currentY, { width: signWidth, align: 'left' });

  currentY += 16;
  doc.font('Helvetica-Bold').fontSize(11.5).fillColor('#0F172A')
    .text(signatoryName.toUpperCase(), signX, currentY, { width: signWidth, align: 'left' });

  const signPath = getSignPath();
  if (signPath) {
    try {
      doc.image(signPath, signX + 25, currentY - 6, { width: 100 });
      currentY += 46;
    } catch (err) {
      console.warn('Could not render signature image:', err.message);
      currentY += 24;
    }
  } else {
    currentY += 24;
  }

  doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#0F172A')
    .text(signatoryRole, signX, currentY, { width: signWidth, align: 'left' });

  currentY += 15;
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A')
    .text(companyName, signX, currentY, { width: signWidth, align: 'left' });

  currentY += 14;
  doc.font('Helvetica').fontSize(10.5).fillColor('#0F172A')
    .text('Vadodara, Gujarat, India', signX, currentY, { width: signWidth, align: 'left' });

  // 10. Footer
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A')
    .text('www.tarunatech.com', 50, 802, {
      width: doc.page.width - 100,
      align: 'center',
    });

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);

      if (saveToFile) {
        fs.mkdirSync(offerLettersDir, { recursive: true });
        const finalFileName = fileName || `relieving_letter_${Date.now()}_${employeeName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
        const filePath = path.join(offerLettersDir, finalFileName);
        fs.writeFileSync(filePath, pdfBuffer);
        const publicUrl = uploadPublicPath('offer-letters', finalFileName);
        resolve({ pdfBuffer, filePath, publicUrl, fileName: finalFileName });
      } else {
        resolve({ pdfBuffer });
      }
    });

    doc.on('error', reject);
  });
};

export default {
  generateOfferLetterPDF,
  generateCompletionLetterPDF,
  generateExperienceLetterPDF,
  generateRelievingLetterPDF,
};

