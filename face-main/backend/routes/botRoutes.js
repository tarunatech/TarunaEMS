import express from 'express';
import { processMessage, processAdminMessage, getBotHistory } from '../controllers/botController.js';
import { protect } from '../middleware/auth.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();
router.use(protect);

router.post('/message', processMessage);
router.post('/admin-message', processAdminMessage);
router.get('/history/:userId', getBotHistory);

router.get('/download/:filename', protect, (req, res) => {
  const { filename } = req.params;
  if (!filename.endsWith('.pdf') || filename.includes('..')) {
    return res.status(400).json({ success: false, message: 'Invalid file' });
  }

  const filePath = path.join(process.cwd(), 'temp', filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'File not found' });
  }

  res.download(filePath, (err) => {
    if (!err) {
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 30000);
    }
  });
});

export default router;
