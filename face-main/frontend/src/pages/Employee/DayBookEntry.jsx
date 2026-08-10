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
       <div className={`${embedded ? 'p-2 sm:p-5 space-y-2 sm:space-y-4' : 'p-4 sm:p-6 lg:p-8 space-y-8'} max-w-5xl mx-auto bg-slate-50`}>
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
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div className="flex items-start space-x-2 sm:space-x-4">
                    <button
                        onClick={handleBack}
                        className="mt-0.5 rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:text-slate-600 sm:mt-1 sm:p-2"
                        title="Back to Tasks"
                    >
                        <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                    <div className="min-w-0 pr-9 sm:pr-0">
                        <h1 className={`${embedded ? 'truncate text-[15px] sm:text-2xl' : 'text-2xl sm:text-3xl'} font-bold leading-tight text-slate-900 mb-0.5`}>Daily Slot Report (EOD)</h1>
                        <div className="flex items-center text-xs text-slate-500 sm:text-base">
                            <Calendar className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <div className={`rounded-lg px-3 py-1.5 text-xs font-medium sm:px-4 sm:py-2 sm:text-sm ${dayBook?.status === 'Approved' ? 'bg-green-100 text-green-700' :
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
            <div className={`animate-enter rounded-xl border border-blue-200 bg-white bg-blue-50/50 shadow-sm sm:rounded-2xl ${embedded ? 'p-2.5' : 'p-4'} flex items-start space-x-2.5 sm:items-center sm:space-x-4`}>
                <div className={`${embedded ? 'h-8 w-8' : 'w-10 h-10'} bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0`}>
                    <Info className={`${embedded ? 'h-4 w-4' : 'w-5 h-5'} text-blue-600`} />
                </div>
                <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
                    Fill each slot and link tasks where needed.
                </p>
            </div>

            {/* Slots Table */}
            <div className="animate-enter bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden" style={{ animationDelay: '80ms' }}>
               <div className="block max-h-[48dvh] space-y-2 overflow-y-auto p-2 md:hidden">
    {dayBook?.slots.map((slot, index) => (
        <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-900">Slot {index + 1}</p>
                {index === 1 && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">Break</span>
                )}
            </div>

            <div className="space-y-2">
                                <div>
                                    <label className="mb-1 block text-[11px] font-medium text-slate-500">Time Slot</label>
                                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
                                        <input
                                            type="time"
                                            disabled={!isEditable}
                                            value={parseSlotType(slot.slotType).startTime}
                                            onChange={(e) => handleSlotTimeChange(index, 'startTime', e.target.value)}
                                            onClick={openTimePicker}
                                            onFocus={openTimePicker}
                                            className="min-w-0 cursor-pointer rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-900 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                            aria-label={`Start time for slot ${index + 1}`}
                                        />
                                        <span className="text-xs text-slate-400">to</span>
                                        <input
                                            type="time"
                                            disabled={!isEditable}
                                            value={parseSlotType(slot.slotType).endTime}
                                            onChange={(e) => handleSlotTimeChange(index, 'endTime', e.target.value)}
                                            onClick={openTimePicker}
                                            onFocus={openTimePicker}
                                            className="min-w-0 cursor-pointer rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-900 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                            aria-label={`End time for slot ${index + 1}`}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1 block text-[11px] font-medium text-slate-500">Work Type</label>
                                    {index === 1 ? (
                                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-500">Break</div>
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
                                                    const selectedTask = tasks.find(t => t._id === val);
                                                    if (selectedTask && !slot.description) {
                                                        handleSlotChange(index, 'description', selectedTask.description);
                                                    }
                                                }
                                            }}
                                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
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
                                </div>

                                <div>
                                    <label className="mb-1 block text-[11px] font-medium text-slate-500">Work Description</label>
                                    {index === 1 ? (
                                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-500">Lunch Break</div>
                                    ) : (
                                        <>
                                            <textarea
                                                disabled={!isEditable}
                                                placeholder="What did you work on?"
                                                value={slot.description}
                                                onChange={(e) => handleSlotChange(index, 'description', e.target.value)}
                                                rows="1"
                                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder-slate-400 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
                                            />

                                            {slot.taskRef && (
                                                <div className="mt-2 flex items-center space-x-2">
                                                    <span className="flex items-center rounded bg-blue-100 px-2 py-1 text-[10px] font-medium text-blue-700">
                                                        <CheckCircle className="mr-1 h-3 w-3" />
                                                        Linked to Task
                                                    </span>
                                                    <button
                                                        onClick={() => {
                                                            handleSlotChange(index, 'taskRef', null);
                                                            handleSlotChange(index, 'workType', 'Other');
                                                        }}
                                                        className="text-[10px] text-slate-400 transition-colors duration-200 hover:text-red-600"
                                                    >
                                                        Unlink
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="hidden overflow-x-auto md:block">
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
                <div className={`items-center justify-end gap-2 sm:flex sm:gap-3 ${embedded ? 'sticky bottom-0 z-20 -mx-2.5 grid grid-cols-2 border-t border-slate-200 bg-slate-50 px-2.5 py-2 sm:static sm:mx-0 sm:border-t-0 sm:bg-transparent sm:px-0 sm:pb-2 sm:pt-0' : 'flex flex-col sm:flex-row pb-12'}`}>
                    <button
                        disabled={saving}
                        onClick={handleBack}
                        className="col-span-2 order-last flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 transition-all duration-200 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50 sm:order-first sm:w-auto sm:px-8 sm:py-3 sm:text-base"
                    >
                        Cancel
                    </button>
                    <button
                        disabled={saving}
                        onClick={() => handleSave(false)}
                        className="flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition-all duration-200 hover:bg-slate-50 disabled:opacity-50 sm:w-auto sm:px-8 sm:py-3 sm:text-base"
                    >
                        {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                        Save
                    </button>
                    <button
                        disabled={saving}
                        onClick={() => handleSave(true)}
                        className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 px-3 py-2 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md disabled:opacity-50 disabled:hover:scale-100 sm:w-auto sm:px-8 sm:py-3 sm:text-base"
                    >
                        {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
                        Submit
                    </button>
                </div>
            )}
        </div>
    );
};

export default DayBookEntry;
