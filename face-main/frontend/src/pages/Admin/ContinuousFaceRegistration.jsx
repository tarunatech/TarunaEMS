import React, { useState, useRef, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/Admin/layout/AdminLayout';
import { Video, Square, Save, UserPlus, AlertCircle, CheckCircle, RotateCcw, Play, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { employeeAPI } from '../../utils/api';
import { faceAPI, CameraHelper } from '../../utils/faceAPI';

const REQUIRED_POSES = ['front', 'left', 'right'];
const MIN_RECORDING_TIME = 5000;
const MAX_RECORDING_TIME = 15000;
const FRAME_CAPTURE_INTERVAL = 200;

const POSE_INSTRUCTIONS = {
  front: { text: 'Look directly at the camera', icon: '👤' },
  left: { text: 'Turn head slightly LEFT', icon: '👈' },
  right: { text: 'Turn head slightly RIGHT', icon: '👉' },
  up: { text: 'Tilt head slightly UP', icon: '👆' },
  down: { text: 'Tilt head slightly DOWN', icon: '👇' }
};

const ContinuousFaceRegistration = () => {
  const videoRef = useRef();
  const localCameraHelper = useRef(null);
  const recordingInterval = useRef(null);
  const capturedFrames = useRef([]);
  const recordingStartTime = useRef(null);

  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [currentPose, setCurrentPose] = useState(null);
  const [detectedPoses, setDetectedPoses] = useState({ front: false, left: false, right: false });
  const [qualityFeedback, setQualityFeedback] = useState(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registrationResult, setRegistrationResult] = useState(null);

  useEffect(() => {
    fetchEmployees();
    startVideo();

    return () => {
      stopRecording();
      if (localCameraHelper.current) {
        localCameraHelper.current.stopCamera();
      }
    };
  }, []);

  const startVideo = async () => {
    try {
      setLoading(true);
      if (!localCameraHelper.current) {
        localCameraHelper.current = new CameraHelper();
      }
      await localCameraHelper.current.startCamera(videoRef.current);
      setCameraReady(true);
    } catch (error) {
      console.error('Failed to start camera:', error);
      toast.error(error.message || 'Failed to access camera');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await employeeAPI.getEmployees({ 
        limit: 100,
        status: 'Active'
      });

      const employeesData = Array.isArray(response.data.data?.employees) 
        ? response.data.data.employees 
        : [];

      setEmployees(employeesData);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to fetch employees');
      setEmployees([]);
    }
  };

  const analyzeCurrentFrame = useCallback(async () => {
    if (!cameraReady || !videoRef.current) return null;

    try {
      const imageBase64 = localCameraHelper.current.captureImage(videoRef.current);
      if (!imageBase64) return null;

      const response = await faceAPI.analyzeFrameBase64(imageBase64);
      
      if (response.data.success && response.data.face_detected) {
        const detectedPose = response.data.angle_estimate || 'front';
        setCurrentPose(detectedPose);
        setQualityFeedback({
          passed: response.data.quality.passed,
          score: response.data.quality.score,
          issues: response.data.quality.issues || [],
          pose: detectedPose
        });

        if (response.data.quality.passed || response.data.quality.score >= 0.6) {
          setDetectedPoses(prev => ({
            ...prev,
            [detectedPose]: true
          }));
        }

        return { imageBase64, pose: detectedPose, quality: response.data.quality };
      } else {
        setCurrentPose(null);
        setQualityFeedback({
          passed: false,
          score: 0,
          issues: [response.data.message || 'No face detected'],
          pose: null
        });
        return null;
      }
    } catch (error) {
      console.error('Frame analysis error:', error);
      return null;
    }
  }, [cameraReady]);

  const startRecording = useCallback(async () => {
    if (!cameraReady || !selectedEmployee) {
      toast.error('Please select an employee and ensure camera is ready');
      return;
    }

    setIsRecording(true);
    setDetectedPoses({ front: false, left: false, right: false });
    capturedFrames.current = [];
    recordingStartTime.current = Date.now();
    setRecordingProgress(0);

    toast.success('Recording started! Move your head slowly: front, left, right');

    recordingInterval.current = setInterval(async () => {
      const elapsed = Date.now() - recordingStartTime.current;
      const progress = Math.min(100, (elapsed / MAX_RECORDING_TIME) * 100);
      setRecordingProgress(progress);

      if (!videoRef.current || !localCameraHelper.current) return;

      try {
        const imageBase64 = localCameraHelper.current.captureImage(videoRef.current);
        if (imageBase64) {
          capturedFrames.current.push(imageBase64);
        }
      } catch (e) {
        console.error('Frame capture error:', e);
      }

      try {
        const response = await faceAPI.analyzeFrameBase64(
          localCameraHelper.current.captureImage(videoRef.current)
        );
        
        if (response.data.success && response.data.face_detected) {
          const pose = response.data.angle_estimate || 'front';
          setCurrentPose(pose);
          setQualityFeedback({
            passed: response.data.quality.passed,
            score: response.data.quality.score,
            issues: response.data.quality.issues || [],
            pose
          });
          
          if (response.data.quality.passed || response.data.quality.score >= 0.6) {
            setDetectedPoses(prev => ({ ...prev, [pose]: true }));
          }
        }
      } catch (e) {
        console.error('Analysis error:', e);
      }

      if (elapsed >= MAX_RECORDING_TIME) {
        stopRecording();
      }
    }, FRAME_CAPTURE_INTERVAL);
  }, [cameraReady, selectedEmployee]);

  const stopRecording = useCallback(() => {
    if (recordingInterval.current) {
      clearInterval(recordingInterval.current);
      recordingInterval.current = null;
    }
    
    if (!isRecording) return;

    const elapsed = Date.now() - (recordingStartTime.current || Date.now());
    
    if (elapsed < MIN_RECORDING_TIME) {
      toast.error('Recording too short. Please record for at least 5 seconds.');
      setIsRecording(false);
      capturedFrames.current = [];
      return;
    }

    setIsRecording(false);
    setRecordingProgress(100);
    
    const allPosesCaptured = REQUIRED_POSES.every(pose => detectedPoses[pose]);
    
    if (!allPosesCaptured && capturedFrames.current.length > 20) {
      toast('Processing video... We will check all poses automatically.', { icon: '🎬' });
    }

    if (capturedFrames.current.length >= 10) {
      processRecording();
    } else {
      toast.error('Not enough frames captured. Please try again.');
      capturedFrames.current = [];
    }
  }, [isRecording, detectedPoses]);

  const processRecording = async () => {
    if (capturedFrames.current.length < 10) {
      toast.error('Not enough frames captured');
      return;
    }

    setIsProcessing(true);
    
    try {
      const response = await faceAPI.registerContinuousVideo(
        selectedEmployee._id,
        capturedFrames.current
      );

      if (response.data.success) {
        setRegistrationComplete(true);
        setRegistrationResult(response.data);
        toast.success('Face registered successfully!');
        fetchEmployees();
      } else {
        toast.error(response.data.message || 'Registration failed');
        
        if (response.data.poses_captured) {
          setDetectedPoses(response.data.poses_captured);
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to process video';
      toast.error(errorMsg);
    } finally {
      setIsProcessing(false);
      capturedFrames.current = [];
    }
  };

  const resetRegistration = () => {
    setSelectedEmployee(null);
    setIsRecording(false);
    setRecordingProgress(0);
    setCurrentPose(null);
    setDetectedPoses({ front: false, left: false, right: false });
    setQualityFeedback(null);
    setRegistrationComplete(false);
    setRegistrationResult(null);
    capturedFrames.current = [];
    
    if (recordingInterval.current) {
      clearInterval(recordingInterval.current);
      recordingInterval.current = null;
    }
  };

  const getMissingPoses = () => {
    return REQUIRED_POSES.filter(pose => !detectedPoses[pose]);
  };

  const getNextPoseInstruction = () => {
    const missing = getMissingPoses();
    if (missing.length === 0) return null;
    return POSE_INSTRUCTIONS[missing[0]];
  };

  return (
    <AdminLayout>
      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="glass-morphism neon-border rounded-2xl p-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            Continuous Video <span className="neon-text">Face Registration</span>
          </h1>
          <p className="text-secondary-400">
            Record a single continuous video - the system automatically captures all required poses
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="glass-morphism neon-border rounded-2xl p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-4">Select Employee</h2>
            <div className="space-y-3 max-h-64 sm:max-h-96 overflow-y-auto">
              {employees.length === 0 ? (
                <p className="text-secondary-400 text-center py-4">No active employees found</p>
              ) : (
                employees.map(employee => (
                  <div
                    key={employee._id}
                    onClick={() => {
                      if (!isRecording && !isProcessing) {
                        setSelectedEmployee(employee);
                        resetRegistration();
                        setSelectedEmployee(employee);
                      }
                    }}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedEmployee?._id === employee._id
                        ? 'bg-neon-pink/20 border border-neon-pink'
                        : 'bg-secondary-800/50 hover:bg-secondary-700'
                    } ${isRecording || isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-neon-pink to-neon-purple rounded-lg flex items-center justify-center">
                        {employee.hasFaceRegistered ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <UserPlus className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">
                          {employee.personalInfo?.firstName} {employee.personalInfo?.lastName}
                        </p>
                        <p className="text-xs text-secondary-400">
                          ID: {employee.employeeId}
                        </p>
                        {employee.hasFaceRegistered && (
                          <p className="text-xs text-green-400">Face registered</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="glass-morphism neon-border rounded-2xl p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Continuous Video Capture</h2>
              {selectedEmployee && !isRecording && !isProcessing && (
                <button
                  onClick={resetRegistration}
                  className="px-3 py-1 text-sm text-secondary-400 hover:text-white flex items-center space-x-1"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {!selectedEmployee ? (
              <div className="text-center py-12 text-secondary-400">
                <UserPlus className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Select an employee to begin face registration</p>
              </div>
            ) : registrationComplete ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
                <h3 className="text-xl font-bold text-white mb-2">Registration Complete!</h3>
                <p className="text-secondary-400 mb-4">
                  Face has been registered for {selectedEmployee.personalInfo?.firstName} {selectedEmployee.personalInfo?.lastName}
                </p>
                {registrationResult && (
                  <div className="bg-secondary-800/50 rounded-lg p-4 mb-4 text-left max-w-md mx-auto">
                    <p className="text-sm text-secondary-300 mb-2">Registration Details:</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-secondary-400">Frames Processed:</span>
                      <span className="text-white">{registrationResult.total_frames_processed}</span>
                      <span className="text-secondary-400">Liveness Score:</span>
                      <span className="text-green-400">{(registrationResult.liveness_score * 100).toFixed(1)}%</span>
                      <span className="text-secondary-400">Poses Captured:</span>
                      <span className="text-white">
                        {Object.entries(registrationResult.poses_captured || {})
                          .filter(([_, v]) => v)
                          .map(([k]) => k)
                          .join(', ')}
                      </span>
                    </div>
                  </div>
                )}
                <button
                  onClick={resetRegistration}
                  className="px-6 py-2 bg-neon-pink/20 text-neon-pink rounded-lg hover:bg-neon-pink/30 transition-colors"
                >
                  Register Another Employee
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <div className="flex justify-center space-x-6 mb-4">
                    {REQUIRED_POSES.map((pose) => (
                      <div
                        key={pose}
                        className={`flex flex-col items-center transition-all ${
                          currentPose === pose ? 'scale-110' : ''
                        }`}
                      >
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all ${
                          detectedPoses[pose]
                            ? 'bg-green-500/20 border-green-500'
                            : currentPose === pose
                            ? 'bg-neon-pink/30 border-neon-pink animate-pulse'
                            : 'bg-secondary-800 border-secondary-600'
                        }`}>
                          {detectedPoses[pose] ? (
                            <CheckCircle className="w-7 h-7 text-green-400" />
                          ) : (
                            <span className="text-2xl">{POSE_INSTRUCTIONS[pose].icon}</span>
                          )}
                        </div>
                        <span className={`text-xs mt-1 capitalize ${
                          currentPose === pose ? 'text-neon-pink font-bold' : 'text-secondary-400'
                        }`}>{pose}</span>
                      </div>
                    ))}
                  </div>
                  
                  {isRecording && (
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-secondary-400 mb-1">
                        <span>Recording Progress</span>
                        <span>{Math.round(recordingProgress)}%</span>
                      </div>
                      <div className="h-2 bg-secondary-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-neon-pink to-neon-purple transition-all duration-200"
                          style={{ width: `${recordingProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {isRecording && getNextPoseInstruction() && (
                    <div className="text-center mb-4 p-3 bg-neon-pink/10 rounded-lg animate-pulse">
                      <p className="text-white font-medium">
                        <span className="text-2xl mr-2">{getNextPoseInstruction().icon}</span>
                        {getNextPoseInstruction().text}
                      </p>
                    </div>
                  )}
                  
                  {isRecording && getMissingPoses().length === 0 && (
                    <div className="text-center mb-4 p-3 bg-green-500/20 rounded-lg">
                      <p className="text-green-400 font-medium">
                        All poses captured! You can stop recording now.
                      </p>
                    </div>
                  )}
                </div>

                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    width="640"
                    height="480"
                    className="w-full"
                    autoPlay
                    muted
                    playsInline
                    style={{ objectFit: 'cover', transform: 'scaleX(-1)' }}
                  />

                  {loading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-white text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-pink mx-auto mb-2"></div>
                        <p>Starting camera...</p>
                      </div>
                    </div>
                  )}

                  {isProcessing && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <div className="text-white text-center">
                        <Loader2 className="w-12 h-12 mx-auto mb-3 animate-spin text-neon-pink" />
                        <p className="text-lg font-medium">Processing video...</p>
                        <p className="text-sm text-secondary-400">Analyzing faces and checking liveness</p>
                      </div>
                    </div>
                  )}

                  {isRecording && (
                    <div className="absolute top-4 left-4 flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-white font-medium">RECORDING</span>
                    </div>
                  )}

                  {qualityFeedback && !isProcessing && (
                    <div className={`absolute top-4 right-4 p-3 rounded-lg ${
                      qualityFeedback.passed ? 'bg-green-500/80' : 'bg-yellow-500/80'
                    }`}>
                      <p className="text-white text-sm font-medium">
                        {qualityFeedback.passed ? 'Good quality!' : 'Adjust position'}
                      </p>
                      {qualityFeedback.issues?.length > 0 && (
                        <p className="text-white text-xs mt-1">{qualityFeedback.issues[0]}</p>
                      )}
                      {qualityFeedback.pose && (
                        <p className="text-white text-xs mt-1">
                          Detected: <span className="font-bold capitalize">{qualityFeedback.pose}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-center mt-6 space-x-4">
                  {!isRecording ? (
                    <button
                      onClick={startRecording}
                      disabled={!cameraReady || isProcessing}
                      className="px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-xl flex items-center space-x-3 disabled:opacity-50 hover-glow transition-all duration-300"
                    >
                      <Play className="w-6 h-6" />
                      <span>Start Recording</span>
                    </button>
                  ) : (
                    <button
                      onClick={stopRecording}
                      className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl flex items-center space-x-3 hover-glow transition-all duration-300"
                    >
                      <Square className="w-6 h-6" />
                      <span>Stop Recording</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="glass-morphism neon-border rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-neon-pink/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-neon-pink font-bold">1</span>
              </div>
              <div>
                <p className="text-white font-medium">Start Recording</p>
                <p className="text-secondary-400">Click the button to begin single continuous video capture</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-neon-pink/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-neon-pink font-bold">2</span>
              </div>
              <div>
                <p className="text-white font-medium">Move Naturally</p>
                <p className="text-secondary-400">Slowly turn your head front, left, and right while recording</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-neon-pink/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-neon-pink font-bold">3</span>
              </div>
              <div>
                <p className="text-white font-medium">Stop Recording</p>
                <p className="text-secondary-400">Click stop when all pose indicators turn green</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-neon-pink/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-neon-pink font-bold">4</span>
              </div>
              <div>
                <p className="text-white font-medium">Auto Processing</p>
                <p className="text-secondary-400">System analyzes video, extracts best frames, and registers face</p>
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-blue-300 text-sm">
                The continuous video capture includes automatic liveness detection and anti-spoofing checks, 
                ensuring only real faces from live video are registered. No photos or videos can bypass this system.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ContinuousFaceRegistration;
