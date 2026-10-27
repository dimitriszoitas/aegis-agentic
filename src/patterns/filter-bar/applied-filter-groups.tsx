import { useRef } from 'react';
import { Button } from '@/components/button';
import { Tag } from '@/components/tag';
import './applied-filter-groups.css';

export interface AppliedFilterGroup {
  id: string;
  label: string;
  values: readonly string[];
  onRemove: () => void;
}

export interface AppliedFilterGroupsProps {
  groups: readonly AppliedFilterGroup[];
  onClearAll?: () => void;
  focusFallback?: () => void;
}

/** Summarize each selected category while its editing panel is closed. */
export function AppliedFilterGroups({
  groups,
  onClearAll,
  focusFallback,
}: AppliedFilterGroupsProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const applied = groups.filter((group) => group.values.length > 0);
  if (!applied.length) return null;

  function remove(group: AppliedFilterGroup, index: number) {
    group.onRemove();
    requestAnimationFrame(() => {
      const buttons = rootRef.current?.querySelectorAll<HTMLButtonElement>('.tag-remove');
      const next = buttons?.[Math.min(index, buttons.length - 1)];
      if (next) next.focus({ preventScroll: true });
      else focusFallback?.();
    });
  }

  return (
    <div
      ref={rootRef}
      className="aegis-applied-filter-groups"
      role="group"
      aria-label="Applied filters"
    >
      <span className="aegis-applied-filter-label">Filters Applied</span>
      {applied.map((group, index) => {
        const summary = `${group.label}: ${group.values.join(', ')}`;
        return (
          <Tag
            key={group.id}
            className="aegis-applied-filter-group"
            variant="removable"
            onRemove={() => remove(group, index)}
            removeLabel={`Remove ${group.label} filters: ${group.values.join(', ')}`}
          >
            <span className="aegis-applied-filter-summary" title={summary}>
              <span className="aegis-applied-filter-category">{group.label}:</span>{' '}
              {group.values.join(', ')}
            </span>
          </Tag>
        );
      })}
      {onClearAll && (
        <Button
          emphasis="ghost"
          size="sm"
          onClick={() => {
            onClearAll();
            requestAnimationFrame(() => focusFallback?.());
          }}
        >
          Clear all
        </Button>
      )}
    </div>
  );
}
