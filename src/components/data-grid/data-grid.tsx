import { componentToken, useComponentTokenNumbers } from '@/lib/component-design-tokens';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
} from 'react';
import {
  flexRender,
  functionalUpdate,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type ColumnOrderState,
  type ColumnPinningState,
  type ColumnSizingState,
  type ExpandedState,
  type PaginationState,
  type Row,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronRight,
  Columns3,
  EyeOff,
  MoreHorizontal,
  Pin,
  PinOff,
  RotateCcw,
} from '@/components/icon';
import { Button } from '../button';
import { Checkbox } from '../checkbox';
import { DropdownMenu, type DropdownMenuEntry } from '../dropdown-menu';
import { EmptyState } from '../empty-state';
import { Pagination } from '../pagination';
import { Skeleton } from '../skeleton';
import { clampColumnWidth, estimateColumnWidth, getSafePageIndex } from '../../lib/table';
import { cn } from '../../lib/utils';
import './data-grid.css';

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Human-readable name for column settings and resize announcements. */
    label?: string;
    align?: 'left' | 'center' | 'right';
    cellClassName?: string;
    /** Plain text used when autosizing a custom-rendered cell. */
    getText?: (row: TData, value: TValue) => string;
  }
}

export type GridDensity = 'compact' | 'default' | 'comfortable';
const gridRowHeightTokens: Record<GridDensity, string> = {
  compact: componentToken('grid-row-compact'),
  default: componentToken('grid-row-default'),
  comfortable: componentToken('grid-row-comfortable'),
};
export interface GridColumnSetting {
  id: string;
  label: string;
  visible: boolean;
  hideable: boolean;
}
export interface DataGridToolbarApi {
  /** Selection controls for custom toolbars; replace the normal toolbar row while present. */
  selectionActions?: ReactNode;
  density: GridDensity;
  setDensity: (density: GridDensity) => void;
  columns: GridColumnSetting[];
  setColumnVisibility: (id: string, visible: boolean) => void;
}
export interface DataGridProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  getRowId: (row: T) => string;
  label?: string;
  /** Plural record name displayed in the pagination summary. */
  noun?: string;
  rowLabel?: (row: T) => string;
  density?: GridDensity;
  onDensityChange?: (density: GridDensity) => void;
  enableSelection?: boolean;
  selectedRowIds?: string[];
  defaultSelectedRowIds?: string[];
  onSelectedRowsChange?: (ids: string[], rows: T[]) => void;
  onRowClick?: (row: T) => void;
  renderExpandedRow?: (row: T) => ReactNode;
  canExpandRow?: (row: T) => boolean;
  defaultExpandedRowIds?: string[];
  renderToolbar?: (api: DataGridToolbarApi) => ReactNode;
  renderBulkActions?: (selected: T[], clear: () => void) => ReactNode;
  loading?: boolean;
  error?: ReactNode;
  onRetry?: () => void;
  emptyTitle?: ReactNode;
  emptyDescription?: ReactNode;
  pagination?: boolean;
  pageSize?: number;
  virtualize?: boolean;
  height?: number | string;
  initialSorting?: SortingState;
  initialColumnVisibility?: VisibilityState;
  className?: string;
}

const selectionColumnId = '__aegis_selection';
const expansionColumnId = '__aegis_expansion';
const isInteractive = (target: EventTarget | null) =>
  target instanceof Element &&
  !!target.closest(
    'button, a, input, select, textarea, [role="checkbox"], [role="button"], [contenteditable="true"]',
  );
const columnLabel = <T,>(column: Column<T>) =>
  column.columnDef.meta?.label ??
  (typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id);
const selectionFromIds = (ids: readonly string[]): RowSelectionState =>
  Object.fromEntries(ids.map((id) => [id, true]));
const isUtilityColumn = (id: string) => id === selectionColumnId || id === expansionColumnId;
const isActionsColumn = <T,>(id: string, definition: ColumnDef<T>) =>
  id.toLowerCase() === 'actions' ||
  definition.header === 'Actions' ||
  definition.meta?.label === 'Actions';
function holdGridCursor(document: Document, cursor: 'col-resize' | 'grabbing') {
  const root = document.documentElement;
  const previous = root.getAttribute('data-aegis-grid-cursor');
  root.setAttribute('data-aegis-grid-cursor', cursor);
  return () => {
    if (previous === null) root.removeAttribute('data-aegis-grid-cursor');
    else root.setAttribute('data-aegis-grid-cursor', previous);
  };
}
function moveColumn(ids: string[], source: string, target: string) {
  const next = [...ids];
  const from = next.indexOf(source);
  const to = next.indexOf(target);
  if (from < 0 || to < 0) return next;
  next.splice(from, 1);
  next.splice(to, 0, source);
  return next;
}
function initialPinnedColumns<T>(definitions: ColumnDef<T>[]): ColumnPinningState {
  const leafColumns = (columns: ColumnDef<T>[]): ColumnDef<T>[] =>
    columns.flatMap((column) =>
      'columns' in column && column.columns ? leafColumns(column.columns) : [column],
    );
  const leaves = leafColumns(definitions);
  const ids = leaves.map(
    (column) =>
      column.id ??
      ('accessorKey' in column
        ? String(column.accessorKey).replace(/\./g, '_')
        : typeof column.header === 'string'
          ? column.header
          : undefined),
  );
  const first = ids[0];
  const last = ids.at(-1);
  const lastDefinition = leaves.at(-1);
  const actions = last && lastDefinition && isActionsColumn(last, lastDefinition);
  return {
    left:
      first && leaves[0]?.enablePinning !== false && (!actions || first !== last) ? [first] : [],
    right: actions && lastDefinition?.enablePinning !== false ? [last] : [],
  };
}

