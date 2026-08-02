// backend/socket/chat.js
import User from '../models/User.js';
import Message from '../models/Message.js';
import Group from '../models/Group.js';
import GroupMessage from '../models/GroupMessage.js';
import { processBotMessage } from '../controllers/botController.js';
import authSocket from '../middleware/authSocket.js';

const onlineUsers = new Map();
const userSockets = new Map();
const processedMessages = new Map();
const MESSAGE_DEDUP_TTL = 60000;

const cleanupProcessedMessages = () => {
  const now = Date.now();
  for (const [key, timestamp] of processedMessages.entries()) {
    if (now - timestamp > MESSAGE_DEDUP_TTL) {
      processedMessages.delete(key);
    }
  }
};

setInterval(cleanupProcessedMessages, 30000);

const getOnlineUserIds = () => {
  return Array.from(onlineUsers.keys());
};

const broadcastPresence = (io, namespace) => {
  const onlineUserIds = getOnlineUserIds();
  namespace.emit('presence:sync', { onlineUsers: onlineUserIds });
};

export const getSocketIdForUser = (userId) => {
  return userSockets.get(userId.toString());
};

const setupChatSocket = (io) => {
  const employeeNamespace = io.of('/employee');
  employeeNamespace.use(authSocket);

  employeeNamespace.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    // Normalize a display name so realtime events (DM + group) always have a proper sender name
    const userName =
      socket.user.name ||
      socket.user.fullName ||
      (socket.user.personalInfo?.firstName && socket.user.personalInfo?.lastName
        ? `${socket.user.personalInfo.firstName} ${socket.user.personalInfo.lastName}`
        : socket.user.email || 'Unknown User');
    
    console.log(`Employee connected: ${userName} (${socket.id})`);
    
    const existingSocketId = userSockets.get(userId);
    if (existingSocketId && existingSocketId !== socket.id) {
      const existingSocket = employeeNamespace.sockets.get(existingSocketId);
      if (existingSocket) {
        console.log(`Disconnecting previous socket for user ${userId}`);
        existingSocket.disconnect(true);
      }
    }
    
    userSockets.set(userId, socket.id);
    onlineUsers.set(userId, {
      socketId: socket.id,
      name: userName,
      lastSeen: new Date()
    });

    try {
      const userGroups = await Group.find({
        'members.user': userId,
        isActive: true
      }).select('_id');
      
      userGroups.forEach(group => {
        socket.join(`group:${group._id}`);
      });
      console.log(`User ${userName} joined ${userGroups.length} group rooms`);
    } catch (err) {
      console.error('Error joining group rooms:', err);
    }

    socket.emit('presence:sync', { onlineUsers: getOnlineUserIds() });
    
    socket.broadcast.emit('presence:update', {
      userId: userId,
      status: 'online',
      name: userName
    });

    socket.on('message', async (payload) => {
      const { from, fromName, to, text, clientMessageId } = payload;
      
      if (!from || !text?.trim()) {
        console.warn('Invalid message payload:', payload);
        socket.emit('error', { type: 'INVALID_PAYLOAD', message: 'Message requires sender and text' });
        return;
      }

      if (to !== 'bot' && from === to) {
        console.warn('Self-chat attempted:', { from, to });
        socket.emit('error', { type: 'SELF_CHAT_PREVENTED', message: 'Cannot send message to yourself' });
        return;
      }

      const dedupKey = clientMessageId || `${from}-${to}-${text.trim()}-${Math.floor(Date.now() / 1000)}`;
      if (processedMessages.has(dedupKey)) {
        console.warn('Duplicate message detected:', dedupKey);
        return;
      }
      processedMessages.set(dedupKey, Date.now());

      try {
        if (to === 'bot') {
          const userMessageDoc = new Message({
            from,
            to: from,
            text: text.trim()
          });
          await userMessageDoc.save();

          socket.emit('message', {
            _id: userMessageDoc._id,
            clientMessageId,
            from,
            to: from,
            text: userMessageDoc.text,
            timestamp: userMessageDoc.timestamp,
            self: true,
            fromBot: false
          });

          const { response } = await processBotMessage(text.trim(), from);

          const botMessageDoc = new Message({
            from: null,
            to: from,
            text: response,
            fromBot: true
          });
          await botMessageDoc.save();

          socket.emit('message', {
            _id: botMessageDoc._id,
            from: null,
            to: from,
            text: response,
            timestamp: botMessageDoc.timestamp,
            self: false,
            fromBot: true
          });
          return;
        }

        const messageDoc = new Message({
          from,
          to,
          text: text.trim()
        });
        await messageDoc.save();

        const recipientSocketId = userSockets.get(to);
        const senderDisplayName = userName; // normalized above
        if (recipientSocketId) {
          io.of('/employee').to(recipientSocketId).emit('message', {
            _id: messageDoc._id,
            from,
            fromName: fromName || senderDisplayName,
            to,
            text: messageDoc.text,
            timestamp: messageDoc.timestamp,
            self: false,
            fromBot: false
          });
        }

        socket.emit('message', {
          _id: messageDoc._id,
          clientMessageId,
          from,
          fromName: fromName || senderDisplayName,
          to,
          text: messageDoc.text,
          timestamp: messageDoc.timestamp,
          self: true,
          fromBot: false
        });

      } catch (err) {
        console.error('Socket message error:', err);
        processedMessages.delete(dedupKey);
        socket.emit('error', { type: 'MESSAGE_FAILED', message: 'Failed to send message' });
      }
    });

    socket.on('group:message', async (payload) => {
      const { groupId, text, clientMessageId } = payload;
      
      if (!groupId || !text || typeof text !== 'string' || !text.trim()) {
        socket.emit('error', { type: 'INVALID_PAYLOAD', message: 'Group message requires groupId and text' });
        return;
      }

      const sanitizedText = text.trim().substring(0, 5000);
      const dedupKey = clientMessageId || `group-${groupId}-${userId}-${sanitizedText.substring(0, 50)}-${Math.floor(Date.now() / 1000)}`;
      if (processedMessages.has(dedupKey)) {
        return;
      }
      processedMessages.set(dedupKey, Date.now());

      try {
        const group = await Group.findById(groupId);
        if (!group) {
          socket.emit('error', { type: 'GROUP_NOT_FOUND', message: 'Group not found' });
          processedMessages.delete(dedupKey);
          return;
        }

        if (!group.isMember(userId)) {
          socket.emit('error', { type: 'NOT_A_MEMBER', message: 'You are not a member of this group' });
          processedMessages.delete(dedupKey);
          return;
        }

        if (!group.canSendMessage(userId)) {
          socket.emit('error', { type: 'PERMISSION_DENIED', message: 'You cannot send messages in this group' });
          processedMessages.delete(dedupKey);
          return;
        }

        const messageDoc = new GroupMessage({
          group: groupId,
          sender: userId,
          text: sanitizedText
        });
        await messageDoc.save();
        await messageDoc.populate('sender', 'name email profileImage');

        group.lastMessage = {
          text: sanitizedText.substring(0, 100),
          sender: userId,
          timestamp: new Date()
        };
        await group.save();

        const messagePayload = {
          _id: messageDoc._id,
          clientMessageId,
          groupId,
          sender: {
            _id: userId,
            name: userName,
            profileImage: socket.user.profileImage || null
          },
          text: messageDoc.text,
          timestamp: messageDoc.createdAt,
          type: 'text'
        };

        io.of('/employee').to(`group:${groupId}`).emit('group:message', messagePayload);

      } catch (err) {
        console.error('Group message error:', err);
        processedMessages.delete(dedupKey);
        socket.emit('error', { type: 'MESSAGE_FAILED', message: 'Failed to send group message' });
      }
    });

    socket.on('group:join', async (data) => {
      const { groupId } = data;
      if (!groupId) return;
      try {
        const group = await Group.findById(groupId).select('members');
        if (!group) {
          socket.emit('error', { type: 'GROUP_NOT_FOUND', message: 'Group not found' });
          return;
        }
        if (!group.isMember(userId)) {
          socket.emit('error', { type: 'NOT_A_MEMBER', message: 'You are not a member of this group' });
          return;
        }
        socket.join(`group:${groupId}`);
        console.log(`User ${userName} joined group room: ${groupId}`);
      } catch (err) {
        console.error('Error joining group room:', err);
        socket.emit('error', { type: 'JOIN_FAILED', message: 'Failed to join group' });
      }
    });

    socket.on('group:leave', (data) => {
      const { groupId } = data;
      socket.leave(`group:${groupId}`);
      console.log(`User ${userName} left group room: ${groupId}`);
    });

    socket.on('group:typing:start', (data) => {
      const { groupId } = data;
      if (groupId) {
        socket.to(`group:${groupId}`).emit('group:typing:start', {
          groupId,
          userId,
          userName
        });
      }
    });

    socket.on('group:typing:stop', (data) => {
      const { groupId } = data;
      if (groupId) {
        socket.to(`group:${groupId}`).emit('group:typing:stop', {
          groupId,
          userId
        });
      }
    });

    socket.on('group:member:added', async (data) => {
      const { groupId, memberIds } = data;
      if (!groupId || !memberIds) return;

      memberIds.forEach(memberId => {
        const memberSocketId = userSockets.get(memberId);
        if (memberSocketId) {
          const memberSocket = employeeNamespace.sockets.get(memberSocketId);
          if (memberSocket) {
            memberSocket.join(`group:${groupId}`);
            memberSocket.emit('group:added', { groupId });
          }
        }
      });
    });

    socket.on('group:member:removed', async (data) => {
      const { groupId, memberId } = data;
      if (!groupId || !memberId) return;

      const memberSocketId = userSockets.get(memberId);
      if (memberSocketId) {
        const memberSocket = employeeNamespace.sockets.get(memberSocketId);
        if (memberSocket) {
          memberSocket.leave(`group:${groupId}`);
          memberSocket.emit('group:removed', { groupId });
        }
      }
    });

    socket.on('typing:start', (data) => {
      const { to } = data;
      if (to && to !== userId) {
        const recipientSocketId = userSockets.get(to);
        if (recipientSocketId) {
          io.of('/employee').to(recipientSocketId).emit('typing:start', {
            from: userId,
            fromName: userName
          });
        }
      }
    });

    socket.on('typing:stop', (data) => {
      const { to } = data;
      if (to && to !== userId) {
        const recipientSocketId = userSockets.get(to);
        if (recipientSocketId) {
          io.of('/employee').to(recipientSocketId).emit('typing:stop', {
            from: userId
          });
        }
      }
    });

    socket.on('disconnect', () => {
      console.log(`Employee disconnected: ${userName} (${socket.id})`);
      
      if (userSockets.get(userId) === socket.id) {
        userSockets.delete(userId);
        onlineUsers.delete(userId);
        
        socket.broadcast.emit('presence:update', {
          userId: userId,
          status: 'offline',
          name: userName,
          lastSeen: new Date()
        });
      }
    });
  });

  const adminNamespace = io.of('/admin');
  adminNamespace.use(authSocket);
  adminNamespace.on('connection', (socket) => {
    console.log(`Admin connected: ${socket.user.fullName} (${socket.id})`);
    socket.on('disconnect', () => {
      console.log(`Admin disconnected: ${socket.user.fullName} (${socket.id})`);
    });
  });
};

export { getOnlineUserIds };
export default setupChatSocket;
