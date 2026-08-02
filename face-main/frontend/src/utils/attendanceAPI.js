// utils/attendanceAPI.js
import API from './api';

// Office location constant - Make sure this matches your controller
export const OFFICE_LOCATION = {
  latitude: 22.298873262930066,
  longitude: 73.13129619568713,
  radius: 100 // meters - Strict office location enforcement
};

// Geolocation utility functions
export const geolocationUtils = {
  getCurrentPosition: () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000 // 1 minute cache
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          });
        },
        (error) => {
          let errorMessage = 'Unable to retrieve your location';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access is required for attendance. Please enable location services in your browser settings and refresh the page.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
            default:
              errorMessage = 'An unknown error occurred while retrieving location';
              break;
          }
          
          reject(new Error(errorMessage));
        },
        options
      );
    });
  },

  // Get address from coordinates (reverse geocoding)
  getAddressFromCoords: async (latitude, longitude) => {
    try {
      // Using a free geocoding service - you can replace with your preferred service
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding service unavailable');
      }
      
      const data = await response.json();
      return data.display_name || data.locality || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    } catch (error) {
      console.warn('Geocoding failed:', error);
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
  },

  // Get device information
  getDeviceInfo: () => {
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';
    let platform = navigator.platform || 'Unknown';

    // Simple browser detection
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    else if (userAgent.includes('Opera')) browser = 'Opera';

    return {
      userAgent,
      platform,
      browser,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    };
  },

  // Calculate distance between two coordinates (in meters) - Fixed formula
  calculateDistance: (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const toRad = (deg) => (deg * Math.PI) / 180;

    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  },

  // Check if location is within office radius
  isWithinOfficeRadius: (userLat, userLon) => {
    const distance = geolocationUtils.calculateDistance(
      userLat, 
      userLon, 
      OFFICE_LOCATION.latitude, 
      OFFICE_LOCATION.longitude
    );
    return {
      isWithin: distance <= OFFICE_LOCATION.radius,
      distance: Math.round(distance),
      maxDistance: OFFICE_LOCATION.radius
    };
  }
};

// Attendance API endpoints
export const attendanceAPI = {
  // Employee attendance functions
  checkInWithFace: async (faceData, locationData = {}) => {
    try {
      const position = await geolocationUtils.getCurrentPosition();
      const address = await geolocationUtils.getAddressFromCoords(
        position.latitude,
        position.longitude
      );
      const deviceInfo = geolocationUtils.getDeviceInfo();

      // Check distance on client side for better UX
      const locationCheck = geolocationUtils.isWithinOfficeRadius(
        position.latitude,
        position.longitude
      );

      if (!locationCheck.isWithin) {
        throw new Error(`You are not within office premises. Distance: ${locationCheck.distance}m (Max: ${locationCheck.maxDistance}m)`);
      }

      return API.post('/attendance/checkin-with-face', {
        faceDescriptor: faceData.descriptor,
        location: {
          latitude: position.latitude,
          longitude: position.longitude,
          accuracy: position.accuracy,
          address: typeof address === 'object' ? address.address : address
        },
        deviceInfo
      });
    } catch (error) {
      console.error('Check-in with face error:', error);
      throw error;
    }
  },

  checkIn: async (attendanceData = {}) => {
    try {
      let position = attendanceData.location;
      let address = position?.address;
      let deviceInfo = attendanceData.deviceInfo;

      if (!position || position.latitude === undefined || position.longitude === undefined) {
        const coords = await geolocationUtils.getCurrentPosition();
        position = coords;
        const addressData = await geolocationUtils.getAddressFromCoords(
          coords.latitude,
          coords.longitude
        );
        address = typeof addressData === 'object' ? addressData.address : addressData;
      }

      if (!deviceInfo) {
        deviceInfo = geolocationUtils.getDeviceInfo();
      }

      // Check distance on client side for better UX
      const locationCheck = geolocationUtils.isWithinOfficeRadius(
        position.latitude,
        position.longitude
      );

      if (!locationCheck.isWithin) {
        throw new Error(`You are not within office premises. Distance: ${locationCheck.distance}m (Max: ${locationCheck.maxDistance}m)`);
      }

      const { location: _, deviceInfo: __, ...otherData } = attendanceData;

      return API.post('/attendance/checkin', {
        ...otherData,
        location: {
          latitude: position.latitude,
          longitude: position.longitude,
          accuracy: position.accuracy || 0,
          address: typeof address === 'object' ? address.address : address
        },
        deviceInfo
      });
    } catch (error) {
      console.error('Check-in error:', error);
      throw error;
    }
  },

  checkOut: async (attendanceData = {}) => {
    try {
      let position = attendanceData.location;
      let address = position?.address;

      if (!position || position.latitude === undefined || position.longitude === undefined) {
        const coords = await geolocationUtils.getCurrentPosition();
        position = coords;
        const addressData = await geolocationUtils.getAddressFromCoords(
          coords.latitude,
          coords.longitude
        );
        address = typeof addressData === 'object' ? addressData.address : addressData;
      }

      // Check distance on client side for better UX
      const locationCheck = geolocationUtils.isWithinOfficeRadius(
        position.latitude,
        position.longitude
      );

      if (!locationCheck.isWithin) {
        throw new Error(`You are not within office premises. Distance: ${locationCheck.distance}m (Max: ${locationCheck.maxDistance}m)`);
      }

      const { location: _, ...otherData } = attendanceData;

      return API.put('/attendance/checkout', {
        ...otherData,
        location: {
          latitude: position.latitude,
          longitude: position.longitude,
          accuracy: position.accuracy || 0,
          address: typeof address === 'object' ? address.address : address
        }
      });
    } catch (error) {
      console.error('Check-out error:', error);
      throw error;
    }
  },
verifyFace: (faceData) => API.post('/attendance/verify-face', faceData),
  getTodayAttendance: () => API.get('/attendance/today'),
  getAttendanceHistory: (params = {}) => API.get('/attendance/history', { params }),
  getAllAttendance: (params = {}) => API.get('/attendance/all', { params }),
  getAttendanceSummary: (params = {}) => API.get('/attendance/summary', { params }),
  updateAttendance: (id, attendanceData) => API.put(`/attendance/${id}`, attendanceData),
  deleteAttendance: (id) => API.delete(`/attendance/${id}`)
};

export default attendanceAPI;
