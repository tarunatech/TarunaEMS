// backend/controllers/botController.js
import Groq from 'groq-sdk';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import Leave from '../models/Leave.js';
import Message from '../models/Message.js';
import Department from '../models/Department.js';
import Payslip from '../models/Payslip.js';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const ADMIN_HR_CONTEXT = `You are an intelligent HR Admin Assistant bot for an Employee Management System. You have access to COMPLETE employee data and can answer any question about any employee in the organization.

Your capabilities as Admin HR Assistant:
1. **Employee Information**: You have access to all employee details including personal info, contact details, work info, salary, attendance, and leave records.
2. **Search Employees**: Can find employees by name, ID, department, position, or any other criteria.
3. **Salary & Payroll**: Access to all employee salary information, payslips, and compensation details.
4. **Attendance Reports**: Can provide attendance data for any employee or the entire organization.
5. **Leave Management**: Access to all leave requests, balances, and approvals.
6. **Department Analytics**: Can provide department-wise statistics and reports.
7. **Performance Data**: Access to performance and appraisal information.
8. **HR Policies**: General HR policies and guidelines.

IMPORTANT RULES:
- Answer questions accurately based on the employee data provided
- When asked about specific employees, use the data to provide accurate information
- For queries about multiple employees, provide organized summaries
- Use markdown formatting for better readability
- Be professional and maintain data privacy awareness
- If specific data is not available, say so clearly

You can answer questions like:
- "What is John's salary?"
- "How many employees are in the Engineering department?"
- "Show me attendance summary for EMP001"
- "List all employees on leave today"
- "What is the average salary in Sales department?"`;

const EMPLOYEE_HR_CONTEXT = `You are an HR Assistant bot for an Employee Management System. You help employees with HR-related questions about THEIR OWN information only.

Your capabilities:
1. **Personal Leave Balance**: Check your own leave balance and history
2. **Attendance Records**: View your own attendance records
3. **Salary Information**: Your salary details and payslips
4. **HR Policies**: General leave, attendance, and company policies
5. **Document Requests**: Generate your salary slip or appraisal letter
6. **Benefits Information**: Your employee benefits and perks

IMPORTANT RULES:
- ONLY provide information about the logged-in employee
- Keep responses concise and professional
- Use markdown formatting for better readability
- If you cannot answer something, suggest contacting the HR department

For document generation requests, respond with the appropriate action marker:
- For salary slip: Include "[GENERATE_SALARY_SLIP]" in your response
- For appraisal letter: Include "[GENERATE_APPRAISAL_LETTER]" in your response`;

let groqClient = null;

const getGroqClient = () => {
  if (!groqClient && process.env.GROQ_API_KEY) {
    groqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
  }
  return groqClient;
};

const getEmployeeId = (user) => {
  return user.employeeId?.employeeId || 
         user.employeeId?._id || 
         user.employeeId || 
         user._id.toString() || 
         'unknown';
};

const generateSalarySlipPDF = async (user, month = 'current', year = new Date().getFullYear()) => {
  const PDFDocument = (await import('pdfkit')).default;
  const empId = getEmployeeId(user);
  const fileName = `salary_slip_${empId}_${month}_${year}_${uuidv4().slice(0,8)}.pdf`;
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  const filePath = path.join(tempDir, fileName);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(20).text('Salary Slip', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12)
      .text(`Employee: ${user.name || user.fullName || 'N/A'}`)
      .text(`ID: ${empId}`)
      .text(`Month: ${month} ${year}`)
      .moveDown()
      .text('Basic Salary: $5000')
      .text('HRA: $1000')
      .text('Conveyance: $500')
      .text('Total: $6500');

    doc.end();
    stream.on('finish', () => resolve(fileName));
    stream.on('error', reject);
  });
};

const generateAppraisalLetterPDF = async (user) => {
  const PDFDocument = (await import('pdfkit')).default;
  const empId = getEmployeeId(user);
  const fileName = `appraisal_letter_${empId}_${uuidv4().slice(0,8)}.pdf`;
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  const filePath = path.join(tempDir, fileName);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(20).text('Appraisal Letter', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12)
      .text(`Dear ${user.name || user.fullName || 'Employee'},`)
      .moveDown()
      .text('Congratulations on your performance this year. Your rating is Excellent.')
      .text('Salary increment: 10%')
      .moveDown()
      .text('Best regards,')
      .text('HR Department');

    doc.end();
    stream.on('finish', () => resolve(fileName));
    stream.on('error', reject);
  });
};

