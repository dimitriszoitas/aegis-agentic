import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ChevronDown, FileCode, Layers, Rows3, Shield, X } from '@/components/icon';
import './marketing-site.css';

export const marketingLinks = {
  components: '?view=components',
  console: '?view=console',
  docs: 'https://dimitriszoitas.github.io/aegis-ui/',
  repository: 'https://github.com/dimitriszoitas/aegis-ui',
};

export function MarketingHeader({ active = 'home' }: { active?: 'home' | 'components' }) {
  const [open, setOpen] = useState(false);
  const [explore, setExplore] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const exploreToggle = useRef<HTMLButtonElement>(null);
  const navigation = useRef<HTMLElement>(null);
  const exploreRoot = useRef<HTMLDivElement>(null);
  const tokenLink = active === 'home' ? '#foundations' : '?view=home#foundations';
  const close = () => {
    setOpen(false);
    setExplore(false);
  };
  useEffect(() => {
    if (open) exploreToggle.current?.focus();
  }, [open]);
  useEffect(() => {
    if (!open && !explore) return;
    function escape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (explore) {
        setExplore(false);
        exploreToggle.current?.focus();
      } else {
        setOpen(false);
        toggle.current?.focus();
      }
    }
    function outside(event: PointerEvent) {
      const target = event.target as Node;
      if (!exploreRoot.current?.contains(target)) setExplore(false);
      if (!navigation.current?.contains(target) && !toggle.current?.contains(target))
        setOpen(false);
    }
    window.addEventListener('keydown', escape);
    document.addEventListener('pointerdown', outside);
    return () => {
      window.removeEventListener('keydown', escape);
      document.removeEventListener('pointerdown', outside);
    };
  }, [open, explore]);
  return (
    <>
      <a className="marketing-skip" href="#main">
        Skip to content
      </a>
      <header className="marketing-header">
        <div className="marketing-container marketing-nav">
          <a className="marketing-brand" href="?view=home" aria-label="Aegis home">
            <span className="marketing-brand-mark">
              <Shield size={21} strokeWidth={1.8} />
            </span>
            Aegis
          </a>
          <nav
            ref={navigation}
            id="marketing-navigation"
            className="marketing-nav-links"
            data-open={open}
            aria-label="Main navigation"
          >
            <div
              className="marketing-explore"
              ref={exploreRoot}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) setExplore(false);
              }}
            >
              <button
                ref={exploreToggle}
                className="marketing-explore-trigger"
                aria-expanded={explore}
                aria-controls="marketing-explore-panel"
                onClick={() => setExplore(!explore)}
              >
                Explore <ChevronDown size={15} />
              </button>
              <div
                id="marketing-explore-panel"
                className="marketing-explore-panel"
                hidden={!explore}
              >
                <a href={marketingLinks.components} onClick={close}>
                  <Layers size={21} />
                  <span>
                    <strong>Component library</strong>
                    <small>Components for applications and dashboards.</small>
                  </span>
                  <ArrowUpRight size={15} />
                </a>
                <a href={tokenLink} onClick={close}>
                  <FileCode size={21} />
                  <span>
                    <strong>Foundations & tokens</strong>
                    <small>The decisions that connect the system.</small>
                  </span>
                  <ArrowUpRight size={15} />
                </a>
                <a href={marketingLinks.console} onClick={close}>
                  <Shield size={21} />
                  <span>
                    <strong>Business application</strong>
                    <small>Projects, customers, invoices, and Aegis AI in one workspace.</small>
                  </span>
                  <ArrowUpRight size={15} />
                </a>
              </div>
            </div>
            <a
              href={marketingLinks.components}
              aria-current={active === 'components' ? 'page' : undefined}
              onClick={close}
            >
              Components
            </a>
            <a href={tokenLink} onClick={close}>
              Tokens
            </a>
            <a href={active === 'home' ? '#faq-title' : '?view=home#faq-title'} onClick={close}>
              FAQs
            </a>
          </nav>
          <div className="marketing-nav-actions">
            <a className="marketing-nav-docs" href={marketingLinks.docs}>
              Documentation <ArrowUpRight size={14} />
            </a>
            <a className="marketing-nav-cta" href={marketingLinks.repository}>
              Get Aegis <ArrowUpRight size={14} />
            </a>
          </div>
          <button
            ref={toggle}
            className="marketing-menu-toggle"
            aria-label={open ? 'Close navigation' : 'Open navigation'}
            aria-expanded={open}
            aria-controls="marketing-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={21} /> : <Rows3 size={21} />}
          </button>
        </div>
      </header>
    </>
  );
}

export function MarketingFooter() {
  return (
    <footer className="marketing-footer">
      <div className="marketing-container">
        <div className="marketing-footer-top">
          <div className="marketing-footer-brand">
            <a className="marketing-brand" href="?view=home" aria-label="Aegis home">
              <span className="marketing-brand-mark">
                <Shield size={21} />
              </span>
              Aegis
            </a>
            <p>
              A React design system for applications, dashboards, and developer tools. Clear
              hierarchy and components that work together.
            </p>
          </div>
          <nav aria-label="Footer navigation">
            <div>
              <span>Explore</span>
              <a href={marketingLinks.components}>Components</a>
              <a href="?view=home#foundations">Foundations</a>
              <a href={marketingLinks.console}>Business application</a>
            </div>
            <div>
              <span>Build</span>
              <a href={marketingLinks.docs}>
                Documentation <ArrowUpRight size={13} />
              </a>
              <a href={marketingLinks.repository}>
                GitHub <ArrowUpRight size={13} />
              </a>
              <a href={`${marketingLinks.repository}/blob/main/LICENSE`}>
                MIT license <ArrowUpRight size={13} />
              </a>
            </div>
          </nav>
        </div>
        <div className="marketing-footer-bottom">
          <span>© {new Date().getFullYear()} Aegis</span>
          <span>Made for engineers. Designed for clarity.</span>
          <a href="#top">Back to top ↑</a>
        </div>
      </div>
    </footer>
  );
}
