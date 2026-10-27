import React from 'react';
import { Select } from 'storybook/internal/components';
import { layoutThemeOptions, type LayoutTheme } from '../src/lib/layout-theme';

const options = layoutThemeOptions.map(({ value, label }) => ({
  value,
  title: label,
  children: (
    <span className="aegis-manager-theme-option">
      <span>{label}</span>
      <svg className="aegis-manager-theme-check" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    </span>
  ),
}));

/** Use the manager's custom Select: it shares Storybook's isolated React runtime
 * and themed portal. Form.Select would restore the browser-native popup. */
export function ManagerThemeSelect({
  value,
  onValueChange,
}: {
  value: LayoutTheme;
  onValueChange: (value: LayoutTheme) => void;
}) {
  return (
    <div className="aegis-manager-theme-label">
      <span aria-hidden="true">Theme</span>
      <Select
        ariaLabel="Theme"
        className="aegis-manager-theme-trigger"
        options={options}
        defaultOptions={value}
        onSelect={(next) => {
          if (next === 'fundamental' || next === 'fundamental-floating') onValueChange(next);
        }}
        showSelectedOptionTitle={false}
        padding="none"
      >
        <span className="aegis-manager-theme-value">
          {layoutThemeOptions.find((option) => option.value === value)?.label}
        </span>
        <svg
          className="aegis-manager-theme-chevron"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </Select>
    </div>
  );
}
