import {
  forwardRef,
  useId,
  useMemo,
  useRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react';
import { Combobox as Primitive } from '@base-ui/react/combobox';
import { useFieldControl, type FieldControlProps } from '@/components/field';
import { IconButton } from '@/components/icon-button';
import { ChevronDown, X } from '@/components/icon';
import { useComponentTokenNumbers } from '@/lib/component-design-tokens';
import { cn } from '@/lib/utils';
import './combobox.css';

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  keywords?: readonly string[];
}
export interface ComboboxProps extends FieldControlProps {
  options: readonly ComboboxOption[];
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: Primitive.Root.Props<string>['onValueChange'];
  /** Search text is separate from the selected form value. */
  inputValue?: string;
  defaultInputValue?: string;
  onInputValueChange?: Primitive.Root.Props<string>['onInputValueChange'];
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: Primitive.Root.Props<string>['onOpenChange'];
  onOpenChangeComplete?: Primitive.Root.Props<string>['onOpenChangeComplete'];
  label?: ReactNode;
  'aria-label'?: string;
  placeholder?: string;
  name?: string;
  form?: string;
  autoComplete?: string;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  /** Disable local matching when options already contain host-filtered remote results. */
  filterOptions?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  emptyLabel?: string;
  /** Label fallback when a selected remote ID is absent from the current results. */
  selectedLabel?: string;
  clearable?: boolean;
  clearLabel?: string;
  toggleLabel?: string;
  className?: string;
  inputProps?: Omit<
    ComponentPropsWithoutRef<typeof Primitive.Input>,
    'value' | 'defaultValue' | 'disabled' | 'readOnly' | 'id' | 'name' | 'size'
  >;
}

/** Single selection with Base UI combobox behavior; typed queries never become selected IDs by themselves. */
export const Combobox = forwardRef<HTMLInputElement, ComboboxProps>(function Combobox(
  {
    options,
    label,
    size = 'md',
    filterOptions = true,
    loading = false,
    loadingLabel = 'Loading options',
    emptyLabel = 'No matching options',
    selectedLabel,
    clearable = true,
    clearLabel = 'Clear selection',
    toggleLabel = 'Show options',
    className,
    inputProps,
    placeholder,
    'aria-label': ariaLabel,
    id,
    required,
    disabled,
    invalid,
    'aria-labelledby': labelledBy,
    'aria-describedby': describedBy,
    'aria-invalid': ariaInvalid,
    ...rootProps
  },
  ref,
) {
  const labelId = `aegis-combobox-label-${useId()}`;
  const anchor = useRef<HTMLDivElement>(null);
  const control = useFieldControl({
    id,
    required,
    disabled,
    invalid,
    'aria-labelledby': labelledBy ?? (label ? labelId : undefined),
    'aria-describedby': describedBy,
    'aria-invalid': ariaInvalid,
  });
  const tokens = useComponentTokenNumbers(['picker-offset', 'input.overlay-collision-padding']);
  // Base UI treats a new items identity as a data reload and may restore the selected label.
  // An unrelated host rerender must not turn this derived array into a false reload.
  const items = useMemo(() => options.map((option) => option.value), [options]);
  const optionMap = new Map(options.map((option) => [option.value, option]));
  if (optionMap.size !== options.length || options.some((option) => !option.value))
    throw new TypeError('Combobox options require unique nonempty values.');
  const nameFor = (item: string) => optionMap.get(item)?.label ?? selectedLabel ?? item;
  return (
    <div className={cn('aegis-combobox', className)} data-size={size}>
      {label && (
        <label id={labelId} htmlFor={control.id} className="aegis-field-label">
          {label}
        </label>
      )}
      <Primitive.Root<string>
        {...rootProps}
        id={control.id}
        disabled={control.disabled}
        required={control.required}
        items={items}
        itemToStringLabel={nameFor}
        itemToStringValue={(item) => item}
        filter={
          filterOptions
            ? (item, query) => {
                const option = optionMap.get(item);
                return [option?.label, option?.description, ...(option?.keywords ?? [])]
                  .filter(Boolean)
                  .join(' ')
                  .toLocaleLowerCase()
                  .includes(query.trim().toLocaleLowerCase());
              }
            : null
        }
      >
        <div className="aegis-combobox-row" ref={anchor}>
          <Primitive.Input
            {...inputProps}
            ref={ref}
            className={cn('aegis-combobox-input', inputProps?.className)}
            id={control.id}
            placeholder={placeholder}
            aria-label={ariaLabel}
            aria-labelledby={control['aria-labelledby']}
            aria-describedby={control['aria-describedby']}
            aria-invalid={control['aria-invalid']}
            aria-busy={loading}
          />
          {clearable && !rootProps.readOnly && (
            <Primitive.Clear
              render={
                <IconButton aria-label={clearLabel} tooltip={false} size={size} emphasis="ghost">
                  <X />
                </IconButton>
              }
            />
          )}
          <Primitive.Trigger
            render={
              <IconButton aria-label={toggleLabel} tooltip={false} size={size} emphasis="ghost">
                <ChevronDown />
              </IconButton>
            }
          />
        </div>
        <Primitive.Portal>
          <Primitive.Positioner
            className="aegis-combobox-positioner"
            anchor={anchor}
            align="start"
            sideOffset={tokens['picker-offset']}
            collisionPadding={tokens['input.overlay-collision-padding']}
          >
            <Primitive.Popup className="aegis-combobox-popup">
              {loading && (
                <div className="aegis-combobox-message" role="status">
                  {loadingLabel}
                </div>
              )}
              <Primitive.List className="aegis-combobox-list" aria-busy={loading}>
                {(item: string) => {
                  const option = optionMap.get(item);
                  return (
                    <Primitive.Item
                      key={item}
                      value={item}
                      disabled={loading || option?.disabled}
                      className="aegis-combobox-option"
                    >
                      <span>{option?.label ?? item}</span>
                      {option?.description && (
                        <span className="aegis-combobox-description">{option.description}</span>
                      )}
                    </Primitive.Item>
                  );
                }}
              </Primitive.List>
              {!loading && (
                <Primitive.Empty className="aegis-combobox-message" role="status">
                  {emptyLabel}
                </Primitive.Empty>
              )}
            </Primitive.Popup>
          </Primitive.Positioner>
        </Primitive.Portal>
      </Primitive.Root>
    </div>
  );
});
