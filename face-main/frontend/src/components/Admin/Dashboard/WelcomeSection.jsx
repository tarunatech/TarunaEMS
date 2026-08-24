// components/Dashboard/WelcomeSection.js
import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
// import mountainImg from '../../assets/mountain.png';

const WelcomeSection = ({
  userName = 'Admin',
  lastUpdated,
  manualRefresh,
  loading = false
}) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

 const greeting = useMemo(() => {
  const hour = now.getHours();
  if (hour < 12) return 'Rise & Shine';
  if (hour < 18) return 'Good Day';
  if (hour < 21) return 'Good Evening';
  return 'Night Mode';
}, [now]);

  const formattedDate = useMemo(() => {
    return now.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, [now]);

  const currentTime = useMemo(() => {
    return now.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }, [now]);

  return (
    <div className="relative min-h-[260px] sm:min-h-[210px] overflow-hidden bg-slate-950 border border-white/30 rounded-2xl sm:rounded-[28px] shadow-[0_18px_36px_rgba(15,23,42,0.2)] animate-hero-in">
      {/* Layered background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* mountain photo background */}
        <img
          src="/new_mountain.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover scale-[1.02] opacity-100"
        />
        {/* readability overlay so text stays crisp over the photo */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#080522]/95 via-[#111637]/72 to-[#0b1738]/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b0626]/58 via-transparent to-[#061526]/82" />
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-[#2d5e86]/32 via-transparent to-transparent" />
        <div className="absolute left-0 right-0 bottom-0 h-10 bg-cyan-500/12" />

        {/* soft base gradient / mesh */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/16 via-transparent to-cyan-300/14" />
        <div
          className="absolute inset-0 opacity-[0.22]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 84% 24%, rgba(125,211,252,0.55), transparent 8%), linear-gradient(100deg, transparent 0%, rgba(99,102,241,0.26) 35%, rgba(45,212,191,0.24) 54%, rgba(168,85,247,0.18) 72%, transparent 100%)',
          }}
        />

        {/* moving star particles */}
        <div className="moving-starfield moving-starfield-near absolute inset-0" />
        <div className="moving-starfield moving-starfield-mid absolute inset-0" />
        <div className="moving-starfield moving-starfield-far absolute inset-0" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-[260px] sm:min-h-[210px] flex-col justify-between gap-5 sm:gap-8 p-4 sm:p-6 md:flex-row md:items-center md:p-10">
        <div className="max-w-3xl">
              <p
            className="mb-2 sm:mb-3 text-[10px] sm:text-xs font-bold uppercase tracking-[0.24em] sm:tracking-[0.42em] text-slate-300 animate-fade-slide-up"
                style={{ animationDelay: '0ms' }}
              >
            {greeting}
              </p>
          <h1 className="mb-2 sm:mb-3 text-2xl sm:text-3xl font-extrabold leading-tight text-white drop-shadow-sm md:text-5xl">
                <span
              className="animate-fade-slide-up inline-block"
                  style={{ animationDelay: '160ms' }}
                >
              Welcome back,{' '}
              <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent">
                {userName}!
              </span>
                </span>
              </h1>
              <p
            className="mb-4 sm:mb-6 text-sm sm:text-base text-slate-300 animate-fade-slide-up"
                style={{ animationDelay: '220ms' }}
              >
                Here's what's happening in your company today.
              </p>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-violet-300/35 bg-violet-400/12 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold text-violet-200 shadow-sm backdrop-blur-md">
              Administrator
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/12 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold text-emerald-200 shadow-sm backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.8)]" />
              Online
            </span>
          </div>
        </div>

        <div className="flex flex-col items-start md:items-end w-full md:w-auto pt-3 md:pt-0 border-t border-white/10 md:border-t-0">
          <div className="font-mono text-2xl sm:text-4xl font-extrabold leading-none tracking-wider text-white drop-shadow-[0_3px_14px_rgba(255,255,255,0.16)] md:text-5xl">
            {currentTime}
          </div>
          <p className="mt-1 sm:mt-2 text-xs sm:text-base font-medium text-slate-300">
            {formattedDate}
          </p>
          <div className="mt-3 sm:mt-4 flex flex-row items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
            <p className="text-[11px] sm:text-sm font-medium text-slate-300/90 truncate">
              Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : currentTime}
            </p>
            <button
              onClick={manualRefresh}
              disabled={loading}
              type="button"
              aria-label="Refresh Dashboard Data"
              className="inline-flex items-center gap-1.5 rounded-full border border-indigo-300/30 bg-indigo-500/20 hover:bg-indigo-500/35 active:scale-95 px-2.5 py-1 text-xs font-medium text-indigo-100 backdrop-blur-md transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-indigo-200 ${loading ? 'animate-spin' : ''}`} />
              <span className="text-[11px] sm:text-xs font-semibold">{loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Animations — purely presentational */}
      <style>{`
        @keyframes heroIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-hero-in {
          animation: heroIn 700ms ease-out both;
        }

        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-slide-up {
          animation: fadeSlideUp 600ms ease-out both;
        }

        @keyframes blobFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(12px, -14px) scale(1.05); }
          66% { transform: translate(-10px, 10px) scale(0.97); }
        }
        .animate-blob-float {
          animation: blobFloat 11s ease-in-out infinite;
        }

        .moving-starfield {
          background-repeat: repeat;
          background-position: 0 0;
          will-change: background-position, opacity;
          mix-blend-mode: screen;
        }

        .moving-starfield-near {
          opacity: 0.62;
          background-size: 260px 160px;
          background-image:
            radial-gradient(circle at 12px 18px, rgba(255,255,255,0.95) 0 1.2px, transparent 1.7px),
            radial-gradient(circle at 76px 54px, rgba(125,211,252,0.82) 0 1px, transparent 1.6px),
            radial-gradient(circle at 132px 28px, rgba(221,214,254,0.78) 0 1.3px, transparent 1.9px),
            radial-gradient(circle at 205px 92px, rgba(255,255,255,0.72) 0 1px, transparent 1.5px),
            radial-gradient(circle at 238px 36px, rgba(165,243,252,0.75) 0 1.1px, transparent 1.7px);
          animation: starDriftNear 14s linear infinite, starPulse 4.2s ease-in-out infinite;
        }

        .moving-starfield-mid {
          opacity: 0.46;
          background-size: 340px 210px;
          background-image:
            radial-gradient(circle at 42px 34px, rgba(255,255,255,0.72) 0 1px, transparent 1.6px),
            radial-gradient(circle at 118px 118px, rgba(196,181,253,0.64) 0 1px, transparent 1.5px),
            radial-gradient(circle at 188px 62px, rgba(147,197,253,0.66) 0 1px, transparent 1.6px),
            radial-gradient(circle at 278px 156px, rgba(255,255,255,0.62) 0 1px, transparent 1.5px);
          animation: starDriftMid 22s linear infinite, starPulse 5.8s ease-in-out infinite reverse;
        }

        .moving-starfield-far {
          opacity: 0.34;
          background-size: 430px 250px;
          background-image:
            radial-gradient(circle at 24px 76px, rgba(255,255,255,0.58) 0 0.9px, transparent 1.4px),
            radial-gradient(circle at 164px 28px, rgba(186,230,253,0.52) 0 0.9px, transparent 1.4px),
            radial-gradient(circle at 252px 132px, rgba(255,255,255,0.50) 0 0.9px, transparent 1.4px),
            radial-gradient(circle at 384px 96px, rgba(216,180,254,0.48) 0 0.9px, transparent 1.4px);
          animation: starDriftFar 34s linear infinite;
        }

        @keyframes starDriftNear {
          from { background-position: 0 0, 0 0, 0 0, 0 0, 0 0; }
          to { background-position: 260px 120px, 260px 120px, 260px 120px, 260px 120px, 260px 120px; }
        }

        @keyframes starDriftMid {
          from { background-position: 0 0, 0 0, 0 0, 0 0; }
          to { background-position: 340px 90px, 340px 90px, 340px 90px, 340px 90px; }
        }

        @keyframes starDriftFar {
          from { background-position: 0 0, 0 0, 0 0, 0 0; }
          to { background-position: 430px 60px, 430px 60px, 430px 60px, 430px 60px; }
        }

        @keyframes starPulse {
          0%, 100% { filter: drop-shadow(0 0 1px rgba(255,255,255,0.25)); }
          50% { filter: drop-shadow(0 0 5px rgba(147,197,253,0.55)); }
        }

        @keyframes waveSlide {
          0% { transform: translateX(0); }
          50% { transform: translateX(-2%); }
          100% { transform: translateX(0); }
        }
        .animate-wave-slide {
          animation: waveSlide 10s ease-in-out infinite;
        }

        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spinSlow 6s linear infinite;
        }

        @keyframes floatY {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-float-y {
          animation: floatY 4s ease-in-out infinite;
        }

        @keyframes textGlow {
          0%, 100% { filter: drop-shadow(0 0 0 rgba(59,130,246,0)); }
          50% { filter: drop-shadow(0 0 8px rgba(59,130,246,0.25)); }
        }
        .animate-text-glow {
          animation: textGlow 3.5s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-hero-in,
          .animate-fade-slide-up,
          .animate-blob-float,
          .moving-starfield,
          .animate-wave-slide,
          .animate-spin-slow,
          .animate-float-y,
          .animate-text-glow {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default WelcomeSection;
