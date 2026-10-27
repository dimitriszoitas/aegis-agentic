import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, Copy, Plus, Search, Layers } from '@/components/icon';
import { Button } from '@/components/button';
import { Kbd } from '@/components/kbd';
import { SeverityBadge } from '@/components/severity-badge';
import { StatusBadge } from '@/components/status-badge';
import { Sparkline } from '@/components/sparkline';
import { applyTheme } from '@/lib/theme';
import { ComponentShowcase } from './component-showcase';
import { ComponentCanvas } from './component-canvas';
import { HeroShowcase } from './hero-showcase';
import { TokenStory } from './token-story';
import { MarketingHeader, MarketingFooter, marketingLinks } from './marketing-chrome';
import './marketing-site.css';

const clone = 'git clone https://github.com/dimitriszoitas/aegis-ui.git';

function CollectionPreview() {
  return (
    <section
      id="collection"
      className="marketing-collection marketing-container"
      aria-labelledby="collection-title"
    >
      <div className="marketing-collection-heading">
        <div>
          <p className="marketing-section-label">Explore Aegis</p>
          <h2 id="collection-title">A considered starting point for your next product.</h2>
          <p className="marketing-heading-description">
            Build with the same visual language across controls, data, code, and the workflows that
            connect them.
          </p>
        </div>
        <a className="marketing-underlined-link" href={marketingLinks.components}>
          Browse all components <ArrowUpRight size={17} />
        </a>
      </div>
      <div className="marketing-specimens">
        <a className="marketing-specimen" data-tone="blue" href="?view=components&component=button">
          <div
            className="marketing-specimen-art marketing-specimen-controls"
            inert
            aria-hidden="true"
          >
            <div className="marketing-specimen-inner">
              <div className="marketing-specimen-field">
                <span>Project name</span>
                <div>
                  <Search size={15} />
                  Production dashboard<Kbd>⌘ K</Kbd>
                </div>
              </div>
              <div className="marketing-specimen-buttons">
                <Button size="md" leadingIcon={<Plus size={15} />}>
                  Create project
                </Button>
                <Button size="md" emphasis="tertiary">
                  Save draft
                </Button>
              </div>
              <div className="marketing-specimen-inline">
                <i />
                <span>Changes saved</span>
                <span>just now</span>
              </div>
            </div>
          </div>
          <div className="marketing-specimen-caption">
            <span>Actions & input</span>
            <ArrowUpRight size={18} />
            <p>Buttons, fields, selection, and command menus.</p>
          </div>
        </a>
        <a
          className="marketing-specimen"
          data-tone="coral"
          href="?view=components&component=severity-badge"
        >
          <div
            className="marketing-specimen-art marketing-specimen-signal"
            inert
            aria-hidden="true"
          >
            <div className="marketing-specimen-inner">
              <div className="marketing-specimen-metric">
                <span>Updates in the last hour</span>
                <div>
                  <strong>1,284</strong>
                  <Sparkline
                    data={[4, 6, 5, 8, 7, 12, 9, 18, 14, 17, 15, 23]}
                    width={140}
                    height={44}
                  />
                </div>
              </div>
              <div className="marketing-specimen-badges">
                <SeverityBadge severity="critical" />
                <SeverityBadge severity="high" />
                <SeverityBadge severity="medium" />
              </div>
              <div className="marketing-specimen-status">
                <StatusBadge status="new" />
                <StatusBadge status="in-progress" />
                <StatusBadge status="completed" />
              </div>
            </div>
          </div>
          <div className="marketing-specimen-caption">
            <span>Data & status</span>
            <ArrowUpRight size={18} />
            <p>Grids, metrics, charts, and semantic status.</p>
          </div>
        </a>
        <a
          className="marketing-specimen"
          data-tone="purple"
          href="?view=components&component=diff-view"
        >
          <div className="marketing-specimen-art marketing-specimen-code" aria-hidden="true">
            <div className="marketing-specimen-inner">
              <div className="marketing-specimen-code-tab">
                <span>workflow.yaml</span>
                <span>2 changes</span>
              </div>
              <div className="marketing-specimen-code-lines">
                <p>
                  <i>14</i>
                  <span>selection:</span>
                </p>
                <p>
                  <i>15</i>
                  <span> event.category: build</span>
                </p>
                <p className="marketing-line-remove">
                  <i>−</i>
                  <span> threshold: 50</span>
                </p>
                <p className="marketing-line-add">
                  <i>+</i>
                  <span> threshold: 25</span>
                </p>
                <p>
                  <i>18</i>
                  <span>condition: selection</span>
                </p>
              </div>
            </div>
          </div>
          <div className="marketing-specimen-caption">
            <span>Code & context</span>
            <ArrowUpRight size={18} />
            <p>Editors, diffs, structured data, and context.</p>
          </div>
        </a>
      </div>
      <div className="marketing-collection-tail">
        <p>Real React components. Light and dark. Ready to inspect.</p>
        <a href={marketingLinks.components}>
          Open the library <ArrowRight size={16} />
        </a>
      </div>
    </section>
  );
}

