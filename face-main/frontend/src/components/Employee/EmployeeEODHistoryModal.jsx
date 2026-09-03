import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import { taskService } from '../../services/taskService';
import toast from 'react-hot-toast';

const ITEMS_PER_PAGE = 5;

const getSlotTaskTitle = (slot) => {
  if (!slot) return '';
  const isBreak = slot.workType === 'Break' ||
    String(slot.slotType || '').toLowerCase().includes('break') ||
    String(slot.description || '').toLowerCase().includes('lunch break');
  if (isBreak) return '';

  if (slot.taskTitle) return slot.taskTitle.trim();
  if (slot.taskRef && typeof slot.taskRef === 'object') {
    return (slot.taskRef.title || slot.taskRef.name || slot.workType || 'Task').trim();
  }
  if (slot.workType) return slot.workType.trim();
  return '';
};

const getDayBookHalvesSummary = (dayBook) => {
  if (!dayBook?.slots || !Array.isArray(dayBook.slots)) return { firstHalf: [], secondHalf: [] };

  const firstHalf = [];
  const secondHalf = [];
  const seenFirst = new Set();
  const seenSecond = new Set();

  dayBook.slots.forEach((slot) => {
    if (!slot) return;
    const isBreak = slot.workType === 'Break' ||
      String(slot.slotType || '').toLowerCase().includes('break') ||
      String(slot.description || '').toLowerCase().includes('lunch break');
    if (isBreak) return;

    const title = getSlotTaskTitle(slot);
    if (!title) return;

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

const parseDescriptionSections = (description = '') => {
  const text = String(description || '');
  if (!text) return { completed: '', pending: '' };

  const completedMatch = text.match(/(?:Completed Work|Completed):\s*([\s\S]*?)(?=(?:\n\nPending Work|\n\nPending|Pending Work:|Pending:)|$)/i);
  const pendingMatch = text.match(/(?:Pending Work|Pending):\s*([\s\S]*?)$/i);

  if (completedMatch || pendingMatch) {
    return {
      completed: completedMatch ? completedMatch[1].replace(/^\n+/, '').trim() : '',
      pending: pendingMatch ? pendingMatch[1].replace(/^\n+/, '').trim() : ''
    };
  }

  return {
    completed: text.trim(),
    pending: ''
  };
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'Approved':
      return (
        <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" />
          Approved
        </span>
      );
    case 'Rejected':
      return (
        <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" />
          Rejected
        </span>
      );
    case 'Submitted':
      return (
        <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
          <Clock className="w-3.5 h-3.5 mr-1 text-blue-600" />
          Submitted
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-200">
          <AlertCircle className="w-3.5 h-3.5 mr-1 text-slate-500" />
          {status || 'Draft'}
        </span>
      );
  }
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

const EmployeeEODHistoryModal = ({ isOpen, onClose }) => {
  const [dayBooks, setDayBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await taskService.getDayBooks();
      if (res.success) {
        setDayBooks(res.dayBooks || []);
      }
    } catch (error) {
      toast.error('Failed to load EOD history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
      setCurrentPage(1);
      setDateFilter('');
      setStatusFilter('');
      setExpandedId(null);
    }
  }, [isOpen]);

  const filteredDayBooks = useMemo(() => {
    return dayBooks.filter((db) => {
      // Date filter matching exact local submission date
      if (dateFilter) {
        const dbDate = getLocalDateString(db.date);
        if (dbDate !== dateFilter) return false;
      }
      // Status filter
      if (statusFilter && db.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [dayBooks, dateFilter, statusFilter]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, statusFilter]);

  const totalPages = Math.ceil(filteredDayBooks.length / ITEMS_PER_PAGE) || 1;
  const paginatedDayBooks = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDayBooks.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDayBooks, currentPage]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 lg:pl-[260px] pt-10 lg:pt-14 pb-5"
      onClick={onClose}
    >
      <div
        className="eod-history-modal bg-white rounded-2xl shadow-2xl border border-slate-200 w-[96%] max-w-[1450px] max-h-[72vh] flex flex-col overflow-hidden animate-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">My EOD Report History</h2>
              <p className="text-[11px] sm:text-xs text-slate-500">View past submitted daybooks and admin reviews</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="px-3 py-2.5 sm:px-4 sm:py-3 border-b border-slate-200 bg-white grid grid-cols-1 sm:grid-cols-3 gap-3 items-center shrink-0">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
              Filter by Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full pl-2.5 pr-7 py-1 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              {dateFilter && (
                <button
                  onClick={() => setDateFilter('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
              Filter by Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Draft">Draft</option>
            </select>
          </div>

          <div className="flex items-end justify-between sm:justify-end gap-2 pt-1 sm:pt-0">
            {(dateFilter || statusFilter) && (
              <button
                onClick={() => {
                  setDateFilter('');
                  setStatusFilter('');
                }}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 underline"
              >
                Clear Filters
              </button>
            )}
            <button
              onClick={fetchHistory}
              disabled={loading}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 bg-slate-50/40">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
              <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
              <p className="text-xs">Loading EOD reports history...</p>
            </div>
          ) : paginatedDayBooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                <FileText className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-700">No EOD reports found</p>
              <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
                {dateFilter || statusFilter
                  ? 'No records match your selected date or status filter.'
                  : 'You have not submitted any EOD day books yet.'}
              </p>
            </div>
          ) : (
            paginatedDayBooks.map((db) => {
              const isExpanded = expandedId === db._id;
              const { firstHalf, secondHalf } = getDayBookHalvesSummary(db);
              const hasFirst = firstHalf.length > 0;
              const hasSecond = secondHalf.length > 0;

              const firstSet = new Set(firstHalf.map((t) => t.toLowerCase()));
              const secondSet = new Set(secondHalf.map((t) => t.toLowerCase()));
              const setsEqual =
                firstSet.size === secondSet.size &&
                [...firstSet].every((t) => secondSet.has(t));
              const bothPresent = hasFirst && hasSecond;

              return (
                <div
                  key={db._id}
                  className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-xs hover:border-blue-300 transition-all duration-150"
                >
                  {/* Row Summary Header */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : db._id)}
                    className="p-2.5 sm:px-3.5 sm:py-2.5 cursor-pointer flex flex-wrap md:flex-nowrap items-center justify-between gap-3 hover:bg-blue-50/30 transition-colors"
                  >
                    <div className="flex items-center space-x-2.5 shrink-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-600 font-semibold text-xs">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                          {new Date(db.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Slots filled: <span className="font-semibold text-slate-700">{db.slots?.filter((s) => s.description).length || 0} / {db.slots?.length || 0}</span>
                        </p>
                      </div>
                    </div>

                    {/* Task summary */}
                    <div className="flex-1 max-w-sm px-2 min-w-0">
                      {!hasFirst && !hasSecond ? (
                        <span className="text-slate-400 italic text-xs">No tasks specified</span>
                      ) : !bothPresent || setsEqual ? (
                        <div className="space-y-0.5 min-w-0">
                          {[...new Map([...firstHalf, ...secondHalf].map((t) => [t.toLowerCase(), t])).values()].map((t, idx) => (
                            <span key={idx} className="block text-xs font-semibold text-slate-800 truncate" title={t}>
                              • {t}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-1 min-w-0">
                          {hasFirst && (
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                                1st Half:
                              </span>
                              <span className="text-xs font-semibold text-slate-800 truncate">
                                {firstHalf.join(', ')}
                              </span>
                            </div>
                          )}
                          {hasSecond && (
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                                2nd Half:
                              </span>
                              <span className="text-xs font-semibold text-slate-800 truncate">
                                {secondHalf.join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Status & Toggle */}
                    <div className="flex items-center space-x-3 shrink-0">
                      {getStatusBadge(db.status)}
                      <button className="p-1 text-slate-400 hover:text-slate-600 rounded">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Slot Details */}
                  {isExpanded && (
                    <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3 text-xs">
                      {/* Admin Comment if present */}
                      {db.adminComment && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 flex items-start space-x-2">
                          <MessageSquare className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-amber-800 block">Admin Feedback:</span>
                            <p className="mt-0.5">{db.adminComment}</p>
                          </div>
                        </div>
                      )}

                      <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                        Slot Details
                      </h4>

                      <div className="space-y-2">
                        {db.slots.map((slot, idx) => {
                          const isBreak =
                            slot.workType === 'Break' ||
                            String(slot.slotType || '').toLowerCase().includes('break') ||
                            String(slot.description || '').toLowerCase().includes('lunch break');

                          const { completed, pending } = parseDescriptionSections(slot.description);

                          return (
                            <div
                              key={idx}
                              className={`p-3 rounded-lg border ${isBreak
                                  ? 'bg-amber-50/60 border-amber-200/60 text-slate-600'
                                  : 'bg-white border-slate-200'
                                }`}
                            >
                              <div className="flex items-center justify-between font-semibold mb-1">
                                <span className="text-slate-900">{slot.slotType}</span>
                                <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-600">
                                  {getSlotTaskTitle(slot) || slot.workType || 'Task'}
                                </span>
                              </div>

                              {!isBreak && (
                                <div className="space-y-1 mt-1 text-slate-600">
                                  {completed && (
                                    <div>
                                      <span className="font-bold text-slate-700">Completed Work: </span>
                                      <span>{completed}</span>
                                    </div>
                                  )}
                                  {pending && (
                                    <div>
                                      <span className="font-bold text-amber-700">Pending Work: </span>
                                      <span>{pending}</span>
                                    </div>
                                  )}
                                  {!completed && !pending && (
                                    <span className="italic text-slate-400">No detailed work description provided.</span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Pagination Bar */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium">
            Showing{' '}
            <span className="font-bold text-slate-800">
              {filteredDayBooks.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}
            </span>{' '}
            to{' '}
            <span className="font-bold text-slate-800">
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredDayBooks.length)}
            </span>{' '}
            of <span className="font-bold text-slate-800">{filteredDayBooks.length}</span> records
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <span className="text-xs font-bold text-slate-700 px-2">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || loading || filteredDayBooks.length === 0}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeEODHistoryModal;
