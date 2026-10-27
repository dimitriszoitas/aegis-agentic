import { useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowRight, BellRing, Sparkles } from '@/components/icon';
import { Separator } from '@/components/separator';
import { Button } from '@/components/button';
import { TextInput } from '@/components/text-input';
import { Checkbox } from '@/components/checkbox';
import { Tag } from '@/components/tag';
import { componentToken } from '@/lib/component-design-tokens';
import { SeverityBadge } from '@/components/severity-badge';
import { tokenNames, tokenValues, type TokenTheme } from './token-source';
import './foundations.css';

/** Resolve source aliases for specimen labels without claiming to evaluate CSS layout math. */
export function foundationTokenValue(name: string, theme: TokenTheme = 'light'): string {
  const resolve = (current: string, seen: Set<string>): string => {
    if (seen.has(current)) return `var(${current})`;
    const expression = tokenValues[theme][current];
    if (expression === undefined) return `var(${current})`;
    const next = new Set(seen).add(current);
    return expression.replace(/var\((--[\w-]+)\)/g, (_match, reference: string) =>
      resolve(reference, next),
    );
  };
  return resolve(name, new Set());
}

export interface ThemeFrameProps {
  theme: TokenTheme;
  children: ReactNode;
}
export function ThemeFrame({ theme, children }: ThemeFrameProps) {
  return (
    <section
      className={`foundation-frame ${theme === 'dark' ? 'dark' : 'aegis-theme-light'}`}
      data-theme={theme}
      data-layout-theme="fundamental"
      style={{ ...tokenValues[theme], colorScheme: theme } as CSSProperties}
      aria-label={`${theme} theme examples`}
    >
      <div className="foundation-eyebrow">{theme === 'dark' ? 'Dark theme' : 'Light theme'}</div>
      {children}
    </section>
  );
}

export interface ColorSwatchesProps {
  prefix?: string;
}
export function ColorSwatches({ prefix = '--semantic-color-surface-' }: ColorSwatchesProps) {
  const names = tokenNames(prefix);
  return (
    <div className="foundation-theme-pair">
      {(['light', 'dark'] as const).map((theme) => (
        <ThemeFrame key={theme} theme={theme}>
          <div className="foundation-swatch-grid">
            {names.map((name) => (
              <div className="foundation-swatch" key={name}>
                <div className="foundation-swatch-color" style={{ background: `var(${name})` }} />
                <code>{name.replace('--semantic-color-', '')}</code>
                <span className="foundation-token-value">{tokenValues[theme][name]}</span>
              </div>
            ))}
          </div>
        </ThemeFrame>
      ))}
    </div>
  );
}

