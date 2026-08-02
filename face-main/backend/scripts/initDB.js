// scripts/initDB.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

// Load environment variables
dotenv.config();

const initializeDatabase = async () => {
  try {
    // Determine MongoDB URI (support both names and fall back to localhost)
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/EMS';

    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB at:', mongoUri);
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (adminExists) {
      console.log('ℹ️ Admin user already exists');
      console.log(`   Email: ${adminExists.email}`);
      console.log(`   Name: ${adminExists.name}`);
      return;
    }

    // Create default admin user
    const adminData = {
      name: 'Administrator',
      email: process.env.ADMIN_EMAIL || 'admin@gmail.com',
      password: process.env.ADMIN_PASSWORD || 'admin',
      role: 'admin'
    };

    const admin = await User.create(adminData);

    console.log('🎉 Default admin user created successfully!');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'admin'}`);
    console.log(`   Role: ${admin.role}`);
    console.log('\n⚠️  Please change the default password after first login for security!');

  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    if (error.code === 11000) {
      console.log('ℹ️ Admin user might already exist');
    }
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run initialization if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  initializeDatabase();
}

export default initializeDatabase;