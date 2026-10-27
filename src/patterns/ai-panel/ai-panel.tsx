import { componentToken, useComponentTokenNumbers } from '@/lib/component-design-tokens';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Sparkles } from '@/components/icon';
import { SideSheet } from '@/components/side-sheet';
import { AiMessage } from '@/components/ai-message';
import { Button } from '@/components/button';
import { Tag } from '@/components/tag';
import { PromptInput } from '@/patterns/prompt-input';
import { cn } from '@/lib/utils';
import {
  streamMockResponse,
  type AiContextItem,
  type AiFeedback,
  type AiMessageData,
  type AiRequest,
  type AiStreamFactory,
} from '@/lib/ai';
import './ai-panel.css';

export interface AiPanelProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactElement;
  docked?: boolean;
  /** Resizing preserves the conversation and composer; narrow screens remain viewport-fit. */
  resizable?: boolean;
  size?: 'sm' | 'md' | 'lg';
  title?: string;
  modelLabel?: string;
  scopeLabel?: string;
  context?: AiContextItem[];
  availableContext?: AiContextItem[];
  /** Each unique request id is submitted once when the panel is open. */
  request?: AiRequest;
  initialMessages?: AiMessageData[];
  streamResponse?: AiStreamFactory;
  onEvidenceClick?: (context: AiContextItem) => void;
  onFeedback?: (message: AiMessageData, feedback: AiFeedback) => void;
  renderResultCards?: (message: AiMessageData) => ReactNode;
  className?: string;
}
const emptyContext: AiContextItem[] = [];
function snapshot(context: AiContextItem[]) {
  return [...new Map(context.map((item) => [item.id, { ...item }])).values()];
}
function cloneMessage(message: AiMessageData): AiMessageData {
  return {
    ...message,
    context: snapshot(message.context),
    citations: snapshot(message.citations),
    steps: message.steps.map((step) => ({ ...step })),
  };
}
export function AiPanel({
  open,
  defaultOpen = false,
  onOpenChange,
  trigger,
  docked = false,
  resizable = true,
  size = 'sm',
  title = 'Aegis AI',
  modelLabel = 'Assistant · Local demo',
  scopeLabel = 'Current context',
  context = emptyContext,
  availableContext,
  request,
  initialMessages = [],
  streamResponse = streamMockResponse,
  onEvidenceClick,
  onFeedback,
  renderResultCards,
  className,
}: AiPanelProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = open ?? internalOpen;
  const [messages, setMessages] = useState<AiMessageData[]>(() =>
    initialMessages.map(cloneMessage),
  );
  const [attachedContext, setAttachedContext] = useState(() => snapshot(context));
  const [generating, setGenerating] = useState(false);
  const generation = useRef<{ id: number; controller: AbortController; messageId: string } | null>(
    null,
  );
  const sequence = useRef(0);
  const mounted = useRef(true);
  const handledRequests = useRef(new Set<string>());
  const suppliedContext = useRef(JSON.stringify(context));
  const transcript = useRef<HTMLDivElement>(null);
  const sizes = useComponentTokenNumbers(
    ['ai-assistance.ai-transcript-follow-threshold'],
    transcript,
  );
  const composer = useRef<HTMLDivElement>(null);
  const followTranscript = useRef(true);
  const id = useId();

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      // React StrictMode immediately reconnects effects; abort only a real unmount.
      queueMicrotask(() => {
        if (!mounted.current) {
          generation.current?.controller.abort();
          generation.current = null;
        }
      });
    };
  }, []);
  useEffect(() => {
    const next = JSON.stringify(context);
    if (suppliedContext.current !== next) {
      suppliedContext.current = next;
      setAttachedContext(snapshot(context));
    }
  }, [context]);

  const stop = useCallback(() => {
    const active = generation.current;
    if (!active) return;
    generation.current = null;
    active.controller.abort();
    if (mounted.current) {
      setGenerating(false);
      setMessages((current) =>
        current.map((message) =>
          message.id === active.messageId ? { ...message, status: 'stopped' } : message,
        ),
      );
    }
  }, []);
  const generate = useCallback(
    (prompt: string, sourceContext: AiContextItem[], replaceId?: string) => {
      stop();
      const turnContext = snapshot(sourceContext);
      const nextId = ++sequence.current;
      const messageId = replaceId ?? `${id}-assistant-${nextId}`;
      const controller = new AbortController();
      generation.current = { id: nextId, controller, messageId };
      followTranscript.current = true;
      setGenerating(true);
      const assistant: AiMessageData = {
        id: messageId,
        role: 'assistant',
        content: '',
        status: 'streaming',
        context: turnContext,
        steps: [],
        citations: [],
        timestamp: new Date().toISOString(),
        provenance: modelLabel,
      };
      setMessages((current) =>
        replaceId
          ? current.map((message) => (message.id === replaceId ? assistant : message))
          : [
              ...current,
              {
                id: `${id}-user-${nextId}`,
                role: 'user',
                content: prompt,
                status: 'complete',
                context: turnContext,
                steps: [],
                citations: [],
                timestamp: assistant.timestamp,
              },
              assistant,
            ],
      );
      const isCurrent = () =>
        mounted.current && generation.current?.id === nextId && !controller.signal.aborted;
      const update = (change: (message: AiMessageData) => AiMessageData) => {
        if (!isCurrent()) return;
        setMessages((current) =>
          current.map((message) => (message.id === messageId ? change(message) : message)),
        );
      };
      void (async () => {
        try {
          for await (const event of streamResponse(
            { id: `${id}-request-${nextId}`, prompt, context: snapshot(turnContext) },
            { signal: controller.signal },
          )) {
            if (!isCurrent()) return;
            if (event.type === 'token')
              update((message) => ({ ...message, content: message.content + event.text }));
            else if (event.type === 'step')
              update((message) => ({
                ...message,
                steps: message.steps.some((step) => step.id === event.step.id)
                  ? message.steps.map((step) =>
                      step.id === event.step.id ? { ...event.step } : step,
                    )
                  : [...message.steps, { ...event.step }],
              }));
            else if (event.type === 'citation')
              update((message) => ({
                ...message,
                citations: snapshot([...message.citations, event.citation]),
              }));
            else if (event.type === 'complete') break;
          }
          update((message) => ({ ...message, status: 'complete' }));
        } catch (error) {
          if (!isCurrent()) return;
          update((message) => ({
            ...message,
            status: 'error',
            error:
              error instanceof Error ? error.message : 'The response could not finish. Try again.',
          }));
        } finally {
          if (isCurrent()) {
            generation.current = null;
            setGenerating(false);
          }
        }
      })();
    },
    [id, modelLabel, stop, streamResponse],
  );
  useEffect(() => {
    if (!isOpen) stop();
  }, [isOpen, stop]);
  useEffect(() => {
    if (!isOpen || !request || !request.prompt.trim() || handledRequests.current.has(request.id))
      return;
    handledRequests.current.add(request.id);
    setAttachedContext(snapshot(request.context ?? context));
    generate(request.prompt.trim(), request.context ?? context);
  }, [isOpen, request, context, generate]);
  useLayoutEffect(() => {
    const element = transcript.current;
    if (element && followTranscript.current) element.scrollTop = element.scrollHeight;
  }, [messages, isOpen]);
  function changeOpen(next: boolean) {
    if (!next) stop();
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  }
  function regenerate(message: AiMessageData, index: number) {
    const user = messages
      .slice(0, index)
      .reverse()
      .find((item) => item.role === 'user');
    if (user) {
      generate(user.content, message.context, message.id);
      requestAnimationFrame(() => composer.current?.querySelector('textarea')?.focus());
    }
  }
  return (
    <SideSheet
      open={isOpen}
      onOpenChange={changeOpen}
      trigger={trigger}
      docked={docked}
      resizable={resizable}
      size={size}
      title={
        <span className="aegis-ai-panel-title">
          <Sparkles size={componentToken('ai-assistance.icon-notification')} />
          {title}
        </span>
      }
      description={
        <>
          <span>{modelLabel}</span>
          <span className="aegis-ai-panel-scope">{scopeLabel}</span>
        </>
      }
      closeLabel="Close AI panel"
      className={cn('aegis-ai-panel', className)}
      footer={
        <>
          <div ref={composer}>
            <PromptInput
              generating={generating}
              onStop={stop}
              context={attachedContext}
              availableContext={availableContext ?? context}
              onContextChange={setAttachedContext}
              onSend={(prompt, turnContext) => generate(prompt, turnContext)}
            />
          </div>
          <p className="aegis-ai-panel-disclaimer">Review AI suggestions before taking action.</p>
        </>
      }
    >
      <div className="aegis-ai-panel-context">
        <span>Visible context</span>
        <div role="region" aria-label="Visible context" tabIndex={0}>
          {attachedContext.length ? (
            attachedContext.map((item) => (
              <Tag key={item.id} size="sm">
                {item.label}
              </Tag>
            ))
          ) : (
            <span className="aegis-ai-panel-no-context">No records attached</span>
          )}
        </div>
      </div>
      <div
        ref={transcript}
        className="aegis-ai-transcript"
        role="log"
        aria-label="Assistant conversation"
        aria-live="off"
        tabIndex={0}
        onScroll={(event) => {
          const element = event.currentTarget;
          followTranscript.current =
            element.scrollHeight - element.scrollTop - element.clientHeight <
            sizes['ai-assistance.ai-transcript-follow-threshold'];
        }}
      >
        {messages.length === 0 ? (
          <div className="aegis-ai-panel-empty">
            <Sparkles size={componentToken('ai-assistance.icon-display')} />
            <h3>Start with context</h3>
            <p>Ask for an explanation, a summary, or help planning your next steps.</p>
            <Button
              intent="ai"
              emphasis="secondary"
              size="sm"
              onClick={() => {
                generate('Explain the attached context and suggest next steps.', attachedContext);
                requestAnimationFrame(() => composer.current?.querySelector('textarea')?.focus());
              }}
            >
              Explain attached context
            </Button>
          </div>
        ) : (
          messages.map((message, index) => (
            <AiMessage
              key={message.id}
              message={message}
              onCitationClick={onEvidenceClick}
              onRegenerate={
                !generating && messages.slice(0, index).some((item) => item.role === 'user')
                  ? () => regenerate(message, index)
                  : undefined
              }
              onFeedback={(feedback) => {
                setMessages((current) =>
                  current.map((item) => (item.id === message.id ? { ...item, feedback } : item)),
                );
                onFeedback?.(message, feedback);
              }}
              resultCards={renderResultCards?.(message)}
            />
          ))
        )}
      </div>
    </SideSheet>
  );
}
