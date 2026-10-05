import cron from 'node-cron';
import Attendance from '../models/Attendance.js';
import { OFFICE_LOCATION } from '../controllers/attendanceController.js';

const IST_OFFSET = 5.5 * 60 * 60 * 1000;
let autoCheckoutJob = null;
let autoCheckoutSchedulerStarted = false;

/**
 * Automatically checks out employees who forgot to check out after 7:00 PM IST.
 * Runs after 9:00 PM IST (21:00 IST).
 */
export const performAutoCheckout = async () => {
  try {
    const now = new Date();
    const nowIST = new Date(now.getTime() + IST_OFFSET);
    console.log(`[Auto Check-out] Checking for pending checkouts at IST: ${nowIST.toISOString()}`);

    // Find all records without checkOutTime
    const openAttendances = await Attendance.find({
      $or: [
        { checkOutTime: null },
        { checkOutTime: { $exists: false } }
      ]
    });

    if (!openAttendances || openAttendances.length === 0) {
      console.log('[Auto Check-out] No unclosed attendance records found.');
      return { count: 0, records: [] };
    }

    let checkedOutCount = 0;
    const processedRecords = [];

    for (const record of openAttendances) {
      if (!record.checkInTime) continue;

      const checkInDate = new Date(record.checkInTime);
      const checkInIST = new Date(checkInDate.getTime() + IST_OFFSET);

      // 9:00 PM IST (21:00 IST = 15:30 UTC) on the check-in date
      const autoCheckoutTimeUTC = new Date(Date.UTC(
        checkInIST.getUTCFullYear(),
        checkInIST.getUTCMonth(),
        checkInIST.getUTCDate(),
        15, 30, 0, 0 // 21:00 IST
      ));

      // If current time is past 9:00 PM IST of that attendance day
      if (now >= autoCheckoutTimeUTC) {
        record.checkOutTime = autoCheckoutTimeUTC;
        record.checkOutLocation = {
          latitude: OFFICE_LOCATION?.latitude || 22.298873262930066,
          longitude: OFFICE_LOCATION?.longitude || 73.13129619568713,
          address: 'Office Location (Auto Check-Out)',
          accuracy: 0
        };

        const autoNote = 'Auto checked out by system after 9:00 PM IST (forgot to check out after 7:00 PM).';
        record.notes = record.notes ? `${record.notes}. ${autoNote}` : autoNote;

        await record.save();
        checkedOutCount++;
        processedRecords.push(record._id);
        console.log(`[Auto Check-out] Auto checked out attendance ${record._id} for employee ${record.employee}`);
      }
    }

    console.log(`[Auto Check-out] Completed auto checkout for ${checkedOutCount} record(s).`);
    return { count: checkedOutCount, records: processedRecords };
  } catch (error) {
    console.error('[Auto Check-out] Error during auto checkout execution:', error);
    return { count: 0, error: error.message };
  }
};

/**
 * Start the Auto Check-out Scheduler cron job.
 * Runs at 9:00 PM IST (21:00 IST) every day, with safety checks every 30 mins until midnight.
 */
export const startAutoCheckoutScheduler = () => {
  if (autoCheckoutSchedulerStarted) {
    console.log('Auto Check-out scheduler already running. Skipping re-init.');
    return true;
  }

  // Run at 9:00 PM IST daily and safety checks every 30 mins between 21:00 and 23:30 IST
  autoCheckoutJob = cron.schedule(
    '0,30 21,22,23 * * *',
    async () => {
      const istTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      console.log(`[${istTime}] Auto Check-out cron job triggered`);
      try {
        await performAutoCheckout();
      } catch (error) {
        console.error('Auto Check-out cron job failed:', error);
      }
    },
    { timezone: 'Asia/Kolkata' }
  );

  autoCheckoutSchedulerStarted = true;
  console.log('✅ Scheduled Auto Check-out cron job at 9:00 PM IST (Asia/Kolkata)');

  // Run a one-time check on service start in case it started past 9:00 PM IST
  performAutoCheckout().catch((err) => {
    console.error('Initial auto checkout check on startup failed:', err);
  });

  return true;
};

export const stopAutoCheckoutScheduler = () => {
  if (autoCheckoutJob) autoCheckoutJob.stop();
  autoCheckoutJob = null;
  autoCheckoutSchedulerStarted = false;
  console.log('Auto Check-out scheduler stopped.');
};
