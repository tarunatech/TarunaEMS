import React, { useState, useEffect, useMemo } from 'react';
import {
    Calendar,
    User,
    CheckCircle,
    XCircle,
    Clock,
    Eye,
    Check,
    X,
    Loader2,
    MessageSquare,
    Trash2,
    FileText,
    Search
} from 'lucide-react';
import { taskService } from '../../services/taskService';
import toast from 'react-hot-toast';

const parseDescriptionSections = (description = '') => {
    const text = String(description || '');
    if (!text) return { completed: '', pending: '' };

    const completedMatch = text.match(/(?:Completed Work|Completed):\s*([\s\S]*?)(?=(?:Pending Work|Pending):|$)/i);
    const pendingMatch = text.match(/(?:Pending Work|Pending):\s*([\s\S]*?)$/i);

    if (completedMatch || pendingMatch) {
        return {
            completed: completedMatch ? completedMatch[1].trim() : '',
            pending: pendingMatch ? pendingMatch[1].trim() : ''
        };
    }

    return {
        completed: text.trim(),
        pending: ''
    };
};

const getSlotTaskTitle = (slot) => {
    if (!slot) return '';
    const isBreak = slot.workType === 'Break' ||
        String(slot.slotType || '').toLowerCase().includes('break') ||
        String(slot.description || '').toLowerCase().includes('lunch break');
    if (isBreak) return '';

    // 1. taskTitle saved at submission time (most reliable — set when employee picks from Active Tasks)
    if (slot.taskTitle) {
        return slot.taskTitle.trim();
    }

    // 2. Task title from populated taskRef object
    if (slot.taskRef && typeof slot.taskRef === 'object') {
        return (slot.taskRef.title || slot.taskRef.name || slot.workType || 'Task').trim();
    }

    // 3. workType selected from dropdown (show all including 'Task' as fallback)
    if (slot.workType) {
        return slot.workType.trim();
    }

    return '';
};

// Returns { firstHalf: string[], secondHalf: string[] } — deduplicated per half
const getDayBookHalvesSummary = (dayBook) => {
    if (!dayBook?.slots || !Array.isArray(dayBook.slots)) return { firstHalf: [], secondHalf: [] };

    const firstHalf = [];
    const secondHalf = [];
    const seenFirst = new Set();
    const seenSecond = new Set();

    dayBook.slots.forEach((slot) => {
        if (!slot) return;

        // Skip break slots
        const isBreak = slot.workType === 'Break' ||
            String(slot.slotType || '').toLowerCase().includes('break') ||
            String(slot.description || '').toLowerCase().includes('lunch break');
        if (isBreak) return;

        const title = getSlotTaskTitle(slot);
        if (!title) return;

        // Classify slot as first or second half by time midpoint
        const [startStr = '', endStr = ''] = String(slot.slotType || '').split(' - ');
        const toMins = (t) => {
            const m = String(t).trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (!m) return null;
            let h = Number(m[1]); const min = Number(m[2]); const mer = m[3].toUpperCase();
            if (mer === 'PM' && h !== 12) h += 12;
            if (mer === 'AM' && h === 12) h = 0;
            return h * 60 + min;
        };
        const start = toMins(startStr);
        const end = toMins(endStr);
        const mid = (start !== null && end !== null) ? (start + end) / 2 : null;
        const isFirst = mid === null || mid < 14 * 60;

        if (isFirst) {
            if (!seenFirst.has(title.toLowerCase())) {
                seenFirst.add(title.toLowerCase());
                firstHalf.push(title);
            }
        } else {
            if (!seenSecond.has(title.toLowerCase())) {
                seenSecond.add(title.toLowerCase());
                secondHalf.push(title);
            }
        }
    });

    return { firstHalf, secondHalf };
};

