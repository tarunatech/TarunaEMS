import mongoose from 'mongoose';
import Lead from '../models/Lead.js';
import Employee from '../models/Employee.js';
import { validationResult } from 'express-validator';
import { sendEmail } from '../utils/email.js';
import { isDepartmentAllowed } from '../middleware/departmentAccess.js';

const BDE_DEPARTMENTS = [
  'bde', 
  'businessdevelopmentexecutive', 
  'sales', 
  'businessdevelopment',
  'business development',
  'business development executive',
  'bd',
  'bdexecutive',
  'salesdepartment',
  'salesteam'
];

// Create new lead - ENHANCED ERROR HANDLING
export const createLead = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
        details: errors.array().map(error => ({
          field: error.param,
          message: error.msg,
          value: error.value
        }))
      });
    }

    let leadData = { ...req.body };
    console.log('Creating lead with data:', leadData);

    // If employee is creating lead, assign to themselves
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ user: req.user.id }).populate(
        'workInfo.department',
        'name code'
      );
      if (!employee) {
        console.log('Employee not found for user:', req.user.id);
        return res.status(404).json({
          success: false,
          message: 'Employee record not found'
        });
      }
      if (!isDepartmentAllowed(employee.workInfo?.department, BDE_DEPARTMENTS)) {
        return res.status(403).json({
          success: false,
          message: 'Sales module is only available for BDE department'
        });
      }
      leadData.assignedTo = employee._id;
      console.log('Assigned lead to employee:', employee._id);
    } else {
      // For admin/manager, they need to specify assignedTo or we'll assign to them if they have an employee record
      if (!leadData.assignedTo) {
        const employee = await Employee.findOne({ user: req.user.id });
        if (employee) {
          leadData.assignedTo = employee._id;
        } else {
          // If no assignedTo specified and user has no employee record, return error
          return res.status(400).json({
            success: false,
            message: 'Please specify an employee to assign this lead to'
          });
        }
      }
    }

    // Validate assigned employee belongs to BDE
    const assignedEmployee = await Employee.findById(leadData.assignedTo).populate(
      'workInfo.department',
      'name code'
    );
    if (!assignedEmployee) {
      return res.status(400).json({
        success: false,
        message: 'Assigned employee not found'
      });
    }

    if (!isDepartmentAllowed(assignedEmployee.workInfo?.department, BDE_DEPARTMENTS)) {
      return res.status(403).json({
        success: false,
        message: 'Only BDE department employees can own leads'
      });
    }

    // Set assignedBy
    leadData.assignedBy = req.user.id;

    // Clean the data - remove empty strings and convert types
    Object.keys(leadData).forEach(key => {
      if (leadData[key] === '' || leadData[key] === null) {
        delete leadData[key];
      }
    });

    // Convert numeric fields
    if (leadData.estimatedValue !== undefined) {
      leadData.estimatedValue = Number(leadData.estimatedValue);
    }

    // Ensure dates are properly formatted
    if (leadData.expectedCloseDate) {
      leadData.expectedCloseDate = new Date(leadData.expectedCloseDate);
    }
    if (leadData.nextFollowUpDate) {
      leadData.nextFollowUpDate = new Date(leadData.nextFollowUpDate);
    }

    console.log('Final lead data before save:', leadData);

    // Check for duplicate email only for the same assigned employee
    // This allows different employees to have leads with the same email (same contact, different opportunity)
    const existingLead = await Lead.findOne({ 
      email: leadData.email,
      assignedTo: leadData.assignedTo
    });
    if (existingLead) {
      return res.status(400).json({
        success: false,
        message: 'This email is already assigned to you as a lead. Please update the existing lead or assign it to a different employee.'
      });
    }

    // Create the lead
    const lead = await Lead.create(leadData);
    console.log('Lead created successfully:', lead._id);

    // Populate the created lead
    await lead.populate('assignedTo', 'personalInfo.firstName personalInfo.lastName employeeId');
    await lead.populate('assignedBy', 'name email');

    // Add initial note if provided
    if (req.body.notes && req.body.notes.trim()) {
      lead.notes.push({
        content: req.body.notes.trim(),
        addedBy: req.user.id,
        addedAt: new Date(),
        type: 'General'
      });
      await lead.save();
    }

    res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      data: lead
    });

  } catch (error) {
    console.error('Create lead error:', error);
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      const value = error.keyValue[field];
      return res.status(400).json({
        success: false,
        message: `A lead with this ${field} (${value}) already exists`,
        field: field,
        value: value
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Lead validation failed',
        errors: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error while creating lead',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
};

// Update won lead details - ENHANCED VERSION
export const updateWonLead = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const leadId = req.params.id;
    const wonData = { ...req.body };

    console.log('Updating won lead:', leadId, wonData);

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    // Check if lead is won, if not mark it as won
    if (lead.status !== 'Won') {
      lead.status = 'Won';
      lead.actualCloseDate = new Date();
    }

    // Check permissions for employee
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ user: req.user.id }).populate(
        'workInfo.department',
        'name code'
      );
      if (!employee || lead.assignedTo.toString() !== employee._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only update your assigned leads.'
        });
      }
    }

    // Initialize wonDetails if it doesn't exist
    if (!lead.wonDetails) {
      lead.wonDetails = {};
    }
    
    // Clean and convert data
    Object.keys(wonData).forEach(key => {
      if (wonData[key] !== undefined && wonData[key] !== '') {
        // Convert numeric fields
        if (['finalValue', 'recurringRevenue', 'discount', 'contractDuration', 'satisfactionScore'].includes(key)) {
          lead.wonDetails[key] = Number(wonData[key]);
        }
        // Convert date fields
        else if (['deliveryDate', 'renewalDate'].includes(key)) {
          lead.wonDetails[key] = new Date(wonData[key]);
        }
        // String fields
        else {
          lead.wonDetails[key] = wonData[key];
        }
      }
    });

    // Mark the wonDetails path as modified for Mongoose
    lead.markModified('wonDetails');

    // Update actual value if final value is provided
    if (wonData.finalValue) {
      lead.actualValue = Number(wonData.finalValue);
    }

    await lead.save();

    await lead.populate('assignedTo', 'personalInfo.firstName personalInfo.lastName employeeId');
    await lead.populate('wonDetails.customerSuccessManager', 'personalInfo.firstName personalInfo.lastName');

    console.log('Won lead updated successfully:', lead._id);

    res.json({
      success: true,
      message: 'Won lead details updated successfully',
      data: lead
    });

  } catch (error) {
    console.error('Update won lead error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get all leads (with filters for sales employees)
export const getLeads = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, priority, source, search, includeAll } = req.query;

    let query = {};

    // If user is employee (sales), only show their assigned leads
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ user: req.user.id }).populate(
        'workInfo.department',
        'name code'
      );
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee record not found'
        });
      }
      if (!isDepartmentAllowed(employee.workInfo?.department, BDE_DEPARTMENTS)) {
        return res.status(403).json({
          success: false,
          message: 'Sales module is only available for BDE department'
        });
      }
      query.assignedTo = employee._id;
    }
    // For admin/manager, if includeAll is true, don't filter by assignedTo

    // Apply filters
    if (status && status !== 'all') {
      query.status = status;
    }
    if (priority && priority !== 'all') {
      query.priority = priority;
    }
    if (source && source !== 'all') {
      query.source = source;
    }

    let leads = await Lead.find(query)
      .populate('assignedTo', 'personalInfo.firstName personalInfo.lastName employeeId')
      .populate('assignedBy', 'name email')
      .populate('wonDetails.customerSuccessManager', 'personalInfo.firstName personalInfo.lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Apply search filter after population
    if (search) {
      const searchTerm = search.toLowerCase();
      leads = leads.filter(lead => {
        const fullName = lead.fullName?.toLowerCase() || '';
        const email = lead.email?.toLowerCase() || '';
        const company = lead.company?.toLowerCase() || '';
        const phone = lead.phone?.toLowerCase() || '';
        const leadId = lead.leadId?.toLowerCase() || '';
        
        return fullName.includes(searchTerm) || 
               email.includes(searchTerm) || 
               company.includes(searchTerm) ||
               phone.includes(searchTerm) ||
               leadId.includes(searchTerm);
      });
    }

    const total = await Lead.countDocuments(query);

    res.json({
      success: true,
      data: {
        leads,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalLeads: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get single lead by ID
export const getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'personalInfo.firstName personalInfo.lastName employeeId')
      .populate('assignedBy', 'name email')
      .populate('notes.addedBy', 'name email')
      .populate('wonDetails.customerSuccessManager', 'personalInfo.firstName personalInfo.lastName')
      .populate('meetings.createdBy', 'name email');

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    // Check if employee can access this lead
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ user: req.user.id });
      if (lead.assignedTo._id.toString() !== employee._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your assigned leads.'
        });
      }
    }

    res.json({
      success: true,
      data: lead
    });

  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update lead
