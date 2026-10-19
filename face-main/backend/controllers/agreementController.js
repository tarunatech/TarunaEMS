import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  AgreementTemplateModel,
  EmployeeAgreementModel,
  AgreementSigningLinkModel,
  DEFAULT_INTERNSHIP_AGREEMENT_SECTIONS,
} from '../models/Agreement.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { sendEmail } from '../utils/email.js';
import { generateAgreementPDF } from '../services/agreementPdfService.js';
import { agreementsDir, agreementSignaturesDir, uploadPublicPath } from '../config/uploadPaths.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const getFrontendBaseUrl = (req) => {
  return (
    process.env.FRONTEND_URL ||
    req.headers.origin ||
    `${req.protocol}://${req.get('host')}`.replace(/:\d+$/, ':5000')
  );
};

const getEmailLogoUrl = (req) => {
  if (process.env.EMAIL_LOGO_URL) {
    return process.env.EMAIL_LOGO_URL;
  }
  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl && !frontendUrl.includes('localhost') && !frontendUrl.includes('127.0.0.1')) {
    return `${frontendUrl.replace(/\/$/, '')}/Taruna-logo-text.png`;
  }
  // Publicly hosted Taruna Technology logo accessible to all email clients and webmail proxies
  return 'https://ems.tarunatechnology.com/Taruna-logo-text.png';
};

/**
 * GET /api/agreements/employee/:employeeId
 * HR / Admin retrieves agreement status, history, and active signing link
 */
