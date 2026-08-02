import express from 'express';
import {
    getTodayDayBook,
    submitDayBook,
    getDayBooks,
    updateDayBookStatus,
    deleteDayBook
} from '../controllers/dayBookController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/today', protect, getTodayDayBook);
router.post('/submit', protect, submitDayBook);
router.get('/', protect, getDayBooks);
router.put('/:id/status', protect, adminOnly, updateDayBookStatus);
router.delete('/:id', protect, adminOnly, deleteDayBook);

export default router;
