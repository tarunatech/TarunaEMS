// controllers/faceDetectionController.js
import FaceData from '../models/FaceData.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import * as faceService from '../services/faceRecognitionService.js';
import { getSocketIdForUser } from '../socket/chat.js';
import { measurePerformance } from '../utils/performanceLogger.js';

// Initialize face models on startup
faceService.initializeFaceModels().catch(err => {
  console.error('Failed to initialize face models:', err);
});

// Simple in-memory cache for face descriptors
const faceDescriptorCache = new Map();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

const getCachedFaceData = (userId) => {
  const cached = faceDescriptorCache.get(userId.toString());
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
};

const setCachedFaceData = (userId, data) => {
  faceDescriptorCache.set(userId.toString(), {
    data,
    timestamp: Date.now()
  });
};

const invalidateFaceCache = (userId) => {
  if (userId) {
    faceDescriptorCache.delete(userId.toString());
  }
};

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = 'uploads/faces';
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `face_${Date.now()}_${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Load balancing: Limit concurrent face recognition tasks
let currentFaceTasks = 0;
const MAX_CONCURRENT_FACE_TASKS = 5; // Adjust based on server capacity (CPU cores)

const withConcurrencyLimit = async (res, fn) => {
  if (currentFaceTasks >= MAX_CONCURRENT_FACE_TASKS) {
    return res.status(503).json({ 
      success: false, 
      message: 'Server is currently busy with face processing tasks. Please try again in a moment.' 
    });
  }

  currentFaceTasks++;
  try {
    return await fn();
  } finally {
    currentFaceTasks--;
  }
};

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) return cb(null, true);
    cb(new Error('Only JPEG, JPG and PNG images are allowed'));
  }
});

// Legacy functions removed - now using integrated face recognition service

function calculateGeoDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
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

const FACE_MATCH_THRESHOLD = 0.9;
const MIN_CONFIDENCE_REQUIRED = 50;

// @desc    Analyze a single video frame for face quality
// @route   POST /api/face-detection/analyze-frame
// @access  Private (Admin)
export const analyzeFrame = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image is required' });
    }

    const imageBuffer = await fs.readFile(req.file.path);

    let result;
    try {
      result = await faceService.detectSingleFace(imageBuffer);
    } catch (error) {
      try { await fs.unlink(req.file.path); } catch (_) {}
      return res.status(500).json({
        success: false,
        message: 'Face analysis service error',
        error: error.message
      });
    }

    try { await fs.unlink(req.file.path); } catch (_) {}

    if (!result.success) {
      return res.json({
        success: false,
        face_detected: false,
        message: result.message || 'No face detected'
      });
    }

    res.json({
      success: true,
      face_detected: true,
      quality: {
        passed: result.face.confidence > 0.7,
        score: result.face.confidence,
        issues: result.face.confidence < 0.7 ? ['Low confidence detection'] : [],
        details: {
          confidence: result.face.confidence
        }
      },
      bbox: result.face.bbox,
      message: 'Frame analyzed successfully'
    });

  } catch (error) {
    console.error('Analyze frame error:', error);
    if (req.file && req.file.path) {
      try { await fs.unlink(req.file.path); } catch (_) {}
    }
    res.status(500).json({ success: false, message: 'Server error during frame analysis' });
  }
};

// @desc    Analyze frame from base64 for real-time feedback
// @route   POST /api/face-detection/analyze-frame-base64
// @access  Private (Admin)
export const analyzeFrameBase64 = async (req, res) => {
  try {
    const { image } = req.body;

    console.log('Analyze frame base64 request received');

    if (!image) {
      console.log('No image data provided');
      return res.status(400).json({ success: false, message: 'Image data is required' });
    }

    console.log('Processing base64 image...');
    let result;
    try {
      result = await faceService.processBase64Image(image);
      console.log('Face detection result:', result.success ? 'Success' : 'Failed');
    } catch (error) {
      console.error('Face service error:', error);
      return res.status(500).json({
        success: false,
        message: 'Face analysis service error',
        error: error.message
      });
    }

    if (!result.success) {
      console.log('Face detection failed:', result.message);
      return res.json({
        success: false,
        face_detected: false,
        message: result.message || 'No face detected'
      });
    }

    console.log('Face detected successfully with confidence:', result.face.confidence);
    res.json({
      success: true,
      face_detected: true,
      face: {
        descriptor: result.face.descriptor,
        bbox: result.face.bbox,
        confidence: result.face.confidence
      },
      quality: {
        passed: result.face.confidence > 0.5,
        score: result.face.confidence,
        issues: result.face.confidence < 0.5 ? ['Low confidence detection'] : [],
        details: {
          confidence: result.face.confidence
        }
      },
      bbox: result.face.bbox,
      message: 'Frame analyzed successfully'
    });

  } catch (error) {
    console.error('Analyze frame base64 error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ success: false, message: 'Server error during frame analysis', error: error.message });
  }
};

// @desc    Register face with multiple angles (video-based)
// @route   POST /api/face-detection/register-multi-angle
// @access  Private (Admin)
export const registerMultiAngleFace = async (req, res) => {
  try {
    const { employeeId, frontImage, leftImage, rightImage } = req.body;

    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Employee ID is required' });
    }

    if (!frontImage || !leftImage || !rightImage) {
      return res.status(400).json({ 
        success: false, 
        message: 'All three angle images (front, left, right) are required' 
      });
    }

    const employee = await Employee.findById(employeeId).populate('user');
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    let faceResult;
    try {
      faceResult = await faceService.registerMultiAngleFace(frontImage, leftImage, rightImage);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Face registration service error'
      });
    }

    if (!faceResult.success) {
      return res.status(400).json({
        success: false,
        message: faceResult.message || 'Face registration failed'
      });
    }

    // Update employee with multi-angle face data
    employee.faceEmbeddings = {
      front: faceResult.embeddings.front,
      left: faceResult.embeddings.left,
      right: faceResult.embeddings.right,
      average: faceResult.embeddings.average
    };
    employee.faceQualityScores = faceResult.qualityScores;
    employee.faceDescriptor = faceResult.embeddings.average;
    employee.hasFaceRegistered = true;
    employee.faceRegistrationDate = new Date();
    employee.faceRegistrationMethod = 'multi-angle';

    await employee.save();

    // Also update/create FaceData record
    const existingFaceData = await FaceData.findOne({ employee: employeeId });
    if (existingFaceData) {
      existingFaceData.faceDescriptor = faceResult.average_embedding;
      existingFaceData.confidence = Math.round(
        (faceResult.quality_scores.front + faceResult.quality_scores.left + faceResult.quality_scores.right) / 3 * 100
      );
      existingFaceData.lastUpdated = new Date();
      existingFaceData.metadata = {
        captureDevice: req.headers['user-agent'] || 'Unknown',
        captureEnvironment: 'Multi-Angle Registration',
        processingVersion: '2.0-InsightFace-MultiAngle'
      };
      await existingFaceData.save();
    } else {
      const faceData = new FaceData({
        employee: employeeId,
        user: employee.user._id,
        faceDescriptor: faceResult.average_embedding,
        landmarks: [],
        faceImageUrl: '',
        confidence: Math.round(
          (faceResult.quality_scores.front + faceResult.quality_scores.left + faceResult.quality_scores.right) / 3 * 100
        ),
        metadata: {
          captureDevice: req.headers['user-agent'] || 'Unknown',
          captureEnvironment: 'Multi-Angle Registration',
          processingVersion: '2.0-InsightFace-MultiAngle'
        }
      });
      await faceData.save();
    }

    res.json({ 
      success: true, 
      message: 'Multi-angle face registration successful',
      qualityScores: faceResult.quality_scores
    });

  } catch (error) {
    console.error('Multi-angle face registration error:', error);
    res.status(500).json({ success: false, message: 'Server error during face registration' });
  }
};

// @desc    Verify face using video frames with liveness detection
// @route   POST /api/face-detection/verify-video
// @access  Private (Employee)
export const verifyVideoFace = async (req, res) => {
  const startTime = Date.now();
  console.log(`[VerifyVideo] Request received from user ${req.user.id}`);
  
  try {
    const { frames, location } = req.body;

    if (!frames || !Array.isArray(frames) || frames.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least 2 video frames are required for verification'
      });
    }

    // Validate location data is provided
    if (!location || location.latitude === undefined || location.longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Location data is required for attendance verification'
      });
    }

    const userLocation = location;

    const employee = await Employee.findOne({ user: req.user.id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee record not found' });
    }

    // Check for face registration - face-api.js uses 128 dimensions
    let storedEmbeddings;
    if (employee.faceEmbeddings && employee.faceEmbeddings.average && employee.faceEmbeddings.average.length === 128) {
      storedEmbeddings = employee.faceEmbeddings;
    } else if (employee.faceDescriptor && employee.faceDescriptor.length === 128) {
      storedEmbeddings = { average: employee.faceDescriptor };
    } else {
      const faceData = await FaceData.findByEmployee(employee._id);
      if (!faceData || !faceData.faceDescriptor || faceData.faceDescriptor.length !== 128) {
        return res.status(404).json({
          success: false,
          message: 'Face data not registered. Please register your face first.'
        });
      }
      storedEmbeddings = { average: faceData.faceDescriptor };
    }

    // Setup real-time progress updates
    const io = req.app.get('io');
    const socketId = getSocketIdForUser(req.user.id);
    
    const onProgress = (progress) => {
      if (io && socketId) {
        io.of('/employee').to(socketId).emit('face:verification:progress', progress);
      }
    };

    let verifyResult;
    try {
      verifyResult = await faceService.verifyVideoFace(frames, storedEmbeddings, onProgress);
    } catch (error) {
      console.error('Face verification error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Face verification service error', 
        error: error.message 
      });
    }

    if (!verifyResult.success) {
      return res.status(400).json({
        success: false,
        message: verifyResult.message || 'Face verification failed',
        verification: {
          match: false,
          confidence: verifyResult.confidence || 0,
          liveness_score: verifyResult.liveness_score || 0
        }
      });
    }

    if (!verifyResult.match) {
      return res.status(400).json({
        success: false,
        message: `Face verification failed. Confidence: ${Math.round(verifyResult.confidence)}%`,
        verification: {
          match: false,
          confidence: verifyResult.confidence,
          similarity: verifyResult.similarity,
          liveness_score: verifyResult.liveness_score
        }
      });
    }

    // Location check
    const OFFICE_LOCATION = {
      latitude: 22.298873262930066,
      longitude: 73.13129619568713,
      radius: 100 // meters - Strict office location enforcement
    };

    const distance = calculateGeoDistance(
      Number(userLocation.latitude),
      Number(userLocation.longitude),
      OFFICE_LOCATION.latitude,
      OFFICE_LOCATION.longitude
    );

    if (!Number.isFinite(distance)) {
      return res.status(400).json({ success: false, message: 'Invalid location coordinates' });
    }

    if (distance > OFFICE_LOCATION.radius) {
      return res.status(400).json({
        success: false,
        message: `You are not within office premises. Distance: ${Math.round(distance)}m`,
        verification: {
          faceMatch: true,
          faceConfidence: verifyResult.confidence,
          livenessScore: verifyResult.liveness_score,
          locationMatch: false,
          distance: Math.round(distance),
          maxDistance: OFFICE_LOCATION.radius
        }
      });
    }

    res.json({
      success: true,
      message: 'Face verification successful with liveness check',
      verification: {
        faceMatch: true,
        faceConfidence: verifyResult.confidence,
        similarity: verifyResult.similarity,
        livenessScore: verifyResult.liveness_score,
        locationMatch: true,
        distance: Math.round(distance),
        maxDistance: OFFICE_LOCATION.radius
      }
    });

  } catch (error) {
    console.error('Video face verification error:', error);
    res.status(500).json({ success: false, message: 'Server error during face verification' });
  }
};

// @desc    Save employee face data during registration (single image - legacy support)
// @route   POST /api/face-detection/save-face
// @access  Private (Admin)
export const saveEmployeeFace = async (req, res) => {
  try {
    const { employeeId } = req.body;

    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Employee ID is required' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Face image is required' });
    }

    const employee = await Employee.findById(employeeId).populate('user');
    if (!employee) {
      try { await fs.unlink(req.file.path); } catch (_) {}
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const imageBuffer = await fs.readFile(req.file.path);

    let faceResult;
    try {
      faceResult = await faceService.detectSingleFace(imageBuffer);
    } catch (error) {
      try { await fs.unlink(req.file.path); } catch (_) {}
      return res.status(500).json({
        success: false,
        message: 'Face detection service error',
        error: error.message
      });
    }

    if (!faceResult.success) {
      try { await fs.unlink(req.file.path); } catch (_) {}
      return res.status(400).json({
        success: false,
        message: faceResult.message || 'No face detected in the image. Please try again with a clear face photo.'
      });
    }

    const face = faceResult.face;
    const faceDescriptor = face.descriptor;

    if (!Array.isArray(faceDescriptor) || faceDescriptor.length === 0) {
      try { await fs.unlink(req.file.path); } catch (_) {}
      return res.status(500).json({
        success: false,
        message: 'Invalid face descriptor received from face service'
      });
    }

    // Update employee with face data
    employee.faceDescriptor = faceDescriptor;
    employee.faceImage = req.file.path;
    employee.hasFaceRegistered = true;
    employee.faceRegistrationDate = new Date();
    employee.faceRegistrationMethod = 'single';
    await employee.save();

    const existingFaceData = await FaceData.findOne({ employee: employeeId });
    if (existingFaceData) {
      existingFaceData.faceDescriptor = faceDescriptor;
      existingFaceData.landmarks = [];
      existingFaceData.faceImageUrl = req.file.path;
      existingFaceData.lastUpdated = new Date();
      existingFaceData.confidence = Math.round(face.confidence * 100);
      existingFaceData.metadata = {
        captureDevice: req.headers['user-agent'] || 'Unknown',
        captureEnvironment: 'Registration',
        processingVersion: '4.0-FaceAPI'
      };

      await existingFaceData.save();
      return res.json({ success: true, message: 'Face data updated successfully', data: existingFaceData });
    }

    const faceData = new FaceData({
      employee: employeeId,
      user: employee.user._id,
      faceDescriptor,
      landmarks: [],
      faceImageUrl: req.file.path,
      confidence: Math.round(face.confidence * 100),
      metadata: {
        captureDevice: req.headers['user-agent'] || 'Unknown',
        captureEnvironment: 'Registration',
        processingVersion: '2.0-InsightFace'
      }
    });

    await faceData.save();
    res.status(201).json({ success: true, message: 'Face data saved successfully', data: faceData });

  } catch (error) {
    console.error('Save face data error:', error);
    if (req.file && req.file.path) {
      try { await fs.unlink(req.file.path); } catch (unlinkError) { console.error('Error deleting file:', unlinkError); }
    }
    res.status(500).json({ success: false, message: 'Server error while saving face data' });
  }
};

// @desc    Get employee face data
// @route   GET /api/face-detection/employee/:employeeId
// @access  Private
export const getEmployeeFace = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const employee = await Employee.findById(employeeId);
    if (employee && employee.hasFaceRegistered) {
      return res.json({ 
        success: true, 
        data: {
          _id: employee._id,
          hasRegisteredFace: true,
          registrationDate: employee.faceRegistrationDate,
          registrationMethod: employee.faceRegistrationMethod,
          hasMultiAngle: !!(employee.faceEmbeddings && employee.faceEmbeddings.average)
        }
      });
    }

    const faceData = await FaceData.findByEmployee(employeeId);
    if (!faceData) {
      return res.status(404).json({ success: false, message: 'Face data not found for this employee' });
    }

    const responseData = {
      _id: faceData._id,
      employee: faceData.employee,
      user: faceData.user,
      hasRegisteredFace: true,
      registrationDate: faceData.registrationDate,
      lastUpdated: faceData.lastUpdated,
      confidence: faceData.confidence
    };

    res.json({ success: true, data: responseData });

  } catch (error) {
    console.error('Get employee face error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching face data' });
  }
};

// @desc    Verify face for attendance using InsightFace (single image - legacy)
// @route   POST /api/face-detection/verify-attendance
// @access  Private (Employee)
export const verifyFaceAttendance = async (req, res) => {
  try {
    console.log('📸 Face attendance verification started for user:', req.user.email);
    let location = req.body.location;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Face image is required' });
    }

    console.log('Image received, size:', req.file.size, 'bytes');

    // Parse location if it's a JSON string (from FormData)
    if (typeof location === 'string') {
      try {
        location = JSON.parse(location);
      } catch (e) {
        try { await fs.unlink(req.file.path); } catch (_) {}
        return res.status(400).json({
          success: false,
          message: 'Invalid location data format'
        });
      }
    }

    // Validate location data is provided
    if (!location || location.latitude === undefined || location.longitude === undefined) {
      try { await fs.unlink(req.file.path); } catch (_) {}
      return res.status(400).json({
        success: false,
        message: 'Location data is required for attendance verification'
      });
    }

    const userLocation = location;

    const employee = await Employee.findOne({ user: req.user.id });
    if (!employee) {
      try { await fs.unlink(req.file.path); } catch (_) {}
      return res.status(404).json({ success: false, message: 'Employee record not found' });
    }

    console.log('Employee found:', employee.employeeId);

    // Get stored descriptor from employee or FaceData
    let storedDescriptor;
    if (employee.faceEmbeddings && employee.faceEmbeddings.average && employee.faceEmbeddings.average.length > 0) {
      storedDescriptor = employee.faceEmbeddings.average;
    } else if (employee.faceDescriptor && employee.faceDescriptor.length > 0) {
      storedDescriptor = employee.faceDescriptor;
    } else {
      const faceData = await FaceData.findByEmployee(employee._id);
      if (!faceData) {
        try { await fs.unlink(req.file.path); } catch (_) {}
        return res.status(404).json({ success: false, message: 'Face data not registered. Please register your face first.' });
      }
      storedDescriptor = faceData.faceDescriptor;
    }

    if (!Array.isArray(storedDescriptor) || storedDescriptor.length === 0) {
      try { await fs.unlink(req.file.path); } catch (_) {}
      return res.status(500).json({ success: false, message: 'Stored face descriptor invalid' });
    }

    const imageBuffer = await fs.readFile(req.file.path);
    console.log('Starting face detection...');

    let currentFaceResult;
    try {
      currentFaceResult = await faceService.detectSingleFace(imageBuffer, {
        skipFrontalityCheck: true,
        skipQualityCheck: true
      });
      console.log('Face detection result:', currentFaceResult.success ? 'Success' : 'Failed');
    } catch (error) {
      console.error('Face detection error:', error);
      try { await fs.unlink(req.file.path); } catch (_) {}
      return res.status(500).json({
        success: false,
        message: 'Face detection service error',
        error: error.message
      });
    }

    try { await fs.unlink(req.file.path); } catch (_) {}

    if (!currentFaceResult.success) {
      return res.status(400).json({
        success: false,
        message: currentFaceResult.message || 'No face detected in the image',
        verification: {
          match: false,
          confidence: 0
        }
      });
    }

    console.log('Comparing face descriptors...');
    const verifyResult = faceService.verifyFaceMatch(currentFaceResult.face.descriptor, storedDescriptor);
    console.log('Face match result:', verifyResult.match, 'Similarity:', Math.round(verifyResult.similarity * 100) + '%');

    if (!verifyResult.match) {
      return res.status(400).json({
        success: false,
        message: `Face verification failed. Similarity: ${Math.round(verifyResult.similarity * 100)}%`,
        verification: {
          match: false,
          confidence: verifyResult.similarity * 100,
          distance: verifyResult.distance
        }
      });
    }

    const OFFICE_LOCATION = {
      latitude: 22.298873262930066,
      longitude: 73.13129619568713,
      radius: 100 // meters - Strict office location enforcement
    };

    const distance = calculateGeoDistance(
      Number(userLocation.latitude),
      Number(userLocation.longitude),
      OFFICE_LOCATION.latitude,
      OFFICE_LOCATION.longitude
    );

    if (!Number.isFinite(distance)) {
      return res.status(400).json({ success: false, message: 'Invalid location coordinates' });
    }

    if (distance > OFFICE_LOCATION.radius) {
      return res.status(400).json({
        success: false,
        message: `You are not within office premises. Distance: ${Math.round(distance)}m`,
        verification: {
          faceMatch: true,
          faceConfidence: verifyResult.confidence,
          locationMatch: false,
          distance: Math.round(distance),
          maxDistance: OFFICE_LOCATION.radius
        }
      });
    }

    res.json({
      success: true,
      message: 'Face and location verification successful',
      verification: {
        faceMatch: true,
        faceConfidence: verifyResult.confidence,
        locationMatch: true,
        distance: Math.round(distance),
        maxDistance: OFFICE_LOCATION.radius
      }
    });

  } catch (error) {
    console.error('Face verification error:', error);
    if (req.file && req.file.path) {
      try { await fs.unlink(req.file.path); } catch (_) {}
    }
    res.status(500).json({ success: false, message: 'Server error during face verification' });
  }
};

// @desc    Delete employee face data
// @route   DELETE /api/face-detection/employee/:employeeId
// @access  Private (Admin)
export const deleteEmployeeFace = async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Clear employee face data
    const employee = await Employee.findById(employeeId);
    if (employee) {
      employee.faceDescriptor = null;
      employee.faceEmbeddings = {
        front: null,
        left: null,
        right: null,
        average: null
      };
      employee.faceQualityScores = {
        front: 0,
        left: 0,
        right: 0
      };
      employee.faceImage = null;
      employee.faceImages = {
        front: null,
        left: null,
        right: null
      };
      employee.hasFaceRegistered = false;
      employee.faceRegistrationDate = null;
      employee.faceRegistrationMethod = null;
      await employee.save();
    }

    const faceData = await FaceData.findOne({ employee: employeeId });
    if (faceData) {
      try {
        if (faceData.faceImageUrl) await fs.unlink(faceData.faceImageUrl);
      } catch (fileError) {
        console.warn('Could not delete face image file:', fileError);
      }
      await faceData.deleteOne();
    }

    res.json({ success: true, message: 'Face data deleted successfully' });

  } catch (error) {
    console.error('Delete face data error:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting face data' });
  }
};

// @desc    Get all employees without face data
// @route   GET /api/face-detection/employees-without-face
// @access  Private (Admin)
export const getEmployeesWithoutFace = async (req, res) => {
  try {
    const employeesWithoutFace = await Employee.find({
      $or: [
        { hasFaceRegistered: false },
        { hasFaceRegistered: { $exists: false } }
      ],
      status: 'Active'
    })
      .populate('user', 'name email employeeId')
      .select('personalInfo workInfo hasFaceRegistered');

    res.json({ success: true, data: employeesWithoutFace, count: employeesWithoutFace.length });

  } catch (error) {
    console.error('Get employees without face error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching employees' });
  }
};

// @desc    Detect faces in an image (for testing/preview)
// @route   POST /api/face-detection/detect
// @access  Private
export const detectFaces = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image is required' });
    }

    const imageBuffer = await fs.readFile(req.file.path);

    let faceResult;
    try {
      faceResult = await faceService.detectFaces(imageBuffer);
    } catch (error) {
      try { await fs.unlink(req.file.path); } catch (_) {}
      return res.status(500).json({
        success: false,
        message: 'Face detection service error',
        error: error.message
      });
    }

    try { await fs.unlink(req.file.path); } catch (_) {}

    res.json({
      success: true,
      faces: faceResult.map(face => ({
        bbox: face.bbox,
        confidence: face.confidence,
        descriptor: face.descriptor
      })),
      count: faceResult.length
    });

  } catch (error) {
    console.error('Face detection error:', error);
    if (req.file && req.file.path) {
      try { await fs.unlink(req.file.path); } catch (_) {}
    }
    res.status(500).json({ success: false, message: 'Server error during face detection' });
  }
};

// @desc    Register face using continuous video recording
// @route   POST /api/face-detection/register-continuous-video
// @access  Private (Admin)
export const registerContinuousVideo = async (req, res) => {
  return withConcurrencyLimit(res, async () => {
    try {
      const { employeeId, frames } = req.body;

    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Employee ID is required' });
    }

    if (!frames || !Array.isArray(frames) || frames.length < 10) {
      return res.status(400).json({ 
        success: false, 
        message: 'At least 10 video frames are required for registration' 
      });
    }

    const employee = await Employee.findById(employeeId).populate('user');
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    let faceResult;
    try {
      faceResult = await faceService.processVideoFrames(frames);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Face registration service error'
      });
    }

    if (!faceResult.success) {
      return res.status(400).json({
        success: false,
        message: faceResult.message || 'Face registration failed',
        validFrames: faceResult.validFrames || 0
      });
    }

    // Store the average descriptor as the main face embedding
    employee.faceDescriptor = faceResult.averageDescriptor;
    employee.faceEmbeddings = {
      average: faceResult.averageDescriptor,
      front: faceResult.averageDescriptor, // Use average for all angles
      left: faceResult.averageDescriptor,
      right: faceResult.averageDescriptor
    };
    employee.faceQualityScores = {
      front: faceResult.validFrames / faceResult.framesProcessed,
      left: faceResult.validFrames / faceResult.framesProcessed,
      right: faceResult.validFrames / faceResult.framesProcessed
    };
    employee.hasFaceRegistered = true;
    employee.faceRegistrationDate = new Date();
    employee.faceRegistrationMethod = 'video';

    await employee.save();
    
    // Invalidate cache
    if (employee.user) {
      invalidateFaceCache(employee.user._id || employee.user);
    }

    const existingFaceData = await FaceData.findOne({ employee: employeeId });
    const livenessScore = faceResult.validFrames / faceResult.framesProcessed;

    if (existingFaceData) {
      existingFaceData.faceDescriptor = faceResult.averageDescriptor;
      existingFaceData.confidence = Math.round(livenessScore * 100);
      existingFaceData.lastUpdated = new Date();
      existingFaceData.metadata = {
        captureDevice: req.headers['user-agent'] || 'Unknown',
        captureEnvironment: 'Continuous Video Registration',
        processingVersion: '4.0-FaceAPI-Video'
      };
      await existingFaceData.save();
    } else {
      const faceData = new FaceData({
        employee: employeeId,
        user: employee.user._id,
        faceDescriptor: faceResult.averageDescriptor,
        landmarks: [],
        faceImageUrl: '',
        confidence: Math.round(livenessScore * 100),
        metadata: {
          captureDevice: req.headers['user-agent'] || 'Unknown',
          captureEnvironment: 'Continuous Video Registration',
          processingVersion: '4.0-FaceAPI-Video'
        }
      });
      await faceData.save();
    }

    res.json({
      success: true,
      message: 'Face registered successfully with continuous video capture',
      validFrames: faceResult.validFrames,
      quality_scores: employee.faceQualityScores,
      liveness_score: livenessScore,
      total_frames_processed: faceResult.framesProcessed
    });

    } catch (error) {
      console.error('Continuous video registration error:', error);
      res.status(500).json({ success: false, message: 'Server error during face registration' });
    }
  });
};

// @desc    Verify face using live video with enhanced liveness detection
// @route   POST /api/face-detection/verify-live-video
// @access  Private (Employee)
export const verifyLiveVideo = async (req, res) => {
  return withConcurrencyLimit(res, async () => {
    try {
      const { frames, location } = req.body;

    if (!frames || !Array.isArray(frames) || frames.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least 2 video frames are required for live verification'
      });
    }

    // Validate location data is provided
    if (!location || location.latitude === undefined || location.longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Location data is required for attendance verification'
      });
    }

    const userLocation = location;

    // Check cache first for face data
    let storedEmbeddings = getCachedFaceData(req.user.id);
    let employee;

    if (!storedEmbeddings) {
      employee = await Employee.findOne({ user: req.user.id });
      if (!employee) {
        return res.status(404).json({ success: false, message: 'Employee record not found' });
      }

      // face-api.js uses 128-dimensional descriptors, not 512
      if (employee.faceEmbeddings && employee.faceEmbeddings.average && employee.faceEmbeddings.average.length > 0) {
        storedEmbeddings = employee.faceEmbeddings;
      } else if (employee.faceDescriptor && employee.faceDescriptor.length > 0) {
        storedEmbeddings = { average: employee.faceDescriptor };
      } else {
        const faceData = await FaceData.findByEmployee(employee._id);
        if (!faceData || !faceData.faceDescriptor || faceData.faceDescriptor.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Face data not registered. Please register your face first.'
          });
        }
        storedEmbeddings = { average: faceData.faceDescriptor };
      }

      // Cache the embeddings
      setCachedFaceData(req.user.id, storedEmbeddings);
    }

    // Setup real-time progress updates
    const io = req.app.get('io');
    const socketId = getSocketIdForUser(req.user.id);
    
    const onProgress = (progress) => {
      if (io && socketId) {
        io.of('/employee').to(socketId).emit('face:verification:progress', progress);
      }
    };

    let verifyResult;
    try {
      verifyResult = await measurePerformance('verifyLiveVideo', async () => {
        return await faceService.verifyVideoFace(frames, storedEmbeddings, onProgress);
      }, { userId: req.user.id });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Face verification service error',
        error: error.message
      });
    }

    if (!verifyResult.success || !verifyResult.liveness_passed) {
      return res.status(400).json({
        success: false,
        message: verifyResult.message || 'Liveness check failed - verification denied',
        verification: {
          match: false,
          liveness_passed: false,
          liveness_score: verifyResult.liveness_score || 0,
          anti_spoof_score: verifyResult.anti_spoof_score || 0
        }
      });
    }

    if (!verifyResult.match) {
      return res.status(400).json({
        success: false,
        message: `Face verification failed. Confidence: ${Math.round(verifyResult.confidence)}%`,
        verification: {
          match: false,
          confidence: verifyResult.confidence,
          similarity: verifyResult.similarity,
          liveness_passed: true,
          liveness_score: verifyResult.liveness_score
        }
      });
    }

    const OFFICE_LOCATION = {
      latitude: 22.29867,
      longitude: 73.13130,
      radius: 100 // meters - Strict office location enforcement
    };

    const distance = calculateGeoDistance(
      Number(userLocation.latitude),
      Number(userLocation.longitude),
      OFFICE_LOCATION.latitude,
      OFFICE_LOCATION.longitude
    );

    if (!Number.isFinite(distance)) {
      return res.status(400).json({ success: false, message: 'Invalid location coordinates' });
    }

    if (distance > OFFICE_LOCATION.radius) {
      return res.status(400).json({
        success: false,
        message: `You are not within office premises. Distance: ${Math.round(distance)}m`,
        verification: {
          faceMatch: true,
          faceConfidence: verifyResult.confidence,
          livenessScore: verifyResult.liveness_score,
          locationMatch: false,
          distance: Math.round(distance)
        }
      });
    }

    res.json({
      success: true,
      message: 'Live face verification successful',
      verification: {
        faceMatch: true,
        faceConfidence: verifyResult.confidence,
        similarity: verifyResult.similarity,
        livenessScore: verifyResult.liveness_score,
        antiSpoofScore: verifyResult.anti_spoof_score,
        locationMatch: true,
        distance: Math.round(distance)
      }
    });

    } catch (error) {
      console.error('Live video verification error:', error);
      res.status(500).json({ success: false, message: 'Server error during face verification' });
    }
  });
};

// @desc    Check liveness from video frames
// @route   POST /api/face-detection/check-liveness
// @access  Private
export const checkLiveness = async (req, res) => {
  try {
    const { frames } = req.body;

    if (!frames || !Array.isArray(frames) || frames.length < 2) {
      return res.status(400).json({ 
        success: false, 
        message: 'At least 2 video frames are required for liveness check' 
      });
    }

    let result;
    try {
      result = await faceService.processVideoFrames(frames);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Liveness check service error',
        error: error.message
      });
    }

    if (!result.success) {
      return res.json({
        success: false,
        liveness_passed: false,
        message: result.message || 'Liveness check failed'
      });
    }

    // Basic liveness score based on valid frames
    const livenessScore = Math.min(1.0, result.validFrames / 10);
    const livenessPassed = result.validFrames >= 2 && livenessScore > 0.3;

    res.json({
      success: true,
      liveness_passed: livenessPassed,
      liveness_score: livenessScore,
      frames_analyzed: result.framesProcessed,
      valid_frames: result.validFrames,
      message: livenessPassed ? 'Liveness check passed' : 'Liveness check failed - insufficient valid frames'
    });

  } catch (error) {
    console.error('Liveness check error:', error);
    res.status(500).json({ success: false, message: 'Server error during liveness check' });
  }
};
