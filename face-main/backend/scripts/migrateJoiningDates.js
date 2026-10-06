import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import { pool, db } from '../db/index.js';
import { employees } from '../db/schema/employee.js';
import Employee from '../models/Employee.js';

dotenv.config();

/**
 * Migration script to update all existing employees' joiningDate to 1st September 2026.
 */
export const migrateJoiningDates = async () => {
  try {
    await connectDB();

    console.log('🔄 Starting migration: Setting all existing employees joining date to 1st September 2026...');

    const allEmployees = await Employee.find({});
    console.log(`Found ${allEmployees.length} total employees to update.`);

    if (allEmployees.length === 0) {
      console.log('No employees found to migrate.');
      return;
    }

    const TARGET_JOINING_DATE = '2026-09-01T00:00:00.000Z';
    let updatedCount = 0;

    for (const emp of allEmployees) {
      const updatedWorkInfo = {
        ...(emp.workInfo || {}),
        joiningDate: TARGET_JOINING_DATE,
      };

      emp.workInfo = updatedWorkInfo;
      await emp.save();
      updatedCount++;

      const empName = emp.personalInfo?.firstName
        ? `${emp.personalInfo.firstName} ${emp.personalInfo.lastName || ''}`.trim()
        : emp.employeeId || emp._id;

      console.log(`✅ [${updatedCount}/${allEmployees.length}] Updated ${empName} (${emp.employeeId || emp._id}) joining date -> ${TARGET_JOINING_DATE}`);
    }

    console.log(`🎉 Migration successfully completed: ${updatedCount} employees updated to joining date ${TARGET_JOINING_DATE}`);
  } catch (error) {
    console.error('❌ Error running joining date migration:', error);
    throw error;
  } finally {
    await pool.end();
    console.log('Database connection pool closed.');
  }
};

migrateJoiningDates().catch((err) => {
  console.error(err);
  process.exit(1);
});

export default migrateJoiningDates;
