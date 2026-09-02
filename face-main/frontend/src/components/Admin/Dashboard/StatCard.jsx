// components/Dashboard/StatCard.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, CalendarClock, TrendingUp } from 'lucide-react';

const StatCard = ({ stat, index = 0 }) => {
  const navigate = useNavigate();

  const themes = [
    {
      name: 'purple',
      iconBox: 'bg-gradient-to-br from-[#7f56d9] to-[#6941c6] shadow-md shadow-purple-500/20',
      circleBg: 'bg-purple-100/80',
      panelBg: 'bg-gradient-to-br from-[#7f56d9] to-[#6941c6]',
      pillBg: 'bg-white/15',
      itemBorder: 'border-white/20',
      dotColor: 'bg-violet-200',
    },
    {
      name: 'teal',
      iconBox: 'bg-gradient-to-br from-[#12b76a] to-[#039855] shadow-md shadow-emerald-500/20',
      circleBg: 'bg-emerald-100/80',
      panelBg: 'bg-gradient-to-br from-[#12b76a] to-[#027a48]',
      pillBg: 'bg-white/15',
      itemBorder: 'border-white/20',
      dotColor: 'bg-emerald-200',
    },
    {
      name: 'orange',
      iconBox: 'bg-gradient-to-br from-[#f79009] to-[#dc6803] shadow-md shadow-orange-500/20',
      circleBg: 'bg-orange-100/80',
      panelBg: 'bg-gradient-to-br from-[#f79009] to-[#b54708]',
      pillBg: 'bg-white/15',
      itemBorder: 'border-white/20',
      dotColor: 'bg-amber-200',
    },
    {
      name: 'pink',
      iconBox: 'bg-gradient-to-br from-[#ee46bc] to-[#c11574] shadow-md shadow-pink-500/20',
      circleBg: 'bg-pink-100/80',
      panelBg: 'bg-gradient-to-br from-[#ee46bc] to-[#9e1268]',
      pillBg: 'bg-white/15',
      itemBorder: 'border-white/20',
      dotColor: 'bg-pink-200',
    }
  ];

  let themeIndex = index % themes.length;
  if (stat?.color) {
    const col = String(stat.color).toLowerCase();
    if (col.includes('purple') || col.includes('indigo') || col.includes('violet')) themeIndex = 0;
    else if (col.includes('emerald') || col.includes('teal') || col.includes('green')) themeIndex = 1;
    else if (col.includes('amber') || col.includes('orange') || col.includes('yellow')) themeIndex = 2;
    else if (col.includes('pink') || col.includes('rose') || col.includes('red')) themeIndex = 3;
  }

  const theme = themes[themeIndex];

  const handleClick = () => {
    if (stat?.path) {
      navigate(stat.path);
    }
  };

  const IconComponent = stat?.icon;
  const valueDisplay = typeof stat?.value === 'number' ? stat.value.toLocaleString() : (stat?.value ?? 0);

  // Inline bracket badge config for Tasks, Meetings and Leads
  const bracketBadge = (() => {
    const title = String(stat?.title || '').toLowerCase();
    if (title === 'tasks') {
      const activeCount = stat?.change ? String(stat.change).replace(/\D.*$/, '').trim() : '0';
      return { label: 'active', value: activeCount || '0' };
    }
    if (title === 'meetings') {
      const count = typeof stat?.value === 'number' ? stat.value : (stat?.value ?? 0);
      return { label: 'today', value: count };
    }
    if (title === 'leads') {
      return { label: 'new', value: stat?.newCount ?? 0 };
    }
    return null;
  })();

  // Theme accent colors for badge
  const themeAccentColors = [
    { text: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200/70' },
    { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200/70' },
    { text: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200/70' },
    { text: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200/70' },
  ];
  const accent = themeAccentColors[themeIndex];

  // Hover detail panel — Tasks, Meetings and Leads
  const cardTitle = String(stat?.title || '').toLowerCase();
  const isHoverSupportedCard = cardTitle === 'tasks' || cardTitle === 'meetings' || cardTitle === 'leads';
  const hoverItemsList = stat?.hoverItems || [];
  const hasHoverPanel = isHoverSupportedCard && hoverItemsList.length > 0;
  const hoverPanelLabel = cardTitle === 'tasks' ? 'Active Tasks' : cardTitle === 'leads' ? 'Overdue Follow-ups' : "Today's Meetings";
  const HoverItemIcon = cardTitle === 'tasks' ? User : cardTitle === 'leads' ? TrendingUp : CalendarClock;

  return (
    <div
      tabIndex={0}
      role="button"
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className={`relative overflow-hidden bg-white border border-slate-100/90 rounded-xl sm:rounded-[22px] p-2.5 sm:p-4.5 lg:p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-between group ${stat?.path ? 'cursor-pointer' : ''} focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
    >
      {/* Smooth Side Circle Background Arc */}
      <div className={`absolute -right-5 -top-5 w-24 h-24 sm:-right-8 sm:-top-8 sm:w-44 sm:h-44 rounded-full ${theme.circleBg} pointer-events-none transition-transform duration-500 group-hover:scale-105`} />

      {/* Left Content: Number on top, Label on bottom */}
      <div className="relative z-10 min-w-0 pr-1.5 sm:pr-2">
        <div className="flex items-center flex-wrap gap-1 sm:gap-1.5 mb-0.5 sm:mb-1.5">
          <h3 className="text-base sm:text-2xl lg:text-3xl font-bold text-slate-900 leading-none tracking-tight">
            {valueDisplay}
          </h3>
          {bracketBadge && (
            <span
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border text-[9.5px] sm:text-[10.5px] font-semibold tracking-wide leading-none whitespace-nowrap shrink-0 ${accent.bg} ${accent.border} ${accent.text} transition-opacity duration-200`}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              <span className="opacity-60 font-medium">(</span>
              {bracketBadge.label}:&nbsp;<span className="font-bold">{bracketBadge.value}</span>
              <span className="opacity-60 font-medium">)</span>
            </span>
          )}
        </div>
        <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate leading-snug">
          {stat?.title}
        </p>
      </div>

      {/* Right Content: Squircle Icon Box */}
      {IconComponent && (
        <div className={`relative z-10 shrink-0 w-8 h-8 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-lg sm:rounded-2xl flex items-center justify-center text-white ${theme.iconBox} transition-transform duration-300 group-hover:scale-105`}>
          <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white stroke-[2.2]" />
        </div>
      )}

      {/* ── Hover Detail Panel ── Tasks, Meetings and Leads */}
      {hasHoverPanel && (
        <div
          className={`
            absolute inset-x-0 bottom-0 z-20 ${theme.panelBg}
            rounded-b-xl sm:rounded-b-[22px] px-3 py-2.5 sm:px-4 sm:py-3
            translate-y-full group-hover:translate-y-0
            transition-transform duration-300 ease-out
            max-h-full flex flex-col
          `}
          style={{ willChange: 'transform' }}
        >
          {/* Panel header */}
          <div className="flex items-center gap-1.5 mb-2">
            <HoverItemIcon className="w-3 h-3 text-white/70 shrink-0" />
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-white/70 leading-none">
              {hoverPanelLabel}
            </span>
          </div>

          {/* Items or Empty Fallback */}
          {hoverItemsList.length > 0 ? (
            <ul
              className={`space-y-1.5 ${
                cardTitle === 'tasks' || cardTitle === 'leads'
                  ? 'flex-1 min-h-0 overflow-y-auto pr-0.5 stat-task-scroll'
                  : ''
              }`}
            >
              {(cardTitle === 'tasks' || cardTitle === 'leads' ? hoverItemsList : hoverItemsList.slice(0, 3)).map((item, i) => (
                <li
                  key={i}
                  className={`flex items-start gap-2 border-b last:border-b-0 pb-1.5 last:pb-0 ${theme.itemBorder}`}
                >
                  <span className={`mt-[4px] h-1.5 w-1.5 shrink-0 rounded-full ${theme.dotColor}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-[11px] font-semibold text-white leading-snug truncate">
                      {item.primary}
                    </p>
                    {item.secondary && (
                      <p className="text-[9px] sm:text-[10px] text-white/65 leading-snug truncate mt-0.5">
                        {item.secondary}
                      </p>
                    )}
                  </div>
                  {item.status && (
                    <span className={`shrink-0 self-center text-[8px] sm:text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${theme.pillBg} text-white/90 leading-none whitespace-nowrap`}>
                      {item.status}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex-1 flex items-center justify-center py-2">
              <p className="text-[10px] sm:text-[11px] font-medium text-white/80 italic text-center">
                {cardTitle === 'tasks' ? 'No active tasks' : cardTitle === 'leads' ? 'No overdue follow-ups' : 'No meetings today'}
              </p>
            </div>
          )}
          {/* Thin scrollbar for task list */}
          <style>{`
            .stat-task-scroll::-webkit-scrollbar { width: 3px; }
            .stat-task-scroll::-webkit-scrollbar-track { background: transparent; }
            .stat-task-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.30); border-radius: 99px; }
            .stat-task-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.50); }
            .stat-task-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.30) transparent; }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default StatCard;
