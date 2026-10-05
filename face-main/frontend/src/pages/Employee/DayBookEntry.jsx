import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar,
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

const WORK_TYPE_OPTIONS = [
    { label: 'Other', value: 'Other' }
];

const HALF_DAY_RANGES = [
    { key: 'first', label: 'First half', rangeLabel: '10:00 AM - 1:00 PM', start: 10 * 60, end: 13 * 60 },
    { key: 'second', label: 'Second half', rangeLabel: '2:00 PM - 7:00 PM', start: 14 * 60, end: 19 * 60 }
];

const timeInputToMinutes = (timeValue) => {
    if (!timeValue) return null;
    const [hours, minutes] = timeValue.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
};

const minutesToTimeInput = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const minutesToSlotText = (totalMinutes) => fromTimeInputValue(minutesToTimeInput(totalMinutes));

const buildSlotFromMinutes = (start, end) => `${minutesToSlotText(start)} - ${minutesToSlotText(end)}`;

const getSlotMinutes = (slotType) => {
    const parsed = parseSlotType(slotType);
    return {
        start: timeInputToMinutes(parsed.startTime),
        end: timeInputToMinutes(parsed.endTime)
    };
};

const parseDescriptionSections = (description = '') => {
    const text = String(description || '');
    if (!text) return { completed: '', pending: '' };

    const completedMatch = text.match(/(?:Completed Work|Completed):\s*([\s\S]*?)(?=(?:\n\nPending Work|\n\nPending|Pending Work:|Pending:)|$)/i);
    const pendingMatch = text.match(/(?:Pending Work|Pending):\s*([\s\S]*?)$/i);

    if (completedMatch || pendingMatch) {
        return {
            completed: completedMatch ? completedMatch[1].replace(/^\n+/, '') : '',
            pending: pendingMatch ? pendingMatch[1].replace(/^\n+/, '') : ''
        };
    }

    return {
        completed: text,
        pending: ''
    };
};

const buildDescriptionFromSections = (completed = '', pending = '') => {
    const compStr = String(completed || '');
    const pendStr = String(pending || '');

    if (compStr.trim() && pendStr.trim()) {
        return `Completed Work:\n${compStr}\n\nPending Work:\n${pendStr}`;
    }
    if (compStr.trim()) {
        return `Completed Work:\n${compStr}`;
    }
    if (pendStr.trim()) {
        return `Pending Work:\n${pendStr}`;
    }
    return compStr || pendStr ? `Completed Work:\n${compStr}${pendStr}` : '';
};

const isBreakSlot = (slot) => {
    const text = `${slot?.workType || ''} ${slot?.description || ''} ${slot?.slotType || ''}`.toLowerCase();
    return text.includes('break') || text.includes('lunch');
};

const getSlotHalfKey = (slot) => {
    if (isBreakSlot(slot)) return 'break';

    const { start, end } = getSlotMinutes(slot?.slotType);
    if (start !== null) {
        if (start >= 14 * 60) return 'second';
        if (start < 13 * 60) return 'first';
    }

    if (start === null || end === null) return 'first';
    const midpoint = (start + end) / 2;
    return midpoint < 14 * 60 ? 'first' : 'second';
};

const getCurrentTimeFormatted = () => {
    const now = new Date();
    const hours24 = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const meridiem = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 || 12;
    return `${hours12}:${minutes} ${meridiem}`;
};

