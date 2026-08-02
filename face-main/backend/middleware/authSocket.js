// backend/middleware/authSocket.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const authSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Fetch enough fields to build a reliable display name for realtime events
    const user = await User.findById(decoded.id)
      .select('role name fullName email personalInfo');
    if (!user) return next(new Error('User not found'));

    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
};

export default authSocket;