import cron from 'node-cron';
import DayBook from '../models/DayBook.js';
import Employee from '../models/Employee.js';
import Task from '../models/Task.js';
import { sendEmail } from '../utils/email.js';

const ADMIN_EOD_REPORT_EMAIL = process.env.ADMIN_EOD_REPORT_EMAIL;
const SUBMITTED_STATUSES = new Set(['Submitted', 'Approved', 'Rejected']);

let eodReportJob = null;
let eodReportSchedulerStarted = false;

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const formatDate = (date) => new Date(date).toLocaleDateString('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
}).replace(/\//g, '-');

const getTodayRangeIST = () => {
  const now = new Date();
  const istDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);

  const start = new Date(`${istDate}T00:00:00+05:30`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end, label: formatDate(start) };
};

const getEmployeeName = (employee = {}) => {
  const firstName = employee.personalInfo?.firstName || '';
  const lastName = employee.personalInfo?.lastName || '';
  return `${firstName} ${lastName}`.trim() || employee.fullName || 'N/A';
};

const getEmployeePosition = (employee = {}) => (
  employee.workInfo?.position ||
  employee.workInfo?.designation ||
  employee.workInfo?.jobTitle ||
  employee.workInfo?.role ||
  'N/A'
);

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const match = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3].toUpperCase();
  if (meridiem === 'PM' && hours !== 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const getSlotTimeRange = (slotType = '') => {
  const parts = String(slotType).split(/\s+-\s+|-/).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const startMins = parseTimeToMinutes(parts[0]);
    const endMins = parseTimeToMinutes(parts[parts.length - 1]);
    const midpointMins = (startMins !== null && endMins !== null) ? (startMins + endMins) / 2 : null;
    return {
      start: parts[0],
      end: parts[parts.length - 1],
      startMins,
      endMins,
      midpointMins
    };
  }
  return { start: slotType || '', end: slotType || '', startMins: null, endMins: null, midpointMins: null };
};

const isBreakSlot = (slot = {}) => {
  const text = `${slot.workType || ''} ${slot.description || ''} ${slot.slotType || ''}`.toLowerCase();
  return slot.workType === 'Break' || slot.workType === 'Lunch Break' || text.includes('lunch') || text.includes('break');
};

const getSlotTaskTitle = (slot = {}) => {
  if (isBreakSlot(slot)) return '';
  if (slot.taskTitle && String(slot.taskTitle).trim()) {
    return String(slot.taskTitle).trim();
  }
  if (slot.taskRef && typeof slot.taskRef === 'object' && slot.taskRef.title) {
    return String(slot.taskRef.title).trim();
  }
  if (slot.workType) {
    return String(slot.workType).trim();
  }
  return '';
};

const parseDescriptionSections = (description = '') => {
  const text = String(description || '').trim();
  if (!text) return { completed: '', pending: '' };

  const completedMatch = text.match(/(?:Completed Work|Completed):\s*([\s\S]*?)(?=(?:\n\nPending Work|\n\nPending|Pending Work:|Pending:)|$)/i);
  const pendingMatch = text.match(/(?:Pending Work|Pending):\s*([\s\S]*?)$/i);

  if (completedMatch || pendingMatch) {
    return {
      completed: completedMatch ? completedMatch[1].trim() : '',
      pending: pendingMatch ? pendingMatch[1].trim() : ''
    };
  }

  return { completed: text, pending: '' };
};

const buildHalfSummaries = (slots = []) => {
  const firstHalfItems = [];
  const secondHalfItems = [];

  slots.forEach((slot) => {
    if (!slot || isBreakSlot(slot)) return;

    const timeRange = getSlotTimeRange(slot.slotType);
    // 2:00 PM IST is 14 * 60 = 840 minutes
    const isFirstHalf = (timeRange.startMins !== null && timeRange.startMins >= 14 * 60)
      ? false
      : (timeRange.startMins !== null && timeRange.startMins < 13 * 60
        ? true
        : (timeRange.midpointMins === null || timeRange.midpointMins < 14 * 60));

    const title = getSlotTaskTitle(slot);
    const { completed, pending } = parseDescriptionSections(slot.description);

    const slotParts = [];
    if (title) {
      slotParts.push(`Task: ${title}`);
    }

    if (completed) {
      slotParts.push(`Completed Work:\n${completed}`);
    } else if (!pending && slot.description && slot.description.trim()) {
      slotParts.push(`Completed Work:\n${slot.description.trim()}`);
    }

    if (pending) {
      slotParts.push(`Pending Work:\n${pending}`);
    }

    const slotText = slotParts.join('\n\n');
    if (slotText) {
      if (isFirstHalf) {
        firstHalfItems.push(slotText);
      } else {
        secondHalfItems.push(slotText);
      }
    }
  });

  const formatList = (items) => {
    if (!items.length) return 'N/A';
    const unique = [...new Set(items)];
    return unique.join('\n\n---\n\n');
  };

  return {
    firstHalf: formatList(firstHalfItems),
    secondHalf: formatList(secondHalfItems)
  };
};

