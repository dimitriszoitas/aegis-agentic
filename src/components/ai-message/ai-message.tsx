import { componentToken } from '@/lib/component-design-tokens';
import { useState, type ComponentProps, type ReactNode } from 'react';
import Markdown from 'react-markdown';
import {
  Check,
  ChevronDown,
  Circle,
  CircleAlert,
  CircleCheck,
  Copy,
  FileCode2,
  Link2,
  LoaderCircle,
  RefreshCw,
} from '@/components/icon';
import { AiFeedback, AiLabel } from '@/components/ai-card';
import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { IconButton } from '@/components/icon-button';
import { ThinkingIndicator } from '@/components/thinking-indicator';
import { StreamingSkeleton } from '@/components/streaming-skeleton';
import type { AiContextItem, AiMessageData } from '@/lib/ai';
import { cn } from '@/lib/utils';
import './ai-message.css';

export interface AiMessageProps extends ComponentProps<'article'> {
  message: AiMessageData;
  onCitationClick?: (citation: AiContextItem) => void;
  onFeedback?: (feedback: 'helpful' | 'unhelpful') => void;
  onRegenerate?: () => void;
  resultCards?: ReactNode;
}
const stepIcons = {
  pending: Circle,
  working: LoaderCircle,
  complete: CircleCheck,
  error: CircleAlert,
};
const citationIcons = {
  record: FileCode2,
  config: FileCode2,
  event: Link2,
  scope: Link2,
};

