// controllers/attendanceController.js
import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import mongoose from 'mongoose';

export const OFFICE_LOCATION = {
  latitude: 22.298873262930066,
  longitude: 73.13129619568713,
  radius: 100 // meters - Strict office location enforcement
}

// Shared face similarity threshold (cosine similarity).
// This is aligned with the Python face_service default and can be overridden
// via the FACE_SIMILARITY_THRESHOLD environment variable to keep behavior
// consistent across services.
const FACE_SIMILARITY_THRESHOLD = parseFloat(process.env.FACE_SIMILARITY_THRESHOLD || '0.6');


function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Helper function to get today's date range in IST
const getTodayDateRange = () => {
  const IST_OFFSET = 5.5 * 60 * 60 * 1000;
  const now = new Date();
  const nowIST = new Date(now.getTime() + IST_OFFSET);

  // Start of day in IST (midnight)
  const startOfDayIST = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate()));
  // Subtract the offset to get the UTC time for start of day in IST
  const startOfDay = new Date(startOfDayIST.getTime() - IST_OFFSET);

  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  console.log('IST Range calculation:', {
    now: now.toISOString(),
    nowIST: nowIST.toISOString(),
    startOfDayIST: startOfDayIST.toISOString(),
    startOfDayUTC: startOfDay.toISOString(),
    endOfDayUTC: endOfDay.toISOString()
  });

  return { startOfDay, endOfDay };
};

