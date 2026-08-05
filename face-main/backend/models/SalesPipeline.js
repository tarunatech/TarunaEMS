import mongoose from 'mongoose';

const stageHistorySchema = new mongoose.Schema({
  fromStage: String,
  toStage: {
    type: String,
    required: true
  },
  action: {
    type: String,
    default: 'stage_change'
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  changedAt: {
    type: Date,
    default: Date.now
  },
  comments: String
}, { _id: false });

const approvalHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'revision_requested'],
    required: true
  },
  comments: String,
  actedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  actedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const salesPipelineSchema = new mongoose.Schema({
  lead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true,
    unique: true,
    index: true
  },
  currentStage: {
    type: String,
    enum: ['client_details', 'quotation', 'admin_approval', 'sent_to_client', 'negotiation', 'won_closed'],
    default: 'client_details'
  },
  clientDetails: {
    requirements: String,
    decisionMaker: String,
    businessNeed: String,
    budgetRange: String,
    timeline: String,
    notes: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedAt: Date
  },
  quotation: {
    quotationNumber: String,
    amount: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    validUntil: Date,
    lineItems: [{
      description: String,
      quantity: {
        type: Number,
        default: 1
      },
      unitPrice: {
        type: Number,
        default: 0
      }
    }],
    notes: String,
    fileUrl: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedAt: Date
  },
  approval: {
    status: {
      type: String,
      enum: ['not_submitted', 'pending', 'approved', 'rejected', 'revision_requested'],
      default: 'not_submitted'
    },
    comments: String,
    submittedAt: Date,
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    history: [approvalHistorySchema]
  },
  sentToClient: {
    sentAt: Date,
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    method: {
      type: String,
      enum: ['Email', 'WhatsApp', 'Portal', 'In-Person', 'Other'],
      default: 'Email'
    },
    recipientEmail: String,
    notes: String
  },
  negotiation: {
    enteredAt: Date,
    lastNegotiationAt: Date,
    expectedCloseDate: Date,
    notes: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  outcome: {
    status: {
      type: String,
      enum: ['open', 'won', 'lost'],
      default: 'open'
    },
    finalValue: {
      type: Number,
      min: 0
    },
    closedAt: Date,
    reason: String,
    notes: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  stageHistory: [stageHistorySchema]
}, {
  timestamps: true
});

export default mongoose.model('SalesPipeline', salesPipelineSchema);
