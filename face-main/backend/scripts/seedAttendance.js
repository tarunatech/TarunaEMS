import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';

// Load environment variables
dotenv.config();

const seedAttendance = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Get all employees
    const employees = await Employee.find({}).populate('user');
    console.log(`Found ${employees.length} employees`);

    if (employees.length === 0) {
      console.log('No employees found. Please create some employees first.');
      return;
    }

    // Create sample attendance records for the last 7 days
    const attendanceRecords = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      // Create attendance for each employee
      for (const employee of employees) {
        // Randomly decide if employee was present (80% chance)
        const isPresent = Math.random() < 0.8;

        if (isPresent) {
          const checkInTime = new Date(date);
          checkInTime.setHours(9 + Math.floor(Math.random() * 2), // 9-10 AM
                              Math.floor(Math.random() * 60), 0, 0);

          const checkOutTime = new Date(date);
          checkOutTime.setHours(17 + Math.floor(Math.random() * 2), // 5-6 PM
                               Math.floor(Math.random() * 60), 0, 0);

          // Calculate working hours
          const timeDiff = checkOutTime - checkInTime;
          const workingMinutes = Math.round(timeDiff / (1000 * 60));

          // Determine status
          let status = 'Present';
          let isLate = false;
          let lateMinutes = 0;

          const standardTime = new Date(date);
          standardTime.setHours(9, 0, 0, 0);

          if (checkInTime > standardTime) {
            isLate = true;
            lateMinutes = Math.round((checkInTime - standardTime) / (1000 * 60));

            if (lateMinutes > 240) {
              status = 'Half Day';
            } else if (lateMinutes > 30) {
              status = 'Late';
            }
          }

          const attendance = {
            employee: employee._id,
            user: employee.user._id,
            date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
            checkInTime,
            checkOutTime,
            checkInLocation: {
              latitude: 22.29269924053806 + (Math.random() - 0.5) * 0.01,
              longitude: 73.12228427139301 + (Math.random() - 0.5) * 0.01,
              address: 'Office Location',
              accuracy: 10 + Math.random() * 20
            },
            checkOutLocation: {
              latitude: 22.29269924053806 + (Math.random() - 0.5) * 0.01,
              longitude: 73.12228427139301 + (Math.random() - 0.5) * 0.01,
              address: 'Office Location',
              accuracy: 10 + Math.random() * 20
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
              browser: 'Chrome'
            }
          };

          attendanceRecords.push(attendance);
        }
      }
    }

    // Insert attendance records
    if (attendanceRecords.length > 0) {
      await Attendance.insertMany(attendanceRecords);
      console.log(`✅ Created ${attendanceRecords.length} attendance records`);
    } else {
      console.log('No attendance records to create');
    }

    // Show summary
    const totalRecords = await Attendance.countDocuments();
    console.log(`Total attendance records in database: ${totalRecords}`);

  } catch (error) {
    console.error('❌ Error seeding attendance data:', error.message);
    if (error.code === 11000) {
      console.log('Some attendance records might already exist');
    }
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run seeding if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  seedAttendance();
}

export default seedAttendance;