const getAllEmployeesContext = async () => {
  try {
    const employees = await Employee.find({ status: 'Active' })
      .populate('user', 'name email role')
      .populate('workInfo.department', 'name')
      .lean();

    if (!employees || employees.length === 0) {
      return 'No employee data available.';
    }

    const departments = await Department.find().lean();
    const deptMap = {};
    departments.forEach(d => {
      deptMap[d._id.toString()] = d.name;
    });

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endOfMonth = new Date();

    let contextParts = [];
    contextParts.push(`=== ORGANIZATION OVERVIEW ===`);
    contextParts.push(`Total Active Employees: ${employees.length}`);
    contextParts.push(`Departments: ${departments.map(d => d.name).join(', ')}`);
    contextParts.push('');

    const deptCounts = {};
    employees.forEach(emp => {
      const deptName = emp.workInfo?.department?.name || 'Unassigned';
      deptCounts[deptName] = (deptCounts[deptName] || 0) + 1;
    });
    contextParts.push(`Department Distribution:`);
    Object.entries(deptCounts).forEach(([dept, count]) => {
      contextParts.push(`  - ${dept}: ${count} employees`);
    });
    contextParts.push('');

    contextParts.push(`=== EMPLOYEE DETAILS ===`);
    
    for (const emp of employees) {
      const attendance = await Attendance.find({
        $or: [
          { employee: emp._id },
          { user: emp.user?._id }
        ],
        date: { $gte: startOfMonth, $lte: endOfMonth }
      }).lean();

      const presentDays = attendance.filter(a => 
        ['present', 'Present', 'late', 'Late'].includes(a.status)
      ).length;

      const leaves = await Leave.find({
        $or: [
          { employee: emp._id },
          { user: emp.user?._id }
        ]
      }).lean();

      const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
      const approvedLeaves = leaves.filter(l => l.status === 'approved').length;

      const deptName = emp.workInfo?.department?.name || 'Unassigned';
      
      contextParts.push(`---`);
      contextParts.push(`Employee ID: ${emp.employeeId}`);
      contextParts.push(`Name: ${emp.personalInfo?.firstName} ${emp.personalInfo?.lastName}`);
      contextParts.push(`Email: ${emp.user?.email || emp.contactInfo?.personalEmail || 'N/A'}`);
      contextParts.push(`Phone: ${emp.contactInfo?.phone || 'N/A'}`);
      contextParts.push(`Department: ${deptName}`);
      contextParts.push(`Position: ${emp.workInfo?.position || 'N/A'}`);
      contextParts.push(`Employment Type: ${emp.workInfo?.employmentType || 'Full-time'}`);
      contextParts.push(`Work Location: ${emp.workInfo?.workLocation || 'Office'}`);
      contextParts.push(`Joining Date: ${emp.workInfo?.joiningDate ? new Date(emp.workInfo.joiningDate).toLocaleDateString() : 'N/A'}`);
      contextParts.push(`Status: ${emp.status}`);
      contextParts.push(`Basic Salary: ₹${emp.salaryInfo?.basicSalary?.toLocaleString() || 'N/A'}`);
      contextParts.push(`Leave Balance: ${emp.leaveBalance?.remaining || 0} days remaining`);
      contextParts.push(`Attendance This Month: ${presentDays} days present`);
      contextParts.push(`Pending Leave Requests: ${pendingLeaves}`);
      contextParts.push(`Total Approved Leaves: ${approvedLeaves}`);
      
      if (emp.personalInfo?.gender) {
        contextParts.push(`Gender: ${emp.personalInfo.gender}`);
      }
      if (emp.personalInfo?.dateOfBirth) {
        const age = Math.floor((new Date() - new Date(emp.personalInfo.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));
        contextParts.push(`Age: ${age} years`);
      }
      if (emp.workInfo?.skills && emp.workInfo.skills.length > 0) {
        contextParts.push(`Skills: ${emp.workInfo.skills.join(', ')}`);
      }
      contextParts.push('');
    }

    return contextParts.join('\n');
  } catch (error) {
    console.error('Error getting all employees context:', error);
    return 'Error loading employee data.';
  }
};

const getDetailedEmployeeContext = async (userId) => {
  try {
    const user = await User.findById(userId).populate('employeeId');
    if (!user) return '';

    const employee = await Employee.findOne({ user: userId })
      .populate('workInfo.department', 'name')
      .lean();

    let contextParts = [];
    
    if (employee) {
      contextParts.push(`=== YOUR EMPLOYEE PROFILE ===`);
      contextParts.push(`Employee ID: ${employee.employeeId}`);
      contextParts.push(`Name: ${employee.personalInfo?.firstName} ${employee.personalInfo?.lastName}`);
      contextParts.push(`Email: ${user.email}`);
      contextParts.push(`Phone: ${employee.contactInfo?.phone || 'N/A'}`);
      contextParts.push(`Department: ${employee.workInfo?.department?.name || 'N/A'}`);
      contextParts.push(`Position: ${employee.workInfo?.position || 'N/A'}`);
      contextParts.push(`Employment Type: ${employee.workInfo?.employmentType || 'Full-time'}`);
      contextParts.push(`Work Location: ${employee.workInfo?.workLocation || 'Office'}`);
      contextParts.push(`Joining Date: ${employee.workInfo?.joiningDate ? new Date(employee.workInfo.joiningDate).toLocaleDateString() : 'N/A'}`);
      contextParts.push(`Status: ${employee.status}`);
      contextParts.push('');
      
      contextParts.push(`=== SALARY INFORMATION ===`);
      contextParts.push(`Basic Salary: ₹${employee.salaryInfo?.basicSalary?.toLocaleString() || 'N/A'}`);
      contextParts.push(`HRA: ₹${employee.salaryInfo?.allowances?.hra?.toLocaleString() || '0'}`);
      contextParts.push(`Medical Allowance: ₹${employee.salaryInfo?.allowances?.medical?.toLocaleString() || '0'}`);
      contextParts.push(`Transport Allowance: ₹${employee.salaryInfo?.allowances?.transport?.toLocaleString() || '0'}`);
      contextParts.push(`PF Deduction: ₹${employee.salaryInfo?.deductions?.pf?.toLocaleString() || '0'}`);
      contextParts.push(`Tax Deduction: ₹${employee.salaryInfo?.deductions?.tax?.toLocaleString() || '0'}`);
      contextParts.push('');

      contextParts.push(`=== LEAVE BALANCE ===`);
      contextParts.push(`Total Leaves: ${employee.leaveBalance?.total || 30} days`);
      contextParts.push(`Used Leaves: ${employee.leaveBalance?.used || 0} days`);
      contextParts.push(`Remaining Leaves: ${employee.leaveBalance?.remaining || 30} days`);
      contextParts.push('');
    } else {
      contextParts.push(`Employee Name: ${user.fullName || user.name || 'Unknown'}`);
      contextParts.push(`Employee ID: ${getEmployeeId(user)}`);
    }

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endOfMonth = new Date();
    
    const attendance = await Attendance.find({
      $or: [
        { employee: employee?._id },
        { user: userId }
      ],
      date: { $gte: startOfMonth, $lte: endOfMonth }
    }).lean();
    
    if (attendance.length > 0) {
      const present = attendance.filter(a => 
        ['present', 'Present', 'late', 'Late'].includes(a.status)
      ).length;
      const late = attendance.filter(a => 
        ['late', 'Late'].includes(a.status)
      ).length;
      const absent = attendance.filter(a => 
        ['absent', 'Absent'].includes(a.status)
      ).length;

      contextParts.push(`=== ATTENDANCE THIS MONTH ===`);
      contextParts.push(`Total Working Days: ${attendance.length}`);
      contextParts.push(`Present: ${present} days`);
      contextParts.push(`Late: ${late} days`);
      contextParts.push(`Absent: ${absent} days`);
      contextParts.push('');
    }

    const leaves = await Leave.find({ 
      $or: [
        { employee: employee?._id },
        { user: userId }
      ]
    }).sort({ createdAt: -1 }).limit(5).lean();
    
    if (leaves.length > 0) {
      contextParts.push(`=== RECENT LEAVE REQUESTS ===`);
      leaves.forEach(leave => {
        contextParts.push(`- ${leave.leaveType || 'Leave'}: ${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()} - Status: ${leave.status}`);
      });
      contextParts.push('');
    }

    return contextParts.join('\n');
  } catch (error) {
    console.error('Error getting detailed employee context:', error);
    return '';
  }
};

export const processBotMessage = async (text, userId, isAdmin = false) => {
  try {
    console.log('Bot processing message:', text, 'for user:', userId, 'isAdmin:', isAdmin);
    
    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found:', userId);
      return { 
        response: 'Sorry, I cannot find your profile. Please contact HR support.', 
        intent: 'error' 
      };
    }

    let contextData = '';
    let systemPrompt = '';

    if (isAdmin) {
      contextData = await getAllEmployeesContext();
      systemPrompt = ADMIN_HR_CONTEXT;
    } else {
      contextData = await getDetailedEmployeeContext(userId);
      systemPrompt = EMPLOYEE_HR_CONTEXT;
    }
    
    let response = '';
    
    const groq = getGroqClient();
    if (!groq) {
      console.log('Groq client not available, using fallback');
      response = getFallbackResponse(text, user, contextData, isAdmin);
    } else {
      try {
        console.log('Sending request to Groq API with model llama-3.1-8b-instant');
        const chatCompletion = await groq.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'system',
              content: `${isAdmin ? 'ALL EMPLOYEE DATA' : 'YOUR EMPLOYEE DATA'}:\n${contextData}`
            },
            {
              role: 'user',
              content: text
            }
          ],
          model: 'llama-3.1-8b-instant',
          temperature: 0.7,
          max_tokens: 2048,
          top_p: 1,
          stream: false
        });

        response = chatCompletion.choices[0]?.message?.content || 'Sorry, I could not generate a response. Please try again.';
        
        if (response.includes('[GENERATE_SALARY_SLIP]')) {
          try {
            const fileName = await generateSalarySlipPDF(user);
            response = response.replace('[GENERATE_SALARY_SLIP]', `\n\n✅ Your salary slip is ready! [Download here](/api/bot/download/${fileName})`);
          } catch (err) {
            console.error('Salary slip generation error:', err);
            response = response.replace('[GENERATE_SALARY_SLIP]', '\n\n❌ Failed to generate salary slip. Please try again later.');
          }
        }
        
        if (response.includes('[GENERATE_APPRAISAL_LETTER]')) {
          try {
            const fileName = await generateAppraisalLetterPDF(user);
            response = response.replace('[GENERATE_APPRAISAL_LETTER]', `\n\n✅ Your appraisal letter is ready! [Download here](/api/bot/download/${fileName})`);
          } catch (err) {
            console.error('Appraisal letter generation error:', err);
            response = response.replace('[GENERATE_APPRAISAL_LETTER]', '\n\n❌ Failed to generate appraisal letter. Please try again later.');
          }
        }
      } catch (groqError) {
        console.error('Groq API error:', groqError);
        response = getFallbackResponse(text, user, contextData, isAdmin);
      }
    }

    await new Message({
      from: null,
      to: userId,
      text: response,
      fromBot: true
    }).save();

    return { response, intent: 'groq_response' };

  } catch (error) {
    console.error('Bot processing error:', error);
    return { 
      response: 'Sorry, I encountered an unexpected error. Please try again or contact HR support.', 
      intent: 'error' 
    };
  }
};

