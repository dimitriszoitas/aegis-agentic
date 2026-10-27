import { componentToken } from '@/lib/component-design-tokens';
import { useId, useLayoutEffect, useRef, useState, type ComponentPropsWithoutRef } from 'react';
import { Button } from '@/components/button';
import { ChevronDown, ChevronUp } from '@/components/icon';
import { cn } from '@/lib/utils';
import './expandable-text.css';

export interface ExpandableTextProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  /** Plain text preserves a safe, readable focus order when the preview is clamped. */
  children: string;
  collapsedLines?: number;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  expandLabel?: string;
  collapseLabel?: string;
}

/** A measured text preview that offers disclosure only when the content exceeds its line limit. */
export function ExpandableText({
  children,
  collapsedLines = 3,
  expanded,
  defaultExpanded = false,
  onExpandedChange,
  expandLabel = 'Read more',
  collapseLabel = 'Read less',
  className,
  style,
  ...props
}: ExpandableTextProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const [overflows, setOverflows] = useState(false);
  const isExpanded = expanded ?? internalExpanded;
  const lines = Number.isFinite(collapsedLines) ? Math.max(1, Math.floor(collapsedLines)) : 3;
  const contentId = useId();
  const measureRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const measure = measureRef.current;
    if (!measure) return;
    let mounted = true;
    const update = () => {
      if (!mounted) return;
      const next = measure.scrollHeight > measure.clientHeight + 1;
      if (!next && document.activeElement === toggleRef.current)
        textRef.current?.focus({ preventScroll: true });
      setOverflows(next);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(measure);
    void document.fonts.ready.then(update);
    document.fonts.addEventListener('loadingdone', update);
    return () => {
      mounted = false;
      observer.disconnect();
      document.fonts.removeEventListener('loadingdone', update);
    };
  }, [children, lines]);

  return (
    <div {...props} className={cn('aegis-expandable-text', className)} style={style}>
      <div className="aegis-expandable-text-copy">
        <div
          ref={measureRef}
          aria-hidden="true"
          className="aegis-expandable-text-measure aegis-expandable-text-clamped"
          style={{ WebkitLineClamp: lines }}
        >
          {children}
        </div>
        <div
          id={contentId}
          ref={textRef}
          tabIndex={-1}
          className={cn(
            'aegis-expandable-text-content',
            !isExpanded && 'aegis-expandable-text-clamped',
          )}
          style={{ WebkitLineClamp: !isExpanded ? lines : undefined }}
        >
          {children}
        </div>
      </div>
      {overflows && (
        <Button
          onFocus={(event) => {
            toggleRef.current = event.currentTarget;
          }}
          className="aegis-expandable-text-toggle"
          intent="function"
          emphasis="ghost"
          size="sm"
          trailingIcon={
            isExpanded ? (
              <ChevronUp size={componentToken('data-display.icon-sm')} aria-hidden />
            ) : (
              <ChevronDown size={componentToken('data-display.icon-sm')} aria-hidden />
            )
          }
          aria-expanded={isExpanded}
          aria-controls={contentId}
          onClick={() => {
            if (expanded === undefined) setInternalExpanded(!isExpanded);
            onExpandedChange?.(!isExpanded);
          }}
        >
          {isExpanded ? collapseLabel : expandLabel}
        </Button>
      )}
    </div>
  );
}
