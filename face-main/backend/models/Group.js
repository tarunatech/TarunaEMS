import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'member'],
    default: 'member'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { _id: false });

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  avatar: {
    type: String,
    default: null
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [memberSchema],
  settings: {
    onlyAdminsCanSend: {
      type: Boolean,
      default: false
    },
    onlyAdminsCanAddMembers: {
      type: Boolean,
      default: false
    },
    onlyAdminsCanEditInfo: {
      type: Boolean,
      default: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastMessage: {
    text: String,
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: Date
  }
}, {
  timestamps: true
});

groupSchema.index({ owner: 1 });
groupSchema.index({ 'members.user': 1 });
groupSchema.index({ isActive: 1 });
groupSchema.index({ updatedAt: -1 });

groupSchema.methods.isMember = function(userId) {
  return this.members.some(m => m.user.toString() === userId.toString());
};

groupSchema.methods.isAdmin = function(userId) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  return member && (member.role === 'admin' || member.role === 'owner');
};

groupSchema.methods.isOwner = function(userId) {
  return this.owner.toString() === userId.toString();
};

groupSchema.methods.getMemberRole = function(userId) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  return member ? member.role : null;
};

groupSchema.methods.canSendMessage = function(userId) {
  if (!this.isMember(userId)) return false;
  if (!this.settings.onlyAdminsCanSend) return true;
  return this.isAdmin(userId);
};

groupSchema.methods.canAddMembers = function(userId) {
  if (!this.isMember(userId)) return false;
  if (!this.settings.onlyAdminsCanAddMembers) return true;
  return this.isAdmin(userId);
};

groupSchema.methods.canEditInfo = function(userId) {
  if (!this.isMember(userId)) return false;
  if (!this.settings.onlyAdminsCanEditInfo) return true;
  return this.isAdmin(userId);
};

export default mongoose.model('Group', groupSchema);
