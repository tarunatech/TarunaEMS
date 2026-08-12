import React from 'react';
import { BarChart3, Star } from 'lucide-react';
import { useEmployeePerformance } from '../../hooks/useEmployeePerformance';

const Stars = ({ value = 0 }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={`h-4 w-4 ${star <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
      />
    ))}
  </div>
);

const MyPerformanceCard = () => {
  const { myPerformance, loading, error } = useEmployeePerformance();
  const review = myPerformance?.review;
  const totalTasks = Number(review?.totalTasks || 0);
  const onTimeCount = Number(review?.onTimeCount || 0);
  const lateCount = Number(review?.lateCount || 0);
  const onTimePercent = totalTasks > 0 ? Math.round((onTimeCount / totalTasks) * 100) : 0;
  const latePercent = totalTasks > 0 ? Math.max(0, 100 - onTimePercent) : 0;

  return (
    <div className="employee-tasks-panel bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] rounded-xl p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">My Performance</h2>
          <p className="text-[12px] text-slate-500">{myPerformance?.month || new Date().toISOString().slice(0, 7)}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 ring-1 ring-indigo-100">
          <BarChart3 className="h-5 w-5 text-indigo-600" />
        </div>
      </div>

      {loading ? (
        <p className="text-[13px] text-slate-500">Loading performance...</p>
      ) : error ? (
        <p className="text-[13px] text-red-600">{error}</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[12px] text-slate-500">This month's rating</p>
              {review?.adminRating ? (
                <Stars value={review.adminRating} />
              ) : (
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-medium text-slate-600">Not rated yet</span>
              )}
            </div>
            <div className="text-right">
              <p className="text-[22px] font-semibold text-indigo-600">{review?.autoScore || 0}%</p>
              <p className="text-[12px] text-slate-500">On-time score</p>
            </div>
          </div>

          <div>
            <div className="mb-2 flex justify-between text-[12px] text-slate-500">
              <span>On time: {onTimeCount}</span>
              <span>Late: {lateCount}</span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="bg-emerald-500" style={{ width: `${onTimePercent}%` }} />
              <div className="bg-red-500" style={{ width: `${latePercent}%` }} />
            </div>
          </div>

          {review?.adminComment && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[12px] font-medium text-slate-500">Admin comment</p>
              <p className="mt-1 text-[13px] text-slate-700">"{review.adminComment}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyPerformanceCard;
