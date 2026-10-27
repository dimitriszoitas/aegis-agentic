import { componentToken, useComponentTokenNumbers } from '@/lib/component-design-tokens';
import { useId, useState, useSyncExternalStore, type ComponentProps, type ReactNode } from 'react';
import { RefreshCw, Sparkles, ThumbsDown, ThumbsUp } from '@/components/icon';
import { ConfidenceBadge, type ConfidenceLevel } from '@/components/confidence-badge';
import { IconButton } from '@/components/icon-button';
import { cn } from '@/lib/utils';
import './ai-card.css';

const reducedMotionQuery = '(prefers-reduced-motion: reduce)';
function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(reducedMotionQuery);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}
function prefersReducedMotion() {
  return window.matchMedia(reducedMotionQuery).matches;
}

export type AiLabelProps = ComponentProps<'span'>;
/** The shared visible marker for AI-generated material. */
export function AiLabel({ children = 'AI generated', className, ...props }: AiLabelProps) {
  const tokens = useComponentTokenNumbers(['ai-gradient-duration']);
  const gradientId = `ai-marker-${useId().replaceAll(':', '')}`;
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    prefersReducedMotion,
    () => true,
  );
  return (
    <span {...props} className={cn('aegis-ai-label', className)}>
      <svg className="aegis-ai-gradient-defs" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--group-ai-color-ai-foreground)" />
            <stop offset="50%" stopColor="var(--group-ai-color-ai-pink-fg)" />
            <stop
              offset="100%"
              stopColor="var(--group-ai-color-ai-purple-fg, var(--group-ai-color-ai-blue-fg))"
            />
            {!reducedMotion && (
              <animateTransform
                attributeName="gradientTransform"
                type="rotate"
                from="0 .5 .5"
                to="360 .5 .5"
                dur={`${tokens['ai-gradient-duration']}ms`}
                repeatCount="indefinite"
              />
            )}
          </linearGradient>
        </defs>
      </svg>
      <Sparkles
        size={componentToken('ai.icon-inline')}
        aria-hidden="true"
        style={{ stroke: `url(#${gradientId})` }}
      />
      <span>{children}</span>
    </span>
  );
}

export type AiFeedbackValue = 'positive' | 'negative' | null;
export interface AiFeedbackProps {
  feedback?: AiFeedbackValue;
  onFeedback?: (feedback: AiFeedbackValue) => void;
  onRegenerate?: () => void;
  disabled?: boolean;
}
export function AiFeedback({ feedback, onFeedback, onRegenerate, disabled }: AiFeedbackProps) {
  const [localFeedback, setLocalFeedback] = useState<AiFeedbackValue>(null);
  const selected = feedback === undefined ? localFeedback : feedback;
  function vote(value: AiFeedbackValue) {
    setLocalFeedback(value);
    onFeedback?.(value);
  }
  return (
    <div className="aegis-ai-feedback" role="group" aria-label="Response feedback">
      <IconButton
        size="sm"
        emphasis="ghost"
        aria-label="Helpful response"
        aria-pressed={selected === 'positive'}
        disabled={disabled}
        onClick={() => vote('positive')}
      >
        <ThumbsUp size={componentToken('ai.icon-sm')} />
      </IconButton>
      <IconButton
        size="sm"
        emphasis="ghost"
        aria-label="Unhelpful response"
        aria-pressed={selected === 'negative'}
        disabled={disabled}
        onClick={() => vote('negative')}
      >
        <ThumbsDown size={componentToken('ai.icon-sm')} />
      </IconButton>
      {onRegenerate && (
        <IconButton
          size="sm"
          emphasis="ghost"
          intent="ai"
          aria-label="Regenerate response"
          disabled={disabled}
          onClick={onRegenerate}
        >
          <RefreshCw size={componentToken('ai.icon-sm')} />
        </IconButton>
      )}
    </div>
  );
}
export interface AiCardProps extends Omit<ComponentProps<'section'>, 'title'> {
  title?: string;
  confidence?: ConfidenceLevel;
  provenance?: ReactNode;
  feedback?: AiFeedbackValue;
  onFeedback?: (feedback: AiFeedbackValue) => void;
  onRegenerate?: () => void;
  loading?: boolean;
}
export function AiCard({
  title,
  confidence,
  provenance,
  feedback,
  onFeedback,
  onRegenerate,
  loading = false,
  children,
  className,
  ...props
}: AiCardProps) {
  const titleId = useId();
  return (
    <section
      {...props}
      aria-labelledby={title ? titleId : props['aria-labelledby']}
      aria-busy={loading || undefined}
      className={cn('aegis-ai-card', className)}
    >
      <header className="aegis-ai-card-header">
        <AiLabel />
        {confidence && <ConfidenceBadge confidence={confidence} />}
      </header>
      {title && (
        <h3 id={titleId} className="aegis-ai-card-title">
          {title}
        </h3>
      )}
      <div className="aegis-ai-card-content">{children}</div>
      {(provenance || onFeedback || onRegenerate) && (
        <footer className="aegis-ai-card-footer">
          {provenance && <div className="aegis-ai-provenance">{provenance}</div>}
          {(onFeedback || onRegenerate) && (
            <AiFeedback
              feedback={feedback}
              onFeedback={onFeedback}
              onRegenerate={onRegenerate}
              disabled={loading}
            />
          )}
        </footer>
      )}
    </section>
  );
}
export interface AiHighlightProps extends ComponentProps<'aside'> {
  confidence?: ConfidenceLevel;
  provenance?: ReactNode;
}
export function AiHighlight({
  confidence,
  provenance,
  children,
  className,
  ...props
}: AiHighlightProps) {
  return (
    <aside {...props} className={cn('aegis-ai-highlight', className)}>
      <div className="aegis-ai-card-header">
        <AiLabel />
        {confidence && <ConfidenceBadge confidence={confidence} />}
      </div>
      <div className="aegis-ai-card-content">{children}</div>
      {provenance && <div className="aegis-ai-provenance">{provenance}</div>}
    </aside>
  );
}