const applyCurrentTimeToEndSlot = (slots, isHalf, halfType) => {
    if (!slots || !Array.isArray(slots) || slots.length === 0) return slots || [];

    const currentTimeStr = getCurrentTimeFormatted();
    const updatedSlots = slots.map(s => ({ ...s }));

    const firstHalfIndices = [];
    const secondHalfIndices = [];

    updatedSlots.forEach((slot, idx) => {
        if (!isBreakSlot(slot)) {
            if (getSlotHalfKey(slot) === 'first') {
                firstHalfIndices.push(idx);
            } else {
                secondHalfIndices.push(idx);
            }
        }
    });

    if (isHalf) {
        if (halfType === 'first') {
            if (firstHalfIndices.length > 0) {
                const lastIdx = firstHalfIndices[firstHalfIndices.length - 1];
                const parsed = parseSlotType(updatedSlots[lastIdx].slotType);
                const startStr = fromTimeInputValue(parsed.startTime) || '10:00 AM';
                updatedSlots[lastIdx].slotType = `${startStr} - ${currentTimeStr}`;
            }
        } else {
            if (secondHalfIndices.length > 0) {
                const lastIdx = secondHalfIndices[secondHalfIndices.length - 1];
                const parsed = parseSlotType(updatedSlots[lastIdx].slotType);
                const startStr = fromTimeInputValue(parsed.startTime) || '2:00 PM';
                updatedSlots[lastIdx].slotType = `${startStr} - ${currentTimeStr}`;
            }
        }
    } else {
        // Normal Day (Full Day)
        // If first half has single slot, ensure standard end is 1:00 PM
        if (firstHalfIndices.length === 1) {
            const firstIdx = firstHalfIndices[0];
            const parsed = parseSlotType(updatedSlots[firstIdx].slotType);
            const startStr = fromTimeInputValue(parsed.startTime) || '10:00 AM';
            updatedSlots[firstIdx].slotType = `${startStr} - 1:00 PM`;
        }

        // Second half last slot fetches current time
        if (secondHalfIndices.length > 0) {
            const lastIdx = secondHalfIndices[secondHalfIndices.length - 1];
            const parsed = parseSlotType(updatedSlots[lastIdx].slotType);
            const startStr = fromTimeInputValue(parsed.startTime) || '2:00 PM';
            updatedSlots[lastIdx].slotType = `${startStr} - ${currentTimeStr}`;
        }
    }

    return updatedSlots;
};

