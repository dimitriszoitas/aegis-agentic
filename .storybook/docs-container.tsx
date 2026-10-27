import {
  useEffect,
  useLayoutEffect,
  useState,
  type ComponentProps,
  type PropsWithChildren,
} from 'react';
import { DocsContainer, type DocsContainerProps } from '@storybook/addon-docs/blocks';
import type { Decorator } from '@storybook/react-vite';
import { GLOBALS_UPDATED } from 'storybook/internal/core-events';
import {
  useEffect as usePreviewEffect,
  useRef as usePreviewRef,
  useState as usePreviewState,
} from 'storybook/preview-api';
import { create } from 'storybook/theming';
import { applyTheme, type Theme } from '../src/lib/theme';
import {
  applyLayoutTheme,
  defaultLayoutTheme,
  normalizeLayoutTheme,
  type LayoutTheme,
} from '../src/lib/layout-theme';
import { useAutoHideScrollbars } from '../src/lib/scrollbars';
import { useInputFocusModality } from '../src/lib/use-input-focus';
import './docs-focus.css';

const docsThemeAttribute = 'data-aegis-docs-theme';
const docsLayoutAttribute = 'data-aegis-docs-layout-theme';

/** Keep wide Markdown tables inside the reading canvas on narrow screens. */
export function AegisDocsTable(props: ComponentProps<'table'>) {
  return (
    <div className="aegis-docs-table-wrap">
      <table {...props} />
    </div>
  );
}

function parentDocsRoot(): HTMLElement | null {
  try {
    // Only Story blocks inherit their docs host, not standalone or manager previews.
    return window.frameElement?.id.startsWith('iframe--')
      ? window.parent.document.documentElement
      : null;
  } catch {
    return null;
  }
}

function readDocsTheme(root: HTMLElement | null): Theme | undefined {
  const theme = root?.getAttribute(docsThemeAttribute);
  return theme === 'light' || theme === 'dark' ? theme : undefined;
}
function layoutTheme(value: unknown): LayoutTheme | undefined {
  return normalizeLayoutTheme(value);
}
function LayoutThemeBoundary({ layout, children }: PropsWithChildren<{ layout: LayoutTheme }>) {
  useAutoHideScrollbars();
  useInputFocusModality();
  // React layout effects run before play; preview-hook effects run after play.
  useLayoutEffect(() => {
    applyLayoutTheme(layout, { persist: false });
  }, [layout]);
  return <>{children}</>;
}

/** Isolated Docs stories omit URL globals; inherit the host without reloading the story. */
export const WithDocsTheme: Decorator = function WithDocsTheme(Story, context) {
  const root = parentDocsRoot();
  const [inherited, setInherited] = usePreviewState(() => ({
    theme: readDocsTheme(root),
    layout: layoutTheme(root?.getAttribute(docsLayoutAttribute)),
  }));
  const inheritedRef = usePreviewRef(inherited);
  const theme = inherited.theme;
  const override = context.parameters.themes?.themeOverride;
  const layoutOverride = layoutTheme(context.storyGlobals?.layoutTheme);
  const layout =
    layoutOverride ??
    inherited.layout ??
    layoutTheme(context.globals.layoutTheme) ??
    defaultLayoutTheme;
  usePreviewEffect(() => {
    const update = () => {
      const hostTheme = readDocsTheme(root);
      const hostLayout = layoutTheme(root?.getAttribute(docsLayoutAttribute));
      const nextTheme = override === 'light' || override === 'dark' ? override : hostTheme;
      if (root && nextTheme) {
        document.documentElement.classList.toggle('light', nextTheme === 'light');
        applyTheme(nextTheme, { persist: false });
      }
      applyLayoutTheme(
        layoutOverride ??
          hostLayout ??
          layoutTheme(context.globals.layoutTheme) ??
          defaultLayoutTheme,
        { persist: false },
      );
      if (
        root &&
        (inheritedRef.current.theme !== hostTheme || inheritedRef.current.layout !== hostLayout)
      ) {
        inheritedRef.current = { theme: hostTheme, layout: hostLayout };
        setInherited(inheritedRef.current);
      }
    };
    update();
    if (!root) return;
    const observer = new MutationObserver(update);
    observer.observe(root, {
      attributes: true,
      attributeFilter: [docsThemeAttribute, docsLayoutAttribute],
    });
    return () => observer.disconnect();
  }, [root, override, layoutOverride, context.globals.layoutTheme]);
  const story = Story({
    globals: { ...context.globals, ...(theme ? { theme } : {}), layoutTheme: layout },
  });
  return <LayoutThemeBoundary layout={layout}>{story}</LayoutThemeBoundary>;
};

