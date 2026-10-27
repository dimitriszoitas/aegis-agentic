import { componentToken } from '@/lib/component-design-tokens';
import {
  useEffect,
  useId,
  useRef,
  useState,
  forwardRef,
  isValidElement,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Dialog as Primitive } from '@base-ui/react/dialog';
import { X } from '@/components/icon';
import { Button, type Intent } from '../button';
import { TextInput } from '../text-input';
import { cn } from '../../lib/utils';
import './modal.css';

export interface ModalProps extends Omit<
  ComponentPropsWithoutRef<typeof Primitive.Root>,
  'children' | 'modal' | 'onOpenChange'
> {
  onOpenChange?: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  trigger?: ReactElement;
  footer?: ReactNode;
  /** Secondary actions beside the title, such as export or duplicate. */
  headerActions?: ReactNode;
  /** Width presets: 400px, 560px, and 800px, each clamped to the viewport. */
  size?: 'small' | 'regular' | 'large';
  /** Hide the visible header while retaining title and description for assistive technology. */
  showHeader?: boolean;
  className?: string;
  showClose?: boolean;
  closeLabel?: string;
  closeOnOutsideClick?: boolean;
  role?: 'dialog' | 'alertdialog';
}

function ModalContent({
  title,
  description,
  children,
  footer,
  headerActions,
  size = 'regular',
  showHeader = true,
  className,
  showClose = true,
  closeLabel = 'Close dialog',
  role = 'dialog',
}: Omit<ModalProps, 'open' | 'defaultOpen' | 'onOpenChange'>) {
  const contentRef = useRef<HTMLDivElement>(null);
  const descriptionId = useId();
  return (
    <Primitive.Popup
      ref={contentRef}
      role={role}
      className={cn('aegis-modal', `aegis-modal-${size}`, className)}
      aria-describedby={description ? descriptionId : undefined}
      data-header={showHeader}
      data-close={showClose}
      finalFocus={() => {
        const content = contentRef.current;
        const current = document.activeElement;
        // A completed action may already have focused a different page or dialog.
        if (current !== document.body && !content?.contains(current)) {
          return false;
        }
        return true;
      }}
    >
      {showHeader ? (
        <header className="aegis-modal-header">
          <div className="aegis-modal-heading">
            <Primitive.Title className="aegis-modal-title">{title}</Primitive.Title>
            {description && (
              <Primitive.Description id={descriptionId} className="aegis-modal-description">
                {description}
              </Primitive.Description>
            )}
          </div>
          {headerActions && <div className="aegis-modal-header-actions">{headerActions}</div>}
          {showClose && (
            <Primitive.Close className="aegis-modal-close" aria-label={closeLabel}>
              <X size={componentToken('surface.icon-lg')} />
            </Primitive.Close>
          )}
        </header>
      ) : (
        <>
          <Primitive.Title className="sr-only">{title}</Primitive.Title>
          {description && (
            <Primitive.Description id={descriptionId} className="sr-only">
              {description}
            </Primitive.Description>
          )}
          {showClose && (
            <Primitive.Close
              className="aegis-modal-close aegis-modal-close-floating"
              aria-label={closeLabel}
            >
              <X size={componentToken('surface.icon-lg')} />
            </Primitive.Close>
          )}
        </>
      )}
      {children !== undefined && children !== null && (
        <div className="aegis-modal-body" tabIndex={0} role="region" aria-label="Dialog content">
          {children}
        </div>
      )}
      {footer && <footer className="aegis-modal-footer">{footer}</footer>}
    </Primitive.Popup>
  );
}

export function Modal({
  open,
  defaultOpen,
  onOpenChange,
  onOpenChangeComplete,
  actionsRef,
  handle,
  triggerId,
  defaultTriggerId,
  disablePointerDismissal,
  trigger,
  closeOnOutsideClick = true,
  ...props
}: ModalProps) {
  return (
    <Primitive.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={onOpenChangeComplete}
      actionsRef={actionsRef}
      handle={handle}
      triggerId={triggerId}
      defaultTriggerId={defaultTriggerId}
      modal
      disablePointerDismissal={disablePointerDismissal ?? !closeOnOutsideClick}
    >
      {trigger && <Primitive.Trigger render={trigger} />}
      <Primitive.Portal>
        <Primitive.Backdrop data-aegis-overlay className="aegis-modal-overlay" />
        <ModalContent {...props} trigger={trigger} />
      </Primitive.Portal>
    </Primitive.Root>
  );
}
export const Dialog = Modal;
export type DialogProps = ModalProps;
export type ModalCloseProps = ComponentPropsWithoutRef<typeof Primitive.Close> & {
  /** @deprecated Use render={<Button />} for headless composition. */
  asChild?: boolean;
};
export const ModalClose = forwardRef<HTMLButtonElement, ModalCloseProps>(function ModalClose(
  { asChild, children, render, ...props },
  ref,
) {
  if (asChild && !isValidElement(children))
    throw new Error('ModalClose asChild requires one React element.');
  return (
    <Primitive.Close {...props} ref={ref} render={asChild ? (children as ReactElement) : render}>
      {asChild ? undefined : children}
    </Primitive.Close>
  );
});

export interface ConfirmDialogProps extends Omit<ModalProps, 'footer' | 'size' | 'role'> {
  onConfirm: () => void | Promise<void>;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmationText?: string;
  intent?: Extract<Intent, 'function' | 'destroy'>;
  loading?: boolean;
}
export function ConfirmDialog({
  title,
  description,
  trigger,
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  onConfirm,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  confirmationText,
  intent = 'destroy',
  loading = false,
  ...props
}: ConfirmDialogProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [value, setValue] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const id = useId();
  const isOpen = open ?? internalOpen;
  const busy = loading || pending;
  const confirmed = !confirmationText || value === confirmationText;
  useEffect(() => {
    if (!isOpen) {
      setValue('');
      setError('');
    }
  }, [isOpen]);
  function changeOpen(next: boolean) {
    if (busy && !next) return;
    if (next) {
      setValue('');
      setError('');
    }
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  }
  async function confirm() {
    if (!confirmed || busy) return;
    setPending(true);
    setError('');
    try {
      await onConfirm();
      if (open === undefined) setInternalOpen(false);
      onOpenChange?.(false);
      setValue('');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'The action could not be completed. Try again.',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <Modal
      {...props}
      title={title}
      description={description}
      trigger={trigger}
      open={isOpen}
      onOpenChange={changeOpen}
      size="small"
      role="alertdialog"
      closeOnOutsideClick={false}
      showClose={!busy}
      footer={
        <>
          <Button emphasis="ghost" disabled={busy} onClick={() => changeOpen(false)}>
            {cancelLabel}
          </Button>
          <Button
            intent={intent}
            disabled={!confirmed}
            loading={busy}
            onClick={() => void confirm()}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
      {confirmationText && (
        <div className="aegis-confirm-field">
          <TextInput
            id={id}
            label={
              <>
                Type <strong>{confirmationText}</strong> to confirm
              </>
            }
            value={value}
            onValueChange={setValue}
            autoComplete="off"
            disabled={busy}
          />
        </div>
      )}
      {error && (
        <p className="aegis-confirm-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
