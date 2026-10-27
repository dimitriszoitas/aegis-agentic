import { useEffect, useState, type ComponentProps } from 'react';
import { AiLabel } from '@/components/ai-card';
import { cn } from '@/lib/utils';
import './thinking-indicator.css';

const defaultMessages = [
  'Reviewing the selected context',
  'Comparing related records',
  'Preparing a workspace summary',
];
export interface ThinkingIndicatorProps extends ComponentProps<'div'> {
  messages?: readonly string[];
  interval?: number;
  compact?: boolean;
}
export function ThinkingIndicator({
  messages = defaultMessages,
  interval = 3200,
  compact = false,
  className,
  ...props
}: ThinkingIndicatorProps) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer: ReturnType<typeof setInterval> | undefined;
    function update() {
      if (timer) clearInterval(timer);
      if (!motion.matches && messages.length > 1)
        timer = setInterval(
          () => setIndex((current) => current + 1),
          Number.isFinite(interval) ? Math.max(1200, interval) : 3200,
        );
    }
    update();
    motion.addEventListener('change', update);
    return () => {
      if (timer) clearInterval(timer);
      motion.removeEventListener('change', update);
    };
  }, [messages.length, interval]);
  return (
    <div
      role="status"
      {...props}
      className={cn('aegis-thinking-indicator', className)}
      data-compact={compact}
    >
      <AiLabel>{compact ? 'Thinking' : 'Assistant is working'}</AiLabel>
      <span className="aegis-thinking-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      {!compact && (
        <span className="aegis-thinking-status">
          {messages.length ? messages[index % messages.length] : defaultMessages[0]}
        </span>
      )}
    </div>
  );
}
