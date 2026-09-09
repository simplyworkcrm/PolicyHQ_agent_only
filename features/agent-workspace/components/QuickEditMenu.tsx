import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';

interface QuickEditOption { value: string; label: string; tone?: string; dot?: string; }

export const QuickEditMenu: React.FC<{
  ariaLabel: string;
  value: string;
  placeholder: string;
  options: QuickEditOption[];
  disabled?: boolean;
  title?: string;
  triggerTone?: string;
  showDots?: boolean;
  searchable?: boolean;
  multiple?: boolean;
  fullWidth?: boolean;
  values?: string[];
  onValuesChange?: (values: string[]) => void;
  onChange?: (value: string) => void;
}> = ({ ariaLabel, value, placeholder, options, disabled, title, triggerTone = 'bg-white text-slate-700 ring-slate-200', showDots = true, searchable = false, multiple = false, fullWidth = false, values = [], onValuesChange, onChange }) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0, width: 190, maxHeight: 300 });
  const anchorRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedValues = multiple ? values : value ? [value] : [];
  const selected = options.find(option => option.value === selectedValues[0]);
  const triggerLabel = selectedValues.length > 1 ? `${selectedValues.length} selected` : selected?.label || placeholder;
  const visibleOptions = searchable && searchQuery.trim()
    ? options.filter(option => option.label.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : options;

  const openMenu = () => {
    if (disabled || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const width = Math.max(190, rect.width);
    const estimatedHeight = Math.min(340, options.length * 42 + (searchable ? 62 : 12));
    const roomBelow = window.innerHeight - rect.bottom - 12;
    const opensAbove = roomBelow < estimatedHeight && rect.top > roomBelow;
    setPosition({
      top: opensAbove ? Math.max(10, rect.top - estimatedHeight - 7) : rect.bottom + 7,
      left: Math.min(rect.left, window.innerWidth - width - 12),
      width,
      maxHeight: Math.max(120, opensAbove ? rect.top - 18 : roomBelow),
    });
    setSearchQuery('');
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const closeForOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!anchorRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const closeForEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        anchorRef.current?.focus();
      }
    };
    const closeForResize = () => setOpen(false);
    const closeForOutsideScroll = (event: Event) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeForOutsideClick);
    document.addEventListener('keydown', closeForEscape);
    window.addEventListener('resize', closeForResize);
    window.addEventListener('scroll', closeForOutsideScroll, true);
    return () => {
      document.removeEventListener('pointerdown', closeForOutsideClick);
      document.removeEventListener('keydown', closeForEscape);
      window.removeEventListener('resize', closeForResize);
      window.removeEventListener('scroll', closeForOutsideScroll, true);
    };
  }, [open]);

  return <>
    <button ref={anchorRef} type="button" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} disabled={disabled} title={title} onClick={event => { event.stopPropagation(); open ? setOpen(false) : openMenu(); }} onKeyDown={event => event.stopPropagation()} className={`inline-flex min-h-8 w-full min-w-[96px] items-center justify-between gap-2 rounded-full px-3 py-1.5 text-left text-[10px] font-black ring-1 transition duration-200 hover:-translate-y-px hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:ring-slate-100 disabled:hover:translate-y-0 disabled:hover:shadow-none ${fullWidth ? 'max-w-none' : 'max-w-[165px]'} ${triggerTone}`}>
      <span className="flex min-w-0 items-center gap-2">{showDots && <span className={`h-2 w-2 shrink-0 rounded-full ${selected?.dot || 'bg-slate-400'}`} />}<span className="truncate">{triggerLabel}</span></span><ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && createPortal(<div ref={menuRef} role="listbox" aria-multiselectable={multiple} aria-label={ariaLabel} style={{ position: 'fixed', top: position.top, left: position.left, width: position.width, maxHeight: position.maxHeight }} onClick={event => event.stopPropagation()} className="z-[10010] overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-2xl shadow-slate-900/15 backdrop-blur-xl motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-150">
      {(searchable || (multiple && selectedValues.length > 0)) && <div className="sticky top-0 z-10 mb-1 space-y-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
        {searchable && <label className="flex items-center gap-2 rounded-lg px-2 py-1.5"><Search className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="sr-only">Search {ariaLabel}</span><input autoFocus value={searchQuery} onChange={event => setSearchQuery(event.target.value)} onKeyDown={event => event.stopPropagation()} placeholder="Search options…" className="min-w-0 flex-1 bg-transparent text-[10px] font-bold text-slate-800 outline-none placeholder:text-slate-400" /></label>}
        {multiple && selectedValues.length > 0 && <button type="button" onClick={() => onValuesChange?.([])} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-50 px-2 py-2 text-[9px] font-black text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"><X className="h-3 w-3" />Clear this filter</button>}
      </div>}
      {visibleOptions.map(option => {
        const optionSelected = selectedValues.includes(option.value);
        return <button key={option.value} type="button" role="option" aria-selected={optionSelected} onClick={() => {
          if (multiple) {
            onValuesChange?.(optionSelected ? selectedValues.filter(item => item !== option.value) : [...selectedValues, option.value]);
          } else {
            setOpen(false);
            if (option.value !== value) onChange?.(option.value);
          }
        }} className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-[10px] font-black transition hover:translate-x-0.5 ${optionSelected ? option.tone || 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}><span className="flex min-w-0 items-center gap-2.5">{showDots && <span className={`h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-white ${option.dot || 'bg-slate-400'}`} />}<span className="truncate">{option.label}</span></span>{optionSelected && <Check className="h-3.5 w-3.5 shrink-0" />}</button>;
      })}
      {!visibleOptions.length && <div className="px-3 py-6 text-center text-[10px] font-bold text-slate-400">No options found</div>}
    </div>, document.body)}
  </>;
};
