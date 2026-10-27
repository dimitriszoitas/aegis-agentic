import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  absoluteColors,
  colorAlphaStops,
  colorPalettes,
  colorSteps,
  createPrimitiveColorCss,
  createSemanticColorMap,
  semanticColorPrimitiveMap,
  semanticAlphaPrimitiveMap,
  semanticOpacityStops,
  opacityToken,
} from './color-palettes';

const source = (name: string) =>
  readFileSync(new URL(`../styles/${name}`, import.meta.url), 'utf8');
const declarations = (css: string) =>
  new Map(
    [...css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]),
  );

describe('primitive color foundations', () => {
  it('provides 21 named palettes, each with 14 distinct perceptually ordered sRGB colors', () => {
    expect(colorPalettes.map((palette) => palette.name)).toEqual([
      'Neutral',
      'Slate',
      'Red',
      'Orange',
      'Amber',
      'Yellow',
      'Lemon',
      'Lime',
      'Green',
      'Emerald',
      'Teal',
      'Cyan',
      'Sky',
      'Blue',
      'Cobalt',
      'Indigo',
      'Violet',
      'Purple',
      'Fuchsia',
      'Pink',
      'Rose',
    ]);
    expect(colorSteps).toEqual([
      50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300,
    ]);
    expect(colorPalettes.filter((palette) => palette.kind === 'neutral')).toHaveLength(2);
    for (const palette of colorPalettes) {
      expect(palette.colors.map((color) => color.step)).toEqual(colorSteps);
      expect(new Set(palette.colors.map((color) => color.hex)).size).toBe(14);
      for (const [index, color] of palette.colors.entries()) {
        expect(color.hex).toMatch(/^#[\da-f]{6}$/);
        expect(color.lightness).toBeGreaterThan(0);
        expect(color.lightness).toBeLessThan(1);
        if (index > 0) expect(color.lightness).toBeLessThan(palette.colors[index - 1].lightness);
      }
    }
  });

  it('provides two exact 14-stop alpha scales per palette, referenced to the 300 and 700 bases', () => {
    expect(colorAlphaStops).toEqual([5, 12, 19, 26, 33, 40, 47, 53, 60, 67, 74, 81, 88, 95]);
    for (const palette of colorPalettes) {
      for (const [mode, base] of [
        ['light', 300],
        ['dark', 700],
      ] as const) {
        const scale = palette.alpha[mode];
        expect(scale.base).toBe(base);
        expect(scale.colors.map((color) => color.opacity)).toEqual(colorAlphaStops);
        const baseColor = palette.colors.find((color) => color.step === base)!;
        for (const [index, color] of scale.colors.entries()) {
          expect(color.value).toBe(
            `rgb(from var(${baseColor.token}) r g b / var(${opacityToken(color.opacity)}))`,
          );
          expect(color.hex.slice(0, 7)).toBe(baseColor.hex);
          expect(parseInt(color.hex.slice(7), 16)).toBe(Math.round((color.opacity * 255) / 100));
          if (index > 0) expect(color.opacity).toBeGreaterThan(scale.colors[index - 1].opacity);
        }
      }
    }
  });

  it('generates the complete palette catalog without redefining existing primitive or semantic colors', () => {
    const css = source('primitive-color-tokens.css');
    expect(css).toBe(createPrimitiveColorCss());
    const tokens = declarations(css);
    expect(tokens.size).toBe(901);
    const existing = declarations(
      source('tokens.css') + source('fundamental-tokens.css') + source('component-tokens.css'),
    );
    for (const name of tokens.keys()) expect(existing.has(name), name).toBe(false);
    for (const opacity of colorAlphaStops)
      expect(tokens.get(opacityToken(opacity))).toBe(String(opacity / 100));
    const all = new Map([...existing, ...tokens]);
    for (const [name, value] of tokens)
      for (const [, reference] of value.matchAll(/var\(\s*(--[\w-]+)/g))
        expect(all.has(reference), `${name} references ${reference}`).toBe(true);
  });

  it('maps every original Fundamental color to an exact primitive, without nearest-color substitution', () => {
    // Original rendered RGB values, recorded before semantic rewiring.
    const originalColors = [
      0xf6f7f8, 0x0d0d0e, 0xffffff, 0x171718, 0x09090a, 0x212122, 0x202124, 0xf2f3f5, 0x626670,
      0xa6aab3, 0x6a6e77, 0x9399a3, 0xeceef1, 0x212224, 0xe3e5e9, 0x1b1b1c, 0xeaebee, 0x2c2d2f,
      0xd8dae0, 0x38393c, 0x7d828c, 0x727986, 0x08090a, 0x356ac3, 0x7ba5ed, 0x2c5caf, 0x93b7f2,
      0xc72b2b, 0xff4d4f, 0x117e50, 0x18b85e, 0x986000, 0xeac000, 0xb9ef54, 0x466b09, 0xc6f76b,
      0x10181f, 0x7540dc, 0xb18aff, 0x79a5ff, 0x2455c4, 0x8bb5ff, 0xbf92ff, 0x7335b8, 0xc6a1ff,
      0xd62b2b, 0xc54f10, 0xff8a3d, 0x9b6b00, 0x65707e, 0x00b8cc,
    ];
    const tokens = declarations(source('primitive-color-tokens.css'));
    expect(originalColors).toHaveLength(51);
    for (const rgb of originalColors) {
      const value = '#' + rgb.toString(16).padStart(6, '0');
      const token = semanticColorPrimitiveMap[value];
      expect(token, value).toBeTruthy();
      expect(tokens.get(token), token).toBe(value);
    }
    expect(Object.keys(semanticColorPrimitiveMap)).toHaveLength(59);
    for (const endpoint of absoluteColors) expect(tokens.get(endpoint.token)).toBe(endpoint.value);
    const savedMap = JSON.parse(
      readFileSync(new URL('./semantic-color-map.json', import.meta.url), 'utf8'),
    );
    expect(savedMap).toEqual(createSemanticColorMap());
  });

  it('keeps exact scrim opacity independent from the displayed alpha samples', () => {
    const tokens = declarations(source('primitive-color-tokens.css'));
    expect(semanticOpacityStops).toEqual([32, 65]);
    for (const opacity of semanticOpacityStops) {
      expect(tokens.get(`--opacity-${opacity}`)).toBe(String(opacity / 100));
      expect(semanticAlphaPrimitiveMap[`rgb(8 9 10 / ${opacity}%)`]).toBe(
        `rgb(from var(--color-slate-1300) r g b / var(--opacity-${opacity}))`,
      );
      expect(colorAlphaStops).not.toContain(opacity);
    }
    expect(tokens.get('--color-slate-1300')).toBe('#' + '08090a');
  });

  it('keeps the displayed palettes identical to the canonical raw primitive manifest', () => {
    const { tokens } = JSON.parse(
      readFileSync(new URL('../../tokens/design-tokens.json', import.meta.url), 'utf8'),
    );
    for (const palette of colorPalettes) {
      for (const color of palette.colors) {
        expect(tokens[color.token]?.tier, color.token).toBe('primitive');
        expect(tokens[color.token]?.value, color.token).toBe(color.hex);
      }
      for (const scale of [palette.alpha.light, palette.alpha.dark]) {
        for (const color of scale.colors) {
          expect(tokens[color.token]?.tier, color.token).toBe('primitive');
          expect(tokens[color.token]?.value, color.token).toBe(
            `rgb(from ${color.hex.slice(0, 7)} r g b / ${color.opacity / 100})`,
          );
        }
      }
    }
  });

  it('exports named elevation aliases with valid references and keeps actual overlay roles explicit', () => {
    const elevation = declarations(source('elevation-tokens.css'));
    const all = new Map([
      ...declarations(source('tokens.css')),
      ...declarations(source('component-tokens.css')),
      ...elevation,
    ]);
    expect(elevation.get('--shadow-sm')).toBe('var(--shadow-raised)');
    expect(elevation.get('--shadow-md')).toBe('var(--shadow-floating)');
    expect(elevation.get('--shadow-lg')).toBe('var(--shadow-overlay)');
    for (const [name, value] of elevation)
      for (const [, reference] of value.matchAll(/var\(\s*(--[\w-]+)/g))
        expect(all.has(reference), `${name} references ${reference}`).toBe(true);
    expect(source('fundamental-overlays.css')).toContain(
      'box-shadow: var(--group-surface-overlay-shadow-popover) !important',
    );
    expect(source('fundamental-overlays.css')).toContain(
      'box-shadow: var(--group-surface-overlay-shadow-dialog) !important',
    );
  });
});
