// utils/notificationUtils.js

export const notificationUtils = {
  // Format notification time for display
  formatTime: (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    return time.toLocaleDateString();
  },

  // Get notification priority based on type and category
  getPriority: (notification) => {
    const { type, category } = notification;
    
    if (type === 'error') return 3; // High priority
    if (type === 'warning') return 2; // Medium priority
    if (category === 'leave' && type === 'info') return 2; // Medium priority
    return 1; // Low priority
  },

  // Group notifications by category
  groupByCategory: (notifications) => {
    const categories = {
      tasks: [],
      leaves: [],
      employee: [],
      attendance: [],
      profile: [],
      other: []
    };
    
    notifications.forEach(notification => {
      const category = notification.category || 'other';
      if (categories[category]) {
        categories[category].push(notification);
      } else {
        categories.other.push(notification);
      }
    });
    
    return categories;
  },

  // Get notification settings
  getSettings: () => {
    try {
      const settings = localStorage.getItem('notificationSettings');
      return settings ? JSON.parse(settings) : {
        sound: true,
        vibration: true,
        desktop: true,
        email: false
      };
    } catch (error) {
      console.error('Error parsing notification settings:', error);
      return {
        sound: true,
        vibration: true,
        desktop: true,
        email: false
      };
    }
  },

  // Save notification settings
  saveSettings: (settings) => {
    try {
      localStorage.setItem('notificationSettings', JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('Error saving notification settings:', error);
      return false;
    }
  },

  // Get notification icon based on type
  getIcon: (type) => {
    const icons = {
      success: '✅',
      warning: '⚠️',
      error: '❌',
      info: 'ℹ️',
      default: '📢'
    };
    return icons[type] || icons.default;
  },

  // Get notification color based on type
  getColor: (type) => {
    const colors = {
      success: 'text-green-400',
      warning: 'text-yellow-400',
      error: 'text-red-400',
      info: 'text-blue-400',
      default: 'text-gray-400'
    };
    return colors[type] || colors.default;
  },

  // Sort notifications by priority and time
  sortNotifications: (notifications) => {
    return notifications.sort((a, b) => {
      const priorityDiff = notificationUtils.getPriority(b) - notificationUtils.getPriority(a);
      if (priorityDiff !== 0) return priorityDiff;
      
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
  }
};