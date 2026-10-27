/** Canonical primitive ramps. Exact theme anchors preserve the supplied visual language. */
export const colorSteps = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300,
] as const;
export const colorAlphaStops = [5, 12, 19, 26, 33, 40, 47, 53, 60, 67, 74, 81, 88, 95] as const;
export type ColorStep = (typeof colorSteps)[number];
export type ColorAlphaStop = (typeof colorAlphaStops)[number];
export interface PrimitiveColor {
  step: ColorStep;
  token: string;
  value: string;
  hex: string;
  /** Perceptual lightness measured from the final in-gamut sRGB color. */
  lightness: number;
}
export interface PrimitiveAlphaColor {
  opacity: ColorAlphaStop;
  token: string;
  value: string;
  /** Eight-digit sRGB preview. CSS uses the exact percentage through the opacity token. */
  hex: string;
}
export interface ColorPalette {
  id: string;
  name: string;
  kind: 'neutral' | 'color';
  colors: PrimitiveColor[];
  alpha: {
    light: { base: 300; colors: PrimitiveAlphaColor[] };
    dark: { base: 700; colors: PrimitiveAlphaColor[] };
  };
}

type RGB = [number, number, number];
type ColorAnchor = { step: ColorStep; rgb: RGB };
type Profile = {
  name: string;
  hue: number;
  chroma: number;
  neutral?: boolean;
  anchors?: ColorAnchor[];
};
const profiles: Profile[] = [
  {
    name: 'Neutral',
    hue: 0,
    chroma: 0,
    neutral: true,
    anchors: [
      { step: 50, rgb: [246, 247, 248] },
      { step: 100, rgb: [236, 238, 241] },
      { step: 200, rgb: [234, 235, 238] },
      { step: 300, rgb: [216, 218, 224] },
      { step: 700, rgb: [56, 57, 60] },
      { step: 800, rgb: [44, 45, 47] },
      { step: 900, rgb: [33, 33, 34] },
      { step: 1000, rgb: [27, 27, 28] },
      { step: 1100, rgb: [23, 23, 24] },
      { step: 1200, rgb: [13, 13, 14] },
      { step: 1300, rgb: [9, 9, 10] },
    ],
  },
  {
    name: 'Slate',
    hue: 255,
    chroma: 0.025,
    neutral: true,
    anchors: [
      { step: 50, rgb: [242, 243, 245] },
      { step: 100, rgb: [227, 229, 233] },
      { step: 300, rgb: [166, 170, 179] },
      { step: 400, rgb: [147, 153, 163] },
      { step: 500, rgb: [125, 130, 140] },
      { step: 600, rgb: [114, 121, 134] },
      { step: 700, rgb: [101, 112, 126] },
      { step: 800, rgb: [106, 110, 119] },
      { step: 900, rgb: [98, 102, 112] },
      { step: 1000, rgb: [33, 34, 36] },
      { step: 1100, rgb: [32, 33, 36] },
      { step: 1200, rgb: [16, 24, 31] },
      { step: 1300, rgb: [8, 9, 10] },
    ],
  },
  {
    name: 'Red',
    hue: 25,
    chroma: 0.23,
    anchors: [
      { step: 500, rgb: [255, 77, 79] },
      { step: 600, rgb: [214, 43, 43] },
      { step: 700, rgb: [199, 43, 43] },
    ],
  },
  {
    name: 'Orange',
    hue: 48,
    chroma: 0.21,
    anchors: [
      { step: 400, rgb: [255, 138, 61] },
      { step: 600, rgb: [197, 79, 16] },
    ],
  },
  {
    name: 'Amber',
    hue: 75,
    chroma: 0.18,
    anchors: [
      { step: 600, rgb: [155, 107, 0] },
      { step: 700, rgb: [152, 96, 0] },
    ],
  },
  { name: 'Yellow', hue: 100, chroma: 0.19, anchors: [{ step: 300, rgb: [234, 192, 0] }] },
  {
    name: 'Lemon',
    hue: 106,
    chroma: 0.22,
    anchors: [
      { step: 200, rgb: [255, 248, 153] },
      { step: 300, rgb: [255, 240, 77] },
      { step: 400, rgb: [255, 230, 0] },
      { step: 500, rgb: [230, 205, 0] },
      { step: 600, rgb: [184, 163, 0] },
      { step: 700, rgb: [138, 122, 0] },
    ],
  },
  {
    name: 'Lime',
    hue: 125,
    chroma: 0.21,
    anchors: [
      { step: 200, rgb: [198, 247, 107] },
      { step: 300, rgb: [185, 239, 84] },
      { step: 700, rgb: [70, 107, 9] },
    ],
  },
  {
    name: 'Green',
    hue: 145,
    chroma: 0.19,
    anchors: [
      { step: 500, rgb: [24, 184, 94] },
      { step: 600, rgb: [17, 126, 80] },
    ],
  },
  { name: 'Emerald', hue: 165, chroma: 0.17 },
  { name: 'Teal', hue: 185, chroma: 0.15 },
  { name: 'Cyan', hue: 210, chroma: 0.16, anchors: [{ step: 400, rgb: [0, 184, 204] }] },
  { name: 'Sky', hue: 235, chroma: 0.18 },
  {
    name: 'Blue',
    hue: 260,
    chroma: 0.17,
    anchors: [
      { step: 300, rgb: [147, 183, 242] },
      { step: 400, rgb: [123, 165, 237] },
      { step: 600, rgb: [53, 106, 195] },
      { step: 700, rgb: [44, 92, 175] },
    ],
  },
  {
    name: 'Cobalt',
    hue: 264,
    chroma: 0.2,
    anchors: [
      { step: 300, rgb: [139, 181, 255] },
      { step: 400, rgb: [121, 165, 255] },
      { step: 700, rgb: [36, 85, 196] },
    ],
  },
  { name: 'Indigo', hue: 277, chroma: 0.23 },
  {
    name: 'Violet',
    hue: 295,
    chroma: 0.23,
    anchors: [
      { step: 400, rgb: [177, 138, 255] },
      { step: 600, rgb: [117, 64, 220] },
    ],
  },
  {
    name: 'Purple',
    hue: 310,
    chroma: 0.23,
    anchors: [
      { step: 300, rgb: [198, 161, 255] },
      { step: 400, rgb: [191, 146, 255] },
      { step: 700, rgb: [115, 53, 184] },
    ],
  },
  { name: 'Fuchsia', hue: 328, chroma: 0.24 },
  { name: 'Pink', hue: 348, chroma: 0.22 },
  { name: 'Rose', hue: 8, chroma: 0.22 },
];
const lightnessStops = [
  0.985, 0.965, 0.93, 0.88, 0.79, 0.68, 0.55, 0.49, 0.43, 0.37, 0.31, 0.255, 0.2, 0.145,
];
const chromaStops = [
  0.08, 0.16, 0.27, 0.43, 0.7, 0.92, 1, 0.94, 0.85, 0.75, 0.63, 0.51, 0.38, 0.25,
];
const linear = (value: number) =>
  value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
