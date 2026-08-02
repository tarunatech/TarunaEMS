// hooks/useRealTimeUpdates.js
import { useState, useEffect, useCallback } from 'react';

export const useRealTimeUpdates = (refreshCallback, interval = 300000) => { // 5 minutes default
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true);

  const handleRefresh = useCallback(() => {
    if (refreshCallback) {
      refreshCallback();
      setLastUpdated(new Date());
    }
  }, [refreshCallback]);

  useEffect(() => {
    if (!isAutoRefreshEnabled) return;

    const intervalId = setInterval(() => {
      handleRefresh();
    }, interval);

    return () => clearInterval(intervalId);
  }, [handleRefresh, interval, isAutoRefreshEnabled]);

  const toggleAutoRefresh = useCallback(() => {
    setIsAutoRefreshEnabled(prev => !prev);
  }, []);

  return {
    lastUpdated,
    isAutoRefreshEnabled,
    toggleAutoRefresh,
    manualRefresh: handleRefresh
  };
};