/** Plain-text and markdown rendering never runs raw HTML supplied in model output. */
export function AiMessage({
  message,
  onCitationClick,
  onFeedback,
  onRegenerate,
  resultCards,
  className,
  ...props
}: AiMessageProps) {
  const [workingOpen, setWorkingOpen] = useState(message.status === 'streaming');
  const [copyResult, setCopyResult] = useState<{ content: string; state: 'copied' | 'error' }>();
  const copyState = copyResult?.content === message.content ? copyResult.state : 'idle';
  const streaming = message.status === 'streaming';
  const hasWorking = message.steps.some(
    (step) => step.status === 'working' || step.status === 'pending',
  );
  const failed = message.steps.some((step) => step.status === 'error');
  const completedCount = message.steps.filter((step) => step.status === 'complete').length;
  async function copy() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopyResult({ content: message.content, state: 'copied' });
    } catch {
      setCopyResult({ content: message.content, state: 'error' });
    }
  }
  if (message.role === 'user')
    return (
      <article
        {...props}
        aria-label="Your message"
        className={cn('aegis-ai-message', 'aegis-ai-message-user', className)}
      >
        <div className="aegis-ai-user-label">You</div>
        <p>{message.content}</p>
        {message.context.length > 0 && (
          <div className="aegis-ai-evidence" role="group" aria-label="Attached context">
            {message.context.map((item) => (
              <span className="aegis-ai-context-chip" key={item.id}>
                {item.label}
              </span>
            ))}
          </div>
        )}
      </article>
    );
  return (
    <article
      {...props}
      aria-label="Assistant response"
      className={cn('aegis-ai-message', className)}
      data-status={message.status}
    >
      <header className="aegis-ai-message-header">
        <AiLabel />
        {message.provenance && <span className="aegis-ai-provenance">{message.provenance}</span>}
      </header>
      {message.steps.length > 0 && (
        <details
          className="aegis-ai-working"
          open={workingOpen}
          onToggle={(event) => setWorkingOpen(event.currentTarget.open)}
        >
          <summary>
            <span>
              {hasWorking && streaming
                ? 'Working'
                : failed
                  ? 'Review incomplete'
                  : `Reviewed ${completedCount} evidence ${completedCount === 1 ? 'step' : 'steps'}`}
            </span>
            <ChevronDown size={componentToken('ai.icon-sm')} aria-hidden="true" />
          </summary>
          <ol>
            {message.steps.map((step) => {
              const Icon = stepIcons[step.status];
              return (
                <li key={step.id} data-status={step.status}>
                  <Icon size={componentToken('ai.icon-sm')} aria-hidden="true" />
                  <span>{step.label}</span>
                  <span className="sr-only"> — {step.status}</span>
                </li>
              );
            })}
          </ol>
        </details>
      )}
      {streaming && !message.content && (
        <>
          <ThinkingIndicator />
          <StreamingSkeleton />
        </>
      )}
      {message.content && (
        <div className="aegis-ai-markdown" aria-live="off">
          <Markdown
            skipHtml
            allowedElements={[
              'p',
              'br',
              'strong',
              'em',
              'del',
              'ul',
              'ol',
              'li',
              'blockquote',
              'pre',
              'code',
              'a',
              'h1',
              'h2',
              'h3',
              'h4',
              'hr',
            ]}
            components={{ h1: 'h3', h2: 'h3', h3: 'h4', h4: 'h4' }}
          >
            {message.content}
          </Markdown>
          {streaming && <span className="aegis-ai-streaming-caret" aria-hidden="true" />}
        </div>
      )}
      {resultCards && <div className="aegis-ai-result-cards">{resultCards}</div>}
      {message.citations.length > 0 && (
        <div className="aegis-ai-evidence-section">
          <div className="aegis-ai-evidence-label">References</div>
          <div className="aegis-ai-evidence">
            {message.citations.map((citation) => {
              const Icon = citationIcons[citation.kind];
              const content = (
                <>
                  <Icon size={componentToken('ai.icon-xs')} aria-hidden="true" />
                  <span>{citation.label}</span>
                </>
              );
              return onCitationClick ? (
                <button
                  key={citation.id}
                  type="button"
                  className="aegis-ai-evidence-chip"
                  onClick={() => onCitationClick(citation)}
                  aria-label={`Open ${citation.kind}: ${citation.label}`}
                >
                  {content}
                </button>
              ) : citation.href ? (
                <a key={citation.id} className="aegis-ai-evidence-chip" href={citation.href}>
                  {content}
                </a>
              ) : (
                <span key={citation.id} className="aegis-ai-evidence-chip">
                  {content}
                </span>
              );
            })}
          </div>
        </div>
      )}
      {message.status === 'error' && (
        <Banner
          intent="destroy"
          title="Response interrupted"
          action={
            onRegenerate ? (
              <Button size="sm" emphasis="ghost" onClick={onRegenerate}>
                Try again
              </Button>
            ) : undefined
          }
        >
          {message.error ??
            'The response could not finish. Your evidence and partial response are preserved.'}
        </Banner>
      )}
      {message.status === 'stopped' && (
        <p className="aegis-ai-response-note">
          Generation stopped. The partial response is preserved.
        </p>
      )}
      <span role="status" className="sr-only">
        {streaming
          ? 'Generating a response'
          : message.status === 'complete'
            ? 'Response complete'
            : message.status === 'stopped'
              ? 'Generation stopped'
              : 'Response interrupted'}
      </span>
      {!streaming && message.content && (
        <footer className="aegis-ai-message-footer">
          <IconButton
            size="sm"
            emphasis="ghost"
            aria-label={copyState === 'copied' ? 'Response copied' : 'Copy response'}
            onClick={copy}
          >
            {copyState === 'copied' ? (
              <Check size={componentToken('ai.icon-sm')} />
            ) : (
              <Copy size={componentToken('ai.icon-sm')} />
            )}
          </IconButton>
          {copyState === 'copied' && (
            <span role="status" className="aegis-ai-provenance">
              Copied
            </span>
          )}
          <AiFeedback
            feedback={
              message.feedback === 'helpful'
                ? 'positive'
                : message.feedback === 'unhelpful'
                  ? 'negative'
                  : undefined
            }
            onFeedback={(value) => {
              if (value) onFeedback?.(value === 'positive' ? 'helpful' : 'unhelpful');
            }}
            onRegenerate={onRegenerate}
          />
        </footer>
      )}
      {message.status === 'stopped' && !message.content && onRegenerate && (
        <div className="aegis-ai-message-footer">
          <Button
            size="sm"
            emphasis="ghost"
            intent="ai"
            leadingIcon={<RefreshCw size={componentToken('ai.icon-sm')} />}
            onClick={onRegenerate}
          >
            Regenerate response
          </Button>
        </div>
      )}
      {copyState === 'error' && (
        <p className="aegis-ai-copy-error" role="alert">
          Clipboard access was unavailable. Select the response text to copy it.
        </p>
      )}
    </article>
  );
}
