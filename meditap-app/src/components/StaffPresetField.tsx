import React, { useId } from 'react';
import './StaffPresetField.css';

export const QUICK_PICK_PLACEHOLDER = 'Quick pick from library…';

export type StaffPresetFieldProps = {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  /** When set, choosing a library row calls this instead of onChange (e.g. fill multiple fields). */
  onLibraryPick?: (value: string) => void;
  disabled?: boolean;
  multiline?: boolean;
  inputPlaceholder?: string;
  className?: string;
  inputType?: 'text' | 'number';
};

const StaffPresetField: React.FC<StaffPresetFieldProps> = ({
  label,
  value,
  options,
  onChange,
  onLibraryPick,
  disabled = false,
  multiline = false,
  inputPlaceholder,
  className,
  inputType = 'text',
}) => {
  const pickerId = useId();
  const pickerValue = options.includes(value as (typeof options)[number]) ? value : '';

  const handlePickerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    if (!next) return;
    if (onLibraryPick) onLibraryPick(next);
    else onChange(next);
  };

  return (
    <div
      className={['form-field', 'staff-preset-field', className].filter(Boolean).join(' ')}
    >
      <label htmlFor={pickerId}>{label}</label>
      <select
        id={pickerId}
        className="staff-preset-field__picker"
        value={pickerValue}
        onChange={handlePickerChange}
        disabled={disabled}
        aria-label={`${label} — quick pick`}
      >
        <option value="">{QUICK_PICK_PLACEHOLDER}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={inputPlaceholder}
          rows={3}
        />
      ) : (
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={inputPlaceholder}
        />
      )}
    </div>
  );
};

export default StaffPresetField;
