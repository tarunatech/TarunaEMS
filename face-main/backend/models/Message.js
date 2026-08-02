// backend/models/Message.js
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // Bot messages have from: null
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  fromBot: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

messageSchema.index({ from: 1, to: 1, timestamp: -1 });
messageSchema.index({ to: 1, from: 1, timestamp: -1 });

export default mongoose.model('Message', messageSchema);