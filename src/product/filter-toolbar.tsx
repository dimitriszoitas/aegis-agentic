import type { ReactNode } from 'react';

/** Shared list layout: bounded search first, filters next, the grid owns display tools. */
export function FormaFilterToolbar({
  label,
  search,
  children,
}: {
  label: string;
  search: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="forma-filter-toolbar" role="search" aria-label={label}>
      <div className="forma-filter-search">{search}</div>
      <div className="forma-filter-controls">{children}</div>
    </div>
  );
}
