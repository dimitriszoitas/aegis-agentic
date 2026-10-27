import { componentToken, useComponentTokenNumbers } from '@/lib/component-design-tokens';
import { useId, useMemo, useState, type ComponentProps, type CSSProperties } from 'react';
import { Button } from '@/components/button';
import { SearchInput } from '@/components/search-input';
import { Select } from '@/components/select';
import { Check } from '@/components/icon';
import { cn } from '@/lib/utils';
import manifest from './manifest.json';
import './aws-logo.css';

export type AwsLogoName = keyof typeof manifest.logos;
export type AwsLogoKind = 'service' | 'category' | 'resource' | 'group';
export interface AwsLogoDefinition {
  id: AwsLogoName;
  name: string;
  kind: AwsLogoKind;
  category: string;
  file: string;
  darkFile?: string;
  sourcePath: string;
  sourceSize: number;
}
const assetUrls = import.meta.glob<string>('./assets/*.svg', {
  query: '?url&no-inline',
  import: 'default',
  eager: true,
});
export const awsLogoRelease = manifest.release;
export const awsLogoCounts = manifest.counts;
export const awsLogos: readonly AwsLogoDefinition[] = Object.entries(manifest.logos).map(
  ([id, logo]) => ({ ...logo, id: id as AwsLogoName, kind: logo.kind as AwsLogoKind }),
);
const logoById = new Map(awsLogos.map((logo) => [logo.id, logo]));
export function getAwsLogoUrl(name: AwsLogoName, theme: 'light' | 'dark' = 'light'): string {
  const logo = logoById.get(name);
  return logo
    ? assetUrls[`./assets/${theme === 'dark' && logo.darkFile ? logo.darkFile : logo.file}`]
    : '';
}
export interface AwsLogoProps extends Omit<ComponentProps<'span'>, 'children'> {
  name: AwsLogoName;
  size?: 24 | 32 | 40 | 48 | 64 | 80;
  /** Omit duplicate alt text when a visible label already names this service. */
  decorative?: boolean;
  label?: string;
}
/** Original AWS artwork in a square, rounded frame. Official light/dark variants follow the theme. */
export function AwsLogo({
  name,
  size,
  decorative = false,
  label,
  className,
  style,
  ...props
}: AwsLogoProps) {
  const tokens = useComponentTokenNumbers(['brand-catalog-logo-size']);
  const logoSize = size ?? tokens['brand-catalog-logo-size'];
  const logo = logoById.get(name);
  if (!logo) return null;
  const alt = decorative ? '' : (label ?? logo.name);
  return (
    <span
      {...props}
      className={cn('aegis-aws-logo', className)}
      style={{ '--aws-logo-size': `${logoSize}px`, ...style } as CSSProperties}
    >
      <img
        src={getAwsLogoUrl(name)}
        alt={alt}
        width={logoSize}
        height={logoSize}
        loading="lazy"
        decoding="async"
        className={logo.darkFile ? 'aegis-aws-logo-light' : undefined}
      />
      {logo.darkFile && (
        <img
          src={getAwsLogoUrl(name, 'dark')}
          alt={alt}
          width={logoSize}
          height={logoSize}
          loading="lazy"
          decoding="async"
          className="aegis-aws-logo-dark"
        />
      )}
    </span>
  );
}
export interface AwsLogoCatalogProps extends ComponentProps<'section'> {
  initialQuery?: string;
  initialKind?: AwsLogoKind | 'all';
  pageSize?: number;
}
const kinds = [
  { value: 'all', label: 'All symbols' },
  { value: 'service', label: 'Services' },
  { value: 'category', label: 'Categories' },
  { value: 'resource', label: 'Resources' },
  { value: 'group', label: 'Architecture groups' },
];
const categories = [...new Set(awsLogos.map((logo) => logo.category))].sort();
export function AwsLogoCatalog({
  initialQuery = '',
  initialKind = 'all',
  pageSize = 60,
  className,
  ...props
}: AwsLogoCatalogProps) {
  const headingId = useId();
  const [query, setQuery] = useState(initialQuery);
  const [kind, setKind] = useState<string>(initialKind);
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<AwsLogoName>('service-amazon-ec2');
  const [copyState, setCopyState] = useState('');
  const matches = useMemo(() => {
    const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return awsLogos.filter(
      (logo) =>
        (kind === 'all' || logo.kind === kind) &&
        (category === 'all' || logo.category === category) &&
        words.every((word) =>
          `${logo.name} ${logo.id} ${logo.category}`.toLowerCase().includes(word),
        ),
    );
  }, [query, kind, category]);
  const count = Math.max(12, Math.min(120, Number.isFinite(pageSize) ? Math.floor(pageSize) : 60));
  const pages = Math.max(1, Math.ceil(matches.length / count));
  const currentPage = Math.min(page, pages - 1);
  const visible = matches.slice(currentPage * count, (currentPage + 1) * count);
  const current = logoById.get(selected)!;
  async function copyName() {
    try {
      await navigator.clipboard.writeText(current.id);
      setCopyState(`Copied ${current.name} logo name.`);
    } catch {
      setCopyState('Copy is unavailable. Select the logo name below to copy it.');
    }
  }
  return (
    <section {...props} className={cn('aegis-aws-catalog', className)} aria-labelledby={headingId}>
      <header className="aegis-aws-catalog-heading">
        <h2 id={headingId}>AWS logos</h2>
        <p>
          {manifest.uniqueSymbols} symbols · {awsLogoCounts.service} service marks ·{' '}
          {awsLogoCounts.category} categories · {awsLogoCounts.resource} resources ·{' '}
          {awsLogoCounts.group} architecture groups
        </p>
        <p>
          Official AWS architecture artwork, July 2026 release. Original colors and SVG paths are
          preserved; duplicate size variants are omitted.
        </p>
      </header>
      <div className="aegis-aws-catalog-toolbar">
        <SearchInput
          aria-label="Search AWS logos"
          placeholder="Search services, resources, or categories…"
          value={query}
          onValueChange={(value) => {
            setQuery(value);
            setPage(0);
          }}
        />
        <Select
          aria-label="Symbol type"
          value={kind}
          options={kinds}
          onValueChange={(value) => {
            setKind(value);
            setPage(0);
          }}
        />
        <Select
          aria-label="AWS category"
          value={category}
          options={[
            { value: 'all', label: 'All categories' },
            ...categories.map((label) => ({ value: label, label })),
          ]}
          onValueChange={(value) => {
            setCategory(value);
            setPage(0);
          }}
        />
      </div>
      <div className="aegis-aws-catalog-selection">
        <AwsLogo
          name={current.id}
          style={{ '--aws-logo-size': componentToken('brand-preview-logo-size') } as CSSProperties}
          decorative
        />
        <div className="aegis-aws-catalog-selected-copy">
          <strong>{current.name}</strong>
          <span>
            {current.category} · {current.kind}
          </span>
          <code>{current.id}</code>
        </div>
        <div className="aegis-aws-catalog-actions">
          <Button size="sm" emphasis="secondary" onClick={copyName}>
            Copy name
          </Button>
          <a href={getAwsLogoUrl(current.id)} download={current.file}>
            Download SVG
          </a>
        </div>
        <span className="sr-only" role="status">
          {copyState}
        </span>
      </div>
      <p className="aegis-aws-catalog-count" role="status">
        {matches.length} {matches.length === 1 ? 'logo' : 'logos'} found
      </p>
      {visible.length ? (
        <ul className="aegis-aws-catalog-grid" aria-label="AWS logo results">
          {visible.map((logo) => (
            <li key={logo.id}>
              <button
                type="button"
                aria-label={`Select ${logo.name}, ${logo.category} ${logo.kind} logo`}
                aria-pressed={selected === logo.id}
                onClick={() => {
                  setSelected(logo.id);
                  setCopyState('');
                }}
              >
                {selected === logo.id && (
                  <Check
                    className="aegis-aws-catalog-check"
                    size={componentToken('icon-md')}
                    aria-hidden="true"
                  />
                )}
                <AwsLogo
                  name={logo.id}
                  style={
                    {
                      '--aws-logo-size': componentToken('brand-catalog-logo-size'),
                    } as CSSProperties
                  }
                  decorative
                />
                <strong>{logo.name}</strong>
                <span>{logo.category}</span>
                <small>{logo.kind}</small>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="aegis-aws-catalog-empty">
          <h3>No AWS logos match</h3>
          <p>Try a service name, such as Lambda, or reset the filters.</p>
          <Button
            emphasis="secondary"
            onClick={() => {
              setQuery('');
              setKind('all');
              setCategory('all');
              setPage(0);
            }}
          >
            Reset filters
          </Button>
        </div>
      )}
      <nav className="aegis-aws-catalog-pagination" aria-label="AWS logo pages">
        <span>
          Page {currentPage + 1} of {pages}
        </span>
        <Button
          size="sm"
          emphasis="secondary"
          disabled={currentPage === 0}
          onClick={() => setPage(currentPage - 1)}
        >
          Previous page
        </Button>
        <Button
          size="sm"
          emphasis="secondary"
          disabled={currentPage + 1 >= pages}
          onClick={() => setPage(currentPage + 1)}
        >
          Next page
        </Button>
      </nav>
      <footer className="aegis-aws-catalog-attribution">
        Artwork © Amazon Web Services.{' '}
        <a href={manifest.source} target="_blank" rel="noreferrer">
          Official AWS architecture icons and usage guidance
        </a>
        . AWS marks identify the corresponding services; inclusion does not imply endorsement.
      </footer>
    </section>
  );
}
