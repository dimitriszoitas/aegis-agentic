import { componentToken } from '@/lib/component-design-tokens';
import { useId, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { ArrowLeft } from '@/components/icon';
import { Breadcrumb, type BreadcrumbItem } from '@/components/breadcrumb';
import { Button } from '@/components/button';
import { Link } from '@/components/link';
import { cn } from '@/lib/utils';
import './page-header.css';

export type PageHeaderBack =
  | { label: string; href: string; onClick?: never }
  | { label: string; onClick: () => void; href?: never };
export interface PageHeaderProps extends Omit<ComponentPropsWithoutRef<'header'>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  headingLevel?: 1 | 2 | 3;
  headingId?: string;
  /** A back destination takes precedence over breadcrumbs when both are supplied. */
  back?: PageHeaderBack;
  breadcrumbs?: readonly BreadcrumbItem[];
  leading?: ReactNode;
  metadata?: ReactNode;
  actions?: ReactNode;
  /** Optional content below the heading, such as navigation tabs or filters. */
  children?: ReactNode;
}

/** A responsive page title with navigation, context, and explicit actions. */
export function PageHeader({
  title,
  description,
  headingLevel = 1,
  headingId,
  back,
  breadcrumbs,
  leading,
  metadata,
  actions,
  children,
  className,
  ...props
}: PageHeaderProps) {
  const generatedId = useId();
  const Heading = headingLevel === 1 ? 'h1' : headingLevel === 2 ? 'h2' : 'h3';
  return (
    <header {...props} className={cn('aegis-page-header', className)}>
      {back || breadcrumbs?.length ? (
        <div className="aegis-page-header-navigation">
          {back ? (
            back.href !== undefined ? (
              <Link
                href={back.href}
                intent="default"
                underline="hover"
                leadingIcon={<ArrowLeft size={componentToken('page-structure.icon-md')} />}
              >
                {back.label}
              </Link>
            ) : (
              <Button
                emphasis="ghost"
                size="sm"
                leadingIcon={<ArrowLeft size={componentToken('page-structure.icon-md')} />}
                onClick={back.onClick}
              >
                {back.label}
              </Button>
            )
          ) : (
            <Breadcrumb items={breadcrumbs ?? []} />
          )}
        </div>
      ) : null}
      <div className="aegis-page-header-row">
        <div className="aegis-page-header-summary">
          {leading && <div className="aegis-page-header-leading">{leading}</div>}
          <div className="aegis-page-header-copy">
            <Heading id={headingId ?? generatedId} className="aegis-page-header-title">
              {title}
            </Heading>
            {description && <div className="aegis-page-header-description">{description}</div>}
            {metadata && <div className="aegis-page-header-metadata">{metadata}</div>}
          </div>
        </div>
        {actions && <div className="aegis-page-header-actions">{actions}</div>}
      </div>
      {children && <div className="aegis-page-header-content">{children}</div>}
    </header>
  );
}
