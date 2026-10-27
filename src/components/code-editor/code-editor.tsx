import { componentToken } from '@/lib/component-design-tokens';
import {
  forwardRef,
  useCallback,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { foldAll, unfoldAll } from '@codemirror/language';
import { type EditorView, type ViewUpdate } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import { cn } from '@/lib/utils';
import { useInputFocusModality } from '@/lib/use-input-focus';
import {
  codeDimension,
  createCodeExtensions,
  type CodeLanguage,
  type HighlightedLineRange,
} from './code-theme';
import './code-editor.css';

export type { CodeLanguage, HighlightedLineRange } from './code-theme';
export interface CodeEditorHandle {
  focus: () => void;
  foldAll: () => void;
  unfoldAll: () => void;
  getView: () => EditorView | undefined;
}
export interface CodeEditorProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue' | 'children'
> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  language?: CodeLanguage;
  /** Accessible name of the editing surface. */
  label?: string;
  readOnly?: boolean;
  lineNumbers?: boolean;
  folding?: boolean;
  wrapLines?: boolean;
  height?: number | string;
  minHeight?: number | string;
  maxHeight?: number | string;
  placeholder?: string;
  autoFocus?: boolean;
  /** Custom content at the left of the status bar, or false to hide the bar. */
  statusBar?: ReactNode | false;
  highlightedLines?: readonly HighlightedLineRange[];
  extensions?: Extension[];
}
const emptyRanges: readonly HighlightedLineRange[] = [];
const emptyExtensions: Extension[] = [];

/** Token-themed CodeMirror. Tab and Shift+Tab always move to the surrounding interface. */
export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(function CodeEditor(
  {
    value,
    defaultValue = '',
    onValueChange,
    language = 'yaml',
    label = 'Code editor',
    readOnly = false,
    lineNumbers = true,
    folding = true,
    wrapLines = false,
    height,
    minHeight = componentToken('code-min-height'),
    maxHeight = componentToken('code-max-height'),
    placeholder,
    autoFocus = false,
    statusBar,
    highlightedLines = emptyRanges,
    extensions = emptyExtensions,
    className,
    'aria-describedby': describedBy,
    ...props
  },
  forwardedRef,
) {
  useInputFocusModality();
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const text = value ?? internalValue;
  const instructionsId = useId();
  const cmExtensions = useMemo(
    () => [
      ...createCodeExtensions({
        language,
        label,
        readOnly,
        lineNumbers,
        folding,
        wrapLines,
        highlightedLines,
        describedBy: [describedBy, instructionsId].filter(Boolean).join(' '),
      }),
      ...extensions,
    ],
    [
      language,
      label,
      readOnly,
      lineNumbers,
      folding,
      wrapLines,
      highlightedLines,
      describedBy,
      instructionsId,
      extensions,
    ],
  );
  useImperativeHandle(
    forwardedRef,
    () => ({
      focus: () => editorRef.current?.view?.focus(),
      foldAll: () => {
        if (editorRef.current?.view) foldAll(editorRef.current.view);
      },
      unfoldAll: () => {
        if (editorRef.current?.view) unfoldAll(editorRef.current.view);
      },
      getView: () => editorRef.current?.view,
    }),
    [],
  );
  const change = useCallback(
    (next: string) => {
      if (value === undefined) setInternalValue(next);
      onValueChange?.(next);
    },
    [value, onValueChange],
  );
  const update = useCallback((event: ViewUpdate) => {
    if (!event.selectionSet && !event.docChanged) return;
    const position = event.state.selection.main.head;
    const line = event.state.doc.lineAt(position);
    setCursor((previous) =>
      previous.line === line.number && previous.column === position - line.from + 1
        ? previous
        : { line: line.number, column: position - line.from + 1 },
    );
  }, []);
  return (
    <div
      {...props}
      className={cn('aegis-code-editor', className)}
      data-readonly={readOnly || undefined}
    >
      <p id={instructionsId} className="sr-only">
        {readOnly ? 'Read-only code. ' : ''}Tab moves to the next control. Shift+Tab moves to the
        previous control.
        {folding ? ' Use Control+Alt+[ to fold all sections and Control+Alt+] to unfold.' : ''}
      </p>
      <CodeMirror
        ref={editorRef}
        value={text}
        onChange={change}
        onUpdate={update}
        extensions={cmExtensions}
        theme="none"
        basicSetup={false}
        indentWithTab={false}
        readOnly={readOnly}
        editable={!readOnly}
        height={codeDimension(height)}
        minHeight={codeDimension(minHeight)}
        maxHeight={codeDimension(maxHeight)}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
      {statusBar !== false && (
        <div className="aegis-code-status">
          <span>
            {statusBar ?? (
              <>
                {language.toUpperCase()}
                {readOnly ? ' · Read only' : ''}
              </>
            )}
          </span>
          <span>
            Ln {cursor.line}, Col {cursor.column}
            <span className="aegis-code-status-divider" aria-hidden="true">
              ·
            </span>
            {text.split('\n').length} lines
          </span>
        </div>
      )}
    </div>
  );
});
