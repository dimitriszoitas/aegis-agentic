import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Button } from '@/components/button';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  Layers,
  Moon,
  RotateCcw,
  Search,
  Sun,
  X,
} from '@/components/icon';
import { SideSheet } from '@/components/side-sheet';
import { Tabs } from '@/components/tabs';
import { applyTheme, type Theme } from '@/lib/theme';
import { layoutThemeOptions, useLayoutTheme, type LayoutTheme } from '@/lib/layout-theme';
import {
  componentCatalogue,
  catalogueCategories,
  catalogueCategoryIds,
  type ComponentCatalogueEntry,
} from './component-catalogue';
import { MarketingFooter, MarketingHeader } from './marketing-chrome';
import './components-page.css';

const ComponentPreview = lazy(() =>
  import('./catalogue-previews').then((module) => ({ default: module.ComponentPreview })),
);

class PreviewBoundary extends Component<
  { children: ReactNode; name: string },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="catalogue-preview-message">
        <Layers size={22} />
        <p>The {this.props.name} preview could not load.</p>
        <span>Its usage and component guidance are still available below.</span>
      </div>
    ) : (
      this.props.children
    );
  }
}

function PreviewLoading({ name }: { name: string }) {
  return (
    <div className="catalogue-card-loading" role="status">
      <span className="catalogue-loading-shape" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span>Loading {name} preview</span>
    </div>
  );
}

function LivePreview({
  entry,
  expanded = false,
  reset = 0,
}: {
  entry: ComponentCatalogueEntry;
  expanded?: boolean;
  reset?: number;
}) {
  return (
    <PreviewBoundary key={`${entry.id}-${reset}`} name={entry.name}>
      <Suspense fallback={<PreviewLoading name={entry.name} />}>
        <ComponentPreview id={entry.id} expanded={expanded} />
      </Suspense>
    </PreviewBoundary>
  );
}

function PreviewCard({
  entry,
  onOpen,
}: {
  entry: ComponentCatalogueEntry;
  onOpen: (entry: ComponentCatalogueEntry, opener: HTMLButtonElement) => void;
}) {
  const card = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!card.current) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((item) => item.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(card.current);
    return () => observer.disconnect();
  }, []);
  return (
    <article
      className="catalogue-card"
      data-category={catalogueCategoryIds[entry.category]}
      id={`catalogue-card-${entry.id}`}
      ref={card}
    >
      <div
        className="catalogue-card-preview"
        role="group"
        aria-label={`${entry.name} interactive preview`}
      >
        {visible ? (
          <LivePreview entry={entry} />
        ) : (
          <div className="catalogue-preview-dormant" aria-hidden="true">
            <Layers size={24} />
            <span>{entry.name}</span>
          </div>
        )}
      </div>
      <div className="catalogue-card-copy">
        <span className="catalogue-card-category">{entry.category}</span>
        <h2>{entry.name}</h2>
        <p>{entry.description}</p>
        <button
          type="button"
          className="catalogue-explore"
          aria-label={`Explore ${entry.name}`}
          onClick={(event) => onOpen(entry, event.currentTarget)}
        >
          Explore component <ArrowUpRight size={16} />
        </button>
      </div>
    </article>
  );
}

function PreviewTheme({
  theme,
  onChange,
  label = 'Preview color theme',
}: {
  theme: Theme;
  onChange: (theme: Theme) => void;
  label?: string;
}) {
  return (
    <div className="catalogue-theme-control" role="group" aria-label={label}>
      <button type="button" aria-pressed={theme === 'light'} onClick={() => onChange('light')}>
        <Sun size={15} />
        Light
      </button>
      <button type="button" aria-pressed={theme === 'dark'} onClick={() => onChange('dark')}>
        <Moon size={15} />
        Dark
      </button>
    </div>
  );
}

