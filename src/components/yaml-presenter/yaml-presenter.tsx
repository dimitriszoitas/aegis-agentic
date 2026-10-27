import { componentToken } from '@/lib/component-design-tokens';
import { useId, useRef, type HTMLAttributes } from 'react';
import { ChevronsDownUp, ChevronsUpDown, FileCode2 } from '@/components/icon';
import {
  CodeEditor,
  type CodeEditorHandle,
  type HighlightedLineRange,
} from '@/components/code-editor';
import { CopyButton } from '@/components/copy-button';
import { IconButton } from '@/components/icon-button';
import { cn } from '@/lib/utils';
import './yaml-presenter.css';

export interface YamlPresenterProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  value: string;
  filename?: string;
  label?: string;
  highlightedLines?: readonly HighlightedLineRange[];
  minHeight?: number | string;
  maxHeight?: number | string;
  wrapLines?: boolean;
  onCopy?: () => void;
}

export function YamlPresenter({
  value,
  filename = 'config.yaml',
  label,
  highlightedLines,
  minHeight = componentToken('yaml-min-height'),
  maxHeight = componentToken('code-max-height'),
  wrapLines = false,
  onCopy,
  className,
  ...props
}: YamlPresenterProps) {
  const editor = useRef<CodeEditorHandle>(null);
  const titleId = useId();
  const highlightsId = useId();
  return (
    <section {...props} className={cn('aegis-yaml-presenter', className)} aria-labelledby={titleId}>
      <div className="aegis-yaml-header">
        <span className="aegis-yaml-filename" id={titleId}>
          <FileCode2 size={componentToken('code.icon-inline')} aria-hidden="true" />
          <span>{filename}</span>
        </span>
        <div className="aegis-yaml-actions" role="group" aria-label="YAML actions">
          <IconButton
            size="sm"
            emphasis="ghost"
            aria-label="Fold all YAML sections"
            onClick={() => editor.current?.foldAll()}
          >
            <ChevronsDownUp size={componentToken('code.icon-inline')} />
          </IconButton>
          <IconButton
            size="sm"
            emphasis="ghost"
            aria-label="Unfold all YAML sections"
            onClick={() => editor.current?.unfoldAll()}
          >
            <ChevronsUpDown size={componentToken('code.icon-inline')} />
          </IconButton>
          <CopyButton size="sm" text={value} aria-label={`Copy ${filename}`} onCopy={onCopy} />
        </div>
      </div>
      {highlightedLines?.length ? (
        <p id={highlightsId} className="sr-only">
          Highlighted lines:{' '}
          {highlightedLines
            .map((range) =>
              range.from === range.to ? range.from : `${range.from} through ${range.to}`,
            )
            .join(', ')}
          .
        </p>
      ) : null}
      <CodeEditor
        ref={editor}
        value={value}
        language="yaml"
        label={label ?? `${filename} source`}
        readOnly
        statusBar={false}
        highlightedLines={highlightedLines}
        minHeight={minHeight}
        maxHeight={maxHeight}
        wrapLines={wrapLines}
        aria-describedby={highlightedLines?.length ? highlightsId : undefined}
      />
    </section>
  );
}
