import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const head = readFileSync(
  new URL('../../../.storybook/preview-head.html', import.meta.url),
  'utf8',
);
const script = head.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!script) throw new Error('The early specimen channel isolation script is missing.');

interface TestMessage {
  source: object | null;
  origin: string;
  data: unknown;
  stopImmediatePropagation: () => void;
}
function setup() {
  const source = {};
  const origin = 'http://localhost:6006';
  const frames = [{ contentWindow: source }];
  let receive: ((event: TestMessage) => void) | undefined;
  const addEventListener = vi.fn((_name: string, listener: (event: TestMessage) => void) => {
    receive = listener;
  });
  runInNewContext(script!, {
    window: { location: { origin }, addEventListener },
    document: {
      querySelectorAll: (selector: string) =>
        selector === 'iframe.component-docs-frame' ? frames : [],
    },
  });
  return {
    source,
    origin,
    frames,
    addEventListener,
    dispatch(data: unknown, overrides: Partial<TestMessage> = {}) {
      const stopImmediatePropagation = vi.fn();
      receive?.({ source, origin, data, stopImmediatePropagation, ...overrides });
      return stopImmediatePropagation;
    },
  };
}
const envelope = (type: string) => ({ key: 'storybook-channel', event: { type, args: [] } });

describe('early nested specimen channel isolation', () => {
  it('registers synchronously and blocks native args/reset/globals envelopes from the owned frame', () => {
    const host = setup();
    expect(host.addEventListener).toHaveBeenCalledWith('message', expect.any(Function), true);
    for (const type of ['updateStoryArgs', 'resetStoryArgs', 'globalsUpdated']) {
      expect(host.dispatch(envelope(type))).toHaveBeenCalledOnce();
      expect(host.dispatch(JSON.stringify(envelope(type)))).toHaveBeenCalledOnce();
    }
  });
  it('preserves custom controls, resize, malformed messages and manager globals', () => {
    const host = setup();
    for (const data of [
      { channel: 'aegis:specimen-args', type: 'state', snapshot: { globals: { theme: 'dark' } } },
      { type: 'storybook:embed:resize', height: 420 },
      { key: 'storybook-channel', event: null },
      'not JSON',
    ])
      expect(host.dispatch(data)).not.toHaveBeenCalled();
    expect(host.dispatch(envelope('updateGlobals'), { source: {} })).not.toHaveBeenCalled();
    expect(
      host.dispatch(envelope('updateStoryArgs'), { origin: 'https://other.example' }),
    ).not.toHaveBeenCalled();
    expect(host.dispatch(envelope('updateStoryArgs'), { source: null })).not.toHaveBeenCalled();
  });
  it('stops matching a specimen once its iframe is removed', () => {
    const host = setup();
    host.frames.length = 0;
    expect(host.dispatch(envelope('updateStoryArgs'))).not.toHaveBeenCalled();
  });
});
