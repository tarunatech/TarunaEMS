import express from 'express';
import {
    getHolidays,
    createHoliday,
    updateHoliday,
    deleteHoliday
} from '../controllers/holidayController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, getHolidays)
    .post(protect, adminOnly, createHoliday);

router.route('/:id')
    .put(protect, adminOnly, updateHoliday)
    .delete(protect, adminOnly, deleteHoliday);

export default router;
