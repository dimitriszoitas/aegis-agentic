import { componentToken } from '@/lib/component-design-tokens';
import { EditorState, type Extension } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';
import { codeFolding, HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { yaml } from '@codemirror/lang-yaml';
import { json } from '@codemirror/lang-json';
import { basicSetup } from '@uiw/react-codemirror';
import { pythonLanguage, sqlLanguage } from './source-languages';

export type CodeLanguage = 'yaml' | 'json' | 'sql' | 'python';
export interface HighlightedLineRange {
  /** Inclusive, one-based line numbers. */ from: number;
  to: number;
}
export interface CodeExtensionOptions {
  language: CodeLanguage;
  label: string;
  describedBy?: string;
  readOnly?: boolean;
  lineNumbers?: boolean;
  folding?: boolean;
  wrapLines?: boolean;
  highlightedLines?: readonly HighlightedLineRange[];
}

/** CSS variables resolve at paint time, so a theme switch preserves selection and undo history. */
export const codeTheme: Extension = [
  EditorView.theme({
    '&': {
      color: 'var(--group-code-code-editor-color-content-primary)',
      backgroundColor: 'var(--group-code-code-editor-color-surface-surface)',
      fontSize: 'var(--group-code-code-editor-font-size-body)',
    },
    '&.cm-focused': { outline: 'none' },
    '.cm-scroller': {
      fontFamily: 'var(--group-code-code-editor-font-family-code)',
      lineHeight: componentToken('code-line-height'),
      overflow: 'auto',
    },
    '.cm-content': {
      padding: 'var(--group-code-code-editor-space-padding-regular) 0',
      caretColor: 'var(--group-code-code-editor-color-content-primary)',
    },
    '.cm-line': { padding: '0 var(--group-code-code-editor-space-4)' },
    '.cm-content:focus-visible': { outline: 'none' },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: 'var(--group-code-code-editor-color-content-primary)',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--group-code-code-editor-color-surface-canvas)',
      color: 'var(--group-code-code-editor-color-content-secondary)',
      borderRight: `${componentToken('code-border-width')} solid var(--group-code-code-editor-color-border-subtle)`,
    },
    '.cm-gutterElement': { padding: '0 var(--group-code-code-editor-space-gap-compact)' },
    '.cm-activeLine': { backgroundColor: 'var(--group-code-code-editor-color-bg-hover)' },
    '.cm-activeLineGutter': {
      backgroundColor: 'var(--group-code-code-editor-color-bg-hover)',
      color: 'var(--group-code-code-editor-color-content-primary)',
    },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: 'var(--group-code-code-editor-color-action-soft) !important',
    },
    '.cm-selectionMatch': { backgroundColor: 'var(--group-code-code-editor-color-action-soft)' },
    '.cm-matchingBracket': {
      color: 'var(--group-code-code-editor-color-function-fg)',
      backgroundColor: 'var(--group-code-code-editor-color-action-soft)',
      outline: `${componentToken('code-border-width')} solid var(--group-code-code-editor-color-function-border)`,
    },
    '.cm-nonmatchingBracket': { color: 'var(--group-code-code-editor-color-destroy-fg)' },
    '.cm-foldPlaceholder': {
      color: 'var(--group-code-code-editor-color-content-secondary)',
      backgroundColor: 'var(--group-code-code-editor-color-bg-hover)',
      border: `${componentToken('code-border-width')} solid var(--group-code-code-editor-color-border-default)`,
      borderRadius: 'var(--group-code-code-editor-radius-xs)',
      padding: '0 var(--group-code-code-editor-space-1)',
    },
    '.cm-tooltip, .cm-panels': {
      color: 'var(--group-code-code-editor-color-content-primary)',
      backgroundColor: 'var(--group-code-code-editor-color-bg-surface-raised)',
      border: `${componentToken('code-border-width')} solid var(--group-code-code-editor-color-border-default)`,
    },
    '.cm-tooltip': {
      borderRadius: 'var(--group-code-code-editor-radius-border-radius-bold)',
      boxShadow: 'var(--group-code-code-editor-shadow-floating)',
    },
    '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
      color: 'var(--group-code-code-editor-color-function-fg)',
      backgroundColor: 'var(--group-code-code-editor-color-action-soft)',
    },
    '.cm-searchMatch': {
      backgroundColor: 'var(--group-code-code-editor-color-warning-soft)',
      outline: `${componentToken('code-border-width')} solid var(--group-code-code-editor-color-warning-border)`,
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: 'var(--group-code-code-editor-color-action-soft)',
      outline: `${componentToken('code-border-width')} solid var(--group-code-code-editor-color-function-border)`,
    },
    '.cm-search label, .cm-search input, .cm-search button': {
      color: 'var(--group-code-code-editor-color-content-primary)',
      fontFamily: 'var(--group-code-code-editor-font-family-ui)',
    },
    '.cm-textfield, .cm-button': {
      color: 'var(--group-code-code-editor-color-content-primary)',
      background: 'var(--group-code-code-editor-color-surface-surface)',
      border: `${componentToken('code-border-width')} solid var(--group-code-code-editor-color-border-strong)`,
      borderRadius: 'var(--group-code-code-editor-radius-xs)',
    },
    '.cm-placeholder': { color: 'var(--group-code-code-editor-color-content-secondary)' },
    '.aegis-code-highlighted-line': {
      backgroundColor: 'var(--group-code-code-editor-color-action-soft)',
      boxShadow: `inset ${componentToken('code-highlight-width')} 0 var(--group-code-code-editor-color-function-bg)`,
    },
  }),
  syntaxHighlighting(
    HighlightStyle.define([
      {
        tag: [tags.propertyName, tags.attributeName],
        color: 'var(--group-code-code-editor-color-syntax-key)',
      },
      {
        tag: [tags.string, tags.special(tags.string)],
        color: 'var(--group-code-code-editor-color-syntax-string)',
      },
      {
        tag: [tags.number, tags.integer, tags.float],
        color: 'var(--group-code-code-editor-color-syntax-number)',
      },
      {
        tag: [tags.keyword, tags.bool, tags.null, tags.atom, tags.typeName],
        color: 'var(--group-code-code-editor-color-syntax-keyword)',
      },
      {
        tag: [tags.comment, tags.meta],
        color: 'var(--group-code-code-editor-color-content-secondary)',
        fontStyle: 'italic',
      },
      {
        tag: [tags.punctuation, tags.bracket, tags.operator],
        color: 'var(--group-code-code-editor-color-content-secondary)',
      },
      {
        tag: tags.invalid,
        color: 'var(--group-code-code-editor-color-destroy-fg)',
        textDecoration: 'underline',
      },
    ]),
  ),
];

