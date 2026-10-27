import { useLayoutEffect } from 'react';
import '@/styles/input-focus.css';

type InputModality = 'pointer' | 'keyboard';
interface FocusSubscription {
  count: number;
  cleanup: () => void;
}
const subscriptions = new WeakMap<Document, FocusSubscription>();
const navigationKeys = new Set([
  'Tab',
  'Enter',
  ' ',
  'Escape',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageUp',
  'PageDown',
]);

/** Text fields match :focus-visible after a click too; track navigation separately from typing. */
export function useInputFocusModality() {
  useLayoutEffect(() => {
    const existing = subscriptions.get(document);
    if (existing) {
      existing.count += 1;
    } else {
      const root = document.documentElement;
      const setModality = (value: InputModality) => {
        root.dataset.aegisInputFocus = value;
      };
      const onPointer = () => setModality('pointer');
      const onKey = (event: KeyboardEvent) => {
        if (!navigationKeys.has(event.key)) return;
        const target = event.target instanceof Element ? event.target : null;
        const editing = target?.closest(
          'textarea, [contenteditable="true"], input:not([type="checkbox"], [type="radio"], [type="range"], [type="file"], [type="color"], [type="button"], [type="submit"], [type="reset"])',
        );
        const navigatingOptions =
          target?.getAttribute('role') === 'combobox' &&
          target.getAttribute('aria-expanded') === 'true' &&
          (event.key === 'ArrowDown' || event.key === 'ArrowUp');
        // Typing and caret movement keep the activation mode of the text field.
        if (event.key === 'Tab' || !editing || navigatingOptions) setModality('keyboard');
      };
      setModality('pointer');
      document.addEventListener('pointerdown', onPointer, true);
      document.addEventListener('keydown', onKey, true);
      subscriptions.set(document, {
        count: 1,
        cleanup: () => {
          document.removeEventListener('pointerdown', onPointer, true);
          document.removeEventListener('keydown', onKey, true);
          delete root.dataset.aegisInputFocus;
        },
      });
    }
    return () => {
      const subscription = subscriptions.get(document);
      if (!subscription || --subscription.count > 0) return;
      subscription.cleanup();
      subscriptions.delete(document);
    };
  }, []);
}
