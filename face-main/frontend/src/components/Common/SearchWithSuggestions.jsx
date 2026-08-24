import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';

const SearchWithSuggestions = ({
  value,
  onChange,
  items = [],
  getSuggestionValue,
  getSuggestionTitle,
  getSuggestionSubtitle,
  onSelect,
  placeholder = 'Search...',
  className = '',
  inputClassName = '',
  maxSuggestions = 6,
  showSuggestionsOnFocus = true
}) => {
  const [open, setOpen] = useState(false);
  const [menuRect, setMenuRect] = useState(null);
  const wrapperRef = useRef(null);
  const term = String(value || '').trim().toLowerCase();

  const suggestions = useMemo(() => {
    const sourceItems = Array.isArray(items) ? items : [];
    if (!term) return showSuggestionsOnFocus ? sourceItems.slice(0, maxSuggestions) : [];
    return sourceItems
      .filter((item) => {
        const title = String(getSuggestionTitle?.(item) || '');
        const subtitle = String(getSuggestionSubtitle?.(item) || '');
        const suggestionValue = String(getSuggestionValue?.(item) || '');
        return `${title} ${subtitle} ${suggestionValue}`.toLowerCase().includes(term);
      })
      .slice(0, maxSuggestions);
  }, [getSuggestionSubtitle, getSuggestionTitle, getSuggestionValue, items, maxSuggestions, showSuggestionsOnFocus, term]);

  const updateMenuRect = () => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuRect({
      left: rect.left,
      top: rect.bottom + 8,
      width: rect.width
    });
  };

  useEffect(() => {
    if (!open) return undefined;
    updateMenuRect();
    window.addEventListener('scroll', updateMenuRect, true);
    window.addEventListener('resize', updateMenuRect);
    return () => {
      window.removeEventListener('scroll', updateMenuRect, true);
      window.removeEventListener('resize', updateMenuRect);
    };
  }, [open, value]);

  const suggestionMenu = open && (term || showSuggestionsOnFocus) && menuRect && (
    <div
      className="fixed z-[9999] max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-[0_18px_44px_rgba(15,23,42,0.14)]"
      style={{ left: menuRect.left, top: menuRect.top, width: menuRect.width }}
    >
      {suggestions.length > 0 ? (
        suggestions.map((item, index) => (
          <button
            key={item?._id || item?.id || `${getSuggestionValue?.(item)}-${index}`}
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              const nextValue = getSuggestionValue?.(item) || getSuggestionTitle?.(item) || '';
              onChange(nextValue);
              onSelect?.(item);
              setOpen(false);
            }}
            className="block w-full px-4 py-3 text-left transition-colors hover:bg-indigo-50"
          >
            <p className="truncate text-[13px] font-semibold text-slate-900">{getSuggestionTitle?.(item) || 'Untitled'}</p>
            {getSuggestionSubtitle?.(item) && (
              <p className="mt-0.5 line-clamp-1 text-[12px] text-slate-500">{getSuggestionSubtitle(item)}</p>
            )}
          </button>
        ))
      ) : (
        <div className="px-4 py-3 text-[13px] text-slate-500">No matches found</div>
      )}
    </div>
  );

  return (
    <div ref={wrapperRef} className={`relative flex items-center ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 z-10 shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          updateMenuRect();
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        className={`w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 ${inputClassName}`}
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange('');
            setOpen(false);
          }}
          style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)' }}
          className="flex items-center justify-center h-6 w-6 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors z-10"
          title="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
      {suggestionMenu ? createPortal(suggestionMenu, document.body) : null}
    </div>
  );
};

export default SearchWithSuggestions;