const getTimes = (slots = []) => {
  const nonBreakSlots = slots.filter((slot) => !isBreakSlot(slot));
  const targetSlots = nonBreakSlots.length ? nonBreakSlots : slots;
  if (!targetSlots.length) return { timeIn: 'N/A', timeOut: 'N/A' };

  const firstRange = getSlotTimeRange(targetSlots[0].slotType);
  const lastRange = getSlotTimeRange(targetSlots[targetSlots.length - 1].slotType);

  return {
    timeIn: firstRange.start || 'N/A',
    timeOut: lastRange.end || 'N/A'
  };
};

const getTaskTitles = (slots = []) => {
  const titles = new Set();

  slots.forEach((slot) => {
    const title = getSlotTaskTitle(slot);
    if (title) {
      titles.add(title);
    }
  });

  const list = [...titles];
  return list.length ? list.join('\n') : 'N/A';
};

const buildRows = (dayBooks = [], tasksByEmployee = new Map(), employeesById = new Map()) => {
  return dayBooks.map((dayBook) => {
    const populatedEmployee = dayBook.employee || {};
    const employeeKey = String(populatedEmployee._id || populatedEmployee.id || dayBook.employee || '');
    const employee = employeesById.get(employeeKey) || populatedEmployee;
    const slots = Array.isArray(dayBook.slots) ? dayBook.slots : [];

    const { timeIn, timeOut } = getTimes(slots);
    const { firstHalf, secondHalf } = buildHalfSummaries(slots);

    let position = getEmployeePosition(employee);
    if (dayBook.isHalfDay) {
      const halfTypeStr = dayBook.halfDayType === 'second' ? 'Second Half' : 'First Half';
      position = `${position} (Half Day - ${halfTypeStr})`;
    }

    return {
      name: getEmployeeName(employee),
      employeeId: employee.employeeId || 'N/A',
      date: formatDate(dayBook.date),
      position,
      department: employee.workInfo?.department?.name || employee.departmentName || employee.workInfo?.departmentName || 'N/A',
      timeIn,
      timeOut,
      taskGiven: getTaskTitles(slots),
      firstHalf,
      secondHalf,
    };
  });
};

const buildExcelHtml = (rows, reportDate) => {
  const columns = [
    ['NAME', 'name', 140],
    ['ID', 'employeeId', 90],
    ['DATE', 'date', 105],
    ['POSITION', 'position', 140],
    ['DEPT', 'department', 140],
    ['TIME IN', 'timeIn', 95],
    ['TIME-OUT', 'timeOut', 95],
    ['TASK GIVEN', 'taskGiven', 220],
    ['FIRST-HALF', 'firstHalf', 360],
    ['SECOND-HALF', 'secondHalf', 360],
  ];
  const descriptionKeys = new Set(['taskGiven', 'firstHalf', 'secondHalf']);
  const colgroup = columns
    .map(([, , width]) => `<col style="width:${width}px;" />`)
    .join('');

  const headerCells = columns
    .map(([label]) => `<th style="background:#2f6f56;color:#fff;font-weight:700;border:1px solid #d9e2dc;padding:8px;text-align:left;">${label}</th>`)
    .join('');

  const bodyRows = rows.length
    ? rows.map((row, rowIndex) => `
        <tr style="background:${rowIndex % 2 === 0 ? '#ffffff' : '#f5f7f8'};">
          ${columns.map(([, key]) => {
      const isDesc = descriptionKeys.has(key);
      const extraStyle = isDesc
        ? 'white-space:pre-wrap;word-wrap:break-word;mso-data-placement:same-cell;'
        : 'white-space:nowrap;';
      const cellValue = escapeHtml(row[key]).replace(/\n/g, '<br/>');
      return `<td style="border:1px solid #e5e7eb;padding:8px;vertical-align:top;mso-number-format:'\\@';${extraStyle}">${cellValue}</td>`;
    }).join('')}
        </tr>
      `).join('')
    : `<tr><td colspan="${columns.length}" style="border:1px solid #e5e7eb;padding:12px;">No submitted EOD reports found for ${escapeHtml(reportDate)}.</td></tr>`;

  return `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          td, th { vertical-align: top; }
        </style>
      </head>
      <body>
        <table>
          <tr>
            <td colspan="${columns.length}" style="font-size:18px;font-weight:700;padding:10px;">Daily Employee EOD Report - ${escapeHtml(reportDate)}</td>
          </tr>
        </table>
        <table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;table-layout:fixed;">
          <colgroup>${colgroup}</colgroup>
          <thead><tr>${headerCells}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </body>
    </html>
  `;
};

