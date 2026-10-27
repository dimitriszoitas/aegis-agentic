import { componentToken, useComponentTokenNumbers } from '@/lib/component-design-tokens';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Combobox } from '@base-ui/react/combobox';
import { Check, ChevronDown, Search } from '@/components/icon';
import { cn } from '@/lib/utils';
import { useFieldControl, type FieldControlProps } from '@/components/field';
import { Tag } from '@/components/tag';
import { Spinner } from '@/components/spinner';
import type { SelectOption } from '@/components/select';
import './multi-combobox.css';

export interface MultiComboboxOption extends SelectOption {
  keywords?: readonly string[];
}

export interface MultiComboboxProps extends FieldControlProps {
  size?: 'sm' | 'md' | 'lg';
  options: readonly MultiComboboxOption[];
  value?: readonly string[];
  defaultValue?: readonly string[];
  onValueChange?: (value: string[]) => void;
  label?: ReactNode;
  'aria-label'?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  search?: string;
  onSearchChange?: (search: string) => void;
  /** Disable local filtering when results are supplied by a remote search. */
  filterOptions?: boolean;
  maxVisible?: number;
  loading?: boolean;
  loadingLabel?: string;
  emptyLabel?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  name?: string;
  className?: string;
}

/** Searchable multiple selection using Base UI keyboard, popup and selection semantics. */
export function MultiCombobox({
  size = 'md',
  options,
  value,
  defaultValue = [],
  onValueChange,
  label,
  'aria-label': ariaLabel,
  placeholder = 'Choose sources',
  searchPlaceholder = 'Search sources',
  search,
  onSearchChange,
  filterOptions = true,
  maxVisible = 3,
  loading = false,
  loadingLabel = 'Loading available sources',
  emptyLabel = 'No matching sources',
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  name,
  className,
  id,
  disabled,
  required,
  invalid,
  'aria-describedby': describedBy,
  'aria-labelledby': labelledBy,
  'aria-invalid': ariaInvalid,
}: MultiComboboxProps) {
  const tokens = useComponentTokenNumbers(['picker-offset', 'input.overlay-collision-padding']);
  const [internalValue, setInternalValue] = useState<readonly string[]>(defaultValue);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [internalSearch, setInternalSearch] = useState('');
  const localId = useId();
  const labelId = `aegis-multi-label-${localId}`;
  const summaryId = `aegis-multi-summary-${localId}`;
  const popupId = `aegis-multi-popup-${localId}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const focusFrame = useRef<number | undefined>(undefined);
  const selected = value ?? internalValue;
  const open = controlledOpen ?? internalOpen;
  const query = search ?? internalSearch;
  const control = useFieldControl({
    id,
    disabled,
    required,
    invalid,
    'aria-labelledby': labelledBy ?? (label ? labelId : undefined),
    'aria-describedby': describedBy,
    'aria-invalid': ariaInvalid,
  });
  const selectedSet = new Set(selected);
  const filtered = options.filter(
    (option) =>
      !filterOptions ||
      [option.label, option.description, ...(option.keywords ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
  );
  const enabled = filtered.filter((option) => !option.disabled);
  const groups = [...new Set(filtered.map((option) => option.group ?? ''))];
  const limit = Math.max(0, Math.floor(maxVisible));
  const shown = selected.slice(0, limit);
  const hidden = selected.slice(limit);
  const nameFor = (selectedValue: string) =>
    options.find((option) => option.value === selectedValue)?.label ?? selectedValue;
  useEffect(
    () => () => {
      if (focusFrame.current !== undefined) cancelAnimationFrame(focusFrame.current);
    },
    [],
  );

  function updateSelection(next: readonly string[]) {
    const deduplicated = [...new Set(next)];
    if (value === undefined) setInternalValue(deduplicated);
    onValueChange?.(deduplicated);
  }
  function removeChip(selectedValue: string) {
    const index = shown.indexOf(selectedValue);
    const previousFocus = shellRef.current?.ownerDocument.activeElement;
    updateSelection(selected.filter((item) => item !== selectedValue));
    if (focusFrame.current !== undefined) cancelAnimationFrame(focusFrame.current);
    focusFrame.current = requestAnimationFrame(() => {
      const shell = shellRef.current;
      if (!shell) return;
      const currentFocus = shell.ownerDocument.activeElement;
      if (currentFocus !== shell.ownerDocument.body && currentFocus !== previousFocus) return;
      const chips = shell.querySelectorAll<HTMLButtonElement>('button.tag-remove:not(:disabled)');
      const target = chips[Math.min(Math.max(0, index), chips.length - 1)] ?? triggerRef.current;
      target?.focus();
    });
  }
  function updateSearch(next: string) {
    if (search === undefined) setInternalSearch(next);
    onSearchChange?.(next);
  }
  function updateOpen(next: boolean) {
    if (control.disabled) return;
    if (controlledOpen === undefined) setInternalOpen(next);
    onOpenChange?.(next);
    if (!next) updateSearch('');
  }

  return (
    <div className={cn('aegis-multi-field', className)}>
      {label && (
        <label id={labelId} htmlFor={control.id} className="aegis-field-label">
          {label}
        </label>
      )}
      <Combobox.Root<string, true>
        multiple
        items={options.map((option) => option.value)}
        filteredItems={filtered.map((option) => option.value)}
        filter={null}
        value={selected}
        onValueChange={updateSelection}
        inputValue={query}
        onInputValueChange={(next, details) => {
          if (details.reason === 'input-clear' && details.isItemPress) return;
          updateSearch(next);
        }}
        itemToStringLabel={nameFor}
        open={open && !control.disabled}
        onOpenChange={updateOpen}
        disabled={control.disabled}
        required={control.required}
        name={name}
        id={control.id}
        autoHighlight
      >
        <div
          ref={shellRef}
          className="aegis-multi-shell"
          data-size={size}
          data-disabled={control.disabled || undefined}
          data-invalid={
            control['aria-invalid'] === true || control['aria-invalid'] === 'true' || undefined
          }
        >
          {shown.map((selectedValue) => (
            <Tag
              key={selectedValue}
              size="sm"
              variant="removable"
              disabled={control.disabled}
              removeLabel={`Remove ${nameFor(selectedValue)}`}
              onRemove={() => removeChip(selectedValue)}
            >
              {nameFor(selectedValue)}
            </Tag>
          ))}
          {hidden.length > 0 && (
            <span
              className="aegis-multi-overflow"
              title={hidden.map(nameFor).join(', ')}
              aria-label={`${hidden.length} more selected: ${hidden.map(nameFor).join(', ')}`}
            >
              +{hidden.length}
            </span>
          )}
          <Combobox.Trigger
            ref={triggerRef}
            id={control.id}
            aria-label={control['aria-labelledby'] ? undefined : (ariaLabel ?? 'Select sources')}
            aria-labelledby={control['aria-labelledby']}
            aria-describedby={[control['aria-describedby'], summaryId].filter(Boolean).join(' ')}
            aria-required={control.required}
            aria-invalid={control['aria-invalid']}
            className="aegis-multi-trigger"
          >
            {!selected.length && <span className="aegis-multi-placeholder">{placeholder}</span>}
            {selected.length > 0 && <span className="sr-only">Edit selection</span>}
            <ChevronDown size={componentToken('input.icon-md')} aria-hidden="true" />
          </Combobox.Trigger>
        </div>
        <span id={summaryId} className="sr-only" aria-live="polite">
          {selected.length} selected
        </span>
        <Combobox.Portal>
          <Combobox.Positioner
            className="aegis-multi-positioner"
            anchor={shellRef}
            sideOffset={tokens['picker-offset']}
            collisionPadding={tokens['input.overlay-collision-padding']}
            align="start"
          >
            <Combobox.Popup
              id={popupId}
              className="aegis-multi-popover"
              aria-label={ariaLabel ?? (typeof label === 'string' ? label : 'Choose sources')}
              initialFocus={inputRef}
              finalFocus={triggerRef}
            >
              <div className="aegis-multi-search">
                <Search size={componentToken('input.icon-md')} aria-hidden="true" />
                <Combobox.Input
                  ref={inputRef}
                  aria-label={searchPlaceholder}
                  placeholder={searchPlaceholder}
                  autoComplete="off"
                  onKeyDown={(event) => {
                    if (
                      event.key === 'Backspace' &&
                      !query &&
                      selected.length &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      updateSelection(selected.slice(0, -1));
                    }
                  }}
                />
              </div>
              <div className="aegis-multi-toolbar">
                <button
                  type="button"
                  disabled={loading || !enabled.length}
                  onClick={() =>
                    updateSelection([...selected, ...enabled.map((option) => option.value)])
                  }
                >
                  Select all{query ? ' matches' : ''}
                </button>
                <button
                  type="button"
                  disabled={!selected.length}
                  onClick={() => updateSelection([])}
                >
                  Clear
                </button>
                <span>{selected.length} selected</span>
              </div>
              {loading && (
                <div className="aegis-multi-message" role="status">
                  <Spinner size="sm" />
                  {loadingLabel}
                </div>
              )}
              <Combobox.List
                className="aegis-multi-list"
                aria-label="Available sources"
                aria-busy={loading}
              >
                {groups.map((group) => (
                  <Combobox.Group key={group}>
                    {group && (
                      <Combobox.GroupLabel className="aegis-multi-group-label">
                        {group}
                      </Combobox.GroupLabel>
                    )}
                    {filtered
                      .filter((option) => (option.group ?? '') === group)
                      .map((option) => (
                        <Combobox.Item
                          key={option.value}
                          value={option.value}
                          disabled={option.disabled || loading}
                          className="aegis-multi-option"
                          render={(props, state) => (
                            <div {...props} data-active={state.highlighted || undefined} />
                          )}
                        >
                          <span
                            className="aegis-multi-check"
                            data-checked={selectedSet.has(option.value) || undefined}
                            aria-hidden="true"
                          >
                            <Combobox.ItemIndicator>
                              <Check size={componentToken('input.icon-compact')} />
                            </Combobox.ItemIndicator>
                          </span>
                          {option.icon && (
                            <span className="aegis-multi-icon" aria-hidden="true">
                              {option.icon}
                            </span>
                          )}
                          <span className="aegis-multi-option-copy">
                            <span>{option.label}</span>
                            {option.description && (
                              <span className="aegis-multi-description">{option.description}</span>
                            )}
                          </span>
                        </Combobox.Item>
                      ))}
                  </Combobox.Group>
                ))}
              </Combobox.List>
              {!loading && !filtered.length && (
                <div className="aegis-multi-message" role="status">
                  {emptyLabel}
                </div>
              )}
              <div className="aegis-multi-footer">↑↓ navigate · Enter toggles · Esc closes</div>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    </div>
  );
}
