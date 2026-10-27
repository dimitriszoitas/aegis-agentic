import { componentToken } from '@/lib/component-design-tokens';
import { forwardRef, useEffect, useRef, useState, type ReactNode } from 'react';
import { Search } from '@/components/icon';
import { TextInput, type TextInputProps } from '@/components/text-input';
import './search-input.css';

export interface SearchInputProps extends Omit<TextInputProps, 'type' | 'prefix' | 'suffix'> {
  onSearch?: (query: string) => void;
  debounceMs?: number;
  shortcut?: ReactNode;
}

/** Search changes are emitted only after the user pauses; superseded work is canceled. */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  {
    value,
    defaultValue = '',
    onValueChange,
    onSearch,
    debounceMs = 250,
    shortcut,
    clearable = true,
    clearLabel = 'Clear search',
    ...props
  },
  ref,
) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const query = value ?? uncontrolledValue;
  const callback = useRef(onSearch);
  const lastEmitted = useRef(query);
  useEffect(() => {
    callback.current = onSearch;
  }, [onSearch]);
  useEffect(() => {
    if (query === lastEmitted.current) return;
    const timer = window.setTimeout(
      () => {
        lastEmitted.current = query;
        callback.current?.(query);
      },
      Math.max(0, debounceMs),
    );
    return () => window.clearTimeout(timer);
  }, [query, debounceMs]);

  return (
    <TextInput
      {...props}
      ref={ref}
      type="search"
      value={query}
      clearable={clearable}
      clearLabel={clearLabel}
      prefix={<Search size={componentToken('input.icon-md')} aria-hidden="true" />}
      suffix={shortcut ? <kbd className="aegis-search-shortcut">{shortcut}</kbd> : undefined}
      onValueChange={(next) => {
        if (value === undefined) setUncontrolledValue(next);
        onValueChange?.(next);
      }}
    />
  );
});