const DayBookEntry = ({ embedded = false, onClose }) => {
    const [dayBook, setDayBook] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tasks, setTasks] = useState([]);
    const [isHalfDay, setIsHalfDay] = useState(false);
    const [halfDayType, setHalfDayType] = useState('first'); // 'first' | 'second'
    const [includeBreak, setIncludeBreak] = useState(true);
    const navigate = useNavigate();

    const fetchTodayDayBook = async () => {
        try {
            setLoading(true);
            const response = await taskService.getTodayDayBook();
            if (response.success && response.dayBook) {
                const isHalf = Boolean(response.dayBook.isHalfDay);
                const halfType = response.dayBook.halfDayType || 'first';
                let slots = response.dayBook.slots || [];

                if (response.dayBook.status === 'Draft' || response.dayBook.status === 'Pending' || !response.dayBook.status) {
                    slots = applyCurrentTimeToEndSlot(slots, isHalf, halfType);
                }

                setDayBook({
                    ...response.dayBook,
                    slots
                });
                setIsHalfDay(isHalf);
                setHalfDayType(halfType);
                setIncludeBreak(response.dayBook.includeBreak !== undefined ? Boolean(response.dayBook.includeBreak) : true);
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

    const updateSlot = (index, changes) => {
        const updatedSlots = [...dayBook.slots];
        updatedSlots[index] = { ...updatedSlots[index], ...changes };
        setDayBook({ ...dayBook, slots: updatedSlots });
    };

    const handleSlotTimeChange = (index, field, value) => {
        if (!dayBook?.slots || index < 0 || index >= dayBook.slots.length) return;

        const newMinutes = timeInputToMinutes(value);
        if (newMinutes === null) return;

        const updatedSlots = dayBook.slots.map(s => ({ ...s }));
        const currentSlot = updatedSlots[index];
        const { start: curStart, end: curEnd } = getSlotMinutes(currentSlot.slotType);

        if (field === 'endTime') {
            const newStart = curStart !== null ? curStart : Math.max(0, newMinutes - 60);
            currentSlot.slotType = buildSlotFromMinutes(newStart, newMinutes);

            // Auto-sync subsequent slots chronologically
            let prevEnd = newMinutes;
            for (let j = index + 1; j < updatedSlots.length; j++) {
                const nextSlot = updatedSlots[j];
                const { start: nStart, end: nEnd } = getSlotMinutes(nextSlot.slotType);
                if (nStart === null || nEnd === null) break;

                const duration = Math.max(30, nEnd - nStart);
                const nextNewStart = prevEnd;
                let nextNewEnd;

                if (isBreakSlot(nextSlot)) {
                    nextNewEnd = nextNewStart + duration;
                } else if (j === updatedSlots.length - 1) {
                    nextNewEnd = nextNewStart < nEnd ? nEnd : nextNewStart + duration;
                } else {
                    nextNewEnd = nextNewStart + duration;
                }

                nextSlot.slotType = buildSlotFromMinutes(nextNewStart, nextNewEnd);
                prevEnd = nextNewEnd;
            }
        } else if (field === 'startTime') {
            const newEnd = curEnd !== null ? curEnd : newMinutes + 60;
            currentSlot.slotType = buildSlotFromMinutes(newMinutes, newEnd);

            // Auto-sync previous slot's end time if it aligned with old start time
            if (index > 0) {
                const prevSlot = updatedSlots[index - 1];
                const { start: pStart } = getSlotMinutes(prevSlot.slotType);
                if (pStart !== null && pStart < newMinutes) {
                    prevSlot.slotType = buildSlotFromMinutes(pStart, newMinutes);
                }
            }
        }

        setDayBook({ ...dayBook, slots: updatedSlots });
    };

    const getHalfSlots = (halfKey) => dayBook?.slots
        .map((slot, index) => ({ slot, index }))
        .filter(({ slot }) => getSlotHalfKey(slot) === halfKey)
        .sort((a, b) => {
            const aStart = getSlotMinutes(a.slot.slotType).start ?? 0;
            const bStart = getSlotMinutes(b.slot.slotType).start ?? 0;
            return aStart - bStart;
        }) || [];

    const getBreakSlots = () => dayBook?.slots
        .map((slot, index) => ({ slot, index }))
        .filter(({ slot }) => isBreakSlot(slot)) || [];

    const findInsertIndex = (halfKey) => {
        const targetHalfIndex = HALF_DAY_RANGES.findIndex((half) => half.key === halfKey);
        const laterHalf = HALF_DAY_RANGES[targetHalfIndex + 1];
        if (!laterHalf) return dayBook.slots.length;

        const nextHalfIndex = dayBook.slots.findIndex((slot) => getSlotHalfKey(slot) === laterHalf.key || isBreakSlot(slot));
        return nextHalfIndex === -1 ? dayBook.slots.length : nextHalfIndex;
    };

    const addSlotToHalf = (half) => {
        const halfSlots = getHalfSlots(half.key);
        const updatedSlots = [...dayBook.slots];

        const splittable = halfSlots
            .map(({ slot, index }) => ({ ...getSlotMinutes(slot.slotType), index }))
            .filter(({ start, end }) => start !== null && end !== null && end - start > 30)
            .sort((a, b) => (b.end - b.start) - (a.end - a.start))[0];

        if (splittable) {
            const splitPoint = Math.floor((splittable.start + splittable.end) / 2);
            updatedSlots[splittable.index] = {
                ...updatedSlots[splittable.index],
                slotType: buildSlotFromMinutes(splittable.start, splitPoint)
            };
            updatedSlots.splice(splittable.index + 1, 0, {
                slotType: buildSlotFromMinutes(splitPoint, splittable.end),
                workType: 'Other',
                description: ''
            });
            setDayBook({ ...dayBook, slots: updatedSlots });
            return;
        }

        const occupied = halfSlots
            .map(({ slot }) => getSlotMinutes(slot.slotType))
            .filter(({ start, end }) => start !== null && end !== null)
            .sort((a, b) => a.start - b.start);

        const lastEnd = occupied.length > 0 ? occupied[occupied.length - 1].end : half.start;
        const newStart = lastEnd || half.start;
        const newEnd = newStart + 60;

        updatedSlots.splice(findInsertIndex(half.key), 0, {
            slotType: buildSlotFromMinutes(newStart, newEnd),
            workType: 'Other',
            description: ''
        });
        setDayBook({ ...dayBook, slots: updatedSlots });
    };

    const removeSlot = (index) => {
        const slotToRemove = dayBook.slots[index];
        const halfKey = getSlotHalfKey(slotToRemove);

        if (isHalfDay) {
            if (halfKey === halfDayType) {
                const activeHalfWorkSlots = dayBook.slots.filter(
                    (slot, slotIndex) => slotIndex !== index && !isBreakSlot(slot) && getSlotHalfKey(slot) === halfDayType
                );
                if (activeHalfWorkSlots.length < 1) {
                    toast.error(`At least one work slot is required in ${halfDayType === 'first' ? 'First half' : 'Second half'}`);
                    return;
                }
            }
        } else {
            const remainingWorkSlotsInHalf = dayBook.slots.filter(
                (slot, slotIndex) => slotIndex !== index && !isBreakSlot(slot) && getSlotHalfKey(slot) === halfKey
            );
            if (remainingWorkSlotsInHalf.length < 1) {
                toast.error(`At least one work slot is required in ${halfKey === 'first' ? 'First half' : 'Second half'}`);
                return;
            }
        }

        setDayBook({ ...dayBook, slots: dayBook.slots.filter((_, slotIndex) => slotIndex !== index) });
    };

    const isValidTimeSlot = (slot) => {
        const { start, end } = getSlotMinutes(slot.slotType);
        return start !== null && end !== null && start < end;
    };

    const handleSave = async (submit = false) => {
        try {
            setSaving(true);

            // Filter active slots based on Half Day mode & Break option
            const activeSlots = dayBook.slots.filter(slot => {
                if (isBreakSlot(slot)) {
                    return includeBreak;
                }
                if (isHalfDay) {
                    return getSlotHalfKey(slot) === halfDayType;
                }
                return true;
            });

            // Validate: if submitting, active entries should have descriptions
            if (submit) {
                const emptySlots = activeSlots.filter(s => !s.description);
                if (emptySlots.length > 0) {
                    toast.error('Please fill in descriptions for active slots before submitting');
                    setSaving(false);
                    return;
                }

                const emptyTimeSlots = activeSlots.filter(s => !s.slotType?.trim());
                if (emptyTimeSlots.length > 0) {
                    toast.error('Please fill in all time slots before submitting');
                    setSaving(false);
                    return;
                }

                const invalidTimeSlots = activeSlots.filter(slot => !isValidTimeSlot(slot));
                if (invalidTimeSlots.length > 0) {
                    toast.error('Each time slot end time must be after its start time');
                    setSaving(false);
                    return;
                }
            }

            const response = await taskService.submitDayBook({
                slots: activeSlots,
                status: submit ? 'Submitted' : 'Draft',
                isHalfDay,
                halfDayType: isHalfDay ? halfDayType : 'full',
                includeBreak
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
    const activeTasks = tasks.filter(t => t.status !== 'Cancelled' && t.status !== 'Completed');

    const handleBack = () => {
        if (embedded && onClose) {
            onClose();
            return;
        }

        navigate('/employee/tasks');
    };

    const applyWorkType = (index, workType) => {
        updateSlot(index, { workType, taskRef: null, taskTitle: null });
    };

    const applyTaskToSlot = (index, taskId) => {
        if (!taskId) return;

        const selectedTask = activeTasks.find(t => t._id === taskId);
        const currentDescription = dayBook.slots[index].description;
        const taskText = selectedTask ? (selectedTask.title || selectedTask.description || '') : '';

        const newDescription = selectedTask && !currentDescription
            ? buildDescriptionFromSections(taskText, '')
            : currentDescription;

        updateSlot(index, {
            workType: 'Task',
            taskRef: taskId,
            taskTitle: selectedTask?.title || selectedTask?.description || null,
            description: newDescription
        });
    };

    const getSelectedWorkLabel = (slot) => {
        const taskId = slot.taskRef?._id || slot.taskRef;
        if (taskId) {
            const selectedTask = activeTasks.find(t => t._id === taskId) || slot.taskRef;
            const taskText = selectedTask?.title || selectedTask?.description || 'Selected active task';
            return `Active Task: ${taskText}`;
        }

        const option = WORK_TYPE_OPTIONS.find(item => item.value === slot.workType);
        return option?.label || slot.workType || 'Select work type';
    };

    const renderWorkTypePicker = (slot, index, compact = false) => {
        // Determine the currently selected value
        // taskRef._id → specific task selected; taskRef (string) → task id; workType that isn't the unset default → category
        const taskRefId = slot.taskRef?._id || (typeof slot.taskRef === 'string' ? slot.taskRef : null);
        const currentValue = taskRefId || (slot.workType && slot.workType !== 'Task' ? slot.workType : '');

        return (
            <div className="space-y-2">
                <select
                    disabled={!isEditable}
                    value={currentValue}
                    onChange={(e) => {
                        const value = e.target.value;
                        if (!value) return;
                        if (WORK_TYPE_OPTIONS.some(option => option.value === value)) {
                            applyWorkType(index, value);
                            return;
                        }
                        applyTaskToSlot(index, value);
                    }}
                    className={`${compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm'} w-full rounded-lg border border-slate-300 bg-white text-slate-900 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50`}
                >
                    <option value="" disabled>— Select task or category —</option>
                    <optgroup label="Active Tasks">
                        {activeTasks.length ? activeTasks.map(task => {
                            const labelText = task.title || task.description || 'Untitled task';
                            return (
                                <option key={task._id} value={task._id}>
                                    {labelText.substring(0, compact ? 34 : 48)}
                                    {labelText.length > (compact ? 34 : 48) ? '...' : ''}
                                </option>
                            );
                        }) : (
                            <option value="" disabled>No active tasks</option>
                        )}
                    </optgroup>
                    <optgroup label="Categories">
                        {WORK_TYPE_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </optgroup>
                </select>
            </div>
        );
    };

    const renderSlotCard = (slot, index, compact = false) => {
        const lockedBreak = isBreakSlot(slot);
        return (
            <div key={index} className={`${compact ? 'p-2' : 'p-3'} rounded-lg border border-slate-200 bg-white`}>
                <div className="grid gap-2 md:grid-cols-[215px_120px_minmax(0,1fr)_36px] md:items-start">
                    <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-500">Time Slot</label>
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
                            <input
                                type="time"
                                disabled={!isEditable}
                                value={parseSlotType(slot.slotType).startTime}
                                onChange={(e) => handleSlotTimeChange(index, 'startTime', e.target.value)}
                                onClick={openTimePicker}
                                onFocus={openTimePicker}
                                className="min-w-0 w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-1.5 py-1.5 text-xs font-bold tracking-tight text-slate-900 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            <span className="text-xs text-slate-400 font-medium shrink-0">to</span>
                            <input
                                type="time"
                                disabled={!isEditable}
                                value={parseSlotType(slot.slotType).endTime}
                                onChange={(e) => handleSlotTimeChange(index, 'endTime', e.target.value)}
                                onClick={openTimePicker}
                                onFocus={openTimePicker}
                                className="min-w-0 w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-1.5 py-1.5 text-xs font-bold tracking-tight text-slate-900 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-500">Work Type</label>
                        {lockedBreak ? (
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">Break</div>
                        ) : (
                            renderWorkTypePicker(slot, index, compact)
                        )}
                    </div>

                    <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-500">Work Description</label>
                        {lockedBreak ? (
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">Lunch Break</div>
                        ) : (
                            <div className="space-y-2">
                                <div>
                                    <div className="mb-1 flex items-center justify-between">
                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                            Completed Work
                                        </span>
                                    </div>
                                    <textarea
                                        disabled={!isEditable}
                                        placeholder="What was completed?"
                                        value={parseDescriptionSections(slot.description).completed}
                                        onChange={(e) => {
                                            const currentPending = parseDescriptionSections(slot.description).pending;
                                            const newDesc = buildDescriptionFromSections(e.target.value, currentPending);
                                            handleSlotChange(index, 'description', newDesc);
                                        }}
                                        rows={compact ? 2 : 2}
                                        className="w-full min-h-[48px] rounded-lg border border-emerald-200/90 bg-emerald-50/20 px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 transition-all duration-200 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 resize-y"
                                    />
                                </div>

                                <div>
                                    <div className="mb-1 flex items-center justify-between">
                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                            Pending Work
                                        </span>
                                    </div>
                                    <textarea
                                        disabled={!isEditable}
                                        placeholder="What is pending / remaining?"
                                        value={parseDescriptionSections(slot.description).pending}
                                        onChange={(e) => {
                                            const currentCompleted = parseDescriptionSections(slot.description).completed;
                                            const newDesc = buildDescriptionFromSections(currentCompleted, e.target.value);
                                            handleSlotChange(index, 'description', newDesc);
                                        }}
                                        rows={compact ? 2 : 2}
                                        className="w-full min-h-[48px] rounded-lg border border-amber-200/90 bg-amber-50/20 px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 transition-all duration-200 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50 resize-y"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {!lockedBreak && isEditable && (
                        <button
                            type="button"
                            onClick={() => removeSlot(index)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-all duration-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 md:mt-5"
                            title="Remove slot"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const renderHalfSection = (half) => {
        const slotsForHalf = getHalfSlots(half.key);
        const isInactiveHalf = isHalfDay && halfDayType !== half.key;

        return (
            <section
                key={half.key}
                className={`half-shift-section rounded-xl border transition-all duration-200 p-2.5 sm:p-4 ${
                    isInactiveHalf
                        ? 'border-slate-200 bg-slate-100/60 opacity-60'
                        : isHalfDay
                        ? 'border-blue-300 bg-blue-50/20 shadow-2xs'
                        : 'border-slate-200 bg-slate-50'
                }`}
            >
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 sm:text-base">{half.label}:</p>
                        <p className="text-xs font-medium text-slate-500">{half.rangeLabel}</p>
                        {isHalfDay && halfDayType === half.key && (
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                                Active Shift
                            </span>
                        )}
                        {isInactiveHalf && (
                            <span className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                Omitted for Half Day
                            </span>
                        )}
                    </div>
                    {isEditable && !isInactiveHalf && (
                        <button
                            type="button"
                            onClick={() => addSlotToHalf(half)}
                            className="inline-flex w-fit items-center justify-center rounded-lg border border-blue-200 bg-white px-2 py-1 sm:px-3 sm:py-2 text-[11px] sm:text-xs font-semibold text-blue-700 shadow-2xs transition-all duration-200 hover:border-blue-300 hover:bg-blue-50"
                        >
                            <Plus className="mr-1 h-3 w-3 sm:mr-1.5 sm:h-3.5 sm:w-3.5" />
                            Add slot
                        </button>
                    )}
                </div>

                {!isInactiveHalf ? (
                    <div className="space-y-2">
                        {slotsForHalf.length ? (
                            slotsForHalf.map(({ slot, index }) => renderSlotCard(slot, index, embedded))
                        ) : (
                            <div className="no-slots-notice rounded-lg border border-dashed border-slate-300 bg-white px-4 py-5 text-center text-sm text-slate-500">
                                No slots added for this half.
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="omitted-half-notice rounded-lg border border-dashed border-slate-300/80 bg-white/50 px-4 py-3 text-center text-xs text-slate-400 font-medium">
                        This half is omitted because you selected {halfDayType === 'first' ? 'First half' : 'Second half'} for Half Day EOD.
                    </div>
                )}
            </section>
        );
    };

    return (
        <div className={`day-book-entry-page ${embedded ? 'p-2 sm:p-5 space-y-2 sm:space-y-4' : 'p-4 sm:p-6 lg:p-8 space-y-8'} max-w-6xl mx-auto bg-slate-50`}>
            <style>{`
                @keyframes fadeSlideUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-enter {
                    animation: fadeSlideUp 0.4s ease-out both;
                }
                .employee-tasks-modal::-webkit-scrollbar,
                .employee-tasks-modal *::-webkit-scrollbar {
                    display: none !important;
                    width: 0 !important;
                    height: 0 !important;
                }
                .employee-tasks-modal,
                .employee-tasks-modal * {
                    -ms-overflow-style: none !important;
                    scrollbar-width: none !important;
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
            <div className={`animate-enter rounded-xl border border-blue-200/80 bg-blue-50/50 shadow-2xs sm:rounded-2xl ${embedded ? 'p-2 sm:p-2.5' : 'p-3'} flex items-center space-x-2.5`}>
                <div className="h-6 w-6 sm:h-7 sm:w-7 bg-blue-100/90 rounded-full flex items-center justify-center flex-shrink-0">
                    <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
                </div>
                <p className="text-[11px] leading-snug text-slate-600 sm:text-xs font-medium">
                    Fill each slot and link tasks where needed. Toggle Half Day EOD if you are submitting for a half day shift.
                </p>
            </div>

            {/* Half Day Settings Card */}
            <div className="half-day-settings-card animate-enter rounded-xl sm:rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/90 via-blue-50/70 to-slate-50 p-2.5 sm:p-3.5 shadow-2xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center space-x-2.5">
                        <input
                            type="checkbox"
                            id="halfDayCheckbox"
                            disabled={!isEditable}
                            checked={isHalfDay}
                            onChange={(e) => {
                                const checked = e.target.checked;
                                setIsHalfDay(checked);
                                if (dayBook?.slots) {
                                    const updatedSlots = applyCurrentTimeToEndSlot(dayBook.slots, checked, halfDayType);
                                    setDayBook({ ...dayBook, slots: updatedSlots });
                                }
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 disabled:opacity-50 cursor-pointer"
                        />
                        <label htmlFor="halfDayCheckbox" className="cursor-pointer select-none">
                            <span className="text-xs sm:text-sm font-bold text-slate-900 block leading-tight">Half Day EOD Submission</span>
                            <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">Check this box if you worked a half day and wish to submit only one half</span>
                        </label>
                    </div>

                    {isHalfDay && (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-indigo-100">
                            <div className="half-day-toggle-group inline-flex rounded-xl bg-white p-1 border border-slate-200/90 shadow-2xs">
                                <button
                                    type="button"
                                    disabled={!isEditable}
                                    onClick={() => {
                                        setHalfDayType('first');
                                        if (dayBook?.slots) {
                                            const updatedSlots = applyCurrentTimeToEndSlot(dayBook.slots, true, 'first');
                                            setDayBook({ ...dayBook, slots: updatedSlots });
                                        }
                                    }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        halfDayType === 'first'
                                            ? 'bg-blue-600 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    ☀️ First Half (10:00 AM - 1:00 PM)
                                </button>
                                <button
                                    type="button"
                                    disabled={!isEditable}
                                    onClick={() => {
                                        setHalfDayType('second');
                                        if (dayBook?.slots) {
                                            const updatedSlots = applyCurrentTimeToEndSlot(dayBook.slots, true, 'second');
                                            setDayBook({ ...dayBook, slots: updatedSlots });
                                        }
                                    }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        halfDayType === 'second'
                                            ? 'bg-blue-600 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    🌙 Second Half (2:00 PM - 7:00 PM)
                                </button>
                            </div>

                            <label className="half-day-break-toggle flex items-center space-x-2 cursor-pointer bg-white px-3 py-2 rounded-xl border border-slate-200/90 shadow-2xs text-xs font-semibold text-slate-700">
                                <input
                                    type="checkbox"
                                    disabled={!isEditable}
                                    checked={includeBreak}
                                    onChange={(e) => setIncludeBreak(e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 disabled:opacity-50 cursor-pointer"
                                />
                                <span>Include Break (1:00 PM - 2:00 PM)</span>
                            </label>
                        </div>
                    )}
                </div>
            </div>

            {/* Slots */}
            <div className="animate-enter space-y-3 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm sm:p-4" style={{ animationDelay: '80ms' }}>
                {renderHalfSection(HALF_DAY_RANGES[0])}
                {includeBreak ? (
                    getBreakSlots().map(({ slot, index }) => (
                        <section key={`break-${index}`} className="break-slot-section rounded-lg border border-slate-200/80 bg-slate-100/50 px-2.5 py-1.5 sm:px-3 sm:py-2">
                            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                    <span className="break-badge inline-flex items-center gap-1 rounded-md bg-amber-100/80 px-1.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-amber-800 border border-amber-200/60">
                                        Break
                                    </span>
                                    <span className="break-time-text text-[11px] sm:text-xs font-semibold text-slate-800">{slot.slotType}</span>
                                    <span className="break-label-text text-[10px] sm:text-xs text-slate-400 font-medium">• Lunch Break</span>
                                </div>
                                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 w-full sm:w-auto max-w-[210px]">
                                    <input
                                        type="time"
                                        disabled={!isEditable}
                                        value={parseSlotType(slot.slotType).startTime}
                                        onChange={(e) => handleSlotTimeChange(index, 'startTime', e.target.value)}
                                        onClick={openTimePicker}
                                        onFocus={openTimePicker}
                                        className="min-w-0 w-full cursor-pointer rounded-md border border-slate-300/80 bg-white px-1 py-0.5 text-[11px] sm:text-xs font-bold tracking-tight text-slate-800 transition-all duration-200 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                                    />
                                    <span className="break-to-text text-[10px] sm:text-[11px] text-slate-400 font-medium shrink-0">to</span>
                                    <input
                                        type="time"
                                        disabled={!isEditable}
                                        value={parseSlotType(slot.slotType).endTime}
                                        onChange={(e) => handleSlotTimeChange(index, 'endTime', e.target.value)}
                                        onClick={openTimePicker}
                                        onFocus={openTimePicker}
                                        className="min-w-0 w-full cursor-pointer rounded-md border border-slate-300/80 bg-white px-1 py-0.5 text-[11px] sm:text-xs font-bold tracking-tight text-slate-800 transition-all duration-200 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                                    />
                                </div>
                            </div>
                        </section>
                    ))
                ) : (
                    <div className="break-excluded-notice rounded-lg border border-dashed border-slate-200 bg-slate-100/40 px-3 py-2 text-center text-xs text-slate-400 font-medium">
                        Lunch Break (1:00 PM - 2:00 PM) excluded from this submission.
                    </div>
                )}
                {renderHalfSection(HALF_DAY_RANGES[1])}
            </div>

            {/* Action Buttons */}
            {isEditable && (
                <div className={`daybook-actions-bar items-center justify-end gap-2 sm:flex sm:gap-3 ${embedded ? 'sticky bottom-0 z-20 -mx-2.5 grid grid-cols-2 border-t border-slate-200 bg-slate-50 px-2.5 py-2 sm:static sm:mx-0 sm:border-t-0 sm:bg-transparent sm:px-0 sm:pb-2 sm:pt-0' : 'flex flex-col sm:flex-row pb-12'}`}>
                    <button
                        disabled={saving}
                        onClick={handleBack}
                        className="daybook-btn-cancel col-span-2 order-last flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 transition-all duration-200 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50 sm:order-first sm:w-auto sm:px-8 sm:py-3 sm:text-base"
                    >
                        Cancel
                    </button>
                    <button
                        disabled={saving}
                        onClick={() => handleSave(false)}
                        className="daybook-btn-save flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition-all duration-200 hover:bg-slate-50 disabled:opacity-50 sm:w-auto sm:px-8 sm:py-3 sm:text-base"
                    >
                        {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                        Save
                    </button>
                    <button
                        disabled={saving}
                        onClick={() => handleSave(true)}
                        className="daybook-btn-submit flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 px-3 py-2 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md disabled:opacity-50 disabled:hover:scale-100 sm:w-auto sm:px-8 sm:py-3 sm:text-base"
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
