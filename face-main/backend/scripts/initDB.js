// scripts/initDB.js
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import { pool } from '../db/index.js';
import User from '../models/User.js';

dotenv.config();

const initializeDatabase = async () => {
  try {
    await connectDB();

    const adminExists = await User.findOne({ role: 'admin' });

    if (adminExists) {
      console.log('Admin user already exists');
      console.log(`   Email: ${adminExists.email}`);
      console.log(`   Name: ${adminExists.name}`);
      return;
    }

    const adminData = {
      name: 'Administrator',
      email: process.env.ADMIN_EMAIL || 'admin@gmail.com',
      password: process.env.ADMIN_PASSWORD || 'admin',
      role: 'admin',
    };

    const admin = await User.create(adminData);

    console.log('Default admin user created successfully');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'admin'}`);
    console.log(`   Role: ${admin.role}`);
    console.log('Please change the default password after first login for security.');
  } catch (error) {
    console.error('Error initializing database:', error.message);
    if (error.code === 11000 || error.code === '23505') {
      console.log('Admin user might already exist');
    }
  } finally {
    await pool.end();
    console.log('Database connection closed');
  }
};

if (process.argv[1] === new URL(import.meta.url).pathname) {
  initializeDatabase();
}

export default initializeDatabase;
