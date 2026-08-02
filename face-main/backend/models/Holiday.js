import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Holiday title is required'],
        trim: true
    },
    date: {
        type: Date,
        required: [true, 'Holiday date is required'],
        unique: true
    },
    description: {
        type: String,
        trim: true
    },
    type: {
        type: String,
        enum: ['Public', 'Optional', 'Company'],
        default: 'Public'
    }
}, {
    timestamps: true
});

// Index for faster queries by date
holidaySchema.index({ date: 1 });

export default mongoose.model('Holiday', holidaySchema);