export const sendDailyEodExcelReport = async () => {
  const { start, end, label } = getTodayRangeIST();

  const dayBooks = await DayBook.find({
    date: { $gte: start, $lt: end },
  })
    .populate('employee', 'personalInfo.firstName personalInfo.lastName employeeId workInfo.department workInfo.departmentName workInfo.position workInfo.designation workInfo.jobTitle workInfo.role')
    .populate('slots.taskRef')
    .sort({ date: -1 })
    .lean();

  const submittedDayBooks = dayBooks.filter((dayBook) => SUBMITTED_STATUSES.has(dayBook.status));
  const employeeIds = submittedDayBooks
    .map((dayBook) => dayBook.employee?._id || dayBook.employee?.id || dayBook.employee)
    .filter(Boolean);
  const reportEmployees = employeeIds.length
    ? await Employee.find({ _id: { $in: employeeIds } }).populate('workInfo.department').lean()
    : [];
  const assignedTasks = employeeIds.length
    ? await Task.find({ assignedTo: { $in: employeeIds } }).lean()
    : [];
  const employeesById = new Map();
  const tasksByEmployee = new Map();

  reportEmployees.forEach((employee) => {
    employeesById.set(String(employee._id || employee.id), employee);
  });

  assignedTasks.forEach((task) => {
    const key = String(task.assignedTo?._id || task.assignedTo?.id || task.assignedTo || '');
    if (!tasksByEmployee.has(key)) tasksByEmployee.set(key, []);
    tasksByEmployee.get(key).push(task);
  });

  const rows = buildRows(submittedDayBooks, tasksByEmployee, employeesById);
  const excelHtml = buildExcelHtml(rows, label);
  const filename = `employee-eod-report-${label.replace(/\//g, '-')}.xls`;

  const result = await sendEmail({
    to: ADMIN_EOD_REPORT_EMAIL,
    subject: `Daily Employee EOD Excel Report - ${label}`,
    html: `
      <div style="font-family:Arial,sans-serif;color:#111827;">
        <h2 style="margin:0 0 12px;">Daily Employee EOD Report</h2>
        <p style="margin:0 0 10px;">Attached is the Excel report for all submitted employee EOD entries on <strong>${label}</strong>.</p>
        <p style="margin:0;color:#4b5563;">Total submitted EODs: <strong>${submittedDayBooks.length}</strong><br/>Total Excel rows: <strong>${rows.length}</strong></p>
      </div>
    `,
    attachments: [
      {
        filename,
        content: Buffer.from(excelHtml, 'utf8').toString('base64'),
        contentType: 'application/vnd.ms-excel',
      }
    ]
  });

  if (!result?.success) {
    throw new Error(result?.error || result?.message || 'Daily EOD report email failed');
  }

  console.log(`Daily EOD Excel report sent to ${ADMIN_EOD_REPORT_EMAIL}. EODs: ${submittedDayBooks.length}, rows: ${rows.length}`);
  return { dayBooks: submittedDayBooks.length, rows: rows.length };
};

export const startEodReportScheduler = () => {
  if (eodReportSchedulerStarted) {
    console.log('EOD report scheduler already running. Skipping re-init.');
    return true;
  }

  eodReportJob = cron.schedule(
    '10 21 * * *',
    async () => {
      const istTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      console.log(`[${istTime}] Daily EOD Excel report job started`);
      try {
        await sendDailyEodExcelReport();
      } catch (error) {
        console.error('Daily EOD Excel report job failed:', error);
      }
    },
    { timezone: 'Asia/Kolkata' }
  );

  eodReportSchedulerStarted = true;
  console.log(`Scheduled daily EOD Excel report at 9:00 PM IST to ${ADMIN_EOD_REPORT_EMAIL}`);
  return true;
};

export const stopEodReportScheduler = () => {
  if (eodReportJob) eodReportJob.stop();
  eodReportJob = null;
  eodReportSchedulerStarted = false;
};