export function createCodeExtensions({
  language,
  label,
  describedBy,
  readOnly = false,
  lineNumbers = true,
  folding = true,
  wrapLines = false,
  highlightedLines = [],
}: CodeExtensionOptions): Extension[] {
  const extensions: Extension[] = [
    basicSetup({
      lineNumbers,
      foldGutter: folding,
      foldKeymap: folding,
      highlightActiveLine: !readOnly,
      highlightActiveLineGutter: false,
      highlightSelectionMatches: false,
      autocompletion: !readOnly,
    }),
    codeTheme,
    language === 'yaml'
      ? yaml()
      : language === 'json'
        ? json()
        : language === 'sql'
          ? sqlLanguage
          : pythonLanguage,
    EditorState.readOnly.of(readOnly),
    EditorView.editable.of(!readOnly),
    EditorView.contentAttributes.of({
      role: 'textbox',
      'aria-label': label,
      'aria-multiline': 'true',
      'aria-readonly': String(readOnly),
      tabindex: '0',
      spellcheck: 'false',
      ...(describedBy ? { 'aria-describedby': describedBy } : {}),
    }),
  ];
  if (wrapLines) extensions.push(EditorView.lineWrapping);
  if (folding)
    extensions.push(
      codeFolding({
        placeholderDOM: (view, unfold) => {
          const button = view.dom.ownerDocument.createElement('button');
          button.type = 'button';
          button.textContent = '…';
          button.className = 'cm-foldPlaceholder';
          button.setAttribute('aria-label', 'Expand folded code');
          button.addEventListener('click', (event) => {
            unfold(event);
            view.focus();
          });
          return button;
        },
      }),
    );
  if (highlightedLines.length)
    extensions.push(
      EditorView.decorations.compute(['doc'], (state) => {
        const lines = new Set<number>();
        for (const range of highlightedLines) {
          if (!Number.isFinite(range.from) || !Number.isFinite(range.to)) continue;
          for (
            let number = Math.max(1, Math.ceil(range.from));
            number <= Math.min(state.doc.lines, Math.floor(range.to));
            number++
          )
            lines.add(number);
        }
        return Decoration.set(
          [...lines]
            .sort((a, b) => a - b)
            .map((number) =>
              Decoration.line({ class: 'aegis-code-highlighted-line' }).range(
                state.doc.line(number).from,
              ),
            ),
        );
      }),
    );
  return extensions;
}

export const codeDimension = (size: number | string | undefined): string | undefined =>
  typeof size === 'number' ? `${size}px` : size;
