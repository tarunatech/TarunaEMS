import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import InterviewSchedule from '../models/InterviewSchedule.js';
import { adminOnly, protect } from '../middleware/auth.js';
import { requireDepartment } from '../middleware/departmentAccess.js';
import { candidateDocumentsDir, resumesDir } from '../config/uploadPaths.js';

const router = express.Router();

router.use(protect);

const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, resumesDir);
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

const profileUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, candidateDocumentsDir),
    filename: (req, file, cb) => {
      const safeName = file.originalname.replace(/[^a-z0-9.-]/gi, '-').toLowerCase();
      cb(null, `${req.user.id}-${Date.now()}-${safeName}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /jpeg|jpg|png|pdf|doc|docx/;
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const hasAllowedExtension = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const hasAllowedMime = allowedMimeTypes.includes(file.mimetype);
    if (hasAllowedExtension && hasAllowedMime) return cb(null, true);
    cb(new Error('Document must be a PDF, DOC, DOCX, JPG, JPEG, or PNG file'));
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

const collectionField = {
  education: 'education',
  experience: 'experienceHistory',
  certifications: 'certifications',
  documents: 'documents',
};

const collectionCategory = {
  education: 'Education',
  experience: 'Experience',
  certifications: 'Certification',
  documents: 'Other',
};

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const clean = (value) => String(value || '').trim();
const fileMeta = (file) => file ? {
  path: `/uploads/candidate-documents/${file.filename}`,
  originalName: file.originalname,
  mimeType: file.mimetype,
  size: file.size,
} : null;

const getProfileInterview = async (req, res, { admin = false } = {}) => {
  const interview = await InterviewSchedule.findById(req.params.candidateId || req.params.id)
    .populate('createdBy', 'name email personalInfo');
  if (!interview) {
    res.status(404).json({ success: false, message: 'Candidate profile not found' });
    return null;
  }
  if (!admin && String(interview.createdBy?._id || interview.createdBy?.id || interview.createdBy) !== String(req.user.id)) {
    res.status(403).json({ success: false, message: 'You are not allowed to access this candidate profile' });
    return null;
  }
  return interview;
};

const normalizeProfileRecord = (type, body, file, user) => {
  const now = new Date().toISOString();
  const document = fileMeta(file);
  const base = {
    id: body.id || makeId(),
    createdAt: body.createdAt || now,
    updatedAt: now,
    uploadedBy: user?.name || user?.email || user?.id,
  };

  if (type === 'education') {
    if (!clean(body.educationLevel || body.degree)) throw new Error('Education level or degree is required');
    if (!clean(body.institution)) throw new Error('Institution is required');
    if (body.startYear && body.endYear && Number(body.startYear) > Number(body.endYear)) throw new Error('Start year cannot be greater than end year');
    return { ...base, educationLevel: clean(body.educationLevel), degree: clean(body.degree), field: clean(body.field), institution: clean(body.institution), board: clean(body.board), startYear: clean(body.startYear), endYear: clean(body.endYear), grade: clean(body.grade), document: document || body.document || null };
  }
  if (type === 'experience') {
    if (!clean(body.companyName)) throw new Error('Company name is required');
    if (body.startDate && body.endDate && !body.currentlyWorking && new Date(body.endDate) < new Date(body.startDate)) throw new Error('End date cannot be before start date');
    return { ...base, companyName: clean(body.companyName), designation: clean(body.designation), employmentType: clean(body.employmentType), startDate: clean(body.startDate), endDate: clean(body.endDate), currentlyWorking: String(body.currentlyWorking) === 'true', description: clean(body.description), document: document || body.document || null };
  }
  if (type === 'certifications') {
    if (!clean(body.certificateName)) throw new Error('Certificate name is required');
    return { ...base, certificateName: clean(body.certificateName), issuingOrganization: clean(body.issuingOrganization), issueDate: clean(body.issueDate), expiryDate: clean(body.expiryDate), credentialId: clean(body.credentialId), document: document || body.document || null };
  }
  if (!clean(body.documentName || file?.originalname)) throw new Error('Document name is required');
  return { ...base, documentName: clean(body.documentName) || file.originalname, category: clean(body.category) || 'Other', relatedRecord: clean(body.relatedRecord), document };
};

const withProfileDocument = (interview) => {
  const doc = interview.toObject ? interview.toObject() : interview;
  const resumeDocument = doc.resumeFile ? [{
    id: 'resume',
    documentName: doc.resumeFile.originalName || 'Resume',
    category: 'Resume',
    relatedRecord: doc.position || '',
    document: doc.resumeFile,
    uploadedBy: doc.createdBy?.name || doc.createdBy?.email || '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }] : [];
  return { ...doc, documents: [...resumeDocument, ...(doc.documents || [])] };
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

router.get('/admin/candidates/:candidateId', adminOnly, async (req, res) => {
  try {
    const interview = await getProfileInterview(req, res, { admin: true });
    if (!interview) return;
    res.json({ success: true, data: withProfileDocument(interview), readOnly: true });
  } catch (error) {
    console.error('Failed to fetch admin candidate profile:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch candidate profile' });
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

router.get('/candidates/:candidateId', async (req, res) => {
  try {
    const interview = await getProfileInterview(req, res);
    if (!interview) return;
    res.json({ success: true, data: withProfileDocument(interview) });
  } catch (error) {
    console.error('Failed to fetch candidate profile:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch candidate profile' });
  }
});

router.put('/candidates/:candidateId', async (req, res) => {
  try {
    const interview = await getProfileInterview(req, res);
    if (!interview) return;
    const allowed = ['candidateName', 'email', 'phone', 'position', 'experience', 'skills', 'notes'];
    for (const field of allowed) {
      if (req.body[field] !== undefined) interview[field] = req.body[field];
    }
    await interview.save();
    await interview.populate('createdBy', 'name email personalInfo');
    res.json({ success: true, data: withProfileDocument(interview) });
  } catch (error) {
    console.error('Failed to update candidate profile:', error);
    res.status(500).json({ success: false, message: 'Failed to update candidate profile' });
  }
});

router.get('/candidates/:candidateId/:type', async (req, res) => {
  try {
    const field = collectionField[req.params.type];
    if (!field) return res.status(404).json({ success: false, message: 'Profile section not found' });
    const interview = await getProfileInterview(req, res);
    if (!interview) return;
    res.json({ success: true, data: interview[field] || [] });
  } catch (error) {
    console.error('Failed to fetch candidate profile section:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch candidate profile section' });
  }
});

router.post('/candidates/:candidateId/:type', profileUpload.single('document'), async (req, res) => {
  try {
    const field = collectionField[req.params.type];
    if (!field) return res.status(404).json({ success: false, message: 'Profile section not found' });
    const interview = await getProfileInterview(req, res);
    if (!interview) return;
    const record = normalizeProfileRecord(req.params.type, { ...req.body, category: req.body.category || collectionCategory[req.params.type] }, req.file, req.user);
    interview[field] = [...(interview[field] || []), record];
    await interview.save();
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    console.error('Failed to add candidate profile record:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to add candidate profile record' });
  }
});

router.put('/candidates/:candidateId/:type/:recordId', profileUpload.single('document'), async (req, res) => {
  try {
    const field = collectionField[req.params.type];
    if (!field || req.params.recordId === 'resume') return res.status(404).json({ success: false, message: 'Profile record not found' });
    const interview = await getProfileInterview(req, res);
    if (!interview) return;
    const records = interview[field] || [];
    const index = records.findIndex((item) => item.id === req.params.recordId);
    if (index === -1) return res.status(404).json({ success: false, message: 'Profile record not found' });
    const record = normalizeProfileRecord(req.params.type, { ...records[index], ...req.body, id: req.params.recordId }, req.file, req.user);
    records[index] = record;
    interview[field] = records;
    await interview.save();
    res.json({ success: true, data: record });
  } catch (error) {
    console.error('Failed to update candidate profile record:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to update candidate profile record' });
  }
});

router.delete('/candidates/:candidateId/:type/:recordId', async (req, res) => {
  try {
    const field = collectionField[req.params.type];
    if (!field || req.params.recordId === 'resume') return res.status(404).json({ success: false, message: 'Profile record not found' });
    const interview = await getProfileInterview(req, res);
    if (!interview) return;
    const records = interview[field] || [];
    const record = records.find((item) => item.id === req.params.recordId);
    if (!record) return res.status(404).json({ success: false, message: 'Profile record not found' });
    interview[field] = records.filter((item) => item.id !== req.params.recordId);
    await interview.save();
    const storedPath = record.document?.path;
    if (storedPath?.startsWith('/uploads/candidate-documents/')) {
      fs.promises.unlink(path.join(candidateDocumentsDir, path.basename(storedPath))).catch(() => {});
    }
    res.json({ success: true, data: record });
  } catch (error) {
    console.error('Failed to delete candidate profile record:', error);
    res.status(500).json({ success: false, message: 'Failed to delete candidate profile record' });
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
