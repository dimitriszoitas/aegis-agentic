import { useState, type CSSProperties } from 'react';
import { Button } from '@/components/button';
import { ThemeFrame, foundationTokenValue } from './foundation-examples';
import { tokenNames, tokenValues } from './token-source';
import './foundation-detail-examples.css';

const value = foundationTokenValue;
const cssToken = (name: string) => `var(${name})`;

export function TypographyRoles() {
  const roles = [
    {
      name: '--semantic-font-size-title-page',
      label: 'Page title',
      sample: 'Workspace overview',
      weight: '--semantic-title-weight',
    },
    {
      name: '--semantic-font-size-subheading',
      label: 'Section title',
      sample: 'Recent activity',
      weight: '--semantic-title-weight',
    },
    {
      name: '--semantic-font-size-subheading',
      label: 'Panel title',
      sample: 'Project details',
      weight: '--semantic-title-weight',
    },
    {
      name: '--semantic-font-size-body',
      label: 'Body text',
      sample: 'Review the latest changes with your team.',
      weight: '--semantic-font-weight-regular',
    },
    {
      name: '--semantic-font-size-label',
      label: 'Supporting text',
      sample: 'Updated a few moments ago',
      weight: '--semantic-font-weight-regular',
    },
    {
      name: '--semantic-metric-value-size',
      label: 'Metric value',
      sample: '12,480',
      weight: '--semantic-font-weight-semibold',
    },
  ];
  return (
    <div className="foundation-detail foundation-detail-stack">
      {roles.map((role) => (
        <div className="foundation-detail-type-role" key={role.label}>
          <div>
            <strong>{role.label}</strong>
            <code>
              {role.name}: {value(role.name)}
            </code>
          </div>
          <span
            style={{
              fontSize: cssToken(role.name),
              fontWeight: cssToken(role.weight),
              fontVariantNumeric:
                role.name === '--semantic-metric-value-size' ? 'tabular-nums' : undefined,
            }}
          >
            {role.sample}
          </span>
        </div>
      ))}
    </div>
  );
}

export function FontExamples() {
  return (
    <div className="foundation-detail foundation-detail-fonts">
      <div>
        <code>--semantic-font-family-ui</code>
        <p className="foundation-detail-font-ui">Clear labels. Readable interfaces.</p>
        <small>{value('--semantic-font-family-ui')}</small>
      </div>
      <div>
        <code>--semantic-font-family-code</code>
        <p className="foundation-detail-font-code">PRJ-0042 · 2026-10-24 · 98.4%</p>
        <small>{value('--semantic-font-family-code')}</small>
      </div>
    </div>
  );
}

export function FontWeightExamples() {
  return (
    <div className="foundation-detail foundation-detail-stack">
      {tokenNames('--semantic-font-weight-')
        .sort((a, b) => Number(value(a)) - Number(value(b)))
        .map((name) => (
          <div className="foundation-detail-weight" key={name}>
            <code>
              {name}: {value(name)}
            </code>
            <span style={{ fontWeight: cssToken(name) }}>Project activity</span>
          </div>
        ))}
    </div>
  );
}

export function MotionTimingExamples() {
  const [end, setEnd] = useState(false);
  const durations = ['--semantic-motion-fast', '--semantic-motion-base', '--semantic-motion-slide'];
  return (
    <div className="foundation-detail foundation-detail-stack">
      <div className="foundation-detail-actions">
        <Button
          emphasis="secondary"
          onClick={() => setEnd((previous) => !previous)}
          aria-pressed={end}
        >
          Move samples
        </Button>
        <span>Current position: {end ? 'end' : 'start'}</span>
      </div>
      {durations.map((name) => (
        <div className="foundation-detail-motion-row" key={name}>
          <div>
            <code>{name}</code>
            <span>{value(name)}</span>
          </div>
          <div className="foundation-detail-motion-track" aria-hidden="true">
            <div
              className="foundation-detail-motion-travel"
              data-end={end || undefined}
              style={{ transitionDuration: cssToken(name) }}
            >
              <span />
            </div>
          </div>
        </div>
      ))}
      <p>
        <code>--semantic-ease-out</code>: <code>{value('--semantic-ease-out')}</code>
      </p>
      <p>The samples move only when activated. Reduced-motion preferences remove the transition.</p>
    </div>
  );
}

export function OpacityExamples({ scale = 'alpha' }: { scale?: 'alpha' | 'component' }) {
  const names = (
    scale === 'alpha'
      ? tokenNames('--opacity-').filter((name) => /^--opacity-\d{2}$/.test(name))
      : tokenNames('--semantic-opacity-')
  ).sort((a, b) => Number(value(a)) - Number(value(b)));
  return (
    <div className="foundation-theme-pair" data-opacity-scale={scale}>
      {(['light', 'dark'] as const).map((theme) => (
        <ThemeFrame key={theme} theme={theme}>
          <div className="foundation-detail-opacity-list">
            {names.map((name) => (
              <div className="foundation-detail-opacity-row" key={name}>
                <div>
                  <code>{name}</code>
                  <span>
                    {foundationTokenValue(name, theme)} ·{' '}
                    {Math.round(Number(foundationTokenValue(name, theme)) * 100)}%
                  </span>
                </div>
                <div className="foundation-detail-opacity-checker" aria-hidden="true">
                  <span style={{ opacity: cssToken(name) }} />
                </div>
              </div>
            ))}
          </div>
        </ThemeFrame>
      ))}
    </div>
  );
}

