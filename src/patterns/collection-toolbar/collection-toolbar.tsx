import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { SearchInput } from '@/components/search-input';
import { cn } from '@/lib/utils';
import './collection-toolbar.css';

export interface CollectionToolbarState {
  /** Informational request state; it does not lock editing. */
  busy: boolean;
  /** The owned search is disabled; slot controls must apply this explicitly. */
  disabled: boolean;
}

export interface CollectionToolbarProps extends Omit<
  ComponentPropsWithoutRef<'section'>,
  'children' | 'aria-label' | 'aria-labelledby' | 'aria-busy'
> {
  label: string;
  searchLabel: string;
  query: string;
  onQueryChange: (query: string) => void;
  searchPlaceholder?: string;
  /** ID of the host-owned results region, when available. */
  resultsId?: string;
  /** Nonnegative integer supplied by the host after applying its criteria. */
  resultCount: number;
  /** Optional localized replacement for the complete count message. */
  resultText?: string;
  busy?: boolean;
  busyLabel?: string;
  disabled?: boolean;
  filters?: (state: CollectionToolbarState) => ReactNode;
  actions?: (state: CollectionToolbarState) => ReactNode;
}

/** Shared collection controls. The host owns filtering, requests and result rendering. */
export function CollectionToolbar({
  label,
  searchLabel,
  query,
  onQueryChange,
  searchPlaceholder = 'Search',
  resultsId,
  resultCount,
  resultText,
  busy = false,
  busyLabel = 'Updating results…',
  disabled = false,
  filters,
  actions,
  className,
  ...props
}: CollectionToolbarProps) {
  if (!Number.isSafeInteger(resultCount) || resultCount < 0)
    throw new TypeError('CollectionToolbar resultCount must be a nonnegative safe integer.');
  const state = { busy, disabled };
  return (
    <section
      {...props}
      className={cn('aegis-collection-toolbar', className)}
      aria-label={label}
      aria-busy={busy}
      data-disabled={disabled || undefined}
    >
      <div className="aegis-collection-toolbar-controls">
        <div className="aegis-collection-toolbar-search" data-collection-slot="search">
          <SearchInput
            aria-label={searchLabel}
            aria-controls={resultsId}
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={onQueryChange}
            disabled={disabled}
          />
        </div>
        {filters && (
          <div className="aegis-collection-toolbar-filters" data-collection-slot="filters">
            {filters(state)}
          </div>
        )}
        {actions && (
          <div className="aegis-collection-toolbar-actions" data-collection-slot="actions">
            {actions(state)}
          </div>
        )}
      </div>
      <p
        className="aegis-collection-toolbar-count"
        role="status"
        aria-atomic="true"
        data-collection-slot="count"
      >
        {busy
          ? busyLabel
          : (resultText ??
            `${resultCount.toLocaleString()} ${resultCount === 1 ? 'result' : 'results'}`)}
      </p>
    </section>
  );
}
