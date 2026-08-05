import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar,
    Clock,
    Plus,
    Trash2,
    Save,
    Send,
    CheckCircle,
    AlertCircle,
    Loader2,
    Info,
    ArrowLeft
} from 'lucide-react';
import { taskService } from '../../services/taskService';
import toast from 'react-hot-toast';

const toTimeInputValue = (timeText) => {
    const match = String(timeText || '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return '';

    let hours = Number(match[1]);
    const minutes = match[2];
    const meridiem = match[3].toUpperCase();

    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;

    return `${String(hours).padStart(2, '0')}:${minutes}`;
};

const fromTimeInputValue = (timeValue) => {
    if (!timeValue) return '';

    const [rawHours, minutes] = timeValue.split(':');
    const hours24 = Number(rawHours);
    const meridiem = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 || 12;

    return `${hours12}:${minutes} ${meridiem}`;
};

const parseSlotType = (slotType) => {
    const [start = '', end = ''] = String(slotType || '').split(' - ');
    return {
        startTime: toTimeInputValue(start),
        endTime: toTimeInputValue(end)
    };
};

const buildSlotType = (startTime, endTime, previousSlotType) => {
    const previous = parseSlotType(previousSlotType);
    const nextStart = startTime || previous.startTime;
    const nextEnd = endTime || previous.endTime;

    if (!nextStart || !nextEnd) return previousSlotType || '';
    return `${fromTimeInputValue(nextStart)} - ${fromTimeInputValue(nextEnd)}`;
};

const openTimePicker = (event) => {
    event.currentTarget.showPicker?.();
};

const DayBookEntry = ({ embedded = false, onClose }) => {
    const [dayBook, setDayBook] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tasks, setTasks] = useState([]);
    const navigate = useNavigate();

    const fetchTodayDayBook = async () => {
        try {
            setLoading(true);
            const response = await taskService.getTodayDayBook();
            if (response.success) {
                setDayBook(response.dayBook);
            }
        } catch (error) {
            console.error('Fetch daybook error:', error);
            toast.error(error.message || 'Failed to fetch today\'s day book');
        } finally {
            setLoading(false);
        }
    };

    const fetchTasks = async () => {
        try {
            const response = await taskService.getTasks();
            if (response.success) {
                setTasks(response.tasks);
            }
        } catch (error) {
            console.error('Failed to fetch tasks', error);
        }
    };

    useEffect(() => {
        fetchTodayDayBook();
        fetchTasks();
    }, []);

    const handleSlotChange = (index, field, value) => {
        const updatedSlots = [...dayBook.slots];
        updatedSlots[index] = { ...updatedSlots[index], [field]: value };
        setDayBook({ ...dayBook, slots: updatedSlots });
    };

    const handleSlotTimeChange = (index, field, value) => {
        const slot = dayBook.slots[index];
        const currentTime = parseSlotType(slot.slotType);
        const nextSlotType = buildSlotType(
            field === 'startTime' ? value : currentTime.startTime,
            field === 'endTime' ? value : currentTime.endTime,
            slot.slotType
        );

        handleSlotChange(index, 'slotType', nextSlotType);
    };

    const handleSave = async (submit = false) => {
        try {
            setSaving(true);
            // Validate: if submitting, all entries should have descriptions
            if (submit) {
                const emptySlots = dayBook.slots.filter(s => !s.description);
                if (emptySlots.length > 0) {
                    toast.error('Please fill in all slot descriptions before submitting');
                    setSaving(false);
                    return;
                }

                const emptyTimeSlots = dayBook.slots.filter(s => !s.slotType?.trim());
                if (emptyTimeSlots.length > 0) {
                    toast.error('Please fill in all time slots before submitting');
                    setSaving(false);
                    return;
                }
            }

            const response = await taskService.submitDayBook({
                slots: dayBook.slots,
                status: submit ? 'Submitted' : 'Draft'
            });

            if (response.success) {
                toast.success(submit ? 'Day Book submitted successfully' : 'Day Book saved successfully');
                fetchTodayDayBook();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save Day Book');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] bg-slate-50">
                <div className="flex flex-col items-center space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                    <p className="text-slate-500 text-sm">Loading your day book...</p>
                </div>
            </div>
        );
    }

    const isEditable = dayBook?.status === 'Draft' || dayBook?.status === 'Rejected' || dayBook?.status === 'Pending';

    const handleBack = () => {
        if (embedded && onClose) {
            onClose();
            return;
        }

        navigate('/employee/tasks');
    };

    return (
        <div className={`${embedded ? 'p-4 sm:p-5 space-y-4' : 'p-4 sm:p-6 lg:p-8 space-y-8'} max-w-5xl mx-auto bg-slate-50`}>
            <style>{`
                @keyframes fadeSlideUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-enter {
                    animation: fadeSlideUp 0.4s ease-out both;
                }
            `}</style>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start space-x-4">
                    <button
                        onClick={handleBack}
                        className="mt-1 p-2 bg-white border border-slate-200 text-slate-400 rounded-lg hover:text-slate-600 hover:bg-slate-50 transition-all duration-200 shadow-sm"
                        title="Back to Tasks"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className={`${embedded ? 'text-2xl' : 'text-3xl'} font-bold text-slate-900 mb-1`}>Daily Slot Report (EOD)</h1>
                        <div className="flex items-center text-slate-500">
                            <Calendar className="w-4 h-4 mr-2" />
                            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <div className={`px-4 py-2 rounded-lg text-sm font-medium ${dayBook?.status === 'Approved' ? 'bg-green-100 text-green-700' :
                        dayBook?.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                            dayBook?.status === 'Submitted' ? 'bg-blue-100 text-blue-700' :
                                'bg-amber-100 text-amber-700'
                        }`}>
                        Status: {dayBook?.status || 'Draft'}
                    </div>
                </div>
            </div>

            {dayBook?.adminComment && (
                <div className="animate-enter p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-red-700 font-bold text-sm">Feedback from Admin:</p>
                        <p className="text-slate-600 text-sm mt-1">{dayBook.adminComment}</p>
                    </div>
                </div>
            )}

            {dayBook?.status === 'Approved' && (
                <div className="animate-enter p-4 bg-green-50 border border-green-200 rounded-xl flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-green-700 font-bold text-sm">Report Approved</p>
                        <p className="text-slate-600 text-sm mt-1">Great job! Your EOD report for today has been approved.</p>
                    </div>
                </div>
            )}

            {/* Info Card */}
            <div className={`animate-enter bg-white border border-blue-200 shadow-sm rounded-2xl ${embedded ? 'p-3' : 'p-4'} flex items-center space-x-4 bg-blue-50/50`}>
                <div className={`${embedded ? 'w-9 h-9' : 'w-10 h-10'} bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0`}>
                    <Info className={`${embedded ? 'w-4 h-4' : 'w-5 h-5'} text-blue-600`} />
                </div>
                <p className="text-slate-600 text-sm">
                    Please fill in your work details for each 2-hour slot. Link your tasks where applicable to automatically update their status.
                </p>
            </div>

            {/* Slots Table */}
            <div className="animate-enter bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden" style={{ animationDelay: '80ms' }}>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-white border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className={`text-left ${embedded ? 'p-3' : 'p-6'} text-slate-600 font-semibold w-56`}>Time Slot</th>
                                <th className={`text-left ${embedded ? 'p-3' : 'p-6'} text-slate-600 font-semibold w-40`}>Work Type</th>
                                <th className={`text-left ${embedded ? 'p-3' : 'p-6'} text-slate-600 font-semibold`}>Work Description & Task Linking</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {dayBook?.slots.map((slot, index) => (
                                <tr key={index} className="hover:bg-blue-50 transition-all duration-200">
                                    <td className={embedded ? 'p-3' : 'p-6'}>
                                        <div className="flex items-start gap-2">
                                            <Clock className="w-4 h-4 text-blue-600 mt-2.5 flex-shrink-0" />
                                            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5">
                                                <input
                                                    type="time"
                                                    disabled={!isEditable}
                                                    value={parseSlotType(slot.slotType).startTime}
                                                    onChange={(e) => handleSlotTimeChange(index, 'startTime', e.target.value)}
                                                    onClick={openTimePicker}
                                                    onFocus={openTimePicker}
                                                    className="min-w-[82px] w-full cursor-pointer px-2 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                                                    aria-label={`Start time for slot ${index + 1}`}
                                                />
                                                <span className="text-slate-400 text-xs">to</span>
                                                <input
                                                    type="time"
                                                    disabled={!isEditable}
                                                    value={parseSlotType(slot.slotType).endTime}
                                                    onChange={(e) => handleSlotTimeChange(index, 'endTime', e.target.value)}
                                                    onClick={openTimePicker}
                                                    onFocus={openTimePicker}
                                                    className="min-w-[82px] w-full cursor-pointer px-2 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                                                    aria-label={`End time for slot ${index + 1}`}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className={embedded ? 'p-3' : 'p-6'}>
                                        {index === 1 ? (
                                            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-sm">
                                                Break
                                            </div>
                                        ) : (
                                            <select
                                                disabled={!isEditable}
                                                value={slot.taskRef?._id || slot.taskRef || slot.workType}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (['Meeting', 'Learning', 'Internal Work', 'Other'].includes(val)) {
                                                        handleSlotChange(index, 'workType', val);
                                                        handleSlotChange(index, 'taskRef', null);
                                                    } else {
                                                        handleSlotChange(index, 'workType', 'Task');
                                                        handleSlotChange(index, 'taskRef', val);
                                                        // Auto-fill description if empty
                                                        const selectedTask = tasks.find(t => t._id === val);
                                                        if (selectedTask && !slot.description) {
                                                            handleSlotChange(index, 'description', selectedTask.description);
                                                        }
                                                    }
                                                }}
                                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 disabled:opacity-50"
                                            >
                                                <optgroup label="Active Tasks">
                                                    {tasks.filter(t => t.status !== 'Cancelled' && t.status !== 'Completed').map(task => (
                                                        <option key={task._id} value={task._id}>
                                                            {task.description.substring(0, 40)}...
                                                        </option>
                                                    ))}
                                                </optgroup>
                                                <optgroup label="Categories">
                                                    <option value="Meeting">Meeting</option>
                                                    <option value="Learning">Learning</option>
                                                    <option value="Internal Work">Internal Work</option>
                                                    <option value="Other">Other</option>
                                                </optgroup>
                                            </select>
                                        )}
                                    </td>
                                    <td className={`${embedded ? 'p-3 space-y-2' : 'p-6 space-y-3'}`}>
                                        {index === 1 ? (
                                            <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-sm">
                                                Lunch Break
                                            </div>
                                        ) : (
                                            <>
                                                <textarea
                                                    disabled={!isEditable}
                                                    placeholder="What did you work on during this slot?"
                                                    value={slot.description}
                                                    onChange={(e) => handleSlotChange(index, 'description', e.target.value)}
                                                    rows={embedded ? '1' : '2'}
                                                    className={`w-full px-4 ${embedded ? 'py-2' : 'py-3'} bg-white border border-slate-300 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 disabled:opacity-50`}
                                                ></textarea>

                                                {slot.taskRef && (
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-[10px] text-blue-700 font-medium px-2 py-1 bg-blue-100 rounded items-center flex">
                                                            <CheckCircle className="w-3 h-3 mr-1" />
                                                            Linked to Task
                                                        </span>
                                                        <button
                                                            onClick={() => {
                                                                handleSlotChange(index, 'taskRef', null);
                                                                handleSlotChange(index, 'workType', 'Other');
                                                            }}
                                                            className="text-[10px] text-slate-400 hover:text-red-600 transition-colors duration-200"
                                                        >
                                                            Unlink
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Action Buttons */}
            {isEditable && (
                <div className={`flex flex-col sm:flex-row items-center justify-end gap-3 ${embedded ? 'pb-2' : 'pb-12'}`}>
                    <button
                        disabled={saving}
                        onClick={handleBack}
                        className="w-full sm:w-auto px-8 py-3 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 hover:text-slate-700 transition-all duration-200 flex items-center justify-center order-last sm:order-first disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        disabled={saving}
                        onClick={() => handleSave(false)}
                        className="w-full sm:w-auto px-8 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-all duration-200 flex items-center justify-center disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Draft
                    </button>
                    <button
                        disabled={saving}
                        onClick={() => handleSave(true)}
                        className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                        Submit Report
                    </button>
                </div>
            )}
        </div>
    );
};

export default DayBookEntry;
