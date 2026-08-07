// scripts/seedAdmin.js
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import { pool } from '../db/index.js';
import User from '../models/User.js';

dotenv.config({ path: '.env' });

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin';

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('ADMIN_EMAIL or ADMIN_PASSWORD missing in .env');
  process.exit(1);
}

const adminData = {
  name: ADMIN_NAME,
  email: ADMIN_EMAIL.toLowerCase().trim(),
  password: ADMIN_PASSWORD,
  role: 'admin',
  isActive: true,
};

const seedAdmin = async () => {
  try {
    await connectDB();

    const existingAdmin = await User.findOne({ email: adminData.email });

    if (existingAdmin) {
      console.log('Admin exists. Updating password...');
      existingAdmin.password = ADMIN_PASSWORD;
      await existingAdmin.save();
      console.log('Admin password updated');
      return;
    }

    const admin = new User(adminData);
    await admin.save();

    console.log('Admin created:', {
      name: admin.name,
      email: admin.email,
      role: admin.role,
    });
  } catch (err) {
    console.error('Error seeding admin:', err);
  } finally {
    await pool.end();
    console.log('Disconnected.');
  }
};

seedAdmin();
