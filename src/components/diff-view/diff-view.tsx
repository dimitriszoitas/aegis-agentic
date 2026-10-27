import { componentToken } from '@/lib/component-design-tokens';
import { useEffect, useId, useRef, useState, type CSSProperties, type HTMLAttributes } from 'react';
import { ArrowDown, ArrowUp, Columns2, List } from '@/components/icon';
import { ChangeSet, type Text } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';
import {
  MergeView,
  getChunks,
  getOriginalDoc,
  goToNextChunk,
  goToPreviousChunk,
  originalDocChangeEffect,
  unifiedMergeView,
  type Chunk,
} from '@codemirror/merge';
import { Button } from '@/components/button';
import { ButtonGroup } from '@/components/button-group';
import { IconButton } from '@/components/icon-button';
import {
  codeDimension,
  createCodeExtensions,
  type CodeLanguage,
} from '@/components/code-editor/code-theme';
import { cn } from '@/lib/utils';
import { useInputFocusModality } from '@/lib/use-input-focus';
import './diff-view.css';

export type DiffMode = 'split' | 'unified';
export interface DiffViewProps extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'onChange'> {
  original: string;
  modified: string;
  language?: CodeLanguage;
  label?: string;
  originalLabel?: string;
  modifiedLabel?: string;
  mode?: DiffMode;
  defaultMode?: DiffMode;
  onModeChange?: (mode: DiffMode) => void;
  readOnly?: boolean;
  onModifiedChange?: (value: string) => void;
  collapseUnchanged?: boolean;
  /** Scroll the editor to the first change without moving keyboard focus. */
  focusFirstChange?: boolean;
  /** Marks provenance separately from green additions and red removals. */
  modifiedIntent?: 'default' | 'ai';
  wrapLines?: boolean;
  minHeight?: number | string;
  maxHeight?: number | string;
  showModeToggle?: boolean;
}
type MountedDiff = { mode: 'split'; merge: MergeView } | { mode: 'unified'; view: EditorView };
interface ChangeSummary {
  sections: number;
  added: number;
  removed: number;
}
function summarizeChanges(current: MountedDiff): ChangeSummary {
  const chunks: readonly Chunk[] =
    current.mode === 'split' ? current.merge.chunks : (getChunks(current.view.state)?.chunks ?? []);
  const original =
    current.mode === 'split' ? current.merge.a.state.doc : getOriginalDoc(current.view.state);
  const modified = current.mode === 'split' ? current.merge.b.state.doc : current.view.state.doc;
  const lines = (doc: Text, from: number, to: number) => {
    const value = doc.sliceString(from, Math.min(to, doc.length));
    return value ? value.split('\n').length - Number(value.endsWith('\n')) : 0;
  };
  return {
    sections: chunks.length,
    added: chunks.reduce((sum, chunk) => sum + lines(modified, chunk.fromB, chunk.toB), 0),
    removed: chunks.reduce((sum, chunk) => sum + lines(original, chunk.fromA, chunk.toA), 0),
  };
}
function revealFirstChange(current: MountedDiff) {
  const view = current.mode === 'split' ? current.merge.b : current.view;
  const first = getChunks(view.state)?.chunks[0];
  if (!first) return;
  const position = Math.min(first.fromB, view.state.doc.length);
  const scroller = current.mode === 'split' ? current.merge.dom : view.dom;
  view.dispatch({ selection: { anchor: position } });
  view.requestMeasure({
    read: () =>
      view.documentTop -
      scroller.getBoundingClientRect().top +
      scroller.scrollTop +
      view.lineBlockAt(position).top -
      48,
    write: (top) => {
      scroller.scrollTop = Math.max(0, top);
    },
  });
}

