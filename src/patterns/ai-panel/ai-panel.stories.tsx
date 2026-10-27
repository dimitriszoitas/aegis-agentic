import { StrictMode, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Button } from '@/components/button';
import { records } from '@/sample-data';
import {
  streamMockResponse,
  type AiContextItem,
  type AiMessageData,
  type AiRequest,
  type AiStreamFactory,
} from '@/lib/ai';
import { AiPanel } from './ai-panel';
const context: AiContextItem[] = records.slice(0, 3).map((record) => ({
  id: record.id,
  label: record.id,
  description: record.title,
  kind: 'record',
}));
const timestamp = '2026-10-06T08:30:00.000Z';
const user: AiMessageData = {
  id: 'user-example',
  role: 'user',
  content: 'Which checks should I complete before linking these records?',
  status: 'complete',
  context,
  steps: [],
  citations: [],
  timestamp,
};
const response: AiMessageData = {
  id: 'assistant-example',
  role: 'assistant',
  content: `## Review the selected records\n\nThe review currently includes **${context.map((item) => item.id).join(', ')}**. Verify record identifiers and source timestamps before linking them.\n\n1. Inspect each original event payload.\n2. Compare the observed activity with approved changes.\n3. Record the next step and assigned owner.\n\nNo external data was fetched and no records were changed.`,
  status: 'complete',
  context,
  steps: [
    {
      id: 'scope',
      label: 'Scoped the response to three selected record references',
      status: 'complete',
    },
  ],
  citations: context,
  timestamp,
  provenance: 'Local demo · selected evidence only',
};
const meta = {
  id: 'patterns-ai-aipanel',
  title: 'Patterns/AI Assistance/AiPanel',
  component: AiPanel,
  tags: ['autodocs'],
  args: { defaultOpen: true, context, availableContext: context },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Drag the left edge to resize on desktop, or focus the separator and use Left/Right arrows (Shift for larger steps), Home, and End. Docked panels reserve 480px for the workspace when space allows. The conversation and draft remain intact while resizing; narrow screens fit the viewport. Set `resizable={false}` for a fixed-width panel.',
      },
      story: { inline: false, height: 760 },
    },
  },
} satisfies Meta<typeof AiPanel>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Empty: Story = {};
export const Overlay: Story = { args: { initialMessages: [user, response] } };
export const Streaming: Story = {
  args: {
    request: { id: 'streaming-example', prompt: 'Explain these selected records.', context },
  },
};
export const Stopped: Story = {
  args: {
    initialMessages: [
      user,
      {
        ...response,
        status: 'stopped',
        content:
          '## Review the selected evidence\n\nStart by confirming the record identifiers for the selected records.',
      },
    ],
  },
};
export const Interrupted: Story = {
  args: {
    initialMessages: [
      user,
      {
        ...response,
        status: 'error',
        error: 'The connection was interrupted. Your evidence and partial answer are preserved.',
      },
    ],
  },
};
function DockedDemo() {
  const [open, setOpen] = useState(true);
  const [evidence, setEvidence] = useState('');
  return (
    <div style={{ display: 'flex', height: 800, minWidth: 780 }}>
      <main style={{ flex: 1, padding: 24 }}>
        <h1>Review workspace</h1>
        <p>The assistant pushes the workspace and keeps keyboard focus unrestricted.</p>
        <Button intent="ai" onClick={() => setOpen(!open)}>
          Toggle AI panel
        </Button>
        <p role="status">{evidence}</p>
      </main>
      <AiPanel
        docked
        open={open}
        onOpenChange={setOpen}
        context={context}
        initialMessages={[user, response]}
        onEvidenceClick={(item) => setEvidence(`Inspecting ${item.id}`)}
      />
    </div>
  );
}
export const DockedPush: Story = {
  render: () => <DockedDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole('button', { name: 'Toggle AI panel' });
    await userEvent.click(toggle);
    await waitFor(() =>
      expect(
        canvas.queryByRole('separator', { name: 'Resize side panel' }),
      ).not.toBeInTheDocument(),
    );
    await userEvent.click(toggle);
    const separator = await canvas.findByRole('separator', { name: 'Resize side panel' });
    await expect(toggle).toHaveFocus();
    expect(getComputedStyle(separator, '::after').backgroundColor).toBe('rgba(0, 0, 0, 0)');
    await userEvent.tab();
    await expect(separator).toHaveFocus();
    expect(getComputedStyle(separator, '::after').backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(toggle).toHaveFocus());
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByRole('separator', { name: 'Resize side panel' })).toBeInTheDocument();
  },
};
const slowResponse: AiStreamFactory = async function* (request) {
  // Deliberately ignores abort to demonstrate that the panel rejects late events.
  yield {
    type: 'token',
    text: `Review started for ${request.context?.[0]?.id ?? 'unscoped evidence'}. `,
  };
  await new Promise((resolve) => setTimeout(resolve, 650));
  yield {
    type: 'token',
    text: `Finished only for ${request.context?.[0]?.id ?? 'unscoped evidence'}.`,
  };
  for (const citation of request.context ?? []) yield { type: 'citation', citation };
  yield { type: 'complete' };
};
function ReplacementDemo() {
  const [request, setRequest] = useState<AiRequest>();
  const [selection, setSelection] = useState([context[0]]);
  return (
    <StrictMode>
      <div style={{ display: 'flex', height: 800 }}>
        <main style={{ flex: 1, padding: 24 }}>
          <h1>Replace an active request</h1>
          <p>
            Late events from the superseded response are ignored. New selection does not alter an
            existing turn.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Button
              onClick={() =>
                setRequest({
                  id: `first-${Date.now()}`,
                  prompt: 'Explain the first record.',
                  context: [context[0]],
                })
              }
            >
              Explain first record
            </Button>
            <Button
              onClick={() =>
                setRequest({
                  id: `second-${Date.now()}`,
                  prompt: 'Explain the second record.',
                  context: [context[1]],
                })
              }
            >
              Explain second record
            </Button>
            <Button onClick={() => setSelection([context[2]])}>Change visible selection</Button>
          </div>
        </main>
        <AiPanel
          docked
          defaultOpen
          context={selection}
          request={request}
          streamResponse={slowResponse}
        />
      </div>
    </StrictMode>
  );
}
export const RequestReplacement: Story = { render: () => <ReplacementDemo /> };
const failedResponse: AiStreamFactory = async function* () {
  yield { type: 'token', text: 'The selected evidence is preserved. ' };
  throw new Error('Demo connection interrupted. Try again to regenerate the response.');
};
export const FailedStream: Story = {
  args: {
    streamResponse: failedResponse,
    request: { id: 'failed-stream', prompt: 'Explain these records.', context },
  },
};
const fastResponse: AiStreamFactory = (request, options) =>
  streamMockResponse(request, { ...options, delayMs: 0 });
export const StrictModeSeed: Story = {
  render: (args) => (
    <StrictMode>
      <AiPanel
        {...args}
        streamResponse={fastResponse}
        request={{
          id: 'strict-mode-seed',
          prompt: 'Explain the selected record.',
          context: [context[0]],
        }}
      />
    </StrictMode>
  ),
};
