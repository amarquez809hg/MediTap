import React, { useId } from 'react';
import './AppointmentPresetField.css';

const PICKER_PLACEHOLDER = 'Quick pick from library…';

export type AppointmentPresetFieldProps = {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  disabled?: boolean;
  multiline?: boolean;
  inputPlaceholder?: string;
  className?: string;
};

const AppointmentPresetField: React.FC<AppointmentPresetFieldProps> = ({
  label,
  value,
  options,
  onChange,
  disabled = false,
  multiline = false,
  inputPlaceholder,
  className,
}) => {
  const pickerId = useId();
  const pickerValue = options.includes(value as (typeof options)[number]) ? value : '';

  const handlePickerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    if (next) onChange(next);
  };

  return (
    <div
      className={['form-field', 'appointment-preset-field', className]
        .filter(Boolean)
        .join(' ')}
    >
      <label htmlFor={pickerId}>{label}</label>
      <select
        id={pickerId}
        className="appointment-preset-field__picker"
        value={pickerValue}
        onChange={handlePickerChange}
        disabled={disabled}
        aria-label={`${label} — quick pick`}
      >
        <option value="">{PICKER_PLACEHOLDER}</option>
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
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={inputPlaceholder}
        />
      )}
    </div>
  );
};

export default AppointmentPresetField;
