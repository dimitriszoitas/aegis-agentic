import { describe, expect, it } from 'vitest';
import { playgroundControls } from './playground-controls-model';
import type { ComponentMetadata } from './types';

const meta: ComponentMetadata = {
  id: 'button',
  name: 'Button',
  title: 'Button',
  category: 'Triggers',
  kind: 'component',
  aliases: [],
  description: '',
  anatomy: [],
  sourceFiles: [],
  imports: [],
  stories: [],
  css: [],
  exportNames: ['Button'],
  props: [
    {
      component: 'Button',
      name: 'emphasis',
      type: '"primary" | "secondary" | "tertiary" | "ghost" | undefined',
      required: false,
      defaultValue: '"primary"',
    },
    {
      component: 'Button',
      name: 'loading',
      type: 'boolean | undefined',
      required: false,
      defaultValue: 'false',
    },
    {
      component: 'Button',
      name: 'disabled',
      type: 'boolean | undefined',
      required: false,
      inherited: true,
    },
    {
      component: 'Button',
      name: 'draggable',
      type: 'boolean | undefined',
      required: false,
      inherited: true,
    },
    { component: 'Button', name: 'leadingIcon', type: 'ReactNode', required: false },
  ],
  variants: [],
};

describe('playground controls', () => {
  it('preserves authored boolean controls when source variants contain string states', () => {
    const result = playgroundControls(
      { ...meta, variants: [{ name: 'loading', values: ['false', 'true'] }] },
      { loading: { control: 'boolean' } },
      { loading: false },
    );
    expect(result.find((control) => control.name === 'loading')).toMatchObject({
      type: 'boolean',
      defaultValue: false,
    });
    expect(result.find((control) => control.name === 'loading')?.options).toBeUndefined();
  });
  it('exposes component variants and supported native state, not DOM wiring or React nodes', () => {
    const result = playgroundControls(
      meta,
      {
        disabled: { control: 'boolean' },
        draggable: { control: 'boolean' },
        onClick: { control: 'object' },
        ref: { control: 'object' },
        className: { control: 'text' },
        'aria-label': { control: 'text' },
      },
      { children: 'Save' },
    );
    expect(result.map((control) => control.name).sort()).toEqual([
      'children',
      'disabled',
      'emphasis',
      'loading',
    ]);
    expect(
      result.find((control) => control.name === 'emphasis')?.options?.map((option) => option.value),
    ).toEqual(['primary', 'secondary', 'tertiary', 'ghost']);
    expect(result.find((control) => control.name === 'emphasis')?.defaultValue).toBe('primary');
  });
  it('keeps authored story enum types, constraints and explicit exclusions', () => {
    const result = playgroundControls(
      meta,
      {
        lines: {
          options: [1, 2],
          control: { type: 'select', labels: { 1: 'One line', 2: 'Two lines' } },
        },
        levels: { control: { type: 'number', min: 1, max: 4, step: 1 } },
        loading: { control: false },
        emphasis: { table: { disable: true } },
      },
      { lines: 1, levels: 2 },
    );
    expect(result.map((control) => control.name)).toEqual(['lines', 'levels', 'disabled']);
    expect(result[0].options).toEqual([
      { value: 1, label: 'One line' },
      { value: 2, label: 'Two lines' },
    ]);
    expect(result[1]).toMatchObject({ type: 'number', min: 1, max: 4, step: 1 });
  });
  it('edits string children as text and exposes only explicitly object-editable data', () => {
    const result = playgroundControls(
      meta,
      { children: { control: 'object' }, items: { control: 'object' } },
      { children: 'Save', items: [{ id: 'one', title: 'One' }], content: {} },
    );
    expect(result.find((control) => control.name === 'children')?.type).toBe('text');
    expect(result.find((control) => control.name === 'items')?.type).toBe('json');
    expect(result.some((control) => control.name === 'content')).toBe(false);
  });
  it('omits initializer-only props that cannot update a mounted preview', () => {
    const result = playgroundControls(
      meta,
      {
        defaultChecked: { control: 'boolean' },
        initialSorting: { control: 'object' },
        checked: { control: 'boolean' },
      },
      { defaultChecked: true, initialSorting: [{ id: 'title', desc: false }], checked: false },
    );
    expect(result.some((control) => control.name === 'defaultChecked')).toBe(false);
    expect(result.some((control) => control.name === 'initialSorting')).toBe(false);
    expect(result.some((control) => control.name === 'checked')).toBe(true);
  });
});
