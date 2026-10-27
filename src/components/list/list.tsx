import { createContext, useContext, useId, type ComponentProps, type ReactNode } from 'react';
import { Checkbox, type CheckboxProps } from '@/components/checkbox';
import { CountBadge } from '@/components/count-badge';
import { cn } from '@/lib/utils';
import './list.css';

export interface ListProps extends ComponentProps<'ul'> {
  /** Nested lists inherit their parent's density unless explicitly set. */
  density?: 'compact' | 'default' | 'comfortable';
  divided?: boolean;
}
const ListContext = createContext<{ depth: number; density: NonNullable<ListProps['density']> }>({
  depth: 0,
  density: 'default',
});

/** Native lists can be nested inside ListItem children, with four visual levels. */
export function List({ density, divided = false, className, children, ...props }: ListProps) {
  const parent = useContext(ListContext);
  const depth = Math.min(parent.depth + 1, 4);
  const currentDensity = density ?? parent.density;
  return (
    <ListContext.Provider value={{ depth, density: currentDensity }}>
      <ul
        className={cn('aegis-list', className)}
        data-density={currentDensity}
        data-divided={divided}
        data-depth={depth}
        {...props}
      >
        {children}
      </ul>
    </ListContext.Provider>
  );
}

/** Checkbox state is independent of the row's selectable/selected state. */
export type ListItemCheckboxProps = Omit<CheckboxProps, 'label' | 'description'>;

export interface ListItemProps extends Omit<ComponentProps<'li'>, 'title' | 'onSelect'> {
  title: ReactNode;
  /** Supporting second line. Takes precedence over the description alias. */
  subtitle?: ReactNode;
  /** Compatibility alias for subtitle. */
  description?: ReactNode;
  icon?: ReactNode;
  avatar?: ReactNode;
  checkbox?: ListItemCheckboxProps;
  /** Optional Tag components, including interactive or removable tags. */
  tags?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  /** Compact counter at the end of the row. Zero remains visible. */
  counter?: number;
  counterLabel?: string;
  counterMax?: number;
  selectable?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}
/** Row actions, checkboxes, and tags are independent siblings of the primary button. */
export function ListItem({
  title,
  subtitle,
  description,
  icon,
  avatar,
  checkbox,
  tags,
  meta,
  actions,
  counter,
  counterLabel,
  counterMax,
  selectable = false,
  selected = false,
  disabled = false,
  onSelect,
  className,
  children,
  ...props
}: ListItemProps) {
  const id = useId();
  const titleId = `aegis-list-title-${id}`;
  const subtitleId = `aegis-list-subtitle-${id}`;
  const supportingText = subtitle ?? description;
  const hasSubtitle =
    supportingText !== undefined && supportingText !== null && supportingText !== false;
  const content = (
    <span className="aegis-list-item-copy">
      <span className="aegis-list-item-title" id={titleId}>
        {title}
      </span>
      {hasSubtitle && (
        <span className="aegis-list-item-description" id={subtitleId}>
          {supportingText}
        </span>
      )}
    </span>
  );
  return (
    <li
      className={cn('aegis-list-item', className)}
      data-selected={selected}
      data-disabled={disabled}
      {...props}
    >
      <div
        className="aegis-list-item-row"
        data-interactive={selectable || !!onSelect || !!checkbox}
      >
        {(checkbox || avatar || icon) && (
          <div className="aegis-list-item-start">
            {checkbox && (
              <div className="aegis-list-item-checkbox">
                <Checkbox
                  aria-labelledby={checkbox['aria-label'] ? undefined : titleId}
                  aria-describedby={hasSubtitle ? subtitleId : undefined}
                  {...checkbox}
                  disabled={disabled || checkbox.disabled}
                />
              </div>
            )}
            {(avatar || icon) && <span className="aegis-list-item-leading">{avatar || icon}</span>}
          </div>
        )}
        <div className="aegis-list-item-body">
          {selectable || onSelect ? (
            <button
              type="button"
              className="aegis-list-item-main"
              aria-labelledby={titleId}
              aria-describedby={hasSubtitle ? subtitleId : undefined}
              aria-pressed={selectable ? selected : undefined}
              onClick={onSelect}
              disabled={disabled}
            >
              {content}
            </button>
          ) : (
            <div className="aegis-list-item-main">{content}</div>
          )}
          {(tags || meta || actions) && (
            <div className="aegis-list-item-extras">
              {tags && <div className="aegis-list-item-tags">{tags}</div>}
              {meta && <div className="aegis-list-item-meta">{meta}</div>}
              {actions && <div className="aegis-list-item-actions">{actions}</div>}
            </div>
          )}
        </div>
        {counter !== undefined && (
          <div className="aegis-list-item-counter">
            <CountBadge count={counter} max={counterMax} label={counterLabel} size="sm" />
          </div>
        )}
      </div>
      {children}
    </li>
  );
}
