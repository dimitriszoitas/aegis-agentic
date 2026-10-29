import { useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { CountBadge } from '@/components/count-badge';
import { Funnel } from '@/components/icon';
import { SideSheet } from '@/components/side-sheet';
import { componentToken } from '@/lib/component-design-tokens';
import { AppliedFilterGroups } from '@/patterns/filter-bar';
import { FilterOptions } from '@/patterns/filter-panel';

export interface FormaFilterFacet {
  id: string;
  label: string;
  options: readonly { value: string; label: string }[];
  values: readonly string[];
  onValueChange: (values: string[]) => void;
}

/** Product-owned domain facets, composed from the shared filtering and overlay parts. */
export function FormaFilterToolbar({
  label,
  search,
  query,
  onClearQuery,
  facets,
  resultCount,
  noun,
  onClearAll,
}: {
  label: string;
  search: ReactNode;
  query: string;
  onClearQuery: () => void;
  facets: readonly FormaFilterFacet[];
  resultCount: number;
  noun: 'user' | 'product' | 'invoice';
  onClearAll: () => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const count =
    facets.reduce((total, facet) => total + facet.values.length, 0) + Number(!!query.trim());
  const result = `${resultCount} ${noun}${resultCount === 1 ? '' : 's'}`;
  const groups = [
    { id: 'query', label: 'Search', values: query.trim() ? [query] : [], onRemove: onClearQuery },
    ...facets.map((facet) => ({
      id: facet.id,
      label: facet.label,
      values: facet.values.map(
        (value) => facet.options.find((option) => option.value === value)?.label ?? value,
      ),
      onRemove: () => facet.onValueChange([]),
    })),
  ];
  return (
    <div className="forma-collection-filters" ref={root}>
      <div className="forma-filter-toolbar" role="search" aria-label={label}>
        <div className="forma-filter-search">{search}</div>
        <SideSheet
          title={label}
          description="Changes apply immediately. Select multiple options to include any of them."
          size="sm"
          open={open}
          onOpenChange={setOpen}
          closeLabel="Close filter panel"
          trigger={
            <Button
              emphasis="secondary"
              intent={count ? 'function' : 'default'}
              aria-label="Filters"
              aria-description={`${count} active filters`}
              leadingIcon={<Funnel size={componentToken('application.icon-md')} />}
              trailingIcon={count ? <CountBadge count={count} label="active filters" /> : undefined}
            >
              Filters
            </Button>
          }
          footer={
            <div className="forma-filter-panel-footer">
              <Button emphasis="ghost" disabled={!count} onClick={onClearAll}>
                Clear all
              </Button>
              <Button intent="function" onClick={() => setOpen(false)}>
                Show {result}
              </Button>
            </div>
          }
        >
          <div className="forma-filter-panel-content">
            <p className="forma-filter-panel-result forma-muted" role="status" aria-live="polite">
              {result} match your filters
            </p>
            {facets.map((facet) => (
              <fieldset className="forma-filter-facet" key={facet.id}>
                <legend>{facet.label}</legend>
                <FilterOptions groupLabel={facet.label}>
                  {facet.options.map((option) => (
                    <Checkbox
                      key={option.value}
                      label={option.label}
                      checked={facet.values.includes(option.value)}
                      onCheckedChange={(checked) =>
                        facet.onValueChange(
                          checked
                            ? [...new Set([...facet.values, option.value])]
                            : facet.values.filter((value) => value !== option.value),
                        )
                      }
                    />
                  ))}
                </FilterOptions>
              </fieldset>
            ))}
          </div>
        </SideSheet>
        <span className="forma-filter-result forma-muted" role="status" aria-live="polite">
          {result}
        </span>
      </div>
      {!open && (
        <AppliedFilterGroups
          groups={groups}
          onClearAll={onClearAll}
          focusFallback={() =>
            root.current?.querySelector<HTMLInputElement>('input[type="search"]')?.focus()
          }
        />
      )}
    </div>
  );
}
