import React, { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';

const SearchWithSuggestions = ({
  value,
  onChange,
  items = [],
  getSuggestionValue,
  getSuggestionTitle,
  getSuggestionSubtitle,
  placeholder = 'Search...',
  className = '',
  inputClassName = '',
  maxSuggestions = 6
}) => {
  const [open, setOpen] = useState(false);
  const term = String(value || '').trim().toLowerCase();

  const suggestions = useMemo(() => {
    if (!term) return [];
    return items
      .filter((item) => {
        const title = String(getSuggestionTitle?.(item) || '');
        const subtitle = String(getSuggestionSubtitle?.(item) || '');
        const suggestionValue = String(getSuggestionValue?.(item) || '');
        return `${title} ${subtitle} ${suggestionValue}`.toLowerCase().includes(term);
      })
      .slice(0, maxSuggestions);
  }, [getSuggestionSubtitle, getSuggestionTitle, getSuggestionValue, items, maxSuggestions, term]);

  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        className={`w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 ${inputClassName}`}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('');
            setOpen(false);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          title="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {open && term && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_18px_44px_rgba(15,23,42,0.14)]">
          {suggestions.length > 0 ? (
            suggestions.map((item, index) => (
              <button
                key={item?._id || item?.id || `${getSuggestionValue?.(item)}-${index}`}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onChange(getSuggestionValue?.(item) || getSuggestionTitle?.(item) || '');
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
      )}
    </div>
  );
};

export default SearchWithSuggestions;
