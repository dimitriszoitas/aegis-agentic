import { componentToken } from '@/lib/component-design-tokens';
import type { ComponentProps, ReactNode } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Globe2,
  MoreHorizontal,
  Folder,
  Sparkles,
} from '@/components/icon';
import { Avatar } from '@/components/avatar';
import { Sparkline } from '@/components/sparkline';
import { RelativeTime } from '@/components/relative-time';
import { DropdownMenu } from '@/components/dropdown-menu';
import { IconButton } from '@/components/icon-button';
import type { Intent } from '@/components/button';
import { SeverityBadge, type Severity } from '@/components/severity-badge';
import { StatusBadge, type RecordStatus } from '@/components/status-badge';
import { Tag } from '@/components/tag';
import { Tooltip } from '@/components/tooltip';
import { cn } from '@/lib/utils';
import './data-grid-cells.css';

export interface SeverityCellProps {
  severity: Severity;
  compact?: boolean;
}
export function SeverityCell({ severity, compact }: SeverityCellProps) {
  return <SeverityBadge severity={severity} compact={compact} />;
}

export interface GridEntity {
  type: 'user' | 'project' | 'account';
  name: string;
  detail?: string;
}
export interface EntityCellProps extends ComponentProps<'div'> {
  entity: GridEntity;
  avatar?: ReactNode;
}
export function EntityCell({ entity, avatar, className, ...props }: EntityCellProps) {
  return (
    <div className={cn('aegis-entity-cell', className)} {...props}>
      {avatar ??
        (entity.type === 'user' ? (
          <Avatar name={entity.name} size="sm" />
        ) : (
          <span className="aegis-entity-cell-icon" aria-hidden="true">
            {entity.type === 'project' ? (
              <Folder size={componentToken('data-display.icon-sm')} />
            ) : (
              <Globe2 size={componentToken('data-display.icon-sm')} />
            )}
          </span>
        ))}
      <span className="aegis-entity-cell-copy">
        <span className="aegis-entity-cell-name">{entity.name}</span>
        {entity.detail && <span className="aegis-entity-cell-detail">{entity.detail}</span>}
      </span>
    </div>
  );
}

export interface TimeCellProps extends Omit<ComponentProps<'time'>, 'children' | 'dateTime'> {
  value: string | Date;
  /** Supply a reference time for deterministic historical displays and stories. */
  now?: Date | number;
  timeZone?: string;
}
export function TimeCell({ className, ...props }: TimeCellProps) {
  return <RelativeTime {...props} compact className={cn('aegis-time-cell', className)} />;
}

export interface TagsCellProps extends ComponentProps<'div'> {
  tags: readonly string[];
  maxVisible?: number;
}
export function TagsCell({ tags, maxVisible = 2, className, ...props }: TagsCellProps) {
  const maximum = Number.isFinite(maxVisible) ? Math.max(0, Math.floor(maxVisible)) : 2;
  const hidden = tags.slice(maximum);
  return (
    <div className={cn('aegis-tags-cell', className)} {...props}>
      {tags.length ? (
        <>
          {tags.slice(0, maximum).map((tag) => (
            <Tag key={tag} size="sm">
              {tag}
            </Tag>
          ))}
          {hidden.length > 0 && (
            <Tooltip content={<span>{hidden.join(' · ')}</span>}>
              <span
                className="aegis-tags-cell-overflow"
                tabIndex={0}
                aria-label={`${hidden.length} more tags: ${hidden.join(', ')}`}
              >
                +{hidden.length}
              </span>
            </Tooltip>
          )}
        </>
      ) : (
        <span className="aegis-cell-empty" aria-label="No tags">
          —
        </span>
      )}
    </div>
  );
}

export interface SparklineCellProps {
  data: readonly number[];
  variant?: 'line' | 'area' | 'bar';
  intent?: 'function' | 'ai' | 'success' | 'warning' | 'destroy';
  width?: number;
  height?: number;
  label?: string;
  className?: string;
}
/** Dense-table adapter to the shared lightweight chart primitive. */
export function SparklineCell(props: SparklineCellProps) {
  return <Sparkline {...props} />;
}

export interface StatusCellProps {
  status: RecordStatus;
}
export function StatusCell({ status }: StatusCellProps) {
  return <StatusBadge status={status} />;
}

