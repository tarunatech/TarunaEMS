// Simple performance logger for tracking execution time and metrics
import fs from 'fs';
import path from 'path';

const LOG_FILE = 'performance.log';

export const logPerformance = async (operation, duration, metadata = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    operation,
    duration: `${duration}ms`,
    ...metadata
  };

  const logString = JSON.stringify(logEntry) + '\n';
  
  // Console log for development
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Performance] ${operation}: ${duration}ms`, metadata);
  }

  // File log (optional, append to file)
  // In production, you might want to send this to a monitoring service (Datadog, New Relic, etc.)
  try {
    // fs.appendFileSync(LOG_FILE, logString); 
    // Commented out to avoid disk I/O in this environment, but ready for production
  } catch (err) {
    console.error('Failed to write performance log', err);
  }
};

export const measurePerformance = async (operation, fn, metadata = {}) => {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    logPerformance(operation, duration, { ...metadata, success: true });
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logPerformance(operation, duration, { ...metadata, success: false, error: error.message });
    throw error;
  }
};
