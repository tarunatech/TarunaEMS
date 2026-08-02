// backend/routes/problemRoutes.js
import express from 'express';
import Problem from '../models/Problem.js';
import { protect } from '../middleware/auth.js';
import { requireDepartment } from '../middleware/departmentAccess.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);
// Only Developer department employees can access problem statements
router.use(requireDepartment(['developer', 'development']));

// GET all problems
router.get('/', async (req, res) => {
  try {
    const problems = await Problem.find()
      .populate('reportedBy', 'personalInfo')
      .populate('solvedBy', 'personalInfo')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: problems });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch problems' });
  }
});

// POST new problem
router.post('/', async (req, res) => {
  try {
    const problem = new Problem({
      description: req.body.description,
      reportedBy: req.user.id,
      status: 'Pending'
    });
    await problem.save();
    await problem.populate('reportedBy', 'personalInfo');
    res.status(201).json({ success: true, data: problem });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create problem' });
  }
});

// PATCH solve problem
router.patch('/:id/solve', async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ success: false, message: 'Problem not found' });
    
    problem.status = 'Solved';
    problem.solvedBy = req.user.id;
    problem.solvedAt = new Date();
    await problem.save();
    await problem.populate('reportedBy solvedBy', 'personalInfo');
    
    res.json({ success: true, data: problem });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to solve problem' });
  }
});

export default router;