const encoded = (value: number) =>
  value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;

/** Oklab/sRGB conversion matrices, as documented by CSS Color 4. */
function toOklab(rgb: RGB): RGB {
  const [r, g, b] = rgb.map((channel) => linear(channel / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function fromOklch(lightness: number, chroma: number, hue: number): RGB {
  const angle = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(angle),
    b = chroma * Math.sin(angle);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    encoded(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    encoded(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    encoded(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}
function inGamut(rgb: RGB) {
  return rgb.every((channel) => channel >= 0 && channel <= 1);
}
function mappedRgb(lightness: number, chroma: number, hue: number): RGB {
  let low = 0,
    high = chroma;
  if (!inGamut(fromOklch(lightness, chroma, hue))) {
    // Reduce chroma at fixed lightness/hue, rather than clipping channels and shifting hue.
    for (let iteration = 0; iteration < 28; iteration++) {
      const midpoint = (low + high) / 2;
      if (inGamut(fromOklch(lightness, midpoint, hue))) low = midpoint;
      else high = midpoint;
    }
    chroma = low;
  }
  return fromOklch(lightness, chroma, hue).map((channel) =>
    Math.round(Math.max(0, Math.min(1, channel)) * 255),
  ) as RGB;
}
const hexOf = (rgb: RGB) =>
  '#' + rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('');
export const opacityToken = (opacity: ColorAlphaStop) =>
  `--opacity-${String(opacity).padStart(2, '0')}`;

/** Interpolate between exact theme anchors in Oklab, preserving their original RGB bytes. */
function profileColors(profile: Profile): PrimitiveColor[] {
  const anchors = new Map(profile.anchors?.map((anchor) => [anchor.step, anchor.rgb]));
  const samples = new Map<number, RGB>();
  for (const [index, step] of colorSteps.entries()) {
    const exact = anchors.get(step);
    if (exact) samples.set(index, toOklab(exact));
    else if (index === 0 || index === colorSteps.length - 1) {
      const angle = (profile.hue * Math.PI) / 180;
      const chroma = profile.chroma * chromaStops[index];
      samples.set(index, [
        lightnessStops[index],
        chroma * Math.cos(angle),
        chroma * Math.sin(angle),
      ]);
    }
  }
  return colorSteps.map((step, index) => {
    let rgb = anchors.get(step);
    if (!rgb && !profile.anchors?.length)
      rgb = mappedRgb(lightnessStops[index], profile.chroma * chromaStops[index], profile.hue);
    if (!rgb) {
      const positions = [...samples.keys()].sort((a, b) => a - b);
      const before = positions.filter((position) => position <= index).at(-1)!;
      const after = positions.find((position) => position >= index)!;
      const fraction = before === after ? 0 : (index - before) / (after - before);
      const start = samples.get(before)!;
      const finish = samples.get(after)!;
      const [lightness, a, b] = start.map(
        (value, channel) => value + (finish[channel] - value) * fraction,
      );
      rgb = mappedRgb(lightness, Math.hypot(a, b), (Math.atan2(b, a) * 180) / Math.PI);
    }
    const hex = hexOf(rgb);
    return {
      step,
      token: `--color-${profile.name.toLowerCase()}-${step}`,
      value: hex,
      hex,
      lightness: toOklab(rgb)[0],
    };
  });
}

export const colorPalettes: ColorPalette[] = profiles.map((profile) => {
  const id = profile.name.toLowerCase();
  const colors = profileColors(profile);
  function alpha(base: 300 | 700): PrimitiveAlphaColor[] {
    const baseColor = colors.find((color) => color.step === base)!;
    return colorAlphaStops.map((opacity) => ({
      opacity,
      token: `${baseColor.token}-alpha-${String(opacity).padStart(2, '0')}`,
      value: `rgb(from var(${baseColor.token}) r g b / var(${opacityToken(opacity)}))`,
      hex:
        baseColor.hex +
        Math.round((opacity / 100) * 255)
          .toString(16)
          .padStart(2, '0'),
    }));
  }
  return {
    id,
    name: profile.name,
    kind: profile.neutral ? 'neutral' : 'color',
    colors,
    alpha: { light: { base: 300, colors: alpha(300) }, dark: { base: 700, colors: alpha(700) } },
  };
});

/** Absolute endpoints are primitives, not additional near-neutral palettes. */
export const absoluteColors = [
  { name: 'White', token: '--color-white', value: hexOf([255, 255, 255]) },
  { name: 'Black', token: '--color-black', value: hexOf([0, 0, 0]) },
  { name: 'Transparent', token: '--color-transparent', value: 'transparent' },
];
/** Exact semantic opacity constants stay separate from the 14 displayed alpha samples. */
export const semanticOpacityStops = [32, 65] as const;
export const semanticColorPrimitiveMap: Record<string, string> = Object.fromEntries([
  ...absoluteColors.map((color) => [color.value, color.token]),
  ...profiles.flatMap((profile) =>
    (profile.anchors ?? []).map((anchor) => [
      hexOf(anchor.rgb),
      `--color-${profile.name.toLowerCase()}-${anchor.step}`,
    ]),
  ),
]);
export const semanticAlphaPrimitiveMap: Record<string, string> = Object.fromEntries(
  semanticOpacityStops.map((opacity) => [
    `rgb(8 9 10 / ${opacity}%)`,
    `rgb(from var(--color-slate-1300) r g b / var(--opacity-${opacity}))`,
  ]),
);
export function createSemanticColorMap() {
  return { colors: semanticColorPrimitiveMap, alpha: semanticAlphaPrimitiveMap };
}

export function createPrimitiveColorCss(): string {
  const declarations = [...colorAlphaStops, ...semanticOpacityStops].map(
    (opacity) => `  --opacity-${String(opacity).padStart(2, '0')}: ${opacity / 100};`,
  );
  declarations.push('\n  /* Absolute color endpoints. */');
  for (const color of absoluteColors) declarations.push(`  ${color.token}: ${color.value};`);
  for (const palette of colorPalettes) {
    declarations.push(`\n  /* ${palette.name}: opaque scale, then 300/700 alpha scales. */`);
    for (const color of palette.colors) declarations.push(`  ${color.token}: ${color.value};`);
    for (const scale of [palette.alpha.light, palette.alpha.dark])
      for (const color of scale.colors) declarations.push(`  ${color.token}: ${color.value};`);
  }
  return `/* Generated by scripts/generate-color-palettes.mjs. Theme anchors retain exact RGB values. */\n:root,\n.aegis-theme-light,\n.dark {\n${declarations.join('\n')}\n}\n`;
}
