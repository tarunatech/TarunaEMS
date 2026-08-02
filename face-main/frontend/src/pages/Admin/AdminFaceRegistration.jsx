import React, { useState, useRef, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/Admin/layout/AdminLayout';
import { Camera, Save, UserPlus, AlertCircle, CheckCircle, RotateCcw, ArrowLeft, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { employeeAPI } from '../../utils/api';
import { faceAPI, CameraHelper } from '../../utils/faceAPI';

const ANGLES = ['front'];
const ANGLE_INSTRUCTIONS = {
  front: 'Look straight ahead at the camera. Keep your head level and face the camera directly.'
};

const AdminFaceRegistration = () => {
  const videoRef = useRef();
  const localCameraHelper = useRef(null);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [currentAngleIndex, setCurrentAngleIndex] = useState(0);
  const [capturedImages, setCapturedImages] = useState({ front: null });
  const [qualityFeedback, setQualityFeedback] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);

  const currentAngle = ANGLES[currentAngleIndex];

  useEffect(() => {
    fetchEmployees();
    startVideo();

    return () => {
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
    if (!cameraReady || !videoRef.current || isAnalyzing) return;

    setIsAnalyzing(true);
    try {
      const imageBase64 = localCameraHelper.current.captureImage(videoRef.current);
      if (!imageBase64) return;

      const response = await faceAPI.analyzeFrameBase64(imageBase64);
      
      if (response.data.success && response.data.face_detected) {
        setQualityFeedback({
          passed: response.data.quality.passed,
          score: response.data.quality.score,
          issues: response.data.quality.issues || [],
          angle: response.data.angle_estimate
        });
      } else {
        setQualityFeedback({
          passed: false,
          score: 0,
          issues: [response.data.message || 'No face detected'],
          angle: null
        });
      }
    } catch (error) {
      console.error('Frame analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [cameraReady, isAnalyzing]);

  useEffect(() => {
    if (!selectedEmployee || !cameraReady) return;
    
    const interval = setInterval(analyzeCurrentFrame, 1000);
    return () => clearInterval(interval);
  }, [selectedEmployee, cameraReady, analyzeCurrentFrame]);

  const captureCurrentAngle = async () => {
    if (!cameraReady || !videoRef.current) {
      toast.error('Camera not ready');
      return;
    }

    const imageBase64 = localCameraHelper.current.captureImage(videoRef.current);
    if (!imageBase64) {
      toast.error('Failed to capture image');
      return;
    }

    try {
      const response = await faceAPI.analyzeFrameBase64(imageBase64);
      
      if (!response.data.success || !response.data.face_detected) {
        toast.error(response.data.message || 'No face detected. Please try again.');
        return;
      }

      if (!response.data.quality.passed && response.data.quality.score < 0.5) {
        toast.error('Image quality too low. Please improve lighting and positioning.');
        return;
      }

      setCapturedImages(prev => ({ ...prev, [currentAngle]: imageBase64 }));
      toast.success(`${currentAngle.charAt(0).toUpperCase() + currentAngle.slice(1)} angle captured!`);

      if (currentAngleIndex < ANGLES.length - 1) {
        setCurrentAngleIndex(prev => prev + 1);
      }
    } catch (error) {
      console.error('Capture error:', error);
      toast.error('Failed to capture image');
    }
  };

  const retakeCurrentAngle = () => {
    setCapturedImages(prev => ({ ...prev, [currentAngle]: null }));
    setQualityFeedback(null);
  };

  const handleRegisterFace = async () => {
    if (!selectedEmployee) {
      toast.error('Please select an employee');
      return;
    }

    if (!capturedImages.front) {
      toast.error('Please capture a front-facing image before registering');
      return;
    }

    setIsRegistering(true);
    try {
      const response = await faceAPI.registerMultiAngleFace(
        selectedEmployee._id,
        capturedImages.front,
        capturedImages.front,  // Use same front image for compatibility
        capturedImages.front   // Use same front image for compatibility
      );

      if (response.data.success) {
        toast.success('Face registered successfully!');
        setRegistrationComplete(true);
        fetchEmployees();
      } else {
        toast.error(response.data.message || 'Failed to register face');
      }
    } catch (error) {
      console.error('Error registering face:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to register face';
      toast.error(errorMsg);
    } finally {
      setIsRegistering(false);
    }
  };

  const resetRegistration = () => {
    setSelectedEmployee(null);
    setCapturedImages({ front: null });
    setCurrentAngleIndex(0);
    setQualityFeedback(null);
    setRegistrationComplete(false);
  };

  const allAnglesCaptured = capturedImages.front;

  return (
    <AdminLayout>
      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="glass-morphism neon-border rounded-2xl p-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            Face <span className="neon-text">Registration</span>
          </h1>
          <p className="text-secondary-400">Register employee faces with high-accuracy front-facing capture for secure attendance verification</p>
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
                      if (!isRegistering) {
                        setSelectedEmployee(employee);
                        setCapturedImages({ front: null });
                        setCurrentAngleIndex(0);
                        setRegistrationComplete(false);
                      }
                    }}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedEmployee?._id === employee._id
                        ? 'bg-neon-pink/20 border border-neon-pink'
                        : 'bg-secondary-800/50 hover:bg-secondary-700'
                    } ${isRegistering ? 'opacity-50 cursor-not-allowed' : ''}`}
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
              <h2 className="text-xl font-bold text-white">Front-Facing Face Capture</h2>
              {selectedEmployee && (
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
                  <div className="flex justify-center space-x-4 mb-4">
                    {ANGLES.map((angle, index) => (
                      <div
                        key={angle}
                        onClick={() => setCurrentAngleIndex(index)}
                        className={`flex flex-col items-center cursor-pointer ${
                          index === currentAngleIndex ? 'opacity-100' : 'opacity-50'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                          capturedImages[angle]
                            ? 'bg-green-500/20 border-green-500'
                            : index === currentAngleIndex
                            ? 'bg-neon-pink/20 border-neon-pink'
                            : 'bg-secondary-800 border-secondary-600'
                        }`}>
                          {capturedImages[angle] ? (
                            <CheckCircle className="w-6 h-6 text-green-400" />
                          ) : (
                            <span className="text-white font-bold">{index + 1}</span>
                          )}
                        </div>
                        <span className="text-xs text-secondary-400 mt-1 capitalize">{angle}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="text-center mb-4 p-3 bg-neon-pink/10 rounded-lg">
                    <p className="text-white font-medium">Step {currentAngleIndex + 1} of 3: {ANGLE_INSTRUCTIONS[currentAngle]}</p>
                  </div>
                </div>

                <div className="relative bg-black rounded-lg overflow-hidden">
                  {capturedImages[currentAngle] ? (
                    <img 
                      src={capturedImages[currentAngle]} 
                      alt={`Captured ${currentAngle}`}
                      className="w-full"
                      style={{ transform: 'scaleX(-1)' }}
                    />
                  ) : (
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
                  )}

                  {loading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-white text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-pink mx-auto mb-2"></div>
                        <p>Starting camera...</p>
                      </div>
                    </div>
                  )}

                  {qualityFeedback && !capturedImages[currentAngle] && (
                    <div className={`absolute top-2 right-2 p-2 rounded-lg ${
                      qualityFeedback.passed ? 'bg-green-500/80' : 'bg-red-500/80'
                    }`}>
                      <p className="text-white text-sm font-medium">
                        {qualityFeedback.passed ? 'Ready to capture' : 'Adjust position'}
                      </p>
                      {qualityFeedback.issues.length > 0 && (
                        <p className="text-white text-xs">{qualityFeedback.issues[0]}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4">
                  <button
                    onClick={() => setCurrentAngleIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentAngleIndex === 0}
                    className="px-4 py-2 bg-secondary-700 text-white rounded-lg flex items-center space-x-2 disabled:opacity-50"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>

                  {capturedImages[currentAngle] ? (
                    <button
                      onClick={retakeCurrentAngle}
                      className="px-6 py-3 bg-yellow-600 text-white font-semibold rounded-lg flex items-center space-x-2"
                    >
                      <RotateCcw className="w-5 h-5" />
                      <span>Retake</span>
                    </button>
                  ) : (
                    <button
                      onClick={captureCurrentAngle}
                      disabled={!cameraReady}
                      className="px-6 py-3 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-semibold rounded-lg flex items-center space-x-2 disabled:opacity-50"
                    >
                      <Camera className="w-5 h-5" />
                      <span>Capture {currentAngle.charAt(0).toUpperCase() + currentAngle.slice(1)}</span>
                    </button>
                  )}

                  <button
                    onClick={() => setCurrentAngleIndex(prev => Math.min(ANGLES.length - 1, prev + 1))}
                    disabled={currentAngleIndex === ANGLES.length - 1}
                    className="px-4 py-2 bg-secondary-700 text-white rounded-lg flex items-center space-x-2 disabled:opacity-50"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {allAnglesCaptured && (
                  <button
                    onClick={handleRegisterFace}
                    disabled={isRegistering}
                    className="w-full mt-4 px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg hover-glow transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <Save className="w-5 h-5" />
                    <span>{isRegistering ? 'Registering...' : 'Complete Registration'}</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="glass-morphism neon-border rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Multi-Angle Registration Instructions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start space-x-2">
              <div className="w-8 h-8 bg-neon-pink/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-neon-pink font-bold">1</span>
              </div>
              <div>
                <p className="text-white font-medium">Front View</p>
                <p className="text-secondary-400">Look directly at the camera with a neutral expression</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-8 h-8 bg-neon-pink/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-neon-pink font-bold">2</span>
              </div>
              <div>
                <p className="text-white font-medium">Left Turn</p>
                <p className="text-secondary-400">Turn your head slightly to the left while facing camera</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-8 h-8 bg-neon-pink/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-neon-pink font-bold">3</span>
              </div>
              <div>
                <p className="text-white font-medium">Right Turn</p>
                <p className="text-secondary-400">Turn your head slightly to the right while facing camera</p>
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-blue-300 text-sm">
                Multi-angle capture ensures more reliable face recognition during attendance verification, reducing false rejections and improving security.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminFaceRegistration;
