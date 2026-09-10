// backend/middleware/authSocket.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Employee from '../models/Employee.js';

const authSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    const user = await User.findById(userId);
    if (!user) return next(new Error('User not found'));

    let employee = null;
    try {
      employee = await Employee.findOne({ user: userId });
    } catch (e) {
      // Ignore employee lookup failure
    }

    const firstName = employee?.personalInfo?.firstName?.trim();
    const lastName = employee?.personalInfo?.lastName?.trim();
    const empFullName = [firstName, lastName].filter(Boolean).join(' ');

    const displayName = user.name || empFullName || user.email || 'Employee';
    const profileImage = user.profileImage || employee?.profileImage || null;

    socket.user = {
      ...user,
      _id: String(user._id || user.id || userId),
      id: String(user._id || user.id || userId),
      name: displayName,
      displayName,
      profileImage
    };

    next();
  } catch (err) {
    console.error('authSocket error:', err.message);
    next(new Error('Authentication error'));
  }
};

export default authSocket;