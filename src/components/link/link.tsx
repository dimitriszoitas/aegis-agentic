import { componentToken } from '@/lib/component-design-tokens';
import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { ArrowUpRight } from '@/components/icon';
import { cn } from '@/lib/utils';
import './link.css';

export interface LinkProps extends Omit<
  ComponentPropsWithoutRef<'a'>,
  'href' | 'children' | 'color'
> {
  href: string;
  children: ReactNode;
  intent?: 'default' | 'function';
  size?: 'sm' | 'md' | 'lg';
  underline?: 'always' | 'hover' | 'none';
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  /** Opens a new tab by default and displays an external-link icon. */
  external?: boolean;
  disabled?: boolean;
}

/** Native navigation with explicit disabled and new-tab semantics. */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  {
    href,
    children,
    intent = 'function',
    size = 'md',
    underline = 'always',
    leadingIcon,
    trailingIcon,
    external = false,
    disabled = false,
    target,
    rel,
    tabIndex,
    className,
    onClick,
    ...props
  },
  ref,
) {
  const resolvedTarget = target ?? (external ? '_blank' : undefined);
  const opensNewTab = resolvedTarget === '_blank';
  const resolvedRel = opensNewTab
    ? [...new Set([...(rel?.split(/\s+/).filter(Boolean) ?? []), 'noopener', 'noreferrer'])].join(
        ' ',
      )
    : rel;
  return (
    <a
      {...props}
      ref={ref}
      href={disabled ? undefined : href}
      role={disabled ? 'link' : props.role}
      target={disabled ? undefined : resolvedTarget}
      rel={resolvedRel}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : tabIndex}
      className={cn('aegis-link', className)}
      data-intent={intent}
      data-size={size}
      data-underline={underline}
      onClick={(event) => {
        if (disabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onClick?.(event);
      }}
    >
      {leadingIcon && (
        <span className="aegis-link-icon" aria-hidden="true">
          {leadingIcon}
        </span>
      )}
      <span className="aegis-link-label">{children}</span>
      {(trailingIcon || external) && (
        <span className="aegis-link-icon" aria-hidden="true">
          {trailingIcon ?? <ArrowUpRight size={componentToken('trigger.icon-sm')} />}
        </span>
      )}
      {opensNewTab && !disabled && <span className="sr-only"> (opens in a new tab)</span>}
    </a>
  );
});