const shadowRoles = [
  { name: '--semantic-elevation-0', label: 'No shadow' },
  { name: '--semantic-elevation-1', label: 'Raised' },
  { name: '--semantic-elevation-2', label: 'Floating' },
  { name: '--semantic-elevation-3', label: 'Overlay' },
  { name: '--semantic-shadow-popover', label: 'Popover' },
  { name: '--semantic-shadow-dialog', label: 'Dialog' },
] as const;

export function ElevationExamples() {
  return (
    <div className="foundation-theme-pair">
      {(['light', 'dark'] as const).map((theme) => (
        <ThemeFrame key={theme} theme={theme}>
          <div className="foundation-detail-elevation-grid">
            {shadowRoles.map(({ name, label }) => (
              <div className="foundation-detail-shadow-specimen" key={name}>
                <div className="foundation-detail-shadow-stage" aria-hidden="true">
                  <div
                    className="foundation-detail-shadow-box"
                    data-shadow-token={name}
                    style={{ '--foundation-example-shadow': cssToken(name) } as CSSProperties}
                  >
                    <span />
                    <span />
                  </div>
                </div>
                <strong>{label}</strong>
                <code>{name}</code>
                <details>
                  <summary>Source value</summary>
                  <code>{tokenValues[theme][name]}</code>
                </details>
              </div>
            ))}
          </div>
        </ThemeFrame>
      ))}
    </div>
  );
}

function ShadowShape() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden="true" focusable="false">
      <path d="M22 10H77L98 31V70H22Z" />
      <path
        className="foundation-detail-shadow-shape-detail"
        d="M35 34H66V39H35ZM35 47H83V52H35Z"
      />
    </svg>
  );
}

export function DropShadowExamples() {
  const names = [
    '--semantic-drop-shadow-sm',
    '--semantic-drop-shadow-md',
    '--semantic-drop-shadow-lg',
  ];
  return (
    <div className="foundation-theme-pair">
      {(['light', 'dark'] as const).map((theme) => (
        <ThemeFrame key={theme} theme={theme}>
          <div className="foundation-detail-drop-list">
            {names.map((name) => (
              <div className="foundation-detail-drop-specimen" key={name}>
                <div className="foundation-detail-shadow-stage" aria-hidden="true">
                  <div
                    className="foundation-detail-shadow-shape"
                    data-drop-shadow-token={name}
                    style={{ filter: `drop-shadow(${cssToken(name)})` }}
                  >
                    <ShadowShape />
                  </div>
                </div>
                <code>{name}</code>
                <details>
                  <summary>Source value</summary>
                  <code>{tokenValues[theme][name]}</code>
                </details>
              </div>
            ))}
          </div>
        </ThemeFrame>
      ))}
    </div>
  );
}

export function ShadowGeometryExamples() {
  return (
    <div className="foundation-detail foundation-detail-shadow-comparison">
      {(['box', 'shape'] as const).map((kind) => (
        <div key={kind}>
          <div className="foundation-detail-shadow-stage" aria-hidden="true">
            <div
              className="foundation-detail-shadow-shape"
              data-shadow-geometry={kind}
              style={
                kind === 'box'
                  ? { boxShadow: cssToken('--semantic-drop-shadow-md') }
                  : { filter: `drop-shadow(${cssToken('--semantic-drop-shadow-md')})` }
              }
            >
              <ShadowShape />
            </div>
          </div>
          <strong>{kind === 'box' ? 'Box boundary' : 'Painted shape'}</strong>
          <code>
            {kind === 'box'
              ? 'box-shadow: var(--semantic-drop-shadow-md)'
              : 'filter: drop-shadow(var(--semantic-drop-shadow-md))'}
          </code>
        </div>
      ))}
    </div>
  );
}

export function BorderWidthExamples() {
  return (
    <div className="foundation-detail foundation-detail-stack">
      {tokenNames('--semantic-border-width-').map((name) => (
        <div className="foundation-detail-width-row" key={name}>
          <code>
            {name}: {value(name)}
          </code>
          <span style={{ borderTopWidth: cssToken(name) }} aria-hidden="true" />
        </div>
      ))}
    </div>
  );
}

export function BorderStyleExamples() {
  const styles: { style: CSSProperties['borderStyle']; label: string; description: string }[] = [
    {
      style: 'none',
      label: 'None',
      description: 'Borderless cards use their fill and spacing to group content.',
    },
    {
      style: 'solid',
      label: 'Solid',
      description: 'Fields, separators, and explicit control boundaries.',
    },
    {
      style: 'dashed',
      label: 'Dashed',
      description: 'The FileUpload drop zone distinguishes an upload target.',
    },
  ];
  return (
    <div className="foundation-detail foundation-detail-style-grid">
      {styles.map(({ style, label, description }) => (
        <div key={label}>
          <div
            className="foundation-detail-border-style"
            style={{ borderStyle: style }}
            aria-hidden="true"
          />
          <strong>{label}</strong>
          <p>{description}</p>
          <code>border-style: {style}</code>
        </div>
      ))}
    </div>
  );
}
