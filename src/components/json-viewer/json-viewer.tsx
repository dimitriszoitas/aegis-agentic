import { componentToken } from '@/lib/component-design-tokens';
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Braces, Check, ChevronRight, Copy, ListCollapse, LocateFixed } from '@/components/icon';
import { Button } from '../button';
import { cn } from '../../lib/utils';
import { useInputFocusModality } from '@/lib/use-input-focus';
import './json-viewer.css';

export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type JsonCopyKind = 'path' | 'value';
export interface JsonViewerProps {
  /** A JSON-compatible payload. Unsupported values are identified in the tree. */
  value: unknown;
  label?: string;
  rootName?: string;
  defaultExpandedDepth?: number;
  maxVisibleItems?: number;
  maxHeight?: number | string;
  onCopy?: (kind: JsonCopyKind, path: string) => void;
  className?: string;
}
type JsonKind =
  'object' | 'array' | 'string' | 'number' | 'boolean' | 'null' | 'unsupported' | 'circular';
interface JsonNode {
  id: string;
  name: string;
  value: unknown;
  kind: JsonKind;
  summary: string;
  parentId?: string;
  depth: number;
  count: number;
  position: number;
  setSize: number;
  children: JsonNode[];
  more?: { count: number; shown: number };
}

function kindOf(value: unknown): JsonKind {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (
    typeof value === 'object' &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
  )
    return 'object';
  if (typeof value === 'string' || typeof value === 'boolean')
    return typeof value as 'string' | 'boolean';
  if (typeof value === 'number' && Number.isFinite(value)) return 'number';
  return 'unsupported';
}
function childPath(parent: string, name: string, array: boolean): string {
  if (array) return `${parent}[${name}]`;
  return /^[A-Za-z_$][\w$]*$/.test(name)
    ? `${parent}.${name}`
    : `${parent}[${JSON.stringify(name)}]`;
}
function getSummary(value: unknown, kind: JsonKind, count: number): string {
  if (kind === 'array')
    return count === 0 ? '[]' : `[${count.toLocaleString()} ${count === 1 ? 'item' : 'items'}]`;
  if (kind === 'object')
    return count === 0 ? '{}' : `{${count.toLocaleString()} ${count === 1 ? 'key' : 'keys'}}`;
  if (kind === 'circular') return '[Circular reference]';
  if (kind === 'unsupported') return '[Unsupported JSON value]';
  return JSON.stringify(value);
}

/** Only expanded branches are visited; each container reveals a bounded page of children. */
function buildTree(
  value: unknown,
  rootName: string,
  expanded: ReadonlySet<string>,
  limits: Record<string, number>,
  pageSize: number,
): JsonNode {
  function build(
    current: unknown,
    id: string,
    name: string,
    depth: number,
    position: number,
    setSize: number,
    ancestors: ReadonlySet<object>,
    parentId?: string,
  ): JsonNode {
    let kind = kindOf(current);
    if (current !== null && typeof current === 'object' && ancestors.has(current))
      kind = 'circular';
    const keys = kind === 'object' ? Object.keys(current as Record<string, unknown>) : [];
    const count = kind === 'array' ? (current as unknown[]).length : keys.length;
    const node: JsonNode = {
      id,
      name,
      value: current,
      kind,
      summary: getSummary(current, kind, count),
      parentId,
      depth,
      count,
      position,
      setSize,
      children: [],
    };
    if (!count || !expanded.has(id) || depth >= 50) return node;
    const nextAncestors = new Set(ancestors).add(current as object);
    const limit = Math.min(count, limits[id] ?? pageSize);
    for (let index = 0; index < limit; index += 1) {
      const key = kind === 'array' ? String(index) : keys[index];
      const next =
        kind === 'array'
          ? (current as unknown[])[index]
          : (current as Record<string, unknown>)[key];
      node.children.push(
        build(
          next,
          childPath(id, key, kind === 'array'),
          key,
          depth + 1,
          index + 1,
          count,
          nextAncestors,
          id,
        ),
      );
    }
    if (limit < count) node.more = { count: count - limit, shown: limit };
    return node;
  }
  return build(value, '$', rootName, 0, 1, 1, new Set());
}
function initialExpanded(value: unknown, depth: number, maxVisible: number): Set<string> {
  const expanded = new Set<string>();
  function visit(current: unknown, path: string, level: number, ancestors: ReadonlySet<object>) {
    if (level >= depth || current === null || typeof current !== 'object' || ancestors.has(current))
      return;
    const kind = kindOf(current);
    if (kind !== 'array' && kind !== 'object') return;
    expanded.add(path);
    if (level + 1 >= depth) return;
    const keys =
      kind === 'array'
        ? Array.from({ length: Math.min((current as unknown[]).length, maxVisible) }, (_, index) =>
            String(index),
          )
        : Object.keys(current).slice(0, maxVisible);
    const nextAncestors = new Set(ancestors).add(current);
    for (const key of keys)
      visit(
        (current as Record<string, unknown>)[key],
        childPath(path, key, kind === 'array'),
        level + 1,
        nextAncestors,
      );
  }
  visit(value, '$', 0, new Set());
  return expanded;
}

