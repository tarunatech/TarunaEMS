// components/Dashboard/StatCard.js
import React from 'react';
import { useNavigate } from 'react-router-dom';

const StatCard = ({ stat, index }) => {
  const navigate = useNavigate();

  const accents = [
    {
      icon: 'from-indigo-500 to-violet-600',
      glow: 'shadow-indigo-500/25',
      corner: 'bg-indigo-50',
      ring: 'ring-indigo-100',
      hover: 'hover:border-indigo-200'
    },
    {
      icon: 'from-emerald-500 to-teal-600',
      glow: 'shadow-emerald-500/25',
      corner: 'bg-emerald-50',
      ring: 'ring-emerald-100',
      hover: 'hover:border-emerald-200'
    },
    {
      icon: 'from-amber-500 to-orange-600',
      glow: 'shadow-amber-500/25',
      corner: 'bg-amber-50',
      ring: 'ring-amber-100',
      hover: 'hover:border-amber-200'
    },
    {
      icon: 'from-pink-500 to-rose-600',
      glow: 'shadow-pink-500/25',
      corner: 'bg-pink-50',
      ring: 'ring-pink-100',
      hover: 'hover:border-pink-200'
    }
  ];

  const accent = accents[index % accents.length];

  const getChangeStyles = (changeType) => {
    const styles = {
      positive: 'text-emerald-600 bg-emerald-50 border border-emerald-100',
      negative: 'text-rose-600 bg-rose-50 border border-rose-100',
      neutral: 'text-slate-500 bg-slate-50 border border-slate-100'
    };
    return styles[changeType] || styles.neutral;
  };

  const handleClick = () => {
    if (stat.path) {
      navigate(stat.path);
    }
  };

  return (
    <div
      className={`dashboard-stat-card group relative overflow-hidden bg-white border border-slate-200/70 rounded-2xl p-6 shadow-[0_10px_28px_rgba(15,23,42,0.07)] hover:shadow-[0_18px_36px_rgba(15,23,42,0.12)] hover:-translate-y-1 ${accent.hover} transition-all duration-300 ${stat.path ? 'cursor-pointer' : ''}`}
      onClick={handleClick}
    >
      <div className={`dashboard-card-wash absolute -top-16 -right-16 h-36 w-36 rounded-full ${accent.corner} transition-transform duration-300 group-hover:scale-110`} />
      <div className="flex items-center justify-between mb-4">
        <div className={`relative w-12 h-12 bg-gradient-to-br ${accent.icon} border border-white/70 rounded-xl flex items-center justify-center shadow-lg ${accent.glow} ring-4 ${accent.ring}`}>
          <stat.icon className="w-6 h-6 text-white" />
        </div>
        {stat.change && (
          <span className={`relative text-xs font-bold px-2.5 py-1 rounded-full transition-colors ${getChangeStyles(stat.changeType)}`}>
            {stat.change}
          </span>
        )}
      </div>
      <div className="relative">
        <h3 className="text-2xl font-bold text-slate-900 mb-1 transition-colors">
          {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
        </h3>
        <p className="text-slate-500 text-sm font-medium">{stat.title}</p>
      </div>
    </div>
  );
};

export default StatCard;
