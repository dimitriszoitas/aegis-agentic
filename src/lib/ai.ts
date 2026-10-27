export type AiContextKind = 'record' | 'event' | 'config' | 'scope';
export interface AiContextItem {
  id: string;
  label: string;
  kind: AiContextKind;
  description?: string;
  href?: string;
}
export interface AiToolStep {
  id: string;
  label: string;
  status: 'pending' | 'working' | 'complete' | 'error';
}
export type AiFeedback = 'helpful' | 'unhelpful';
export interface AiMessageData {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status: 'streaming' | 'complete' | 'stopped' | 'error';
  context: AiContextItem[];
  steps: AiToolStep[];
  citations: AiContextItem[];
  timestamp: string;
  feedback?: AiFeedback;
  error?: string;
  provenance?: string;
}
export interface AiRequest {
  /** A new id starts a new request; a repeated id is not submitted again. */
  id: string;
  prompt: string;
  context?: AiContextItem[];
}
export type AiStreamEvent =
  | { type: 'step'; step: AiToolStep }
  | { type: 'token'; text: string }
  | { type: 'citation'; citation: AiContextItem }
  | { type: 'complete' };
export interface AiStreamOptions {
  signal?: AbortSignal;
  delayMs?: number;
}
export type AiStreamFactory = (
  request: AiRequest,
  options?: AiStreamOptions,
) => AsyncIterable<AiStreamEvent>;

function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Generation was stopped.', 'AbortError');
}
function pause(milliseconds: number, signal?: AbortSignal): Promise<void> {
  checkAbort(signal);
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException('Generation was stopped.', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, milliseconds);
    signal?.addEventListener('abort', abort, { once: true });
  });
}
const markdownLabel = (label: string) => label.replace(/[\\`*_{}[\]<>]/g, '\\$&');

/** Deterministic local demo responses reference only context supplied by the caller. */
export async function* streamMockResponse(
  request: AiRequest,
  { signal, delayMs = 22 }: AiStreamOptions = {},
): AsyncGenerator<AiStreamEvent> {
  const delay = Number.isFinite(delayMs) ? Math.max(0, Math.min(1000, delayMs)) : 22;
  const context = [
    ...new Map((request.context ?? []).map((item) => [item.id, { ...item }])).values(),
  ];
  const evidence = context.filter((item) => item.kind !== 'scope');
  const scope = context.filter((item) => item.kind === 'scope');
  const configRequest = evidence.some((item) => item.kind === 'config');
  const steps = [
    {
      id: 'scope',
      label: `Scoped the request to ${context.length} supplied ${context.length === 1 ? 'reference' : 'references'}`,
    },
    {
      id: 'review',
      label: configRequest
        ? 'Prepared a configuration review from supplied context'
        : 'Organized the supplied record details',
    },
  ];
  for (const step of steps) {
    checkAbort(signal);
    yield { type: 'step', step: { ...step, status: 'working' } };
    await pause(delay * 6, signal);
    yield { type: 'step', step: { ...step, status: 'complete' } };
  }
  const references = context
    .slice(0, 8)
    .map(
      (item) =>
        `- **${markdownLabel(item.label)}** (${markdownLabel(item.id)})${item.description ? `: ${markdownLabel(item.description)}` : ''}`,
    )
    .join('\n');
  const scopeLine = scope.length
    ? `\n\nScope: ${scope.map((item) => markdownLabel(item.label)).join(' · ')}.`
    : '';
  const content =
    context.length === 0
      ? '## Add context to the request\n\nNo records, configuration, or workspace summary are attached. Attach relevant context so the response can refer to real labels and details. This local interaction demo does not fetch external information or make changes.'
      : `## ${configRequest ? 'Configuration review' : 'Review the supplied context'}\n\nRequest: ${markdownLabel(request.prompt)}${scopeLine}\n\n${references}${context.length > 8 ? `\n- Plus ${context.length - 8} additional supplied references.` : ''}\n\n${
          configRequest
            ? 'Review the proposed configuration against its stated purpose, validate the supported fields, and inspect the diff before approving a change.'
            : 'These are the details supplied for this request. Open the linked records to review their current state and decide whether any follow-up is needed.'
        }\n\nThis is a deterministic local demonstration, not an independent analysis. It has not fetched additional data or changed any records. **Changes require explicit review and approval.**`;
  for (const text of content.match(/\S+\s*/g) ?? []) {
    await pause(delay, signal);
    checkAbort(signal);
    yield { type: 'token', text };
  }
  for (const citation of evidence) {
    checkAbort(signal);
    yield { type: 'citation', citation };
  }
  checkAbort(signal);
  yield { type: 'complete' };
}