export const updateLead = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const leadId = req.params.id;
    let updateData = req.body;

    // Find the lead first
    const existingLead = await Lead.findById(leadId);
    if (!existingLead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    // Check permissions for employee
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ user: req.user.id });
      if (existingLead.assignedTo.toString() !== employee._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only update your assigned leads.'
        });
      }
      
      // Employees cannot reassign leads
      delete updateData.assignedTo;
      delete updateData.assignedBy;
    }

    const lead = await Lead.findByIdAndUpdate(
      leadId,
      updateData,
      { new: true, runValidators: true }
    ).populate('assignedTo', 'personalInfo.firstName personalInfo.lastName employeeId')
     .populate('assignedBy', 'name email')
     .populate('wonDetails.customerSuccessManager', 'personalInfo.firstName personalInfo.lastName');

    res.json({
      success: true,
      message: 'Lead updated successfully',
      data: lead
    });

  } catch (error) {
    console.error('Update lead error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Add meeting to lead
export const addMeeting = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const leadId = req.params.id;
    const meetingData = {
      ...req.body,
      createdBy: req.user.id
    };

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    // Check permissions for employee
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ user: req.user.id });
      if (lead.assignedTo.toString() !== employee._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only add meetings to your assigned leads.'
        });
      }
    }

    lead.meetings.push(meetingData);
    await lead.save();

    await lead.populate('meetings.createdBy', 'name email');

    // Send meeting notification email (optional)
    if (meetingData.type === 'Video Meeting' || meetingData.type === 'Call') {
      try {
        await sendEmail({
          to: lead.email,
          subject: `Meeting Scheduled - ${meetingData.type}`,
          html: `
            <h3>Meeting Scheduled</h3>
            <p>Dear ${lead.firstName},</p>
            <p>A ${meetingData.type.toLowerCase()} has been scheduled with you.</p>
            <p><strong>Date:</strong> ${new Date(meetingData.scheduledDate).toLocaleString()}</p>
            <p><strong>Duration:</strong> ${meetingData.duration} minutes</p>
            <p><strong>Agenda:</strong> ${meetingData.agenda || 'To be discussed'}</p>
            <p>We look forward to speaking with you.</p>
          `
        });
      } catch (emailError) {
        console.warn('Failed to send meeting notification email:', emailError);
      }
    }

    res.json({
      success: true,
      message: 'Meeting added successfully',
      data: lead
    });

  } catch (error) {
    console.error('Add meeting error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update meeting
export const updateMeeting = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { leadId, meetingId } = req.params;
    const meetingData = req.body;

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    const meetingIndex = lead.meetings.findIndex(m => m._id.toString() === meetingId);
    if (meetingIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Check permissions for employee
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ user: req.user.id });
      if (lead.assignedTo.toString() !== employee._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only update meetings for your assigned leads.'
        });
      }
    }

    // Update meeting
    lead.meetings[meetingIndex] = {
      ...lead.meetings[meetingIndex].toObject(),
      ...meetingData,
      updatedAt: new Date()
    };

    await lead.save();
    await lead.populate('meetings.createdBy', 'name email');

    res.json({
      success: true,
      message: 'Meeting updated successfully',
      data: lead
    });

  } catch (error) {
    console.error('Update meeting error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add note to lead
export const addLeadNote = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { content, type = 'General' } = req.body;
    const leadId = req.params.id;

    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Note content is required'
      });
    }

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    // Check permissions for employee
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ user: req.user.id });
      if (lead.assignedTo.toString() !== employee._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only add notes to your assigned leads.'
        });
      }
    }

    lead.notes.push({
      content: content.trim(),
      addedBy: req.user.id,
      addedAt: new Date(),
      type: type
    });

    // Update last contact date
    lead.lastContactDate = new Date();

    await lead.save();

    // Populate the updated lead with notes
    await lead.populate('notes.addedBy', 'name email');

    res.json({
      success: true,
      message: 'Note added successfully',
      data: lead
    });

  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get upcoming meetings
