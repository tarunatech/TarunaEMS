import express from 'express';
import multer from 'multer';
import path from 'path';
import InterviewSchedule from '../models/InterviewSchedule.js';
import { adminOnly, protect } from '../middleware/auth.js';
import { requireDepartment } from '../middleware/departmentAccess.js';

const router = express.Router();

router.use(protect);

const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/resumes/');
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-z0-9.-]/gi, '-').toLowerCase();
    cb(null, `${req.user.id}-${Date.now()}-${safeName}`);
  },
});

const resumeUpload = multer({
  storage: resumeStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /jpeg|jpg|png|webp|pdf|doc|docx/;
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const hasAllowedExtension = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const hasAllowedMime = allowedMimeTypes.includes(file.mimetype);

    if (hasAllowedExtension && hasAllowedMime) return cb(null, true);
    cb(new Error('Resume must be an image, PDF, DOC, or DOCX file'));
  },
});

const requiredFields = [
  'candidateName',
  'email',
  'phone',
  'position',
  'experience',
  'interviewDate',
  'interviewTime',
  'interviewMode',
  'interviewRound',
  'skills',
  'notes',
];

const pickInterviewFields = (body) =>
  requiredFields.reduce((data, field) => {
    data[field] = body[field];
    return data;
  }, {});

const validateRequiredFields = (body) => {
  const missing = requiredFields.filter((field) => !String(body[field] || '').trim());
  return missing;
};

router.get('/admin', adminOnly, async (req, res) => {
  try {
    const interviews = await InterviewSchedule.find()
      .populate('createdBy', 'name email personalInfo')
      .sort({ interviewDate: 1, interviewTime: 1, createdAt: -1 });

    res.json({ success: true, data: interviews });
  } catch (error) {
    console.error('Failed to fetch interview schedules:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch interview schedules' });
  }
});

router.patch('/admin/:id/status', adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['Scheduled', 'Completed', 'Selected', 'Rejected', 'Cancelled'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid interview status' });
    }

    const interview = await InterviewSchedule.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email personalInfo');

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview schedule not found' });
    }

    res.json({ success: true, data: interview });
  } catch (error) {
    console.error('Failed to update interview status:', error);
    res.status(500).json({ success: false, message: 'Failed to update interview status' });
  }
});

router.delete('/admin/:id', adminOnly, async (req, res) => {
  try {
    const interview = await InterviewSchedule.findByIdAndDelete(req.params.id);

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview schedule not found' });
    }

    res.json({ success: true, data: interview });
  } catch (error) {
    console.error('Failed to delete interview schedule:', error);
    res.status(500).json({ success: false, message: 'Failed to delete interview schedule' });
  }
});

router.use(requireDepartment(['hr', 'human resources', 'humanresources']));

router.get('/', async (req, res) => {
  try {
    const interviews = await InterviewSchedule.find({ createdBy: req.user.id })
      .populate('createdBy', 'name email personalInfo')
      .sort({ interviewDate: 1, interviewTime: 1, createdAt: -1 });

    res.json({ success: true, data: interviews });
  } catch (error) {
    console.error('Failed to fetch HR interview schedules:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch interview schedules' });
  }
});

router.post('/', resumeUpload.single('resume'), async (req, res) => {
  try {
    const missing = validateRequiredFields(req.body);

    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(', ')}`,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Resume file is required',
      });
    }

    const interview = await InterviewSchedule.create({
      ...pickInterviewFields(req.body),
      resumeFile: {
        path: `/uploads/resumes/${req.file.filename}`,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
      createdBy: req.user.id,
    });

    await interview.populate('createdBy', 'name email personalInfo');
    res.status(201).json({ success: true, data: interview });
  } catch (error) {
    console.error('Failed to create interview schedule:', error);
    res.status(500).json({ success: false, message: 'Failed to create interview schedule' });
  }
});

export default router;
