import React from 'react';
import { AlertTriangle, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const toneStyles = {
  rose: 'bg-rose-500 shadow-rose-500/30',
  amber: 'bg-amber-500 shadow-amber-500/30',
  orange: 'bg-orange-500 shadow-orange-500/30',
  indigo: 'bg-indigo-500 shadow-indigo-500/30',
  emerald: 'bg-emerald-500 shadow-emerald-500/30',
  blue: 'bg-blue-500 shadow-blue-500/30',
  slate: 'bg-slate-500 shadow-slate-500/30',
  violet: 'bg-violet-500 shadow-violet-500/30'
};

const InsightPanel = ({ title, icon: Icon, children }) => (
  <div className="dashboard-panel relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-[0_8px_18px_rgba(15,23,42,0.06)]">
    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-900 via-indigo-500 to-emerald-400" />
    <div className="mb-3.5 flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
        <Icon className="h-4 w-4" strokeWidth={2} />
      </div>
      <h3 className="text-xs sm:text-[13px] font-extrabold uppercase tracking-[0.16em] text-slate-800">{title}</h3>
    </div>
    {children}
  </div>
);

const DashboardInsights = ({ attentionItems = [], taskHealth = [] }) => {
  const navigate = useNavigate();
  const visibleAttention = attentionItems.filter(item => Number(item.value) > 0);
  const attentionRows = visibleAttention.length > 0
    ? visibleAttention
    : [{ label: 'urgent items', value: 0, tone: 'emerald', path: '/admin/dashboard' }];

  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
      <InsightPanel title="Needs Your Attention" icon={AlertTriangle}>
        <div className="space-y-2">
          {attentionRows.map(item => (
            <button
              key={item.label}
              type="button"
              onClick={() => item.path && navigate(item.path)}
              className="group flex w-full items-start justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 text-left transition-all duration-200 hover:border-slate-200 hover:bg-white hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <span className="flex min-w-0 flex-1 items-start gap-2.5">
                <span className={`mt-0.5 h-3 w-3 shrink-0 rounded-full shadow-sm ${toneStyles[item.tone] || toneStyles.slate}`} />
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] sm:text-[14px] font-bold text-slate-800">{item.label}</span>
                  <span className="mt-0.5 block truncate text-[11.5px] sm:text-[12px] font-medium text-slate-500">
                    {item.detail || ' '}
                  </span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-600 shadow-sm">
                  {item.actionLabel || 'Open'}
                </span>
                <span className="rounded-lg bg-white px-3 py-0.5 text-[13.5px] sm:text-[14px] font-black text-slate-950 shadow-sm ring-1 ring-slate-200/70">
                  {Number(item.value || 0).toLocaleString()}
                </span>
              </span>
            </button>
          ))}
        </div>
      </InsightPanel>

      <InsightPanel title="Task Health" icon={Activity}>
        <div className="space-y-2">
          {taskHealth.map(item => {
            const taskDetailText = item.tasks && item.tasks.length > 0
              ? item.tasks.map(t => `${t.title}${t.assignee ? ` — ${t.assignee.split(' ')[0]}` : ''}`).join(' · ')
              : null;

            return (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate('/admin/tasks', { state: { statusFilter: item.label } })}
                className="group flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 text-left transition-all duration-200 hover:border-slate-200 hover:bg-white hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <span className="flex min-w-0 flex-1 items-start gap-2.5">
                  <span className={`mt-1 h-3 w-3 shrink-0 rounded-full shadow-sm ${toneStyles[item.tone] || toneStyles.slate}`} />
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] sm:text-[14px] font-bold text-slate-800">{item.label}</span>
                    {taskDetailText && (
                      <span className="mt-0.5 block truncate text-[11.5px] sm:text-[12px] font-medium text-slate-500">
                        {taskDetailText}
                      </span>
                    )}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="rounded-lg bg-white px-3 py-0.5 text-[13.5px] sm:text-[14px] font-black text-slate-950 shadow-sm ring-1 ring-slate-200/70">
                    {Number(item.value || 0).toLocaleString()}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </InsightPanel>
    </div>
  );
};

export default DashboardInsights;