export function DataGrid<T>({
  data,
  columns,
  getRowId,
  label = 'Records',
  noun = 'records',
  rowLabel,
  density: controlledDensity,
  onDensityChange,
  enableSelection = true,
  selectedRowIds,
  defaultSelectedRowIds = [],
  onSelectedRowsChange,
  onRowClick,
  renderExpandedRow,
  canExpandRow,
  defaultExpandedRowIds = [],
  renderToolbar,
  renderBulkActions,
  loading = false,
  error,
  onRetry,
  emptyTitle,
  emptyDescription,
  pagination = true,
  pageSize = 25,
  virtualize,
  height = componentToken('grid-height'),
  initialSorting = [],
  initialColumnVisibility = {},
  className,
}: DataGridProps<T>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const tokens = useComponentTokenNumbers(
    [
      'grid-row-compact',
      'grid-row-default',
      'grid-row-comfortable',
      'grid-select-width',
      'grid-expand-width',
      'grid-column-default',
      'grid-column-min',
      'grid-column-max',
      'grid-auto-pin-breakpoint',
      'grid-resize-step',
      'grid-resize-step-large',
      'grid-header-height',
      'grid-detail-estimate-height',
      'data-display.chart-resize-delay',
    ],
    rootRef,
  );
  const id = useId();
  const instructionsId = `${id}-instructions`;
  const bulkRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const headerElements = useRef(new Map<string, HTMLTableCellElement>());
  const headerMenus = useRef(new Map<string, HTMLButtonElement>());
  const draggingColumnRef = useRef<string | null>(null);
  const headerDragBlockedRef = useRef(false);
  const suppressHeaderClickRef = useRef(false);
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const resizeCleanupRef = useRef<(() => void) | null>(null);
  const resizeGuideRef = useRef<HTMLDivElement>(null);
  const resizeHandles = useRef(new Map<string, HTMLDivElement>());
  const rowElements = useRef(new Map<string, HTMLTableRowElement>());
  const pendingFocus = useRef<string | null>(null);
  const [internalDensity, setInternalDensity] = useState<GridDensity>('default');
  const density = controlledDensity ?? internalDensity;
  const rowHeight = tokens[`grid-row-${density}`];
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [columnVisibility, setColumnVisibility] =
    useState<VisibilityState>(initialColumnVisibility);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [focusedResizeColumn, setFocusedResizeColumn] = useState<string | null>(null);
  const [hoveredResizeColumn, setHoveredResizeColumn] = useState<string | null>(null);
  const [draggingColumn, setDraggingColumn] = useState<string | null>(null);
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [initialPinning] = useState(() => initialPinnedColumns(columns));
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>(initialPinning);
  const [defaultPinWasCustomized, setDefaultPinWasCustomized] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const defaultPinnedColumnId = initialPinning.left?.[0];
  // Keep the stored desktop preference while making room to scroll on narrow containers.
  // A user's explicit pin/unpin choice takes precedence over this automatic default.
  const releaseDefaultPin =
    viewportWidth > 0 &&
    viewportWidth < tokens['grid-auto-pin-breakpoint'] &&
    !defaultPinWasCustomized;
  const effectiveColumnPinning = useMemo<ColumnPinningState>(
    () => ({
      left: [
        ...(enableSelection ? [selectionColumnId] : []),
        ...(renderExpandedRow ? [expansionColumnId] : []),
        ...(columnPinning.left ?? []).filter(
          (columnId) =>
            !isUtilityColumn(columnId) &&
            !(releaseDefaultPin && columnId === defaultPinnedColumnId),
        ),
      ],
      right: (columnPinning.right ?? []).filter((columnId) => !isUtilityColumn(columnId)),
    }),
    [columnPinning, defaultPinnedColumnId, enableSelection, releaseDefaultPin, renderExpandedRow],
  );
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const [columnAnnouncement, setColumnAnnouncement] = useState('');
  const [internalSelection, setInternalSelection] = useState<RowSelectionState>(() =>
    selectionFromIds(defaultSelectedRowIds),
  );
  const [expanded, setExpanded] = useState<ExpandedState>(() =>
    selectionFromIds(defaultExpandedRowIds),
  );
  const [paginationState, setPaginationState] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: Math.max(1, pageSize),
  });
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
  const rowSelection = useMemo(
    () => (selectedRowIds ? selectionFromIds(selectedRowIds) : internalSelection),
    [selectedRowIds, internalSelection],
  );
  const safePagination = {
    ...paginationState,
    pageIndex: getSafePageIndex(paginationState.pageIndex, data.length, paginationState.pageSize),
  };
  const allColumns = useMemo<ColumnDef<T>[]>(
    () => [
      ...(enableSelection
        ? [
            {
              id: selectionColumnId,
              size: tokens['grid-select-width'],
              minSize: tokens['grid-select-width'],
              maxSize: tokens['grid-select-width'],
              enableResizing: false,
              enableSorting: false,
              enableHiding: false,
              header: 'Select',
              meta: { label: 'Selection' },
            } satisfies ColumnDef<T>,
          ]
        : []),
      ...(renderExpandedRow
        ? [
            {
              id: expansionColumnId,
              size: tokens['grid-expand-width'],
              minSize: tokens['grid-expand-width'],
              maxSize: tokens['grid-expand-width'],
              enableResizing: false,
              enableSorting: false,
              enableHiding: false,
              header: 'Expand',
              meta: { label: 'Expansion' },
            } satisfies ColumnDef<T>,
          ]
        : []),
      ...columns,
    ],
    [columns, enableSelection, renderExpandedRow, tokens],
  );
  const table = useReactTable({
    data,
    columns: allColumns,
    getRowId,
    state: {
      sorting,
      columnVisibility,
      columnSizing,
      columnOrder,
      columnPinning: effectiveColumnPinning,
      rowSelection,
      expanded,
      pagination: safePagination,
    },
    defaultColumn: {
      size: tokens['grid-column-default'],
      minSize: tokens['grid-column-min'],
      maxSize: tokens['grid-column-max'],
      sortDescFirst: false,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    onColumnOrderChange: setColumnOrder,
    onColumnPinningChange: setColumnPinning,
    onExpandedChange: setExpanded,
    onPaginationChange: (updater) =>
      setPaginationState((current) =>
        functionalUpdate(updater, {
          ...current,
          pageIndex: getSafePageIndex(current.pageIndex, data.length, current.pageSize),
        }),
      ),
    onRowSelectionChange: (updater) => {
      const next = functionalUpdate(updater, rowSelection);
      if (selectedRowIds === undefined) setInternalSelection(next);
      const ids = Object.keys(next).filter((key) => next[key]);
      onSelectedRowsChange?.(
        ids,
        data.filter((row) => next[getRowId(row)]),
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: !pagination,
    getRowCanExpand: (row) => !!renderExpandedRow && (canExpandRow?.(row.original) ?? true),
    enableRowSelection: enableSelection,
    enableMultiSort: true,
    enableSortingRemoval: true,
    columnResizeMode: 'onChange',
    autoResetPageIndex: false,
  });
  const visibleColumns = [
    ...table.getLeftVisibleLeafColumns(),
    ...table.getCenterVisibleLeafColumns(),
    ...table.getRightVisibleLeafColumns(),
  ];
  const primaryDataColumnId = visibleColumns.find(
    (column) => !isUtilityColumn(column.id) && !isActionsColumn(column.id, column.columnDef),
  )?.id;
  // Utility and action columns retain their configured width. Spare space belongs
  // to the final visible data column, including after hiding or reordering fields.
  const fillColumnId = [...visibleColumns]
    .reverse()
    .find(
      (column) => !isUtilityColumn(column.id) && !isActionsColumn(column.id, column.columnDef),
    )?.id;
  const baseWidth = (column: Column<T>) =>
    clampColumnWidth(
      columnSizing[column.id] ?? column.getSize(),
      column.columnDef.minSize,
      column.id === fillColumnId
        ? Math.max(column.columnDef.maxSize ?? tokens['grid-column-max'], viewportWidth)
        : column.columnDef.maxSize,
    );
  const baseTotal = visibleColumns.reduce((total, column) => total + baseWidth(column), 0);
  const expandedInset =
    (enableSelection ? (table.getColumn(selectionColumnId)?.getSize() ?? 0) : 0) +
    (renderExpandedRow ? (table.getColumn(expansionColumnId)?.getSize() ?? 0) / 2 : 0);
  const extraWidth = fillColumnId ? Math.max(0, viewportWidth - baseTotal) : 0;
  const renderedWidth = (column: Column<T>) =>
    column
      .getLeafColumns()
      .reduce(
        (total, leaf) => total + baseWidth(leaf) + (leaf.id === fillColumnId ? extraWidth : 0),
        0,
      );
  const sizingBounds = (column: Column<T>) => ({
    min:
      column.id === fillColumnId
        ? Math.max(
            column.columnDef.minSize ?? tokens['grid-column-min'],
            viewportWidth - (baseTotal - baseWidth(column)),
          )
        : (column.columnDef.minSize ?? tokens['grid-column-min']),
    max:
      column.id === fillColumnId
        ? Math.max(column.columnDef.maxSize ?? tokens['grid-column-max'], viewportWidth)
        : (column.columnDef.maxSize ?? tokens['grid-column-max']),
  });
  useLayoutEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    let measuredWidth = scroll.clientWidth;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const updateExpandedWidth = () =>
      tableRef.current?.style.setProperty('--grid-viewport-width', `${scroll.clientWidth}px`);
    updateExpandedWidth();
    setViewportWidth(measuredWidth);
    const observer = new ResizeObserver(() => {
      updateExpandedWidth();
      clearTimeout(resizeTimer);
      if (scroll.clientWidth === measuredWidth) return;
      // Let the 120ms sidebar motion settle before rerendering every row.
      resizeTimer = setTimeout(() => {
        measuredWidth = scroll.clientWidth;
        setViewportWidth(measuredWidth);
      }, tokens['data-display.chart-resize-delay']);
    });
    observer.observe(scroll);
    return () => {
      clearTimeout(resizeTimer);
      observer.disconnect();
    };
  }, [tokens]);
  useEffect(
    () => () => {
      resizeCleanupRef.current?.();
      dragCleanupRef.current?.();
    },
    [],
  );
  function endColumnDrag() {
    draggingColumnRef.current = null;
    dragCleanupRef.current?.();
    dragCleanupRef.current = null;
    setDraggingColumn(null);
    setDragTarget(null);
  }
  function beginResize(
    event: ReactMouseEvent<HTMLDivElement> | ReactTouchEvent<HTMLDivElement>,
    column: Column<T>,
  ) {
    if ('button' in event && event.button !== 0) return;
    const startX = 'touches' in event ? event.touches[0]?.clientX : event.clientX;
    if (startX === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus();
    setFocusedResizeColumn(null);
    resizeCleanupRef.current?.();
    const document = event.currentTarget.ownerDocument;
    const releaseCursor = holdGridCursor(document, 'col-resize');
    const startWidth = renderedWidth(column);
    const { min, max } = sizingBounds(column);
    table.setColumnSizing((current) => ({ ...current, [column.id]: startWidth }));
    table.setColumnSizingInfo((current) => ({
      ...current,
      isResizingColumn: column.id,
      startOffset: startX,
      startSize: startWidth,
      deltaOffset: 0,
      deltaPercentage: 0,
      columnSizingStart: [[column.id, startWidth]],
    }));
    const move = (nativeEvent: MouseEvent | TouchEvent) => {
      const x = 'touches' in nativeEvent ? nativeEvent.touches[0]?.clientX : nativeEvent.clientX;
      if (x === undefined) return;
      if (nativeEvent.cancelable) nativeEvent.preventDefault();
      const delta = x - startX;
      table.setColumnSizing((current) => ({
        ...current,
        [column.id]: clampColumnWidth(startWidth + delta, min, max),
      }));
      table.setColumnSizingInfo((current) => ({
        ...current,
        deltaOffset: delta,
        deltaPercentage: delta / startWidth,
      }));
    };
    const cleanup = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', end);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', end);
      document.removeEventListener('touchcancel', end);
      document.defaultView?.removeEventListener('blur', end);
      releaseCursor();
      resizeCleanupRef.current = null;
    };
    const end = () => {
      cleanup();
      table.resetHeaderSizeInfo();
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', end);
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('touchend', end);
    document.addEventListener('touchcancel', end);
    document.defaultView?.addEventListener('blur', end);
    resizeCleanupRef.current = cleanup;
  }
  const columnKeys = new Map(table.getAllLeafColumns().map((column, index) => [column.id, index]));
  function pinnedStyle(column: Column<T>): CSSProperties {
    const side = column.getIsPinned();
    const leaves = column.getLeafColumns();
    if (!side || !leaves.every((leaf) => leaf.getIsPinned() === side)) return {};
    const edge = side === 'left' ? leaves[0] : leaves.at(-1)!;
    return { [side]: `var(--grid-pin-${side}-${columnKeys.get(edge.id)}, 0px)` };
  }
  useLayoutEffect(() => {
    const grid = tableRef.current;
    const scroll = scrollRef.current;
    if (!grid || !scroll) return;
    const updateOffsets = () => {
      const keys = new Map(table.getAllLeafColumns().map((column, index) => [column.id, index]));
      for (const side of ['left', 'right'] as const) {
        const pinned =
          side === 'left'
            ? table.getLeftVisibleLeafColumns()
            : [...table.getRightVisibleLeafColumns()].reverse();
        let offset = 0;
        for (const column of pinned) {
          grid.style.setProperty(`--grid-pin-${side}-${keys.get(column.id)}`, `${offset}px`);
          offset +=
            headerElements.current.get(column.id)?.getBoundingClientRect().width ??
            column.getSize();
        }
      }
    };
    updateOffsets();
    const observer = new ResizeObserver(updateOffsets);
    observer.observe(grid);
    observer.observe(scroll);
    return () => observer.disconnect();
  }, [
    table,
    effectiveColumnPinning,
    columnOrder,
    columnSizing,
    columnVisibility,
    enableSelection,
    renderExpandedRow,
  ]);
  const activeResizeColumn =
    table.getState().columnSizingInfo.isResizingColumn ||
    focusedResizeColumn ||
    hoveredResizeColumn;
  useLayoutEffect(() => {
    const scroll = scrollRef.current;
    const guide = resizeGuideRef.current;
    const handle = activeResizeColumn ? resizeHandles.current.get(activeResizeColumn) : undefined;
    const header = handle?.closest('th');
    if (!scroll || !guide || !header) {
      if (guide) guide.hidden = true;
      return;
    }
    const updateGuide = () => {
      const viewportLeft = scroll.getBoundingClientRect().left + scroll.clientLeft;
      const edge = header.getBoundingClientRect().right - viewportLeft;
      const leftHeaders = [...scroll.querySelectorAll('thead [data-pinned="left"]')];
      const rightHeaders = [...scroll.querySelectorAll('thead [data-pinned="right"]')];
      const visibleStart = header.dataset.pinned
        ? 0
        : Math.max(
            0,
            ...leftHeaders.map((cell) => cell.getBoundingClientRect().right - viewportLeft),
          );
      const visibleEnd = header.dataset.pinned
        ? scroll.clientWidth
        : Math.min(
            scroll.clientWidth,
            ...rightHeaders.map((cell) => cell.getBoundingClientRect().left - viewportLeft),
          );
      guide.hidden = edge < visibleStart || edge > visibleEnd + 1;
      // Read the rendered edge: tables may distribute spare width beyond column sizes.
      guide.style.left = `${Math.max(0, Math.min(scroll.clientWidth - 2, edge - 1))}px`;
      guide.style.height = `${scroll.clientHeight}px`;
    };
    updateGuide();
    const observer = new ResizeObserver(updateGuide);
    observer.observe(scroll);
    observer.observe(header);
    const grid = header.closest('table');
    if (grid) observer.observe(grid);
    scroll.addEventListener('scroll', updateGuide, { passive: true });
    return () => {
      observer.disconnect();
      scroll.removeEventListener('scroll', updateGuide);
    };
  }, [activeResizeColumn, columnSizing, columnVisibility, effectiveColumnPinning, columnOrder]);
  const rows = table.getRowModel().rows;
  const entries = useMemo(
    () =>
      rows.flatMap((row) => [
        { row, detail: false },
        ...((expanded === true || expanded[row.id]) &&
        renderExpandedRow &&
        (canExpandRow?.(row.original) ?? true)
          ? [{ row, detail: true }]
          : []),
      ]),
    [rows, expanded, renderExpandedRow, canExpandRow],
  );
  // Use the complete displayed row model so virtualized slices keep their joins.
  // An expanded detail row interrupts the selected group visually.
  function isSelectedEntry(index: number) {
    const entry = entries[index];
    return !!entry && !entry.detail && entry.row.getIsSelected();
  }
  const shouldVirtualize =
    (virtualize ?? data.length > 200) && entries.length > 0 && !loading && !error;
  const headerHeight = table.getHeaderGroups().length * tokens['grid-header-height'];
  const estimateSize = useCallback(
    (index: number) => (entries[index]?.detail ? tokens['grid-detail-estimate-height'] : rowHeight),
    [entries, rowHeight, tokens],
  );
  const getItemKey = useCallback(
    (index: number) => `${entries[index]?.row.id}-${entries[index]?.detail ? 'detail' : 'row'}`,
    [entries],
  );
  const virtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    count: entries.length,
    getScrollElement: () => scrollRef.current,
    estimateSize,
    getItemKey,
    paddingStart: headerHeight,
    scrollPaddingStart: headerHeight,
    overscan: 8,
    enabled: shouldVirtualize,
  });
  useEffect(() => {
    virtualizer.measure();
    scrollRef.current
      ?.querySelectorAll<HTMLTableRowElement>('tr[data-index]')
      .forEach((element) => virtualizer.measureElement(element));
  }, [density, virtualizer]);
  const virtualRows = shouldVirtualize ? virtualizer.getVirtualItems() : [];
  const visibleEntries = shouldVirtualize
    ? virtualRows.map((item) => ({
        ...entries[item.index],
        index: item.index,
        virtualIndex: item.index,
      }))
    : entries.map((entry, index) => ({ ...entry, index, virtualIndex: undefined }));
  const paddingTop = shouldVirtualize
    ? Math.max(0, (virtualRows[0]?.start ?? 0) - headerHeight)
    : 0;
  const paddingBottom = shouldVirtualize
    ? Math.max(0, virtualizer.getTotalSize() - (virtualRows.at(-1)?.end ?? 0))
    : 0;
  const selected = data.filter((row) => rowSelection[getRowId(row)]);
  const currentFocusedId =
    focusedRowId && rows.some((row) => row.id === focusedRowId) ? focusedRowId : rows[0]?.id;
  function setDensity(next: GridDensity) {
    if (controlledDensity === undefined) setInternalDensity(next);
    onDensityChange?.(next);
  }
  function focusRow(index: number) {
    const row = rows[Math.max(0, Math.min(rows.length - 1, index))];
    if (!row) return;
    setFocusedRowId(row.id);
    pendingFocus.current = row.id;
    const entryIndex = entries.findIndex((entry) => !entry.detail && entry.row.id === row.id);
    if (shouldVirtualize) virtualizer.scrollToIndex(entryIndex, { align: 'auto' });
    requestAnimationFrame(() => {
      const element = rowElements.current.get(row.id);
      if (element) {
        element.focus({ preventScroll: shouldVirtualize });
        pendingFocus.current = null;
      }
    });
  }
  function handleRowKey(event: KeyboardEvent<HTMLTableRowElement>, row: Row<T>) {
    if (event.target !== event.currentTarget) return;
    const index = rows.findIndex((candidate) => candidate.id === row.id);
    if (
      event.key === 'ArrowDown' ||
      event.key === 'ArrowUp' ||
      event.key === 'Home' ||
      event.key === 'End'
    ) {
      event.preventDefault();
      focusRow(
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? rows.length - 1
            : index + (event.key === 'ArrowDown' ? 1 : -1),
      );
    } else if (event.key === 'Enter' && onRowClick) {
      event.preventDefault();
      onRowClick(row.original);
    } else if (event.key === ' ' && enableSelection) {
      event.preventDefault();
      row.toggleSelected();
    } else if (event.key === 'ArrowRight' && row.getCanExpand()) {
      event.preventDefault();
      row.toggleExpanded(true);
    } else if (event.key === 'ArrowLeft' && row.getCanExpand()) {
      event.preventDefault();
      row.toggleExpanded(false);
    }
  }
  function autosize(column: Column<T>) {
    const values = table
      .getCoreRowModel()
      .flatRows.slice(0, 200)
      .map((row) => {
        const value = row.getValue<unknown>(column.id);
        return (
          column.columnDef.meta?.getText?.(row.original, value) ??
          (value == null ? '' : String(value))
        );
      });
    table.setColumnSizing((current) => ({
      ...current,
      [column.id]: estimateColumnWidth(
        columnLabel(column),
        values,
        column.columnDef.minSize,
        column.columnDef.maxSize,
      ),
    }));
  }
  const dataColumns = table
    .getAllLeafColumns()
    .filter((column) => !column.id.startsWith('__aegis_'));
  const visibleDataColumns = dataColumns.filter((column) => column.getIsVisible());
  function reorderColumn(sourceId: string, targetId: string) {
    const source = table.getColumn(sourceId);
    const target = table.getColumn(targetId);
    if (
      !source ||
      !target ||
      sourceId === targetId ||
      isUtilityColumn(sourceId) ||
      isUtilityColumn(targetId) ||
      source.getIsPinned() !== target.getIsPinned()
    )
      return;
    const side = source.getIsPinned();
    if (side) {
      setColumnPinning((current) => ({
        ...current,
        [side]: moveColumn(table.getState().columnPinning[side] ?? [], sourceId, targetId),
      }));
    } else {
      setColumnOrder(
        moveColumn(
          table.getAllLeafColumns().map((column) => column.id),
          sourceId,
          targetId,
        ),
      );
    }
    setColumnAnnouncement(
      `${columnLabel(source)} column moved ${source.getIndex(side || undefined) < target.getIndex(side || undefined) ? 'right' : 'left'}.`,
    );
  }
  function pinColumn(column: Column<T>, side: false | 'left' | 'right') {
    if (column.id === defaultPinnedColumnId) setDefaultPinWasCustomized(true);
    column.pin(side);
  }
  function columnMenu(column: Column<T>): DropdownMenuEntry[] {
    const side = column.getIsPinned();
    const peers = visibleColumns.filter(
      (candidate) => !isUtilityColumn(candidate.id) && candidate.getIsPinned() === side,
    );
    const index = peers.findIndex((candidate) => candidate.id === column.id);
    const focusMenu = () =>
      requestAnimationFrame(() => headerMenus.current.get(column.id)?.focus());
    return [
      {
        id: 'pin-left',
        label: 'Pin left',
        icon: <Pin size={componentToken('data-display.icon-sm')} />,
        disabled: !column.getCanPin() || side === 'left',
        onSelect: () => {
          pinColumn(column, 'left');
          focusMenu();
        },
      },
      {
        id: 'pin-right',
        label: 'Pin right',
        icon: <Pin size={componentToken('data-display.icon-sm')} />,
        disabled: !column.getCanPin() || side === 'right',
        onSelect: () => {
          pinColumn(column, 'right');
          focusMenu();
        },
      },
      ...(side
        ? [
            {
              id: 'unpin',
              label: 'Unpin column',
              icon: <PinOff size={componentToken('data-display.icon-sm')} />,
              disabled: !column.getCanPin(),
              onSelect: () => {
                pinColumn(column, false);
                focusMenu();
              },
            },
          ]
        : []),
      { id: 'sort-divider', type: 'separator' },
      {
        id: 'sort-asc',
        label: 'Sort A to Z',
        icon: <ArrowUp size={componentToken('data-display.icon-sm')} />,
        disabled: !column.getCanSort(),
        onSelect: () => column.toggleSorting(false, false),
      },
      {
        id: 'sort-desc',
        label: 'Sort Z to A',
        icon: <ArrowDown size={componentToken('data-display.icon-sm')} />,
        disabled: !column.getCanSort(),
        onSelect: () => column.toggleSorting(true, false),
      },
      { id: 'move-divider', type: 'separator' },
      {
        id: 'move-left',
        label: 'Move left',
        icon: <ArrowLeft size={componentToken('data-display.icon-sm')} />,
        disabled: index <= 0,
        onSelect: () => {
          reorderColumn(column.id, peers[index - 1].id);
          focusMenu();
        },
      },
      {
        id: 'move-right',
        label: 'Move right',
        icon: <ArrowRight size={componentToken('data-display.icon-sm')} />,
        disabled: index === peers.length - 1,
        onSelect: () => {
          reorderColumn(column.id, peers[index + 1].id);
          focusMenu();
        },
      },
      { id: 'hide-divider', type: 'separator' },
      {
        id: 'hide',
        label: 'Hide column',
        icon: <EyeOff size={componentToken('data-display.icon-sm')} />,
        disabled: !column.getCanHide() || visibleDataColumns.length <= 1,
        onSelect: () => {
          const next = visibleDataColumns.find((candidate) => candidate.id !== column.id);
          column.toggleVisibility(false);
          setColumnAnnouncement(`${columnLabel(column)} column hidden.`);
          requestAnimationFrame(() => {
            const target = next ? headerMenus.current.get(next.id) : undefined;
            (target ?? scrollRef.current)?.focus();
          });
        },
      },
    ];
  }
  function clearSelection() {
    const group = bulkRef.current;
    const grid = group?.closest('.aegis-data-grid');
    const restoreFocus = !!group?.contains(group.ownerDocument.activeElement);
    table.resetRowSelection(true);
    if (restoreFocus) {
      requestAnimationFrame(() => {
        const search = grid?.querySelector<HTMLInputElement>(
          '.aegis-grid-toolbar input[type="search"]',
        );
        const checkbox = grid?.querySelector<HTMLButtonElement>(
          '.aegis-grid-selection-column button',
        );
        (search && search.getClientRects().length ? search : checkbox)?.focus({
          preventScroll: true,
        });
      });
    }
  }
  const selectionActions =
    selected.length > 0 ? (
      <div
        ref={bulkRef}
        className="aegis-grid-bulk"
        role="region"
        aria-label="Selected row actions"
      >
        {renderBulkActions ? (
          renderBulkActions(selected, clearSelection)
        ) : (
          <>
            <span>
              <Check size={componentToken('data-display.icon-md')} aria-hidden />
              {selected.length.toLocaleString()} selected
            </span>
            <Button size="sm" emphasis="ghost" onClick={clearSelection}>
              Clear selection
            </Button>
          </>
        )}
      </div>
    ) : undefined;
  const toolbarApi: DataGridToolbarApi = {
    selectionActions,
    density,
    setDensity,
    columns: dataColumns.map((column) => ({
      id: column.id,
      label: columnLabel(column),
      visible: column.getIsVisible(),
      hideable: column.getCanHide() && (!column.getIsVisible() || visibleDataColumns.length > 1),
    })),
    setColumnVisibility: (columnId, visible) => {
      const column = table.getColumn(columnId);
      if (visible || !column?.getIsVisible() || visibleDataColumns.length > 1)
        column?.toggleVisibility(visible);
    },
  };
  const settingsItems: DropdownMenuEntry[] = [
    {
      type: 'group',
      id: 'columns',
      label: 'Visible columns',
      items: toolbarApi.columns.map((column) => ({
        type: 'checkbox',
        id: column.id,
        label: column.label,
        checked: column.visible,
        disabled: !column.hideable,
        onCheckedChange: (checked) => toolbarApi.setColumnVisibility(column.id, checked),
      })),
    },
    { type: 'separator', id: 'settings-divider' },
    {
      id: 'reset-widths',
      label: 'Reset column widths',
      icon: <RotateCcw size={componentToken('data-display.icon-sm')} />,
      onSelect: () => table.resetColumnSizing(),
    },
  ];
  return (
    <div
      ref={rootRef}
      className={cn('aegis-data-grid', className)}
      data-density={density}
      style={
        {
          '--grid-row-height': gridRowHeightTokens[density],
          '--grid-expanded-inset': `${expandedInset}px`,
          '--grid-empty-height': `calc(${typeof height === 'number' ? `${height}px` : height} - ${table.getHeaderGroups().length * tokens['grid-header-height']}px)`,
        } as CSSProperties
      }
    >
      <div className="aegis-grid-toolbar">
        {renderToolbar ? (
          renderToolbar(toolbarApi)
        ) : (
          <>
            {selectionActions ?? (
              <div className="aegis-grid-heading">
                <strong>{label}</strong>
                <span>{data.length.toLocaleString()} results</span>
              </div>
            )}
            <div className="aegis-grid-tools" hidden={!!selectionActions}>
              <div className="aegis-grid-density" role="group" aria-label="Row density">
                {(['compact', 'default', 'comfortable'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={density === value}
                    onClick={() => setDensity(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <DropdownMenu
                trigger={
                  <Button
                    size="sm"
                    emphasis="ghost"
                    leadingIcon={<Columns3 size={componentToken('data-display.icon-inline')} />}
                  >
                    Columns
                  </Button>
                }
                items={settingsItems}
                label="Grid column settings"
              />
            </div>
          </>
        )}
      </div>
      <p className="aegis-grid-sr-only" id={instructionsId}>
        Use up and down arrows to move between rows. Press Enter to open a row, Space to select, and
        left or right arrows to collapse or expand details. Hold Shift while sorting to sort by
        multiple columns. Column resize handles use left and right arrows. Drag column headers to
        reorder within their pinned or unpinned group, or use Move left and Move right in a column
        menu.
      </p>
      <span className="aegis-grid-sr-only" role="status">
        {columnAnnouncement}
      </span>
      <div className="aegis-grid-viewport">
        <div
          className="aegis-grid-scroll"
          ref={scrollRef}
          style={{ maxHeight: height }}
          tabIndex={0}
          role="region"
          aria-label={`${label} table scroll area`}
        >
          <table
            ref={tableRef}
            id={id}
            className="aegis-grid-table"
            role="grid"
            aria-label={label}
            aria-describedby={instructionsId}
            aria-rowcount={
              loading ? -1 : Math.max(1, entries.length) + table.getHeaderGroups().length
            }
            aria-colcount={visibleColumns.length}
            aria-multiselectable={enableSelection || undefined}
            aria-busy={loading || undefined}
            style={{ width: baseTotal + extraWidth }}
          >
            <colgroup>
              {visibleColumns.map((column) => (
                <col key={column.id} style={{ width: renderedWidth(column) }} />
              ))}
            </colgroup>
            <thead>
              {table.getHeaderGroups().map((group, groupIndex) => (
                <tr key={group.id} role="row" aria-rowindex={groupIndex + 1}>
                  {group.headers.map((header, columnIndex) => {
                    const column = header.column;
                    const sorted = column.getIsSorted();
                    const selectedColumn = column.id === selectionColumnId;
                    const dataColumn =
                      !isUtilityColumn(column.id) &&
                      !header.isPlaceholder &&
                      column.columns.length === 0;
                    return (
                      <th
                        ref={(element) => {
                          if (element) headerElements.current.set(column.id, element);
                          else headerElements.current.delete(column.id);
                        }}
                        key={header.id}
                        data-column-id={column.id}
                        data-pinned={column.getIsPinned() || undefined}
                        draggable={dataColumn}
                        role="columnheader"
                        scope="col"
                        aria-colindex={columnIndex + 1}
                        colSpan={header.colSpan}
                        aria-sort={
                          sorted
                            ? sorting.length > 1
                              ? 'other'
                              : sorted === 'asc'
                                ? 'ascending'
                                : 'descending'
                            : undefined
                        }
                        aria-description={
                          sorted
                            ? `${sorted === 'asc' ? 'Ascending' : 'Descending'}, sort priority ${column.getSortIndex() + 1} of ${sorting.length}`
                            : undefined
                        }
                        className={cn(
                          column.getIsPinned() && 'aegis-grid-pinned',
                          selectedColumn && 'aegis-grid-selection-column',
                          dataColumn && 'aegis-grid-data-header',
                          dragTarget === column.id && 'is-drag-target',
                          draggingColumn === column.id && 'is-dragging',
                          column.id === expansionColumnId && 'aegis-grid-expand-column',
                        )}
                        data-align={column.columnDef.meta?.align}
                        style={{
                          ...pinnedStyle(column),
                          width: renderedWidth(column),
                          textAlign: column.columnDef.meta?.align ?? 'left',
                        }}
                        onPointerDownCapture={(event) => {
                          suppressHeaderClickRef.current = false;
                          headerDragBlockedRef.current =
                            event.target instanceof Element &&
                            !!event.target.closest('.aegis-grid-column-menu, .aegis-grid-resize');
                        }}
                        onClickCapture={(event) => {
                          if (suppressHeaderClickRef.current && event.detail > 0) {
                            event.preventDefault();
                            event.stopPropagation();
                          }
                        }}
                        onDragStart={(event) => {
                          if (!dataColumn || headerDragBlockedRef.current) {
                            event.preventDefault();
                            return;
                          }
                          event.stopPropagation();
                          draggingColumnRef.current = column.id;
                          suppressHeaderClickRef.current = true;
                          setDraggingColumn(column.id);
                          setHoveredResizeColumn(null);
                          setFocusedResizeColumn(null);
                          event.dataTransfer.effectAllowed = 'move';
                          event.dataTransfer.setData('text/plain', column.id);
                          const document = event.currentTarget.ownerDocument;
                          const releaseCursor = holdGridCursor(document, 'grabbing');
                          const cancel = () => endColumnDrag();
                          document.defaultView?.addEventListener('blur', cancel);
                          dragCleanupRef.current = () => {
                            releaseCursor();
                            document.defaultView?.removeEventListener('blur', cancel);
                          };
                        }}
                        onDragEnd={endColumnDrag}
                        onDragOver={(event) => {
                          const sourceId = draggingColumnRef.current;
                          if (
                            !sourceId ||
                            !dataColumn ||
                            table.getColumn(sourceId)?.getIsPinned() !== column.getIsPinned()
                          )
                            return;
                          event.preventDefault();
                          event.dataTransfer.dropEffect = 'move';
                          setDragTarget(column.id);
                        }}
                        onDrop={(event) => {
                          const sourceId = draggingColumnRef.current;
                          if (!sourceId) return;
                          event.preventDefault();
                          reorderColumn(sourceId, column.id);
                          endColumnDrag();
                        }}
                      >
                        {selectedColumn ? (
                          <Checkbox
                            aria-label="Select all rows on this page"
                            checked={
                              table.getIsAllPageRowsSelected()
                                ? true
                                : table.getIsSomePageRowsSelected()
                                  ? 'indeterminate'
                                  : false
                            }
                            disabled={!rows.length || loading}
                            onCheckedChange={(checked) =>
                              table.toggleAllPageRowsSelected(checked === true)
                            }
                          />
                        ) : column.id === expansionColumnId ? (
                          <span className="aegis-grid-sr-only">Expand details</span>
                        ) : header.isPlaceholder ? null : column.getCanSort() ? (
                          <button
                            type="button"
                            className="aegis-grid-sort-button"
                            style={{
                              justifyContent:
                                column.columnDef.meta?.align === 'right'
                                  ? 'flex-end'
                                  : column.columnDef.meta?.align === 'center'
                                    ? 'center'
                                    : 'flex-start',
                            }}
                            onClick={column.getToggleSortingHandler()}
                            title="Shift-click to add a sort column"
                          >
                            <span className="aegis-grid-header-label">
                              {flexRender(column.columnDef.header, header.getContext())}
                            </span>
                            <span className="aegis-grid-sort-icon" aria-hidden>
                              {sorted === 'asc' ? (
                                <ArrowUp size={componentToken('data-display.icon-compact')} />
                              ) : sorted === 'desc' ? (
                                <ArrowDown size={componentToken('data-display.icon-compact')} />
                              ) : (
                                <ArrowUpDown size={componentToken('data-display.icon-compact')} />
                              )}
                              {sorted && sorting.length > 1 && (
                                <sup>{column.getSortIndex() + 1}</sup>
                              )}
                            </span>
                          </button>
                        ) : (
                          flexRender(column.columnDef.header, header.getContext())
                        )}
                        {dataColumn && (
                          <DropdownMenu
                            label={`${columnLabel(column)} column actions`}
                            trigger={
                              <button
                                type="button"
                                ref={(element) => {
                                  if (element) headerMenus.current.set(column.id, element);
                                  else headerMenus.current.delete(column.id);
                                }}
                                className="aegis-grid-column-menu"
                                aria-label={`${columnLabel(column)} column actions`}
                              >
                                <MoreHorizontal
                                  size={componentToken('data-display.icon-inline')}
                                  aria-hidden
                                />
                              </button>
                            }
                            items={columnMenu(column)}
                          />
                        )}
                        {column.getCanResize() && column.columns.length === 0 && (
                          <div
                            role="separator"
                            tabIndex={0}
                            aria-orientation="vertical"
                            aria-label={`Resize ${columnLabel(column)} column`}
                            aria-valuenow={Math.round(renderedWidth(column))}
                            aria-valuemin={Math.round(sizingBounds(column).min)}
                            aria-valuemax={Math.round(sizingBounds(column).max)}
                            aria-valuetext={`${Math.round(renderedWidth(column))} pixels`}
                            aria-controls={id}
                            className={cn(
                              'aegis-grid-resize',
                              column.getIsResizing() && 'is-resizing',
                            )}
                            ref={(element) => {
                              if (element) resizeHandles.current.set(column.id, element);
                              else resizeHandles.current.delete(column.id);
                            }}
                            onFocus={(event) => {
                              if (event.currentTarget.matches(':focus-visible'))
                                setFocusedResizeColumn(column.id);
                            }}
                            onBlur={() => setFocusedResizeColumn(null)}
                            onPointerEnter={(event) => {
                              if (event.pointerType !== 'touch') setHoveredResizeColumn(column.id);
                            }}
                            onPointerLeave={() => setHoveredResizeColumn(null)}
                            onMouseDown={(event) => beginResize(event, column)}
                            onTouchStart={(event) => beginResize(event, column)}
                            onDoubleClick={() => autosize(column)}
                            onKeyDown={(event) => {
                              if (
                                !['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter'].includes(
                                  event.key,
                                )
                              )
                                return;
                              event.preventDefault();
                              event.stopPropagation();
                              setFocusedResizeColumn(column.id);
                              if (event.key === 'Enter') {
                                autosize(column);
                                return;
                              }
                              const { min, max } = sizingBounds(column);
                              const next =
                                event.key === 'Home'
                                  ? min
                                  : event.key === 'End'
                                    ? max
                                    : renderedWidth(column) +
                                      (event.key === 'ArrowRight' ? 1 : -1) *
                                        (event.shiftKey
                                          ? tokens['grid-resize-step-large']
                                          : tokens['grid-resize-step']);
                              table.setColumnSizing((current) => ({
                                ...current,
                                [column.id]: clampColumnWidth(next, min, max),
                              }));
                            }}
                          />
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }, (_, index) => (
                  <tr role="row" key={index}>
                    <td role="gridcell" colSpan={visibleColumns.length}>
                      <Skeleton
                        variant="table-row"
                        columns={Math.max(3, visibleColumns.length - 1)}
                        height={rowHeight}
                      />
                    </td>
                  </tr>
                ))
              ) : error ? (
                <tr role="row" className="aegis-grid-empty-row">
                  <td
                    role="gridcell"
                    className="aegis-grid-empty-cell"
                    colSpan={visibleColumns.length}
                  >
                    <EmptyState
                      preset="error"
                      description={error}
                      action={onRetry && <Button onClick={onRetry}>Try again</Button>}
                    />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr role="row" className="aegis-grid-empty-row">
                  <td
                    role="gridcell"
                    className="aegis-grid-empty-cell"
                    colSpan={visibleColumns.length}
                  >
                    <EmptyState title={emptyTitle} description={emptyDescription} />
                  </td>
                </tr>
              ) : (
                <>
                  {paddingTop > 0 && (
                    <tr aria-hidden="true" className="aegis-grid-spacer">
                      <td colSpan={visibleColumns.length} style={{ height: paddingTop }} />
                    </tr>
                  )}
                  {visibleEntries.map(({ row, detail, index, virtualIndex }) =>
                    detail ? (
                      <tr
                        key={`${row.id}-detail`}
                        role="row"
                        aria-rowindex={index + table.getHeaderGroups().length + 1}
                        className="aegis-grid-expanded-row"
                        data-index={virtualIndex}
                        ref={shouldVirtualize ? virtualizer.measureElement : undefined}
                      >
                        <td role="gridcell" colSpan={visibleColumns.length}>
                          <div
                            className="aegis-grid-expanded-content"
                            id={`${id}-expanded-${row.id}`}
                          >
                            {renderExpandedRow?.(row.original)}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr
                        key={row.id}
                        role="row"
                        aria-rowindex={index + table.getHeaderGroups().length + 1}
                        aria-selected={enableSelection ? row.getIsSelected() : undefined}
                        aria-label={rowLabel?.(row.original) ?? `Record ${row.id}`}
                        tabIndex={currentFocusedId === row.id ? 0 : -1}
                        data-index={virtualIndex}
                        data-grid-row={row.id}
                        data-selected-before={
                          (row.getIsSelected() && isSelectedEntry(index - 1)) || undefined
                        }
                        data-selected-after={
                          (row.getIsSelected() && isSelectedEntry(index + 1)) || undefined
                        }
                        className={cn(
                          'aegis-grid-row',
                          onRowClick && 'aegis-grid-clickable',
                          row.getIsSelected() && 'is-selected',
                        )}
                        ref={(element) => {
                          if (element) {
                            rowElements.current.set(row.id, element);
                            if (shouldVirtualize) virtualizer.measureElement(element);
                            if (pendingFocus.current === row.id) {
                              element.focus({ preventScroll: true });
                              pendingFocus.current = null;
                            }
                          } else rowElements.current.delete(row.id);
                        }}
                        onFocus={() => setFocusedRowId(row.id)}
                        onKeyDown={(event) => handleRowKey(event, row)}
                        onClick={(event) => {
                          if (!isInteractive(event.target) && !window.getSelection()?.toString()) {
                            setFocusedRowId(row.id);
                            event.currentTarget.focus({ preventScroll: true });
                            onRowClick?.(row.original);
                          }
                        }}
                      >
                        {row.getVisibleCells().map((cell, columnIndex) => (
                          <td
                            key={cell.id}
                            data-column-id={cell.column.id}
                            data-primary-column={
                              !isUtilityColumn(cell.column.id) &&
                              !isActionsColumn(cell.column.id, cell.column.columnDef)
                                ? cell.column.id === primaryDataColumnId
                                : undefined
                            }
                            data-pinned={cell.column.getIsPinned() || undefined}
                            role="gridcell"
                            aria-colindex={columnIndex + 1}
                            className={cn(
                              cell.column.getIsPinned() && 'aegis-grid-pinned',
                              cell.column.id === selectionColumnId && 'aegis-grid-selection-column',
                              cell.column.id === expansionColumnId && 'aegis-grid-expand-column',
                              cell.column.columnDef.meta?.cellClassName,
                            )}
                            style={{
                              ...pinnedStyle(cell.column),
                              textAlign: cell.column.columnDef.meta?.align ?? 'left',
                            }}
                          >
                            {cell.column.id === selectionColumnId ? (
                              <Checkbox
                                aria-label={`Select ${rowLabel?.(row.original) ?? row.id}`}
                                checked={row.getIsSelected()}
                                onCheckedChange={(checked) => row.toggleSelected(checked === true)}
                                tabIndex={currentFocusedId === row.id ? 0 : -1}
                              />
                            ) : cell.column.id === expansionColumnId ? (
                              row.getCanExpand() && (
                                <button
                                  type="button"
                                  className="aegis-grid-expand"
                                  aria-label={`${row.getIsExpanded() ? 'Collapse' : 'Expand'} ${rowLabel?.(row.original) ?? row.id}`}
                                  aria-expanded={row.getIsExpanded()}
                                  aria-controls={
                                    row.getIsExpanded() ? `${id}-expanded-${row.id}` : undefined
                                  }
                                  onClick={row.getToggleExpandedHandler()}
                                  tabIndex={currentFocusedId === row.id ? 0 : -1}
                                >
                                  {row.getIsExpanded() ? (
                                    <ChevronDown
                                      size={componentToken('data-display.icon-inline')}
                                    />
                                  ) : (
                                    <ChevronRight
                                      size={componentToken('data-display.icon-inline')}
                                    />
                                  )}
                                </button>
                              )
                            ) : (
                              <div className="aegis-grid-cell-content">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </div>
                            )}
                          </td>
                        ))}
                      </tr>
                    ),
                  )}
                  {paddingBottom > 0 && (
                    <tr aria-hidden="true" className="aegis-grid-spacer">
                      <td colSpan={visibleColumns.length} style={{ height: paddingBottom }} />
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
        <div
          ref={resizeGuideRef}
          className="aegis-grid-resize-guide"
          aria-hidden="true"
          hidden={!activeResizeColumn}
        />
      </div>
      <div className="aegis-grid-footer">
        {pagination ? (
          <Pagination
            page={safePagination.pageIndex + 1}
            pageSize={safePagination.pageSize}
            total={data.length}
            onPageChange={(page) => {
              table.setPageIndex(page - 1);
              scrollRef.current?.scrollTo({ top: 0 });
            }}
            onPageSizeChange={(size) => {
              table.setPageSize(size);
              scrollRef.current?.scrollTo({ top: 0 });
            }}
            disabled={loading}
            noun={noun}
          />
        ) : (
          <span>
            {data.length.toLocaleString()} {noun}
            {shouldVirtualize && ' · Virtual scrolling'}
          </span>
        )}
      </div>
    </div>
  );
}