// @desc    Mark attendance (Check In) - REQUIRES FACE VERIFICATION
// @route   POST /api/attendance/checkin
// @access  Private (Employee)
export const checkIn = async (req, res) => {
  try {
    const { location, deviceInfo, notes, faceVerified } = req.body;
    console.log('Check-in request:', { userId: req.user.id, location, faceVerified });

    // Note: Face verification is now optional for attendance marking

    // Validate location data
    if (!location || !location.latitude || !location.longitude) {
      return res.status(400).json({
        success: false,
        message: 'Location data is required for attendance'
      });
    }

    // Validate location within office radius
    const distance = calculateDistance(
      location.latitude,
      location.longitude,
      OFFICE_LOCATION.latitude,
      OFFICE_LOCATION.longitude
    );

    if (distance > OFFICE_LOCATION.radius) {
      return res.status(400).json({
        success: false,
        message: `You are not within office premises (Distance: ${Math.round(distance)}m)`
      });
    }

    // Get employee record
    const employee = await Employee.findOne({ user: req.user.id });
    if (!employee) {
      console.log('Employee not found for user:', req.user.id);
      return res.status(404).json({
        success: false,
        message: 'Employee record not found'
      });
    }

    console.log('Employee found:', employee._id);

    // Check if attendance already marked for today
    const { startOfDay, endOfDay } = getTodayDateRange();
    console.log('Checking attendance for date range:', { startOfDay, endOfDay });

    const existingAttendance = await Attendance.findOne({
      employee: employee._id,
      $or: [
        {
          date: {
            $gte: startOfDay,
            $lte: endOfDay
          }
        },
        {
          checkInTime: {
            $gte: startOfDay,
            $lte: endOfDay
          }
        }
      ]
    });

    if (existingAttendance) {
      console.log('Existing attendance found:', existingAttendance);
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for today',
        data: existingAttendance
      });
    }

    // Create attendance record
    const checkInTime = new Date();
    const localDate = new Date(checkInTime.toISOString().split('T')[0] + 'T00:00:00Z');

    // Handle address - it might be an object or a string
    let addressString = '';
    if (location.address) {
      if (typeof location.address === 'object') {
        addressString = location.address.address || `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
      } else {
        addressString = location.address;
      }
    }

    const attendance = new Attendance({
      employee: employee._id,
      user: req.user.id,
      checkInTime: checkInTime,
      date: localDate,
      checkInLocation: {
        latitude: location.latitude,
        longitude: location.longitude,
        address: addressString,
        accuracy: location.accuracy || 0
      },
      notes: notes || '',
      ipAddress: req.ip,
      deviceInfo: deviceInfo || {
        userAgent: req.headers['user-agent'],
        platform: 'Web',
        browser: 'Unknown'
      }
    });

    console.log('Creating attendance record:', {
      employee: employee._id,
      date: localDate,
      checkInTime: checkInTime
    });

    await attendance.save();
    console.log('Attendance saved successfully:', attendance._id);

    // Send notification to admins about employee check-in
    try {
      const adminUsers = await User.find({ role: 'admin', isActive: true });
      console.log(`Found ${adminUsers.length} active admin users for check-in notification`);

      if (adminUsers.length > 0) {
        const employeeName = `${employee.personalInfo?.firstName || 'Employee'} ${employee.personalInfo?.lastName || ''}`.trim();

        const notification = await Notification.createNotification({
          title: 'Employee Check-in',
          message: `${employeeName} has checked in for work`,
          type: 'info',
          category: 'attendance',
          targetUsers: adminUsers.map(admin => admin._id),
          sender: req.user.id,
          priority: 'medium',
          relatedEntity: {
            model: 'Attendance',
            id: attendance._id
          },
          metadata: {
            employeeName: employeeName,
            checkInTime: checkInTime,
            location: location.address || 'Office Location',
            employeeId: employee.employeeId
          }
        });

        console.log(`✅ Check-in notification sent successfully to ${adminUsers.length} admins`);
        console.log('Notification details:', {
          id: notification._id,
          title: notification.title,
          targetUsersCount: notification.targetUsers.length
        });
      } else {
        console.warn('⚠️ No active admin users found for check-in notification');
      }
    } catch (notificationError) {
      console.error('❌ Error sending check-in notification:', notificationError);
      console.error('Notification error details:', {
        message: notificationError.message,
        stack: notificationError.stack
      });
      // Don't fail the check-in if notification fails
    }

    // Populate employee and user data
    await attendance.populate([
      { path: 'employee', select: 'personalInfo workInfo' },
      { path: 'user', select: 'name email employeeId' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully',
      data: attendance
    });

  } catch (error) {
    console.error('Check-in error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for today'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while marking attendance',
      error: error.message
    });
  }
};

// @desc    Mark checkout
// @route   PUT /api/attendance/checkout
// @access  Private (Employee)
// Replace your checkOut function with this exact version
export const checkOut = async (req, res) => {
  try {
    const { location, notes } = req.body;

    console.log('=== CHECKOUT DEBUG START ===');
    console.log('User ID:', req.user.id);

    // Validate location data
    if (!location || !location.latitude || !location.longitude) {
      console.log('ERROR: Missing location data');
      return res.status(400).json({
        success: false,
        message: 'Location data is required for checkout'
      });
    }

    // Validate location within office radius
    const distance = calculateDistance(
      location.latitude,
      location.longitude,
      OFFICE_LOCATION.latitude,
      OFFICE_LOCATION.longitude
    );

    if (distance > OFFICE_LOCATION.radius) {
      return res.status(400).json({
        success: false,
        message: `You are not within office premises (Distance: ${Math.round(distance)}m)`
      });
    }

    // Get employee record
    const employee = await Employee.findOne({ user: req.user.id });
    console.log('Employee found:', employee ? employee._id : 'NOT FOUND');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found'
      });
    }
    // ✅ NOW SAFE TO USE employee._id
    console.log('=== DEBUG: All attendance records ===');
    const allRecords = await Attendance.find({ employee: employee._id }).sort({ checkInTime: -1 });
    allRecords.forEach(r => {
      console.log(`ID: ${r._id}, CheckIn: ${r.checkInTime}, CheckOut: ${r.checkOutTime}, Date: ${r.date}`);
    });

    console.log('=== TRYING MULTIPLE STRATEGIES TO FIND ATTENDANCE ===');

    // Strategy 1: Find most recent attendance without checkout (simplest approach)
    let attendance = await Attendance.findOne({
      employee: employee._id,
      $or: [
        { checkOutTime: { $exists: false } },
        { checkOutTime: null }
      ]
    }).sort({ checkInTime: -1 });

    console.log('Strategy 1 (Most recent without checkout):', attendance ? attendance._id : 'NOT FOUND');

    // Strategy 2: Find by today's date if Strategy 1 fails
    if (!attendance) {
      const { startOfDay, endOfDay } = getTodayDateRange(); // ✅ Use consistent UTC range

      attendance = await Attendance.findOne({
        employee: employee._id,
        checkInTime: {
          $gte: startOfDay,
          $lt: endOfDay
        },
        checkOutTime: { $exists: false }
      });
    }

    // Strategy 3: Search within last 24 hours if still not found
    if (!attendance) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      attendance = await Attendance.findOne({
        employee: employee._id,
        checkInTime: { $gte: twentyFourHoursAgo },
        checkOutTime: { $exists: false }
      }).sort({ checkInTime: -1 });

      console.log('Strategy 3 (Last 24 hours):', attendance ? attendance._id : 'NOT FOUND');
    }

    // If still no attendance found, provide detailed debugging
    if (!attendance) {
      console.log('=== NO ATTENDANCE FOUND - FULL DEBUG ===');

      // Get ALL records for this employee
      const allEmployeeRecords = await Attendance.find({
        employee: employee._id
      }).sort({ checkInTime: -1 }).limit(5);

      console.log('All employee records (last 5):');
      allEmployeeRecords.forEach((record, index) => {
        console.log(`${index + 1}:`, {
          id: record._id.toString(),
          date: record.date,
          checkInTime: record.checkInTime,
          hasCheckOut: !!record.checkOutTime,
          checkOutTime: record.checkOutTime
        });
      });

      return res.status(404).json({
        success: false,
        message: 'No check-in record found for checkout',
        debug: {
          employeeId: employee._id,
          userId: req.user.id,
          totalRecords: allEmployeeRecords.length,
          recentRecords: allEmployeeRecords.map(r => ({
            id: r._id.toString(),
            date: r.date,
            checkInTime: r.checkInTime,
            hasCheckOut: !!r.checkOutTime
          }))
        }
      });
    }

    console.log('=== FOUND ATTENDANCE RECORD ===');
    console.log('Attendance ID:', attendance._id);
    console.log('Check-in time:', attendance.checkInTime);
    console.log('Current checkout status:', !!attendance.checkOutTime);

    // Check if already checked out
    if (attendance.checkOutTime) {
      return res.status(400).json({
        success: false,
        message: 'Already checked out for this session',
        data: attendance
      });
    }

    // Perform checkout
    const checkOutTime = new Date();
    attendance.checkOutTime = checkOutTime;

    // Handle address - it might be an object or a string
    let checkoutAddressString = '';
    if (location.address) {
      if (typeof location.address === 'object') {
        checkoutAddressString = location.address.address || `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
      } else {
        checkoutAddressString = location.address;
      }
    }

    attendance.checkOutLocation = {
      latitude: location.latitude,
      longitude: location.longitude,
      address: checkoutAddressString,
      accuracy: location.accuracy || 0
    };

    // Calculate working hours in minutes
    const timeDiff = checkOutTime - attendance.checkInTime;
    const workingMinutes = Math.round(timeDiff / (1000 * 60));
    attendance.workingHours = workingMinutes;

    console.log('Working time calculated:', workingMinutes, 'minutes');

    if (notes) {
      attendance.notes = attendance.notes ?
        `${attendance.notes}. Checkout: ${notes}` :
        `Checkout: ${notes}`;
    }

    // Save the record
    await attendance.save();
    console.log('Attendance saved successfully');

    // Send notification to admins about employee check-out
    try {
      const adminUsers = await User.find({ role: 'admin', isActive: true });
      console.log(`Found ${adminUsers.length} active admin users for check-out notification`);

      if (adminUsers.length > 0) {
        const employeeName = `${employee.personalInfo?.firstName || 'Employee'} ${employee.personalInfo?.lastName || ''}`.trim();

        const notification = await Notification.createNotification({
          title: 'Employee Check-out',
          message: `${employeeName} has checked out from work`,
          type: 'info',
          category: 'attendance',
          targetUsers: adminUsers.map(admin => admin._id),
          sender: req.user.id,
          priority: 'medium',
          relatedEntity: {
            model: 'Attendance',
            id: attendance._id
          },
          metadata: {
            employeeName: employeeName,
            checkOutTime: checkOutTime,
            workingHours: workingMinutes,
            location: location.address || 'Office Location',
            employeeId: employee.employeeId
          }
        });

        console.log(`✅ Check-out notification sent successfully to ${adminUsers.length} admins`);
        console.log('Notification details:', {
          id: notification._id,
          title: notification.title,
          targetUsersCount: notification.targetUsers.length
        });
      } else {
        console.warn('⚠️ No active admin users found for check-out notification');
      }
    } catch (notificationError) {
      console.error('❌ Error sending check-out notification:', notificationError);
      console.error('Notification error details:', {
        message: notificationError.message,
        stack: notificationError.stack
      });
      // Don't fail the check-out if notification fails
    }

    // Populate for response
    await attendance.populate([
      { path: 'employee', select: 'personalInfo workInfo' },
      { path: 'user', select: 'name email employeeId' }
    ]);

    const workingTimeFormatted = attendance.getWorkingTime();
    console.log('Working time formatted:', workingTimeFormatted);

    console.log('=== CHECKOUT SUCCESS ===');

    res.json({
      success: true,
      message: 'Checkout marked successfully',
      data: attendance,
      workingTime: workingTimeFormatted
    });

  } catch (error) {
    console.error('=== CHECKOUT ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    res.status(500).json({
      success: false,
      message: 'Server error while marking checkout',
      error: error.message
    });
  }
};

