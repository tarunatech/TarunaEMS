import { validationResult } from 'express-validator';
import PerformanceReview from '../models/PerformanceReview.js';
import Employee from '../models/Employee.js';
import Task from '../models/Task.js';

const monthPattern = /^\d{4}-\d{2}$/;

const currentMonth = () => new Date().toISOString().slice(0, 7);

const normalizeMonth = (month) => (monthPattern.test(String(month || '')) ? String(month) : currentMonth());

const previousMonths = (month, count = 3) => {
  const [year, monthNumber] = normalizeMonth(month).split('-').map(Number);
  const months = [];
  for (let index = 0; index < count; index += 1) {
    const date = new Date(Date.UTC(year, monthNumber - 1 - index, 1));
    months.push(date.toISOString().slice(0, 7));
  }
  return months;
};

const getEmployeeName = (employee) => {
  const firstName = employee?.personalInfo?.firstName || '';
  const lastName = employee?.personalInfo?.lastName || '';
  return `${firstName} ${lastName}`.trim() || employee?.user?.name || 'Unknown Employee';
};

const getCurrentEmployee = async (userId) => Employee.findOne({ user: userId }).lean();

const getCompletedTasksForMonth = async (employeeId, month) => {
  const { start, end } = PerformanceReview.monthBounds(month);
  const tasks = await Task.find({
    assignedTo: employeeId,
    status: 'Completed',
    completedDate: { $gte: start, $lt: end },
  }).sort({ completedDate: -1 }).lean();

  return tasks.map((task) => ({
    _id: task._id,
    title: task.title,
    description: task.description,
    dueDate: task.dueDate,
    completedDate: task.completedDate,
    status: task.status,
    priority: task.priority,
    onTime: PerformanceReview.isTaskOnTime(task),
  }));
};

export const getTeamPerformance = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
    }

    const month = normalizeMonth(req.query.month);
    const employees = await Employee.find({ status: { $ne: 'Terminated' } })
      .populate('user', 'name email employeeId')
      .lean();

    const reviews = await Promise.all(
      employees.map(async (employee) => {
        const review = await PerformanceReview.computeForEmployeeMonth(employee._id, month);
        return {
          employee: {
            _id: employee._id,
            id: employee.id,
            name: getEmployeeName(employee),
            employeeId: employee.employeeId || employee.user?.employeeId || 'N/A',
            email: employee.user?.email || employee.contactInfo?.personalEmail || '',
            position: employee.workInfo?.position || '',
          },
          review,
        };
      }),
    );

    const ratedReviews = reviews.filter((item) => item.review.adminRating !== null && item.review.adminRating !== undefined);
    const totalTasksClosed = reviews.reduce((sum, item) => sum + Number(item.review.totalTasks || 0), 0);
    const totalOnTime = reviews.reduce((sum, item) => sum + Number(item.review.onTimeCount || 0), 0);
    const avgRating = ratedReviews.length
      ? Number((ratedReviews.reduce((sum, item) => sum + Number(item.review.adminRating || 0), 0) / ratedReviews.length).toFixed(1))
      : 0;

    res.json({
      success: true,
      month,
      reviews,
      aggregates: {
        avgRating,
        teamOnTimeRate: totalTasksClosed > 0 ? Math.round((totalOnTime / totalTasksClosed) * 100) : 0,
        totalTasksClosed,
        reviewsPending: reviews.filter((item) => item.review.adminRating === null || item.review.adminRating === undefined).length,
      },
    });
  } catch (error) {
    console.error('Get team performance error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch team performance' });
  }
};

export const getEmployeeMonthlyDetail = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const month = normalizeMonth(req.query.month);

    if (req.user.role !== 'admin') {
      const currentEmployee = await getCurrentEmployee(req.user.id);
      if (!currentEmployee || String(currentEmployee._id) !== String(employeeId)) {
        return res.status(403).json({ success: false, message: 'Access denied. You can only view your own performance.' });
      }
    }

    const employee = await Employee.findById(employeeId)
      .populate('user', 'name email employeeId')
      .lean();

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const review = await PerformanceReview.computeForEmployeeMonth(employeeId, month);
    const tasks = await getCompletedTasksForMonth(employeeId, month);

    res.json({
      success: true,
      month,
      employee: {
        _id: employee._id,
        name: getEmployeeName(employee),
        employeeId: employee.employeeId || employee.user?.employeeId || 'N/A',
        email: employee.user?.email || employee.contactInfo?.personalEmail || '',
      },
      review,
      tasks,
    });
  } catch (error) {
    console.error('Get employee performance detail error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch employee performance detail' });
  }
};

export const rateEmployee = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { employeeId } = req.params;
    const month = normalizeMonth(req.body.month);
    const adminRating = Number(req.body.adminRating);
    const adminComment = req.body.adminComment ? String(req.body.adminComment).slice(0, 1000) : '';

    const review = await PerformanceReview.computeForEmployeeMonth(employeeId, month);
    const updatedReview = await PerformanceReview.findByIdAndUpdate(review._id, {
      adminRating,
      adminComment,
      ratedBy: req.user.id,
      ratedAt: new Date(),
    }).lean();

    res.json({
      success: true,
      message: 'Performance review saved successfully',
      review: updatedReview,
    });
  } catch (error) {
    console.error('Rate employee performance error:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to rate employee performance' });
  }
};

export const getMyPerformance = async (req, res) => {
  try {
    if (req.user.role !== 'employee') {
      return res.status(403).json({ success: false, message: 'Access denied. Employee only.' });
    }

    const employee = await getCurrentEmployee(req.user.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee record not found' });
    }

    const month = normalizeMonth(req.query.month);
    const review = await PerformanceReview.computeForEmployeeMonth(employee._id, month);
    const trend = await Promise.all(
      previousMonths(month, 3).map(async (trendMonth) => ({
        month: trendMonth,
        review: await PerformanceReview.computeForEmployeeMonth(employee._id, trendMonth),
      })),
    );

    res.json({
      success: true,
      month,
      review,
      trend,
    });
  } catch (error) {
    console.error('Get my performance error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch performance' });
  }
};
