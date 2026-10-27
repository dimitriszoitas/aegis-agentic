import { componentToken } from '@/lib/component-design-tokens';
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Check, ChevronRight, Minus } from '@/components/icon';
import { cn } from '@/lib/utils';
import {
  findTreePath,
  flattenVisibleTree,
  getTreeCheckState,
  toggleTreeSelection,
  type TreeNode,
} from '@/lib/tree';
import { useFieldControl } from '@/components/field';
import './tree-view.css';

export interface TreeViewItem extends TreeNode {
  children?: readonly TreeViewItem[];
  icon?: ReactNode;
  count?: number;
  description?: string;
}

export interface TreeViewProps extends Omit<HTMLAttributes<HTMLUListElement>, 'onChange'> {
  items: readonly TreeViewItem[];
  label?: ReactNode;
  /** Selected leaf IDs. Branch states are derived from selectable descendants. */
  selectedIds?: readonly string[];
  defaultSelectedIds?: readonly string[];
  onSelectedChange?: (selectedIds: string[]) => void;
  expandedIds?: readonly string[];
  defaultExpandedIds?: readonly string[];
  onExpandedChange?: (expandedIds: string[]) => void;
  disabled?: boolean;
  emptyLabel?: string;
}

/** Multi-select tree with APG arrow navigation, roving focus and derived tri-state. */
export function TreeView({
  items,
  label,
  selectedIds,
  defaultSelectedIds = [],
  onSelectedChange,
  expandedIds,
  defaultExpandedIds = [],
  onExpandedChange,
  disabled,
  emptyLabel = 'No matching sources',
  id,
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': labelledBy,
  'aria-describedby': describedBy,
  onKeyDown,
  ...props
}: TreeViewProps) {
  const [internalSelected, setInternalSelected] = useState<readonly string[]>(defaultSelectedIds);
  const [internalExpanded, setInternalExpanded] = useState<readonly string[]>(defaultExpandedIds);
  const [focusedId, setFocusedId] = useState<string>();
  const labelId = `aegis-tree-label-${useId()}`;
  const control = useFieldControl({
    id,
    disabled,
    'aria-labelledby': labelledBy ?? (label ? labelId : undefined),
    'aria-describedby': describedBy,
  });
  const isTreeDisabled = Boolean(control.disabled);
  const selected = selectedIds ?? internalSelected;
  const expanded = expandedIds ?? internalExpanded;
  const expandedSet = useMemo(() => new Set(expanded), [expanded]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const visible = useMemo(() => flattenVisibleTree(items, expanded), [items, expanded]);
  const enabled = visible.filter((entry) => !entry.disabled);
  const activeId = enabled.some(({ node }) => node.id === focusedId)
    ? focusedId
    : enabled[0]?.node.id;
  const refs = useRef(new Map<string, HTMLLIElement>());
  const treeRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef('');
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(searchTimer.current), []);

  function focusNode(nodeId?: string) {
    if (!nodeId) return;
    setFocusedId(nodeId);
    refs.current.get(nodeId)?.focus();
  }
  function updateExpanded(next: readonly string[]) {
    const ids = [...new Set(next)];
    if (expandedIds === undefined) setInternalExpanded(ids);
    onExpandedChange?.(ids);
  }
  function toggleExpanded(node: TreeViewItem) {
    if (isTreeDisabled || node.disabled || !node.children?.length) return;
    updateExpanded(
      expandedSet.has(node.id)
        ? expanded.filter((nodeId) => nodeId !== node.id)
        : [...expanded, node.id],
    );
  }
  function updateSelected(next: string[]) {
    if (selectedIds === undefined) setInternalSelected(next);
    onSelectedChange?.(next);
  }
  function toggleSelected(node: TreeViewItem) {
    if (!isTreeDisabled) updateSelected(toggleTreeSelection(items, node.id, selected));
  }
  function handleKeys(event: KeyboardEvent<HTMLLIElement>, node: TreeViewItem) {
    if (event.target !== event.currentTarget || isTreeDisabled) return;
    const index = enabled.findIndex((entry) => entry.node.id === node.id);
    const entry = visible.find((item) => item.node.id === node.id);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      focusNode(
        enabled[
          Math.min(enabled.length - 1, Math.max(0, index + (event.key === 'ArrowDown' ? 1 : -1)))
        ]?.node.id,
      );
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      focusNode((event.key === 'Home' ? enabled[0] : enabled.at(-1))?.node.id);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      if (!expandedSet.has(node.id)) toggleExpanded(node);
      else focusNode(enabled.find((item) => item.parentId === node.id)?.node.id);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (node.children?.length && expandedSet.has(node.id)) toggleExpanded(node);
      else focusNode(entry?.parentId);
    } else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      toggleSelected(node);
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      updateSelected(
        items.reduce(
          (next, item) => toggleTreeSelection(items, item.id, next, true),
          [...selected],
        ),
      );
    } else if (event.key === '*') {
      event.preventDefault();
      const siblings = visible.filter(
        (item) => item.parentId === entry?.parentId && item.node.children?.length && !item.disabled,
      );
      updateExpanded([...expanded, ...siblings.map((item) => item.node.id)]);
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      typeahead.current += event.key.toLocaleLowerCase();
      clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => {
        typeahead.current = '';
      }, 500);
      const candidates = [...enabled.slice(index + 1), ...enabled.slice(0, index + 1)];
      focusNode(
        candidates.find((item) => item.node.label.toLocaleLowerCase().startsWith(typeahead.current))
          ?.node.id,
      );
    }
  }

  // If a controlled collapse removes the focused item, retain focus on its visible ancestor.
  useEffect(() => {
    if (!focusedId || visible.some(({ node }) => node.id === focusedId)) return;
    const path = findTreePath(items, focusedId)?.reverse();
    const ancestor = path?.find((node) =>
      visible.some((entry) => entry.node.id === node.id && !entry.disabled),
    );
    setFocusedId(ancestor?.id);
    if (document.activeElement === document.body) refs.current.get(ancestor?.id ?? '')?.focus();
  }, [items, visible, focusedId]);

  function renderItems(
    nodes: readonly TreeViewItem[],
    level = 1,
    inheritedDisabled = false,
  ): ReactNode {
    return nodes.map((node, index) => {
      const isDisabled = isTreeDisabled || inheritedDisabled || Boolean(node.disabled);
      const isBranch = Boolean(node.children?.length);
      const isExpanded = expandedSet.has(node.id);
      const checkState = getTreeCheckState(node, selectedSet);
      const nodeId = `${control.id}-node-${encodeURIComponent(node.id)}`;
      return (
        <li
          key={node.id}
          ref={(element) => {
            if (element) refs.current.set(node.id, element);
            else refs.current.delete(node.id);
          }}
          role="treeitem"
          aria-labelledby={`${nodeId}-label`}
          aria-describedby={
            [
              node.description ? `${nodeId}-description` : undefined,
              node.count !== undefined ? `${nodeId}-count` : undefined,
            ]
              .filter(Boolean)
              .join(' ') || undefined
          }
          aria-checked={checkState === 'indeterminate' ? 'mixed' : checkState}
          aria-expanded={isBranch ? isExpanded : undefined}
          aria-disabled={isDisabled || undefined}
          aria-level={level}
          aria-posinset={index + 1}
          aria-setsize={nodes.length}
          tabIndex={!isTreeDisabled && node.id === activeId ? 0 : -1}
          className="aegis-tree-item"
          onFocus={(event) => {
            if (event.target === event.currentTarget) setFocusedId(node.id);
          }}
          onKeyDown={(event) => handleKeys(event, node)}
        >
          <div
            className="aegis-tree-row"
            data-disabled={isDisabled || undefined}
            data-checked={checkState === true || undefined}
            style={{ '--tree-level': level } as CSSProperties}
            onClick={() => {
              if (!isDisabled) {
                focusNode(node.id);
                toggleSelected(node);
              }
            }}
          >
            {isBranch ? (
              <button
                type="button"
                className="aegis-tree-expand"
                tabIndex={-1}
                disabled={isDisabled}
                aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${node.label}`}
                onClick={(event) => {
                  event.stopPropagation();
                  focusNode(node.id);
                  toggleExpanded(node);
                }}
              >
                <ChevronRight
                  size={componentToken('input.icon-sm')}
                  aria-hidden="true"
                  data-expanded={isExpanded}
                />
              </button>
            ) : (
              <span className="aegis-tree-expand-spacer" />
            )}
            <span className="aegis-tree-checkbox" data-state={checkState} aria-hidden="true">
              {checkState === true ? (
                <Check size={componentToken('input.icon-compact')} />
              ) : checkState === 'indeterminate' ? (
                <Minus size={componentToken('input.icon-compact')} />
              ) : null}
            </span>
            {node.icon && (
              <span className="aegis-tree-icon" aria-hidden="true">
                {node.icon}
              </span>
            )}
            <span className="aegis-tree-copy">
              <span id={`${nodeId}-label`}>{node.label}</span>
              {node.description && (
                <span id={`${nodeId}-description`} className="aegis-tree-description">
                  {node.description}
                </span>
              )}
            </span>
            {node.count !== undefined && (
              <span
                id={`${nodeId}-count`}
                className="aegis-tree-count"
                aria-label={`${node.count.toLocaleString()} events`}
              >
                {node.count.toLocaleString()}
              </span>
            )}
          </div>
          {isBranch && isExpanded && (
            <ul role="group" className="aegis-tree-group">
              {renderItems(node.children!, level + 1, isDisabled)}
            </ul>
          )}
        </li>
      );
    });
  }

  return (
    <div className="aegis-tree-field">
      {label && (
        <div id={labelId} className="aegis-field-label">
          {label}
        </div>
      )}
      <ul
        {...props}
        ref={treeRef}
        id={control.id}
        role="tree"
        aria-multiselectable="true"
        aria-disabled={isTreeDisabled || undefined}
        aria-label={control['aria-labelledby'] ? undefined : (ariaLabel ?? 'Event sources')}
        aria-labelledby={control['aria-labelledby']}
        aria-describedby={control['aria-describedby']}
        className={cn('aegis-tree', className)}
        onKeyDown={onKeyDown}
        tabIndex={items.length === 0 ? 0 : undefined}
      >
        {renderItems(items)}
      </ul>
      {!items.length && (
        <p className="aegis-tree-empty" role="status">
          {emptyLabel}
        </p>
      )}
    </div>
  );
}
