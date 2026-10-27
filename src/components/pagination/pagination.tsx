import { componentToken } from '@/lib/component-design-tokens';
import { useId, type ComponentProps } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from '@/components/icon';
import { cn } from '@/lib/utils';
import { useInputFocusModality } from '@/lib/use-input-focus';
import './pagination.css';

export interface PaginationProps extends Omit<ComponentProps<'nav'>, 'onChange'> {
  /** One-based page number. */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  disabled?: boolean;
  noun?: string;
}
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  disabled = false,
  noun = 'results',
  className,
  ...props
}: PaginationProps) {
  useInputFocusModality();
  const sizeId = useId();
  const safeTotal = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
  const size = Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : 25;
  const pages = Math.max(1, Math.ceil(safeTotal / size));
  const current = Number.isFinite(page) ? Math.max(1, Math.min(pages, Math.floor(page))) : 1;
  const visiblePages = [
    ...new Set([
      1,
      pages,
      current - 1,
      current,
      current + 1,
      ...(current <= 2 ? [2, 3] : []),
      ...(current >= pages - 1 ? [pages - 2, pages - 1] : []),
    ]),
  ]
    .filter((value) => value >= 1 && value <= pages)
    .sort((a, b) => a - b);
  const options = [...new Set([...pageSizeOptions, size])]
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);
  return (
    <nav className={cn('aegis-pagination', className)} aria-label="Pagination" {...props}>
      <p className="aegis-pagination-summary" aria-live="polite">
        {safeTotal === 0
          ? `0 ${noun}`
          : `${((current - 1) * size + 1).toLocaleString()}–${Math.min(current * size, safeTotal).toLocaleString()} of ${safeTotal.toLocaleString()} ${noun}`}
      </p>
      <div className="aegis-pagination-controls">
        {onPageSizeChange && (
          <div className="aegis-pagination-size">
            <label htmlFor={sizeId}>Rows per page</label>
            <span className="aegis-pagination-select-wrap">
              <select
                id={sizeId}
                value={size}
                disabled={disabled}
                onChange={(event) => {
                  onPageSizeChange(Number(event.target.value));
                  onPageChange(1);
                }}
              >
                {options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown size={componentToken('navigation.icon-sm')} aria-hidden="true" />
            </span>
          </div>
        )}
        <div className="aegis-pagination-pages">
          <button
            type="button"
            aria-label="Previous page"
            disabled={disabled || current === 1 || safeTotal === 0}
            onClick={() => onPageChange(current - 1)}
          >
            <ChevronLeft size={componentToken('navigation.icon-md')} aria-hidden="true" />
          </button>
          {visiblePages.map((number, index) => (
            <span className="aegis-pagination-page-slot" key={number}>
              {index > 0 && number - visiblePages[index - 1] > 1 && (
                <span className="aegis-pagination-ellipsis" aria-hidden="true">
                  …
                </span>
              )}
              <button
                type="button"
                aria-label={`Page ${number}`}
                aria-current={number === current ? 'page' : undefined}
                disabled={disabled || safeTotal === 0}
                onClick={() => onPageChange(number)}
              >
                {number}
              </button>
            </span>
          ))}
          <button
            type="button"
            aria-label="Next page"
            disabled={disabled || current === pages || safeTotal === 0}
            onClick={() => onPageChange(current + 1)}
          >
            <ChevronRight size={componentToken('navigation.icon-md')} aria-hidden="true" />
          </button>
        </div>
      </div>
    </nav>
  );
}