const intents = ['function', 'ai', 'destroy', 'success', 'warning'] as const;
export function IntentExamples() {
  return (
    <div className="foundation-theme-pair">
      {(['light', 'dark'] as const).map((theme) => (
        <ThemeFrame key={theme} theme={theme}>
          <div className="foundation-stack">
            {intents.map((intent) => (
              <div className="foundation-intent-row" key={intent}>
                <code>{intent}</code>
                {intent === 'success' || intent === 'warning' ? (
                  <>
                    <Tag intent={intent}>
                      {intent === 'success' ? 'Complete' : 'Needs attention'}
                    </Tag>
                    <Tag intent={intent} variant="status">
                      Status
                    </Tag>
                  </>
                ) : (
                  <>
                    <Button
                      intent={intent}
                      emphasis="primary"
                      leadingIcon={intent === 'ai' ? <Sparkles /> : <ArrowRight />}
                    >
                      Primary
                    </Button>
                    <Button intent={intent} emphasis="secondary">
                      Secondary
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </ThemeFrame>
      ))}
    </div>
  );
}

export function SeverityExamples() {
  return (
    <div className="foundation-theme-pair">
      {(['light', 'dark'] as const).map((theme) => (
        <ThemeFrame key={theme} theme={theme}>
          <div className="foundation-wrap">
            {(['critical', 'high', 'medium', 'low', 'info'] as const).map((severity) => (
              <SeverityBadge key={severity} severity={severity} />
            ))}
          </div>
        </ThemeFrame>
      ))}
    </div>
  );
}

export function SurfaceExamples() {
  return (
    <div className="foundation-theme-pair">
      {(['light', 'dark'] as const).map((theme) => (
        <ThemeFrame key={theme} theme={theme}>
          <div className="foundation-stack">
            {(['canvas', 'surface', 'control', 'overlay'] as const).map((level) => (
              <div className={`foundation-surface foundation-surface-${level}`} key={level}>
                <div>
                  <strong>{level}</strong>
                  <span>Workspace activity · 24 pending tasks</span>
                </div>
              </div>
            ))}
          </div>
        </ThemeFrame>
      ))}
    </div>
  );
}

export function RadiusExamples() {
  return (
    <div className="foundation-example foundation-wrap">
      {tokenNames('--semantic-radius-').map((name) => (
        <div className="foundation-radius" key={name} style={{ borderRadius: `var(${name})` }}>
          <code>{name.replace('--semantic-radius-', '')}</code>
          <span>{foundationTokenValue(name)}</span>
        </div>
      ))}
    </div>
  );
}

export function SurfaceRadiusExamples() {
  return (
    <div className="foundation-example foundation-wrap">
      <div
        className="foundation-radius"
        style={{ borderRadius: 'var(--group-surface-radius-strong)' }}
      >
        <code>surface</code>
        <span>{foundationTokenValue('--group-surface-radius-strong')}</span>
      </div>
      <div className="foundation-nested-radius">
        <div>
          <strong>Nested surfaces</strong>
          <span>
            Outer {foundationTokenValue('--group-surface-radius-strong')} · nested{' '}
            {foundationTokenValue('--group-surface-radius-bold')}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ControlRadiusExamples() {
  return (
    <div className="foundation-theme-pair">
      {(['light', 'dark'] as const).map((theme) => (
        <ThemeFrame theme={theme} key={theme}>
          <div className="foundation-stack">
            {(
              [
                { size: 'sm', height: 28 },
                { size: 'md', height: 34 },
                { size: 'lg', height: 40 },
              ] as const
            ).map((control) => (
              <div className="foundation-control-radius-row" key={control.size}>
                <Button size={control.size} emphasis="secondary">
                  Open details
                </Button>
                <TextInput
                  size={control.size}
                  aria-label={`${control.size} field specimen`}
                  defaultValue="Filter value"
                />
                <span>
                  {control.height}px high · button{' '}
                  {foundationTokenValue(
                    control.size === 'sm'
                      ? '--group-trigger-button-radius-rounded'
                      : '--group-trigger-button-radius-bold',
                  )}{' '}
                  · field {foundationTokenValue('--group-input-field-radius-bold')}
                </span>
              </div>
            ))}
            <div className="foundation-control-radius-row">
              <Checkbox label="Checkbox specimen" />
            </div>
          </div>
        </ThemeFrame>
      ))}
    </div>
  );
}

export function SeparatorExamples() {
  return (
    <div className="foundation-theme-pair">
      {(['light', 'dark'] as const).map((theme) => (
        <ThemeFrame theme={theme} key={theme}>
          <div className="foundation-stack">
            {(['normal', 'light'] as const).map((emphasis) => (
              <div className="foundation-stack" key={emphasis}>
                <code>{emphasis} emphasis</code>
                <Separator emphasis={emphasis} />
                <div className="foundation-wrap">
                  <span>18 events</span>
                  <Separator variant="dot" emphasis={emphasis} />
                  <span>WS-ATH-114</span>
                  <Separator variant="dot" emphasis={emphasis} />
                  <span>Last 24h</span>
                </div>
              </div>
            ))}
          </div>
        </ThemeFrame>
      ))}
    </div>
  );
}

export function SpacingExamples() {
  return (
    <div className="foundation-example foundation-stack">
      {tokenNames('--semantic-space-')
        .filter((name) => /^--semantic-space-x{0,4}[slm]$/.test(name))
        .sort((a, b) => parseFloat(foundationTokenValue(a)) - parseFloat(foundationTokenValue(b)))
        .map((name) => (
          <div className="foundation-spacing-row" key={name}>
            <code>{name.replace('--', '')}</code>
            <div className="foundation-spacing-track">
              <span style={{ width: `var(${name})` }} />
            </div>
            <span>{foundationTokenValue(name)}</span>
          </div>
        ))}
    </div>
  );
}

export function TypographyExamples() {
  return (
    <div className="foundation-example foundation-stack">
      {tokenNames('--semantic-font-size-')
        .sort((a, b) => parseFloat(foundationTokenValue(b)) - parseFloat(foundationTokenValue(a)))
        .map((name) => (
          <div className="foundation-type-row" key={name}>
            <code title={name}>{foundationTokenValue(name)}</code>
            <span style={{ fontSize: `var(${name})` }}>Build with clarity</span>
          </div>
        ))}
      <div className="foundation-type-mono">
        2026-06-18 09:42:16 UTC · PRJ-0042 · Northstar Labs · INV-2026-014
      </div>
      <div className="foundation-type-numbers">1,284 records · 24 projects · 98.4% completion</div>
    </div>
  );
}

export function MotionExamples() {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="foundation-example">
      <button
        className="foundation-demo-button"
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-controls="foundation-motion-panel"
      >
        {expanded ? 'Close' : 'Open'} details panel
      </button>
      <div className="foundation-motion-stage">
        <div
          id="foundation-motion-panel"
          className={`foundation-motion-panel ${expanded ? 'is-open' : ''}`}
          aria-hidden={!expanded}
        >
          <BellRing size={componentToken('icon-lg')} aria-hidden />
          <strong>Background task completed</strong>
          <span>Project Atlas · 6 records updated</span>
        </div>
      </div>
      <div className="foundation-wrap">
        {[
          '--group-navigation-motion-fast',
          '--group-navigation-motion-base',
          '--group-application-business-app-motion-slide',
        ].map((name) => (
          <code key={name}>
            {name}: {tokenValues.light[name]}
          </code>
        ))}
      </div>
      <p>
        Motion follows the device’s reduced-motion preference. Focus stays on the trigger in this
        visual demonstration.
      </p>
    </div>
  );
}

export function AiLanguageExample() {
  return (
    <div className="foundation-example foundation-ai-card">
      <div className="foundation-ai-label">
        <Sparkles size={componentToken('icon-md')} aria-hidden />
        <span className="foundation-ai-text">AI generated · Workspace assistant</span>
      </div>
      <strong>Review the change before applying it</strong>
      <p>
        The supplied records describe a configuration update. Compare the proposed values with the
        current configuration and verify the affected projects before applying the change.
      </p>
      <div className="foundation-wrap">
        <span className="foundation-evidence">Reference · CHANGE-842</span>
        <span className="foundation-evidence">Source · Project configuration</span>
        <span className="foundation-evidence">Confidence · Medium</span>
      </div>
      <div className="foundation-ai-footnote">
        Suggested next step: review the configuration with its owner. A person must approve the
        change before it is applied.
      </div>
    </div>
  );
}

/** The same component row-height tokens used by DataGrid, read from the CSS source. */
export function DensityExamples() {
  return (
    <div className="foundation-density-examples">
      {(['compact', 'default', 'comfortable'] as const).map((density) => (
        <section key={density} aria-label={`${density} grid density`}>
          <div className="foundation-density-label">
            <strong>{density[0].toUpperCase() + density.slice(1)}</strong>
            <code>{tokenValues.light[`--grid-row-${density}`]}</code>
          </div>
          <div className="foundation-density-row" style={{ height: `var(--grid-row-${density})` }}>
            <code>TASK-1049</code>
            <span>Review the project configuration</span>
          </div>
        </section>
      ))}
    </div>
  );
}
export function FoundationLinks() {
  const links = [
    {
      label: 'Compare grid densities',
      id: 'components-data-datagrid--density-matrix',
      description: 'Compact, default, and comfortable rows.',
    },
    {
      label: 'Inspect AI streaming',
      id: 'patterns-ai-aipanel--streaming',
      description: 'Context, cancellation, and reference navigation.',
    },
    {
      label: 'Compare both presentations',
      id: 'foundations-theme--switching',
      description: 'Fundamental and Fundamental Floating with preserved state.',
    },
    {
      label: 'Explore the business application',
      id: 'console-application-demo--demo',
      description: 'Projects, customers, invoices, team profiles, and Aegis AI.',
    },
  ];
  return (
    <nav aria-label="Explore Aegis examples">
      <ul className="foundation-links">
        {links.map((link) => (
          <li key={link.id}>
            <a href={`./?path=/story/${link.id}`} target="_top">
              {link.label}
            </a>
            <p>{link.description}</p>
          </li>
        ))}
      </ul>
    </nav>
  );
}
