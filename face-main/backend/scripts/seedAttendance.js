import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import { pool } from '../db/index.js';
import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';

dotenv.config();

const seedAttendance = async () => {
  try {
    await connectDB();

    const employees = await Employee.find({}).populate('user');
    console.log(`Found ${employees.length} employees`);

    if (employees.length === 0) {
      console.log('No employees found. Please create some employees first.');
      return;
    }

    const attendanceRecords = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      for (const employee of employees) {
        const isPresent = Math.random() < 0.8;

        if (isPresent) {
          const checkInTime = new Date(date);
          checkInTime.setHours(9 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);

          const checkOutTime = new Date(date);
          checkOutTime.setHours(17 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);

          const timeDiff = checkOutTime - checkInTime;
          const workingMinutes = Math.round(timeDiff / (1000 * 60));

          let status = 'Present';
          let isLate = false;
          let lateMinutes = 0;

          const standardTime = new Date(date);
          standardTime.setHours(9, 0, 0, 0);

          if (checkInTime > standardTime) {
            isLate = true;
            lateMinutes = Math.round((checkInTime - standardTime) / (1000 * 60));

            if (lateMinutes > 240) status = 'Half Day';
            else if (lateMinutes > 30) status = 'Late';
          }

          attendanceRecords.push({
            employee: employee._id,
            user: employee.user._id,
            date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
            checkInTime,
            checkOutTime,
            checkInLocation: {
              latitude: 22.29269924053806 + (Math.random() - 0.5) * 0.01,
              longitude: 73.12228427139301 + (Math.random() - 0.5) * 0.01,
              address: 'Office Location',
              accuracy: 10 + Math.random() * 20,
            },
            checkOutLocation: {
              latitude: 22.29269924053806 + (Math.random() - 0.5) * 0.01,
              longitude: 73.12228427139301 + (Math.random() - 0.5) * 0.01,
              address: 'Office Location',
              accuracy: 10 + Math.random() * 20,
            },
            workingHours: workingMinutes,
            status,
            isLate,
            lateMinutes,
            notes: '',
            ipAddress: '192.168.1.100',
            deviceInfo: {
              userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              platform: 'Web',
              browser: 'Chrome',
            },
          });
        }
      }
    }

    for (const attendance of attendanceRecords) {
      await Attendance.create(attendance);
    }

    console.log(`Created ${attendanceRecords.length} attendance records`);

    const totalRecords = await Attendance.countDocuments();
    console.log(`Total attendance records in database: ${totalRecords}`);
  } catch (error) {
    console.error('Error seeding attendance data:', error.message);
    if (error.code === 11000 || error.code === '23505') {
      console.log('Some attendance records might already exist');
    }
  } finally {
    await pool.end();
    console.log('Database connection closed');
  }
};

if (process.argv[1] === new URL(import.meta.url).pathname) {
  seedAttendance();
}

export default seedAttendance;
