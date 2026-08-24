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

const AdminDayBookReview = ({ search = '' }) => {
    const [dayBooks, setDayBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(search);
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
        if (!term) return dayBooks;
        return dayBooks.filter((db) => {
            const emp = db.employee;
            if (!emp) return false;
            const firstName = emp.personalInfo?.firstName?.toLowerCase() || '';
            const lastName = emp.personalInfo?.lastName?.toLowerCase() || '';
            const fullName = `${firstName} ${lastName}`.trim();
            const empName = emp.user?.name?.toLowerCase() || fullName;
            const empCode = (emp.employeeId || emp.user?.employeeId || '').toLowerCase();
            const email = (emp.user?.email || emp.contactInfo?.personalEmail || '').toLowerCase();
            return fullName.includes(term) || empName.includes(term) || empCode.includes(term) || email.includes(term);
        });
    }, [dayBooks, searchTerm]);

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

    const updateStatus = async (status) => {
        try {
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
                setShowReviewModal(false);
                fetchDayBooks();
            }
        } catch (error) {
            toast.error('Failed to update Day Book status');
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
            <div className="flex items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                <div className="relative flex-1 max-w-md flex items-center">
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
                            title="Clear filter"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    ) : null}
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-white border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="text-left p-6 text-slate-600 font-semibold">Date</th>
                                <th className="text-left p-6 text-slate-600 font-semibold">Employee</th>
                                <th className="text-left p-6 text-slate-600 font-semibold">Status</th>
                                <th className="text-left p-6 text-slate-600 font-semibold">Slots Filled</th>
                                <th className="text-left p-6 text-slate-600 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {filteredDayBooks.map((db) => (
                                <tr key={db._id} onClick={(event) => openDayBookReview(event, db)} className="hover:bg-blue-50 transition-all duration-200 cursor-pointer">
                                    <td className="p-6 text-slate-700 font-medium">
                                        {new Date(db.date).toLocaleDateString('en-US', {
                                            weekday: 'short',
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </td>
                                    <td className="p-6">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-9 h-9 bg-blue-50 border border-blue-200 rounded-full flex items-center justify-center">
                                                <User className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-slate-900 font-semibold">
                                                    {db.employee?.personalInfo?.firstName} {db.employee?.personalInfo?.lastName}
                                                </p>
                                                <p className="text-slate-500 text-xs">{db.employee?.employeeId}</p>
                                            </div>
                                        </div>
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
                                    <td colSpan="5" className="p-16 text-center">
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
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setShowReviewModal(false)} />
                    <div className="relative bg-white border border-slate-200 rounded-2xl shadow-xl p-5 sm:p-7 w-full max-w-2xl max-h-[88vh] overflow-y-auto">
                        <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
                            <div>
                                <h2 className="text-lg sm:text-xl font-bold text-slate-900">EOD Report Review</h2>
                                <p className="text-xs sm:text-sm text-slate-500">
                                    {selectedDayBook.employee?.personalInfo?.firstName} {selectedDayBook.employee?.personalInfo?.lastName} - {new Date(selectedDayBook.date).toLocaleDateString()}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowReviewModal(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all duration-200"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            {selectedDayBook.slots.map((slot, index) => (
                                <div key={index} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
                                                <Clock className="w-3.5 h-3.5 text-blue-600" />
                                            </div>
                                            <span className="text-sm font-semibold text-slate-900">{slot.slotType}</span>
                                        </div>
                                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-200 text-slate-600 italic">
                                            {slot.workType}
                                        </span>
                                    </div>
                                    <p className="text-slate-700 text-xs sm:text-sm bg-white border border-slate-200 p-2.5 rounded-lg">
                                        {slot.description || <span className="text-slate-400 italic">No description provided</span>}
                                    </p>
                                </div>
                            ))}

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

                            <div className="flex space-x-3 pt-3">
                                <button
                                    onClick={() => updateStatus('Rejected')}
                                    className="flex-1 px-4 py-2.5 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-all duration-200 flex items-center justify-center text-sm font-medium"
                                >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Reject
                                </button>
                                <button
                                    onClick={() => updateStatus('Approved')}
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white text-sm font-bold rounded-lg shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 flex items-center justify-center"
                                >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Approve EOD
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
