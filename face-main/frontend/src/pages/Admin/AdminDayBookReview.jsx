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
    Search,
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Filter
} from 'lucide-react';
import { taskService } from '../../services/taskService';
import toast from 'react-hot-toast';

const ITEMS_PER_PAGE = 5;

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

    // 1. taskTitle saved at submission time (most reliable)
    if (slot.taskTitle) {
        return slot.taskTitle.trim();
    }

    // 2. Task title from populated taskRef object
    if (slot.taskRef && typeof slot.taskRef === 'object') {
        return (slot.taskRef.title || slot.taskRef.name || slot.workType || 'Task').trim();
    }

    // 3. workType selected from dropdown
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

const AdminDayBookReview = ({ search = '' }) => {
    const [dayBooks, setDayBooks] = useState([]);
    const [loading, setLoading] = useState(true);

    // Selected Employee state (null = list of employees view)
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    // Filter states
    const [searchTerm, setSearchTerm] = useState(search);
    const [dateFilter, setDateFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // Modal state for reviewing specific EOD
    const [selectedDayBook, setSelectedDayBook] = useState(null);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [adminComment, setAdminComment] = useState('');
    const [taskStatuses, setTaskStatuses] = useState({});
    const [actionLoading, setActionLoading] = useState('');

    useEffect(() => {
        if (search) {
            setSearchTerm(search);
        }
    }, [search]);

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

    // Group daybooks by employee
    const employeeGroups = useMemo(() => {
        const map = new Map();
        dayBooks.forEach((db) => {
            const emp = db.employee;
            if (!emp) return;
            const empKey = emp._id || emp.employeeId || emp.personalInfo?.firstName;
            if (!map.has(empKey)) {
                map.set(empKey, {
                    employee: emp,
                    dayBooks: [],
                    latestDate: db.date,
                    latestStatus: db.status
                });
            }
            const group = map.get(empKey);
            group.dayBooks.push(db);
            if (new Date(db.date) > new Date(group.latestDate)) {
                group.latestDate = db.date;
                group.latestStatus = db.status;
            }
        });
        return Array.from(map.values());
    }, [dayBooks]);

    // Filter employee groups for the initial Employee List view
    const filteredEmployeeGroups = useMemo(() => {
        const term = (searchTerm || '').trim().toLowerCase();
        if (!term) return employeeGroups;
        return employeeGroups.filter((g) => {
            const emp = g.employee;
            const firstName = emp.personalInfo?.firstName?.toLowerCase() || '';
            const lastName = emp.personalInfo?.lastName?.toLowerCase() || '';
            const fullName = `${firstName} ${lastName}`.trim();
            const empCode = (emp.employeeId || '').toLowerCase();
            return fullName.includes(term) || empCode.includes(term);
        });
    }, [employeeGroups, searchTerm]);

    // Filter daybooks for the Selected Employee EOD History view
    const selectedEmployeeDayBooks = useMemo(() => {
        if (!selectedEmployee) return [];
        const empKey = selectedEmployee._id || selectedEmployee.employeeId;

        const empBooks = dayBooks.filter((db) => {
            const dbEmpKey = db.employee?._id || db.employee?.employeeId;
            return dbEmpKey === empKey;
        });

        const term = (searchTerm || '').trim().toLowerCase();

        return empBooks.filter((db) => {
            // Date filter
            if (dateFilter) {
                const dbDate = getLocalDateString(db.date);
                if (dbDate !== dateFilter) return false;
            }
            // Status filter
            if (statusFilter && db.status !== statusFilter) {
                return false;
            }
            // Search term (task title / description)
            if (term) {
                const taskMatches = db.slots?.some((s) => {
                    const title = (s.taskTitle || s.taskRef?.title || s.taskRef?.name || s.description || '').toLowerCase();
                    return title.includes(term);
                });
                if (!taskMatches) return false;
            }
            return true;
        });
    }, [dayBooks, selectedEmployee, dateFilter, statusFilter, searchTerm]);

    // Reset pagination to 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [dateFilter, statusFilter, searchTerm, selectedEmployee]);

    const totalPages = Math.ceil(selectedEmployeeDayBooks.length / ITEMS_PER_PAGE) || 1;
    const paginatedSelectedDayBooks = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return selectedEmployeeDayBooks.slice(start, start + ITEMS_PER_PAGE);
    }, [selectedEmployeeDayBooks, currentPage]);

    const handleSelectEmployee = (emp) => {
        setSelectedEmployee(emp);
        setSearchTerm('');
        setDateFilter('');
        setStatusFilter('');
        setCurrentPage(1);
    };

    const handleReview = (dayBook) => {
        setSelectedDayBook(dayBook);
        setAdminComment(dayBook.adminComment || '');

        const statuses = {};
        dayBook.slots.forEach((slot) => {
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

    const updateStatus = async (status) => {
        if (selectedDayBook?.status === 'Approved' || selectedDayBook?.status === 'Rejected' || actionLoading) {
            return;
        }

        try {
            setActionLoading(status);
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
                setSelectedDayBook((prev) => (prev ? { ...prev, status } : prev));
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

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12 bg-white border border-slate-200 rounded-xl shadow-sm">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="admin-daybook-review space-y-6 bg-slate-100">
            {/* VIEW 1: INITIAL EMPLOYEE LIST VIEW */}
            {!selectedEmployee ? (
                <div className="space-y-4">
                    {/* Search Bar for Employee List */}
                    <div className="flex items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                        <div className="relative flex-1 max-w-md flex items-center">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 z-10 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search employee name or ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-9 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-900 placeholder-slate-400"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)' }}
                                    className="flex items-center justify-center h-6 w-6 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors z-10"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Employee List Table */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-white border-b border-slate-200 sticky top-0 z-10">
                                    <tr>
                                        <th className="text-left p-6 text-slate-600 font-semibold">Employee</th>
                                        <th className="text-left p-6 text-slate-600 font-semibold">Total EOD Submitted</th>
                                        <th className="text-left p-6 text-slate-600 font-semibold">Latest Submission</th>
                                        <th className="text-left p-6 text-slate-600 font-semibold">Latest Status</th>
                                        <th className="text-left p-6 text-slate-600 font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {filteredEmployeeGroups.map((group) => {
                                        const emp = group.employee;
                                        return (
                                            <tr
                                                key={emp._id || emp.employeeId}
                                                onClick={() => handleSelectEmployee(emp)}
                                                className="hover:bg-blue-50/60 transition-all duration-200 cursor-pointer"
                                            >
                                                <td className="p-6">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-10 h-10 bg-blue-50 border border-blue-200 rounded-full flex items-center justify-center shrink-0">
                                                            <User className="w-5 h-5 text-blue-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-slate-900 font-semibold text-sm whitespace-nowrap">
                                                                {emp.personalInfo?.firstName} {emp.personalInfo?.lastName}
                                                            </p>
                                                            <p className="text-slate-500 text-xs">{emp.employeeId || 'No ID'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6 text-slate-700 font-medium">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                                        <FileText className="w-3.5 h-3.5 mr-1 text-slate-500" />
                                                        {group.dayBooks.length} {group.dayBooks.length === 1 ? 'Report' : 'Reports'}
                                                    </span>
                                                </td>
                                                <td className="p-6 text-slate-700 font-medium whitespace-nowrap text-sm">
                                                    {new Date(group.latestDate).toLocaleDateString('en-US', {
                                                        weekday: 'short',
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </td>
                                                <td className="p-6">
                                                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusBadgeClasses(group.latestStatus)}`}>
                                                        {group.latestStatus}
                                                    </span>
                                                </td>
                                                <td className="p-6">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleSelectEmployee(emp);
                                                        }}
                                                        className="px-3 py-2 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 flex items-center text-xs font-semibold"
                                                    >
                                                        <Eye className="w-4 h-4 mr-1.5" />
                                                        View EOD Reports
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredEmployeeGroups.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="p-16 text-center">
                                                <div className="flex flex-col items-center justify-center space-y-3">
                                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                                                        <User className="w-8 h-8 text-slate-400" />
                                                    </div>
                                                    <p className="text-slate-500 font-medium">No Employees Found</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                /* VIEW 2: SELECTED EMPLOYEE'S EOD HISTORY VIEW (PREMIUM DISTINCT CARD LAYOUT) */
                <div className="space-y-5 animate-enter">
                    {/* Premium Employee Banner Header Card — Medium Soft Slate-Blue Tint Theme */}
                    <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-100 via-blue-100/80 to-indigo-100/90 border border-blue-200/90 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center space-x-4 min-w-0">
                            <button
                                onClick={() => setSelectedEmployee(null)}
                                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 rounded-xl transition-all duration-150 text-xs font-bold flex items-center border border-slate-300/80 shrink-0 shadow-2xs"
                            >
                                <ArrowLeft className="w-4 h-4 mr-1.5" />
                                Back to Employees
                            </button>
                            <div className="h-7 w-px bg-slate-300/80 hidden md:block" />
                            <div className="flex items-center space-x-3.5 min-w-0">
                                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-extrabold text-lg flex items-center justify-center shrink-0 uppercase shadow-sm ring-2 ring-blue-400/40">
                                    {String(selectedEmployee.personalInfo?.firstName?.[0] || 'E').toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h2 className="text-lg font-bold text-slate-900 tracking-tight truncate capitalize">
                                            {selectedEmployee.personalInfo?.firstName} {selectedEmployee.personalInfo?.lastName}
                                        </h2>
                                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-600/15 text-blue-900 border border-blue-300">
                                            {selectedEmployee.employeeId || 'EMP'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-0.5 truncate font-medium">
                                        Employee EOD Reports History
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3 shrink-0 self-end md:self-auto">
                            <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-800 border border-slate-300/80 shadow-2xs">
                                Total {selectedEmployeeDayBooks.length} EOD {selectedEmployeeDayBooks.length === 1 ? 'Report' : 'Reports'}
                            </span>
                            <button
                                onClick={fetchDayBooks}
                                disabled={loading}
                                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-300/80 shadow-2xs"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* Filter Bar */}
                    <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-center">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                SEARCH TASK / WORK
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 z-10 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Search task title..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-8 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                FILTER BY DATE
                            </label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                    className="w-full pl-3 pr-8 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                                {dateFilter && (
                                    <button
                                        type="button"
                                        onClick={() => setDateFilter('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                FILTER BY STATUS
                            </label>
                            <div className="flex items-center gap-2">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full px-3 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="Submitted">Submitted</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Rejected">Rejected</option>
                                    <option value="Draft">Draft</option>
                                </select>
                                {(dateFilter || statusFilter || searchTerm) && (
                                    <button
                                        onClick={() => {
                                            setDateFilter('');
                                            setStatusFilter('');
                                            setSearchTerm('');
                                        }}
                                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 underline shrink-0 whitespace-nowrap"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* EOD Report Items as Premium Card List */}
                    <div className="space-y-3">
                        {paginatedSelectedDayBooks.map((db) => {
                            const d = new Date(db.date);
                            const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
                            const dayNum = d.getDate();
                            const monthStr = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                            const yearStr = d.getFullYear();
                            const filledSlots = db.slots?.filter(s => s.description).length || 0;
                            const totalSlots = db.slots?.length || 0;

                            return (
                                <div
                                    key={db._id}
                                    onClick={(event) => openDayBookReview(event, db)}
                                    className="group bg-white border border-slate-200/90 hover:border-indigo-300 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                                >
                                    {/* Date Box & Summary */}
                                    <div className="flex items-center space-x-4 min-w-0">
                                        {/* Compact Date Box */}
                                        <div className="w-14 h-14 rounded-xl bg-indigo-50/80 border border-indigo-100 flex flex-col items-center justify-center shrink-0 text-indigo-900 shadow-2xs group-hover:bg-indigo-100/80 transition-colors">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">{weekday}</span>
                                            <span className="text-base font-extrabold leading-none my-0.5">{dayNum}</span>
                                            <span className="text-[9px] font-semibold text-slate-400">{monthStr}</span>
                                        </div>

                                        {/* Task Title summary */}
                                        <div className="min-w-0 flex-1">
                                            {(() => {
                                                const { firstHalf, secondHalf } = getDayBookHalvesSummary(db);
                                                const hasFirst = firstHalf.length > 0;
                                                const hasSecond = secondHalf.length > 0;
                                                if (!hasFirst && !hasSecond) {
                                                    return <span className="text-slate-400 italic text-xs">No tasks specified</span>;
                                                }

                                                const firstSet = new Set(firstHalf.map(t => t.toLowerCase()));
                                                const secondSet = new Set(secondHalf.map(t => t.toLowerCase()));
                                                const setsEqual = firstSet.size === secondSet.size &&
                                                    [...firstSet].every(t => secondSet.has(t));
                                                const bothPresent = hasFirst && hasSecond;

                                                if (!bothPresent || setsEqual) {
                                                    const combined = [...new Map(
                                                        [...firstHalf, ...secondHalf].map(t => [t.toLowerCase(), t])
                                                    ).values()];
                                                    return (
                                                        <div className="space-y-0.5">
                                                            {combined.map((t, idx) => (
                                                                <div key={idx} className="flex items-center gap-2 min-w-0">
                                                                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                                                                    <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate" title={t}>{t}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div className="space-y-1 min-w-0">
                                                        {hasFirst && (
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                                                                    1st Half:
                                                                </span>
                                                                <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate" title={firstHalf.join(', ')}>
                                                                    {firstHalf.join(', ')}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {hasSecond && (
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                                                                    2nd Half:
                                                                </span>
                                                                <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate" title={secondHalf.join(', ')}>
                                                                    {secondHalf.join(', ')}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            <div className="flex items-center space-x-2 mt-1">
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-slate-100 text-slate-500 border border-slate-200/80">
                                                    <Clock className="w-2.5 h-2.5 mr-0.5 text-slate-400" />
                                                    {filledSlots} / {totalSlots} Slots Filled
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status & Action Buttons */}
                                    <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                                        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${db.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                            db.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                db.status === 'Submitted' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    'bg-amber-50 text-amber-700 border-amber-200'
                                            }`}>
                                            {db.status}
                                        </span>

                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => handleReview(db)}
                                                className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-2xs hover:shadow hover:scale-[1.02] transition-all flex items-center gap-1"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                Review Report
                                            </button>
                                            <button
                                                onClick={() => handleDelete(db._id)}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                title="Delete Day Book"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {paginatedSelectedDayBooks.length === 0 && (
                            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
                                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                                    <FileText className="w-7 h-7" />
                                </div>
                                <p className="text-slate-700 font-bold text-sm">No EOD Reports Found</p>
                                <p className="text-slate-400 text-xs mt-1">Try clearing or adjusting your search/date filters.</p>
                            </div>
                        )}
                    </div>

                    {/* Pagination Bar */}
                    <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-center justify-between">
                        <div className="text-xs text-slate-500 font-medium">
                            Showing{' '}
                            <span className="font-bold text-slate-800">
                                {selectedEmployeeDayBooks.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}
                            </span>{' '}
                            to{' '}
                            <span className="font-bold text-slate-800">
                                {Math.min(currentPage * ITEMS_PER_PAGE, selectedEmployeeDayBooks.length)}
                            </span>{' '}
                            of <span className="font-bold text-slate-800">{selectedEmployeeDayBooks.length}</span> records
                        </div>

                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1 || loading}
                                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 shadow-2xs"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Previous
                            </button>

                            <span className="text-xs font-bold text-slate-700 px-2">
                                Page {currentPage} of {totalPages}
                            </span>

                            <button
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || loading || selectedEmployeeDayBooks.length === 0}
                                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 shadow-2xs"
                            >
                                Next
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PRESERVED EXACTLY: EOD REPORT REVIEW MODAL */}
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
