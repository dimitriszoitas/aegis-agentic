import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  componentToken,
  componentTokenDefaults,
  componentTokenVariable,
  type ComponentTokenName,
  componentTokenDefinitions,
  createComponentRuntimeCss,
  readComponentTokenNumber,
  useComponentTokenNumbers,
} from './component-design-tokens';
import { componentTokenGroupValues } from './component-token-group-values';

interface ManifestToken {
  tier: 'primitive' | 'semantic' | 'group';
  value?: string;
  mappings?: Record<string, string>;
}
const manifest = JSON.parse(
  readFileSync(new URL('../../tokens/design-tokens.json', import.meta.url), 'utf8'),
) as { tokens: Record<string, ManifestToken> };
function resolveDefault(name: string): string {
  const token = manifest.tokens[name];
  const value = token.value ?? token.mappings?.['fundamental.light'];
  if (!value) throw new Error(`Missing default for ${name}`);
  return value.replace(/var\((--[\w-]+)\)/g, (_match, reference: string) =>
    resolveDefault(reference),
  );
}

function NumericConsumer({ height }: { height?: number }) {
  const tokens = useComponentTokenNumbers(['chart-height', 'icon-md']);
  return createElement('div', {
    'data-height': height ?? tokens['chart-height'],
    'data-icon-size': tokens['icon-md'],
    style: { width: componentToken('icon-md') },
  });
}

describe('component design token contract', () => {
  it('emits manifest group aliases and keeps numeric SSR fallbacks equal to the default theme', () => {
    const css = readFileSync(
      new URL('../styles/component-runtime-tokens.css', import.meta.url),
      'utf8',
    );
    expect(css).toBe(createComponentRuntimeCss());
    for (const [name, definition] of Object.entries(componentTokenDefinitions)) {
      const variable = componentTokenVariable(name as ComponentTokenName);
      const expression = componentTokenGroupValues[name as ComponentTokenName];
      expect(manifest.tokens[variable].tier).toBe('group');
      expect(expression).toBe(manifest.tokens[variable].value);
      expect(css).toContain(`${variable}: ${expression};`);
      expect(resolveDefault(variable)).toBe(`${definition.value}${definition.unit}`);
    }
  });

  it('renders measured defaults on the server without reading browser globals', () => {
    const markup = renderToString(createElement(NumericConsumer));
    expect(markup).toContain('data-height="260"');
    expect(markup).toContain('data-icon-size="16"');
    expect(markup).toContain('width:var(--group-iconography-measurement-icon-md)');
    expect(readComponentTokenNumber('grid-select-width')).toBe(44);
  });

  it('preserves explicit consumer dimensions over token defaults', () => {
    expect(renderToString(createElement(NumericConsumer, { height: 317 }))).toContain(
      'data-height="317"',
    );
    expect(componentToken('grid-row-default')).toBe('var(--group-data-display-measurement-grid-row-default)');
    expect(componentTokenDefaults['sheet-size']).toBe(280);
    expect(componentTokenDefaults['metric-chart-height']).toBe(220);
    expect(componentTokenDefaults['metric-chart-compact-height']).toBe(80);
  });
});