export function JsonViewer({
  value,
  label = 'Event payload',
  rootName = 'event',
  defaultExpandedDepth = 1,
  maxVisibleItems = 100,
  maxHeight = componentToken('json-max-height'),
  onCopy,
  className,
}: JsonViewerProps) {
  useInputFocusModality();
  const baseId = useId();
  const pageSize = Number.isFinite(maxVisibleItems)
    ? Math.max(1, Math.floor(maxVisibleItems))
    : 100;
  const [expanded, setExpanded] = useState(() =>
    initialExpanded(value, Math.max(0, Math.min(8, defaultExpandedDepth)), pageSize),
  );
  const [limits, setLimits] = useState<Record<string, number>>({});
  const [focusedId, setFocusedId] = useState('$');
  const [copied, setCopied] = useState<{ id: string; kind: JsonCopyKind }>();
  const [status, setStatus] = useState('');
  const [fallback, setFallback] = useState<string>();
  const rows = useRef(new Map<string, HTMLLIElement>());
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const tree = useMemo(
    () => buildTree(value, rootName, expanded, limits, pageSize),
    [value, rootName, expanded, limits, pageSize],
  );
  const flat = useMemo(() => {
    const nodes: JsonNode[] = [];
    function visit(node: JsonNode) {
      nodes.push(node);
      node.children.forEach(visit);
    }
    visit(tree);
    return nodes;
  }, [tree]);
  const activeId = flat.some((node) => node.id === focusedId) ? focusedId : '$';
  useEffect(() => () => clearTimeout(timer.current), []);
  function focus(id?: string) {
    if (!id) return;
    setFocusedId(id);
    rows.current.get(id)?.focus();
  }
  function toggle(node: JsonNode) {
    if (!node.count || node.depth >= 50 || !['object', 'array'].includes(node.kind)) return;
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(node.id)) next.delete(node.id);
      else next.add(node.id);
      return next;
    });
  }
  async function copy(kind: JsonCopyKind, node: JsonNode) {
    setFocusedId(node.id);
    let text: string;
    try {
      text =
        kind === 'path'
          ? node.id
          : JSON.stringify(
              node.value,
              (_key, item: unknown) => {
                if (kindOf(item) === 'unsupported')
                  throw new Error('This value is not valid JSON.');
                return item;
              },
              2,
            );
    } catch {
      setStatus(
        'This branch contains a circular or unsupported value and cannot be copied as JSON.',
      );
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied({ id: node.id, kind });
      setStatus(`${kind === 'path' ? 'Path' : 'JSON value'} copied for ${node.name}.`);
      setFallback(undefined);
      onCopy?.(kind, node.id);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(undefined), 2000);
    } catch {
      setStatus('Clipboard access is unavailable. Select and copy the text below.');
      setFallback(text);
    }
  }
  function handleKey(event: KeyboardEvent<HTMLLIElement>, node: JsonNode) {
    if (event.target !== event.currentTarget) return;
    const index = flat.findIndex((entry) => entry.id === node.id);
    if (
      event.key === 'ArrowDown' ||
      event.key === 'ArrowUp' ||
      event.key === 'Home' ||
      event.key === 'End'
    ) {
      event.preventDefault();
      focus(
        flat[
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? flat.length - 1
              : Math.max(0, Math.min(flat.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))
        ]?.id,
      );
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      if (expanded.has(node.id)) focus(node.children[0]?.id);
      else toggle(node);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (expanded.has(node.id) && node.count) toggle(node);
      else focus(node.parentId);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle(node);
    } else if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === 'c' &&
      !window.getSelection()?.toString()
    ) {
      event.preventDefault();
      void copy(event.shiftKey ? 'path' : 'value', node);
    }
  }
  function render(node: JsonNode): ReactNode {
    const branch = node.count > 0 && ['object', 'array'].includes(node.kind) && node.depth < 50;
    const isExpanded = branch && expanded.has(node.id);
    const nodeId = `${baseId}-${encodeURIComponent(node.id)}`;
    const isActive = node.id === activeId;
    const copyable = !['unsupported', 'circular'].includes(node.kind);
    return (
      <li
        key={node.id}
        role="treeitem"
        aria-labelledby={`${nodeId}-name ${nodeId}-summary`}
        aria-expanded={branch ? isExpanded : undefined}
        aria-level={node.depth + 1}
        aria-setsize={node.setSize}
        aria-posinset={node.position}
        tabIndex={isActive ? 0 : -1}
        className="aegis-json-node"
        ref={(element) => {
          if (element) rows.current.set(node.id, element);
          else rows.current.delete(node.id);
        }}
        onFocus={(event) => {
          if (
            event.target instanceof Element &&
            event.target.closest('[role="treeitem"]') === event.currentTarget
          )
            setFocusedId(node.id);
        }}
        onKeyDown={(event) => handleKey(event, node)}
      >
        <div
          className="aegis-json-row"
          style={{ '--json-depth': node.depth } as CSSProperties}
          onClick={() => {
            focus(node.id);
            toggle(node);
          }}
        >
          {branch ? (
            <button
              type="button"
              className="aegis-json-expand"
              tabIndex={-1}
              aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${node.name}`}
              onClick={(event) => {
                event.stopPropagation();
                focus(node.id);
                toggle(node);
              }}
            >
              <ChevronRight
                size={componentToken('code.icon-sm')}
                data-expanded={isExpanded}
                aria-hidden
              />
            </button>
          ) : (
            <span className="aegis-json-expand-spacer" />
          )}
          <span id={`${nodeId}-name`} className="aegis-json-key">
            {node.name}
          </span>
          <span aria-hidden className="aegis-json-colon">
            :
          </span>
          <span
            id={`${nodeId}-summary`}
            data-kind={node.kind}
            className="aegis-json-value"
            title={node.summary}
          >
            {node.summary}
          </span>
          <span className="aegis-json-actions">
            <button
              type="button"
              className="aegis-json-copy"
              aria-label={`Copy path for ${node.name}`}
              title={`Copy path: ${node.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={(event) => {
                event.stopPropagation();
                void copy('path', node);
              }}
            >
              {copied?.id === node.id && copied.kind === 'path' ? (
                <Check size={componentToken('code.icon-compact')} />
              ) : (
                <LocateFixed size={componentToken('code.icon-compact')} />
              )}
            </button>
            <button
              type="button"
              className="aegis-json-copy"
              aria-label={`Copy JSON value for ${node.name}`}
              title="Copy JSON value"
              tabIndex={isActive ? 0 : -1}
              disabled={!copyable}
              onClick={(event) => {
                event.stopPropagation();
                void copy('value', node);
              }}
            >
              {copied?.id === node.id && copied.kind === 'value' ? (
                <Check size={componentToken('code.icon-compact')} />
              ) : (
                <Copy size={componentToken('code.icon-compact')} />
              )}
            </button>
          </span>
        </div>
        {isExpanded && (
          <ul role="group" className="aegis-json-group">
            {node.children.map(render)}
            {node.more && (
              <li
                role="none"
                className="aegis-json-more"
                style={{
                  paddingLeft: `calc(var(--group-code-json-viewer-space-padding-regular) + ${node.depth + 1} * var(--group-code-json-viewer-nested-inset))`,
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setLimits((current) => ({
                      ...current,
                      [node.id]: (current[node.id] ?? pageSize) + pageSize,
                    }))
                  }
                >
                  Show {Math.min(pageSize, node.more.count).toLocaleString()} more ·{' '}
                  {node.more.count.toLocaleString()} remaining
                </button>
              </li>
            )}
          </ul>
        )}
      </li>
    );
  }
  return (
    <section className={cn('aegis-json-viewer', className)} aria-label={label}>
      <header className="aegis-json-header">
        <span>
          <Braces size={componentToken('code.icon-md')} aria-hidden />
          <strong>{label}</strong>
          <span className="aegis-json-format">JSON</span>
        </span>
        <div>
          <Button
            size="sm"
            emphasis="ghost"
            leadingIcon={<ListCollapse size={componentToken('code.icon-sm')} />}
            onClick={() => {
              setExpanded(new Set());
              setFocusedId('$');
            }}
          >
            Collapse all
          </Button>
          <Button
            size="sm"
            emphasis="ghost"
            leadingIcon={<Copy size={componentToken('code.icon-sm')} />}
            onClick={() => void copy('value', tree)}
          >
            Copy JSON
          </Button>
        </div>
      </header>
      <p className="aegis-json-sr-only" id={`${baseId}-instructions`}>
        Use arrow keys to navigate and expand the JSON tree. Press Control or Command+C to copy a
        value, or add Shift to copy its path.
      </p>
      <div className="aegis-json-scroll" style={{ maxHeight }}>
        <ul
          role="tree"
          aria-label={`${label} JSON tree`}
          aria-describedby={`${baseId}-instructions`}
          className="aegis-json-tree"
        >
          {render(tree)}
        </ul>
      </div>
      <div className="aegis-json-footer">
        <code title={activeId}>{activeId}</code>
        <span className="aegis-json-status" role="status">
          {status ||
            `${flat.length.toLocaleString()} visible ${flat.length === 1 ? 'node' : 'nodes'}`}
        </span>
      </div>
      {fallback !== undefined && (
        <label className="aegis-json-fallback">
          Copy text manually
          <textarea readOnly value={fallback} onFocus={(event) => event.currentTarget.select()} />
        </label>
      )}
    </section>
  );
}
