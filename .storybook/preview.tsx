import { WithSpecimenArgs } from './specimen-args-bridge';
import type { Preview } from '@storybook/react-vite';
import { withThemeByClassName, withThemeByDataAttribute } from '@storybook/addon-themes';
import { AegisDocsContainer, AegisDocsTable, WithDocsTheme } from './docs-container';
import { WithConsoleCanvas } from './console-canvas';
import { defaultLayoutTheme, layoutThemeOptions } from '../src/lib/layout-theme';
import '../src/styles/globals.css';
import './story-layout.css';
import './docs-shell.css';
import './playground-preview.css';
const preview: Preview = {
  tags: ['autodocs'],
  initialGlobals: { layoutTheme: defaultLayoutTheme },
  globalTypes: {
    layoutTheme: {
      description: 'Fundamental presentation, independent of the light or dark color theme',
      toolbar: {
        title: 'Presentation',
        icon: 'sidebar',
        dynamicTitle: true,
        items: layoutThemeOptions.map(({ value, label }) => ({ value, title: label })),
      },
    },
  },
  decorators: [
    WithSpecimenArgs,
    WithConsoleCanvas,
    withThemeByClassName({
      themes: { light: 'light', dark: 'dark' },
      defaultTheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      parentSelector: 'html',
    }),
    withThemeByDataAttribute({
      themes: { light: 'light', dark: 'dark' },
      defaultTheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      attributeName: 'data-theme',
      parentSelector: 'html',
    }),
    // The outer decorator supplies inherited globals before the theme strategies run.
    WithDocsTheme,
  ],
  parameters: {
    layout: 'padded',
    backgrounds: { disable: true },
    controls: { expanded: true },
    docs: { container: AegisDocsContainer, components: { table: AegisDocsTable } },
    a11y: {
      test: 'error',
      manual: new URLSearchParams(window.location.search).has('aegisTest'),
      // Base UI owns these hidden Tab sentinels; native focus-loop checks cover them.
      // This does not exclude authored content or disable the aria-hidden-focus rule.
      context: { exclude: ['[data-base-ui-focus-guard]'] },
    },
    options: {
      storySort: (a, b) => {
        const roots = [
          'Welcome',
          'Principles',
          'Directory',
          'AI Guidelines',
          'Agentic Skills',
          'Foundations',
          'Components',
          'Patterns',
          'Console',
        ];
        const componentGroups = [
          'Triggers',
          'Inputs & Selection',
          'Navigation',
          'Surfaces',
          'Layout',
          'Data Display',
          'Data Visualization',
          'Code',
          'Feedback',
          'AI',
        ];
        const patternGroups = [
          'Filtering',
          'Page Structure',
          'Workflows',
          'Communication',
          'AI Assistance',
        ];
        const foundations = [
          'Colors',
          'Typography',
          'Spacing & Sizing',
          'Iconography',
          'Motion',
          'Opacity',
          'Border (Radius, Width, Style)',
          'Elevation',
          'Themes & Modes',
        ];
        const agenticSkills = ['Component Creation', 'Token Creation', 'Layout Creation'];
        const pages = [
          'Overview',
          'Component Guidelines',
          'Tokens Used',
          'Docs',
          'Anatomy',
          'Types',
          'Variants',
          'Intent & Emphasis',
          'States',
          'Sizes',
          'Usage & Content',
          'Accessibility',
          'API & Props',
          'Use cases',
          'In Context',
        ];
        const left = [...a.title.split('/'), a.name];
        const right = [...b.title.split('/'), b.name];
        for (let index = 0; index < Math.max(left.length, right.length); index++) {
          const first = left[index] ?? '';
          const second = right[index] ?? '';
          if (first === second) continue;
          const order =
            index === 0
              ? roots
              : index === 1 && left[0] === 'Components'
                ? componentGroups
                : index === 1 && left[0] === 'Patterns'
                  ? patternGroups
                  : index === 1 && left[0] === 'Foundations'
                    ? foundations
                    : index === 1 && left[0] === 'Agentic Skills'
                      ? agenticSkills
                      : pages;
          const firstRank = order.includes(first) ? order.indexOf(first) : order.length;
          const secondRank = order.includes(second) ? order.indexOf(second) : order.length;
          return (
            firstRank - secondRank || first.localeCompare(second, undefined, { numeric: true })
          );
        }
        return 0;
      },
    },
  },
};
export default preview;
