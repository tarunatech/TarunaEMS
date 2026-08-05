import mongoose from 'mongoose';

const interviewScheduleSchema = new mongoose.Schema(
  {
    candidateName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    resumeUrl: { type: String, trim: true },
    resumeFile: {
      path: { type: String, required: true, trim: true },
      originalName: { type: String, required: true, trim: true },
      mimeType: { type: String, required: true, trim: true },
      size: { type: Number, required: true },
    },
    position: { type: String, required: true, trim: true },
    experience: { type: String, required: true, trim: true },
    interviewDate: { type: Date, required: true },
    interviewTime: { type: String, required: true, trim: true },
    interviewMode: {
      type: String,
      enum: ['Online', 'Offline', 'Telephonic'],
      required: true,
    },
    interviewRound: { type: String, required: true, trim: true },
    skills: { type: String, required: true, trim: true },
    notes: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['Scheduled', 'Completed', 'Selected', 'Rejected', 'Cancelled'],
      default: 'Scheduled',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

interviewScheduleSchema.index({ interviewDate: 1, interviewTime: 1 });
interviewScheduleSchema.index({ createdBy: 1, createdAt: -1 });

export default mongoose.model('InterviewSchedule', interviewScheduleSchema);
