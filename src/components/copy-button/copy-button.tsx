import { componentToken } from '@/lib/component-design-tokens';
import { useState, useEffect, useRef } from 'react';
import { Copy, Check } from '@/components/icon';
import { showNotification } from '@/components/notification';
import { IconButton, type IconButtonProps } from '@/components/icon-button';
export interface CopyButtonProps extends Omit<
  IconButtonProps,
  'children' | 'onClick' | 'aria-label'
> {
  text: string;
  'aria-label'?: string;
  notify?: boolean;
  onCopy?: () => void;
}
export function CopyButton({
  text,
  notify = false,
  onCopy,
  'aria-label': label = 'Copy to clipboard',
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <IconButton
      {...props}
      emphasis={props.emphasis ?? 'ghost'}
      aria-label={copied ? 'Copied' : label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          onCopy?.();
          if (notify) showNotification({ intent: 'success', title: 'Copied to clipboard' });
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setCopied(false), 2000);
        } catch {
          showNotification({
            intent: 'destroy',
            title: 'Clipboard unavailable. Select and copy the text.',
          });
        }
      }}
    >
      {copied ? (
        <Check size={componentToken('trigger.icon-md')} />
      ) : (
        <Copy size={componentToken('trigger.icon-md')} />
      )}
    </IconButton>
  );
}
