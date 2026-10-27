import { useState, type CSSProperties } from 'react';
import { Button } from '@/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/card';
import { ArrowRight, Check, Layers, Moon, Server, Sun } from '@/components/icon';
import { SeverityBadge } from '@/components/severity-badge';
import { StatusBadge } from '@/components/status-badge';
import './token-story.css';

/** Visual foundations with a scoped demonstration of the real component tokens. */
export function TokenStory() {
  const [dark, setDark] = useState(true);
  const [reviewed, setReviewed] = useState(false);
  const [spacing, setSpacing] = useState<'default' | 'roomy'>('default');
  const spacingToken = spacing === 'roomy' ? '--space-5' : '--space-3';

  return (
    <section
      id="foundations"
      className="marketing-token-story marketing-container"
      aria-labelledby="token-system-title"
    >
      <div className="marketing-token-heading">
        <div>
          <p className="marketing-section-label">Foundations</p>
          <h2 id="token-system-title">A consistent foundation for every interface.</h2>
        </div>
        <p>
          Color with purpose. Type with hierarchy. Space that scales. The decisions behind clear,
          everyday and data-rich interfaces, already connected.
        </p>
      </div>

      <div className="marketing-token-bento">
        <article className="marketing-token-tile marketing-token-color-tile">
          <div className="marketing-token-color-art" aria-hidden="true">
            <div className="marketing-token-color-card marketing-token-color-card-blue">
              <span>Action</span>
              <strong>Aa</strong>
              <i />
              <small>FUNCTION</small>
            </div>
            <div className="marketing-token-color-card marketing-token-color-card-mint">
              <span>Surface</span>
              <strong>Aa</strong>
              <i />
              <small>SEMANTIC</small>
            </div>
            <div className="marketing-token-color-card marketing-token-color-card-purple">
              <span>Accent</span>
              <strong>Aa</strong>
              <i />
              <small>INTENT</small>
            </div>
          </div>
          <div className="marketing-token-tile-copy">
            <span>COLOR</span>
            <h3>Purpose, in every shade.</h3>
            <p>Surface, text, and action roles adapt together across light and dark.</p>
          </div>
        </article>

        <article className="marketing-token-tile marketing-token-type-tile">
          <div className="marketing-token-type-art" aria-hidden="true">
            <span className="marketing-token-type-family">
              FIGTREE <i>+ MONOSPACE</i>
            </span>
            <div className="marketing-token-type-specimen">
              Ag<span>123</span>
            </div>
            <div className="marketing-token-type-scale">
              <strong>Overview</strong>
              <span>Scan the task. Follow the detail.</span>
              <code>event.id = 0x8f2a</code>
            </div>
          </div>
          <div className="marketing-token-tile-copy">
            <span>TYPOGRAPHY</span>
            <h3>A clear reading order.</h3>
            <p>
              Distinct headings, quiet labels, and precise identifiers help dense views breathe.
            </p>
          </div>
        </article>

        <article className="marketing-token-tile marketing-token-space-tile">
          <div className="marketing-token-space-art" aria-hidden="true">
            <div className="marketing-token-space-ruler">
              {[4, 8, 12, 16, 24, 32].map((value) => (
                <span key={value}>
                  <i style={{ height: value * 2 }} />
                  <small>{value}</small>
                </span>
              ))}
            </div>
            <div className="marketing-token-space-specimen">
              <div>
                <i />
                <i />
                <i />
              </div>
              <span>12</span>
              <div>
                <i />
                <i />
              </div>
            </div>
            <code>
              --space-3 <ArrowRight size={13} /> 12px
            </code>
          </div>
          <div className="marketing-token-tile-copy">
            <span>SPACING</span>
            <h3>Rhythm at every density.</h3>
            <p>A repeatable scale connects compact controls, card padding, and page layout.</p>
          </div>
        </article>

        <article className="marketing-token-tile marketing-token-role-tile">
          <div className="marketing-token-role-art" aria-hidden="true">
            <div className="marketing-token-role-orbit">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="marketing-token-role-stack">
              <div>
                <span className="marketing-token-role-function">Action</span>
                <code>
                  Review <ArrowRight size={13} />
                </code>
              </div>
              <div>
                <span className="marketing-token-role-success">Success</span>
                <code>
                  <Check size={13} /> Resolved
                </code>
              </div>
              <div>
                <span className="marketing-token-role-warning">Warning</span>
                <code>Review required</code>
              </div>
            </div>
          </div>
          <div className="marketing-token-tile-copy">
            <span>SEMANTIC INTENT</span>
            <h3>Meaning stays consistent.</h3>
            <p>Shared roles carry the same meaning through buttons, badges, and feedback.</p>
          </div>
        </article>

        <div className="marketing-token-preview" data-theme={dark ? 'dark' : 'light'}>
          <div className="marketing-token-preview-heading">
            <span className="marketing-token-live-label">
              <i aria-hidden="true" /> LIVE TOKEN LAB
            </span>
            <h3>
              A small change.
              <br />A shared result.
            </h3>
            <p>Try the actual tokens on real Aegis components.</p>
          </div>
          <div className="marketing-token-controls">
            <div className="marketing-token-theme" role="group" aria-label="Token preview theme">
              <button type="button" aria-pressed={!dark} onClick={() => setDark(false)}>
                <Sun size={14} aria-hidden="true" /> Light
              </button>
              <button type="button" aria-pressed={dark} onClick={() => setDark(true)}>
                <Moon size={14} aria-hidden="true" /> Dark
              </button>
            </div>
            <label className="marketing-token-spacing-control">
              Card spacing
              <select
                aria-label="Card spacing"
                value={spacing}
                onChange={(event) =>
                  setSpacing(event.target.value === 'roomy' ? 'roomy' : 'default')
                }
              >
                <option value="default">Default · 12px</option>
                <option value="roomy">Roomy · 20px</option>
              </select>
            </label>
          </div>
          <div
            className={`marketing-token-live-surface ${dark ? 'dark' : 'aegis-theme-light'}`}
            style={
              {
                colorScheme: dark ? 'dark' : 'light',
                '--layout-card-padding': `var(${spacingToken})`,
              } as CSSProperties
            }
          >
            <div
              className="marketing-token-role-swatches"
              role="group"
              aria-label="Live semantic token colors"
            >
              <span>
                <i className="marketing-token-swatch-surface" aria-hidden="true" /> Surface
              </span>
              <span>
                <i className="marketing-token-swatch-text" aria-hidden="true" /> Text
              </span>
              <span>
                <i className="marketing-token-swatch-action" aria-hidden="true" /> Action
              </span>
            </div>
            <div className="marketing-token-components">
              <Card elevation="flat" className="marketing-token-signal">
                <CardHeader>
                  <div className="marketing-token-signal-meta">
                    <span>Sample task</span>
                    <SeverityBadge severity="high" />
                  </div>
                  <CardTitle>Deployment requires review</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="marketing-token-signal-description">
                    A configuration change is waiting for review before the next release.
                  </p>
                  <div className="marketing-token-signal-actions">
                    <StatusBadge status={reviewed ? 'in-review' : 'new'} />
                    <Button
                      size="sm"
                      intent="function"
                      emphasis="secondary"
                      leadingIcon={reviewed ? <Check size={14} /> : undefined}
                      onClick={() => setReviewed((value) => !value)}
                    >
                      {reviewed ? 'Undo review' : 'Mark reviewed'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <div className="marketing-token-context">
                <Card elevation="flat">
                  <CardContent>
                    <span>
                      <Server size={14} aria-hidden="true" /> Project
                    </span>
                    <strong>PRJ-1042</strong>
                    <small>Project identifier</small>
                  </CardContent>
                </Card>
                <Card elevation="flat">
                  <CardContent>
                    <span>
                      <Layers size={14} aria-hidden="true" /> References
                    </span>
                    <strong>24 updates</strong>
                    <small>Sample activity</small>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
          <div className="marketing-token-trace" aria-label="Card padding token dependency">
            <code>{spacingToken}</code>
            <ArrowRight size={13} aria-hidden="true" />
            <code>Card padding</code>
            <strong>
              {spacing === 'roomy' ? '20' : '12'}
              <small>px</small>
            </strong>
          </div>
          <p className="marketing-token-preview-note" aria-live="polite" role="status">
            {dark ? 'Dark' : 'Light'} preview · {spacing === 'roomy' ? 'Roomy' : 'Default'} spacing
            · {reviewed ? 'Sample reviewed' : 'Awaiting review'}
          </p>
        </div>
      </div>
      <div className="marketing-token-architecture">
        <ol aria-label="Aegis token layers">
          <li>
            <span>01 / PRIMITIVE</span>
            <div>
              <code>--space-3</code>
              <small>12px</small>
            </div>
            <ArrowRight size={17} aria-hidden="true" />
          </li>
          <li>
            <span>02 / SEMANTIC ROLE</span>
            <code>--layout-card-padding</code>
            <ArrowRight size={17} aria-hidden="true" />
          </li>
          <li>
            <span>03 / COMPONENT</span>
            <div>
              <code>CardContent</code>
              <small>padding</small>
            </div>
          </li>
        </ol>
        <p>
          Reusable values feed named roles, which components consume. Central color roles prevent
          one-off shades from drifting between screens and coordinate light and dark values across
          the same components.
        </p>
      </div>
    </section>
  );
}
