import { Children, useId, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { PageHeader, type PageHeaderProps } from '@/patterns/page-header';
import {
  contentGridColumnOptions,
  contentGridMinimums,
  readingColumnMeasures,
  validatePageLayoutRecipe,
  type ContentGridColumns,
  type ContentGridMinimum,
  type PageLayoutSlot,
  type ReadingMeasure,
} from './recipes';
import './page-layout.css';

export interface ReadingColumnProps extends ComponentPropsWithoutRef<'div'> {
  /** A starting measure for prose or forms; never a blanket limit for data grids. */
  measure?: ReadingMeasure;
}

export function ReadingColumn({
  measure = 'comfortable',
  className,
  ...props
}: ReadingColumnProps) {
  if (!Object.hasOwn(readingColumnMeasures, measure))
    throw new TypeError(`Unsupported reading measure: ${String(measure)}.`);
  return (
    <div {...props} className={cn('aegis-reading-column', className)} data-measure={measure} />
  );
}

export interface ContentGridProps extends ComponentPropsWithoutRef<'div'> {
  /** The number of columns is a maximum, and adapts to the available container width. */
  maxColumns?: ContentGridColumns;
  /** Known minimum item sizes, selected through Page Structure group tokens. */
  minItemWidth?: ContentGridMinimum;
}

export function ContentGrid({
  maxColumns = 4,
  minItemWidth = 'regular',
  children,
  className,
  ...props
}: ContentGridProps) {
  if (!(contentGridColumnOptions as readonly unknown[]).includes(maxColumns))
    throw new TypeError('ContentGrid maxColumns must be 1, 2, 3, or 4.');
  if (!Object.hasOwn(contentGridMinimums, minItemWidth))
    throw new TypeError(`Unsupported grid minimum: ${String(minItemWidth)}.`);
  return (
    <div
      {...props}
      className={cn('aegis-content-grid', className)}
      data-max-columns={maxColumns}
      data-min-item-width={minItemWidth}
    >
      {Children.map(children, (child) =>
        child === null ? null : <div className="aegis-content-grid-item">{child}</div>,
      )}
    </div>
  );
}

interface HeaderSlots {
  /** PageHeader renders the page title and the following optional header slots. */
  title: PageHeaderProps['title'];
  description?: PageHeaderProps['description'];
  actions?: PageHeaderProps['actions'];
  metadata?: PageHeaderProps['metadata'];
  leading?: PageHeaderProps['leading'];
  back?: PageHeaderProps['back'];
  breadcrumbs?: PageHeaderProps['breadcrumbs'];
  headingLevel?: PageHeaderProps['headingLevel'];
  headingId?: PageHeaderProps['headingId'];
}
export interface PageLayoutCommonProps
  extends Omit<ComponentPropsWithoutRef<'section'>, 'title' | 'children'>, HeaderSlots {
  children: ReactNode;
  footer?: ReactNode;
}
type NoGrid = { maxColumns?: never; minItemWidth?: never };
type NoAside = { aside?: never; asideLabel?: never };

export type CollectionPageLayoutProps = PageLayoutCommonProps &
  NoGrid &
  NoAside & {
    archetype: 'collection';
    filters?: ReactNode;
    measure?: never;
  };
export type DetailPageLayoutProps = PageLayoutCommonProps &
  NoGrid & {
    archetype: 'detail';
    filters?: never;
    measure?: never;
  } & ({ aside: ReactNode; asideLabel: string } | { aside?: never; asideLabel?: never });
export type SettingsPageLayoutProps = PageLayoutCommonProps &
  NoGrid &
  NoAside & {
    archetype: 'settings';
    measure?: ReadingMeasure;
    filters?: never;
  };
export type DashboardPageLayoutProps = PageLayoutCommonProps &
  NoAside & {
    archetype: 'dashboard';
    maxColumns?: ContentGridColumns;
    minItemWidth?: ContentGridMinimum;
    filters?: never;
    measure?: never;
  };
export type PageLayoutProps =
  | CollectionPageLayoutProps
  | DetailPageLayoutProps
  | SettingsPageLayoutProps
  | DashboardPageLayoutProps;

const hasSlot = (slot: ReactNode) => slot !== null && slot !== undefined && slot !== false;

/** Initial page recipes; the shell owns page padding, while each nested component owns its styling and behavior. */
export function PageLayout({
  archetype,
  title,
  description,
  actions,
  metadata,
  leading,
  back,
  breadcrumbs,
  headingLevel,
  headingId,
  filters,
  aside,
  asideLabel,
  footer,
  measure,
  maxColumns,
  minItemWidth,
  children,
  className,
  'aria-labelledby': labelledBy,
  ...props
}: PageLayoutProps) {
  const generatedId = useId();
  const resolvedHeadingId = headingId ?? `aegis-page-${generatedId}`;
  const slots: PageLayoutSlot[] = ['header', 'main'];
  if (hasSlot(filters)) slots.push('filters');
  if (hasSlot(aside)) slots.push('aside');
  if (hasSlot(footer)) slots.push('footer');
  const issues = validatePageLayoutRecipe({
    archetype,
    slots,
    asideLabel,
    measure,
    maxColumns,
    minItemWidth,
  });
  if (issues.length) throw new TypeError(issues.map((issue) => issue.message).join(' '));
  const content =
    archetype === 'settings' ? (
      <ReadingColumn measure={measure}>{children}</ReadingColumn>
    ) : archetype === 'dashboard' ? (
      <ContentGrid maxColumns={maxColumns} minItemWidth={minItemWidth}>
        {children}
      </ContentGrid>
    ) : (
      children
    );

  return (
    <section
      {...props}
      className={cn('aegis-page-layout', className)}
      data-archetype={archetype}
      aria-labelledby={labelledBy ?? resolvedHeadingId}
    >
      <PageHeader
        data-page-slot="header"
        title={title}
        description={description}
        actions={actions}
        metadata={metadata}
        leading={leading}
        back={back}
        breadcrumbs={breadcrumbs}
        headingLevel={headingLevel}
        headingId={resolvedHeadingId}
      />
      {hasSlot(filters) && (
        <div className="aegis-page-layout-filters" data-page-slot="filters">
          {filters}
        </div>
      )}
      <div className="aegis-page-layout-body" data-has-aside={hasSlot(aside) || undefined}>
        <div className="aegis-page-layout-main" data-page-slot="main">
          {content}
        </div>
        {hasSlot(aside) && (
          <aside className="aegis-page-layout-aside" data-page-slot="aside" aria-label={asideLabel}>
            {aside}
          </aside>
        )}
      </div>
      {hasSlot(footer) && (
        <footer className="aegis-page-layout-footer" data-page-slot="footer">
          {footer}
        </footer>
      )}
    </section>
  );
}
