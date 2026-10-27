import { componentToken } from '@/lib/component-design-tokens';
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { X } from '@/components/icon';
import { AiLabel } from '@/components/ai-card';
import { Button } from '@/components/button';
import { IconButton } from '@/components/icon-button';
import { TextInput } from '@/components/text-input';
import { Textarea } from '@/components/textarea';
import { mergeDescriptionIds, useFieldControl, type FieldControlProps } from '@/components/field';
import { cn } from '@/lib/utils';
import './ai-inline-suggestion.css';

export interface AiInlineSuggestionProps extends FieldControlProps {
  as?: 'input' | 'textarea';
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Full proposed value, including the already typed prefix. */
  suggestion: string;
  onAccept?: (value: string) => void;
  onDismiss?: () => void;
  label?: ReactNode;
  'aria-label'?: string;
  placeholder?: string;
  name?: string;
  readOnly?: boolean;
  maxLength?: number;
  rows?: number;
  maxRows?: number;
  autoGrow?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

/** A completion is suggested only at the end of a matching prefix and never changes the value until accepted. */
export const AiInlineSuggestion = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  AiInlineSuggestionProps
>(function AiInlineSuggestion(
  {
    as = 'input',
    value,
    defaultValue = '',
    onValueChange,
    suggestion,
    onAccept,
    onDismiss,
    label,
    'aria-label': ariaLabel,
    placeholder,
    name,
    readOnly = false,
    maxLength,
    rows = 3,
    maxRows = 8,
    autoGrow = true,
    size = 'md',
    className,
    onKeyDown,
    id,
    required,
    disabled,
    invalid,
    'aria-labelledby': labelledBy,
    'aria-describedby': describedBy,
    'aria-invalid': ariaInvalid,
  },
  ref,
) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const text = value ?? internalValue;
  const [dismissed, setDismissed] = useState<string>();
  const [atEnd, setAtEnd] = useState(true);
  const [scroll, setScroll] = useState({ x: 0, y: 0 });
  const input = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const frame = useRef<number | null>(null);
  const localId = useId();
  const labelId = `${localId}-label`;
  const suggestionId = `${localId}-suggestion`;
  const control = useFieldControl({
    id,
    required,
    disabled,
    invalid,
    'aria-invalid': ariaInvalid,
    'aria-labelledby': labelledBy ?? (label ? labelId : undefined),
    'aria-describedby': describedBy,
  });
  const available =
    !control.disabled &&
    !readOnly &&
    atEnd &&
    suggestion !== dismissed &&
    suggestion.startsWith(text) &&
    suggestion.length > text.length &&
    (maxLength === undefined || suggestion.length <= maxLength);
  const remainder = available ? suggestion.slice(text.length) : '';
  useImperativeHandle(ref, () => (as === 'input' ? input.current : textarea.current)!, [as]);
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );
  const syncScroll = () => {
    const element = as === 'input' ? input.current : textarea.current;
    if (element)
      setScroll((previous) =>
        previous.x === element.scrollLeft && previous.y === element.scrollTop
          ? previous
          : { x: element.scrollLeft, y: element.scrollTop },
      );
  };
  const scheduleScroll = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      syncScroll();
    });
  };
  const change = (next: string) => {
    if (value === undefined) setInternalValue(next);
    setAtEnd(true);
    onValueChange?.(next);
    scheduleScroll();
  };
  const accept = () => {
    if (!available) return;
    change(suggestion);
    onAccept?.(suggestion);
    const element = as === 'input' ? input.current : textarea.current;
    element?.focus();
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      element?.setSelectionRange(suggestion.length, suggestion.length);
      syncScroll();
    });
  };
  const dismiss = () => {
    if (!available) return;
    setDismissed(suggestion);
    onDismiss?.();
    (as === 'input' ? input.current : textarea.current)?.focus();
  };
  const keyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.nativeEvent.isComposing || !available) return;
    if (
      event.key === 'Tab' &&
      !event.shiftKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      accept();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      dismiss();
    }
  };
  const select = () => {
    const element = as === 'input' ? input.current : textarea.current;
    if (element)
      setAtEnd(element.selectionStart === text.length && element.selectionEnd === text.length);
  };
  const common = {
    ...control,
    name,
    value: text,
    onValueChange: change,
    'aria-label': ariaLabel,
    'aria-describedby': mergeDescriptionIds(
      control['aria-describedby'],
      available ? suggestionId : undefined,
    ),
    placeholder: available ? undefined : placeholder,
    readOnly,
    maxLength,
    onKeyDown: keyDown,
    onSelect: select,
    onScroll: syncScroll,
  };
  return (
    <div className={cn('aegis-ai-inline', className)} data-as={as} data-size={size}>
      {label && (
        <label id={labelId} htmlFor={control.id} className="aegis-field-label">
          {label}
        </label>
      )}
      <div className="aegis-ai-inline-control">
        {as === 'input' ? (
          <TextInput {...common} ref={input} size={size} />
        ) : (
          <Textarea {...common} ref={textarea} rows={rows} maxRows={maxRows} autoGrow={autoGrow} />
        )}
        {available && (
          <div className="aegis-ai-inline-ghost" aria-hidden="true">
            <div style={{ transform: `translate(${-scroll.x}px, ${-scroll.y}px)` }}>
              <span className="aegis-ai-inline-prefix">{text}</span>
              <span>{remainder}</span>
            </div>
          </div>
        )}
      </div>
      {available && (
        <div className="aegis-ai-inline-footer">
          <AiLabel className="aegis-ai-inline-label">AI generated suggestion</AiLabel>
          <div className="aegis-ai-inline-actions">
            <Button size="sm" intent="ai" emphasis="ghost" onClick={accept}>
              Accept suggestion
            </Button>
            <IconButton
              size="sm"
              emphasis="ghost"
              aria-label="Dismiss suggestion"
              onClick={dismiss}
            >
              <X size={componentToken('ai.icon-compact')} />
            </IconButton>
          </div>
          <span className="aegis-ai-inline-hint">Tab to accept · Esc to dismiss</span>
        </div>
      )}
      <span id={suggestionId} className="sr-only" role="status" aria-live="polite">
        {available
          ? `AI generated suggestion: ${suggestion}. Press Tab or use Accept suggestion to accept, or Escape to dismiss.`
          : ''}
      </span>
    </div>
  );
});
