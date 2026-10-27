import { componentToken } from '@/lib/component-design-tokens';
import type { ComponentProps, ReactNode } from 'react';
import { ChevronRight } from '@/components/icon';
import { cn } from '@/lib/utils';
import './breadcrumb.css';
export interface BreadcrumbItem {
  label: ReactNode;
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
}
export interface BreadcrumbProps extends ComponentProps<'nav'> {
  items: readonly BreadcrumbItem[];
  separator?: ReactNode;
}
export function Breadcrumb({
  items,
  separator = <ChevronRight size={componentToken('navigation.icon-compact')} />,
  className,
  ...props
}: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('aegis-breadcrumb', className)} {...props}>
      <ol>
        {items.map((item, index) => (
          <li key={index}>
            {index > 0 && (
              <span className="aegis-breadcrumb-separator" aria-hidden="true">
                {separator}
              </span>
            )}
            {index === items.length - 1 ? (
              <span className="aegis-breadcrumb-current" aria-current="page">
                {item.icon}
                {item.label}
              </span>
            ) : item.href ? (
              <a href={item.href} onClick={item.onClick}>
                {item.icon}
                {item.label}
              </a>
            ) : item.onClick ? (
              <button type="button" onClick={item.onClick}>
                {item.icon}
                {item.label}
              </button>
            ) : (
              <span>
                {item.icon}
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
