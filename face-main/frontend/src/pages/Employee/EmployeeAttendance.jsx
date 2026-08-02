import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import EmployeeLayout from '../../components/Employee/EmployeeLayout/EmployeeLayout';
import {
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Timer,
  TrendingUp,
  Camera,
  ShieldCheck,
  X,
  Video,
  Loader2,
  CalendarX
} from 'lucide-react';
import toast from 'react-hot-toast';
import { attendanceAPI, geolocationUtils, OFFICE_LOCATION } from '../../utils/attendanceAPI';
import { faceAPI, CameraHelper } from '../../utils/faceAPI';

const EmployeeAttendance = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [hasCheckedOut, setHasCheckedOut] = useState(false);
  const [workingTime, setWorkingTime] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [realTimeWorkingTime, setRealTimeWorkingTime] = useState(0);

  const [showFaceVerification, setShowFaceVerification] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [livenessMessage, setLivenessMessage] = useState('');

  const videoRef = useRef(null);
  const localCameraHelper = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // Socket connection for real-time progress
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://face-votd.onrender.com';
    const token = localStorage.getItem('token');

    if (token && !socketRef.current) {
      socketRef.current = io(`${SOCKET_URL}/employee`, {
        auth: { token },
        transports: ['websocket', 'polling']
      });

      socketRef.current.on('connect', () => {
        console.log('Socket connected for attendance progress');
      });

      socketRef.current.on('face:verification:progress', (data) => {
        console.log('Progress:', data);
        if (data.message) setLivenessMessage(data.message);

        // Map status/progress to percentage
        if (data.status === 'loading_models') setVerificationProgress(10);
        else if (data.status === 'processing_frame') {
          // 10% to 60% for frame processing
          const percentage = 10 + Math.floor((data.current / data.total) * 50);
          setVerificationProgress(percentage);
        }
        else if (data.status === 'verifying') setVerificationProgress(70);
        else if (data.status === 'complete') setVerificationProgress(100);
        else if (data.status === 'failed') setVerificationProgress(100);
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchTodayAttendance();
    fetchAttendanceHistory();
  }, []);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  useEffect(() => {
    let interval;
    if (hasCheckedIn && !hasCheckedOut && todayAttendance?.checkInTime) {
      interval = setInterval(() => {
        const checkInTime = new Date(todayAttendance.checkInTime);
        const now = new Date();
        const diffMs = now - checkInTime;
        const minutes = Math.floor(diffMs / (1000 * 60));
        setRealTimeWorkingTime(minutes);
      }, 1000);
    } else {
      setRealTimeWorkingTime(0);
    }
    return () => clearInterval(interval);
  }, [hasCheckedIn, hasCheckedOut, todayAttendance]);

  const startCamera = async () => {
    try {
      if (!localCameraHelper.current) {
        localCameraHelper.current = new CameraHelper();
      }

      // Wait for video element to be ready
      if (!videoRef.current) {
        // Wait a bit for the video element to mount
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (!videoRef.current) {
        throw new Error('Video element not available. Please try again.');
      }

      await localCameraHelper.current.startCamera(videoRef.current);
      setCameraReady(true);
    } catch (error) {
      console.error('Camera error:', error);
      toast.error(error.message || 'Failed to access camera');
    }
  };

  const stopCamera = useCallback(() => {
    if (localCameraHelper.current) {
      localCameraHelper.current.stopCamera();
    }
    setCameraReady(false);
  }, []);

  const captureVideoFramesAndVerify = async () => {
    if (!cameraReady || !videoRef.current) {
      toast.error('Camera not ready. Please wait.');
      return;
    }

    setIsVerifying(true);
    setVerificationStatus(null);
    setVerificationProgress(0);
    setLivenessMessage('Starting video verification...');

    try {
      setVerificationProgress(5);
      setLivenessMessage('Capturing video frames...');

      // Capture 5 frames with 200ms interval for video verification
      const frames = await localCameraHelper.current.captureMultipleFrames(videoRef.current, 5, 200);

      if (!frames || frames.length === 0) {
        toast.error('Failed to capture video frames. Please try again.');
        setIsVerifying(false);
        return;
      }

      setVerificationProgress(10);
      setLivenessMessage('Processing video...');

      // Use video-based verification
      const response = await faceAPI.verifyLiveVideo(frames, currentLocation);

      // Final progress update is handled by socket, but ensure 100% on return
      setVerificationProgress(100);

      if (response.data.success) {
        setVerificationStatus('success');
        setLivenessMessage('Verification successful!');
        toast.success('Face verified! Marking attendance...');

        const checkInResponse = await attendanceAPI.checkIn({
          location: currentLocation,
          deviceInfo: geolocationUtils.getDeviceInfo(),
          notes: 'Check-in via video face verification',
          faceVerified: true,
          livenessScore: response.data.verification?.livenessScore || response.data.liveness_score
        });

        if (checkInResponse.data.success) {
          toast.success('Attendance marked successfully!');
          setTodayAttendance(checkInResponse.data.data);
          setHasCheckedIn(true);
          setHasCheckedOut(false);
          fetchAttendanceHistory();

          setTimeout(() => {
            closeFaceVerification();
          }, 1500);
        } else {
          toast.error(checkInResponse.data.message || 'Failed to mark attendance');
        }
      } else {
        setVerificationStatus('failed');
        const errorMessage = response.data.message || 'Face verification failed';
        setLivenessMessage(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Face verification error:', error);
      setVerificationStatus('failed');
      setVerificationProgress(100);

      let errorMsg = 'Face verification failed';
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMsg = 'Verification timeout. Please try again.';
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.message) {
        errorMsg = error.message;
      }

      setLivenessMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsVerifying(false);
    }
  };

  const openFaceVerification = () => {
    if (!currentLocation) {
      toast.error('Location is required. Please enable location services.');
      getCurrentLocation();
      return;
    }

    const locationCheck = geolocationUtils.isWithinOfficeRadius(
      currentLocation.latitude,
      currentLocation.longitude
    );

    if (!locationCheck.isWithin) {
      toast.error(`You are not within office premises. Distance: ${locationCheck.distance}m`);
      return;
    }

    setShowFaceVerification(true);
    setVerificationStatus(null);
    setVerificationProgress(0);
    setLivenessMessage('');
    startCamera();
  };

  const closeFaceVerification = () => {
    stopCamera();
    setShowFaceVerification(false);
    setVerificationStatus(null);
    setCameraReady(false);
    setVerificationProgress(0);
    setLivenessMessage('');
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      const position = await geolocationUtils.getCurrentPosition();
      const addressData = await geolocationUtils.getAddressFromCoords(position.latitude, position.longitude);
      // Format address as string for display
      const addressString = typeof addressData === 'object' ? addressData.address : addressData;
      setCurrentLocation({ ...position, address: addressString });
    } catch (error) {
      console.error('Location error:', error);
      toast.error(error.message);
    } finally {
      setLocationLoading(false);
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const response = await attendanceAPI.getTodayAttendance();
      if (response.data.success) {
        const data = response.data;
        setTodayAttendance(data.data);
        setHasCheckedIn(data.hasCheckedIn);
        setHasCheckedOut(data.hasCheckedOut);
        setWorkingTime(data.workingTime);
      }
    } catch (error) {
      console.error('Error fetching today attendance:', error);
      if (error.response?.status !== 404) {
        toast.error('Failed to fetch today\'s attendance status');
      }
    }
  };

  const fetchAttendanceHistory = async () => {
    try {
      setLoading(true);
      const startDate = new Date(selectedMonth + '-01');
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      const response = await attendanceAPI.getAttendanceHistory({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 31
      });
      if (response.data.success) {
        setAttendanceHistory(response.data.data);
        setAttendanceStats(response.data.summary);
      }
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      toast.error('Failed to fetch attendance history');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!currentLocation) {
      toast.error('Location is required for checkout.');
      getCurrentLocation();
      return;
    }

    try {
      setLoading(true);
      const locationCheck = geolocationUtils.isWithinOfficeRadius(
        currentLocation.latitude,
        currentLocation.longitude
      );

      if (!locationCheck.isWithin) {
        toast.error(`You are not within office premises. Distance: ${locationCheck.distance}m`);
        return;
      }

      const response = await attendanceAPI.checkOut({
        location: currentLocation,
        notes: 'Check-out via web'
      });
      if (response.data.success) {
        toast.success('Checkout marked successfully!');
        setTodayAttendance(response.data.data);
        setHasCheckedOut(true);
        setWorkingTime(response.data.workingTime);
        fetchAttendanceHistory();
        fetchTodayAttendance();
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error.response?.data?.message || 'Failed to mark checkout');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'present': return 'text-green-700 bg-green-100';
      case 'late': return 'text-amber-700 bg-amber-100';
      case 'half day': return 'text-orange-700 bg-orange-100';
      case 'absent': return 'text-red-700 bg-red-100';
      case 'work from home': return 'text-blue-700 bg-blue-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '--:--';
    return new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatWorkingTime = (minutes) => {
    if (!minutes || minutes === 0) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <EmployeeLayout>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-enter {
          animation: fadeSlideUp 0.4s ease-out both;
        }
      `}</style>
      <div className="w-full min-h-[calc(100vh-5rem)] space-y-6 bg-slate-50">
        <div className="animate-enter bg-white border border-slate-200 shadow-sm rounded-2xl p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                My <span className="text-blue-600">Attendance</span>
              </h1>
              <p className="text-slate-500 text-sm md:text-base">Track your daily attendance with video face verification</p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-lg md:text-2xl font-bold text-slate-900">{currentTime.toLocaleTimeString()}</p>
              <p className="text-slate-500 text-xs md:text-sm">
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        <div className="animate-enter bg-white border border-slate-200 shadow-sm rounded-2xl p-6" style={{ animationDelay: '80ms' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Today's Attendance</h2>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${hasCheckedIn ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
              <span className="text-sm text-slate-500">
                {hasCheckedIn ? (hasCheckedOut ? 'Completed' : 'Checked In') : 'Not Marked'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <MapPin className={`w-5 h-5 ${currentLocation ? 'text-green-600' : 'text-red-600'}`} />
                <div className="flex-1">
                  <p className="text-slate-900 text-sm font-medium">
                    {locationLoading ? 'Getting location...' : currentLocation ? 'Location Ready' : 'Location Required'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {currentLocation ? currentLocation.address : 'Enable location services'}
                  </p>
                </div>
                {!currentLocation && (
                  <button
                    onClick={getCurrentLocation}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-all duration-200"
                  >
                    {locationLoading ? 'Getting...' : 'Get Location'}
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {!hasCheckedIn ? (
                  <>
                    <button
                      onClick={openFaceVerification}
                      disabled={!currentLocation || loading}
                      className="w-full px-4 md:px-6 py-3 md:py-4 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:hover:scale-100 text-sm md:text-base min-h-[48px] touch-manipulation"
                    >
                      <Video className="w-5 h-5 flex-shrink-0" />
                      <span>{loading ? 'Processing...' : 'Check In with Video Verification (Optional)'}</span>
                    </button>
                    <button
                      onClick={async () => {
                        if (!currentLocation) {
                          toast.error('Location is required for check-in.');
                          getCurrentLocation();
                          return;
                        }
                        try {
                          setLoading(true);
                          const locationCheck = geolocationUtils.isWithinOfficeRadius(
                            currentLocation.latitude,
                            currentLocation.longitude
                          );
                          if (!locationCheck.isWithin) {
                            toast.error(`You are not within office premises. Distance: ${locationCheck.distance}m`);
                            return;
                          }
                          const response = await attendanceAPI.checkIn({
                            location: currentLocation,
                            deviceInfo: geolocationUtils.getDeviceInfo(),
                            notes: 'Check-in via web without face verification'
                          });
                          if (response.data.success) {
                            toast.success('Check-in marked successfully without face verification!');
                            setTodayAttendance(response.data.data);
                            setHasCheckedIn(true);
                            fetchAttendanceHistory();
                            fetchTodayAttendance();
                          }
                        } catch (error) {
                          console.error('Check-in error:', error);
                          toast.error(error.response?.data?.message || 'Failed to mark check-in');
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={!currentLocation || loading}
                      className="w-full px-4 md:px-6 py-3 md:py-4 bg-white border border-blue-300 text-blue-700 font-semibold rounded-lg hover:bg-blue-50 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 text-sm md:text-base min-h-[48px] touch-manipulation"
                    >
                      <Clock className="w-5 h-5 flex-shrink-0" />
                      <span>{loading ? 'Processing...' : 'Check In Without Face'}</span>
                    </button>
                  </>
                ) : !hasCheckedOut ? (
                  <button
                    onClick={handleCheckOut}
                    disabled={!currentLocation || loading}
                    className="w-full px-4 md:px-6 py-3 md:py-4 bg-white border border-red-300 text-red-600 font-semibold rounded-lg hover:bg-red-50 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 text-sm md:text-base min-h-[48px] touch-manipulation"
                  >
                    <XCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{loading ? 'Checking out...' : 'Check Out'}</span>
                  </button>
                ) : (
                  <div className="w-full px-4 md:px-6 py-3 md:py-4 bg-blue-50 border border-blue-200 text-slate-900 font-semibold rounded-lg flex items-center justify-center space-x-2 text-sm md:text-base min-h-[48px]">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span>Attendance Completed</span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-700">
                    <p className="font-medium mb-1">Video Verification with Liveness Detection</p>
                    <p>Your live video is analyzed to ensure you are physically present. Static images and spoofing attempts are blocked.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                  <p className="text-slate-500 text-xs">Check In</p>
                  <p className="text-slate-900 font-bold">
                    {todayAttendance ? formatTime(todayAttendance.checkInTime) : '--:--'}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                  <p className="text-slate-500 text-xs">Check Out</p>
                  <p className="text-slate-900 font-bold">
                    {todayAttendance ? formatTime(todayAttendance.checkOutTime) : '--:--'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                  <p className="text-slate-500 text-xs">Working Time</p>
                  <p className="text-blue-600 font-bold">
                    {hasCheckedIn && !hasCheckedOut ? formatWorkingTime(realTimeWorkingTime) : (workingTime ? workingTime.total : '00:00')}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                  <p className="text-slate-500 text-xs">Status</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(todayAttendance?.status)}`}>
                    {todayAttendance?.status || 'Not Marked'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {attendanceStats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <div className="animate-enter bg-white border border-slate-200 shadow-sm rounded-2xl p-4 md:p-6 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200" style={{ animationDelay: '120ms' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500 text-xs md:text-sm">Total Days</p>
                  <p className="text-xl md:text-2xl font-bold text-slate-900">{attendanceStats.totalDays}</p>
                </div>
                <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-blue-600 flex-shrink-0" />
              </div>
            </div>
            <div className="animate-enter bg-white border border-slate-200 shadow-sm rounded-2xl p-4 md:p-6 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200" style={{ animationDelay: '160ms' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500 text-xs md:text-sm">Present Days</p>
                  <p className="text-xl md:text-2xl font-bold text-green-600">{attendanceStats.presentDays}</p>
                </div>
                <CheckCircle className="w-6 h-6 md:w-8 md:h-8 text-green-600 flex-shrink-0" />
              </div>
            </div>
            <div className="animate-enter bg-white border border-slate-200 shadow-sm rounded-2xl p-4 md:p-6 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500 text-xs md:text-sm">Late Days</p>
                  <p className="text-xl md:text-2xl font-bold text-amber-600">{attendanceStats.lateDays}</p>
                </div>
                <AlertCircle className="w-6 h-6 md:w-8 md:h-8 text-amber-600 flex-shrink-0" />
              </div>
            </div>
            <div className="animate-enter bg-white border border-slate-200 shadow-sm rounded-2xl p-4 md:p-6 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200" style={{ animationDelay: '240ms' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500 text-xs md:text-sm">Half Days</p>
                  <p className="text-xl md:text-2xl font-bold text-orange-600">{attendanceStats.halfDays}</p>
                </div>
                <Timer className="w-6 h-6 md:w-8 md:h-8 text-orange-600 flex-shrink-0" />
              </div>
            </div>
          </div>
        )}

        <div className="animate-enter bg-white border border-slate-200 shadow-sm rounded-2xl p-6" style={{ animationDelay: '280ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">Attendance History</h2>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setTimeout(fetchAttendanceHistory, 100);
              }}
              className="bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : attendanceHistory.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
                <CalendarX className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-slate-500 font-medium">No attendance records for this month</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {attendanceHistory.map((record) => (
                <div key={record._id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-blue-50 transition-all duration-200">
                  <div className="flex items-center space-x-3">
                    <div className="text-center">
                      <p className="text-slate-900 font-medium">{formatDate(record.date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="text-center">
                      <p className="text-slate-500 text-xs">In</p>
                      <p className="text-slate-900">{formatTime(record.checkInTime)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-500 text-xs">Out</p>
                      <p className="text-slate-900">{formatTime(record.checkOutTime)}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(record.status)}`}>
                      {record.status || 'Present'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showFaceVerification && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Enhanced backdrop with blur */}
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={closeFaceVerification} />

          {/* Modal content */}
          <div className="relative bg-white border border-slate-200 rounded-xl shadow-xl p-6 max-w-lg w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                <Camera className="w-5 h-5 text-blue-600" />
                <span>Face Verification</span>
              </h3>
              <button
                onClick={closeFaceVerification}
                disabled={isVerifying}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all duration-200 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative bg-slate-900 rounded-lg overflow-hidden mb-4">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full"
                style={{ transform: 'scaleX(-1)' }}
              />

              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60">
                  <div className="text-white text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    <p>Starting camera...</p>
                  </div>
                </div>
              )}

              {isVerifying && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70">
                  <div className="text-white text-center">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
                    <p className="font-medium">{livenessMessage}</p>
                    <div className="w-48 h-2 bg-white/20 rounded-full mt-4 mx-auto">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${verificationProgress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              {verificationStatus === 'success' && (
                <div className="absolute inset-0 flex items-center justify-center bg-green-600/60">
                  <div className="text-center">
                    <CheckCircle className="w-16 h-16 text-white mx-auto" />
                    <p className="text-white font-bold mt-2">Verified!</p>
                  </div>
                </div>
              )}

              {verificationStatus === 'failed' && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-600/60">
                  <div className="text-center">
                    <XCircle className="w-16 h-16 text-white mx-auto" />
                    <p className="text-white font-bold mt-2">Verification Failed</p>
                    <p className="text-white text-sm mt-1">{livenessMessage}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className={`w-3 h-3 rounded-full ${cameraReady ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`}></div>
              <span className="text-sm text-slate-500">
                {cameraReady ? 'Look at the camera and click verify' : 'Starting camera...'}
              </span>
            </div>

            <button
              onClick={captureVideoFramesAndVerify}
              disabled={!cameraReady || isVerifying}
              className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>Verify & Check In</span>
                </>
              )}
            </button>

            <p className="text-xs text-slate-500 mt-3 text-center">
              Your face will be verified against your registered profile
            </p>
          </div>
        </div>
      )}
    </EmployeeLayout>
  );
};

export default EmployeeAttendance;
