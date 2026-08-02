// test-email.js
import { sendEmail } from './utils/email.js'; // 👈 Adjust path if needed!

const testSend = async () => {
  try {
    const result = await sendEmail({
      to: 'your-real-email@gmail.com', // 🚨 REPLACE THIS WITH YOUR EMAIL
      subject: 'Test Email from Backend',
      html: '<h1>Hello from Node.js!</h1><p>This is a test email to verify your setup.</p>',
    });
    console.log('📧 Test email sent successfully:', result);
  } catch (error) {
    console.error('❌ Failed to send test email:', error.message);
  }
};

testSend();