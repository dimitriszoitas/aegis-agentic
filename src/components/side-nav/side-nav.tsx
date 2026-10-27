import { componentToken, useComponentTokenNumbers } from '@/lib/component-design-tokens';
import {
  forwardRef,
  useId,
  useState,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Shield, PanelLeftClose, PanelLeftOpen, Search, ChevronDown } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { CountBadge } from '@/components/count-badge';
import { DropdownMenu, type DropdownMenuEntry } from '@/components/dropdown-menu';
import { Tooltip } from '@/components/tooltip';
import { Kbd } from '@/components/kbd';
import { cn } from '@/lib/utils';
import './side-nav.css';
export interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  count?: number;
  children?: NavItem[];
}
export interface NavSection {
  label?: string;
  items: NavItem[];
}
export interface SideNavProps {
  sections: NavSection[];
  activeId: string;
  onNavigate: (id: string) => void;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onSearch?: () => void;
  showSearch?: boolean;
  brandName?: string;
  /** Pass null to show only the brand name. */
  brandIcon?: ReactNode;
  footer?: ReactNode | ((collapsed: boolean) => ReactNode);
  workspace?: string;
  /** Show the expanded workspace summary below the brand. */
  showWorkspace?: boolean;
  /** Replace the expanded workspace summary; hidden and inert in the collapsed rail. */
  workspaceContent?: ReactNode;
  className?: string;
}

function NavTooltip({
  children,
  content,
  enabled,
}: {
  children: ReactElement;
  content: string;
  enabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Tooltip
      content={content}
      side="right"
      open={enabled && open}
      onOpenChange={(next) => setOpen(enabled && next)}
    >
      {children}
    </Tooltip>
  );
}

// Keep Base UI menu handlers and its trigger ref on the actual tooltip button.
const CollapsedNavButton = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<'button'> & { tooltip: string }
>(function CollapsedNavButton({ tooltip, ...props }, ref) {
  return (
    <Tooltip content={tooltip} side="right">
      <button type="button" {...props} ref={ref} />
    </Tooltip>
  );
});

function activeAncestors(items: NavItem[], activeId: string): string[] {
  return items.flatMap((item) => {
    if (!item.children?.length) return [];
    const nested = activeAncestors(item.children, activeId);
    return item.children.some((child) => child.id === activeId) || nested.length
      ? [item.id, ...nested]
      : [];
  });
}

