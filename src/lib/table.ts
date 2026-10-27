import { readComponentTokenNumber } from './component-design-tokens';
export function clampColumnWidth(
  width: number,
  minWidth = readComponentTokenNumber('table-column-min-width'),
  maxWidth = readComponentTokenNumber('table-column-max-width'),
): number {
  const minimum = Number.isFinite(minWidth)
    ? Math.max(readComponentTokenNumber('table-column-minimum'), minWidth)
    : readComponentTokenNumber('table-column-min-width');
  const maximum = Number.isFinite(maxWidth)
    ? Math.max(minimum, maxWidth)
    : readComponentTokenNumber('table-column-max-width');
  return Math.max(minimum, Math.min(maximum, Number.isFinite(width) ? Math.round(width) : minimum));
}

/** Measure a bounded text sample so autosizing large result sets stays responsive. */
export function estimateColumnWidth(
  label: string,
  values: readonly string[],
  minWidth = readComponentTokenNumber('table-column-min-width'),
  maxWidth = readComponentTokenNumber('table-column-max-width'),
): number {
  const longest = Math.max(
    label.length,
    ...values
      .slice(0, 200)
      .map((value) => Math.max(...value.split('\n').map((line) => line.length))),
  );
  return clampColumnWidth(
    longest * readComponentTokenNumber('table-character-width') +
      readComponentTokenNumber('table-cell-chrome-width'),
    minWidth,
    maxWidth,
  );
}

/** Clamp stale pages after filtering, including the zero-result state. */
export function getSafePageIndex(pageIndex: number, rowCount: number, pageSize: number): number {
  const size = Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : 25;
  const count = Number.isFinite(rowCount) ? Math.max(0, rowCount) : 0;
  const lastPage = Math.max(0, Math.ceil(count / size) - 1);
  return Math.min(lastPage, Math.max(0, Number.isFinite(pageIndex) ? Math.floor(pageIndex) : 0));
}
