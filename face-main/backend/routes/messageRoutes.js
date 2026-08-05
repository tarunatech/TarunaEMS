import express from 'express';
import mongoose from 'mongoose';
import Message from '../models/Message.js';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import { protect } from '../middleware/auth.js';
import { getOnlineUserIds } from '../socket/chat.js';

const router = express.Router();

router.use(protect);

const getEmployeeDisplayName = (user, employee) => {
  const userName = user?.name?.trim();
  if (userName && !/^unknown( user)?$/i.test(userName)) {
    return userName;
  }

  const firstName = employee?.personalInfo?.firstName?.trim();
  const lastName = employee?.personalInfo?.lastName?.trim();
  const fullName = [firstName, lastName].filter(Boolean).join(' ');

  return fullName || employee?.fullName || user?.email || 'Employee';
};

router.get('/chat-users', async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const currentUserObjectId = new mongoose.Types.ObjectId(currentUserId);
    
    // Only fetch other employees (exclude admins and current user)
    const users = await User.find({ 
      _id: { $ne: currentUserId },
      role: 'employee',
      isActive: true
    })
    .select('name email employeeId profileImage role')
    .lean();

    const employees = await Employee.find({ user: { $in: users.map(user => user._id) } })
      .select('user personalInfo workInfo')
      .populate('workInfo.department', 'name code')
      .lean({ virtuals: true });

    const employeeByUserId = new Map(
      employees.map(employee => [employee.user.toString(), employee])
    );

    const onlineUserIds = getOnlineUserIds();
    const userIds = users.map(user => user._id);
    const latestMessages = await Message.aggregate([
      {
        $match: {
          fromBot: { $ne: true },
          $or: [
            { from: currentUserObjectId, to: { $in: userIds } },
            { from: { $in: userIds }, to: currentUserObjectId }
          ]
        }
      },
      { $sort: { timestamp: -1, createdAt: -1 } },
      {
        $addFields: {
          peerId: {
            $cond: [
              { $eq: ['$from', currentUserObjectId] },
              '$to',
              '$from'
            ]
          }
        }
      },
      {
        $group: {
          _id: '$peerId',
          lastMessage: { $first: '$text' },
          lastMessageAt: { $first: '$timestamp' },
          lastMessageFrom: { $first: '$from' }
        }
      }
    ]);

    const latestByPeerId = new Map(
      latestMessages.map(message => [
        message._id.toString(),
        {
          lastMessage: message.lastMessage || '',
          lastMessageAt: message.lastMessageAt,
          lastMessageFrom: message.lastMessageFrom?.toString()
        }
      ])
    );
    
    const chatUsers = users.map(user => {
      const latest = latestByPeerId.get(user._id.toString()) || {};
      const employee = employeeByUserId.get(user._id.toString());
      const department = employee?.workInfo?.department;
      return {
        _id: user._id.toString(),
        name: getEmployeeDisplayName(user, employee),
        department: typeof department === 'object'
          ? (department?.name || department?.code || 'General')
          : (department || 'General'),
        position: employee?.workInfo?.position || 'Employee',
        personalInfo: employee?.personalInfo || null,
        workInfo: employee?.workInfo || null,
        avatar: user.profileImage || null,
        lastMessage: latest.lastMessage || '',
        lastMessageAt: latest.lastMessageAt || null,
        lastMessageFrom: latest.lastMessageFrom || null,
        isOnline: onlineUserIds.includes(user._id.toString())
      };
    });

    chatUsers.sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;
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
