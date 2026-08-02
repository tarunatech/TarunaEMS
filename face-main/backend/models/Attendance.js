// models/Attendance.js
import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: function () {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
  },
  checkInTime: {
    type: Date,
    required: true
  },
  checkOutTime: {
    type: Date,
    // default: null
  },

  checkInLocation: {
    type: {
      latitude: {
        type: Number,
        required: true
      },
      longitude: {
        type: Number,
        required: true
      },
      address: {
        type: String,
        default: ''
      },
      accuracy: {
        type: Number,
        default: 0
      }
    },

    required: true
  },
  checkOutLocation: {
    type: {
      latitude: {
        type: Number
      },
      longitude: {
        type: Number
      },
      address: {
        type: String,
        default: ''
      },
      accuracy: {
        type: Number,
        default: 0
      }
    },
    default: null
  },
  workingHours: {
    type: Number,
    default: 0 // in minutes
  },
  status: {
    type: String,
    enum: ['Present', 'Late', 'Half Day', 'Absent', 'Work from Home'],
    default: 'Present'
  },
  isLate: {
    type: Boolean,
    default: false
  },
  lateMinutes: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    default: ''
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  ipAddress: {
    type: String,
    default: ''
  },
  deviceInfo: {
    userAgent: String,
    platform: String,
    browser: String
  },
  isManualEntry: {
    type: Boolean,
    default: false
  },
  manualEntryReason: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Create indexes - avoid duplicates by only defining them once here
attendanceSchema.index({ user: 1, date: 1 });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ checkInTime: 1 });

// Compound unique index to prevent duplicate attendance for same day
attendanceSchema.index(
  { employee: 1, date: 1 },
  {
    unique: true,
    partialFilterExpression: { date: { $type: "date" } }
  }
);

// Pre-save middleware to set date to start of day and calculate working hours
attendanceSchema.pre('save', function (next) {
  const IST_OFFSET = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in ms

  // Ensure date is set to start of day (midnight) in IST based on checkInTime
  if (this.checkInTime && this.isNew) {
    const checkInIST = new Date(this.checkInTime.getTime() + IST_OFFSET);
    this.date = new Date(Date.UTC(checkInIST.getUTCFullYear(), checkInIST.getUTCMonth(), checkInIST.getUTCDate()));
  }

  // Calculate working hours if both check-in and check-out exist
  if (this.checkInTime && this.checkOutTime) {
    const timeDiff = this.checkOutTime - this.checkInTime;
    this.workingHours = Math.round(timeDiff / (1000 * 60)); // Convert to minutes
  }

  // Check if employee is late (using 10:00 AM IST as standard time)
  if (this.checkInTime && (this.isNew || this.isModified('checkInTime'))) {
    const checkInIST = new Date(this.checkInTime.getTime() + IST_OFFSET);

    // Create 10:00 AM IST threshold for the same day
    const standardTimeIST = new Date(this.checkInTime.getTime() + IST_OFFSET);
    standardTimeIST.setUTCHours(10, 0, 0, 0);

    if (checkInIST > standardTimeIST) {
      this.isLate = true;
      this.lateMinutes = Math.round((checkInIST - standardTimeIST) / (1000 * 60));

      // Set status based on how late
      if (this.lateMinutes > 240) { // More than 4 hours late
        this.status = 'Half Day';
      } else {
        this.status = 'Late';
      }
    } else {
      this.isLate = false;
      this.lateMinutes = 0;
      this.status = 'Present';
    }
  }

  // Note: Early departure can be checked on checkout update
  if (this.checkOutTime && this.isModified('checkOutTime')) {
    const checkOutIST = new Date(this.checkOutTime.getTime() + IST_OFFSET);
    const standardExitTimeIST = new Date(this.checkOutTime.getTime() + IST_OFFSET);
    standardExitTimeIST.setUTCHours(19, 0, 0, 0); // 7:00 PM IST

    if (checkOutIST < standardExitTimeIST) {
      // Logic for early departure can be added here if needed, 
      // e.g., modifying status or adding a flag
      this.notes = (this.notes || '') + (this.notes ? '. ' : '') + 'Early departure before 7:00 PM IST.';
    }
  }

  next();
});

