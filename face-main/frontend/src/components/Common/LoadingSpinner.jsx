// components/Common/LoadingSpinner.js
import React from 'react';

const LoadingSpinner = ({ 
  message = "Loading...", 
  size = "large", 
  color = "blue",
  showMessage = true 
}) => {
  const sizeClasses = {
    small: "w-4 h-4",
    medium: "w-7 h-7",
    large: "w-9 h-9"
  };

  const colorClasses = {
    'blue': 'border-blue-600',
    'cyan': 'border-cyan-400',
    'slate': 'border-slate-500',
    'white': 'border-white',
    'gray': 'border-slate-400',
    'neon-pink': 'border-blue-600',
    'neon-purple': 'border-indigo-600'
  };

  return (
    <div className="premium-loading-spinner flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-blue-100/80 bg-gradient-to-br from-white via-sky-50 to-indigo-50 shadow-[0_12px_30px_rgba(15,23,42,0.07)]">
      {/* Spinner */}
      <div className="premium-loading-spinner-orb relative rounded-full bg-white/90 p-3 shadow-[0_10px_24px_rgba(37,99,235,0.14)] ring-1 ring-blue-100">
        <div className={`premium-loading-spinner-ring ${sizeClasses[size]} border-4 border-transparent border-t-4 ${colorClasses[color]} rounded-full animate-spin`}></div>
        <div className={`premium-loading-spinner-ring-secondary absolute inset-3 ${sizeClasses[size]} border-4 border-transparent border-r-4 border-cyan-400 rounded-full animate-spin`} style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
      </div>
      
      {/* Message */}
      {showMessage && (
        <div className="mt-4 text-center">
          <p className="premium-loading-spinner-message text-lg font-semibold text-slate-700">{message}</p>
          <div className="flex items-center justify-center mt-2 space-x-1">
            <div className="h-2 w-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadingSpinner;
