import DayBook from '../models/DayBook.js';
import Task from '../models/Task.js';
import Employee from '../models/Employee.js';
import mongoose from 'mongoose';
import { sendDayBookReportEmail } from '../utils/email.js';

// @desc    Get or create day book for today
// @route   GET /api/daybooks/today
// @access  Private (Employee)
export const getTodayDayBook = async (req, res) => {
    try {
        const employee = await Employee.findOne({ user: req.user.id });
        if (!employee) {
            console.log(`[DayBook] Employee not found for user: ${req.user.id}`);
            return res.status(404).json({ success: false, message: 'Employee record not found' });
        }

        console.log(`[DayBook] Fetching for employee: ${employee._id}`);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let dayBook = await DayBook.findOne({
            employee: employee._id,
            date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
        }).populate('slots.taskRef');

        if (!dayBook) {
            // Create a default day book with slots as requested by user
            dayBook = await DayBook.create({
                employee: employee._id,
                date: today,
                slots: [
                    { slotType: '10:00 AM - 1:00 PM', workType: 'Task', description: '' },
                    { slotType: '1:00 PM - 2:00 PM', workType: 'Break', description: 'Lunch Break' },
                    { slotType: '2:00 PM - 7:00 PM', workType: 'Task', description: '' }
                ]
            });
        } else if (dayBook.status === 'Pending') {
            // Migrate legacy 'Pending' status to 'Draft'
            dayBook.status = 'Draft';
            await dayBook.save();
        }

        res.json({ success: true, dayBook });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Submit day book
// @route   POST /api/daybooks/submit
// @access  Private (Employee)
export const submitDayBook = async (req, res) => {
    try {
        const { slots, status } = req.body;
        const employee = await Employee.findOne({ user: req.user.id });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dayBook = await DayBook.findOneAndUpdate(
            { employee: employee._id, date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) } },
            { slots, status: status || 'Submitted' },
            { new: true, runValidators: true }
        ).populate('slots.taskRef');

        // Only send email if status is 'Submitted'
        if (dayBook && dayBook.status === 'Submitted') {
            try {
                // Fetch all active tasks for this employee to include in report
                const activeTasks = await Task.find({
                    assignedTo: employee._id,
                    status: { $nin: ['Completed', 'Cancelled'] }
                });

                // Get details of employee for email
                const employeeDetails = await Employee.findById(employee._id);

                await sendDayBookReportEmail(dayBook, employeeDetails, activeTasks);
            } catch (emailError) {
                console.error('Error sending day book report email:', emailError);
                // We don't want to fail the request if email fails
            }
        }

        res.json({ success: true, dayBook });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all day books (Admin)
// @route   GET /api/daybooks
// @access  Private (Admin)
export const getDayBooks = async (req, res) => {
    try {
        const { status, employeeId, date } = req.query;
        let query = {};

        if (status) query.status = status;
        if (employeeId) query.employee = employeeId;
        if (date) {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            query.date = { $gte: d, $lt: new Date(d.getTime() + 24 * 60 * 60 * 1000) };
        }

        const dayBooks = await DayBook.find(query)
            .populate('employee', 'personalInfo.firstName personalInfo.lastName employeeId')
            .populate('slots.taskRef')
            .sort({ date: -1 });

        res.json({ success: true, dayBooks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update day book status (Admin)
// @route   PUT /api/daybooks/:id/status
// @access  Private (Admin)
export const updateDayBookStatus = async (req, res) => {
    try {
        const { status, adminComment, taskStatuses } = req.body;

        const dayBook = await DayBook.findByIdAndUpdate(
            req.params.id,
            { status, adminComment },
            { new: true }
        ).populate('slots.taskRef');

        // If taskStatuses are provided, update those tasks
        if (taskStatuses && Array.isArray(taskStatuses)) {
            for (const ts of taskStatuses) {
                if (ts.taskId && ts.status) {
                    const task = await Task.findById(ts.taskId);
                    if (task) {
                        task.status = ts.status;
                        if (ts.status === 'Completed') {
                            task.progress = 100;
                            task.completedDate = new Date();
                        }
                        await task.save();
                    }
                }
            }
        }

        // Send email report to admin email
        try {
            const employee = await Employee.findById(dayBook.employee);
            const activeTasks = await Task.find({
                assignedTo: dayBook.employee,
                status: { $nin: ['Completed', 'Cancelled'] }
            });

            await sendDayBookReportEmail(dayBook, employee, activeTasks);
        } catch (emailError) {
            console.error('Error sending day book report email on update:', emailError);
        }

        res.json({ success: true, dayBook });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete day book (Admin)
// @route   DELETE /api/daybooks/:id
// @access  Private (Admin)
export const deleteDayBook = async (req, res) => {
    try {
        const dayBook = await DayBook.findById(req.params.id);

        if (!dayBook) {
            return res.status(404).json({ success: false, message: 'Day book not found' });
        }

        await DayBook.findByIdAndDelete(req.params.id);

        res.json({ success: true, message: 'Day book deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
