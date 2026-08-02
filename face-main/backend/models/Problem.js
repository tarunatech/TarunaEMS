// backend/models/Problem.js
import mongoose from 'mongoose';

const problemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  solvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['Pending', 'Solved'], default: 'Pending' },
  solvedAt: Date,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Problem', problemSchema);