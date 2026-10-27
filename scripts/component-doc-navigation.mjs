/** Shared documentation route contract. Titles may move without breaking public links. */
import { toId } from 'storybook/internal/csf';

export const documentationSections = [
  ['tokens', 'Tokens Used'],
  ['overview', 'Overview'],
  ['anatomy', 'Component Guidelines/Anatomy'],
  ['types', 'Component Guidelines/Types'],
  ['variants', 'Component Guidelines/Variants'],
  ['intent', 'Component Guidelines/Intent & Emphasis'],
  ['states', 'Component Guidelines/States'],
  ['sizes', 'Component Guidelines/Sizes'],
  ['usage', 'Component Guidelines/Usage & Content'],
  ['accessibility', 'Component Guidelines/Accessibility'],
  ['api', 'Component Guidelines/API & Props'],
  ['context', 'Component Guidelines/Use cases/In Context'],
];

export function documentationRouteTitle(family) {
  // Iconography retains the already-published Icons documentation URLs.
  return family.id === 'foundations-icons' ? 'Foundations/Icons' : family.title;
}

export function documentationMetaId(family, label = 'Overview') {
  return toId(`${documentationRouteTitle(family)}/${label}`);
}

export function documentationId(family, label = 'Overview') {
  return `${documentationMetaId(family, label)}--docs`;
}

/** Ordered foundation destinations, with source ownership for deterministic route checks. */
export const foundationNavigation = [
  {
    group: 'topLevel',
    label: 'Welcome',
    title: 'Welcome',
    id: 'foundations-welcome--docs',
    source: 'src/stories/welcome.stories.tsx',
  },
  {
    group: 'topLevel',
    label: 'Principles',
    title: 'Principles',
    id: 'foundations-principles--docs',
    source: 'src/stories/foundations/principles.mdx',
  },
  {
    group: 'topLevel',
    label: 'Directory',
    title: 'Directory',
    id: 'foundations-component-directory--docs',
    source: 'src/stories/component-directory.mdx',
  },
  {
    group: 'topLevel',
    label: 'AI Guidelines',
    title: 'AI Guidelines',
    id: 'foundations-ai-guidelines--docs',
    source: 'src/stories/foundations/ai-guidelines.mdx',
  },
  {
    group: 'agenticSkills',
    label: 'Agentic Skills',
    title: 'Agentic Skills',
    id: 'agentic-skills-component-creation--docs',
    source: 'src/stories/agentic-skills/component-creation.mdx',
  },
  {
    group: 'foundations',
    label: 'Colors',
    title: 'Foundations/Colors',
    id: 'foundations-colors--docs',
    source: 'src/stories/foundations/colors.mdx',
  },
  {
    group: 'foundations',
    label: 'Typography',
    title: 'Foundations/Typography',
    id: 'foundations-type-and-motion--docs',
    source: 'src/stories/foundations/typography-motion.mdx',
  },
  {
    group: 'foundations',
    label: 'Spacing & Sizing',
    title: 'Foundations/Spacing & Sizing',
    id: 'foundations-space-and-surfaces--docs',
    source: 'src/stories/foundations/layout.mdx',
  },
  {
    group: 'foundations',
    label: 'Iconography',
    title: 'Foundations/Iconography',
    id: 'foundations-icons-overview--docs',
    sourceId: 'foundations-icons',
    source: 'src/stories/foundations/icons.stories.tsx',
  },
  {
    group: 'foundations',
    label: 'Motion',
    title: 'Foundations/Motion',
    id: 'foundations-motion--docs',
    source: 'src/stories/foundations/motion.mdx',
  },
  {
    group: 'foundations',
    label: 'Opacity',
    title: 'Foundations/Opacity',
    id: 'foundations-opacity--docs',
    source: 'src/stories/foundations/opacity.mdx',
  },
  {
    group: 'foundations',
    label: 'Border (Radius, Width, Style)',
    title: 'Foundations/Border (Radius, Width, Style)',
    id: 'foundations-border--docs',
    source: 'src/stories/foundations/border.mdx',
  },
  {
    group: 'foundations',
    label: 'Elevation',
    title: 'Foundations/Elevation',
    id: 'foundations-elevation--docs',
    source: 'src/stories/foundations/elevation.mdx',
  },
  {
    group: 'foundations',
    label: 'Themes & Modes',
    title: 'Foundations/Themes & Modes',
    id: 'foundations-theme--docs',
    source: 'src/stories/foundations/themes.mdx',
  },
];

export function foundationNavigationLinks(prefix = '../') {
  return Object.fromEntries(
    ['topLevel', 'agenticSkills', 'foundations'].map((group) => [
      group,
      foundationNavigation
        .filter((page) => page.group === group)
        .map(({ label, id }) => ({ label, id, url: `${prefix}?path=/docs/${id}` })),
    ]),
  );
}
