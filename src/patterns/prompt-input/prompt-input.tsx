import { componentToken, useComponentTokenNumbers } from '@/lib/component-design-tokens';
import { useId, useRef, useState, type ReactNode, type ReactElement, type RefObject } from 'react';
import { Popover } from '@base-ui/react/popover';
import { Autocomplete } from '@base-ui/react/autocomplete';
import { ArrowUp, Check, Paperclip, Slash, Square } from '@/components/icon';
import { Button } from '@/components/button';
import { IconButton } from '@/components/icon-button';
import { Textarea } from '@/components/textarea';
import { Tag } from '@/components/tag';
import { Kbd } from '@/components/kbd';
import { cn } from '@/lib/utils';
import { useInputFocusModality } from '@/lib/use-input-focus';
import type { AiContextItem } from '@/lib/ai';
import './prompt-input.css';

export interface PromptCommand {
  id: string;
  label: string;
  description?: string;
  prompt: string;
  icon?: ReactNode;
}
export interface PromptInputProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onSend: (prompt: string, context: AiContextItem[]) => void | Promise<void>;
  generating?: boolean;
  onStop?: () => void;
  context?: AiContextItem[];
  availableContext?: AiContextItem[];
  onContextChange?: (context: AiContextItem[]) => void;
  commands?: PromptCommand[];
  disabled?: boolean;
  placeholder?: string;
  /** Hero gives landing-page prompts a spacious composer and a separate context strip. */
  presentation?: 'compact' | 'hero';
  className?: string;
}
const emptyContext: AiContextItem[] = [];
const defaultCommands: PromptCommand[] = [
  {
    id: 'explain',
    label: 'Explain context',
    description: 'Understand the attached records and resources',
    prompt: 'Explain the attached context and suggest next steps.',
  },
  {
    id: 'summarize',
    label: 'Summarize records',
    description: 'Prepare a concise summary to share',
    prompt: 'Summarize the attached records for a handoff.',
  },
  {
    id: 'config',
    label: 'Review changes',
    description: 'Check proposed changes before applying them',
    prompt: 'Review the proposed changes and list the validation checks.',
  },
];
/** Searchable choices with keyboard interaction supplied by Base UI. */
function PromptMenu<T extends { id: string; label: string }>({
  open,
  onOpenChange,
  label,
  placeholder,
  emptyLabel,
  items,
  trigger,
  focusTarget,
  onSelect,
  renderItem,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  placeholder: string;
  emptyLabel: string;
  items: T[];
  trigger: ReactElement;
  focusTarget: RefObject<HTMLTextAreaElement | null>;
  onSelect: (item: T) => void;
  renderItem: (item: T) => ReactNode;
}) {
  const sizes = useComponentTokenNumbers(
    ['ai-assistance.popover-offset', 'ai-assistance.overlay-collision-padding'],
    focusTarget,
  );
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger render={trigger} />
      <Popover.Portal>
        <Popover.Positioner
          side="top"
          align="start"
          sideOffset={sizes['ai-assistance.popover-offset']}
          collisionPadding={sizes['ai-assistance.overlay-collision-padding']}
          className="aegis-prompt-positioner"
        >
          <Popover.Popup className="aegis-prompt-menu" aria-label={label} finalFocus={focusTarget}>
            <Autocomplete.Root
              items={items}
              inline
              open
              autoHighlight="always"
              itemToStringValue={(item) => `${item.label} ${item.id}`}
            >
              <Autocomplete.Input
                className="aegis-prompt-menu-input"
                placeholder={placeholder}
                aria-label={`Search ${label.toLowerCase()}`}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') onOpenChange(false);
                }}
              />
              <Autocomplete.Empty className="aegis-prompt-menu-empty">
                {emptyLabel}
              </Autocomplete.Empty>
              <Autocomplete.List className="aegis-prompt-menu-list">
                {(item: T) => (
                  <Autocomplete.Item
                    key={item.id}
                    value={item}
                    className="aegis-prompt-menu-item"
                    onClick={() => onSelect(item)}
                  >
                    {renderItem(item)}
                  </Autocomplete.Item>
                )}
              </Autocomplete.List>
            </Autocomplete.Root>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function PromptInput({
  value,
  defaultValue = '',
  onValueChange,
  onSend,
  generating = false,
  onStop,
  context,
  availableContext = emptyContext,
  onContextChange,
  commands = defaultCommands,
  disabled = false,
  placeholder = 'Ask about your work…',
  presentation = 'compact',
  className,
}: PromptInputProps) {
  useInputFocusModality();
  const [draft, setDraft] = useState(defaultValue);
  const [localContext, setLocalContext] = useState<AiContextItem[]>([]);
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const textarea = useRef<HTMLTextAreaElement>(null);
  const text = value ?? draft;
  const currentText = useRef(text);
  currentText.current = text;
  const attached = context ?? localContext;
  const helpId = useId();
  const errorId = useId();
  const setText = (next: string) => {
    if (value === undefined) setDraft(next);
    onValueChange?.(next);
    setError('');
  };
  const changeContext = (next: AiContextItem[]) => {
    if (context === undefined) setLocalContext(next);
    onContextChange?.(next);
  };
  const restoreFocus = () => requestAnimationFrame(() => textarea.current?.focus());
  async function send() {
    if (!text.trim() || generating || submitting || disabled) return;
    const sent = text;
    setSubmitting(true);
    setError('');
    try {
      await onSend(
        sent.trim(),
        attached.map((item) => ({ ...item })),
      );
      if (currentText.current === sent) setText('');
      restoreFocus();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Message could not be sent. Try again.');
    } finally {
      setSubmitting(false);
    }
  }
  const contextStrip = attached.length > 0 && (
    <div className="aegis-prompt-context" role="region" aria-label="Attached context" tabIndex={0}>
      {presentation === 'hero' && <span className="aegis-prompt-context-label">Context</span>}
      {attached.map((item) => (
        <Tag
          key={item.id}
          size="sm"
          variant="removable"
          disabled={disabled}
          removeLabel={`Remove ${item.label} from context`}
          onRemove={() => {
            changeContext(attached.filter((entry) => entry.id !== item.id));
            restoreFocus();
          }}
        >
          <span className="aegis-prompt-context-name" title={item.label}>
            {item.label}
          </span>
        </Tag>
      ))}
    </div>
  );
  return (
    <div
      className={cn('aegis-prompt', className)}
      data-disabled={disabled || undefined}
      data-presentation={presentation}
    >
      {presentation === 'compact' && contextStrip}
      <div className="aegis-prompt-composer">
        <Textarea
          ref={textarea}
          appearance="plain"
          size={presentation === 'hero' ? 'lg' : 'sm'}
          data-prompt-editor=""
          aria-label="Message to AI assistant"
          aria-describedby={`${helpId}${error ? ` ${errorId}` : ''}`}
          autoGrow
          rows={2}
          maxRows={7}
          value={text}
          onValueChange={setText}
          disabled={disabled || submitting}
          placeholder={placeholder}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (
              event.key === '/' &&
              !text.trim() &&
              !event.ctrlKey &&
              !event.metaKey &&
              !event.altKey
            ) {
              event.preventDefault();
              setCommandsOpen(true);
            } else if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void send();
            }
          }}
        />
        <div className="aegis-prompt-toolbar">
          <div className="aegis-prompt-tools">
            <PromptMenu
              open={attachmentsOpen}
              onOpenChange={setAttachmentsOpen}
              label="Attach context"
              placeholder="Find a record or resource…"
              emptyLabel="No matching context."
              items={availableContext}
              focusTarget={textarea}
              trigger={
                presentation === 'hero' ? (
                  <Button
                    size="sm"
                    emphasis="ghost"
                    disabled={disabled}
                    leadingIcon={<Paperclip size={componentToken('ai-assistance.icon-md')} />}
                  >
                    Attach context
                  </Button>
                ) : (
                  <IconButton
                    aria-label="Attach context"
                    tooltip={false}
                    size="sm"
                    emphasis="ghost"
                    disabled={disabled}
                  >
                    <Paperclip size={componentToken('ai-assistance.icon-md')} />
                  </IconButton>
                )
              }
              onSelect={(item) => {
                if (!attached.some((entry) => entry.id === item.id))
                  changeContext([...attached, { ...item }]);
                setAttachmentsOpen(false);
              }}
              renderItem={(item) => (
                <>
                  <span>
                    <strong>{item.label}</strong>
                    <small>
                      {item.id} · {item.kind}
                    </small>
                  </span>
                  {attached.some((entry) => entry.id === item.id) && (
                    <Check
                      size={componentToken('ai-assistance.icon-inline')}
                      aria-label="Attached"
                    />
                  )}
                </>
              )}
            />
            <PromptMenu
              open={commandsOpen}
              onOpenChange={setCommandsOpen}
              label="Prompt commands"
              placeholder="Find a command…"
              emptyLabel="No matching commands."
              items={commands}
              focusTarget={textarea}
              trigger={
                presentation === 'hero' ? (
                  <Button
                    size="sm"
                    emphasis="ghost"
                    aria-label="Prompt commands"
                    disabled={disabled}
                    leadingIcon={<Slash size={componentToken('ai-assistance.icon-md')} />}
                  >
                    Commands
                  </Button>
                ) : (
                  <IconButton
                    aria-label="Prompt commands"
                    tooltip={false}
                    size="sm"
                    emphasis="ghost"
                    disabled={disabled}
                  >
                    <Slash size={componentToken('ai-assistance.icon-md')} />
                  </IconButton>
                )
              }
              onSelect={(command) => {
                setText(command.prompt);
                setCommandsOpen(false);
              }}
              renderItem={(command) => (
                <>
                  {command.icon}
                  <span>
                    <strong>{command.label}</strong>
                    {command.description && <small>{command.description}</small>}
                  </span>
                </>
              )}
            />
          </div>
          {generating ? (
            <IconButton
              aria-label="Stop generation"
              tooltip={false}
              intent="ai"
              emphasis="secondary"
              size={presentation === 'hero' ? 'md' : 'sm'}
              onClick={() => {
                onStop?.();
                restoreFocus();
              }}
              disabled={!onStop}
            >
              <Square size={componentToken('ai-assistance.icon-sm')} />
            </IconButton>
          ) : (
            <IconButton
              aria-label="Send message"
              tooltip={false}
              intent="ai"
              size={presentation === 'hero' ? 'md' : 'sm'}
              onClick={() => void send()}
              loading={submitting}
              disabled={disabled || !text.trim()}
            >
              <ArrowUp size={componentToken('ai-assistance.icon-md')} />
            </IconButton>
          )}
        </div>
        <p id={helpId} className="aegis-prompt-hint">
          {presentation === 'hero' ? (
            'Enter to send · Shift + Enter for a new line · / for commands'
          ) : (
            <>
              <Kbd>Enter</Kbd> send <span>·</span> <Kbd>Shift + Enter</Kbd> new line <span>·</span>{' '}
              <Kbd>/</Kbd> commands
            </>
          )}
        </p>
        {error && (
          <p id={errorId} className="aegis-prompt-error" role="alert">
            {error}
          </p>
        )}
      </div>
      {presentation === 'hero' && contextStrip}
    </div>
  );
}
