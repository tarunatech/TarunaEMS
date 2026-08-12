import React, { useEffect, useState } from 'react';
import { BarChart3, Calendar, CheckCircle, ChevronLeft, ChevronRight, Clock, Eye, Loader2, Star, Target, User, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { performanceService } from '../../services/taskService';

const getCurrentMonth = () => new Date().toISOString().slice(0, 7);

const shiftMonth = (month, direction) => {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + direction, 1));
  return date.toISOString().slice(0, 7);
};

const formatMonth = (month) => {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const formatDate = (value) => value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';

const getInitials = (name = '') => name.split(' ').map((part) => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'E';

const Stars = ({ value = 0, onChange = null }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => {
      const filled = star <= value;
      const Icon = (
        <Star className={`h-4 w-4 ${filled ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
      );
      return onChange ? (
        <button key={star} type="button" onClick={() => onChange(star)} className="rounded p-0.5 hover:bg-amber-50">
          {Icon}
        </button>
      ) : (
        <span key={star}>{Icon}</span>
      );
    })}
  </div>
);

const MetricCard = ({ title, value, icon: Icon, tone = 'indigo' }) => {
  const toneClasses = {
    indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-600 ring-amber-100',
    red: 'bg-red-50 text-red-600 ring-red-100',
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[12px] text-slate-500">{title}</p>
          <h3 className="mt-1 text-xl font-semibold text-slate-900">{value}</h3>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ring-1 ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

const AdminPerformanceReview = () => {
  const [month, setMonth] = useState(getCurrentMonth());
  const [reviews, setReviews] = useState([]);
  const [aggregates, setAggregates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState(null);
  const [detailTasks, setDetailTasks] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [adminRating, setAdminRating] = useState(0);
  const [adminComment, setAdminComment] = useState('');

  const fetchTeamPerformance = async (targetMonth = month) => {
    try {
      setLoading(true);
      const response = await performanceService.getTeamPerformance(targetMonth);
      if (response.success) {
        setReviews(response.reviews || []);
        setAggregates(response.aggregates || null);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to fetch performance reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamPerformance(month);
  }, [month]);

  const openReviewModal = async (reviewRow) => {
    try {
      setSelectedReview(reviewRow);
      setAdminRating(reviewRow.review.adminRating || reviewRow.review.suggestedRating || 0);
      setAdminComment(reviewRow.review.adminComment || '');
      setModalLoading(true);
      const response = await performanceService.getEmployeeMonthlyDetail(reviewRow.employee._id, month);
      if (response.success) setDetailTasks(response.tasks || []);
    } catch (error) {
      toast.error(error.message || 'Failed to load employee performance details');
    } finally {
      setModalLoading(false);
    }
  };

  const saveReview = async () => {
    if (!selectedReview || !adminRating) {
      toast.error('Please select a rating');
      return;
    }

    try {
      await performanceService.rateEmployee(selectedReview.employee._id, {
        month,
        adminRating,
        adminComment,
      });
      toast.success('Performance review saved');
      setSelectedReview(null);
      await fetchTeamPerformance(month);
    } catch (error) {
      toast.error(error.message || 'Failed to save performance review');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-12 shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-50">
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Monthly Performance Review</h2>
          <p className="text-sm text-slate-500">Review completed tasks by on-time delivery.</p>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-1">
          <button onClick={() => setMonth(shiftMonth(month, -1))} className="rounded-md p-2 text-slate-500 hover:bg-slate-50">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[9rem] text-center text-sm font-semibold text-slate-900">{formatMonth(month)}</span>
          <button onClick={() => setMonth(shiftMonth(month, 1))} className="rounded-md p-2 text-slate-500 hover:bg-slate-50">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Avg team rating" value={aggregates?.avgRating || 0} icon={Star} tone="amber" />
        <MetricCard title="Team on-time rate" value={`${aggregates?.teamOnTimeRate || 0}%`} icon={CheckCircle} tone="emerald" />
        <MetricCard title="Tasks closed" value={aggregates?.totalTasksClosed || 0} icon={Target} tone="indigo" />
        <MetricCard title="Reviews pending" value={aggregates?.reviewsPending || 0} icon={Clock} tone="red" />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-white">
              <tr>
                <th className="p-6 text-left font-semibold text-slate-600">Employee</th>
                <th className="p-6 text-left font-semibold text-slate-600">Tasks Completed</th>
                <th className="p-6 text-left font-semibold text-slate-600">On Time</th>
                <th className="p-6 text-left font-semibold text-slate-600">Late</th>
                <th className="p-6 text-left font-semibold text-slate-600">Suggested</th>
                <th className="p-6 text-left font-semibold text-slate-600">Current</th>
                <th className="p-6 text-left font-semibold text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reviews.map((item) => (
                <tr key={item.employee._id} className="transition-all duration-200 hover:bg-blue-50">
                  <td className="p-6">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-xs font-bold text-blue-700">
                        {getInitials(item.employee.name)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{item.employee.name}</p>
                        <p className="text-xs text-slate-500">{item.employee.employeeId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6 text-slate-700">{item.review.totalTasks}</td>
                  <td className="p-6 text-slate-700">{item.review.onTimeCount}</td>
                  <td className="p-6 text-slate-700">{item.review.lateCount}</td>
                  <td className="p-6"><Stars value={item.review.suggestedRating} /></td>
                  <td className="p-6">
                    {item.review.adminRating ? <Stars value={item.review.adminRating} /> : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">Not rated</span>
                    )}
                  </td>
                  <td className="p-6">
                    <button onClick={() => openReviewModal(item)} className="inline-flex items-center rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-600 transition-all duration-200 hover:bg-blue-50">
                      <Eye className="mr-2 h-4 w-4" />
                      Review
                    </button>
                  </td>
                </tr>
              ))}
              {reviews.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-slate-500">No employees found for this month.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedReview && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setSelectedReview(null)} />
          <div className="relative max-h-[82vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Performance Review</h2>
                <p className="text-sm text-slate-500">{selectedReview.employee.name} - {formatMonth(month)}</p>
              </div>
              <button onClick={() => setSelectedReview(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="max-h-56 space-y-2 overflow-y-auto">
                  {detailTasks.length > 0 ? detailTasks.map((task) => (
                    <div key={task._id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="line-clamp-2 text-sm font-medium text-slate-900">{task.description || task.title}</p>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${task.onTime ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {task.onTime ? 'On time' : 'Late'}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">Due: {formatDate(task.dueDate)} | Completed: {formatDate(task.completedDate)}</p>
                    </div>
                  )) : (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
                      No completed tasks in this month.
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Rating</label>
                  <Stars value={adminRating} onChange={setAdminRating} />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Admin Feedback / Comment</label>
                  <textarea
                    value={adminComment}
                    onChange={(event) => setAdminComment(event.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    placeholder="Add performance feedback..."
                    maxLength={1000}
                  />
                </div>

                <div className="flex justify-end">
                  <button onClick={saveReview} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700">
                    Save Review
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPerformanceReview;
