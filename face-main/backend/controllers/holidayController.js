import Holiday from '../models/Holiday.js';

// @desc    Get all holidays
// @route   GET /api/holidays
// @access  Private
export const getHolidays = async (req, res) => {
    try {
        const holidays = await Holiday.find().sort({ date: 1 });
        res.json({ success: true, holidays });
    } catch (error) {
        console.error('Get holidays error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create a holiday
// @route   POST /api/holidays
// @access  Private (Admin)
export const createHoliday = async (req, res) => {
    try {
        const { title, date, description, type } = req.body;

        const existingHoliday = await Holiday.findOne({ date });
        if (existingHoliday) {
            return res.status(400).json({ success: false, message: 'A holiday already exists on this date' });
        }

        const holiday = await Holiday.create({ title, date, description, type });
        res.status(201).json({ success: true, holiday });
    } catch (error) {
        console.error('Create holiday error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Update a holiday
// @route   PUT /api/holidays/:id
// @access  Private (Admin)
export const updateHoliday = async (req, res) => {
    try {
        const { title, date, description, type } = req.body;

        let holiday = await Holiday.findById(req.params.id);
        if (!holiday) {
            return res.status(404).json({ success: false, message: 'Holiday not found' });
        }

        if (date && date !== holiday.date.toISOString().split('T')[0]) {
            const existingHoliday = await Holiday.findOne({ date });
            if (existingHoliday) {
                return res.status(400).json({ success: false, message: 'A holiday already exists on this date' });
            }
        }

        holiday = await Holiday.findByIdAndUpdate(
            req.params.id,
            { title, date, description, type },
            { new: true, runValidators: true }
        );

        res.json({ success: true, holiday });
    } catch (error) {
        console.error('Update holiday error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Delete a holiday
// @route   DELETE /api/holidays/:id
// @access  Private (Admin)
export const deleteHoliday = async (req, res) => {
    try {
        const holiday = await Holiday.findById(req.params.id);
        if (!holiday) {
            return res.status(404).json({ success: false, message: 'Holiday not found' });
        }

        await holiday.deleteOne();
        res.json({ success: true, message: 'Holiday deleted successfully' });
    } catch (error) {
        console.error('Delete holiday error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
