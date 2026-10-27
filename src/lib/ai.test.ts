import { describe, expect, it } from 'vitest';
import { streamMockResponse, type AiContextItem, type AiStreamEvent } from './ai';
async function collect(stream: AsyncIterable<AiStreamEvent>) {
  const events: AiStreamEvent[] = [];
  for await (const event of stream) events.push(event);
  return events;
}
describe('Local AI response scope', () => {
  it('snapshots supplied context and cites only supplied records', async () => {
    const context: AiContextItem[] = [
      {
        id: 'project-7',
        label: 'Portal refresh',
        kind: 'record',
        description: 'Owner: Maya; completion: 45%.',
      },
    ];
    const stream = streamMockResponse(
      { id: 'one', prompt: 'Summarize this project.', context },
      { delayMs: 0 },
    );
    const first = await stream.next();
    context[0].description = 'Changed after generation started.';
    const events = [first.value!, ...(await collect(stream))];
    const content = events.flatMap((event) => (event.type === 'token' ? event.text : [])).join('');
    expect(content).toContain('Owner: Maya; completion: 45%.');
    expect(content).not.toContain('Changed after generation');
    expect(events.filter((event) => event.type === 'citation')).toEqual([
      {
        type: 'citation',
        citation: {
          id: 'project-7',
          label: 'Portal refresh',
          kind: 'record',
          description: 'Owner: Maya; completion: 45%.',
        },
      },
    ]);
  });
  it('aborts before emitting a response when generation is cancelled', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      collect(
        streamMockResponse(
          { id: 'cancelled', prompt: 'Review.' },
          { signal: controller.signal, delayMs: 0 },
        ),
      ),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
