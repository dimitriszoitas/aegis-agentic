import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { useFieldControl } from '@/components/field';
import { TextInput, type TextInputProps } from '@/components/text-input';
import { componentToken } from '@/lib/component-design-tokens';
import { cn } from '@/lib/utils';
import './password-input.css';

export interface PasswordInputProps extends Omit<
  TextInputProps,
  'type' | 'suffix' | 'clearable' | 'clearLabel' | 'onClear'
> {
  /** Accessible action label while the value is concealed. */
  showPasswordLabel?: string;
  /** Accessible action label while the value is visible. */
  hidePasswordLabel?: string;
}

/** A native password field with a non-submitting visibility action. Read-only values can be revealed. */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    {
      showPasswordLabel = 'Show password',
      hidePasswordLabel = 'Hide password',
      id,
      disabled,
      className,
      ...props
    },
    ref,
  ) {
    const [visible, setVisible] = useState(false);
    // Resolve the same Field precedence for both controls. Let TextInput resolve
    // its label, description, invalid and required metadata without interception.
    const control = useFieldControl({ id, disabled });
    const VisibilityIcon = visible ? EyeOff : Eye;
    return (
      <TextInput
        {...props}
        ref={ref}
        id={control.id}
        disabled={control.disabled}
        className={cn('aegis-password-input', className)}
        type={visible ? 'text' : 'password'}
        clearable={false}
        suffix={
          <span className="aegis-password-toggle">
            <IconButton
              type="button"
              emphasis="ghost"
              size="sm"
              aria-label={visible ? hidePasswordLabel : showPasswordLabel}
              aria-controls={control.id}
              disabled={control.disabled}
              onClick={() => setVisible((current) => !current)}
            >
              <VisibilityIcon size={componentToken('input.icon-sm')} aria-hidden="true" />
            </IconButton>
          </span>
        }
      />
    );
  },
);