export interface NumberCellProps extends Omit<ComponentProps<'span'>, 'children'> {
  value: number;
  format?: Intl.NumberFormatOptions;
  locale?: string;
}
export function NumberCell({
  value,
  format,
  locale = 'en-GB',
  className,
  ...props
}: NumberCellProps) {
  return (
    <span className={cn('aegis-number-cell', className)} {...props}>
      {Number.isFinite(value) ? new Intl.NumberFormat(locale, format).format(value) : '—'}
    </span>
  );
}

export interface GridCellAction {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  intent?: Intent;
}
export interface ActionsCellProps extends ComponentProps<'div'> {
  actions: readonly GridCellAction[];
  maxVisible?: number;
  label?: string;
}
export function ActionsCell({
  actions,
  maxVisible = 2,
  label = 'Record actions',
  className,
  onClick,
  onKeyDown,
  ...props
}: ActionsCellProps) {
  const maximum = Number.isFinite(maxVisible) ? Math.max(0, Math.floor(maxVisible)) : 2;
  const visible = actions.slice(0, maximum),
    overflow = actions.slice(maximum);
  return (
    <div
      {...props}
      className={cn('aegis-actions-cell', className)}
      role="group"
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
        onKeyDown?.(event);
      }}
    >
      <div className="aegis-actions-cell-primary">
        {visible.map((action) => (
          <IconButton
            key={action.id}
            size="sm"
            emphasis="ghost"
            intent={action.intent}
            aria-label={action.label}
            disabled={action.disabled}
            onClick={action.onClick}
          >
            {action.icon ?? <MoreHorizontal size={componentToken('data-display.icon-inline')} />}
          </IconButton>
        ))}
      </div>
      {overflow.length > 0 && (
        <DropdownMenu
          label={label}
          trigger={
            <IconButton
              tooltip={false}
              size="sm"
              emphasis="ghost"
              aria-label={`More ${label.toLowerCase()}`}
            >
              <MoreHorizontal size={componentToken('data-display.icon-md')} />
            </IconButton>
          }
          items={overflow.map((action) => ({
            id: action.id,
            label: action.label,
            icon: action.icon,
            disabled: action.disabled,
            intent: action.intent === 'destroy' ? 'destroy' : 'default',
            onSelect: action.onClick,
          }))}
        />
      )}
    </div>
  );
}

export interface AiVerdictCellProps extends ComponentProps<'span'> {
  verdict: string;
  /** Normalized score from 0 to 1. */ confidence: number;
}
export function AiVerdictCell({ verdict, confidence, className, ...props }: AiVerdictCellProps) {
  const score = Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0;
  const label = score >= 0.8 ? 'High' : score >= 0.5 ? 'Medium' : 'Low';
  return (
    <Tooltip
      content={
        <>
          <strong>AI suggested verdict</strong>
          <br />
          {label} confidence · {Math.round(score * 100)}%. Review the evidence before applying this
          verdict.
        </>
      }
    >
      <span
        {...props}
        tabIndex={0}
        className={cn('aegis-ai-verdict-cell', className)}
        aria-label={`AI suggestion: ${verdict}. ${label.toLowerCase()} confidence, ${Math.round(score * 100)} percent.`}
      >
        <Sparkles size={componentToken('data-display.icon-xs')} aria-hidden="true" />
        <span className="aegis-ai-verdict-label">{verdict}</span>
        <span className="aegis-ai-verdict-confidence">{Math.round(score * 100)}%</span>
      </span>
    </Tooltip>
  );
}

export interface ExpandCellProps extends Omit<ComponentProps<'button'>, 'children' | 'onChange'> {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  label?: string;
  count?: number;
}
export function ExpandCell({
  expanded,
  onExpandedChange,
  label = 'nested events',
  count,
  disabled,
  className,
  onClick,
  onKeyDown,
  ...props
}: ExpandCellProps) {
  return (
    <button
      {...props}
      type="button"
      className={cn('aegis-expand-cell', className)}
      disabled={disabled}
      aria-expanded={expanded}
      aria-label={`${expanded ? 'Collapse' : 'Expand'} ${count === undefined ? '' : `${count} `}${label}`}
      onClick={(event) => {
        event.stopPropagation();
        onExpandedChange(!expanded);
        onClick?.(event);
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
        onKeyDown?.(event);
      }}
    >
      {expanded ? (
        <ChevronDown size={componentToken('data-display.icon-inline')} aria-hidden="true" />
      ) : (
        <ChevronRight size={componentToken('data-display.icon-inline')} aria-hidden="true" />
      )}
      {count !== undefined && <span aria-hidden="true">{count}</span>}
    </button>
  );
}
