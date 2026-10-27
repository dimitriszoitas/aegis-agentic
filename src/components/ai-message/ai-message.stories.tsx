import { useEffect, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { AiMessage } from './ai-message';
import { AiHighlight } from '@/components/ai-card';
import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { streamMockResponse, type AiContextItem, type AiMessageData } from '@/lib/ai';
import { aiTranscripts, referenceTime } from '@/sample-data';

const fixture = aiTranscripts[0];
const evidence: AiContextItem[] = fixture.evidence.map((id) => ({
  id,
  label: id,
  kind: id.startsWith('WF') ? 'config' : 'record',
}));
const completeMessage: AiMessageData = {
  id: 'review',
  role: 'assistant',
  content: fixture.response,
  status: 'complete',
  context: evidence,
  citations: evidence,
  steps: fixture.steps.map((step, index) => ({ ...step, id: `step-${index}` })),
  timestamp: new Date(referenceTime).toISOString(),
  provenance: 'Local demo · Selected record context',
};
const meta = {
  id: 'components-ai-aimessage',
  title: 'Components/AI/AiMessage',
  component: AiMessage,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
  args: { message: completeMessage },
} satisfies Meta<typeof AiMessage>;
export default meta;
function CompleteResponse() {
  const [opened, setOpened] = useState<AiContextItem>();
  const [message, setMessage] = useState(completeMessage);
  return (
    <div className="stack">
      <AiMessage
        message={message}
        onCitationClick={setOpened}
        onFeedback={(feedback) => setMessage((value) => ({ ...value, feedback }))}
        resultCards={
          <AiHighlight confidence="medium" provenance="Reviewer validation needed">
            These records have separate owners. Confirm the intended handoff before combining their
            next steps.
          </AiHighlight>
        }
      />
      {opened && (
        <Banner
          title={`${opened.kind === 'config' ? 'Configuration' : 'Record'} ${opened.id}`}
          onDismiss={() => setOpened(undefined)}
        >
          {opened.description ?? `Review the supplied context for ${opened.label}.`}
        </Banner>
      )}
    </div>
  );
}
export const CompleteWithEvidence: StoryObj<typeof meta> = {
  render: () => <CompleteResponse />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText(`Reviewed ${fixture.steps.length} evidence steps`));
    await expect(canvas.getByText(fixture.steps[0].label)).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: `Open ${evidence[0].kind}: ${evidence[0].label}` }),
    );
    await expect(canvas.getByText(`Record ${evidence[0].id}`)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Helpful response' }));
    await expect(canvas.getByRole('button', { name: 'Helpful response' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  },
};
export const Streaming: StoryObj<typeof meta> = {
  args: {
    message: {
      ...completeMessage,
      status: 'streaming',
      content:
        '## Reviewing the selected evidence\n\nThe supplied project checklist has an **unassigned review**. Confirm the next owner before',
      citations: [],
      steps: [
        { id: 'read', label: 'Read the supplied project checklist', status: 'complete' },
        {
          id: 'compare',
          label: 'Reviewing the owner and due date',
          status: 'working',
        },
        { id: 'summary', label: 'Preparing a review summary', status: 'pending' },
      ],
    },
  },
};
export const Thinking: StoryObj<typeof meta> = {
  args: {
    message: {
      ...completeMessage,
      status: 'streaming',
      content: '',
      citations: [],
      steps: [{ id: 'scope', label: 'Reading the selected record context', status: 'working' }],
    },
  },
};
export const Stopped: StoryObj<typeof meta> = {
  args: {
    message: {
      ...completeMessage,
      status: 'stopped',
      content:
        'The selected activity spans project and workspace records. Compare timestamps and record identifiers before',
      citations: [],
    },
  },
};
function RecoverableResponse({ message: initial }: { message: AiMessageData }) {
  const [message, setMessage] = useState(initial);
  return (
    <AiMessage
      message={message}
      onRegenerate={() => setMessage({ ...completeMessage, id: 'recovered' })}
    />
  );
}
export const Error: StoryObj<typeof meta> = {
  render: (args) => <RecoverableResponse message={args.message} />,
  args: {
    message: {
      ...completeMessage,
      status: 'error',
      error: 'The local response was interrupted. Retry to generate a new summary.',
      content: 'I reviewed the selected record identifiers.',
      steps: [
        { id: 'context', label: 'Read the selected context', status: 'complete' },
        { id: 'summary', label: 'Could not finish the summary', status: 'error' },
      ],
    },
  },
};
export const UserMessage: StoryObj<typeof meta> = {
  args: {
    message: {
      ...completeMessage,
      role: 'user',
      content: 'Review these two records and show the evidence behind your recommendations.',
      steps: [],
      citations: [],
    },
  },
};
function StreamDemo({ slowFirstResponse = false }: { slowFirstResponse?: boolean }) {
  const [message, setMessage] = useState<AiMessageData>();
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const [notice, setNotice] = useState('');
  useEffect(() => () => controller.current?.abort(), []);
  async function start() {
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    setNotice('');
    setMessage({
      ...completeMessage,
      id: `live-${++generation.current}`,
      content: '',
      steps: [],
      citations: [],
      status: 'streaming',
      feedback: undefined,
    });
    try {
      for await (const event of streamMockResponse(
        { id: 'review-live', prompt: 'Review the selected records', context: evidence },
        {
          signal: active.signal,
          delayMs: slowFirstResponse && generation.current === 1 ? 100 : 14,
        },
      )) {
        if (controller.current !== active) break;
        setMessage((current) => {
          if (!current) return current;
          if (event.type === 'token') return { ...current, content: current.content + event.text };
          if (event.type === 'step')
            return {
              ...current,
              steps: [...current.steps.filter((step) => step.id !== event.step.id), event.step],
            };
          if (event.type === 'citation')
            return { ...current, citations: [...current.citations, event.citation] };
          return { ...current, status: 'complete' };
        });
      }
    } catch (error) {
      if (controller.current !== active) return;
      setMessage((current) =>
        current
          ? {
              ...current,
              status: active.signal.aborted ? 'stopped' : 'error',
              error:
                error instanceof globalThis.Error
                  ? error.message
                  : 'Could not finish this response',
            }
          : current,
      );
    }
  }
  return (
    <div className="stack">
      <div className="row">
        <Button intent="ai" onClick={start} disabled={message?.status === 'streaming'}>
          {message ? 'Generate another summary' : 'Generate review summary'}
        </Button>
        {message?.status === 'streaming' && (
          <Button emphasis="ghost" onClick={() => controller.current?.abort()}>
            Stop generation
          </Button>
        )}
      </div>
      {message ? (
        <AiMessage
          key={message.id}
          message={message}
          onRegenerate={start}
          onCitationClick={(item) => setNotice(`Opened ${item.kind} ${item.label}`)}
          onFeedback={(feedback) =>
            setMessage((current) => (current ? { ...current, feedback } : current))
          }
        />
      ) : (
        <AiHighlight provenance="Local demo · No external data or automatic changes">
          Generate a response from the supplied record and configuration references. Stop at any
          time; your partial response remains available.
        </AiHighlight>
      )}
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}
export const InteractiveStreaming: StoryObj<typeof meta> = { render: () => <StreamDemo /> };
export const StoppedBeforeFirstToken: StoryObj<typeof meta> = {
  render: () => <StreamDemo slowFirstResponse />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Generate review summary' }));
    await userEvent.click(await canvas.findByRole('button', { name: 'Stop generation' }));
    const regenerate = await canvas.findByRole('button', { name: 'Regenerate response' });
    await expect(canvasElement.querySelector('.aegis-ai-markdown')).toBeNull();
    await expect(canvas.queryByRole('button', { name: 'Copy response' })).toBeNull();
    await userEvent.click(regenerate);
    await expect(
      await canvas.findByRole('button', { name: 'Copy response' }, { timeout: 15000 }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: `Open ${evidence[0].kind}: ${evidence[0].label}` }),
    ).toBeVisible();
  },
};
