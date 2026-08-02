// config/db.js
import mongoose from 'mongoose';

const connectDB = async () => {
  // Reuse existing connection if already connected
  if (mongoose.connection.readyState >= 1) {
    console.log('📦 MongoDB already connected');
    return;
  }

  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb+srv://yash14:m73FMaTmzwguxmKQ@ems.afot6m7.mongodb.net/?appName=ems";
    const conn = await mongoose.connect(mongoUri);
    console.log(`📦 MongoDB Connected: ${conn.connection.host}`);

    // Clean up problematic indexes on startup
    try {
      const db = mongoose.connection.db;
      const leadsCollection = db.collection('leads');
      
      // Drop the problematic meetings.meetingId unique index if it exists
      try {
        await leadsCollection.dropIndex('meetings.meetingId_1');
        console.log('✅ Dropped problematic meetings.meetingId_1 index');
      } catch (err) {
        if (err.message.includes('index not found')) {
          console.log('✅ meetings.meetingId_1 index already removed');
        } else {
          console.log('⚠️ Note: Could not drop meetings.meetingId_1 index:', err.message);
        }
      }
    } catch (error) {
      console.log('⚠️ Could not clean up indexes:', error.message);
    }

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

  } catch (err) {
    console.error('Database connection failed:', err);
    throw err;
  }
};

export default connectDB;