export function MarketingSite() {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  useEffect(() => {
    applyTheme('dark', { persist: false });
    document.title = 'Aegis — React components for applications';
  }, []);
  async function copySource() {
    try {
      await navigator.clipboard.writeText(clone);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopyError(true);
      setCopied(false);
    }
  }
  return (
    <div className="aegis-marketing marketing-home" id="top">
      <MarketingHeader active="home" />
      <main id="main">
        <HeroShowcase />
        <section
          className="marketing-overview marketing-container"
          aria-labelledby="overview-title"
        >
          <div className="marketing-overview-heading">
            <h2 id="overview-title">
              Designed for the tools
              <br />
              people depend on.
            </h2>
            <p>
              Applications. Dashboards. Developer tools. Give dense information a clear hierarchy,
              with the right detail at the right moment.
            </p>
          </div>
          <dl className="marketing-system-facts">
            <div>
              <dt>Component families</dt>
              <dd>85</dd>
              <dd className="marketing-fact-description">
                From everyday inputs to technical workflows.
              </dd>
            </div>
            <div>
              <dt>Component categories</dt>
              <dd>12</dd>
              <dd className="marketing-fact-description">
                A connected library, with room to make it yours.
              </dd>
            </div>
            <div>
              <dt>Color themes</dt>
              <dd>2</dd>
              <dd className="marketing-fact-description">
                Shared semantic roles for light and dark.
              </dd>
            </div>
            <div>
              <dt>Open-source license</dt>
              <dd>MIT</dd>
              <dd className="marketing-fact-description">
                Read the source. Adapt it to your product.
              </dd>
            </div>
          </dl>
        </section>
        <CollectionPreview />
        <section className="marketing-system-section" aria-labelledby="system-title">
          <div className="marketing-section-heading marketing-container">
            <span className="marketing-feature-icon" aria-hidden="true">
              <Layers size={28} />
            </span>
            <p className="marketing-section-label">The Aegis system</p>
            <h2 id="system-title">Components that fit together. By design.</h2>
            <p>
              One set of foundations, from the smallest control to an entire workspace. Explore how
              the pieces become a product.
            </p>
          </div>
          <ComponentCanvas />
          <div className="marketing-section-actions">
            <a
              className="marketing-link-button marketing-link-secondary"
              href={marketingLinks.docs}
            >
              Documentation <ArrowUpRight size={16} />
            </a>
            <a
              className="marketing-link-button marketing-link-primary"
              href={marketingLinks.components}
            >
              Explore the library <ArrowRight size={16} />
            </a>
          </div>
        </section>
        <section
          className="marketing-workflows marketing-container"
          aria-labelledby="workflows-title"
        >
          <div className="marketing-collection-heading">
            <div>
              <p className="marketing-section-label">Business application</p>
              <h2 id="workflows-title">From a task to a decision.</h2>
            </div>
            <p className="marketing-heading-description">
              Manage projects, customers, invoices, and your team. Explore how shared components
              connect everyday work with clear context and reviewable AI assistance.
            </p>
          </div>
          <ComponentShowcase />
        </section>
        <TokenStory />
        <section className="marketing-source" aria-labelledby="source-title">
          <div className="marketing-container marketing-source-grid">
            <div>
              <p className="marketing-section-label">Start building</p>
              <h2 id="source-title">
                Your product.
                <br />
                Your design system.
              </h2>
              <p>
                Typed components, shared CSS tokens, and working patterns. Start with the source,
                then connect your own data and workflows.
              </p>
              <a className="marketing-underlined-link" href={marketingLinks.repository}>
                Explore the repository <ArrowUpRight size={17} />
              </a>
            </div>
            <div className="marketing-source-panel">
              <div className="marketing-source-panel-heading">
                <span>Start with the source</span>
                <span>Terminal</span>
              </div>
              <pre>
                <code>
                  <span className="marketing-code-muted">$ </span>
                  {clone}
                  {'\n\n'}
                  <span className="marketing-code-muted">$ </span>cd aegis-ui{'\n'}
                  <span className="marketing-code-muted">$ </span>pnpm install{'\n'}
                  <span className="marketing-code-muted">$ </span>pnpm storybook
                </code>
              </pre>
              <div className="marketing-source-panel-footer">
                <span>MIT licensed source</span>
                <button
                  onClick={() => void copySource()}
                  aria-label={copied ? 'Clone command copied' : 'Copy clone command'}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}{' '}
                  {copied ? 'Copied' : 'Copy command'}
                </button>
              </div>
              <p role="status" className={copyError ? 'marketing-copy-error' : 'sr-only'}>
                {copyError
                  ? 'Select the command above to copy it manually.'
                  : copied
                    ? 'Clone command copied.'
                    : ''}
              </p>
            </div>
          </div>
        </section>
        <section className="marketing-faq marketing-container" aria-labelledby="faq-title">
          <h2 id="faq-title">Frequently asked questions</h2>
          <div>
            <details>
              <summary>What is included?</summary>
              <p>
                A library of React components, semantic tokens for light and dark themes, and
                working application patterns. The component catalogue shows the whole collection;
                Storybook documents individual states and APIs.
              </p>
            </details>
            <details>
              <summary>Can I use Aegis in my own product?</summary>
              <p>
                Yes. The Aegis source is MIT licensed. Third-party fonts, icons, and AWS marks keep
                their own licenses. The React package is available as a local archive; it has not
                yet been published to the npm registry.
              </p>
            </details>
            <details>
              <summary>Are these live services?</summary>
              <p>
                The examples use local sample data. AI responses and suggestions are illustrative;
                the demos do not contact a model or modify external services.
              </p>
            </details>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
