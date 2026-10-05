import express from 'express';
import { getSchedulerStatus, sendTaskStatusReports } from '../services/taskSchedulerService.js';
import { performAutoCheckout } from '../services/autoCheckoutSchedulerService.js';

const router = express.Router();

// Get scheduler status
router.get('/status', (req, res) => {
  try {
    const status = getSchedulerStatus();
    res.status(200).json({
      success: true,
      scheduler: status,
      message: 'Scheduler status retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve scheduler status',
      error: error.message
    });
  }
});

// Manual trigger for testing (admin only)
router.post('/trigger-report', async (req, res) => {
  try {
    await sendTaskStatusReports();
    res.status(200).json({
      success: true,
      message: 'Task status reports triggered successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to trigger task status reports',
      error: error.message
    });
  }
});

// Manual trigger for auto check-out
router.post('/trigger-auto-checkout', async (req, res) => {
  try {
    const result = await performAutoCheckout();
    res.status(200).json({
      success: true,
      data: result,
      message: 'Auto check-out process completed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to execute auto check-out',
      error: error.message
    });
  }
});

export default router;
