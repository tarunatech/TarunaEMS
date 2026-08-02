// utils/geolocationUtils.js

export const geolocationUtils = {
  // Get current position with promise
  getCurrentPosition: (options = {}) => {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000 // 1 minute cache
    };

    const finalOptions = { ...defaultOptions, ...options };

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
            altitude: position.coords.altitude,
            heading: position.coords.heading,
            speed: position.coords.speed
          });
        },
        (error) => {
          const errorMessages = {
            [error.PERMISSION_DENIED]: 'Location access denied by user',
            [error.POSITION_UNAVAILABLE]: 'Location information is unavailable',
            [error.TIMEOUT]: 'Location request timed out',
            default: 'An unknown error occurred while retrieving location'
          };
          
          const message = errorMessages[error.code] || errorMessages.default;
          reject(new Error(message));
        },
        finalOptions
      );
    });
  },

  // Watch position changes
  watchPosition: (successCallback, errorCallback, options = {}) => {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser');
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    };

    const finalOptions = { ...defaultOptions, ...options };

    return navigator.geolocation.watchPosition(
      successCallback,
      errorCallback,
      finalOptions
    );
  },

  // Clear position watch
  clearWatch: (watchId) => {
    if (navigator.geolocation && watchId) {
      navigator.geolocation.clearWatch(watchId);
    }
  },

  // Get address from coordinates (reverse geocoding)
  getAddressFromCoords: async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
        { timeout: 5000 }
      );
      
      if (!response.ok) {
        throw new Error('Geocoding service unavailable');
      }
      
      const data = await response.json();
      return {
        address: data.display_name || data.locality || 'Unknown location',
        city: data.city || data.locality,
        country: data.countryName,
        countryCode: data.countryCode,
        postcode: data.postcode
      };
    } catch (error) {
      console.warn('Geocoding failed:', error);
      return {
        address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        city: 'Unknown',
        country: 'Unknown',
        countryCode: 'XX',
        postcode: ''
      };
    }
  },

  // Get device information
  getDeviceInfo: () => {
    const userAgent = navigator.userAgent;
    
    // Browser detection
    let browser = 'Unknown';
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
    else if (userAgent.includes('Edg')) browser = 'Edge';
    else if (userAgent.includes('Opera') || userAgent.includes('OPR')) browser = 'Opera';

    // OS detection
    let os = 'Unknown';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'MacOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';

    return {
      userAgent,
      platform: navigator.platform || 'Unknown',
      browser,
      os,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  },

  // Calculate distance between two coordinates (Haversine formula)
  calculateDistance: (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  },

  // Format distance for display
  formatDistance: (meters) => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    } else {
      return `${(meters / 1000).toFixed(1)} km`;
    }
  },

  // Check if coordinates are within a certain radius
  isWithinRadius: (lat1, lon1, lat2, lon2, radiusInMeters) => {
    const distance = geolocationUtils.calculateDistance(lat1, lon1, lat2, lon2);
    return distance <= radiusInMeters;
  },

  // Get location accuracy description
  getAccuracyDescription: (accuracy) => {
    if (accuracy <= 5) return 'Very High';
    if (accuracy <= 20) return 'High';
    if (accuracy <= 50) return 'Medium';
    if (accuracy <= 100) return 'Low';
    return 'Very Low';
  }
};