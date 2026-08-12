import sgMail from '@sendgrid/mail';
import { Resend } from 'resend';

let resendClient = null;
let sendGridInitialized = false;

const getResendClient = () => {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
};

// Initialize SendGrid
const initSendGrid = () => {
  if (process.env.SENDGRID_API_KEY && !sendGridInitialized) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    sendGridInitialized = true;
    return true;
  }
  return sendGridInitialized;
};

/**
 * Send email utility function via SendGrid
 */
export const sendEmail = async ({ to, subject, html, text, fromName, attachments = [] }) => {
  try {
    const adminEmail = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || 'onboarding@resend.dev';
    const senderName = fromName || process.env.EMAIL_FROM_NAME || 'Taruna Technology EMS';
    const resend = getResendClient();

    if (resend) {
      console.log(`Email: sending via Resend to ${to}`);
      const { data, error } = await resend.emails.send({
        from: `${senderName} <${adminEmail}>`,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
        attachments,
      });

      if (error) {
        console.error('Resend email error:', error);
        return {
          success: false,
          error: error.message || 'Resend email failed',
          message: 'Email could not be sent'
        };
      }

      console.log('Email sent successfully via Resend:', data?.id);
      return {
        success: true,
        messageId: data?.id,
        provider: 'resend'
      };
    }

    initSendGrid();

    if (!process.env.SENDGRID_API_KEY) {
      console.warn('⚠️ SendGrid API Key missing. Falling back to local logging.');
      console.log(`📧 [MOCK] Email to: ${to}, Subject: ${subject}`);
      return { success: true, message: 'Mock email sent' };
    }

    const msg = {
      to,
      from: {
        name: senderName,
        email: adminEmail,
      },
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Fallback plain text
      attachments: attachments.map((attachment) => ({
        filename: attachment.filename,
        content: Buffer.isBuffer(attachment.content)
          ? attachment.content.toString('base64')
          : attachment.content,
        type: attachment.contentType,
        disposition: 'attachment',
      })),
    };

    console.log(`📧 Attempting to send email via SendGrid to: ${to}`);

    const [response] = await sgMail.send(msg);

    console.log('✅ Email sent successfully via SendGrid. Status:', response.statusCode);

    return {
      success: true,
      statusCode: response.statusCode
    };
  } catch (error) {
    console.error('❌ SendGrid Email error:', error);
    if (error.response) {
      console.error('❌ Error body:', error.response.body);
    }

    return {
      success: false,
      error: error.message,
      message: 'Email could not be sent'
    };
  }
};

/**
 * Email template wrapper with company branding
 */