export const getEmployeeAgreement = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const agreements = await EmployeeAgreementModel.findByEmployeeId(employeeId);
    const latestAgreement = agreements[0] || null;

    let activeLink = null;
    let isExpired = false;
    if (latestAgreement) {
      const link = await AgreementSigningLinkModel.findActiveByAgreementId(latestAgreement.id);
      if (link) {
        activeLink = {
          expiresAt: link.expiresAt,
          createdAt: link.createdAt,
        };
      } else if (latestAgreement.status === 'Link Sent') {
        isExpired = true;
      }
    }

    return res.json({
      success: true,
      data: {
        agreement: latestAgreement,
        history: agreements,
        activeLink,
        isExpired,
      },
    });
  } catch (err) {
    console.error('getEmployeeAgreement error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/agreements/send
 * HR / Admin generates signing link and emails it to employee
 */
export const sendAgreementLink = async (req, res) => {
  try {
    const { employeeId, jobRole, commencementDate, duration } = req.body;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'employeeId is required' });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const user = await User.findById(employee.user);
    const employeeEmail =
      user?.email ||
      employee.contactInfo?.personalEmail ||
      employee.contactInfo?.email;

    if (!employeeEmail) {
      return res.status(400).json({
        success: false,
        message: 'Employee has no registered email address in their record',
      });
    }

    const employeeName =
      `${employee.personalInfo?.firstName || ''} ${employee.personalInfo?.lastName || ''}`.trim() ||
      user?.name ||
      'Employee';
    const employeePhone =
      employee.contactInfo?.phone ||
      employee.contactInfo?.alternatePhone ||
      '';

    const defaultJobRole =
      jobRole ||
      employee.workInfo?.position ||
      employee.workInfo?.designation ||
      'MERN Stack Developer Intern';

    const formattedCommencementDate =
      commencementDate ||
      (employee.workInfo?.joiningDate
        ? new Date(employee.workInfo.joiningDate).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })
        : new Date().toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          }));

    const agreementDuration = duration || 'three (3) months';

    // 1. Ensure template exists
    const template = await AgreementTemplateModel.ensureDefaultTemplate();

    // 2. Check if already signed
    const latest = await EmployeeAgreementModel.findLatestByEmployeeId(employeeId);
    if (latest && latest.status === 'Signed') {
      return res.status(400).json({
        success: false,
        message: 'This employee has already signed an agreement. Resending is not permitted for signed agreements.',
      });
    }

    // 3. Create or reuse agreement record
    let agreement = latest;
    if (!agreement || agreement.status === 'Signed') {
      agreement = await EmployeeAgreementModel.create({
        employeeId,
        templateId: template.id,
        agreementTitle: template.title || 'Taruna Technology Internship Agreement',
        version: template.version || '1.0',
        status: 'Link Sent',
        employeeName,
        employeeEmail,
        employeePhone,
        jobRole: defaultJobRole,
        commencementDate: formattedCommencementDate,
        duration: agreementDuration,
        stipendStatus: 'Unpaid',
        createdBy: req.user.id || req.user._id,
      });
    } else {
      agreement = await EmployeeAgreementModel.updateById(agreement.id, {
        status: 'Link Sent',
        employeeName,
        employeeEmail,
        employeePhone,
        jobRole: defaultJobRole,
        commencementDate: formattedCommencementDate,
        duration: agreementDuration,
        lastSentAt: new Date(),
      });
    }

    // 4. Revoke previous active tokens for this agreement
    await AgreementSigningLinkModel.revokeActiveLinksForAgreement(agreement.id);

    // 5. Generate secure random token (64 hex characters) and hash it
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);

    // 6. Expiry is strictly 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await AgreementSigningLinkModel.create({
      agreementId: agreement.id,
      tokenHash,
      expiresAt,
      createdBy: req.user.id || req.user._id,
    });

    // 7. Compose and send email
    const frontendBaseUrl = getFrontendBaseUrl(req);
    const signingUrl = `${frontendBaseUrl}/sign-agreement/${rawToken}`;
    const emailLogoUrl = getEmailLogoUrl(req);

    const emailSubject = 'Action Required: Review and Sign Your Internship Agreement';
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="${emailLogoUrl}" alt="Taruna Technology" width="220" style="display: block; margin: 0 auto 10px auto; max-width: 220px; height: auto; border: 0; outline: none;" />
          <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0; font-weight: 500;">Internship Agreement Signing Portal</p>
        </div>
        <p style="font-size: 15px;">Hello <strong>${employeeName}</strong>,</p>
        <p style="font-size: 14px; color: #334155;">Please review and sign your Internship Agreement with <strong>Taruna Technology</strong>.</p>
        <p style="font-size: 14px; color: #334155;">Open the secure link below to review the complete agreement, read the applicable terms and conditions, and submit your acknowledgement and signature.</p>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${signingUrl}" style="background-color: #0284c7; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25);">Review and Sign Agreement</a>
        </div>

        <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 12px 16px; margin: 24px 0;">
          <p style="color: #be123c; font-size: 13px; font-weight: 700; margin: 0;">⚠️ Security Notice: This link will expire 15 minutes after it is issued.</p>
          <p style="color: #9f1239; font-size: 12px; margin: 4px 0 0 0;">If your link expires before you complete the process, please contact HR to request a new link.</p>
        </div>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="margin: 0; font-size: 13px; color: #64748b;">Regards,<br><strong style="color: #1e293b;">HR Team</strong><br>Taruna Technology</p>
      </div>
    `;

    console.log(`[Agreement] Sending agreement link email to ${employeeEmail}`);
    const emailResult = await sendEmail({
      to: employeeEmail,
      subject: emailSubject,
      html: emailHtml,
      text: `Hello ${employeeName},\n\nPlease review and sign your Internship Agreement with Taruna Technology.\n\nOpen the link below:\n${signingUrl}\n\nThis link will expire in 15 minutes.\n\nRegards,\nHR Team\nTaruna Technology`,
    });

    let emailWarning = null;
    if (!emailResult.success) {
      console.warn('[Agreement] Email sending notice:', emailResult.error);
      const isSandboxRestriction =
        emailResult.error &&
        (emailResult.error.includes('only send testing emails to your own email address') ||
          emailResult.error.includes('resend.com/domains') ||
          emailResult.error.includes('testing email address'));

      const statusNote = `Failed: ${String(emailResult.error || 'Email delivery failed').slice(0, 500)}`;

      await EmployeeAgreementModel.updateById(agreement.id, {
        status: 'Link Sent',
        lastSentAt: new Date(),
        emailDeliveryStatus: statusNote,
      });

      emailWarning = isSandboxRestriction
        ? `Signing link created! Note: Email delivery to ${employeeEmail} was restricted by Resend sandbox mode. You can copy the signing link directly.`
        : `Signing link created! Note: Email delivery failed (${emailResult.error}). Signing link is active for 15 minutes.`;
    } else {
      await EmployeeAgreementModel.updateById(agreement.id, {
        status: 'Link Sent',
        lastSentAt: new Date(),
        emailDeliveryStatus: 'Sent',
        emailMessageId: emailResult.messageId || null,
      });
    }

    return res.json({
      success: true,
      emailDelivered: emailResult.success,
      warning: emailWarning,
      message: emailResult.success
        ? `Agreement signing link sent to ${employeeEmail} successfully. Link expires in 15 minutes.`
        : emailWarning,
      data: {
        agreementId: agreement.id,
        recipientEmail: employeeEmail,
        signingUrl,
        rawToken,
        expiresAt,
        emailDeliveryFailed: !emailResult.success,
        emailError: emailResult.error || null,
      },
    });
  } catch (err) {
    console.error('sendAgreementLink error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/agreements/sign/:token
 * Public endpoint to fetch agreement details for signing page
 */
export const getSigningAgreementByToken = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Signing token is required' });
    }

    const tokenHash = hashToken(token);
    const link = await AgreementSigningLinkModel.findByTokenHash(tokenHash);

    if (!link) {
      return res.status(404).json({
        success: false,
        code: 'TOKEN_NOT_FOUND',
        message: 'Invalid signing link. The link may have been replaced or does not exist.',
      });
    }

    if (link.revokedAt) {
      return res.status(410).json({
        success: false,
        code: 'TOKEN_REVOKED',
        message: 'This signing link has been revoked or replaced by HR. Please contact HR for a new link.',
      });
    }

    if (link.usedAt) {
      return res.status(410).json({
        success: false,
        code: 'TOKEN_USED',
        message: 'This agreement has already been signed and submitted.',
      });
    }

    const now = new Date();
    if (new Date(link.expiresAt) < now) {
      return res.status(410).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'This signing link has expired (15-minute validity). Please contact HR to receive a replacement link.',
      });
    }

    const agreement = await EmployeeAgreementModel.findById(link.agreementId);
    if (!agreement) {
      return res.status(404).json({ success: false, message: 'Agreement record not found' });
    }

    if (agreement.status === 'Signed') {
      return res.status(410).json({
        success: false,
        code: 'ALREADY_SIGNED',
        message: 'This agreement has already been completed and signed.',
      });
    }

    const template = await AgreementTemplateModel.findById(agreement.templateId);

    // Interpolate dynamic values into template sections
    const rawSections = template?.sections || DEFAULT_INTERNSHIP_AGREEMENT_SECTIONS;
    const interpolatedSections = rawSections.map((sec) => ({
      ...sec,
      content: sec.content
        .replace(/{{jobRole}}/g, agreement.jobRole || 'MERN Stack Developer')
        .replace(/{{commencementDate}}/g, agreement.commencementDate || '09 July 2026')
        .replace(/{{duration}}/g, agreement.duration || 'three (3) months'),
    }));

    const employeeObj = {
      fullName: agreement.employeeName,
      name: agreement.employeeName,
      email: agreement.employeeEmail,
      phone: agreement.employeePhone,
    };
    const agreementObj = {
      id: agreement.id,
      jobRole: agreement.jobRole,
      commencementDate: agreement.commencementDate,
      duration: agreement.duration,
      status: agreement.status,
    };
    const templateObj = {
      title: agreement.agreementTitle,
      version: agreement.version,
      companyName: template?.companyName || 'Taruna Technology',
      companyAddress: template?.companyAddress || '709,710 Broadway Empire, circle, Vasna Bhayli Main Rd, Vadodara, Gujarat 391410',
      companyEmail: template?.companyEmail || 'tarunatechnology@gmail.com',
      companyPhone: template?.companyPhone || '+91 9106610595',
      signatoryName: template?.signatoryName || 'Tisha Bhadja',
      signatoryRole: template?.signatoryRole || 'Operational Manager',
    };

    return res.json({
      success: true,
      data: {
        employee: employeeObj,
        agreement: agreementObj,
        template: templateObj,
        agreementId: agreement.id,
        title: agreement.agreementTitle,
        version: agreement.version,
        employeeName: agreement.employeeName,
        employeeEmail: agreement.employeeEmail,
        employeePhone: agreement.employeePhone,
        jobRole: agreement.jobRole,
        commencementDate: agreement.commencementDate,
        duration: agreement.duration,
        companyName: templateObj.companyName,
        companyAddress: templateObj.companyAddress,
        companyEmail: templateObj.companyEmail,
        companyPhone: templateObj.companyPhone,
        signatoryName: templateObj.signatoryName,
        signatoryRole: templateObj.signatoryRole,
        sections: interpolatedSections,
        expiresAt: link.expiresAt,
      },
    });
  } catch (err) {
    console.error('getSigningAgreementByToken error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/agreements/sign/:token
 * Public endpoint to submit signature and complete agreement
 */
export const submitSignedAgreement = async (req, res) => {
  try {
    const { token } = req.params;
    const { signatureData, signatureImage, acknowledged, acknowledgementText } = req.body;
    const rawSignature = signatureData || signatureImage;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Token is required' });
    }

    if (!acknowledged) {
      return res.status(400).json({
        success: false,
        message: 'You must confirm that you have read and understood the agreement terms before signing.',
      });
    }

    if (!rawSignature || !rawSignature.startsWith('data:image')) {
      return res.status(400).json({
        success: false,
        message: 'A valid drawn signature is required to sign the agreement.',
      });
    }

    const tokenHash = hashToken(token);
    const link = await AgreementSigningLinkModel.findByTokenHash(tokenHash);

    if (!link) {
      return res.status(404).json({ success: false, message: 'Invalid signing link' });
    }

    if (link.revokedAt) {
      return res.status(410).json({ success: false, message: 'This link has been revoked. Please contact HR.' });
    }

    if (link.usedAt) {
      return res.status(410).json({ success: false, message: 'This agreement has already been submitted.' });
    }

    const now = new Date();
    if (new Date(link.expiresAt) < now) {
      return res.status(410).json({
        success: false,
        message: 'This link has expired (15-minute time limit). Please contact HR for a new link.',
      });
    }

    const agreement = await EmployeeAgreementModel.findById(link.agreementId);
    if (!agreement || agreement.status === 'Signed') {
      return res.status(400).json({ success: false, message: 'Agreement already signed or not found' });
    }

    // Atomic mark as used to prevent race conditions & duplicate submissions
    const usedLink = await AgreementSigningLinkModel.markUsed(link.id);
    if (!usedLink) {
      return res.status(409).json({ success: false, message: 'Concurrent submission detected. Please refresh.' });
    }

    // 1. Save signature file
    const base64Data = rawSignature.replace(/^data:image\/\w+;base64,/, '');
    const sigBuffer = Buffer.from(base64Data, 'base64');
    const sigFileName = `sig_${agreement.id}_${Date.now()}.png`;
    const sigFilePath = path.join(agreementSignaturesDir, sigFileName);
    fs.writeFileSync(sigFilePath, sigBuffer);
    const sigPublicPath = uploadPublicPath('agreement-signatures', sigFileName);

    // 2. Generate authoritative 7-page signed PDF
    const template = await AgreementTemplateModel.findById(agreement.templateId);
    const signedTimestamp = new Date();

    const pdfResult = await generateAgreementPDF(
      {
        id: agreement.id,
        employeeName: agreement.employeeName,
        employeeEmail: agreement.employeeEmail,
        employeePhone: agreement.employeePhone,
        jobRole: agreement.jobRole,
        commencementDate: agreement.commencementDate,
        duration: agreement.duration,
        signatureData: rawSignature,
        signaturePath: sigFilePath,
        signedAt: signedTimestamp,
        signatoryName: template?.signatoryName || 'Tisha Bhadja',
        signatoryRole: template?.signatoryRole || 'Operational Manager',
        companyName: template?.companyName || 'Taruna Technology',
        companyAddress: template?.companyAddress || '709,710 Broadway Empire, circle, Vasna Bhayli Main Rd, Vadodara, Gujarat 391410',
        companyEmail: template?.companyEmail || 'tarunatechnology@gmail.com',
        companyPhone: template?.companyPhone || '+91 9106610595',
      },
      {
        saveToFile: true,
        fileName: `signed_agreement_${agreement.id}_${Date.now()}.pdf`,
      }
    );

    // 3. Update employee agreement record
    const updatedAgreement = await EmployeeAgreementModel.updateById(agreement.id, {
      status: 'Signed',
      acknowledged: true,
      acknowledgementText:
        acknowledgementText ||
        'I confirm that I have read and understood the terms and conditions stated in this Internship Agreement and agree to the applicable terms.',
      signatureData: sigPublicPath,
      signaturePath: sigPublicPath,
      signedPdfPath: pdfResult.publicPath,
      signedAt: signedTimestamp,
      ipAddress: req.ip || req.connection?.remoteAddress || '127.0.0.1',
      userAgent: req.get('user-agent') || 'Browser',
    });

    // 4. Notify HR / Admin
    try {
      const adminUsers = await User.find({ role: 'admin' });
      for (const admin of adminUsers || []) {
        await Notification.createNotification({
          recipient: admin._id || admin.id,
          sender: agreement.createdBy || admin._id || admin.id,
          title: 'Agreement Signed',
          message: `${agreement.employeeName} has signed and submitted the Internship Agreement.`,
          type: 'info',
          link: `/admin/employees`,
          metadata: {
            employeeId: agreement.employeeId,
            agreementId: agreement.id,
          },
        });
      }
    } catch (notifErr) {
      console.warn('Could not create admin notification for signed agreement:', notifErr.message);
    }

    // 5. Optionally send confirmation email to employee
    try {
      const emailLogoUrl = getEmailLogoUrl(req);
      sendEmail({
        to: agreement.employeeEmail,
        subject: 'Confirmation: Your Internship Agreement has been Signed',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="${emailLogoUrl}" alt="Taruna Technology" width="200" style="display: block; margin: 0 auto 10px auto; max-width: 200px; height: auto; border: 0; outline: none;" />
            </div>
            <h3 style="color: #0284c7; margin-top: 0;">Agreement Signed Successfully</h3>
            <p>Hello <strong>${agreement.employeeName}</strong>,</p>
            <p>Thank you for reviewing and signing your <strong>Internship Agreement</strong> with <strong>Taruna Technology</strong>.</p>
            <p>Your signed agreement has been recorded and submitted to HR for official records.</p>
            <p style="font-size: 13px; color: #64748b;">Signing Timestamp: ${signedTimestamp.toISOString()}<br>Document Reference: ${agreement.id}</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #64748b;">Taruna Technology HR Team</p>
          </div>
        `,
        text: `Hello ${agreement.employeeName},\n\nYour Internship Agreement with Taruna Technology has been successfully signed and submitted.\n\nTaruna Technology HR Team`,
      }).catch((e) => console.warn('Confirmation email failed:', e.message));
    } catch (e) {
      // non-blocking
    }

    return res.json({
      success: true,
      message: 'Internship Agreement signed and submitted successfully!',
      data: {
        agreement: updatedAgreement,
        agreementId: updatedAgreement.id,
        signedAt: signedTimestamp,
        signedPdfUrl: pdfResult.publicPath,
      },
    });
  } catch (err) {
    console.error('submitSignedAgreement error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/agreements/:id/download-pdf
 * Authenticated HR / Admin download of signed PDF
 */
export const downloadSignedPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const agreement = await EmployeeAgreementModel.findById(id);

    if (!agreement) {
      return res.status(404).json({ success: false, message: 'Agreement not found' });
    }

    if (agreement.status !== 'Signed' || !agreement.signedPdfPath) {
      return res.status(400).json({ success: false, message: 'Agreement has not been signed yet' });
    }

    // Resolve file on disk
    let diskPath = null;
    if (agreement.signedPdfPath.startsWith('/uploads/')) {
      const rel = agreement.signedPdfPath.replace(/^\/uploads\//, '');
      diskPath = path.join(agreementsDir, '..', rel);
    } else {
      diskPath = agreement.signedPdfPath;
    }

    if (!fs.existsSync(diskPath)) {
      // If file was deleted or moved, regenerate on the fly!
      const template = await AgreementTemplateModel.findById(agreement.templateId);
      const regen = await generateAgreementPDF(
        {
          id: agreement.id,
          employeeName: agreement.employeeName,
          employeeEmail: agreement.employeeEmail,
          employeePhone: agreement.employeePhone,
          jobRole: agreement.jobRole,
          commencementDate: agreement.commencementDate,
          duration: agreement.duration,
          signatureData: agreement.signatureData,
          signedAt: agreement.signedAt || new Date(),
          signatoryName: template?.signatoryName || 'Tisha Bhadja',
          signatoryRole: template?.signatoryRole || 'Operational Manager',
          companyName: template?.companyName || 'Taruna Technology',
          companyAddress: template?.companyAddress || '709,710 Broadway Empire, circle, Vasna Bhayli Main Rd, Vadodara, Gujarat 391410',
          companyEmail: template?.companyEmail || 'tarunatechnology@gmail.com',
          companyPhone: template?.companyPhone || '+91 9106610595',
        },
        { saveToFile: true }
      );
      diskPath = regen.filePath;
    }

    const safeName = `Internship_Agreement_${agreement.employeeName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);

    const stream = fs.createReadStream(diskPath);
    stream.pipe(res);
  } catch (err) {
    console.error('downloadSignedPdf error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export default {
  getEmployeeAgreement,
  sendAgreementLink,
  getSigningAgreementByToken,
  submitSignedAgreement,
  downloadSignedPdf,
};
