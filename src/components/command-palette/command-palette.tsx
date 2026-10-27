import { useInputFocusModality } from '@/lib/use-input-focus';
import { componentToken } from '@/lib/component-design-tokens';
import { useState, useEffect, useRef, type ReactNode } from 'react';
import { Autocomplete } from '@base-ui/react/autocomplete';
import { Dialog } from '@base-ui/react/dialog';
import { Search, Sparkles, X } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { Kbd } from '@/components/kbd';
import './command-palette.css';

export interface CommandAction {
  id: string;
  label: string;
  group?: string;
  icon?: ReactNode;
  keywords?: string[];
  shortcut?: string;
  onSelect: () => void;
}
export interface CommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  actions: CommandAction[];
  onAskAi?: (query: string) => void;
  shortcut?: boolean;
}
export function CommandPalette({
  open: controlled,
  onOpenChange,
  defaultOpen = false,
  actions,
  onAskAi,
  shortcut = true,
}: CommandPaletteProps) {
  useInputFocusModality();
  const [internal, setInternal] = useState(defaultOpen);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const open = controlled ?? internal;
  const setOpen = (next: boolean) => {
    if (controlled === undefined) setInternal(next);
    onOpenChange?.(next);
    if (!next) setQuery('');
  };
  useEffect(() => {
    if (!shortcut) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        if (controlled === undefined) setInternal(!open);
        onOpenChange?.(!open);
        if (open) setQuery('');
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [shortcut, open, controlled, onOpenChange]);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matched = actions.filter((action) =>
    [action.label, ...(action.keywords ?? [])]
      .join(' ')
      .toLocaleLowerCase()
      .includes(normalizedQuery),
  );
  const askAction: CommandAction = {
    id: 'aegis-ai-query',
    label: query ? `Ask Aegis AI about “${query}”` : 'Open Aegis AI',
    group: 'Aegis AI',
    icon: <Sparkles size={componentToken('navigation.icon-navigation')} />,
    onSelect: () => onAskAi?.(query),
  };
  const visible = onAskAi ? [...matched, askAction] : matched;
  const groups = [...new Set(visible.map((action) => action.group ?? 'Actions'))];
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop data-aegis-overlay className="command-scrim" />
        <Dialog.Popup
          ref={contentRef}
          className="command-dialog"
          initialFocus={() => {
            const active = document.activeElement;
            if (active instanceof HTMLElement && !contentRef.current?.contains(active))
              openerRef.current = active;
            return inputRef.current;
          }}
          finalFocus={() => {
            const active = document.activeElement;
            if (active && active !== document.body && !contentRef.current?.contains(active))
              return false;
            return openerRef.current?.isConnected ? openerRef.current : false;
          }}
        >
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <Dialog.Description className="sr-only">
            Search navigation, actions, and records. Use arrow keys to choose and Enter to run.
          </Dialog.Description>
          <Autocomplete.Root<CommandAction>
            items={visible}
            filter={null}
            inline
            open={open}
            autoHighlight="always"
            value={query}
            onValueChange={setQuery}
            itemToStringValue={(action) => action.label}
            onOpenChange={(next, details) => {
              if (!next && details.reason !== 'focus-out') setOpen(false);
            }}
          >
            <div className="command-search">
              <Search size={componentToken('navigation.icon-lg')} aria-hidden />
              <Autocomplete.Input
                ref={inputRef}
                className="command-input"
                placeholder={
                  onAskAi
                    ? 'Search commands, or ask Aegis AI…'
                    : 'Search navigation, actions, and records…'
                }
                aria-label="Search commands"
              />
              <Dialog.Close
                render={
                  <IconButton aria-label="Close command palette" size="sm" emphasis="ghost" />
                }
              >
                <X size={componentToken('navigation.icon-sm')} />
              </Dialog.Close>
            </div>
            <Autocomplete.List className="command-list" aria-label="Available commands">
              {groups.map((group) => (
                <Autocomplete.Group key={group}>
                  <Autocomplete.GroupLabel className="command-group-label">
                    {group}
                  </Autocomplete.GroupLabel>
                  {visible
                    .filter((action) => (action.group ?? 'Actions') === group)
                    .map((action) => (
                      <Autocomplete.Item
                        key={action.id}
                        value={action}
                        className="command-item"
                        onClick={() => {
                          setOpen(false);
                          action.onSelect();
                        }}
                      >
                        {action.icon}
                        <span>{action.label}</span>
                        {action.shortcut && <Kbd>{action.shortcut}</Kbd>}
                      </Autocomplete.Item>
                    ))}
                </Autocomplete.Group>
              ))}
            </Autocomplete.List>
            {!visible.length && (
              <div className="command-empty" role="status">
                No matching actions. Try another search.
              </div>
            )}
            <div className="command-footer">
              <span>
                <Kbd>↑ ↓</Kbd> Navigate
              </span>
              <span>
                <Kbd>↵</Kbd> Open
              </span>
              <span>
                <Kbd>Esc</Kbd> Close
              </span>
            </div>
          </Autocomplete.Root>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