const createEmailTemplate = (content, title = 'CompanyName EMS') => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { font-family: sans-serif; background: #f4f4f7; color: #333; }
        .email-container { max-width: 600px; margin: auto; background: white; border-radius: 10px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #e91e63, #9c27b0); padding: 30px; text-align: center; color: white; }
        .content { padding: 30px; }
        .button { display: inline-block; padding: 14px 28px; border-radius: 8px; background: linear-gradient(135deg, #e91e63, #9c27b0); color: white; text-decoration: none; }
        .info-box, .warning-box, .success-box { padding: 15px; border-radius: 6px; margin: 20px 0; }
        .info-box { background: #f8f9fa; border-left: 4px solid #e91e63; }
        .warning-box { background: #fff3cd; border: 1px solid #ffeeba; color: #856404; }
        .success-box { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .footer { background: #f8f9fa; padding: 15px; text-align: center; font-size: 13px; color: #666; }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>CompanyName</h1>
          <p>Employee Management System</p>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>This is an automated email from CompanyName EMS. Please do not reply.</p>
          <p>
            <a href="${process.env.FRONTEND_URL}">Visit Portal</a> | 
            <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@company.com'}">Contact Support</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Password reset request email
 */
export const sendPasswordResetEmail = async (user, resetToken) => {
  const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  const emailContent = `
    <h2>Password Reset Request</h2>
    <p>Hello <strong>${user.name}</strong>,</p>
    <p>Click below to reset your password:</p>
    <div style="text-align:center;margin:20px;">
      <a href="${resetURL}" class="button">Reset Password</a>
    </div>
    <div class="warning-box">
      <p>⚠️ This link expires in <strong>10 minutes</strong>. If you didn’t request this, ignore this email.</p>
    </div>
    <p>If the button doesn’t work, copy and paste this link:<br>
    <a href="${resetURL}">${resetURL}</a></p>
  `;

  const htmlContent = createEmailTemplate(emailContent, 'Password Reset Request');

  return await sendEmail({
    to: user.email,
    subject: '🔐 Password Reset Request - CompanyName EMS',
    html: htmlContent,
  });
};

/**
 * Password reset confirmation
 */
export const sendPasswordResetConfirmation = async (user) => {
  const emailContent = `
    <h2>✅ Password Reset Successful</h2>
    <p>Hello <strong>${user.name}</strong>,</p>
    <p>Your password was successfully changed. You can now login with your new password.</p>
    <div style="text-align:center;margin:20px;">
      <a href="${process.env.FRONTEND_URL}/login" class="button">Login Now</a>
    </div>
  `;

  const htmlContent = createEmailTemplate(emailContent, 'Password Reset Confirmation');

  return await sendEmail({
    to: user.email,
    subject: '✅ Password Reset Confirmation - CompanyName EMS',
    html: htmlContent,
  });
};

/**
 * Welcome email
 */
export const sendWelcomeEmail = async (employee, tempPassword) => {
  const emailContent = `
    <h2>Welcome to Our Team 🎉</h2>
    <p>Hello <strong>${employee.fullName}</strong>,</p>
    <p>Your account has been created. Here are your login details:</p>
    <div class="info-box">
      <p><strong>Email:</strong> ${employee.user.email}</p>
      <p><strong>Employee ID:</strong> ${employee.employeeId}</p>
      <p><strong>Temporary Password:</strong> ${tempPassword}</p>
    </div>
    <div style="text-align:center;margin:20px;">
      <a href="${process.env.FRONTEND_URL}/login" class="button">Login to Your Account</a>
    </div>
    <div class="warning-box">
      <p>⚠️ Please change your temporary password after first login.</p>
    </div>
  `;

  const htmlContent = createEmailTemplate(emailContent, 'Welcome to CompanyName');

  return await sendEmail({
    to: employee.user.email,
    subject: '🎉 Welcome to CompanyName - Your Account is Ready!',
    html: htmlContent,
  });
};
/**
 * Send Day Book Report Email
 */
export const sendDayBookReportEmail = async (dayBook, employee, tasks) => {
  const formattedDate = new Date(dayBook.date).toLocaleDateString();

  const slotsHtml = dayBook.slots.map(slot => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${slot.slotType}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${slot.workType}</strong></td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${slot.description || '-'}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${slot.taskRef ? (slot.taskRef.title || 'Task Linked') : '-'}</td>
    </tr>
  `).join('');

  const tasksHtml = tasks.length > 0 ? tasks.map(task => `
    <div class="info-box" style="margin-bottom: 10px;">
      <p><strong>Title:</strong> ${task.title || 'Task'}</p>
      <p><strong>Status:</strong> <span style="color: ${task.status === 'Completed' ? 'green' : 'orange'}">${task.status}</span></p>
      <p><strong>Priority:</strong> ${task.priority}</p>
      <p><strong>Progress:</strong> ${task.progress}%</p>
      <p><strong>Description:</strong> ${task.description}</p>
    </div>
  `).join('') : '<p>No tasks assigned for this period.</p>';

  const emailContent = `
    <h2>Day Book Report - ${formattedDate}</h2>
    <p>Hello Admin,</p>
    <p>A new day book has been submitted by <strong>${employee.personalInfo.firstName} ${employee.personalInfo.lastName} (${employee.employeeId})</strong>.</p>
    
    <div class="success-box">
      <p><strong>Current Status:</strong> ${dayBook.status}</p>
    </div>

    <h3>A. Day Book Details</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="background-color: #f8f9fa;">
          <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Time Slot</th>
          <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Work Type</th>
          <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Description</th>
          <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Assigned Task</th>
        </tr>
      </thead>
      <tbody>
        ${slotsHtml}
      </tbody>
    </table>

    <h3>B. Assigned Tasks & Progress</h3>
    ${tasksHtml}

    <div style="margin-top: 20px; text-align: center;">
      <a href="${process.env.FRONTEND_URL}/admin/day-book-review" class="button">Review Day Book</a>
    </div>
  `;

  const htmlContent = createEmailTemplate(emailContent, `Day Book Report - ${employee.personalInfo.firstName}`);

  const reportEmail = "sudhanshunaikbaroda@gmail.com";

  return await sendEmail({
    to: reportEmail,
    subject: `📋 Day Book Report: ${employee.personalInfo.firstName} ${employee.personalInfo.lastName} - ${formattedDate}`,
    html: htmlContent,
    fromName: `${employee.personalInfo.firstName} ${employee.personalInfo.lastName}`
  });
};

/**
 * Send Task Assignment Email Notification
 */
export const sendTaskAssignmentEmail = async (task, assignedTo, assignedBy) => {
  const formattedDate = new Date(task.dueDate).toLocaleDateString();

  const emailContent = `
    <h2>New Task Assigned 📝</h2>
    <p>Hello Admin,</p>
    <p>A new task has been assigned in the system.</p>
    
    <div class="info-box">
      <p><strong>Task Title:</strong> ${task.title || 'Task'}</p>
      <p><strong>Assigned To:</strong> ${assignedTo.personalInfo.firstName} ${assignedTo.personalInfo.lastName} (${assignedTo.employeeId})</p>
      <p><strong>Assigned By:</strong> ${assignedBy.name}</p>
      <p><strong>Priority:</strong> <span style="color: ${task.priority === 'Critical' ? 'red' : 'orange'}">${task.priority}</span></p>
      <p><strong>Due Date:</strong> ${formattedDate}</p>
    </div>

    <h3>Task Description:</h3>
    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #ddd;">
      ${task.description || 'No description provided'}
    </div>

    <div style="margin-top: 20px; text-align: center;">
      <a href="${process.env.FRONTEND_URL}/admin/tasks" class="button">View All Tasks</a>
    </div>
  `;

  const htmlContent = createEmailTemplate(emailContent, 'New Task Assignment');

  const reportEmail = "sudhanshunaikbaroda@gmail.com";

  return await sendEmail({
    to: reportEmail,
    subject: `📝 New Task: ${task.title || 'Task'} assigned to ${assignedTo.personalInfo.firstName}`,
    html: htmlContent,
    fromName: assignedBy.name
  });
};
