import React, { useEffect, useId, useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import './GlassDatePicker.css';

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseIso(iso: string): { y: number; m: number; d: number } | null {
  if (!iso || !ISO_RE.test(iso)) return null;
  const y = parseInt(iso.slice(0, 4), 10);
  const mo = parseInt(iso.slice(5, 7), 10);
  const d = parseInt(iso.slice(8, 10), 10);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return { y, m: mo - 1, d };
}

function toIso(y: number, monthIndex: number, day: number): string {
  const mm = String(monthIndex + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

function todayIsoLocal(): string {
  const t = new Date();
  return toIso(t.getFullYear(), t.getMonth(), t.getDate());
}

function clampIso(iso: string, min?: string, max?: string): string {
  let v = iso;
  if (min && v < min) v = min;
  if (max && v > max) v = max;
  return v;
}

function formatDisplay(iso: string): string {
  const p = parseIso(iso);
  if (!p) return '';
  const dt = new Date(p.y, p.m, p.d);
  return dt.toLocaleDateString(undefined, {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const MONTH_INDEXES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

/** Inclusive year range for dropdowns from optional ISO min/max. */
function yearSpan(min?: string, max?: string): { start: number; end: number } {
  const cy = new Date().getFullYear();
  const minP = min ? parseIso(min) : null;
  const maxP = max ? parseIso(max) : null;

  let start: number;
  let end: number;

  if (minP && maxP) {
    start = minP.y;
    end = maxP.y;
  } else if (maxP && !minP) {
    end = maxP.y;
    start = end - 120;
  } else if (minP && !maxP) {
    start = minP.y;
    end = Math.max(cy + 30, start + 100);
  } else {
    start = cy - 120;
    end = cy + 30;
  }

  if (start > end) {
    return { start: end, end: start };
  }
  return { start, end };
}

function yearsDescending(min?: string, max?: string): number[] {
  const { start, end } = yearSpan(min, max);
  const list: number[] = [];
  for (let y = end; y >= start; y--) list.push(y);
  return list;
}

export interface GlassDateInputProps {
  value: string;
  onChange: (iso: string) => void;
  max?: string;
  min?: string;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
  'aria-describedby'?: string;
}

interface ModalProps {
  value: string;
  max?: string;
  min?: string;
  onClose: () => void;
  onSelect: (iso: string) => void;
}

const GlassDatePickerModal: React.FC<ModalProps> = ({
  value,
  max,
  min,
  onClose,
  onSelect,
}) => {
  const initialCursor = (): { y: number; m: number } => {
    const fromVal = value && parseIso(value);
    if (fromVal) return { y: fromVal.y, m: fromVal.m };
    const ref = max ? parseIso(max) : null;
    if (ref) return { y: ref.y, m: ref.m };
    const t = new Date();
    return { y: t.getFullYear(), m: t.getMonth() };
  };

  const [cursor, setCursor] = useState(initialCursor);
  const jumpIds = useId();

  const yearList = useMemo(() => yearsDescending(min, max), [min, max]);

  useLayoutEffect(() => {
    const span = yearSpan(min, max);
    setCursor((c) => ({
      y: Math.min(span.end, Math.max(span.start, c.y)),
      m: c.m,
    }));
  }, [min, max]);

  const lastOfPrevMonthIso = useMemo(() => {
    const last = new Date(cursor.y, cursor.m, 0);
    return toIso(last.getFullYear(), last.getMonth(), last.getDate());
  }, [cursor.y, cursor.m]);

  const firstOfNextMonthIso = useMemo(() => {
    const first = new Date(cursor.y, cursor.m + 1, 1);
    return toIso(first.getFullYear(), first.getMonth(), 1);
  }, [cursor.y, cursor.m]);

  const canPrev = !min || lastOfPrevMonthIso >= min;
  const canNext = !max || firstOfNextMonthIso <= max;

  const grid = useMemo(() => {
    const firstDow = new Date(cursor.y, cursor.m, 1).getDay();
    const dim = daysInMonth(cursor.y, cursor.m);
    const cells: ({ day: number } | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= dim; d++) cells.push({ day: d });
    return cells;
  }, [cursor.y, cursor.m]);

  const isDisabledDay = (day: number): boolean => {
    const iso = toIso(cursor.y, cursor.m, day);
    if (min && iso < min) return true;
    if (max && iso > max) return true;
    return false;
  };

  const today = todayIsoLocal();
  const showToday =
    (!min || today >= min) && (!max || today <= max);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const pickDay = (day: number) => {
    if (isDisabledDay(day)) return;
    const iso = clampIso(toIso(cursor.y, cursor.m, day), min, max);
    onSelect(iso);
  };

  const goToday = () => {
    if (!showToday) return;
    const t = parseIso(today)!;
    setCursor({ y: t.y, m: t.m });
    onSelect(clampIso(today, min, max));
  };

  return (
    <div
      className="glass-date-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass-date-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="glass-date-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="glass-date-modal__accent" aria-hidden />
        <div className="glass-date-modal__head">
          <h2 id="glass-date-title" className="glass-date-modal__title">
            Select date
          </h2>
          <button
            type="button"
            className="glass-date-modal__icon-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <i className="fas fa-times" aria-hidden />
          </button>
        </div>

        <div className="glass-date-jump" role="group" aria-label="Month and year">
          <label
            className="glass-date-sr-only"
            htmlFor={`${jumpIds}-month`}
          >
            Month
          </label>
          <select
            id={`${jumpIds}-month`}
            className="glass-date-jump__select glass-date-jump__select--month"
            value={cursor.m}
            onChange={(e) => {
                const m = Number(e.target.value);
                setCursor((c) => ({ y: c.y, m }));
              }}
            aria-label="Month"
          >
            {MONTH_INDEXES.map((mi) => (
              <option key={mi} value={mi}>
                {new Date(2000, mi, 1).toLocaleString(undefined, { month: 'long' })}
              </option>
            ))}
          </select>
          <label
            className="glass-date-sr-only"
            htmlFor={`${jumpIds}-year`}
          >
            Year
          </label>
          <select
            id={`${jumpIds}-year`}
            className="glass-date-jump__select glass-date-jump__select--year"
            value={cursor.y}
            onChange={(e) => {
                const y = Number(e.target.value);
                setCursor((c) => ({ y, m: c.m }));
              }}
            aria-label="Year"
          >
            {yearList.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="glass-date-nav">
          <button
            type="button"
            className="glass-date-nav__arrow"
            onClick={() => {
              if (!canPrev) return;
              setCursor((c) => {
                const n = new Date(c.y, c.m - 1, 15);
                return { y: n.getFullYear(), m: n.getMonth() };
              });
            }}
            disabled={!canPrev}
            aria-label="Previous month"
          >
            <i className="fas fa-chevron-left" aria-hidden />
          </button>
          <span className="glass-date-nav__hint">Or step by month</span>
          <button
            type="button"
            className="glass-date-nav__arrow"
            onClick={() => {
              if (!canNext) return;
              setCursor((c) => {
                const n = new Date(c.y, c.m + 1, 15);
                return { y: n.getFullYear(), m: n.getMonth() };
              });
            }}
            disabled={!canNext}
            aria-label="Next month"
          >
            <i className="fas fa-chevron-right" aria-hidden />
          </button>
        </div>

        <div className="glass-date-weekdays" aria-hidden>
          {WEEKDAYS.map((d) => (
            <span key={d} className="glass-date-weekdays__d">
              {d}
            </span>
          ))}
        </div>

        <div className="glass-date-grid">
          {grid.map((cell, idx) =>
            cell ? (
              <button
                key={idx}
                type="button"
                className={`glass-date-cell${value === toIso(cursor.y, cursor.m, cell.day) ? ' glass-date-cell--selected' : ''}${isDisabledDay(cell.day) ? ' glass-date-cell--muted' : ''}`}
                onClick={() => pickDay(cell.day)}
                disabled={isDisabledDay(cell.day)}
              >
                {cell.day}
              </button>
            ) : (
              <span key={idx} className="glass-date-cell glass-date-cell--empty" />
            ),
          )}
        </div>

        <div className="glass-date-modal__footer">
          {showToday && (
            <button type="button" className="glass-date-btn glass-date-btn--ghost" onClick={goToday}>
              Today
            </button>
          )}
          <button type="button" className="glass-date-btn glass-date-btn--secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

/** Read-only field + glass calendar modal; value/onChange use `YYYY-MM-DD`. */
export const GlassDateInput: React.FC<GlassDateInputProps> = ({
  value,
  onChange,
  max,
  min,
  disabled,
  placeholder = 'Select date',
  id,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}) => {
  const [open, setOpen] = useState(false);
  const display = useMemo(() => formatDisplay(value), [value]);

  const openModal = () => {
    if (!disabled) setOpen(true);
  };

  return (
    <>
      <div
        className={`glass-date-field${disabled ? ' glass-date-field--disabled' : ''}`}
      >
        <input
          id={id}
          type="text"
          readOnly
          className="glass-date-field__input"
          value={display}
          placeholder={placeholder}
          onClick={openModal}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openModal();
            }
          }}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          disabled={disabled}
        />
        <button
          type="button"
          className="glass-date-field__calendar-btn"
          onClick={openModal}
          disabled={disabled}
          tabIndex={-1}
          aria-label="Open calendar"
        >
          <i className="fas fa-calendar-alt" aria-hidden />
        </button>
      </div>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <GlassDatePickerModal
            value={value}
            max={max}
            min={min}
            onClose={() => setOpen(false)}
            onSelect={(iso) => {
              onChange(iso);
              setOpen(false);
            }}
          />,
          document.body,
        )}
    </>
  );
};