function initialLayoutTheme(context: DocsContainerProps['context']): LayoutTheme {
  const searches = [window.location.search];
  try {
    searches.push(window.parent.location.search);
  } catch {
    /* Cross-origin embeds use their own URL. */
  }
  for (const search of searches) {
    const globals = new URLSearchParams(search).get('globals') ?? '';
    const layout = layoutTheme(globals.match(/(?:^|;)layoutTheme:([^;]+)(?:;|$)/)?.[1]);
    if (layout) return layout;
  }
  try {
    const layout = layoutTheme(context.getStoryContext(context.storyById()).globals.layoutTheme);
    if (layout) return layout;
  } catch {
    // Standalone MDX pages have no primary component story.
  }
  return defaultLayoutTheme;
}

function initialTheme(context: DocsContainerProps['context']): Theme {
  try {
    const theme = context.getStoryContext(context.storyById()).globals.theme;
    if (theme === 'light' || theme === 'dark') return theme;
  } catch {
    // Standalone MDX pages have no primary component story.
  }
  const searches = [window.location.search];
  try {
    searches.push(window.parent.location.search);
  } catch {
    /* Cross-origin embeds use their own URL. */
  }
  for (const search of searches) {
    const globals = new URLSearchParams(search).get('globals') ?? '';
    const theme = globals.match(/(?:^|;)theme:(light|dark)(?:;|$)/)?.[1];
    if (theme === 'light' || theme === 'dark') return theme;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
const docsThemes = {
  light: create({
    base: 'light',
    fontBase: 'Figtree, sans-serif',
    fontCode: 'JetBrains Mono, monospace',
  }),
  dark: create({
    base: 'dark',
    fontBase: 'Figtree, sans-serif',
    fontCode: 'JetBrains Mono, monospace',
  }),
};
/** MDX pages need the same global theme treatment as decorated component stories. */
export function AegisDocsContainer({ context, children }: PropsWithChildren<DocsContainerProps>) {
  useAutoHideScrollbars();
  useInputFocusModality();
  const [theme, setTheme] = useState(() => initialTheme(context));
  const [layout, setLayout] = useState(() => initialLayoutTheme(context));
  useEffect(() => {
    const update = ({ globals }: { globals: Record<string, unknown> }) => {
      let nextTheme = globals.theme;
      let nextLayout = layoutTheme(globals.layoutTheme);
      try {
        // Isolated story frames also emit this event. Their default globals must
        // not replace the toolbar choice held by the containing docs preview.
        const userGlobals = context.getStoryContext(context.storyById()).userGlobals;
        nextTheme = userGlobals.theme ?? nextTheme;
        nextLayout = layoutTheme(userGlobals.layoutTheme) ?? nextLayout;
      } catch {
        // Unattached MDX pages use the globals broadcast by their own preview.
      }
      if (nextTheme === 'light' || nextTheme === 'dark') setTheme(nextTheme);
      if (nextLayout) setLayout(nextLayout);
    };
    context.channel.on(GLOBALS_UPDATED, update);
    return () => context.channel.off(GLOBALS_UPDATED, update);
  }, [context]);
  useLayoutEffect(() => {
    document.documentElement.setAttribute(docsThemeAttribute, theme);
    applyTheme(theme, { persist: false });
    return () => document.documentElement.removeAttribute(docsThemeAttribute);
  }, [theme]);
  useLayoutEffect(() => {
    document.documentElement.setAttribute(docsLayoutAttribute, layout);
    applyLayoutTheme(layout, { persist: false });
    return () => document.documentElement.removeAttribute(docsLayoutAttribute);
  }, [layout]);
  return (
    <DocsContainer context={context} theme={docsThemes[theme]}>
      {children}
    </DocsContainer>
  );
}
