// utils/notificationUtils.js

export const notificationUtils = {
  // Format notification time for display in Indian Standard Time (IST)
  formatTime: (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return String(timestamp);

    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    const istTimeStr = date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });

    const istDateStr = date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      timeZone: 'Asia/Kolkata'
    });

    const todayIST = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
    const dateIST = date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });

    if (diffInMinutes >= 0 && diffInMinutes < 1) return `Just now (${istTimeStr} IST)`;
    if (diffInMinutes >= 1 && diffInMinutes < 60) return `${diffInMinutes}m ago (${istTimeStr} IST)`;
    if (dateIST === todayIST) return `Today at ${istTimeStr} IST`;

    return `${istDateStr} at ${istTimeStr} IST`;
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