const getLocalDateString = (dateInput) => {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const AdminDayBookReview = ({ search = '' }) => {
    const [dayBooks, setDayBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(search);
    const [dateFilter, setDateFilter] = useState('');
    const [selectedDayBook, setSelectedDayBook] = useState(null);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [adminComment, setAdminComment] = useState('');
    const [taskStatuses, setTaskStatuses] = useState({});

    useEffect(() => {
        if (search) {
            setSearchTerm(search);
        }
    }, [search]);

    const filteredDayBooks = useMemo(() => {
        const term = (searchTerm || '').trim().toLowerCase();
        return dayBooks.filter((db) => {
            // 1. Date Filter (matching local submission date)
            if (dateFilter) {
                const dbDate = getLocalDateString(db.date);
                if (dbDate !== dateFilter) return false;
            }

            // 2. Search Term Filter
            if (!term) return true;

            const emp = db.employee;
            if (!emp) return false;
            const firstName = emp.personalInfo?.firstName?.toLowerCase() || '';
            const lastName = emp.personalInfo?.lastName?.toLowerCase() || '';
            const fullName = `${firstName} ${lastName}`.trim();
            const empName = emp.user?.name?.toLowerCase() || fullName;
            const empCode = (emp.employeeId || emp.user?.employeeId || '').toLowerCase();
            const email = (emp.user?.email || emp.contactInfo?.personalEmail || '').toLowerCase();
            const taskMatches = db.slots?.some(s => {
                const title = (s.taskTitle || s.taskRef?.title || s.taskRef?.name || s.description || '').toLowerCase();
                return title.includes(term);
            });
            return fullName.includes(term) || empName.includes(term) || empCode.includes(term) || email.includes(term) || taskMatches;
        });
    }, [dayBooks, searchTerm, dateFilter]);

    const fetchDayBooks = async () => {
        try {
            setLoading(true);
            const response = await taskService.getDayBooks();
            if (response.success) {
                setDayBooks(response.dayBooks);
            }
        } catch (error) {
            toast.error('Failed to fetch day books');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDayBooks();
    }, []);

    const handleReview = (dayBook) => {
        setSelectedDayBook(dayBook);
        setAdminComment(dayBook.adminComment || '');

        // Initialize task statuses from dayBook slots
        const statuses = {};
        dayBook.slots.forEach(slot => {
            if (slot.taskRef) {
                statuses[slot.taskRef._id] = slot.taskRef.status;
            }
        });
        setTaskStatuses(statuses);
        setShowReviewModal(true);
    };

    const isInteractiveClick = (event) =>
        event.target.closest('button, a, input, select, textarea, label');

    const openDayBookReview = (event, dayBook) => {
        if (isInteractiveClick(event)) return;
        handleReview(dayBook);
    };

    const [actionLoading, setActionLoading] = useState('');

    const updateStatus = async (status) => {
        if (selectedDayBook?.status === 'Approved' || selectedDayBook?.status === 'Rejected' || actionLoading) {
            return;
        }

        try {
            setActionLoading(status);
            // Prepare task status updates
            const taskUpdates = Object.entries(taskStatuses).map(([taskId, status]) => ({
                taskId,
                status
            }));

            const response = await taskService.updateDayBookStatus(selectedDayBook._id, {
                status,
                adminComment,
                taskStatuses: taskUpdates
            });

            if (response.success) {
                toast.success(`Day Book ${status.toLowerCase()} successfully`);
                setSelectedDayBook(prev => prev ? { ...prev, status } : prev);
                setShowReviewModal(false);
                fetchDayBooks();
            }
        } catch (error) {
            toast.error('Failed to update Day Book status');
        } finally {
            setActionLoading('');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this Day Book? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await taskService.deleteDayBook(id);
            if (response.success) {
                toast.success('Day Book deleted successfully');
                fetchDayBooks();
            }
        } catch (error) {
            toast.error(error.message || 'Failed to delete Day Book');
        }
    };

    const getStatusBadgeClasses = (status) => {
        switch (status) {
            case 'Approved':
                return 'bg-green-100 text-green-700';
            case 'Rejected':
                return 'bg-red-100 text-red-700';
            case 'Submitted':
                return 'bg-blue-100 text-blue-700';
            default:
                return 'bg-amber-100 text-amber-700';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12 bg-white border border-slate-200 rounded-xl shadow-sm">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6 bg-slate-50">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
                    {/* Employee & Task Search Input */}
                    <div className="relative flex-1 max-w-md flex items-center w-full">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 z-10 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search employee or EOD report..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-9 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-900 placeholder-slate-400"
                        />
                        {searchTerm ? (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)' }}
                                className="flex items-center justify-center h-6 w-6 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors z-10"
                                title="Clear search"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        ) : null}
                    </div>

                    {/* EOD Date Filter Input */}
                    <div className="relative flex items-center w-full sm:w-auto">
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="w-full sm:w-auto pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-700 bg-white"
                        />
                        {dateFilter && (
                            <button
                                type="button"
                                onClick={() => setDateFilter('')}
                                style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)' }}
                                className="flex items-center justify-center h-6 w-6 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors z-10"
                                title="Clear date filter"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {(searchTerm || dateFilter) && (
                    <button
                        onClick={() => {
                            setSearchTerm('');
                            setDateFilter('');
                        }}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline shrink-0"
                    >
                        Clear Filters
                    </button>
                )}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-white border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="text-left p-6 text-slate-600 font-semibold">Date</th>
                                <th className="text-left p-6 text-slate-600 font-semibold">Employee</th>
                                <th className="text-left p-6 text-slate-600 font-semibold">Task Title / Work</th>
                                <th className="text-left p-6 text-slate-600 font-semibold">Status</th>
                                <th className="text-left p-6 text-slate-600 font-semibold">Slots Filled</th>
                                <th className="text-left p-6 text-slate-600 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {filteredDayBooks.map((db) => (
                                <tr key={db._id} onClick={(event) => openDayBookReview(event, db)} className="hover:bg-blue-50 transition-all duration-200 cursor-pointer">
                                    <td className="p-6 text-slate-700 font-medium whitespace-nowrap">
                                        {new Date(db.date).toLocaleDateString('en-US', {
                                            weekday: 'short',
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </td>
                                    <td className="p-6">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-9 h-9 bg-blue-50 border border-blue-200 rounded-full flex items-center justify-center shrink-0">
                                                <User className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-slate-900 font-semibold whitespace-nowrap">
                                                    {db.employee?.personalInfo?.firstName} {db.employee?.personalInfo?.lastName}
                                                </p>
                                                <p className="text-slate-500 text-xs">{db.employee?.employeeId}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6 max-w-xs">
                                        {(() => {
                                            const { firstHalf, secondHalf } = getDayBookHalvesSummary(db);
                                            const hasFirst = firstHalf.length > 0;
                                            const hasSecond = secondHalf.length > 0;
                                            if (!hasFirst && !hasSecond) {
                                                return <span className="text-slate-400 italic text-xs">No tasks specified</span>;
                                            }

                                            // Check if both halves have identical titles (same set)
                                            const firstSet = new Set(firstHalf.map(t => t.toLowerCase()));
                                            const secondSet = new Set(secondHalf.map(t => t.toLowerCase()));
                                            const setsEqual = firstSet.size === secondSet.size &&
                                                [...firstSet].every(t => secondSet.has(t));
                                            const bothPresent = hasFirst && hasSecond;

                                            // If same titles in both halves OR only one half, show flat list
                                            if (!bothPresent || setsEqual) {
                                                const combined = [...new Map(
                                                    [...firstHalf, ...secondHalf].map(t => [t.toLowerCase(), t])
                                                ).values()];
                                                return (
                                                    <div className="space-y-0.5">
                                                        {combined.map((t, idx) => (
                                                            <div key={idx} className="flex items-center gap-1.5 min-w-0">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                                                <span className="text-xs font-semibold text-slate-800 truncate" title={t}>{t}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            }

                                            // Different titles per half — show compact grey text grouped view
                                            return (
                                                <div className="space-y-1 min-w-0">
                                                    {hasFirst && (
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                                                                1st Half:
                                                            </span>
                                                            <div className="min-w-0 flex-1 space-y-0.5">
                                                                {firstHalf.map((t, idx) => (
                                                                    <span key={idx} className="block text-xs font-semibold text-slate-800 truncate" title={t}>
                                                                        {t}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {hasSecond && (
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                                                                2nd Half:
                                                            </span>
                                                            <div className="min-w-0 flex-1 space-y-0.5">
                                                                {secondHalf.map((t, idx) => (
                                                                    <span key={idx} className="block text-xs font-semibold text-slate-800 truncate" title={t}>
                                                                        {t}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    <td className="p-6">
                                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusBadgeClasses(db.status)}`}>
                                            {db.status}
                                        </span>
                                    </td>
                                    <td className="p-6 text-slate-700">
                                        {db.slots.filter(s => s.description).length} / {db.slots.length}
                                    </td>
                                    <td className="p-6">
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => handleReview(db)}
                                                className="px-3 py-2 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 flex items-center text-sm font-medium"
                                            >
                                                <Eye className="w-4 h-4 mr-2" />
                                                Review
                                            </button>
                                            <button
                                                onClick={() => handleDelete(db._id)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 flex items-center"
                                                title="Delete Day Book"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredDayBooks.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="p-16 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                                                <FileText className="w-8 h-8 text-slate-400" />
                                            </div>
                                            <p className="text-slate-500 font-medium">No EOD Reports Found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showReviewModal && selectedDayBook && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2.5 sm:p-4 md:p-6 lg:left-64">
                    <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setShowReviewModal(false)} />
                    <div className="relative bg-white border border-slate-200 rounded-2xl shadow-xl p-3.5 sm:p-6 md:p-7 w-full max-w-4xl max-h-[92vh] sm:max-h-[88vh] overflow-y-auto">
                        <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <h2 className="text-base sm:text-xl font-bold text-slate-900 truncate">EOD Report Review</h2>
                                    {selectedDayBook.status === 'Approved' && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                            Approved
                                        </span>
                                    )}
                                    {selectedDayBook.status === 'Rejected' && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200 shadow-2xs">
                                            <XCircle className="w-3.5 h-3.5 text-red-600" />
                                            Rejected
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs sm:text-sm text-slate-500 truncate">
                                    {selectedDayBook.employee?.personalInfo?.firstName} {selectedDayBook.employee?.personalInfo?.lastName} - {new Date(selectedDayBook.date).toLocaleDateString()}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowReviewModal(false)}
                                className="shrink-0 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all duration-200"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            {selectedDayBook.slots.map((slot, index) => {
                                const isBreak = slot.workType === 'Break' || String(slot.slotType || '').toLowerCase().includes('break') || String(slot.description || '').toLowerCase().includes('lunch break');

                                if (isBreak) {
                                    return (
                                        <div key={index} className="p-2.5 sm:px-3.5 sm:py-2.5 bg-amber-50/50 rounded-xl border border-amber-200/60 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-xs">
                                            <div className="flex items-center space-x-2 min-w-0">
                                                <span className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200">
                                                    Break
                                                </span>
                                                <span className="shrink-0 whitespace-nowrap font-bold text-slate-800 text-xs sm:text-sm">{slot.slotType}</span>
                                                <span className="text-slate-500 font-medium truncate min-w-0">• {slot.description || 'Lunch Break'}</span>
                                            </div>
                                        </div>
                                    );
                                }

                                const { completed, pending } = parseDescriptionSections(slot.description);

                                return (
                                    <div key={index} className="p-3 sm:p-4 bg-slate-50/70 rounded-xl border border-slate-200">
                                        <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-2 mb-2.5">
                                            <div className="flex items-center space-x-2 min-w-0">
                                                <div className="w-6 h-6 sm:w-7 sm:h-7 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                                                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                                                </div>
                                                <span className="text-xs sm:text-sm font-bold text-slate-900 shrink-0 whitespace-nowrap">{slot.slotType}</span>
                                            </div>
                                            <span className="shrink-0 whitespace-nowrap px-2.5 py-0.5 text-[11px] sm:text-xs font-semibold rounded-full bg-slate-200/80 text-slate-700">
                                                {slot.workType}
                                            </span>
                                        </div>

                                        <div className="space-y-2">
                                            {completed && (
                                                <div className="bg-emerald-50/60 border border-emerald-200/90 p-2.5 rounded-lg text-xs sm:text-sm flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-2">
                                                    <span className="shrink-0 whitespace-nowrap px-2 py-0.5 text-[10.5px] font-bold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200/80 w-fit">
                                                        Completed Work
                                                    </span>
                                                    <p className="text-slate-800 font-medium whitespace-pre-wrap leading-relaxed min-w-0 flex-1">
                                                        {completed}
                                                    </p>
                                                </div>
                                            )}

                                            {pending && (
                                                <div className="bg-amber-50/60 border border-amber-200/90 p-2.5 rounded-lg text-xs sm:text-sm flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-2">
                                                    <span className="shrink-0 whitespace-nowrap px-2 py-0.5 text-[10.5px] font-bold rounded-md bg-amber-100 text-amber-800 border border-amber-200/80 w-fit">
                                                        Pending Work
                                                    </span>
                                                    <p className="text-slate-800 font-medium whitespace-pre-wrap leading-relaxed min-w-0 flex-1">
                                                        {pending}
                                                    </p>
                                                </div>
                                            )}

                                            {!completed && !pending && (
                                                <p className="text-slate-400 italic text-xs bg-white border border-slate-200 p-2.5 rounded-lg">
                                                    No description provided
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {selectedDayBook.status !== 'Approved' && (
                                <div className="pt-3 border-t border-slate-200">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Admin Feedback / Comment</label>
                                    <textarea
                                        value={adminComment}
                                        onChange={(e) => setAdminComment(e.target.value)}
                                        placeholder="Provide feedback to the employee..."
                                        rows="2"
                                        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                                    ></textarea>
                                </div>
                            )}

                            <div className="flex space-x-3 pt-3">
                                <button
                                    onClick={() => updateStatus('Rejected')}
                                    disabled={selectedDayBook.status === 'Approved' || selectedDayBook.status === 'Rejected' || !!actionLoading}
                                    className={`flex-1 px-4 py-2.5 bg-white border border-red-300 text-red-600 rounded-lg transition-all duration-200 flex items-center justify-center text-sm font-medium ${selectedDayBook.status === 'Approved' || selectedDayBook.status === 'Rejected' || !!actionLoading
                                            ? 'opacity-50 cursor-not-allowed'
                                            : 'hover:bg-red-50'
                                        }`}
                                >
                                    {actionLoading === 'Rejected' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                                    {selectedDayBook.status === 'Rejected' ? 'Rejected' : 'Reject'}
                                </button>
                                <button
                                    onClick={() => updateStatus('Approved')}
                                    disabled={selectedDayBook.status === 'Approved' || selectedDayBook.status === 'Rejected' || !!actionLoading}
                                    className={`flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white text-sm font-bold rounded-lg shadow-sm transition-all duration-200 flex items-center justify-center ${selectedDayBook.status === 'Approved' || selectedDayBook.status === 'Rejected' || !!actionLoading
                                            ? 'opacity-50 cursor-not-allowed'
                                            : 'hover:shadow-md hover:scale-[1.02]'
                                        }`}
                                >
                                    {actionLoading === 'Approved' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                    {selectedDayBook.status === 'Approved' ? 'Approved' : 'Approve EOD'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDayBookReview;