function PreviewApproach({
  value,
  onChange,
  label = 'Preview UI approach',
}: {
  value: LayoutTheme;
  onChange: (value: LayoutTheme) => void;
  label?: string;
}) {
  return (
    <label className="catalogue-approach-control">
      <span>UI approach</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value as LayoutTheme)}
      >
        {layoutThemeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ComponentDetails({
  entry,
  theme,
  onThemeChange,
  approach,
  onApproachChange,
}: {
  entry: ComponentCatalogueEntry;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  approach: LayoutTheme;
  onApproachChange: (value: LayoutTheme) => void;
}) {
  const [reset, setReset] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const code = useRef<HTMLPreElement>(null);
  async function copyExample() {
    try {
      await navigator.clipboard.writeText(entry.code);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopied(false);
      setCopyError(true);
      code.current?.focus();
      if (code.current) {
        const range = document.createRange();
        range.selectNodeContents(code.current);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  }
  return (
    <>
      <div className="catalogue-detail-toolbar">
        <div>
          <span>Interactive preview</span>
          <PreviewTheme theme={theme} onChange={onThemeChange} label="Detail preview color theme" />
          <PreviewApproach
            value={approach}
            onChange={onApproachChange}
            label="Detail preview UI approach"
          />
        </div>
        <Button
          size="sm"
          emphasis="ghost"
          leadingIcon={<RotateCcw size={14} />}
          onClick={() => setReset((current) => current + 1)}
        >
          Reset preview
        </Button>
      </div>
      <div
        className="catalogue-detail-preview"
        role="group"
        aria-label={`${entry.name} expanded preview`}
      >
        <LivePreview entry={entry} expanded reset={reset} />
      </div>
      <Tabs
        key={entry.id}
        defaultValue="usage"
        label={`${entry.name} component details`}
        className="catalogue-detail-tabs"
        items={[
          {
            value: 'usage',
            label: 'Usage',
            content: (
              <div className="catalogue-usage">
                <p>{entry.usage}</p>
                <div className="catalogue-code-block">
                  <div className="catalogue-code-bar">
                    <span>React + TypeScript</span>
                    <Button
                      size="sm"
                      emphasis="ghost"
                      aria-label={`Copy ${entry.name} example`}
                      leadingIcon={copied ? <Check size={14} /> : <Copy size={14} />}
                      onClick={() => void copyExample()}
                    >
                      {copied ? 'Copied' : 'Copy code'}
                    </Button>
                  </div>
                  <pre ref={code} tabIndex={0} aria-label={`${entry.name} package example`}>
                    <code>{entry.code}</code>
                  </pre>
                </div>
                <p className="catalogue-copy-status" role="status">
                  {copyError
                    ? 'Clipboard unavailable. The example is selected so you can copy it manually.'
                    : copied
                      ? 'Component example copied.'
                      : 'Examples use the Aegis React package and its compiled styles.'}
                </p>
              </div>
            ),
          },
          {
            value: 'anatomy',
            label: 'Anatomy & variants',
            content: (
              <div className="catalogue-anatomy">
                <h3>Component anatomy</h3>
                <ul className="catalogue-parts">
                  {(entry.anatomy.length ? entry.anatomy : [entry.name]).map((part) => (
                    <li key={part}>
                      <code>{part}</code>
                    </li>
                  ))}
                </ul>
                <h3>Supported variants</h3>
                {entry.variants.length ? (
                  <dl className="catalogue-variants">
                    {entry.variants.map((variant) => (
                      <div key={variant.name}>
                        <dt>{variant.name}</dt>
                        <dd>
                          <div>
                            {variant.values.map((value) => (
                              <code key={value}>{value}</code>
                            ))}
                          </div>
                          {variant.default !== undefined && (
                            <span>
                              Default: <code>{variant.default}</code>
                            </span>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p>
                    This component is composed through its props and children. See the usage example
                    for its supported structure.
                  </p>
                )}
              </div>
            ),
          },
        ]}
      />
      <div className="catalogue-detail-reference">
        <span>
          <code>{entry.importPath}</code>
        </span>
        <a href={entry.docsUrl} target="_blank" rel="noreferrer">
          Full component reference <ArrowUpRight size={15} />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
    </>
  );
}

/** Searchable on-site catalogue of real Aegis components and their public package APIs. */
export function ComponentsPage() {
  const [query, setQuery] = useState(() =>
    typeof window === 'undefined'
      ? ''
      : (new URLSearchParams(window.location.search).get('q') ?? ''),
  );
  const [category, setCategory] = useState(() => {
    if (typeof window === 'undefined') return 'All';
    const value = new URLSearchParams(window.location.search).get('category');
    return (
      catalogueCategories.find((item) => item === value || catalogueCategoryIds[item] === value) ??
      'All'
    );
  });
  const [theme, setTheme] = useState<Theme>('dark');
  const { layoutTheme, setLayoutTheme } = useLayoutTheme();
  const [selected, setSelected] = useState<ComponentCatalogueEntry | null>(() => {
    if (typeof window === 'undefined') return null;
    const id = new URLSearchParams(window.location.search).get('component');
    return componentCatalogue.find((entry) => entry.id === id) ?? null;
  });
  const opener = useRef<HTMLButtonElement | null>(null);
  const search = useRef<HTMLInputElement>(null);
  const previousTheme = useRef<Theme | null>(null);
  useEffect(() => {
    previousTheme.current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    const title = document.title;
    document.title = 'Components — Aegis Design System';
    return () => {
      applyTheme(previousTheme.current ?? 'light', { persist: false });
      document.title = title;
    };
  }, []);
  useEffect(() => {
    applyTheme(theme, { persist: false });
  }, [theme]);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (category === 'All') url.searchParams.delete('category');
    else url.searchParams.set('category', catalogueCategoryIds[category]);
    if (query.trim()) url.searchParams.set('q', query);
    else url.searchParams.delete('q');
    if (selected) url.searchParams.set('component', selected.id);
    else url.searchParams.delete('component');
    window.history.replaceState(window.history.state, '', url);
  }, [category, query, selected]);
  const categories = useMemo(
    () => ['All', ...catalogueCategories.filter((item) => item !== 'All')],
    [],
  );
  const counts = useMemo(
    () =>
      componentCatalogue.reduce<Record<string, number>>(
        (result, entry) => {
          result[entry.category] = (result[entry.category] ?? 0) + 1;
          return result;
        },
        { All: componentCatalogue.length },
      ),
    [],
  );
  const filtered = useMemo(() => {
    const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return componentCatalogue.filter(
      (entry) =>
        (category === 'All' || entry.category === category) &&
        terms.every((term) =>
          `${entry.name} ${entry.description} ${entry.category} ${entry.keywords.join(' ')}`
            .toLocaleLowerCase()
            .includes(term),
        ),
    );
  }, [query, category]);
  function open(entry: ComponentCatalogueEntry, button: HTMLButtonElement) {
    opener.current = button;
    button.focus({ preventScroll: true });
    setSelected(entry);
  }
  function closeDetails() {
    const target =
      opener.current ??
      document
        .getElementById(`catalogue-card-${selected?.id}`)
        ?.querySelector<HTMLButtonElement>('.catalogue-explore') ??
      search.current;
    setSelected(null);
    if (!opener.current) requestAnimationFrame(() => target?.focus({ preventScroll: true }));
  }
  function resetFilters() {
    setQuery('');
    setCategory('All');
    search.current?.focus();
  }
  return (
    <div className="aegis-marketing marketing-catalogue-page" id="top" data-preview-theme={theme}>
      <MarketingHeader active="components" />
      <main className="catalogue-main marketing-container" id="main">
        <header className="catalogue-hero">
          <div>
            <p className="catalogue-kicker">AEGIS / COMPONENTS</p>
            <h1>The component library.</h1>
            <p>
              Explore {componentCatalogue.length} components for applications, dashboards, and
              developer tools. Try the interactions, compare UI approaches and color themes, and
              find the right building blocks for your product.
            </p>
          </div>
          <div className="catalogue-hero-note">
            <Layers size={20} />
            <span>
              Real components.
              <br />
              Ready to inspect.
            </span>
          </div>
        </header>
        <div className="catalogue-browser">
          <div className="catalogue-tools">
            <div className="catalogue-search">
              <Search size={18} aria-hidden="true" />
              <input
                ref={search}
                type="search"
                aria-label="Find a component"
                placeholder="Find a component…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear component search"
                  onClick={() => {
                    setQuery('');
                    search.current?.focus();
                  }}
                >
                  <X size={15} />
                </button>
              )}
            </div>
            <div className="catalogue-preview-settings">
              <PreviewApproach value={layoutTheme} onChange={setLayoutTheme} />
              <div className="catalogue-theme-bar">
                <span>Color</span>
                <PreviewTheme theme={theme} onChange={setTheme} />
              </div>
            </div>
          </div>
          <div className="catalogue-category-row">
            <div className="catalogue-categories" role="group" aria-label="Component category">
              {categories.map((item) => (
                <button
                  type="button"
                  key={item}
                  aria-pressed={category === item}
                  onClick={() => setCategory(item)}
                >
                  {item}
                  <span>{counts[item] ?? 0}</span>
                </button>
              ))}
            </div>
            <label className="catalogue-category-select">
              Category
              <select
                aria-label="Component category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item} ({counts[item] ?? 0})
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="catalogue-results-bar">
            <p role="status" aria-live="polite">
              <strong>{filtered.length}</strong> of {componentCatalogue.length} components
              {category !== 'All' && <span> · {category}</span>}
            </p>
            <span>Click a preview to try it. Open a card for usage.</span>
          </div>
          <div className="catalogue-grid">
            {filtered.map((entry) => (
              <PreviewCard key={entry.id} entry={entry} onOpen={open} />
            ))}
          </div>
          {!filtered.length && (
            <div className="catalogue-empty">
              <Search size={28} />
              <h2>No matching components</h2>
              <p>Try another name, or clear the filters to browse the full library.</p>
              <button type="button" onClick={resetFilters}>
                Show all components <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
        <div className="catalogue-end">
          <p>Shared tokens. Consistent behavior. Real React components.</p>
          <a href="?view=home#foundations">
            Explore the foundations <ArrowRight size={16} />
          </a>
        </div>
      </main>
      <MarketingFooter />
      <SideSheet
        open={selected !== null}
        onOpenChange={(next) => {
          if (!next) closeDetails();
        }}
        title={selected?.name ?? 'Component details'}
        description={selected?.description}
        closeLabel="Close component details"
        size="lg"
        className="marketing-catalogue-detail"
        headerActions={
          selected ? (
            <span className="catalogue-detail-category">{selected.category}</span>
          ) : undefined
        }
      >
        {selected && (
          <ComponentDetails
            key={selected.id}
            entry={selected}
            theme={theme}
            onThemeChange={setTheme}
            approach={layoutTheme}
            onApproachChange={setLayoutTheme}
          />
        )}
      </SideSheet>
    </div>
  );
}