const getFallbackResponse = (text, user, contextData, isAdmin = false) => {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('hello') || lowerText.includes('hi') || lowerText.includes('hey')) {
    if (isAdmin) {
      return `Hello Admin! 👋 I'm your HR Admin Assistant with access to all employee data.\n\nYou can ask me about:\n• **Employee information** (e.g., "What is John's salary?")\n• **Department statistics** (e.g., "How many employees in Engineering?")\n• **Attendance reports** (e.g., "Show attendance for EMP001")\n• **Leave requests** (e.g., "Who is on leave today?")\n• **Salary & payroll** information\n\nHow can I help you today?`;
    }
    return `Hello! 👋 I'm your HR Assistant. How can I help you today?\n\nYou can ask me about:\n• **Your attendance** and **leave balance**\n• **HR policies** (leave, salary, working hours)\n• **Generate documents** (salary slip, appraisal letter)\n• **Your profile** and **salary information**`;
  }
  
  if (lowerText.includes('leave') && (lowerText.includes('policy') || lowerText.includes('policies'))) {
    return 'Our leave policy allows **21 annual leaves**, **10 sick leaves**, and **5 casual leaves** per year. Unused leaves can be carried forward up to a maximum of 15 days.';
  }
  
  if (lowerText.includes('leave') && (lowerText.includes('balance') || lowerText.includes('remaining'))) {
    const match = contextData.match(/Remaining Leaves?: (\d+)/i);
    if (match) {
      return `You have **${match[1]} leave days** remaining this year.`;
    }
    return 'I cannot access leave records right now. Please check your dashboard or contact HR.';
  }
  
  if (lowerText.includes('attendance')) {
    const match = contextData.match(/Present: (\d+) days/i);
    if (match) {
      return `Attendance this month: **${match[1]} days present**.`;
    }
    return 'No attendance records found for this month.';
  }
  
  if (lowerText.includes('salary') && lowerText.includes('slip')) {
    return 'I can generate your salary slip! Please wait while I prepare it... [GENERATE_SALARY_SLIP]';
  }
  
  if (lowerText.includes('appraisal') && lowerText.includes('letter')) {
    return 'I can generate your appraisal letter! Please wait... [GENERATE_APPRAISAL_LETTER]';
  }
  
  if (lowerText.includes('salary') || lowerText.includes('pay')) {
    const match = contextData.match(/Basic Salary: ₹([\d,]+)/);
    if (match) {
      return `Your basic salary is **₹${match[1]}**. Salaries are credited on the 1st of every month.`;
    }
    return 'Salaries are credited on the **1st of every month** to your registered bank account. If the 1st is a holiday, it will be credited on the next working day.';
  }
  
  if (lowerText.includes('working hours') || lowerText.includes('work hours')) {
    return 'Standard working hours are **9:00 AM to 6:00 PM**, Monday to Friday. Flexible hours can be arranged with manager approval.';
  }
  
  if (isAdmin) {
    if (lowerText.includes('employee') || lowerText.includes('total') || lowerText.includes('count')) {
      const match = contextData.match(/Total Active Employees: (\d+)/);
      if (match) {
        return `There are **${match[1]} active employees** in the organization.`;
      }
    }
    return 'As Admin HR Assistant, I can help you with:\n• **Employee details** - Ask about any employee by name or ID\n• **Department statistics** - Team sizes, distribution\n• **Attendance reports** - Individual or team attendance\n• **Leave management** - Pending requests, balances\n• **Salary information** - Compensation details\n\nPlease ask a specific question!';
  }
  
  return 'I can help with HR-related questions about:\n• **Leave policies** and your balance\n• **Your attendance** records\n• **Your salary** information\n• **Working hours** and policies\n• **Document generation** (salary slip, appraisal letter)\n\nPlease ask me about any of these topics!';
};

export const processMessage = async (req, res) => {
  const { text, userId } = req.body;
  const isAdmin = req.user?.role === 'admin';

  await new Message({
    from: userId,
    to: userId,
    text: text.trim()
  }).save();

  const { response } = await processBotMessage(text, userId, isAdmin);
  res.json({ success: true, response });
};

export const processAdminMessage = async (req, res) => {
  const { text } = req.body;
  const userId = req.user.id;

  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }

  await new Message({
    from: userId,
    to: userId,
    text: text.trim()
  }).save();

  const { response } = await processBotMessage(text, userId, true);
  res.json({ success: true, response });
};

export const getBotHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const messages = await Message.find({
      $or: [
        { to: userId, fromBot: true },
        { from: userId }
      ]
    }).sort({ timestamp: 1 });

    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load history' });
  }
};