// Instance method to calculate total working time with better formatting
attendanceSchema.methods.getWorkingTime = function () {
  if (!this.checkOutTime || !this.workingHours) {
    return {
      hours: 0,
      minutes: 0,
      total: '00:00',
      totalMinutes: 0
    };
  }

  const hours = Math.floor(this.workingHours / 60);
  const minutes = this.workingHours % 60;

  return {
    hours,
    minutes,
    total: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
    totalMinutes: this.workingHours
  };
};

// Static method to get attendance summary for a date range
attendanceSchema.statics.getAttendanceSummary = async function (employeeId, startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999); // Include the entire end date

  return await this.aggregate([
    {
      $match: {
        employee: new mongoose.Types.ObjectId(employeeId),
        date: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: null,
        totalDays: { $sum: 1 },
        presentDays: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $eq: ['$status', 'Present'] },
                  { $eq: ['$status', 'Late'] }
                ]
              },
              1,
              0
            ]
          }
        },
        lateDays: {
          $sum: {
            $cond: [{ $eq: ['$status', 'Late'] }, 1, 0]
          }
        },
        halfDays: {
          $sum: {
            $cond: [{ $eq: ['$status', 'Half Day'] }, 1, 0]
          }
        },
        totalWorkingMinutes: { $sum: '$workingHours' },
        avgCheckInTime: { $avg: '$checkInTime' }
      }
    }
  ]);
};

// Static method to check if attendance exists for today
attendanceSchema.statics.getTodayAttendance = async function (employeeId) {
  const IST_OFFSET = 5.5 * 60 * 60 * 1000;
  const now = new Date();
  const nowIST = new Date(now.getTime() + IST_OFFSET);

  // Start of day in IST (midnight)
  const startOfDayIST = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate()));
  // Subtract the offset to get the UTC time for start of day in IST
  const startOfDayUTC = new Date(startOfDayIST.getTime() - IST_OFFSET);
  const endOfDayUTC = new Date(startOfDayUTC.getTime() + 24 * 60 * 60 * 1000);

  return await this.findOne({
    employee: employeeId,
    date: { $gte: startOfDayUTC, $lt: endOfDayUTC }
  }).populate([
    { path: 'employee', select: 'personalInfo workInfo' },
    { path: 'user', select: 'name email employeeId' }
  ]);
};

// Static method to get monthly attendance statistics
attendanceSchema.statics.getMonthlyStats = async function (year, month, employeeId = null) {
  const IST_OFFSET = 5.5 * 60 * 60 * 1000;
  const startOfMonthIST = new Date(Date.UTC(year, month - 1, 1));
  const endOfMonthIST = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const startOfMonthUTC = new Date(startOfMonthIST.getTime() - IST_OFFSET);
  const endOfMonthUTC = new Date(endOfMonthIST.getTime() - IST_OFFSET);

  const matchCondition = {
    date: { $gte: startOfMonthUTC, $lte: endOfMonthUTC }
  };

  if (employeeId) {
    matchCondition.employee = new mongoose.Types.ObjectId(employeeId);
  }

  return await this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: employeeId ? '$employee' : null,
        totalDays: { $sum: 1 },
        presentDays: {
          $sum: {
            $cond: [
              { $in: ['$status', ['Present', 'Late']] },
              1,
              0
            ]
          }
        },
        lateDays: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
        halfDays: { $sum: { $cond: [{ $eq: ['$status', 'Half Day'] }, 1, 0] } },
        totalWorkingHours: { $sum: '$workingHours' },
        avgWorkingHours: { $avg: '$workingHours' }
      }
    }
  ]);
};

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;