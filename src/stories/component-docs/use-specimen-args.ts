import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import {
  isRecord,
  isSpecimenMessage,
  serializableRecord,
  specimenArgOverrides,
  specimenArgsChannel,
  specimenArgsVersion,
  type SpecimenArgs,
  type SpecimenArgsCommand,
  type SpecimenArgsSnapshot,
  type SpecimenPresentation,
} from './specimen-args-protocol';
export interface SpecimenArgsState extends SpecimenArgsSnapshot {
  status: 'loading' | 'ready' | 'unavailable' | 'error';
  error?: string;
}
// Storybook 10 recreates its MDX ErrorBoundary on globals changes. Keep only
// changed, serializable args in preview memory so one theme remount preserves edits.
const rememberedArgs = new Map<string, SpecimenArgs>();
function remember(storyId: string, args: SpecimenArgs) {
  rememberedArgs.delete(storyId);
  rememberedArgs.set(storyId, args);
  if (rememberedArgs.size > 64) rememberedArgs.delete(rememberedArgs.keys().next().value!);
}
const initialState = (storyId: string): SpecimenArgsState => ({
  storyId,
  status: 'loading',
  args: {},
  initialArgs: {},
  argTypes: {},
  globals: {},
});
/** Append aegisPlayground=1&embed=true to the iframe URL. embed=true disables play autoplay. */
export function useSpecimenArgs(
  frame: RefObject<HTMLIFrameElement | null>,
  storyId: string,
  enabled = true,
) {
  const [state, setState] = useState(() => initialState(storyId));
  const connection = useRef<{ session: string; storyId: string } | null>(null);
  const pending = useRef<SpecimenArgs>({});
  const desiredPresentation = useRef<SpecimenPresentation | undefined>(undefined);
  const send = useCallback(
    (
      command:
        | { type: 'connect' }
        | { type: 'update'; args: SpecimenArgs }
        | { type: 'reset'; names?: string[] }
        | { type: 'presentation'; presentation: SpecimenPresentation },
    ) => {
      const active = connection.current;
      if (!active || active.storyId !== storyId) return;
      const message: SpecimenArgsCommand = {
        channel: specimenArgsChannel,
        version: specimenArgsVersion,
        ...active,
        ...command,
      };
      frame.current?.contentWindow?.postMessage(message, window.location.origin);
    },
    [frame, storyId],
  );
  useLayoutEffect(() => {
    if (!enabled) {
      connection.current = null;
      return;
    }
    connection.current = { session: crypto.randomUUID(), storyId };
    pending.current = { ...rememberedArgs.get(storyId) };
    desiredPresentation.current = undefined;
    setState(initialState(storyId));
    let connected = false;
    let attempts = 0;
    function receive(event: MessageEvent<unknown>) {
      if (
        event.origin !== window.location.origin ||
        event.source !== frame.current?.contentWindow ||
        !isSpecimenMessage(event.data) ||
        event.data.storyId !== storyId ||
        event.data.session !== connection.current?.session
      )
        return;
      if (event.data.type === 'state' && isRecord(event.data.snapshot)) {
        const snapshot = event.data.snapshot as unknown as SpecimenArgsSnapshot;
        if (
          snapshot.storyId !== storyId ||
          !isRecord(snapshot.args) ||
          !isRecord(snapshot.initialArgs) ||
          !isRecord(snapshot.argTypes) ||
          !isRecord(snapshot.globals)
        )
          return;
        const restoring = !connected && Object.keys(pending.current).length > 0;
        setState({
          ...snapshot,
          args: restoring ? { ...snapshot.args, ...pending.current } : snapshot.args,
          status: 'ready',
        });
        if (!restoring) {
          pending.current = specimenArgOverrides(snapshot.args, snapshot.initialArgs);
          remember(storyId, pending.current);
        }
        if (!connected) {
          connected = true;
          if (Object.keys(pending.current).length) send({ type: 'update', args: pending.current });
          if (desiredPresentation.current)
            send({ type: 'presentation', presentation: desiredPresentation.current });
        }
      } else if (event.data.type === 'error' && typeof event.data.message === 'string') {
        const message = event.data.message;
        setState((current) => ({
          ...current,
          status: 'error',
          error: message,
        }));
      }
    }
    const connect = () => {
      connected = false;
      attempts = 0;
      send({ type: 'connect' });
    };
    const iframe = frame.current;
    window.addEventListener('message', receive);
    iframe?.addEventListener('load', connect);
    connect();
    const timer = window.setInterval(() => {
      if (connected) return;
      if (++attempts > 80) {
        clearInterval(timer);
        setState((current) => ({
          ...current,
          status: 'unavailable',
          error:
            'The example is not ready for controls. Reload the example or open it in the canvas.',
        }));
        return;
      }
      send({ type: 'connect' });
    }, 250);
    return () => {
      clearInterval(timer);
      window.removeEventListener('message', receive);
      iframe?.removeEventListener('load', connect);
      connection.current = null;
    };
  }, [enabled, frame, send, storyId]);
  const updateArgs = useCallback(
    (patch: SpecimenArgs) => {
      const safe = serializableRecord(patch);
      pending.current = { ...pending.current, ...safe };
      remember(storyId, pending.current);
      send({ type: 'update', args: safe });
    },
    [send, storyId],
  );
  const resetArgs = useCallback(
    (names?: string[]) => {
      if (names) for (const key of names) delete pending.current[key];
      else pending.current = {};
      remember(storyId, pending.current);
      send({ type: 'reset', names });
    },
    [send, storyId],
  );
  const updatePresentation = useCallback(
    (presentation: SpecimenPresentation) => {
      desiredPresentation.current = presentation;
      send({ type: 'presentation', presentation });
    },
    [send],
  );
  return {
    ...(state.storyId === storyId ? state : initialState(storyId)),
    updateArgs,
    resetArgs,
    updatePresentation,
  };
}
