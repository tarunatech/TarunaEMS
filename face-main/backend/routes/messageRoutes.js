import express from 'express';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { getOnlineUserIds } from '../socket/chat.js';

const router = express.Router();

router.use(protect);

router.get('/chat-users', async (req, res) => {
  try {
    const currentUserId = req.user.id;
    
    // Only fetch other employees (exclude admins and current user)
    const users = await User.find({ 
      _id: { $ne: currentUserId },
      role: 'employee',
      isActive: true
    })
    .select('name email employeeId profileImage role')
    .lean();

    const onlineUserIds = getOnlineUserIds();
    
    const chatUsers = users.map(user => {
      return {
        _id: user._id.toString(),
        name: user.name || 'Unknown User',
        department: 'General',
        position: 'Employee',
        avatar: user.profileImage || null,
        isOnline: onlineUserIds.includes(user._id.toString())
      };
    });

    chatUsers.sort((a, b) => {
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return a.name.localeCompare(b.name);
    });

    res.json({ success: true, data: chatUsers });
  } catch (error) {
    console.error('Failed to get chat users:', error);
    res.status(500).json({ success: false, message: 'Failed to load chat users' });
  }
});

router.get('/history/:peerId', async (req, res) => {
  try {
    const { peerId } = req.params;
    const currentUserId = req.user.id;

    if (peerId === currentUserId) {
      return res.status(400).json({ success: false, message: 'Cannot load chat history with yourself' });
    }

    const messages = await Message.find({
      $or: [
        { from: currentUserId, to: peerId },
        { from: peerId, to: currentUserId }
      ]
    })
    .sort({ timestamp: 1 })
    .populate('from', 'name email')
    .populate('to', 'name email');

    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('Failed to load chat history:', error);
    res.status(500).json({ success: false, message: 'Failed to load chat history' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { to, text } = req.body;
    const from = req.user.id;

    if (to === from) {
      return res.status(400).json({ success: false, message: 'Cannot send message to yourself' });
    }

    if (!text?.trim()) {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    const message = new Message({
      from,
      to,
      text: text.trim()
    });
    await message.save();
    await message.populate('from', 'name email');

    const responseData = {
      _id: message._id,
      from: message.from._id || message.from,
      fromName: message.from?.name || 'Unknown',
      to: message.to,
      text: message.text,
      timestamp: message.timestamp,
      fromBot: message.fromBot || false
    };

    res.status(201).json({ success: true, data: responseData });
  } catch (error) {
    console.error('Failed to send message:', error);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});

export default router;
