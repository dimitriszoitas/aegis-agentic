import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useGlobals } from 'storybook/preview-api';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { defaultLayoutTheme, layoutThemeOptions, normalizeLayoutTheme } from '@/lib/layout-theme';
import { Sparkles } from '@/components/icon';
import { Button, type Intent } from '@/components/button';
import { Tag } from '@/components/tag';
import { SwitchingSpecimen } from './foundations/theme-switching-preview';
import { SeverityBadge, type Severity } from '@/components/severity-badge';
const actions: { intent: Intent; label: string }[] = [
  { intent: 'default', label: 'View details' },
  { intent: 'function', label: 'Create item' },
  { intent: 'ai', label: 'Explain with AI' },
  { intent: 'destroy', label: 'Delete draft' },
];
function ThemeSpecimen() {
  const [selection, setSelection] = useState('Select a control to inspect its treatment.');
  return (
    <main className="stack story-pad" style={{ maxWidth: 1100 }}>
      <header>
        <p className="muted">Aegis / Foundations</p>
        <h1>Clarity at every layer</h1>
        <p className="muted">Quiet surfaces. Clear intent. Focus where it matters.</p>
      </header>
      <div className="story-grid">
        {[
          { token: 'surface', label: 'Surface' },
          { token: 'surface-raised', label: 'Raised surface' },
          { token: 'hover', label: 'Hover surface' },
          { token: 'selected', label: 'Selected surface' },
        ].map(({ token, label }) => (
          <section
            key={token}
            className="surface"
            style={{ background: `var(--color-bg-${token})` }}
          >
            <h2 style={{ fontSize: 'var(--text-md)' }}>{label}</h2>
            <p className="muted">Review activity and manage information across your workspace.</p>
            <span className="mono">ITEM-114 · workspace/main</span>
          </section>
        ))}
      </div>
      <section className="surface stack">
        <h2>Actions and intent</h2>
        {(['primary', 'secondary', 'tertiary', 'ghost'] as const).map((emphasis) => (
          <div className="row" key={emphasis} aria-label={`${emphasis} actions`}>
            {actions.map(({ intent, label }) => (
              <Button
                key={intent}
                intent={intent}
                emphasis={emphasis}
                leadingIcon={intent === 'ai' ? <Sparkles size={15} /> : undefined}
                onClick={() => setSelection(`${label}: ${emphasis} ${intent} treatment selected.`)}
              >
                {label}
              </Button>
            ))}
          </div>
        ))}
        <p className="muted" role="status">
          {selection}
        </p>
        <div className="row">
          <Tag intent="success">Update complete</Tag>
          <Tag intent="warning">Review required</Tag>
        </div>
      </section>
      <section className="surface stack">
        <h2>Severity</h2>
        <div className="row">
          {(['critical', 'high', 'medium', 'low', 'info'] as Severity[]).map((severity) => (
            <SeverityBadge key={severity} severity={severity} />
          ))}
        </div>
      </section>
      <section className="surface stack">
        <h2>Control sizes</h2>
        <div className="row">
          {(['sm', 'md', 'lg'] as const).map((size) => (
            <Button
              key={size}
              size={size}
              emphasis="secondary"
              onClick={() =>
                setSelection(
                  `${size === 'sm' ? 'Small' : size === 'md' ? 'Medium' : 'Large'} control selected.`,
                )
              }
            >
              {size === 'sm' ? 'Small · 28px' : size === 'md' ? 'Medium · 34px' : 'Large · 40px'}
            </Button>
          ))}
        </div>
      </section>
      <div className="story-grid">
        {['raised', 'floating', 'overlay'].map((name) => (
          <section key={name} className="surface" style={{ boxShadow: `var(--shadow-${name})` }}>
            <h2 style={{ fontSize: 'var(--text-md)' }}>{name[0].toUpperCase() + name.slice(1)}</h2>
            <p className="muted">
              Ordinary surfaces stay shadow-free; transient overlays use separate elevation.
            </p>
          </section>
        ))}
      </div>
    </main>
  );
}
export default {
  id: 'foundations-theme',
  title: 'Foundations/Themes & Modes',
  tags: ['!autodocs'],
  component: ThemeSpecimen,
} satisfies Meta<typeof ThemeSpecimen>;
export const Overview: StoryObj<typeof ThemeSpecimen> = {};
export const Fundamental: StoryObj<typeof ThemeSpecimen> = {
  globals: { layoutTheme: 'fundamental' },
};
export const FundamentalFloating: StoryObj<typeof ThemeSpecimen> = {
  name: 'Fundamental Floating',
  globals: { layoutTheme: 'fundamental-floating' },
  parameters: {
    docs: {
      description: {
        story:
          'The same light and dark colors, typography and controls, with inset floating navigation and panels. Use the sidebar appearance controls to compare light and dark modes.',
      },
    },
  },
};

function ThemeSwitchingStory() {
  const [globals, updateGlobals] = useGlobals();
  return (
    <SwitchingSpecimen
      layout={normalizeLayoutTheme(globals.layoutTheme) ?? defaultLayoutTheme}
      onLayoutChange={(layoutTheme) => updateGlobals({ layoutTheme })}
    />
  );
}
export const Switching: StoryObj<typeof ThemeSpecimen> = {
  render: ThemeSwitchingStory,
  parameters: { docs: { story: { inline: true, autoplay: false } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const document = canvasElement.ownerDocument;
    const initialLayout = document.documentElement.dataset.layoutTheme;
    const initialColor = document.documentElement.dataset.theme;
    const draft = canvas.getByRole('textbox', { name: 'Draft name' });
    await userEvent.type(draft, 'Release checklist');
    for (const { value, label } of layoutThemeOptions) {
      await userEvent.click(canvas.getByRole('button', { name: label }));
      await waitFor(() =>
        expect(document.documentElement).toHaveAttribute('data-layout-theme', value),
      );
      await expect(draft).toHaveValue('Release checklist');
      await userEvent.click(canvas.getByRole('button', { name: 'Open preview panel' }));
      const panel = await within(document.body).findByRole('dialog', { name: 'Preview details' });
      await expect(within(panel).getByText('Draft: Release checklist')).toBeVisible();
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(panel).not.toBeInTheDocument());
      await waitFor(() =>
        expect(canvas.getByRole('button', { name: 'Open preview panel' })).toHaveFocus(),
      );
    }
    if (initialColor)
      await expect(document.documentElement).toHaveAttribute('data-theme', initialColor);
    const initial = layoutThemeOptions.find(({ value }) => value === initialLayout);
    if (initial) {
      await userEvent.click(canvas.getByRole('button', { name: initial.label }));
      await waitFor(() =>
        expect(document.documentElement).toHaveAttribute('data-layout-theme', initial.value),
      );
    }
  },
};