// @desc    Combined face and location validation for attendance
// @route   POST /api/attendance/checkin-with-face
// @access  Private (Employee)
export const checkInWithFace = async (req, res) => {
  try {
    const { faceDescriptor, location, deviceInfo, notes } = req.body;
    console.log('Combined check-in request:', { userId: req.user.id, hasFaceDescriptor: !!faceDescriptor, hasLocation: !!location });

    // Validate input data
    if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length !== 512) {
      return res.status(400).json({
        success: false,
        message: 'Invalid face descriptor. Must be array of 512 numbers.',
        validation: {
          face: false,
          location: false
        },
        errors: ['Face descriptor is required and must be valid']
      });
    }

    if (!location || !location.latitude || !location.longitude) {
      return res.status(400).json({
        success: false,
        message: 'Location data is required for attendance',
        validation: {
          face: false,
          location: false
        },
        errors: ['Location data is required']
      });
    }

    // Get employee record
    const employee = await Employee.findOne({ user: req.user.id });
    if (!employee) {
      console.log('Employee not found for user:', req.user.id);
      return res.status(404).json({
        success: false,
        message: 'Employee record not found',
        validation: {
          face: false,
          location: false
        },
        errors: ['Employee record not found']
      });
    }

    console.log('Employee found:', employee._id);

    // Check if employee has registered face
    if (!employee.hasFaceRegistered || !employee.faceDescriptor) {
      return res.status(400).json({
        success: false,
        message: 'No face registered for this employee. Please register your face first.',
        validation: {
          face: false,
          location: false
        },
        errors: ['Face not registered for this employee']
      });
    }

    // Step 1: Validate location
    const distance = calculateDistance(
      location.latitude,
      location.longitude,
      OFFICE_LOCATION.latitude,
      OFFICE_LOCATION.longitude
    );

    const locationValid = distance <= OFFICE_LOCATION.radius;
    console.log('Location validation:', { distance: Math.round(distance), radius: OFFICE_LOCATION.radius, valid: locationValid });

    if (!locationValid) {
      return res.status(400).json({
        success: false,
        message: `You are not within office premises (Distance: ${Math.round(distance)}m, Required: ${OFFICE_LOCATION.radius}m)`,
        validation: {
          face: false,
          location: false
        },
        errors: [`Location validation failed: Distance ${Math.round(distance)}m exceeds office radius ${OFFICE_LOCATION.radius}m`]
      });
    }

    // Step 2: Verify face
    const registeredDescriptor = employee.faceDescriptor;
    const currentDescriptor = faceDescriptor;

    // Cosine similarity
    const dotProduct = registeredDescriptor.reduce((sum, val, i) => sum + val * currentDescriptor[i], 0);
    const mag1 = Math.sqrt(registeredDescriptor.reduce((sum, val) => sum + val * val, 0));
    const mag2 = Math.sqrt(currentDescriptor.reduce((sum, val) => sum + val * val, 0));
    const similarity = dotProduct / (mag1 * mag2);

    // Shared threshold for cosine similarity (higher = stricter).
    // Kept in sync with the FACE_SIMILARITY_THRESHOLD used by the
    // Python face_service for consistent behaviour across flows.
    const threshold = FACE_SIMILARITY_THRESHOLD;
    const faceMatch = similarity > threshold;

    console.log('Face verification result:', {
      userId: req.user.id,
      similarity: similarity.toFixed(4),
      threshold,
      match: faceMatch
    });

    if (!faceMatch) {
      return res.status(400).json({
        success: false,
        message: `Face not recognized. Similarity: ${similarity.toFixed(4)} (Required: >${threshold})`,
        validation: {
          face: false,
          location: true
        },
        errors: [`Face verification failed: Similarity ${similarity.toFixed(4)} below threshold ${threshold}`]
      });
    }

    // Step 3: Both validations passed - check if attendance already marked for today
    const { startOfDay, endOfDay } = getTodayDateRange();
    console.log('Checking attendance for date range:', { startOfDay, endOfDay });

    const existingAttendance = await Attendance.findOne({
      employee: employee._id,
      $or: [
        {
          date: {
            $gte: startOfDay,
            $lte: endOfDay
          }
        },
        {
          checkInTime: {
            $gte: startOfDay,
            $lte: endOfDay
          }
        }
      ]
    });

    if (existingAttendance) {
      console.log('Existing attendance found:', existingAttendance);
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for today',
        validation: {
          face: true,
          location: true
        },
        errors: ['Attendance already marked for today'],
        data: existingAttendance
      });
    }

    // Step 4: Create attendance record
    const checkInTime = new Date();
    const localDate = new Date(checkInTime.toISOString().split('T')[0] + 'T00:00:00Z');

    // Handle address - it might be an object or a string
    let faceAddressString = '';
    if (location.address) {
      if (typeof location.address === 'object') {
        faceAddressString = location.address.address || `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
      } else {
        faceAddressString = location.address;
      }
    }

    const attendance = new Attendance({
      employee: employee._id,
      user: req.user.id,
      checkInTime: checkInTime,
      date: localDate,
      checkInLocation: {
        latitude: location.latitude,
        longitude: location.longitude,
        address: faceAddressString,
        accuracy: location.accuracy || 0
      },
      notes: notes || 'Check-in via web application with dual face and location verification',
      ipAddress: req.ip,
      deviceInfo: deviceInfo || {
        userAgent: req.headers['user-agent'],
        platform: 'Web',
        browser: 'Unknown'
      },
      // Add metadata about dual validation
      validationMethod: 'face_and_location',
      faceVerification: {
        similarity: similarity.toFixed(4),
        threshold,
        verifiedAt: checkInTime
      }
    });

    console.log('Creating attendance record with dual validation:', {
      employee: employee._id,
      date: localDate,
      checkInTime: checkInTime,
      validationMethod: 'face_and_location'
    });

    await attendance.save();
    console.log('Attendance saved successfully:', attendance._id);

    // Populate employee and user data
    await attendance.populate([
      { path: 'employee', select: 'personalInfo workInfo' },
      { path: 'user', select: 'name email employeeId' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully with dual validation',
      data: attendance,
      validation: {
        face: true,
        location: true
      },
      details: {
        faceSimilarity: similarity.toFixed(4),
        locationDistance: Math.round(distance),
        officeRadius: OFFICE_LOCATION.radius
      }
    });

  } catch (error) {
    console.error('Combined check-in error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for today',
        validation: {
          face: false,
          location: false
        },
        errors: ['Attendance already marked for today']
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while marking attendance with dual validation',
      validation: {
        face: false,
        location: false
      },
      errors: [error.message]
    });
  }
};

// @desc    Verify face for attendance
// @route   POST /api/attendance/verify-face
// @access  Private (Employee)
export const verifyFace = async (req, res) => {
  try {
    const { faceDescriptor } = req.body;

    // Validate input - face-api.js uses 128 dimensions
    if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
      return res.status(400).json({
        success: false,
        message: `Invalid face descriptor. Must be array of 128 numbers (received ${faceDescriptor?.length || 0}).`
      });
    }

    // Get employee record
    const employee = await Employee.findOne({ user: req.user.id });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found'
      });
    }

    // Check if employee has registered face
    if (!employee.hasFaceRegistered || !employee.faceDescriptor) {
      return res.status(400).json({
        success: false,
        message: 'No face registered for this employee'
      });
    }

    // Calculate similarity (cosine similarity)
    const registeredDescriptor = employee.faceDescriptor;
    const currentDescriptor = faceDescriptor;

    // Cosine similarity
    const dotProduct = registeredDescriptor.reduce((sum, val, i) => sum + val * currentDescriptor[i], 0);
    const mag1 = Math.sqrt(registeredDescriptor.reduce((sum, val) => sum + val * val, 0));
    const mag2 = Math.sqrt(currentDescriptor.reduce((sum, val) => sum + val * val, 0));
    const similarity = dotProduct / (mag1 * mag2);

    // Shared threshold for cosine similarity (higher = stricter).
    // Kept in sync with the FACE_SIMILARITY_THRESHOLD used by the
    // Python face_service for consistent behaviour across flows.
    const threshold = FACE_SIMILARITY_THRESHOLD;
    const match = similarity > threshold;

    console.log('Face verification result:', {
      userId: req.user.id,
      similarity: similarity.toFixed(4),
      threshold,
      match
    });

    res.json({
      success: true,
      match,
      similarity: similarity.toFixed(4)
    });

  } catch (error) {
    console.error('Face verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during face verification',
      error: error.message
    });
  }
};
// @desc    Get today's attendance status
// @route   GET /api/attendance/today
// @access  Private (Employee)
export const getTodayAttendance = async (req, res) => {
  try {
    console.log('Getting today attendance for employee:', req.employee._id);

    const { startOfDay, endOfDay } = getTodayDateRange();
    console.log('Date range for today:', { startOfDay, endOfDay });

    // Try multiple query strategies
    let attendance = await Attendance.findOne({
      employee: req.employee._id,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).populate([
      { path: 'employee', select: 'personalInfo workInfo' },
      { path: 'user', select: 'name email employeeId' }
    ]);

    if (!attendance) {
      attendance = await Attendance.findOne({
        employee: req.employee._id,
        checkInTime: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      }).populate([
        { path: 'employee', select: 'personalInfo workInfo' },
        { path: 'user', select: 'name email employeeId' }
      ]);
    }

    console.log('Found attendance:', attendance ? attendance._id : 'none');

    res.json({
      success: true,
      data: attendance,
      hasCheckedIn: !!attendance,
      hasCheckedOut: !!(attendance && attendance.checkOutTime),
      workingTime: attendance ? attendance.getWorkingTime() : null
    });

  } catch (error) {
    console.error('Get today attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching today\'s attendance',
      error: error.message
    });
  }
};

// Keep all other functions the same as the previous fixed version
// ... (getAllAttendance, getAttendanceSummary, etc.)

export const getAttendanceHistory = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 10 } = req.query;

    // Build date filter
    let dateFilter = { employee: req.employee._id };

    if (startDate && endDate) {
      dateFilter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      // Default to current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      dateFilter.date = { $gte: startOfMonth, $lte: endOfMonth };
    }

    // Get paginated attendance records
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const attendance = await Attendance.find(dateFilter)
      .populate('employee', 'personalInfo workInfo')
      .populate('user', 'name email employeeId')
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Get total count for pagination
    const total = await Attendance.countDocuments(dateFilter);

    // Get attendance summary
    const summaryDateRange = startDate && endDate ?
      { $gte: new Date(startDate), $lte: new Date(endDate) } :
      dateFilter.date;

    const summary = await Attendance.getAttendanceSummary(
      req.employee._id,
      summaryDateRange.$gte,
      summaryDateRange.$lte
    );

    res.json({
      success: true,
      data: attendance,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      },
      summary: summary[0] || {
        totalDays: 0,
        presentDays: 0,
        lateDays: 0,
        halfDays: 0,
        totalWorkingMinutes: 0
      }
    });

  } catch (error) {
    console.error('Get attendance history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching attendance history'
    });
  }
};

export const getAllAttendance = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const {
      startDate,
      endDate,
      employeeId,
      department,
      status,
      page = 1,
      limit = 20,
      search
    } = req.query;

    // Build filter
    let filter = {};

    // Date filter - use proper date range
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      filter.date = {
        $gte: start,
        $lte: end
      };
    } else {
      // Default to current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      filter.date = { $gte: startOfMonth, $lte: endOfMonth };
    }

    // Employee filter
    if (employeeId) {
      filter.employee = new mongoose.Types.ObjectId(employeeId);
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Build aggregation pipeline
    let pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'employees',
          localField: 'employee',
          foreignField: '_id',
          as: 'employeeData'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userData'
        }
      },
      { $unwind: '$employeeData' },
      { $unwind: '$userData' }
    ];

    // Department filter
    if (department) {
      pipeline.push({
        $match: {
          'employeeData.workInfo.department': department
        }
      });
    }

    // Search filter
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { 'employeeData.personalInfo.firstName': { $regex: search, $options: 'i' } },
            { 'employeeData.personalInfo.lastName': { $regex: search, $options: 'i' } },
            { 'userData.employeeId': { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    // Add sorting
    pipeline.push({ $sort: { date: -1, checkInTime: -1 } });

    // Get total count
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await Attendance.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Add pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    pipeline.push(
      { $skip: skip },
      { $limit: parseInt(limit) }
    );

    // Execute aggregation
    const attendance = await Attendance.aggregate(pipeline);

    // Get statistics
    const stats = await Attendance.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          presentCount: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
          lateCount: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
          halfDayCount: { $sum: { $cond: [{ $eq: ['$status', 'Half Day'] }, 1, 0] } },
          avgWorkingHours: { $avg: '$workingHours' }
        }
      }
    ]);

    res.json({
      success: true,
      data: attendance,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      },
      statistics: stats[0] || {
        totalRecords: 0,
        presentCount: 0,
        lateCount: 0,
        halfDayCount: 0,
        avgWorkingHours: 0
      }
    });

  } catch (error) {
    console.error('Get all attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching attendance records'
    });
  }
};

export const getAttendanceSummary = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();

    // Get start and end of the target date
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    console.log('Getting attendance summary for:', { startOfDay, endOfDay });

    // Get today's attendance summary
    const todayStats = await Attendance.aggregate([
      {
        $match: {
          date: {
            $gte: startOfDay,
            $lt: endOfDay
          }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('Today stats:', todayStats);

    // Get total active employees
    const totalEmployees = await Employee.countDocuments({
      $or: [
        { status: 'Active' },
        { status: { $exists: false } }
      ]
    });

    console.log('Total employees:', totalEmployees);

    // Format stats
    const stats = {
      totalEmployees,
      present: 0,
      late: 0,
      halfDay: 0,
      absent: 0,
      workFromHome: 0
    };

    todayStats.forEach(stat => {
      switch (stat._id) {
        case 'Present':
          stats.present = stat.count;
          break;
        case 'Late':
          stats.late = stat.count;
          break;
        case 'Half Day':
          stats.halfDay = stat.count;
          break;
        case 'Work from Home':
          stats.workFromHome = stat.count;
          break;
      }
    });

    // Calculate absent employees
    const totalPresent = stats.present + stats.late + stats.halfDay + stats.workFromHome;
    stats.absent = Math.max(0, totalEmployees - totalPresent);

    // Get department-wise attendance
    const departmentStats = await Attendance.aggregate([
      {
        $match: {
          date: {
            $gte: startOfDay,
            $lt: endOfDay
          }
        }
      },
      {
        $lookup: {
          from: 'employees',
          localField: 'employee',
          foreignField: '_id',
          as: 'employeeData'
        }
      },
      { $unwind: '$employeeData' },
      {
        $group: {
          _id: '$employeeData.workInfo.department',
          present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
          total: { $sum: 1 }
        }
      }
    ]);

    console.log('Final stats:', stats);

    res.json({
      success: true,
      data: {
        date: targetDate,
        overallStats: stats,
        departmentStats
      }
    });

  } catch (error) {
    console.error('Get attendance summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching attendance summary'
    });
  }
};

export const updateAttendance = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { id } = req.params;
    const { status, notes, isManualEntry, manualEntryReason } = req.body;

    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    // Update fields
    if (status) attendance.status = status;
    if (notes) attendance.notes = notes;
    if (isManualEntry !== undefined) attendance.isManualEntry = isManualEntry;
    if (manualEntryReason) attendance.manualEntryReason = manualEntryReason;

    attendance.approvedBy = req.user.id;

    await attendance.save();

    // Populate and return updated record
    await attendance.populate([
      { path: 'employee', select: 'personalInfo workInfo' },
      { path: 'user', select: 'name email employeeId' },
      { path: 'approvedBy', select: 'name email' }
    ]);

    res.json({
      success: true,
      message: 'Attendance record updated successfully',
      data: attendance
    });

  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating attendance record'
    });
  }
};

export const deleteAttendance = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { id } = req.params;

    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    await attendance.deleteOne();

    res.json({
      success: true,
      message: 'Attendance record deleted successfully'
    });

  } catch (error) {
    console.error('Delete attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting attendance record'
    });
  }
};

/**
 * @desc    Get attendance statistics for the current logged-in employee
 * @route   GET /api/attendance/employee-stats
 * @access  Private (Employee)
 */
export const getEmployeeAttendanceStats = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user.id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const IST_OFFSET = 5.5 * 60 * 60 * 1000;
    const now = new Date();
    const nowIST = new Date(now.getTime() + IST_OFFSET);
    const year = nowIST.getUTCFullYear();
    const month = nowIST.getUTCMonth() + 1; // 1-indexed

    const stats = await Attendance.getMonthlyStats(year, month, employee._id);

    const summary = stats.length > 0 ? stats[0] : {
      totalDays: 0,
      presentDays: 0,
      lateDays: 0,
      halfDays: 0,
      totalWorkingHours: 0,
      avgWorkingHours: 0
    };

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching employee stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching attendance statistics'
    });
  }
};