export const getUpcomingMeetings = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    let employeeId = null;

    // If employee, only show their meetings
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ user: req.user.id });
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee record not found'
        });
      }
      employeeId = employee._id;
    }

    const upcomingMeetings = await Lead.getUpcomingMeetings(employeeId, parseInt(days));

    res.json({
      success: true,
      data: upcomingMeetings
    });

  } catch (error) {
    console.error('Get upcoming meetings error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get lead statistics
export const getLeadStats = async (req, res) => {
  try {
    let matchQuery = {};

    // If employee, only show their stats
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ user: req.user.id });
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee record not found'
        });
      }
      matchQuery.assignedTo = employee._id;
    }

    const [statusStats, priorityStats, sourceStats, monthlyStats, wonStats, meetingStats] = await Promise.all([
      // Status statistics
      Lead.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: { $ifNull: ['$estimatedValue', 0] } },
            actualValue: { $sum: { $ifNull: ['$actualValue', 0] } }
          }
        }
      ]),

      // Priority statistics
      Lead.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 }
          }
        }
      ]),

      // Source statistics
      Lead.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$source',
            count: { $sum: 1 }
          }
        }
      ]),

      // Monthly statistics (last 6 months)
      Lead.aggregate([
        { 
          $match: {
            ...matchQuery,
            createdAt: { $gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 },
            won: { $sum: { $cond: [{ $eq: ['$status', 'Won'] }, 1, 0] } },
            lost: { $sum: { $cond: [{ $eq: ['$status', 'Lost'] }, 1, 0] } },
            totalRevenue: { $sum: { $cond: [{ $eq: ['$status', 'Won'] }, '$actualValue', 0] } }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),

      // Won leads statistics
      Lead.getWonLeadsStats(matchQuery.assignedTo),

      // Meeting statistics
      Lead.getMeetingStats(matchQuery.assignedTo)
    ]);

    // Get overdue follow-ups count
    const overdueCount = await Lead.countDocuments({
      ...matchQuery,
      nextFollowUpDate: { $lt: new Date() },
      status: { $nin: ['Won', 'Lost'] }
    });

    // Get today's follow-ups
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayFollowUps = await Lead.countDocuments({
      ...matchQuery,
      nextFollowUpDate: { $gte: today, $lt: tomorrow },
      status: { $nin: ['Won', 'Lost'] }
    });

    // Get today's meetings
    const todayMeetings = await Lead.countDocuments({
      ...matchQuery,
      'meetings.scheduledDate': { $gte: today, $lt: tomorrow },
      'meetings.status': 'Scheduled'
    });

    // Get upcoming meetings count (next 7 days)
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const upcomingMeetingsCount = await Lead.countDocuments({
      ...matchQuery,
      'meetings.scheduledDate': { $gte: today, $lte: nextWeek },
      'meetings.status': 'Scheduled'
    });

    res.json({
      success: true,
      data: {
        statusStats,
        priorityStats,
        sourceStats,
        monthlyStats,
        wonStats: wonStats[0] || {
          totalWon: 0,
          totalRevenue: 0,
          avgDealSize: 0,
          totalRecurringRevenue: 0,
          avgMeetingsToClose: 0,
          avgSatisfactionScore: 0
        },
        meetingStats,
        overdueCount,
        todayFollowUps,
        todayMeetings,
        upcomingMeetingsCount
      }
    });

  } catch (error) {
    console.error('Get lead stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get won leads statistics
export const getWonLeadsStats = async (req, res) => {
  try {
    let employeeId = null;

    // If employee, only show their stats
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ user: req.user.id });
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee record not found'
        });
      }
      employeeId = employee._id;
    }

    const wonStats = await Lead.getWonLeadsStats(employeeId);

    res.json({
      success: true,
      data: wonStats[0] || {
        totalWon: 0,
        totalRevenue: 0,
        avgDealSize: 0,
        totalRecurringRevenue: 0,
        avgMeetingsToClose: 0,
        avgSatisfactionScore: 0
      }
    });

  } catch (error) {
    console.error('Get won leads stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get meeting statistics
export const getMeetingStats = async (req, res) => {
  try {
    let employeeId = null;

    // If employee, only show their stats
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ user: req.user.id });
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee record not found'
        });
      }
      employeeId = employee._id;
    }

    const meetingStats = await Lead.getMeetingStats(employeeId);

    res.json({
      success: true,
      data: meetingStats
    });

  } catch (error) {
    console.error('Get meeting stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get upcoming follow-ups
export const getUpcomingFollowUps = async (req, res) => {
  try {
    let matchQuery = {};

    // If employee, only show their leads
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ user: req.user.id });
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee record not found'
        });
      }
      matchQuery.assignedTo = employee._id;
    }

    const upcomingLeads = await Lead.find({
      ...matchQuery,
      nextFollowUpDate: { $gte: new Date() },
      status: { $nin: ['Won', 'Lost'] }
    })
    .populate('assignedTo', 'personalInfo.firstName personalInfo.lastName employeeId')
    .sort({ nextFollowUpDate: 1 })
    .limit(10);

    res.json({
      success: true,
      data: upcomingLeads
    });

  } catch (error) {
    console.error('Get upcoming follow-ups error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get overdue follow-ups
export const getOverdueFollowUps = async (req, res) => {
  try {
    let matchQuery = {};

    // If employee, only show their leads
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ user: req.user.id });
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee record not found'
        });
      }
      matchQuery.assignedTo = employee._id;
    }

    const overdueLeads = await Lead.find({
      ...matchQuery,
      nextFollowUpDate: { $lt: new Date() },
      status: { $nin: ['Won', 'Lost'] }
    })
    .populate('assignedTo', 'personalInfo.firstName personalInfo.lastName employeeId')
    .sort({ nextFollowUpDate: 1 });

    res.json({
      success: true,
      data: overdueLeads
    });

  } catch (error) {
    console.error('Get overdue follow-ups error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete lead (Admin only)
export const deleteLead = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    res.json({
      success: true,
      message: 'Lead deleted successfully'
    });

  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Reassign lead to a different BDE employee (Admin only)
export const reassignLead = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { assignedTo } = req.body;
    if (!assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'Please specify an employee to assign this lead to'
      });
    }

    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    const newEmployee = await Employee.findById(assignedTo).populate(
      'workInfo.department',
      'name code'
    );
    if (!newEmployee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    if (!isDepartmentAllowed(newEmployee.workInfo?.department, BDE_DEPARTMENTS)) {
      return res.status(400).json({
        success: false,
        message: 'Can only assign leads to BDE department employees'
      });
    }

    lead.assignedTo = assignedTo;
    lead.assignedBy = req.user.id;
    await lead.save();

    await lead.populate('assignedTo', 'personalInfo.firstName personalInfo.lastName employeeId');

    res.json({
      success: true,
      message: 'Lead reassigned successfully',
      data: lead
    });

  } catch (error) {
    console.error('Reassign lead error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all BDE department employees (for reassign dropdown)
export const getBDEEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({
      'employmentInfo.status': 'Active'
    }).populate('workInfo.department', 'name code');

    const bdeEmployees = employees.filter(emp => 
      isDepartmentAllowed(emp.workInfo?.department, BDE_DEPARTMENTS)
    );

    res.json({
      success: true,
      data: bdeEmployees.map(emp => ({
        _id: emp._id,
        employeeId: emp.employeeId,
        personalInfo: {
          firstName: emp.personalInfo?.firstName,
          lastName: emp.personalInfo?.lastName
        },
        department: emp.workInfo?.department?.name || emp.workInfo?.department?.code
      }))
    });

  } catch (error) {
    console.error('Get BDE employees error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

