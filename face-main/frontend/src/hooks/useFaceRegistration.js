// hooks/useFaceRegistration.js - Custom React hook for face registration

import { useState, useEffect, useRef, useCallback } from 'react';
import { FaceRegistrationWorkflow, faceAPI } from '../utils/faceAPI';
import toast from 'react-hot-toast';

export const useFaceRegistration = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedFaceData, setCapturedFaceData] = useState(null);
  const [error, setError] = useState(null);
  
  const videoRef = useRef();
  const canvasRef = useRef();
  const workflowRef = useRef();

  // Initialize face registration workflow
  const initialize = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) {
      setError('Video or canvas element not available');
      return false;
    }

    try {
      setError(null);
      workflowRef.current = new FaceRegistrationWorkflow();
      
      await workflowRef.current.initialize(
        videoRef.current,
        canvasRef.current,
        {
          onFaceDetected: (detections) => {
            setFaceDetected(true);
          },
          onNoFaceDetected: () => {
            setFaceDetected(false);
          }
        }
      );

      setIsInitialized(true);
      return true;
    } catch (error) {
      console.error('Face registration initialization error:', error);
      setError(error.message);
      toast.error(`Camera initialization failed: ${error.message}`);
      return false;
    }
  }, []);

  // Capture face data
  const captureFace = useCallback(async () => {
    if (!workflowRef.current || !videoRef.current) {
      toast.error('Face registration not initialized');
      return null;
    }

    if (!faceDetected) {
      toast.error('No face detected. Please position your face in the frame.');
      return null;
    }

    setIsCapturing(true);
    setError(null);

    try {
      const faceData = await workflowRef.current.captureFaceData(videoRef.current);
      setCapturedFaceData(faceData);
      toast.success('Face captured successfully!');
      return faceData;
    } catch (error) {
      console.error('Face capture error:', error);
      setError(error.message);
      toast.error(`Face capture failed: ${error.message}`);
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, [faceDetected]);

  // Reset captured data and restart detection
  const reset = useCallback(() => {
    setCapturedFaceData(null);
    setError(null);
    if (workflowRef.current) {
      // Restart detection if already initialized
      initialize();
    }
  }, [initialize]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (workflowRef.current) {
        workflowRef.current.cleanup();
      }
    };
  }, []);

  return {
    // Refs
    videoRef,
    canvasRef,
    
    // State
    isInitialized,
    faceDetected,
    isCapturing,
    capturedFaceData,
    error,
    
    // Actions
    initialize,
    captureFace,
    reset
  };
};

// Enhanced Employee Form Component with Face Registration
// Replace the simulation code in your component with this:

/*
Usage in your EmployeeManagement component:

import { useFaceRegistration } from '../hooks/useFaceRegistration';

// Inside your component:
const {
  videoRef,
  canvasRef,
  isInitialized,
  faceDetected,
  isCapturing,
  capturedFaceData,
  error,
  initialize,
  captureFace,
  reset
} = useFaceRegistration();

// Replace the existing face detection setup with:
useEffect(() => {
  if (showAddModal && currentStep === 2 && faceRegistrationEnabled) {
    initialize();
  }
}, [showAddModal, currentStep, faceRegistrationEnabled, initialize]);

// Replace the captureFaceData function with:
const handleCaptureFace = async () => {
  const faceData = await captureFace();
  if (faceData) {
    setCapturedFaceData(faceData);
  }
};

// Update your video/canvas JSX:
<video
  ref={videoRef}
  width="640"
  height="480"
  className="w-full h-full object-cover"
  autoPlay
  muted
  playsInline
/>
<canvas
  ref={canvasRef}
  width="640"
  height="480"
  className="absolute top-0 left-0 w-full h-full"
/>

// Replace the capture button onClick with:
onClick={handleCaptureFace}
disabled={!faceDetected || isCapturing || !isInitialized}

// Replace the status indicator with:
<div className={`w-3 h-3 rounded-full ${faceDetected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
<span className="text-sm text-secondary-400">
  {error ? `Error: ${error}` : 
   !isInitialized ? 'Initializing camera...' :
   faceDetected ? 'Face detected - Ready to capture' : 
   'No face detected - Position face in frame'}
</span>
*/