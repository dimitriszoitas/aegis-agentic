import { useEffect, useState, type ComponentProps } from 'react';
import { Tooltip } from '@/components/tooltip';
import { cn } from '@/lib/utils';
import './relative-time.css';
export interface RelativeTimeProps extends Omit<ComponentProps<'time'>, 'children' | 'dateTime'> {
  value: string | Date | number;
  now?: Date | number;
  timeZone?: string;
  locale?: string;
  compact?: boolean;
  updateInterval?: number;
}
export function formatRelativeTime(
  timestamp: number,
  reference: number,
  compact = false,
  locale = 'en-GB',
) {
  const seconds = Math.round((timestamp - reference) / 1000),
    magnitude = Math.abs(seconds);
  if (magnitude < 10) return 'just now';
  const unit =
    magnitude < 60
      ? 'second'
      : magnitude < 3600
        ? 'minute'
        : magnitude < 86400
          ? 'hour'
          : magnitude < 2592000
            ? 'day'
            : magnitude < 31536000
              ? 'month'
              : 'year';
  const divisor = { second: 1, minute: 60, hour: 3600, day: 86400, month: 2592000, year: 31536000 }[
    unit
  ];
  const amount = Math.max(1, Math.floor(magnitude / divisor)) * (seconds < 0 ? -1 : 1);
  if (compact) {
    const label = { second: 's', minute: 'm', hour: 'h', day: 'd', month: 'mo', year: 'y' }[unit];
    return amount > 0 ? `in ${amount}${label}` : `${Math.abs(amount)}${label} ago`;
  }
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(amount, unit);
}
/** Relative time updates on an interval; a fixed reference makes historical views deterministic. */
export function RelativeTime({
  value,
  now,
  timeZone = 'UTC',
  locale = 'en-GB',
  compact = false,
  updateInterval = 30000,
  className,
  tabIndex = 0,
  ...props
}: RelativeTimeProps) {
  const [clock, setClock] = useState(Date.now);
  useEffect(() => {
    if (now !== undefined) return;
    const timer = setInterval(() => setClock(Date.now()), Math.max(1000, updateInterval));
    return () => clearInterval(timer);
  }, [now, updateInterval]);
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(+date)) return <span className="muted">Unavailable</span>;
  const absolute = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'long',
    timeZone,
  }).format(date);
  return (
    <Tooltip content={absolute}>
      <time
        {...props}
        className={cn('aegis-relative-time', className)}
        dateTime={date.toISOString()}
        title={absolute}
        aria-label={`${formatRelativeTime(+date, now === undefined ? clock : +now, compact, locale)}. ${absolute}`}
        tabIndex={tabIndex}
      >
        {formatRelativeTime(+date, now === undefined ? clock : +now, compact, locale)}
      </time>
    </Tooltip>
  );
}
