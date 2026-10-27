import { useLayoutEffect, useRef, type ReactNode } from 'react';
import type { Decorator } from '@storybook/react-vite';
import { useArgs, useGlobals, useStoryContext } from 'storybook/preview-api';
import {
  isRecord,
  isSpecimenMessage,
  serializableRecord,
  specimenControlArgTypes,
  sameSpecimenValue,
  specimenArgsChannel,
  specimenArgsVersion,
  type SpecimenArgsSnapshot,
} from '../src/stories/component-docs/specimen-args-protocol';

function ArgsBoundary({
  snapshot,
  update,
  reset,
  presentation,
  children,
}: {
  snapshot: SpecimenArgsSnapshot;
  update: (patch: Record<string, unknown>) => void;
  reset: (names?: string[]) => void;
  presentation: (globals: Record<string, unknown>) => void;
  children: ReactNode;
}) {
  const latest = useRef({ snapshot, update, reset, presentation });
  latest.current = { snapshot, update, reset, presentation };
  const session = useRef<string | undefined>(undefined);
  const send = () => {
    if (!session.current) return;
    window.parent.postMessage(
      {
        channel: specimenArgsChannel,
        version: specimenArgsVersion,
        type: 'state',
        session: session.current,
        storyId: latest.current.snapshot.storyId,
        snapshot: latest.current.snapshot,
      },
      window.location.origin,
    );
  };
  useLayoutEffect(() => {
    if (window.parent === window) return;
    function receive(event: MessageEvent<unknown>) {
      if (
        event.origin !== window.location.origin ||
        event.source !== window.parent ||
        !isSpecimenMessage(event.data) ||
        event.data.storyId !== latest.current.snapshot.storyId
      )
        return;
      const command = event.data;
      if (command.type === 'connect') {
        session.current = command.session as string;
        send();
        return;
      }
      if (command.session !== session.current) return;
      try {
        const known = new Set([
          ...Object.keys(latest.current.snapshot.argTypes),
          ...Object.keys(latest.current.snapshot.initialArgs),
          ...Object.keys(latest.current.snapshot.args),
        ]);
        if (command.type === 'update' && isRecord(command.args)) {
          const patch = Object.fromEntries(
            Object.entries(serializableRecord(command.args)).filter(
              ([key, value]) =>
                latest.current.snapshot.argTypes[key]?.control !== false &&
                !sameSpecimenValue(value, latest.current.snapshot.args[key]),
            ),
          );
          if (Object.keys(patch).length) latest.current.update(patch);
        } else if (command.type === 'reset') {
          const names = Array.isArray(command.names)
            ? command.names.filter(
                (name): name is string => typeof name === 'string' && known.has(name),
              )
            : undefined;
          latest.current.reset(names);
        } else if (command.type === 'presentation' && isRecord(command.presentation)) {
          const { theme, layoutTheme } = command.presentation;
          if (
            (theme === 'light' || theme === 'dark') &&
            (layoutTheme === 'fundamental' || layoutTheme === 'fundamental-floating') &&
            (latest.current.snapshot.globals.theme !== theme ||
              latest.current.snapshot.globals.layoutTheme !== layoutTheme)
          )
            latest.current.presentation({ theme, layoutTheme });
        }
      } catch (error) {
        window.parent.postMessage(
          {
            channel: specimenArgsChannel,
            version: specimenArgsVersion,
            type: 'error',
            session: session.current,
            storyId: latest.current.snapshot.storyId,
            message: error instanceof Error ? error.message : 'The example could not be updated.',
          },
          window.location.origin,
        );
      }
    }
    window.addEventListener('message', receive);
    return () => {
      window.removeEventListener('message', receive);
      session.current = undefined;
    };
  }, [snapshot.storyId]);
  useLayoutEffect(send, [snapshot]);
  return children;
}

/** The bridge is opt-in and does not change normal canvas, docs or interaction-test behavior. */
export const WithSpecimenArgs: Decorator = (Story) => {
  const context = useStoryContext();
  const [args, updateArgs, resetArgs] = useArgs();
  const [globals, updateGlobals] = useGlobals();
  const story = Story();
  if (!new URLSearchParams(window.location.search).has('aegisPlayground')) return story;
  const snapshot: SpecimenArgsSnapshot = {
    storyId: context.id,
    args: serializableRecord(args),
    initialArgs: serializableRecord(context.initialArgs),
    argTypes: specimenControlArgTypes(context.argTypes, args, context.initialArgs),
    globals: serializableRecord(globals),
  };
  return (
    <ArgsBoundary
      snapshot={snapshot}
      update={updateArgs}
      reset={resetArgs}
      presentation={updateGlobals}
    >
      <div className="aegis-playground-preview">{story}</div>
    </ArgsBoundary>
  );
};
