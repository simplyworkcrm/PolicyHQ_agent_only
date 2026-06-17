import React, { useState, useRef, useEffect } from 'react';
import { Users, UsersRound, Share2, Calendar, Search, Building2, X, Target, ChevronDown, Check, ChevronLeft, ChevronRight, GraduationCap } from 'lucide-react';

export type LeaderboardMode = 'agent' | 'team' | 'source' | 'trainer';

const FilterDropdown = ({
  isNightMode,
  label,
  icon: Icon,
  options,
  selectedIds,
  onChange,
  isSingle = false,
  emptyMeansAll = false,
  placeholder = "Search..."
}: {
  isNightMode: boolean;
  label: string;
  icon: any;
  options: {id: string, name: string}[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  isSingle?: boolean;
  emptyMeansAll?: boolean;
  placeholder?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => opt?.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  // When emptyMeansAll: empty array = everything selected. Clicking an item in "all" state
  // switches to explicitly selecting all-except-that-item.
  const effectivelyAllSelected = emptyMeansAll && selectedIds.length === 0;

  const handleSelect = (id: string) => {
    if (isSingle) {
      if (selectedIds.includes(id)) {
        onChange([]);
      } else {
        onChange([id]);
      }
      setIsOpen(false);
    } else if (emptyMeansAll && effectivelyAllSelected) {
      // Deselect one: keep all except this one
      onChange(options.map(o => o.id).filter(oid => oid !== id));
    } else {
      if (selectedIds.includes(id)) {
        const next = selectedIds.filter(v => v !== id);
        // If all items end up selected, reset to empty (= all)
        onChange(emptyMeansAll && next.length === options.length ? [] : next);
      } else {
        const next = [...selectedIds, id];
        // If all items are now selected, reset to empty (= all)
        onChange(emptyMeansAll && next.length === options.length ? [] : next);
      }
    }
  };

  const selectedCount = selectedIds.length;
  const isItemSelected = (id: string) => effectivelyAllSelected || selectedIds.includes(id);

  const displayLabel = isSingle && selectedCount > 0
    ? options.find(o => o.id === selectedIds[0])?.name || label
    : emptyMeansAll && effectivelyAllSelected
    ? `All ${label}`
    : label + (selectedCount > 0 ? ` (${selectedCount})` : '');

  const hasActiveFilter = emptyMeansAll ? selectedCount > 0 : selectedCount > 0;

  return (
    <div className="relative flex-1" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl border transition-all text-[10px] font-bold uppercase tracking-widest ${
          hasActiveFilter
            ? (isNightMode ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700')
            : (isNightMode ? 'bg-slate-800/50 border-white/10 text-slate-400 hover:bg-slate-800' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white')
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <Icon className="w-3 h-3 shrink-0" />
          <span className="truncate">{displayLabel}</span>
        </div>
        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute top-full mt-2 w-full z-[500] rounded-2xl shadow-2xl border overflow-hidden ${
          isNightMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div className={`p-2 border-b ${isNightMode ? 'border-white/10 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
            <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border ${
              isNightMode ? 'bg-black/50 border-white/10 focus-within:border-brand-500/50' : 'bg-white border-slate-200 focus-within:border-brand-500/50'
            } transition-colors`}>
              <Search className={`w-3 h-3 ${isNightMode ? 'text-slate-500' : 'text-slate-400'}`} />
              <input 
                type="text" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-transparent border-none outline-none text-[10px] font-medium placeholder:opacity-50"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto scrollbar-hide p-1.5 flex flex-col gap-0.5">
             {selectedCount > 0 && !isSingle && (
              <button 
                onClick={() => onChange([])}
                className={`w-full text-left px-2 py-1.5 rounded-lg text-[9px] uppercase tracking-widest font-bold mb-0.5 opacity-70 hover:opacity-100 transition-opacity ${
                  isNightMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {emptyMeansAll ? 'Select All' : 'Clear Selections'}
              </button>
            )}
            
            {filteredOptions.length > 0 ? filteredOptions.map(opt => {
              const isSelected = isItemSelected(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelect(opt.id)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                    isSelected 
                      ? (isNightMode ? 'bg-brand-500/20 text-brand-400' : 'bg-brand-50 text-brand-700')
                      : (isNightMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-50 text-slate-700')
                  }`}
                >
                  <span className="truncate pr-2">{opt.name}</span>
                  {isSelected && <Check className="w-3 h-3 shrink-0" />}
                </button>
              );
            }) : (
              <div className={`py-4 text-center text-[9px] font-bold uppercase tracking-widest ${isNightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                No matches found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEK_DAYS = ['S','M','T','W','T','F','S'];

const DateRangePopup = ({
  isNightMode,
  startDate,
  endDate,
  onChange
}: {
  isNightMode: boolean;
  startDate: string;
  endDate: string;
  onChange: (range: { startDate: string; endDate: string }) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [selecting, setSelecting] = useState<'start' | 'end'>('start');
  const [localStart, setLocalStart] = useState(startDate);
  const [localEnd, setLocalEnd] = useState(endDate);
  const popupRef = useRef<HTMLDivElement>(null);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = startDate ? new Date(startDate + 'T00:00:00') : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  useEffect(() => { setLocalStart(startDate); }, [startDate]);
  useEffect(() => { setLocalEnd(endDate); }, [endDate]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fmt = (d: string) => {
    if (!d) return '—';
    const [y, m, day] = d.split('-');
    return `${m}/${day}/${y}`;
  };

  const toStr = (y: number, mo: number, d: number) =>
    `${y}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const handleDay = (dateStr: string) => {
    if (!localStart || (localStart && localEnd)) {
      setLocalStart(dateStr);
      setLocalEnd('');
      setSelecting('end');
    } else {
      const s = dateStr < localStart ? dateStr : localStart;
      const e = dateStr < localStart ? localStart : dateStr;
      setLocalEnd(e);
      setSelecting('start');
      onChange({ startDate: s, endDate: e });
      setIsOpen(false);
    }
  };

  const nextMonth = {
    year: viewMonth.month === 11 ? viewMonth.year + 1 : viewMonth.year,
    month: viewMonth.month === 11 ? 0 : viewMonth.month + 1
  };

  const prevMonth = () => setViewMonth(p => ({
    year: p.month === 0 ? p.year - 1 : p.year,
    month: p.month === 0 ? 11 : p.month - 1
  }));

  const fwdMonth = () => setViewMonth(p => ({
    year: p.month === 11 ? p.year + 1 : p.year,
    month: p.month === 11 ? 0 : p.month + 1
  }));

  const renderMonth = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return (
      <div className="flex-1 min-w-[140px]">
        <p className={`text-[9px] font-black uppercase tracking-widest text-center mb-3 ${isNightMode ? 'text-slate-400' : 'text-slate-500'}`}>
          {MONTHS[month]} {year}
        </p>
        <div className="grid grid-cols-7 gap-0.5 mb-1.5">
          {WEEK_DAYS.map((d, i) => (
            <span key={i} className={`text-center text-[8px] font-black ${isNightMode ? 'text-slate-600' : 'text-slate-300'}`}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = toStr(year, month, day);
            const isStart = dateStr === localStart;
            const isEnd = dateStr === localEnd;
            const effectiveEnd = localEnd || hoverDate || '';
            const inRange = localStart && effectiveEnd && dateStr > localStart && dateStr < effectiveEnd;
            return (
              <button
                key={day}
                onClick={() => handleDay(dateStr)}
                onMouseEnter={() => setHoverDate(dateStr)}
                onMouseLeave={() => setHoverDate(null)}
                className={`aspect-square flex items-center justify-center rounded-lg text-[9px] font-bold transition-all ${
                  isStart || isEnd
                    ? 'bg-brand-500 text-white shadow-sm scale-105'
                    : inRange
                    ? (isNightMode ? 'bg-brand-500/20 text-brand-400' : 'bg-brand-50 text-brand-700')
                    : (isNightMode ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-100 text-slate-700')
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const hasRange = startDate && endDate;

  return (
    <div className="relative" ref={popupRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
          hasRange
            ? (isNightMode ? 'bg-brand-500/20 border-brand-500/30 text-brand-400' : 'bg-brand-50 border-brand-200 text-brand-700')
            : (isNightMode ? 'bg-black/50 border-white/10 text-slate-400 hover:text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700')
        }`}
      >
        <Calendar className="w-3.5 h-3.5 shrink-0" />
        {hasRange ? (
          <span className="font-black">{fmt(startDate)} → {fmt(endDate)}</span>
        ) : (
          <span className="uppercase tracking-widest">Select Range</span>
        )}
        {hasRange && (
          <button
            onClick={e => { e.stopPropagation(); setLocalStart(''); setLocalEnd(''); onChange({ startDate: '', endDate: '' }); }}
            className="ml-1 opacity-50 hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </button>

      {isOpen && (
        <div className={`absolute top-full mt-2 right-0 z-[200] rounded-2xl shadow-2xl border p-5 animate-in fade-in zoom-in-95 duration-150 ${
          isNightMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-100'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className={`p-1.5 rounded-lg transition-colors ${isNightMode ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-400'}`}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${
              isNightMode ? 'bg-white/5 text-slate-400' : 'bg-slate-50 text-slate-500'
            }`}>
              {selecting === 'start' ? 'Pick start date' : 'Now pick end date'}
            </span>
            <button onClick={fwdMonth} className={`p-1.5 rounded-lg transition-colors ${isNightMode ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-400'}`}>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex gap-6">
            {renderMonth(viewMonth.year, viewMonth.month)}
            <div className={`w-px self-stretch ${isNightMode ? 'bg-white/5' : 'bg-slate-100'}`} />
            {renderMonth(nextMonth.year, nextMonth.month)}
          </div>

          {(localStart || localEnd) && (
            <div className={`mt-4 pt-3 border-t flex items-center justify-between gap-4 ${isNightMode ? 'border-white/5' : 'border-slate-50'}`}>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] px-2 py-1 rounded-lg font-black ${
                  isNightMode ? 'bg-white/5 text-brand-400' : 'bg-brand-50 text-brand-600'
                }`}>{localStart ? fmt(localStart) : '—'}</span>
                <ChevronRight className={`w-3 h-3 ${isNightMode ? 'text-slate-600' : 'text-slate-300'}`} />
                <span className={`text-[9px] px-2 py-1 rounded-lg font-black ${
                  localEnd
                    ? (isNightMode ? 'bg-white/5 text-brand-400' : 'bg-brand-50 text-brand-600')
                    : (isNightMode ? 'bg-white/5 text-slate-600 animate-pulse' : 'bg-slate-50 text-slate-400 animate-pulse')
                }`}>{localEnd ? fmt(localEnd) : '...'}</span>
              </div>
              {localStart && !localEnd && (
                <span className={`text-[8px] font-black uppercase tracking-widest animate-pulse ${isNightMode ? 'text-brand-500' : 'text-brand-400'}`}>Select end</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface LeaderboardControlsProps {
  isNightMode: boolean;
  mode: LeaderboardMode;
  setMode: (mode: LeaderboardMode) => void;
  timeframe: 'today' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  setTimeframe: (timeframe: 'today' | 'weekly' | 'monthly' | 'yearly' | 'custom') => void;
  dateRange: { startDate: string; endDate: string };
  setDateRange: (range: { startDate: string; endDate: string }) => void;
  availableTeams: { id: string; name: string }[];
  availableAgents: { id: string; name: string }[];
  availableSources: { id: string; name: string }[];
  availableAgencies: { id: string; name: string }[];
  selectedTeamsFilter: string[];
  setSelectedTeamsFilter: (teams: string[]) => void;
  selectedAgentsFilter: string[];
  setSelectedAgentsFilter: (agents: string[]) => void;
  selectedSourceFilter?: string;
  selectedSourceName?: string;
  setSelectedSourceFilter?: (sourceId: string | undefined) => void;
  selectedAgencyFilter?: string[];
  setSelectedAgencyFilter?: (agencyIds: string[]) => void;
}

export const LeaderboardControls: React.FC<LeaderboardControlsProps> = ({
  isNightMode,
  mode,
  setMode,
  timeframe,
  setTimeframe,
  dateRange,
  setDateRange,
  availableTeams,
  availableAgents,
  availableSources,
  availableAgencies,
  selectedTeamsFilter,
  setSelectedTeamsFilter,
  selectedAgentsFilter,
  setSelectedAgentsFilter,
  selectedSourceFilter,
  selectedSourceName,
  setSelectedSourceFilter,
  selectedAgencyFilter,
  setSelectedAgencyFilter
}) => {
  const toggleTeam = (id: string) => {
    if (selectedTeamsFilter.includes(id)) {
      setSelectedTeamsFilter(selectedTeamsFilter.filter(t => t !== id));
    } else {
      setSelectedTeamsFilter([...selectedTeamsFilter, id]);
    }
  };

  const toggleAgent = (id: string) => {
    if (selectedAgentsFilter.includes(id)) {
      setSelectedAgentsFilter(selectedAgentsFilter.filter(a => a !== id));
    } else {
      setSelectedAgentsFilter([...selectedAgentsFilter, id]);
    }
  };

  return (
    <div className={`relative z-[50] p-4 rounded-3xl shadow-sm mb-6 transition-colors border ${
      isNightMode ? 'bg-slate-900/60 border-white/5 backdrop-blur-md' : 'bg-white border-slate-100'
    }`}>
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`flex items-center p-1 rounded-[14px] border ${isNightMode ? 'bg-black/50 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
            {[
              { id: 'agent', label: 'Agents', icon: Users },
              { id: 'team', label: 'Teams', icon: UsersRound },
              { id: 'source', label: 'Sources', icon: Share2 },
              { id: 'trainer', label: 'Trainers', icon: GraduationCap }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => {
                  setMode(m.id as any);
                  if (m.id !== 'agent' && setSelectedSourceFilter) {
                     setSelectedSourceFilter(undefined);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  mode === m.id
                    ? (isNightMode ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-brand-600 shadow-sm')
                    : (isNightMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')
                }`}
              >
                <m.icon className="w-3.5 h-3.5" />
                {m.label}
              </button>
            ))}
          </div>

          {mode === 'agent' && (
            <div className="w-44">
              <FilterDropdown
                isNightMode={isNightMode}
                label="Compare Agents"
                icon={Search}
                options={availableAgents}
                selectedIds={selectedAgentsFilter}
                onChange={setSelectedAgentsFilter}
                placeholder="Search agents..."
              />
            </div>
          )}

          {mode === 'agent' && availableAgencies.length > 0 && (
            <div className="w-40">
              <FilterDropdown
                isNightMode={isNightMode}
                label="Agency"
                icon={Building2}
                options={availableAgencies}
                selectedIds={selectedAgencyFilter || []}
                onChange={ids => setSelectedAgencyFilter?.(ids)}
                emptyMeansAll
                placeholder="Search agencies..."
              />
            </div>
          )}
          
          {selectedSourceFilter && mode === 'agent' && (
             <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-widest ${
               isNightMode ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/20' : 'bg-indigo-50 text-indigo-600 border-indigo-100'
             }`}>
                <span>Source: {selectedSourceName || selectedSourceFilter}</span>
                <button onClick={() => setSelectedSourceFilter?.(undefined)} className="hover:text-indigo-800"><X className="w-3 h-3" /></button>
             </div>
          )}
        </div>

        <div className="flex items-center gap-2">
           <div className={`flex items-center p-1 rounded-lg border ${isNightMode ? 'bg-black/50 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
              {['today', 'weekly', 'monthly', 'yearly', 'custom'].map(t => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t as any)}
                  className={`px-3 py-1.5 rounded-[10px] text-[10px] font-bold uppercase tracking-wider transition-all ${
                    timeframe === t
                      ? (isNightMode ? 'bg-slate-700 text-white' : 'bg-white text-slate-900 shadow-sm')
                      : (isNightMode ? 'text-slate-500 hover:text-slate-400' : 'text-slate-400 hover:text-slate-600')
                  }`}
                >
                  {t}
                </button>
              ))}
           </div>
           
           {timeframe === 'custom' && (
             <div className="ml-2">
               <DateRangePopup
                 isNightMode={isNightMode}
                 startDate={dateRange.startDate}
                 endDate={dateRange.endDate}
                 onChange={range => setDateRange(range)}
               />
             </div>
           )}
        </div>
      </div>
    </div>
  );
};






