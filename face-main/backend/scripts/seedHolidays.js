import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../config/db.js';
import { pool } from '../db/index.js';
import Holiday from '../models/Holiday.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const holidays = [
  { date: '2026-01-14', title: 'Makar Sankranti', type: 'Public', description: 'Regional' },
  { date: '2026-01-26', title: 'Republic Day', type: 'Public', description: 'National' },
  { date: '2026-02-15', title: 'Maha Shivaratri', type: 'Public', description: 'Regional' },
  { date: '2026-03-04', title: 'Holi (2nd Day) - Dhuleti', type: 'Public', description: 'Regional' },
  { date: '2026-03-26', title: 'Ram Navami', type: 'Public', description: '' },
  { date: '2026-08-15', title: 'Independence Day', type: 'Public', description: '' },
  { date: '2026-08-28', title: 'Raksha Bandhan', type: 'Public', description: 'Regional' },
  { date: '2026-09-04', title: 'Janmashtami', type: 'Public', description: 'Regional' },
  { date: '2026-10-02', title: 'Gandhi Jayanti', type: 'Public', description: 'National' },
  { date: '2026-10-20', title: 'Dussehra', type: 'Public', description: 'Regional' },
  { date: '2026-11-08', title: 'Diwali', type: 'Public', description: 'Regional' },
  { date: '2026-11-10', title: 'Gujarati New Year Day', type: 'Public', description: 'Regional' },
  { date: '2026-11-11', title: 'Bhai Bij', type: 'Public', description: 'Regional' },
  { date: '2026-12-25', title: 'Christmas', type: 'Public', description: 'Regional' },
];

const seedHolidays = async () => {
  try {
    await connectDB();

    for (const holiday of holidays) {
      const existing = await Holiday.findOne({ date: new Date(holiday.date) });
      if (existing) {
        Object.assign(existing, holiday, { date: new Date(holiday.date) });
        await existing.save();
      } else {
        await Holiday.create({ ...holiday, date: new Date(holiday.date) });
      }
      console.log(`Seeded: ${holiday.title} (${holiday.date})`);
    }

    console.log('All holidays seeded successfully');
  } catch (error) {
    console.error('Error seeding holidays:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
    console.log('Database connection closed');
  }
};

seedHolidays();