// CodeMirror's collapsed-context widgets are clickable divs; give them keyboard parity.
const accessibleCollapsedContext = ViewPlugin.fromClass(
  class {
    private observer: MutationObserver;
    constructor(private view: EditorView) {
      this.observer = new MutationObserver(() => this.enhance());
      this.observer.observe(view.contentDOM, { childList: true, subtree: true });
      view.dom.addEventListener('keydown', this.onKeyDown, true);
      queueMicrotask(() => this.enhance());
    }
    enhance() {
      for (const element of this.view.contentDOM.querySelectorAll<HTMLElement>(
        '.cm-collapsedLines',
      )) {
        element.setAttribute('role', 'button');
        element.tabIndex = 0;
        element.setAttribute('aria-label', `Expand ${element.textContent ?? 'unchanged lines'}`);
      }
    }
    onKeyDown = (event: KeyboardEvent) => {
      const element =
        event.target instanceof HTMLElement
          ? event.target.closest<HTMLElement>('.cm-collapsedLines')
          : null;
      if (!element || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
      event.stopPropagation();
      element.click();
      this.view.focus();
    };
    destroy() {
      this.observer.disconnect();
      this.view.dom.removeEventListener('keydown', this.onKeyDown, true);
    }
  },
);

/** Original is always read-only. Inline accept/reject actions belong to the surrounding review. */
export function DiffView({
  original,
  modified,
  language = 'yaml',
  label = 'Document changes',
  originalLabel = 'Original',
  modifiedLabel = 'Proposed',
  mode,
  defaultMode = 'split',
  onModeChange,
  readOnly = true,
  onModifiedChange,
  collapseUnchanged = false,
  focusFirstChange = false,
  modifiedIntent = 'default',
  wrapLines = false,
  minHeight = componentToken('code-min-height'),
  maxHeight = componentToken('diff-max-height'),
  showModeToggle = true,
  className,
  style,
  ...props
}: DiffViewProps) {
  useInputFocusModality();
  const [internalMode, setInternalMode] = useState(defaultMode);
  const activeMode = mode ?? internalMode;
  const [summary, setSummary] = useState<ChangeSummary>({ sections: 0, added: 0, removed: 0 });
  const changeCount = summary.sections;
  const [contextCollapsed, setContextCollapsed] = useState(collapseUnchanged);
  const host = useRef<HTMLDivElement>(null);
  const mounted = useRef<MountedDiff | null>(null);
  const externalUpdate = useRef(false);
  const snapshot = useRef({ original, modified, onModifiedChange });
  const titleId = useId();
  const helpId = useId();
  useEffect(() => {
    snapshot.current = { original, modified, onModifiedChange };
  }, [original, modified, onModifiedChange]);
  useEffect(() => setContextCollapsed(collapseUnchanged), [collapseUnchanged]);
  useEffect(() => {
    if (!host.current) return;
    const countChanges = () => {
      const current = mounted.current;
      if (current) setSummary(summarizeChanges(current));
    };
    const extension = (name: string, locked: boolean) => [
      ...createCodeExtensions({
        language,
        label: name,
        readOnly: locked,
        wrapLines,
        describedBy: helpId,
      }),
      accessibleCollapsedContext,
    ];
    const listen = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        if (!externalUpdate.current)
          snapshot.current.onModifiedChange?.(update.state.doc.toString());
        queueMicrotask(countChanges);
      }
    });
    const collapsed = contextCollapsed ? { margin: 3, minSize: 6 } : undefined;
    if (activeMode === 'split') {
      const merge = new MergeView({
        parent: host.current,
        a: {
          doc: snapshot.current.original,
          extensions: extension(`${label}: ${originalLabel}`, true),
        },
        b: {
          doc: snapshot.current.modified,
          extensions: [...extension(`${label}: ${modifiedLabel}`, readOnly), listen],
        },
        highlightChanges: true,
        gutter: true,
        collapseUnchanged: collapsed,
      });
      merge.dom.tabIndex = 0;
      merge.dom.setAttribute('role', 'region');
      merge.dom.setAttribute('aria-label', 'Scrollable side-by-side comparison');
      mounted.current = { mode: 'split', merge };
    } else {
      const view = new EditorView({
        parent: host.current,
        doc: snapshot.current.modified,
        extensions: [
          ...extension(`${label}: unified comparison`, readOnly),
          unifiedMergeView({
            original: snapshot.current.original,
            mergeControls: false,
            highlightChanges: true,
            gutter: true,
            collapseUnchanged: collapsed,
          }),
          listen,
        ],
      });
      mounted.current = { mode: 'unified', view };
    }
    countChanges();
    if (focusFirstChange && mounted.current) revealFirstChange(mounted.current);
    return () => {
      const current = mounted.current;
      mounted.current = null;
      if (current?.mode === 'split') current.merge.destroy();
      else current?.view.destroy();
    };
  }, [
    activeMode,
    language,
    label,
    originalLabel,
    modifiedLabel,
    readOnly,
    wrapLines,
    contextCollapsed,
    focusFirstChange,
    helpId,
  ]);
  useEffect(() => {
    const current = mounted.current;
    if (!current) return;
    const replace = (view: EditorView, value: string) => {
      if (view.state.doc.toString() !== value)
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
    };
    externalUpdate.current = true;
    try {
      if (current.mode === 'split') {
        replace(current.merge.a, original);
        replace(current.merge.b, modified);
      } else {
        const previous = getOriginalDoc(current.view.state);
        if (previous.toString() !== original)
          current.view.dispatch({
            effects: originalDocChangeEffect(
              current.view.state,
              ChangeSet.of({ from: 0, to: previous.length, insert: original }, previous.length),
            ),
          });
        replace(current.view, modified);
      }
    } finally {
      externalUpdate.current = false;
    }
    setSummary(summarizeChanges(current));
    if (focusFirstChange) revealFirstChange(current);
  }, [original, modified, activeMode, focusFirstChange]);
  const navigate = (direction: 'previous' | 'next') => {
    const current = mounted.current;
    const view = current?.mode === 'split' ? current.merge.b : current?.view;
    if (view) {
      (direction === 'next' ? goToNextChunk : goToPreviousChunk)(view);
      view.focus();
    }
  };
  return (
    <section
      {...props}
      className={cn('aegis-diff-view', className)}
      data-mode={activeMode}
      aria-labelledby={titleId}
      style={
        {
          '--diff-min-height': codeDimension(minHeight),
          '--diff-max-height': codeDimension(maxHeight),
          ...style,
        } as CSSProperties
      }
    >
      <div className="aegis-diff-toolbar">
        <div className="aegis-diff-title">
          <h3 id={titleId}>{label}</h3>
          <span role="status">
            {changeCount === 0
              ? 'No changes'
              : `${changeCount} changed ${changeCount === 1 ? 'section' : 'sections'}`}
          </span>
        </div>
        <div className="aegis-diff-tools">
          <Button
            size="sm"
            emphasis="ghost"
            aria-pressed={contextCollapsed}
            onClick={() => setContextCollapsed((value) => !value)}
          >
            {contextCollapsed ? 'Show all lines' : 'Focus changes'}
          </Button>
          <ButtonGroup aria-label="Change navigation">
            <IconButton
              aria-label="Previous change"
              size="sm"
              emphasis="ghost"
              disabled={!changeCount}
              onClick={() => navigate('previous')}
            >
              <ArrowUp size={componentToken('code.icon-sm')} />
            </IconButton>
            <IconButton
              aria-label="Next change"
              size="sm"
              emphasis="ghost"
              disabled={!changeCount}
              onClick={() => navigate('next')}
            >
              <ArrowDown size={componentToken('code.icon-sm')} />
            </IconButton>
          </ButtonGroup>
          {showModeToggle && (
            <ButtonGroup aria-label="Diff layout">
              {(
                [
                  { value: 'split', label: 'Split view', icon: Columns2 },
                  { value: 'unified', label: 'Unified view', icon: List },
                ] as const
              ).map(({ value, label: name, icon: Icon }) => (
                <Button
                  key={value}
                  size="sm"
                  emphasis={activeMode === value ? 'secondary' : 'ghost'}
                  intent={activeMode === value ? 'function' : 'default'}
                  aria-pressed={activeMode === value}
                  leadingIcon={<Icon size={componentToken('code.icon-sm')} />}
                  onClick={() => {
                    if (mode === undefined) setInternalMode(value);
                    onModeChange?.(value);
                  }}
                >
                  {name}
                </Button>
              ))}
            </ButtonGroup>
          )}
        </div>
      </div>
      <p className="sr-only" id={helpId}>
        Comparison of {originalLabel} and {modifiedLabel}. {summary.removed} removed lines and{' '}
        {summary.added} added lines. Red minus markers identify removed lines; green plus markers
        identify added lines. Stronger inline highlights mark the changed text within each line. Tab
        moves out of the code. Use the previous and next change buttons to navigate.
      </p>
      <div className="aegis-diff-legend">
        <div>
          <span>{originalLabel}</span>
          <span className="aegis-diff-change-count aegis-diff-removed">
            − {summary.removed} removed
          </span>
        </div>
        <div>
          <span className={cn(modifiedIntent === 'ai' && 'aegis-diff-ai-label')}>
            {modifiedLabel}
            {!readOnly && ' · Editable'}
          </span>
          <span className="aegis-diff-change-count aegis-diff-added">+ {summary.added} added</span>
        </div>
      </div>
      <div ref={host} className="aegis-diff-host" />
    </section>
  );
}
