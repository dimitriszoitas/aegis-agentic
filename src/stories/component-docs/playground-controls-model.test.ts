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

describe('inherited component controls', () => {
  const component: ComponentMetadata = {
    ...meta,
    name: 'PasswordInput',
    exportNames: ['PasswordInput'],
    variants: [{ name: 'size', values: ['sm', 'md', 'lg'] }],
    props: [
      {
        component: 'PasswordInput',
        name: 'label',
        type: 'ReactNode',
        required: false,
        inherited: true,
        declaration: { source: 'src/components/text-input/text-input.tsx', kind: 'design-system' },
      },
      {
        component: 'PasswordInput',
        name: 'size',
        type: 'TextInputSize | undefined',
        required: false,
        inherited: true,
        declaration: { source: 'src/components/text-input/text-input.tsx', kind: 'design-system' },
      },
      {
        component: 'PasswordInput',
        name: 'invalid',
        type: 'boolean | undefined',
        required: false,
        inherited: true,
        declaration: { source: 'src/components/text-input/text-input.tsx', kind: 'design-system' },
      },
      {
        component: 'PasswordInput',
        name: 'value',
        type: 'string | undefined',
        required: false,
        inherited: true,
        declaration: { source: 'src/components/text-input/text-input.tsx', kind: 'design-system' },
      },
      {
        component: 'PasswordInput',
        name: 'prefix',
        type: 'ReactNode',
        required: false,
        inherited: true,
        declaration: { source: 'src/components/text-input/text-input.tsx', kind: 'design-system' },
      },
      {
        component: 'PasswordInput',
        name: 'disabled',
        type: 'boolean | undefined',
        required: false,
        inherited: true,
        declaration: { source: 'node_modules/@types/react/index.d.ts', kind: 'platform' },
      },
      {
        component: 'PasswordInput',
        name: 'draggable',
        type: 'boolean | undefined',
        required: false,
        inherited: true,
        declaration: { source: 'node_modules/@types/react/index.d.ts', kind: 'platform' },
      },
    ],
  };
  it('honors authored label, size and invalid controls without exposing native HTML props', () => {
    const args = {
      label: 'Account password',
      size: 'lg',
      invalid: true,
      value: 'edited secret',
      draggable: false,
    };
    const before = structuredClone(args);
    const result = playgroundControls(
      component,
      {
        label: { control: 'text' },
        size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
        invalid: { control: 'boolean' },
        draggable: { control: 'boolean' },
      },
      args,
    );
    expect(result.map((item) => item.name).sort()).toEqual([
      'disabled',
      'invalid',
      'label',
      'size',
      'value',
    ]);
    expect(result.find((item) => item.name === 'label')).toMatchObject({
      type: 'text',
      defaultValue: 'Account password',
    });
    expect(
      result.find((item) => item.name === 'size')?.options?.map((option) => option.value),
    ).toEqual(['sm', 'md', 'lg']);
    expect(result.find((item) => item.name === 'invalid')).toMatchObject({
      type: 'boolean',
      defaultValue: true,
    });
    expect(result.find((item) => item.name === 'value')).toMatchObject({
      defaultValue: 'edited secret',
    });
    expect(args).toEqual(before);
  });
  it('retains explicit exclusions and includes primitive component configuration without callback controls', () => {
    const extended = {
      ...component,
      props: [
        ...component.props,
        {
          component: 'PasswordInput',
          name: 'smallStep',
          type: 'number | undefined',
          required: false,
          inherited: true,
          declaration: {
            source: 'node_modules/@base-ui/react/number-field/root/NumberFieldRoot.d.ts',
            kind: 'dependency' as const,
          },
        },
        {
          component: 'PasswordInput',
          name: 'onValueChange',
          type: '(value: number) => void',
          required: false,
          inherited: true,
          declaration: {
            source: 'node_modules/@base-ui/react/number-field/root/NumberFieldRoot.d.ts',
            kind: 'dependency' as const,
          },
        },
      ],
    };
    const result = playgroundControls(
      extended,
      {
        label: { control: false },
        invalid: { table: { disable: true } },
        onValueChange: { control: 'object' },
        smallStep: { control: 'number' },
      },
      { label: 'Hidden', value: 'unchanged', invalid: true, smallStep: 0.5 },
    );
    for (const name of ['label', 'invalid', 'onValueChange'])
      expect(result.some((item) => item.name === name)).toBe(false);
    expect(result.find((item) => item.name === 'smallStep')).toMatchObject({
      type: 'number',
      defaultValue: 0.5,
    });
    expect(result.find((item) => item.name === 'value')?.defaultValue).toBe('unchanged');
  });
});
