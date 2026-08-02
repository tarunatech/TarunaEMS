import api from './api';

export const faceAPI = {
  saveEmployeeFace: async (employeeId, imageBlob) => {
    try {
      const formData = new FormData();
      formData.append('employeeId', employeeId);
      formData.append('file', imageBlob, 'face.jpg');

      return await api.post('/face-detection/save-face', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    } catch (error) {
      console.error('Error saving face data:', error);
      throw error;
    }
  },

  registerMultiAngleFace: async (employeeId, frontImage, leftImage, rightImage) => {
    try {
      return await api.post('/face-detection/register-multi-angle', {
        employeeId,
        frontImage,
        leftImage,
        rightImage
      });
    } catch (error) {
      console.error('Error registering multi-angle face:', error);
      throw error;
    }
  },

  analyzeFrameBase64: async (imageBase64) => {
    try {
      console.log('faceAPI.analyzeFrameBase64 called, image size:', imageBase64.length);
      return await api.post('/face-detection/analyze-frame-base64', {
        image: imageBase64
      }, {
        timeout: 120000, // 120 second timeout for face analysis
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Error analyzing frame:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data
      });
      throw error;
    }
  },

  getEmployeeFace: async (employeeId) => {
    return await api.get(`/face-detection/employee/${employeeId}`);
  },

  verifyFaceAttendance: async (imageBlob, location) => {
    try {
      const formData = new FormData();
      formData.append('file', imageBlob, 'face.jpg');
      formData.append('location', JSON.stringify(location));

      console.log('Verifying face attendance, image size:', imageBlob.size, 'bytes');

      return await api.post('/face-detection/verify-attendance', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000 // 60 second timeout (account for server cold starts)
      });
    } catch (error) {
      console.error('Error verifying face:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data
      });
      throw error;
    }
  },

  verifyVideoFace: async (frames, location) => {
    try {
      return await api.post(
        '/face-detection/verify-video',
        { frames, location },
        { timeout: 90000 }
      );
    } catch (error) {
      console.error('Error verifying video face:', error);
      throw error;
    }
  },

  checkLiveness: async (frames) => {
    try {
      return await api.post('/face-detection/check-liveness', { frames }, { timeout: 60000 });
    } catch (error) {
      console.error('Error checking liveness:', error);
      throw error;
    }
  },

  registerContinuousVideo: async (employeeId, frames) => {
    try {
      return await api.post('/face-detection/register-continuous-video', {
        employeeId,
        frames
      });
    } catch (error) {
      console.error('Error registering continuous video:', error);
      throw error;
    }
  },

  verifyLiveVideo: async (frames, location) => {
    try {
      return await api.post(
        '/face-detection/verify-live-video',
        { frames, location },
        { timeout: 120000 }
      );
    } catch (error) {
      console.error('Error verifying live video:', error);
      throw error;
    }
  },

  deleteEmployeeFace: async (employeeId) => {
    return await api.delete(`/face-detection/employee/${employeeId}`);
  },

  getEmployeesWithoutFace: async () => {
    return await api.get('/face-detection/employees-without-face');
  },

  detectFaces: async (imageBlob) => {
    try {
      const formData = new FormData();
      formData.append('file', imageBlob, 'face.jpg');

      return await api.post('/face-detection/detect', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    } catch (error) {
      console.error('Error detecting faces:', error);
      throw error;
    }
  }
};

export class CameraHelper {
  constructor() {
    this.stream = null;
    this.videoElement = null;
  }

  async startCamera(videoElement, constraints = {}) {
    if (!videoElement) throw new Error('videoElement is required');

    videoElement.autoplay = true;
    videoElement.muted = true;
    videoElement.playsInline = true;

    const defaultConstraints = {
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user',
        frameRate: { ideal: 30 }
      },
      audio: false
    };

    const merged = {
      video: { ...defaultConstraints.video, ...(constraints.video || {}) },
      audio: constraints.audio ?? defaultConstraints.audio
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(merged);
      this.videoElement = videoElement;
      videoElement.srcObject = this.stream;

      await videoElement.play().catch(err => {
        console.warn('videoElement.play() failed:', err);
      });

      console.log('Camera started');
      return true;
    } catch (error) {
      console.error('Camera access error:', error);
      if (error.name === 'NotAllowedError') {
        throw new Error('Camera permission denied. Please allow camera access.');
      } else if (error.name === 'NotFoundError') {
        throw new Error('No camera device found.');
      } else if (error.name === 'NotReadableError') {
        throw new Error('Camera is in use by another application.');
      }
      throw error;
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
  }

  captureImage(videoElement) {
    if (!videoElement) return null;
    
    // Force resizing to max 640x480 for performance
    const MAX_WIDTH = 640;
    const MAX_HEIGHT = 480;

    let width = videoElement.videoWidth || 640;
    let height = videoElement.videoHeight || 480;
    
    // Maintain aspect ratio while resizing
    if (width > MAX_WIDTH || height > MAX_HEIGHT) {
      const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
      width = width * ratio;
      height = height * ratio;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, width, height);
    
    // Reduce quality slightly for faster transmission
    return canvas.toDataURL('image/jpeg', 0.8);
  }

  async captureImageBlob(videoElement) {
    if (!videoElement) return null;
    
    // Force resizing to max 640x480 for performance
    const MAX_WIDTH = 640;
    const MAX_HEIGHT = 480;

    let width = videoElement.videoWidth || 640;
    let height = videoElement.videoHeight || 480;
    
    // Maintain aspect ratio while resizing
    if (width > MAX_WIDTH || height > MAX_HEIGHT) {
      const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
      width = width * ratio;
      height = height * ratio;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, width, height);
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.8);
    });
  }

  captureMultipleFrames(videoElement, count = 5, intervalMs = 200) {
    return new Promise((resolve) => {
      const frames = [];
      let captured = 0;
      
      const captureFrame = () => {
        if (captured >= count) {
          resolve(frames);
          return;
        }
        
        const image = this.captureImage(videoElement);
        if (image) {
          frames.push(image);
          captured++;
        }
        
        if (captured < count) {
          setTimeout(captureFrame, intervalMs);
        } else {
          resolve(frames);
        }
      };
      
      captureFrame();
    });
  }
}

export const cameraHelper = new CameraHelper();

export default {
  faceAPI,
  CameraHelper,
  cameraHelper
};
