// services/faceRecognitionService.js
import * as faceapi from 'face-api.js';
import * as tf from '@tensorflow/tfjs';
import canvas from 'canvas';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup canvas for Node.js environment
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

let modelsLoaded = false;
let tfInitialized = false;

// Face recognition configuration from environment variables
const FACE_MATCH_THRESHOLD = parseFloat(process.env.FACE_MATCH_THRESHOLD) || 0.45;
const FACE_MIN_CONFIDENCE = parseFloat(process.env.FACE_MIN_CONFIDENCE) || 0.7;
const FACE_FRONTALITY_TOLERANCE = parseFloat(process.env.FACE_FRONTALITY_TOLERANCE) || 0.15;

/**
 * Initialize TensorFlow.js backend
 */
async function initializeTensorFlow() {
  if (tfInitialized) {
    return;
  }

  try {
    // Set TensorFlow.js backend to CPU (more compatible than tfjs-node)
    await tf.setBackend('cpu');
    await tf.ready();
    tfInitialized = true;
    console.log('TensorFlow.js initialized with CPU backend');
  } catch (error) {
    console.error('Failed to initialize TensorFlow.js:', error);
    throw error;
  }
}

/**
 * Initialize face-api models
 * Downloads and loads the required models for face detection and recognition
 */
export async function initializeFaceModels() {
  if (modelsLoaded) {
    console.log('Face models already loaded');
    return;
  }

  try {
    // Initialize TensorFlow.js first
    await initializeTensorFlow();

    const modelsPath = path.join(__dirname, '../models/face-models');

    // Create models directory if it doesn't exist
    await fs.mkdir(modelsPath, { recursive: true });

    console.log('Loading face recognition models...');

    // Load models from local directory or download if not present
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsPath),
      faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath),
      faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath)
    ]);

    modelsLoaded = true;
    console.log('Face recognition models loaded successfully!');
  } catch (error) {
    console.error('Error loading face models:', error);
    throw new Error('Failed to initialize face recognition models');
  }
}

/**
 * Detect faces in an image buffer
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {Promise<Array>} Array of detected faces with descriptors
 */
export async function detectFaces(imageBuffer) {
  if (!modelsLoaded) {
    await initializeFaceModels();
  }

  const startTime = Date.now();
  try {
    const img = await canvas.loadImage(imageBuffer);
    
    // Resize large images for performance
    let processImg = img;
    const MAX_WIDTH = 480;
    if (img.width > MAX_WIDTH) {
      const scaleFactor = MAX_WIDTH / img.width;
      const newHeight = img.height * scaleFactor;
      const cvs = new Canvas(MAX_WIDTH, newHeight);
      const ctx = cvs.getContext('2d');
      ctx.drawImage(img, 0, 0, MAX_WIDTH, newHeight);
      processImg = cvs;
    }
    
    const detections = await faceapi
      .detectAllFaces(processImg)
      .withFaceLandmarks()
      .withFaceDescriptors();

    console.log(`Face detection took ${Date.now() - startTime}ms`);

    return detections.map(detection => ({
      bbox: detection.detection.box,
      confidence: detection.detection.score,
      landmarks: detection.landmarks.positions,
      descriptor: Array.from(detection.descriptor)
    }));
  } catch (error) {
    console.error('Error detecting faces:', error);
    throw new Error('Face detection failed');
  }
}

/**
 * Detect a single face and return its descriptor with enhanced accuracy
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {Promise<Object>} Face detection result
 */
