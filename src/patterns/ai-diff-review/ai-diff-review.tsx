import { componentToken } from '@/lib/component-design-tokens';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { Check, CheckCheck, X } from '@/components/icon';
import { AiCard } from '@/components/ai-card';
import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { DiffView, type DiffViewProps, type DiffMode } from '@/components/diff-view';
import { cn } from '@/lib/utils';
import './ai-diff-review.css';

export type AiReviewStatus = 'pending' | 'approved' | 'rejected';
export interface AiReviewActionContext {
  signal: AbortSignal;
  original: string;
  proposed: string;
}
export interface AiDiffReviewProps extends Omit<
  HTMLAttributes<HTMLElement>,
  'children' | 'onChange'
> {
  original: string;
  proposed: string;
  summary: ReactNode;
  provenance?: ReactNode;
  documentName?: string;
  language?: DiffViewProps['language'];
  reviewer?: string;
  confidence?: 'high' | 'medium' | 'low';
  onApprove?: (content: string, context: AiReviewActionContext) => void | Promise<void>;
  onReject?: (context: AiReviewActionContext) => void | Promise<void>;
  /** External review state. A document change always requires a fresh review. */
  status?: AiReviewStatus;
  onStatusChange?: (status: AiReviewStatus) => void;
  reviewedAt?: Date | number;
  now?: Date | number;
  disabled?: boolean;
  defaultMode?: DiffMode;
  maxHeight?: number | string;
}
interface ReviewRecord {
  revision: string;
  status: AiReviewStatus;
  action?: 'approve' | 'reject';
  timestamp?: number;
  error?: string;
}

/** Consequential changes require an explicit click; stale async completions cannot approve a new proposal. */
export function AiDiffReview({
  original,
  proposed,
  summary,
  provenance = 'Generated from the supplied configuration and review context.',
  documentName = 'Configuration',
  language = 'yaml',
  reviewer = 'You',
  confidence = 'medium',
  onApprove,
  onReject,
  status,
  onStatusChange,
  reviewedAt,
  now,
  disabled = false,
  defaultMode = 'split',
  maxHeight = componentToken('ai-assistance.ai-diff-max-height'),
  className,
  ...props
}: AiDiffReviewProps) {
  const revision = JSON.stringify([original, proposed]);
  const [record, setRecord] = useState<ReviewRecord>(() => ({
    revision,
    status: status ?? 'pending',
    timestamp: status && status !== 'pending' ? +(reviewedAt ?? now ?? Date.now()) : undefined,
  }));
  const previous = useRef({ revision, status });
  const request = useRef<AbortController | null>(null);
  const headingId = useId();
  const auditRef = useRef<HTMLParagraphElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const changedDocument = previous.current.revision !== revision;
    const changedStatus = previous.current.status !== status;
    previous.current = { revision, status };
    if (!changedDocument && !changedStatus) return;
    request.current?.abort();
    request.current = null;
    const nextStatus = changedDocument ? 'pending' : (status ?? 'pending');
    setRecord({
      revision,
      status: nextStatus,
      timestamp: nextStatus !== 'pending' ? +(reviewedAt ?? now ?? Date.now()) : undefined,
    });
    if (changedDocument) onStatusChange?.('pending');
    // Proposal changes invalidate local approval, including when a stale approved prop is retained.
  }, [revision, status, reviewedAt, now, onStatusChange]);
  useEffect(
    () => () => {
      request.current?.abort();
    },
    [],
  );
  const current = record.revision === revision ? record : { revision, status: 'pending' as const };
  const pending = Boolean(current.action);
  const canReview = !disabled && !pending && current.status === 'pending' && original !== proposed;
  const decide = async (action: 'approve' | 'reject') => {
    if (!canReview || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setRecord({ revision, status: 'pending', action });
    try {
      const context = { signal: controller.signal, original, proposed };
      if (action === 'approve') await onApprove?.(proposed, context);
      else await onReject?.(context);
      if (controller.signal.aborted || request.current !== controller) return;
      const next = action === 'approve' ? 'approved' : 'rejected';
      setRecord({ revision, status: next, timestamp: +(now ?? Date.now()) });
      request.current = null;
      onStatusChange?.(next);
      requestAnimationFrame(() => auditRef.current?.focus());
    } catch (error) {
      if (controller.signal.aborted || request.current !== controller) return;
      setRecord({
        revision,
        status: 'pending',
        error: `Couldn’t ${action} this proposal. ${error instanceof Error ? error.message : 'Please try again.'}`,
      });
      requestAnimationFrame(() =>
        footerRef.current
          ?.querySelector<HTMLButtonElement>(`[data-review-action="${action}"]`)
          ?.focus(),
      );
    } finally {
      if (request.current === controller) request.current = null;
    }
  };
  const timestamp =
    current.timestamp !== undefined
      ? new Intl.DateTimeFormat('en-GB', {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: 'UTC',
        }).format(current.timestamp)
      : '';
  return (
    <section
      {...props}
      className={cn('aegis-ai-diff-review', className)}
      aria-labelledby={headingId}
    >
      <div className="aegis-ai-review-heading">
        <h2 id={headingId}>Review suggested changes</h2>
        <p>{documentName}</p>
      </div>
      <AiCard title="Proposed change summary" confidence={confidence} provenance={provenance}>
        {summary}
      </AiCard>
      <DiffView
        original={original}
        modified={proposed}
        language={language}
        label={`${documentName} changes`}
        originalLabel="Current configuration"
        modifiedLabel="AI proposal"
        modifiedIntent="ai"
        readOnly
        collapseUnchanged
        focusFirstChange
        defaultMode={defaultMode}
        maxHeight={maxHeight}
      />
      {current.error && (
        <Banner intent="destroy" title="Review action failed">
          {current.error}
        </Banner>
      )}
      <div ref={footerRef} className="aegis-ai-review-footer" aria-busy={pending || undefined}>
        {current.status === 'pending' ? (
          <>
            <p className="aegis-ai-review-guidance">
              {original === proposed
                ? 'The proposal matches the current configuration. There are no changes to approve.'
                : 'Review the proposed document before approving this change.'}
            </p>
            <div className="aegis-ai-review-actions">
              <Button
                data-review-action="reject"
                emphasis="ghost"
                leadingIcon={<X size={componentToken('ai-assistance.icon-md')} />}
                disabled={!canReview}
                loading={current.action === 'reject'}
                onClick={() => {
                  void decide('reject');
                }}
              >
                {current.action === 'reject' ? 'Rejecting…' : 'Reject'}
              </Button>
              <Button
                data-review-action="approve"
                intent="function"
                leadingIcon={<Check size={componentToken('ai-assistance.icon-md')} />}
                disabled={!canReview}
                loading={current.action === 'approve'}
                onClick={() => {
                  void decide('approve');
                }}
              >
                {current.action === 'approve' ? 'Approving…' : 'Approve changes'}
              </Button>
            </div>
          </>
        ) : (
          <p
            ref={auditRef}
            className="aegis-ai-review-audit"
            role="status"
            tabIndex={-1}
            data-status={current.status}
          >
            {current.status === 'approved' ? (
              <CheckCheck size={componentToken('ai-assistance.icon-md')} aria-hidden="true" />
            ) : (
              <X size={componentToken('ai-assistance.icon-md')} aria-hidden="true" />
            )}
            <span>
              {current.status === 'approved' ? 'Approved' : 'Rejected'} by {reviewer} · {timestamp}{' '}
              UTC
              {current.status === 'rejected' && (
                <small>The current configuration was kept unchanged.</small>
              )}
            </span>
          </p>
        )}
      </div>
    </section>
  );
}
