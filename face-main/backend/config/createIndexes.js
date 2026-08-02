const createIndexes = async () => {
  try {
    // Import models for index creation
    const User = require('../models/User');
    const Employee = require('../models/Employee');
    // const Attendance = require('../models/Attendance');
    // const Leave = require('../models/Leave');

    // Create indexes
    await User.createIndexes();
    await Employee.createIndexes();
    // await Attendance.createIndexes();
    // await Leave.createIndexes();

    console.log('✅ Database indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
  }
};

module.exports = createIndexes;
