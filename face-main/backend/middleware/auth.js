// middleware/auth.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Protect routes - verify JWT token
export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) return res.status(401).json({ success: false, message: 'Token valid but user no longer exists' });
      if (!user.isActive) return res.status(401).json({ success: false, message: 'User account is deactivated' });

      req.user = user;
      next();
    } catch (tokenError) {
      if (tokenError.name === 'TokenExpiredError') return res.status(401).json({ success: false, message: 'Token has expired' });
      if (tokenError.name === 'JsonWebTokenError') return res.status(401).json({ success: false, message: 'Invalid token' });
      return res.status(401).json({ success: false, message: 'Token verification failed' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ success: false, message: 'Server error in authentication' });
  }
};

// Authorize specific roles
export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Access denied. Please login first.' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ success: false, message: `Access denied. Role '${req.user.role}' is not authorized for this action.` });
  next();
};

// Admin only
export const adminOnly = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Access denied. Please login first.' });
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required.' });
  next();
};

// Employee only
export const employeeOnly = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Access denied. Please login first.' });
  if (req.user.role !== 'employee') return res.status(403).json({ success: false, message: 'Employee access required.' });
  next();
};

// Owner or Admin
export const ownerOrAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Access denied. Please login first.' });
  if (req.user.role === 'admin') return next();

  const resourceUserId = req.params.userId || req.params.id;
  if (req.user._id.toString() !== resourceUserId) return res.status(403).json({ success: false, message: 'Access denied. You can only access your own resources.' });
  next();
};

// Optional auth
export const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) token = req.headers.authorization.split(' ')[1];
    else if (req.cookies?.token) token = req.cookies.token;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (user?.isActive) req.user = user;
      } catch (error) {
        console.log('Optional auth token invalid:', error.message);
      }
    }
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next();
  }
};

// Auth rate limiter
export const authRateLimit = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = req.ip + req.body.email;
    const now = Date.now();

    if (!attempts.has(key)) {
      attempts.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const attempt = attempts.get(key);

    if (now > attempt.resetTime) {
      attempts.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (attempt.count >= maxAttempts) {
      return res.status(429).json({
        success: false,
        message: 'Too many login attempts. Please try again later.',
        retryAfter: Math.ceil((attempt.resetTime - now) / 1000),
      });
    }

    attempt.count++;
    next();
  };
};
