import { useId, useMemo, useRef, useState, type ComponentType, type SVGProps } from 'react';
import * as HugeIcons from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import * as UntitledIcons from '@untitledui/icons';
import { Button } from '@/components/button';
import { CopyButton } from '@/components/copy-button';
import { Pagination } from '@/components/pagination';
import { SearchInput } from '@/components/search-input';
import { Select } from '@/components/select';
import { Check } from '@/components/icon';
import './icon-gallery.css';

// Full namespaces belong only to this reference gallery, never the application bundle.
export type IconLibrary = 'hugeicons' | 'untitled';
type GalleryIcon = { name: string; searchName: string } & (
  | { library: 'hugeicons'; data: IconSvgElement }
  | { library: 'untitled'; Icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }> }
);
const iconLibraries: Record<IconLibrary, GalleryIcon[]> = {
  hugeicons: Object.entries(HugeIcons).map(([name, data]) => ({
    library: 'hugeicons',
    name,
    data,
    searchName: name.toLowerCase(),
  })),
  untitled: Object.entries(UntitledIcons).map(([name, Icon]) => ({
    library: 'untitled',
    name,
    Icon,
    searchName: name.toLowerCase(),
  })),
};
Object.values(iconLibraries).forEach((entries) =>
  entries.sort((a, b) => a.name.localeCompare(b.name, 'en')),
);
export const iconCounts = {
  hugeicons: iconLibraries.hugeicons.length,
  untitled: iconLibraries.untitled.length,
};
export const hasLocalUntitledIcons = import.meta.env.DEV && iconCounts.untitled > 0;
export const iconPageSize = 96;
const libraryNames = { hugeicons: 'Hugeicons', untitled: 'Untitled UI' };
function IconPreview({
  entry,
  ...props
}: { entry: GalleryIcon; size: number } & SVGProps<SVGSVGElement>) {
  if (entry.library === 'hugeicons')
    return <HugeiconsIcon icon={entry.data} {...props} strokeWidth={Number(props.strokeWidth)} />;
  const Icon = entry.Icon;
  return <Icon {...props} />;
}

export interface IconGalleryProps {
  /** Initial search for a focused reference example. */
  initialQuery?: string;
  initialLibrary?: IconLibrary;
}