export function SideNav({
  sections,
  activeId,
  onNavigate,
  collapsed: controlled,
  defaultCollapsed = false,
  onCollapsedChange,
  onSearch,
  showSearch = true,
  brandName = 'Aegis',
  brandIcon,
  footer,
  workspace = 'Northstar',
  showWorkspace = true,
  workspaceContent,
  className,
}: SideNavProps) {
  const tokens = useComponentTokenNumbers(['navigation.icon-stroke-thin']);
  const brandMark =
    brandIcon === undefined ? (
      <Shield
        size={componentToken('navigation.icon-brand')}
        strokeWidth={tokens['navigation.icon-stroke-thin']}
      />
    ) : (
      brandIcon
    );
  const [internal, setInternal] = useState(defaultCollapsed);
  const collapsed = controlled ?? internal;
  const navId = useId();
  const activeGroups = activeAncestors(
    sections.flatMap((section) => section.items),
    activeId,
  );
  const [expanded, setExpanded] = useState<string[]>(activeGroups);
  function toggle() {
    if (collapsed) setExpanded((previous) => [...new Set([...previous, ...activeGroups])]);
    setInternal(!collapsed);
    onCollapsedChange?.(!collapsed);
  }
  function menuItems(items: NavItem[]): DropdownMenuEntry[] {
    return items.map((item) =>
      item.children?.length
        ? {
            type: 'submenu',
            id: item.id,
            label: item.label,
            icon: item.icon,
            items: menuItems(item.children),
          }
        : {
            id: item.id,
            label: item.label,
            icon: item.icon,
            onSelect: () => onNavigate(item.id),
          },
    );
  }
  function renderItem(item: NavItem, nested = false) {
    const hasChildren = Boolean(item.children?.length);
    const groupId = `${navId}-${item.id}`;
    if (hasChildren && collapsed)
      return (
        <DropdownMenu
          key={item.id}
          side="right"
          label={item.label}
          trigger={
            <CollapsedNavButton
              tooltip={item.label}
              className={cn('nav-item nav-icon', activeGroups.includes(item.id) && 'is-active')}
              aria-label={item.label}
            >
              {item.icon}
            </CollapsedNavButton>
          }
          items={menuItems(item.children ?? [])}
        />
      );
    const button = (
      <button
        type="button"
        className={cn(
          'nav-item',
          nested && 'nav-nested-item',
          activeId === item.id && 'is-active',
          collapsed && 'nav-icon',
        )}
        aria-label={collapsed ? item.label : undefined}
        aria-current={activeId === item.id ? 'page' : undefined}
        aria-expanded={hasChildren ? expanded.includes(item.id) : undefined}
        aria-controls={hasChildren && expanded.includes(item.id) ? groupId : undefined}
        onClick={() =>
          hasChildren
            ? setExpanded((prev) =>
                prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id],
              )
            : onNavigate(item.id)
        }
      >
        {item.icon}
        <span className="nav-item-copy" aria-hidden={collapsed}>
          <span className="nav-item-label">{item.label}</span>
          {item.count !== undefined && <CountBadge count={item.count} />}
          {hasChildren && (
            <ChevronDown
              size={componentToken('navigation.icon-sm')}
              style={{ transform: expanded.includes(item.id) ? 'rotate(180deg)' : undefined }}
            />
          )}
        </span>
      </button>
    );
    return (
      <div key={item.id}>
        <NavTooltip content={item.label} enabled={collapsed}>
          {button}
        </NavTooltip>
        {hasChildren && !collapsed && expanded.includes(item.id) && (
          <div id={groupId} className="nav-nested">
            {item.children?.map((child) => renderItem(child, true))}
          </div>
        )}
      </div>
    );
  }
  return (
    <nav
      className={cn('side-nav', className)}
      data-collapsed={collapsed}
      aria-label="Main navigation"
    >
      <div className="nav-brand">
        <div className="nav-brand-copy" aria-hidden={collapsed}>
          {brandMark && <span className="nav-mark">{brandMark}</span>}
          <strong>{brandName}</strong>
        </div>
        <IconButton
          key="navigation-toggle"
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          size="sm"
          emphasis="ghost"
          onClick={toggle}
        >
          {collapsed ? (
            <PanelLeftOpen size={componentToken('navigation.icon-md')} />
          ) : (
            <PanelLeftClose size={componentToken('navigation.icon-md')} />
          )}
        </IconButton>
      </div>
      {showWorkspace && (
        <div className="nav-workspace-collapse" aria-hidden={collapsed} inert={collapsed}>
          <div className="nav-workspace-clip">
            {workspaceContent ?? (
              <div className="nav-workspace">
                <span className="workspace-avatar">N</span>
                <div>
                  <strong>{workspace}</strong>
                  <span>Team workspace</span>
                </div>
                <span className="workspace-status" role="img" aria-label="All systems connected" />
              </div>
            )}
          </div>
        </div>
      )}
      {showSearch && (
        <NavTooltip content="Search workspace" enabled={collapsed}>
          <button
            type="button"
            className={cn('nav-search', collapsed && 'nav-icon')}
            aria-label="Search workspace"
            onClick={onSearch}
          >
            <Search size={componentToken('navigation.icon-md')} />
            <span className="nav-search-copy" aria-hidden={collapsed}>
              <span>Search workspace</span>
              <Kbd>⌘K</Kbd>
            </span>
          </button>
        </NavTooltip>
      )}
      <div className="nav-sections">
        {sections.map((section, index) => (
          <div
            key={section.label ?? index}
            className="nav-section"
            role="group"
            aria-label={section.label}
          >
            <div className="nav-items">{section.items.map((item) => renderItem(item))}</div>
          </div>
        ))}
      </div>
      <div className="nav-footer">{typeof footer === 'function' ? footer(collapsed) : footer}</div>
    </nav>
  );
}
