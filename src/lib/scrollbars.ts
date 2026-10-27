import { useEffect } from 'react';

const activeDocuments = new WeakMap<Document, { users: number; dispose: () => void }>();
const idleDelay = 1100;

/** Reveal native scrollbar thumbs during scrolling without changing the gutter width. */
export function observeScrollbarActivity(document: Document) {
  const existing = activeDocuments.get(document);
  if (existing) {
    existing.users++;
    return () => release(document);
  }

  const root = document.documentElement;
  const previousMode = root.getAttribute('data-scrollbars');
  const timers = new Map<HTMLElement, ReturnType<typeof setTimeout>>();
  root.setAttribute('data-scrollbars', 'auto');

  const onScroll = (event: Event) => {
    const target = event.target === document ? document.scrollingElement : event.target;
    if (!(target instanceof HTMLElement)) return;
    clearTimeout(timers.get(target));
    target.setAttribute('data-scroll-active', 'true');
    timers.set(
      target,
      setTimeout(() => {
        target.removeAttribute('data-scroll-active');
        timers.delete(target);
      }, idleDelay),
    );
  };
  document.addEventListener('scroll', onScroll, { capture: true, passive: true });
  activeDocuments.set(document, {
    users: 1,
    dispose: () => {
      document.removeEventListener('scroll', onScroll, true);
      for (const [target, timer] of timers) {
        clearTimeout(timer);
        target.removeAttribute('data-scroll-active');
      }
      if (previousMode === null) root.removeAttribute('data-scrollbars');
      else root.setAttribute('data-scrollbars', previousMode);
    },
  });
  return () => release(document);
}

function release(document: Document) {
  const entry = activeDocuments.get(document);
  if (!entry || --entry.users > 0) return;
  entry.dispose();
  activeDocuments.delete(document);
}

export function useAutoHideScrollbars() {
  useEffect(() => observeScrollbarActivity(document), []);
}