export function IconGallery({ initialQuery = '', initialLibrary = 'hugeicons' }: IconGalleryProps) {
  const [library, setLibrary] = useState<IconLibrary>(
    initialLibrary === 'untitled' && !hasLocalUntitledIcons ? 'hugeicons' : initialLibrary,
  );
  const iconEntries = iconLibraries[library];
  const iconCount = iconEntries.length;
  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState('24');
  const [stroke, setStroke] = useState('2');
  const [selected, setSelected] = useState(iconEntries[0]);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const resultsId = useId();
  const selectedId = useId();
  const results = useMemo(() => {
    const words = query
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
    return iconEntries.filter(({ searchName }) => words.every((word) => searchName.includes(word)));
  }, [query, iconEntries]);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(results.length / iconPageSize)));
  const visible = results.slice((currentPage - 1) * iconPageSize, currentPage * iconPageSize);
  const importText =
    selected.library === 'hugeicons'
      ? `import { HugeiconsIcon } from '@hugeicons/react';\nimport { ${selected.name} } from '@hugeicons/core-free-icons';`
      : `import { ${selected.name} } from '@untitledui/icons';`;
  function changeLibrary(value: string) {
    const next: IconLibrary =
      value === 'untitled' && hasLocalUntitledIcons ? 'untitled' : 'hugeicons';
    setLibrary(next);
    setSelected(iconLibraries[next][0]);
    setPage(1);
    listRef.current?.scrollTo({ top: 0 });
  }

  function changeQuery(next: string) {
    setQuery(next);
    setPage(1);
    listRef.current?.scrollTo({ top: 0 });
  }
  function changePage(next: number) {
    setPage(next);
    listRef.current?.scrollTo({ top: 0 });
  }

  return (
    <section className="aegis-icon-gallery" aria-labelledby={headingId}>
      <header className="aegis-icon-gallery-heading">
        <p className="aegis-icon-gallery-eyebrow">Foundations · {libraryNames[library]}</p>
        <h1 id={headingId}>Icons</h1>
        <p>
          Browse all {iconCount.toLocaleString()} icon exports in the installed{' '}
          {libraryNames[library]} free pack. Select an icon to copy its name or React import.
        </p>
      </header>
      <div className="aegis-icon-gallery-controls">
        <SearchInput
          ref={searchRef}
          label="Search icons"
          placeholder="Search names, such as arrow down or shield…"
          value={query}
          onValueChange={changeQuery}
          clearLabel="Clear icon search"
          aria-controls={resultsId}
        />
        {hasLocalUntitledIcons && (
          <Select
            label="Icon library"
            value={library}
            onValueChange={changeLibrary}
            options={[
              { value: 'hugeicons', label: 'Hugeicons' },
              { value: 'untitled', label: 'Untitled UI' },
            ]}
          />
        )}
        <Select
          label="Preview size"
          value={size}
          onValueChange={setSize}
          options={['16', '20', '24', '32'].map((value) => ({ value, label: `${value} px` }))}
        />
        <Select
          label="Stroke width"
          value={stroke}
          onValueChange={setStroke}
          options={['1', '1.5', '2'].map((value) => ({ value, label: `${value} px` }))}
        />
      </div>
      <section className="aegis-icon-gallery-selection" aria-labelledby={selectedId}>
        <div className="aegis-icon-gallery-selected-preview">
          <IconPreview
            entry={selected}
            size={Number(size)}
            strokeWidth={Number(stroke)}
            role="img"
            aria-label={`${selected.name} icon preview`}
            aria-hidden={false}
            focusable="false"
          />
        </div>
        <div className="aegis-icon-gallery-selected-copy">
          <div className="aegis-icon-gallery-selected-name">
            <h2 id={selectedId}>{selected.name}</h2>
            <CopyButton text={selected.name} aria-label={`Copy ${selected.name} name`} size="sm" />
          </div>
          <div className="aegis-icon-gallery-import">
            <code>{importText}</code>
            <CopyButton text={importText} aria-label={`Copy ${selected.name} import`} size="sm" />
          </div>
        </div>
      </section>
      <div className="aegis-icon-gallery-results-heading">
        <p role="status">
          {results.length.toLocaleString()} {results.length === 1 ? 'icon export' : 'icon exports'}
          {query.trim() ? ` matching “${query.trim()}”` : ' available'}
          <span> · {iconCount.toLocaleString()} total</span>
        </p>
        <p>Names match the package exports, including compatibility names.</p>
      </div>
      <Pagination
        page={currentPage}
        pageSize={iconPageSize}
        total={results.length}
        onPageChange={changePage}
        noun="icons"
        aria-label="Icon pages"
      />
      {visible.length ? (
        <div
          id={resultsId}
          ref={listRef}
          className="aegis-icon-gallery-viewport"
          role="region"
          aria-label="Icon search results"
          tabIndex={0}
        >
          <ul className="aegis-icon-gallery-grid" aria-label="Available icons">
            {visible.map((entry) => (
              <li key={entry.name}>
                <button
                  type="button"
                  className="aegis-icon-gallery-tile"
                  aria-label={`${entry.name} icon`}
                  aria-pressed={selected.name === entry.name}
                  onClick={() => setSelected(entry)}
                >
                  {selected.name === entry.name && (
                    <Check className="aegis-icon-gallery-check" size={16} aria-hidden="true" />
                  )}
                  <IconPreview
                    entry={entry}
                    size={Number(size)}
                    strokeWidth={Number(stroke)}
                    aria-hidden="true"
                    focusable="false"
                  />
                  <span>{entry.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div id={resultsId} className="aegis-icon-gallery-empty">
          <h2>No icons match this search</h2>
          <p>Try a shorter name, such as “arrow”, “file”, or “shield”.</p>
          <Button
            emphasis="secondary"
            onClick={() => {
              changeQuery('');
              searchRef.current?.focus();
            }}
          >
            Clear search
          </Button>
        </div>
      )}
    </section>
  );
}
