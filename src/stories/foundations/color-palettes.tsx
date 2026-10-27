import { useState, type CSSProperties, type ReactNode } from 'react';
import { Tabs } from '@/components/tabs';
import { SearchInput } from '@/components/search-input';
import { Button } from '@/components/button';
import { CopyButton } from '@/components/copy-button';
import {
  colorPalettes,
  colorSteps,
  colorAlphaStops,
  type ColorPalette,
  type PrimitiveColor,
  type PrimitiveAlphaColor,
} from '@/lib/color-palettes';
import './color-palettes.css';

type Color = PrimitiveColor | PrimitiveAlphaColor;

function PaletteRow({
  label,
  prefix,
  colors,
  selected,
  onSelect,
}: {
  label: string;
  prefix: string;
  colors: Color[];
  selected: string;
  onSelect: (color: Color) => void;
}) {
  return (
    <div className="foundation-palette-row">
      <div className="foundation-palette-row-label">
        <span>{label}</span>
        <code>{prefix}</code>
      </div>
      <div className="foundation-palette-scroll" role="group" aria-label={label}>
        <div className="foundation-palette-scale">
          {colors.map((color) => (
            <button
              type="button"
              key={color.token}
              className="foundation-palette-swatch"
              aria-label={`${color.token}, ${color.hex}`}
              aria-pressed={selected === color.token}
              title={`${color.token}\n${color.value}`}
              onClick={() => onSelect(color)}
            >
              <span className="foundation-palette-checker" aria-hidden="true">
                <span style={{ backgroundColor: `var(${color.token})` } as CSSProperties} />
              </span>
              <strong>{'step' in color ? color.step : `${color.opacity}%`}</strong>
              <code>{color.hex}</code>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Palette({ palette }: { palette: ColorPalette }) {
  const [selected, setSelected] = useState<Color>(palette.colors[6]);
  return (
    <section className="foundation-palette" aria-labelledby={`palette-${palette.id}`}>
      <header className="foundation-palette-heading">
        <h2 id={`palette-${palette.id}`}>{palette.name}</h2>
        <span>{palette.kind === 'neutral' ? 'Neutral' : 'Chromatic'} · 42 tokens</span>
      </header>
      <PaletteRow
        label="Solid color"
        prefix={`--color-${palette.id}-{step}`}
        colors={palette.colors}
        selected={selected.token}
        onSelect={setSelected}
      />
      <PaletteRow
        label="Light alpha · 300"
        prefix={`--color-${palette.id}-300-alpha-{opacity}`}
        colors={palette.alpha.light.colors}
        selected={selected.token}
        onSelect={setSelected}
      />
      <PaletteRow
        label="Dark alpha · 700"
        prefix={`--color-${palette.id}-700-alpha-{opacity}`}
        colors={palette.alpha.dark.colors}
        selected={selected.token}
        onSelect={setSelected}
      />
      <div className="foundation-palette-inspector">
        <div aria-live="polite" aria-atomic="true">
          <code>{selected.token}</code>
          <span>{selected.value}</span>
        </div>
        <CopyButton
          size="sm"
          text={`var(${selected.token})`}
          aria-label={`Copy ${selected.token}`}
        />
      </div>
    </section>
  );
}

function PrimitivePalettes() {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const visible = colorPalettes.filter(
    (palette) =>
      (kind === 'all' || kind === palette.kind) &&
      palette.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <div className="foundation-palette-browser sb-unstyled">
      <div className="foundation-palette-intro">
        <h2>{colorPalettes.length} palettes. One consistent scale.</h2>
        <p>
          Each palette has 14 solid colors and two alpha scales, anchored to its light 300 and
          darker 700 colors. Primitives stay the same in both modes. Semantic tokens assign them a
          purpose.
        </p>
        <dl>
          <div>
            <dt>Solid steps</dt>
            <dd>{colorSteps.join(' · ')}</dd>
          </div>
          <div>
            <dt>Alpha opacity</dt>
            <dd>{colorAlphaStops.map((value) => `${value}%`).join(' · ')}</dd>
          </div>
        </dl>
        <p className="foundation-palette-hint">
          Select a swatch to inspect or copy its token. Alpha colors are shown over a checker
          pattern; their final appearance depends on the surface underneath. Eight-digit hex
          previews round alpha to 8 bits; the CSS declaration retains the exact opacity.
        </p>
      </div>
      <div className="foundation-palette-tools">
        <SearchInput
          aria-label="Find a color palette"
          placeholder="Find a palette..."
          value={query}
          onValueChange={setQuery}
        />
        <div role="group" aria-label="Palette category">
          {[
            ['all', 'All palettes'],
            ['neutral', 'Neutrals'],
            ['color', 'Colors'],
          ].map(([value, label]) => (
            <Button
              key={value}
              size="sm"
              emphasis={kind === value ? 'secondary' : 'ghost'}
              aria-pressed={kind === value}
              onClick={() => setKind(value)}
            >
              {label}
            </Button>
          ))}
        </div>
        <span role="status">
          {visible.length} {visible.length === 1 ? 'palette' : 'palettes'}
        </span>
      </div>
      {visible.length ? (
        <div className="foundation-palette-list">
          {visible.map((palette) => (
            <Palette key={palette.id} palette={palette} />
          ))}
        </div>
      ) : (
        <p>No palettes match this search. Try a color name such as Blue or Slate.</p>
      )}
    </div>
  );
}

export function ColorFoundations({ children }: { children: ReactNode }) {
  return (
    <Tabs
      className="foundation-color-tabs"
      label="Color token tiers"
      defaultValue="primitive"
      items={[
        { value: 'primitive', label: 'Primitive colors', content: <PrimitivePalettes /> },
        { value: 'semantic', label: 'Semantic colors', content: children },
      ]}
    />
  );
}