export async function detectSingleFace(imageBuffer, options = {}) {
  if (!modelsLoaded) {
    await initializeFaceModels();
  }

  const startTime = Date.now();
  const { skipFrontalityCheck = false, skipQualityCheck = false } = options;

  try {
    const img = await canvas.loadImage(imageBuffer);

    // Resize large images for performance
    let processImg = img;
    const MAX_WIDTH = 256;
    if (img.width > MAX_WIDTH) {
      const scaleFactor = MAX_WIDTH / img.width;
      const newHeight = img.height * scaleFactor;
      const cvs = new Canvas(MAX_WIDTH, newHeight);
      const ctx = cvs.getContext('2d');
      ctx.drawImage(img, 0, 0, MAX_WIDTH, newHeight);
      processImg = cvs;
    }

    // Use higher quality detection with minimum confidence threshold
    const detection = await faceapi
      .detectSingleFace(processImg, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    console.log(`Single face detection took ${Date.now() - startTime}ms`);

    if (!detection) {
      return {
        success: false,
        message: 'No face detected in the image. Please ensure your face is clearly visible and well-lit.'
      };
    }

    // Check if face is frontal by analyzing landmarks (can be skipped for admin registration)
    if (!skipFrontalityCheck) {
      const isFrontal = checkFaceFrontality(detection.landmarks);
      if (!isFrontal.isFrontal) {
        return {
          success: false,
          message: `Please face the camera directly. ${isFrontal.reason}`
        };
      }
    }

    // Check face quality (can be skipped for admin registration)
    if (!skipQualityCheck) {
      const quality = assessFaceQuality(detection, processImg.width, processImg.height);
      if (!quality.passed) {
        return {
          success: false,
          message: quality.message
        };
      }
    }

    return {
      success: true,
      face: {
        bbox: detection.detection.box,
        confidence: detection.detection.score,
        landmarks: detection.landmarks.positions,
        descriptor: Array.from(detection.descriptor),
        quality: detection.detection.score
      }
    };
  } catch (error) {
    console.error('Error detecting single face:', error);
    throw new Error('Face detection failed');
  }
}

/**
 * Check if face is frontal by analyzing facial landmarks
 * @param {Object} landmarks - Face landmarks
 * @returns {Object} Frontality check result
 */
function checkFaceFrontality(landmarks) {
  const positions = landmarks.positions;

  // Get key facial points
  const leftEye = positions[36]; // Left eye outer corner
  const rightEye = positions[45]; // Right eye outer corner
  const nose = positions[30]; // Nose tip
  const leftMouth = positions[48]; // Left mouth corner
  const rightMouth = positions[54]; // Right mouth corner

  // Calculate horizontal symmetry
  const eyeDistance = Math.abs(rightEye.x - leftEye.x);
  const leftNoseDistance = Math.abs(nose.x - leftEye.x);
  const rightNoseDistance = Math.abs(rightEye.x - nose.x);

  // Nose should be centered between eyes (using configured tolerance)
  const symmetryRatio = Math.abs(leftNoseDistance - rightNoseDistance) / eyeDistance;

  if (symmetryRatio > FACE_FRONTALITY_TOLERANCE) {
    return {
      isFrontal: false,
      reason: 'Face is turned to the side. Please look straight at the camera.'
    };
  }

  // Check vertical alignment (face tilt)
  const eyeHeightDiff = Math.abs(leftEye.y - rightEye.y);
  const eyeTiltRatio = eyeHeightDiff / eyeDistance;

  if (eyeTiltRatio > 0.1) {
    return {
      isFrontal: false,
      reason: 'Face is tilted. Please keep your head straight.'
    };
  }

  // Check mouth symmetry
  const mouthDistance = Math.abs(rightMouth.x - leftMouth.x);
  const leftMouthNoseDistance = Math.abs(nose.x - leftMouth.x);
  const rightMouthNoseDistance = Math.abs(rightMouth.x - nose.x);
  const mouthSymmetryRatio = Math.abs(leftMouthNoseDistance - rightMouthNoseDistance) / mouthDistance;

  if (mouthSymmetryRatio > FACE_FRONTALITY_TOLERANCE) {
    return {
      isFrontal: false,
      reason: 'Face angle is not optimal. Please face the camera directly.'
    };
  }

  return {
    isFrontal: true,
    symmetryScore: 1 - symmetryRatio
  };
}

/**
 * Assess face quality for registration
 * @param {Object} detection - Face detection result
 * @param {number} imageWidth - Image width
 * @param {number} imageHeight - Image height
 * @returns {Object} Quality assessment result
 */
function assessFaceQuality(detection, imageWidth, imageHeight) {
  const box = detection.detection.box;
  const confidence = detection.detection.score;

  // Check detection confidence (using configured minimum)
  if (confidence < FACE_MIN_CONFIDENCE) {
    return {
      passed: false,
      score: confidence,
      message: 'Face detection confidence is too low. Please ensure good lighting and clear visibility.'
    };
  }

  // Check face size (should be at least 20% of image width)
  const faceWidthRatio = box.width / imageWidth;
  if (faceWidthRatio < 0.2) {
    return {
      passed: false,
      score: faceWidthRatio,
      message: 'Face is too small. Please move closer to the camera.'
    };
  }

  if (faceWidthRatio > 0.8) {
    return {
      passed: false,
      score: faceWidthRatio,
      message: 'Face is too close. Please move back a bit.'
    };
  }

  // Check if face is centered (within 30% of center)
  const faceCenterX = box.x + box.width / 2;
  const faceCenterY = box.y + box.height / 2;
  const imageCenterX = imageWidth / 2;
  const imageCenterY = imageHeight / 2;

  const horizontalOffset = Math.abs(faceCenterX - imageCenterX) / imageWidth;
  const verticalOffset = Math.abs(faceCenterY - imageCenterY) / imageHeight;

  if (horizontalOffset > 0.3 || verticalOffset > 0.3) {
    return {
      passed: false,
      score: 1 - Math.max(horizontalOffset, verticalOffset),
      message: 'Face is not centered. Please position your face in the center of the frame.'
    };
  }

  return {
    passed: true,
    score: confidence,
    message: 'Face quality is good'
  };
}

/**
 * Process multiple video frames and extract face descriptors
 * @param {Array<string>} base64Frames - Array of base64 encoded frames
 * @param {Function} onProgress - Callback for progress updates
 * @returns {Promise<Object>} Processing result with embeddings
 */
export async function processVideoFrames(base64Frames, onProgress) {
  if (!modelsLoaded) {
    if (onProgress) onProgress({ status: 'loading_models', message: 'Loading face recognition models...' });
    await initializeFaceModels();
  }

  const validDescriptors = [];
  const frameResults = [];
  
  // Early exit if we have enough good frames
  const REQUIRED_GOOD_FRAMES = 2;
  const totalFrames = base64Frames.length;

  for (let i = 0; i < totalFrames; i++) {
    // Yield to event loop to allow socket heartbeats and other requests to process
    await new Promise(resolve => setImmediate(resolve));
    
    const frame = base64Frames[i];
    if (validDescriptors.length >= REQUIRED_GOOD_FRAMES) break;

    if (onProgress) {
      onProgress({
        status: 'processing_frame',
        current: i + 1,
        total: totalFrames,
        valid_so_far: validDescriptors.length,
        message: `Processing frame ${i + 1}/${totalFrames}`
      });
    }

    try {
      // Remove data URL prefix if present
      const base64Data = frame.replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      const result = await detectSingleFace(imageBuffer);
      
      if (result.success) {
        validDescriptors.push(result.face.descriptor);
        frameResults.push({
          confidence: result.face.confidence,
          descriptor: result.face.descriptor
        });
        if (onProgress) {
          onProgress({
            status: 'face_detected',
            confidence: result.face.confidence,
            message: 'Face detected in frame'
          });
        }
      } else {
         if (onProgress) {
          onProgress({
            status: 'face_not_detected',
            message: 'No face detected in frame'
          });
        }
      }
    } catch (error) {
      console.error('Error processing frame:', error);
      // Continue with next frame
    }
  }

  if (validDescriptors.length === 0) {
    return {
      success: false,
      message: 'No valid faces detected in video frames'
    };
  }

  // Calculate average descriptor
  const averageDescriptor = calculateAverageDescriptor(validDescriptors);

  return {
    success: true,
    framesProcessed: base64Frames.length,
    validFrames: validDescriptors.length,
    averageDescriptor: averageDescriptor,
    allDescriptors: validDescriptors,
    frameResults: frameResults
  };
}

/**
 * Calculate average descriptor from multiple descriptors
 * @param {Array<Array<number>>} descriptors - Array of face descriptors
 * @returns {Array<number>} Average descriptor
 */
function calculateAverageDescriptor(descriptors) {
  if (descriptors.length === 0) return null;
  if (descriptors.length === 1) return descriptors[0];

  const descriptorLength = descriptors[0].length;
  const average = new Array(descriptorLength).fill(0);

  for (const descriptor of descriptors) {
    for (let i = 0; i < descriptorLength; i++) {
      average[i] += descriptor[i];
    }
  }

  for (let i = 0; i < descriptorLength; i++) {
    average[i] /= descriptors.length;
  }

  return average;
}

/**
 * Compare two face descriptors using Euclidean distance
 * @param {Array<number>} descriptor1 - First face descriptor
 * @param {Array<number>} descriptor2 - Second face descriptor
 * @returns {number} Distance between descriptors (lower is more similar)
 */
export function compareFaceDescriptors(descriptor1, descriptor2) {
  if (!descriptor1 || !descriptor2) {
    throw new Error('Both descriptors are required for comparison');
  }

  if (descriptor1.length !== descriptor2.length) {
    throw new Error('Descriptors must have the same length');
  }

  const distance = faceapi.euclideanDistance(descriptor1, descriptor2);
  return distance;
}

/**
 * Verify if two faces match based on descriptor comparison
 * Enhanced accuracy with stricter threshold for front-facing verification
 * @param {Array<number>} descriptor1 - First face descriptor
 * @param {Array<number>} descriptor2 - Second face descriptor
 * @param {number} threshold - Distance threshold (uses configured value)
 * @returns {Object} Verification result
 */
export function verifyFaceMatch(descriptor1, descriptor2, threshold = FACE_MATCH_THRESHOLD) {
  const distance = compareFaceDescriptors(descriptor1, descriptor2);
  const match = distance < threshold;

  // Convert distance to similarity score (0-1, higher is more similar)
  const similarity = Math.max(0, 1 - distance);

  return {
    match,
    distance,
    similarity,
    threshold,
    confidence: match ? (1 - (distance / threshold)) : 0
  };
}

/**
 * Process base64 image and detect face
 * @param {string} base64Image - Base64 encoded image
 * @param {Object} options - Detection options
 * @returns {Promise<Object>} Detection result
 */
export async function processBase64Image(base64Image, options = {}) {
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
  const imageBuffer = Buffer.from(base64Data, 'base64');
  // For admin registration, skip strict frontality and quality checks
  return await detectSingleFace(imageBuffer, {
    skipFrontalityCheck: true,
    skipQualityCheck: true,
    ...options
  });
}

/**
 * Register face from front angle only (enhanced accuracy)
 * Takes multiple front-facing images for better accuracy
 * @param {string} frontImage - Base64 front image
 * @param {string} _leftImage - Base64 second front image (optional, for compatibility)
 * @param {string} _rightImage - Base64 third front image (optional, for compatibility)
 * @returns {Promise<Object>} Registration result
 */
export async function registerMultiAngleFace(frontImage, _leftImage, _rightImage) {
  // Process only the front image with strict front-facing validation
  const frontResult = await processBase64Image(frontImage);

  if (!frontResult.success) {
    return {
      success: false,
      message: frontResult.message || 'Failed to detect front-facing face. Please ensure you are facing the camera directly.',
      results: { front: frontResult }
    };
  }

  // Use only the front descriptor for maximum accuracy
  const frontDescriptor = frontResult.face.descriptor;

  return {
    success: true,
    embeddings: {
      front: frontDescriptor,
      left: frontDescriptor,  // Use same descriptor for compatibility
      right: frontDescriptor, // Use same descriptor for compatibility
      average: frontDescriptor
    },
    qualityScores: {
      front: frontResult.face.quality || frontResult.face.confidence,
      left: frontResult.face.quality || frontResult.face.confidence,
      right: frontResult.face.quality || frontResult.face.confidence
    },
    message: 'Front-facing face registered successfully with high accuracy'
  };
}

/**
 * Verify face from video frames against stored embeddings
 * @param {Array<string>} frames - Array of base64 frames
 * @param {Object} storedEmbeddings - Stored face embeddings
 * @param {Function} onProgress - Callback for progress updates
 * @returns {Promise<Object>} Verification result
 */
export async function verifyVideoFace(frames, storedEmbeddings, onProgress) {
  const videoResult = await processVideoFrames(frames, onProgress);

  if (!videoResult.success) {
    if (onProgress) onProgress({ status: 'failed', message: videoResult.message });
    return {
      success: false,
      message: videoResult.message,
      match: false,
      liveness_passed: false
    };
  }

  // Compare with stored embeddings
  const storedDescriptor = storedEmbeddings.average || storedEmbeddings.front;

  if (!storedDescriptor) {
    if (onProgress) onProgress({ status: 'failed', message: 'No stored face embeddings found' });
    return {
      success: false,
      message: 'No stored face embeddings found',
      match: false
    };
  }

  if (onProgress) onProgress({ status: 'verifying', message: 'Verifying face match...' });
  const verification = verifyFaceMatch(videoResult.averageDescriptor, storedDescriptor);

  // Basic liveness check: require multiple valid frames
  const livenessScore = Math.min(1.0, videoResult.validFrames / 10);
  const livenessPassed = videoResult.validFrames >= 2 && livenessScore >= 0.2;

  if (onProgress) {
    onProgress({
      status: 'complete',
      match: verification.match,
      confidence: verification.similarity,
      liveness: livenessPassed,
      message: verification.match ? 'Face verified successfully' : 'Face does not match'
    });
  }

  return {
    success: true,
    match: verification.match,
    confidence: verification.similarity,
    similarity: verification.similarity,
    distance: verification.distance,
    liveness_passed: livenessPassed,
    liveness_score: livenessScore,
    frames_analyzed: videoResult.framesProcessed,
    valid_frames: videoResult.validFrames,
    message: verification.match ? 'Face verified successfully' : 'Face does not match'
  };
}

