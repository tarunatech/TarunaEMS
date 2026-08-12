import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { performanceService } from '../services/taskService';

export const useEmployeePerformance = () => {
  const [myPerformance, setMyPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMyPerformance = useCallback(async (month) => {
    try {
      setLoading(true);
      setError(null);
      console.log('useEmployeePerformance: Fetching performance for month:', month);
      const response = await performanceService.getMyPerformance(month);
      console.log('useEmployeePerformance: API Response:', response);

      if (response && response.success) {
        setMyPerformance(response);
      } else {
        setError('Invalid response from server');
      }
    } catch (fetchError) {
      console.error('useEmployeePerformance: Error fetching performance:', fetchError);
      setError(fetchError.message || 'Failed to fetch performance');
      toast.error(fetchError.message || 'Failed to fetch performance');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyPerformance();
  }, [fetchMyPerformance]);

  return {
    myPerformance,
    loading,
    error,
    fetchMyPerformance,
  };
};
