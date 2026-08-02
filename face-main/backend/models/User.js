import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['admin', 'employee'],
    default: 'employee'
  },
  employeeId: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  profileImage: {
    type: String,
    default: null
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  emailVerified: {
    type: Boolean,
    default: true // Set to true for now, can be false if email verification is implemented
  },
  emailVerificationToken: String,
  emailVerificationExpire: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Virtual for checking if account is locked
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Auto-generate employeeId for employees
userSchema.pre('save', async function(next) {
  // Only generate employeeId for employees and if not already set
  if (this.role === 'employee' && !this.employeeId) {
    try {
      // Find the last employee ID to generate the next one
      const lastEmployee = await this.constructor.findOne(
        { role: 'employee', employeeId: { $exists: true } },
        {},
        { sort: { employeeId: -1 } }
      );

      if (lastEmployee && lastEmployee.employeeId) {
        // Extract number from last employee ID (e.g., EMP001 -> 1)
        const lastNumber = parseInt(lastEmployee.employeeId.replace(/\D/g, ''));
        const nextNumber = lastNumber + 1;
        this.employeeId = `EMP${nextNumber.toString().padStart(3, '0')}`;
      } else {
        // First employee
        this.employeeId = 'EMP001';
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Encrypt password using bcrypt
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      role: this.role,
      email: this.email,
      employeeId: this.employeeId
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || '30d'
    }
  );
};

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password token
userSchema.methods.getResetPasswordToken = function() {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

// Handle failed login attempts
userSchema.methods.handleFailedLogin = async function() {
  // Increment login attempts
  this.loginAttempts += 1;

  // Lock account after configured number of failed attempts
  const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 10;
  const lockTimeMinutes = parseInt(process.env.LOCK_TIME_MINUTES) || 10;

  if (this.loginAttempts >= maxAttempts) {
    this.lockUntil = Date.now() + lockTimeMinutes * 60 * 1000; // Configurable lock time
  }

  await this.save();
};

// Update last login
userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  this.loginAttempts = 0; // Reset login attempts on successful login
  this.lockUntil = undefined; // Remove lock
  await this.save();
};

// Manually unlock account (admin function)
userSchema.methods.unlockAccount = async function() {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  await this.save();
};

// Static method to find by credentials
userSchema.statics.findByCredentials = async function(email, password) {
  const user = await this.findOne({ 
    email: email.toLowerCase(),
    isActive: true
  }).select('+password');

  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Check if account is locked
  if (user.isLocked) {
    throw new Error('Account temporarily locked due to too many failed login attempts');
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    // Handle failed login attempt
    await user.handleFailedLogin();
    throw new Error('Invalid credentials');
  }

  // Reset login attempts on successful login
  if (user.loginAttempts > 0) {
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();
  }

  return user;
};

// Static method to get user stats
userSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
        },
        inactiveUsers: {
          $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] }
        },
        admins: {
          $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] }
        },
        employees: {
          $sum: { $cond: [{ $eq: ['$role', 'employee'] }, 1, 0] }
        }
      }
    }
  ]);

  return stats[0] || {
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    admins: 0,
    employees: 0
  };
};

// Remove sensitive fields when converting to JSON
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpire;
  delete user.emailVerificationToken;
  delete user.emailVerificationExpire;
  delete user.loginAttempts;
  delete user.lockUntil;
  return user;
};

export default mongoose.model('User', userSchema);