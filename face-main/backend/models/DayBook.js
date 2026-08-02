import mongoose from 'mongoose';

const dayBookSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    slots: [{
        slotType: {
            type: String,
            enum: ['10:00 AM - 1:00 PM', '1:00 PM - 2:00 PM', '2:00 PM - 7:00 PM'],
            required: true
        },
        workType: {
            type: String,
            enum: ['Task', 'Meeting', 'Learning', 'Internal Work', 'Break', 'Lunch Break', 'Other'],
            required: true
        },
        taskRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Task'
        },
        description: {
            type: String,
            trim: true
        }
    }],
    status: {
        type: String,
        enum: ['Pending', 'Draft', 'Submitted', 'Approved', 'Rejected'],
        default: 'Draft'
    },
    adminComment: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Ensure only one daybook per employee per day
dayBookSchema.index({ employee: 1, date: 1 }, { unique: true });

export default mongoose.model('DayBook', dayBookSchema);
