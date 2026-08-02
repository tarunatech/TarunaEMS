import cron from 'node-cron';
import Employee from '../models/Employee.js';
import Task from '../models/Task.js';
import DayBook from '../models/DayBook.js';
import { sendTaskStatusEmail, sendConsolidatedTaskStatusEmail } from './emailService.js';

let scheduledJobs = [];
let schedulerStarted = false; // 🛡️ guard

// ---------- START SCHEDULER ----------
const startTaskStatusScheduler = async () => {
  try {
    if (schedulerStarted) {
      console.log('⚠️ Task status scheduler already running. Skipping re-init.');
      return true;
    }

    /**
     * Daily at 10:00 PM IST
     */
    const scheduleTimes = [
      {
        time: '0 22 * * *',
        name: 'Daily at 10:00 PM IST'
      }
    ];



    for (const schedule of scheduleTimes) {
      const job = cron.schedule(
        schedule.time,
        async () => {
          const istTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
          console.log(`🔔 [${istTime}] Task Status Report job started (${schedule.name})`);
          await sendTaskStatusReports();
        },
        {
          timezone: 'Asia/Kolkata'
        }
      );

      scheduledJobs.push(job);
      console.log(`✅ Scheduled: ${schedule.name}`);
    }

    schedulerStarted = true;
    console.log('✅ Task status scheduler initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize task status scheduler:', error);
    return false;
  }
};

// ---------- SEND REPORTS ----------
const sendTaskStatusReports = async () => {
  try {
    const istTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    console.log(`📧 [${istTime}] Generating task status reports...`);

    const employees = await Employee.find({ status: 'Active' })
      .populate('workInfo.department')
      .populate('user', 'email')
      .lean();

    if (!employees.length) {
      console.log('ℹ️ No active employees found — skipping email send');
      console.log('✅ Task status reports finished | Success: 0, Failed: 0, Total: 0');
      return;
    }

    const consolidate = String(process.env.CONSOLIDATE_TASK_REPORTS || 'true').toLowerCase() === 'true';

    if (consolidate) {
      const employeeIds = employees.map(e => e._id);
      const allTasks = await Task.find({ assignedTo: { $in: employeeIds } })
        .select('assignedTo description status priority dueDate estimatedHours actualHours')
        .lean();

      // Fetch today's DayBook for all employees
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const allDayBooks = await DayBook.find({
        employee: { $in: employeeIds },
        date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
      }).populate('slots.taskRef').lean();

      const tasksMap = new Map();
      allTasks.forEach(t => {
        const key = String(t.assignedTo);
        if (!tasksMap.has(key)) tasksMap.set(key, []);
        tasksMap.get(key).push(t);
      });

      const dayBookMap = new Map();
      allDayBooks.forEach(db => {
        dayBookMap.set(String(db.employee), db);
      });

      const sections = employees.map(e => ({
        employee: e,
        tasks: tasksMap.get(String(e._id)) || [],
        dayBook: dayBookMap.get(String(e._id)) || null
      }));

      const sent = await sendConsolidatedTaskStatusEmail(sections);
      console.log(
        `✅ Task status reports finished | Mode: Consolidated | Success: ${sent ? 1 : 0}, Failed: ${sent ? 0 : 1}, Employees: ${employees.length}`
      );
    } else {
      let successCount = 0;
      let failureCount = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const employee of employees) {
        try {
          const tasks = await Task.find({ assignedTo: employee._id })
            .select('description status priority dueDate estimatedHours actualHours')
            .lean();

          const dayBook = await DayBook.findOne({
            employee: employee._id,
            date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
          }).populate('slots.taskRef').lean();

          const emailSent = await sendTaskStatusEmail(employee, tasks, dayBook);
          emailSent ? successCount++ : failureCount++;
        } catch (err) {
          console.error(
            `❌ Error processing employee ${employee.personalInfo?.firstName} ${employee.personalInfo?.lastName}:`,
            err.message
          );
          failureCount++;
        }
      }
      console.log(
        `✅ Task status reports finished | Mode: Per-Employee | Success: ${successCount}, Failed: ${failureCount}, Total: ${employees.length}`
      );
    }
  } catch (error) {
    console.error('❌ Task status report generation failed:', error);
  }
};

// ---------- STOP SCHEDULER ----------
const stopTaskStatusScheduler = () => {
  try {
    scheduledJobs.forEach(job => job.stop());
    scheduledJobs = [];
    schedulerStarted = false;
    console.log('✅ Task status scheduler stopped');
    return true;
  } catch (error) {
    console.error('❌ Failed to stop scheduler:', error);
    return false;
  }
};

// ---------- STATUS ----------
const getSchedulerStatus = () => ({
  isRunning: schedulerStarted,
  jobCount: scheduledJobs.length,
  frequency: 'Daily at 10:00 PM IST',
  recipient: process.env.TASK_REPORT_RECIPIENT || 'vrunda1414@gmail.com',
  timezone: 'Asia/Kolkata'
});

export {
  startTaskStatusScheduler,
  sendTaskStatusReports,
  stopTaskStatusScheduler,
  getSchedulerStatus
};
