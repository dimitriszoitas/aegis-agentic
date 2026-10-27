import { componentToken } from '@/lib/component-design-tokens';
import { useCallback, useState } from 'react';
import {
  Group,
  Panel,
  Separator,
  type GroupProps,
  type PanelProps,
  type SeparatorProps,
} from 'react-resizable-panels';
import { GripVertical } from '@/components/icon';
import { cn } from '@/lib/utils';
import './resizable-panels.css';
export type ResizablePanelsProps = GroupProps;
export function ResizablePanels({ className, ...props }: ResizablePanelsProps) {
  return <Group className={cn('aegis-resizable-panels', className)} {...props} />;
}
export type ResizablePanelProps = PanelProps;
export function ResizablePanel({ className, onResize, ...props }: ResizablePanelProps) {
  const [hidden, setHidden] = useState(
    () => props.defaultSize !== undefined && parseFloat(String(props.defaultSize)) === 0,
  );
  const handleResize = useCallback<NonNullable<PanelProps['onResize']>>(
    (size, id, previous) => {
      setHidden(size.asPercentage === 0);
      onResize?.(size, id, previous);
    },
    [onResize],
  );
  return (
    <Panel
      {...props}
      className={cn('aegis-resizable-panel', className)}
      onResize={handleResize}
      inert={hidden || props.inert}
      aria-hidden={hidden || props['aria-hidden']}
    />
  );
}
export interface ResizeHandleProps extends SeparatorProps {
  label: string;
  withGrip?: boolean;
}
/** Arrow keys resize. Enter toggles the preceding panel when it is collapsible. */
export function ResizeHandle({
  label,
  withGrip = true,
  className,
  children,
  onPointerDownCapture,
  onKeyDownCapture,
  onFocusCapture,
  onBlurCapture,
  ...props
}: ResizeHandleProps) {
  const [pointerFocus, setPointerFocus] = useState(false);
  return (
    <Separator
      {...props}
      aria-label={label}
      className={cn('aegis-resize-handle', className)}
      data-pointer-focus={pointerFocus || undefined}
      onPointerDownCapture={(event) => {
        if (event.button === 0) setPointerFocus(true);
        onPointerDownCapture?.(event);
      }}
      onKeyDownCapture={(event) => {
        setPointerFocus(false);
        onKeyDownCapture?.(event);
      }}
      onFocusCapture={(event) => {
        setPointerFocus(false);
        onFocusCapture?.(event);
      }}
      onBlurCapture={(event) => {
        setPointerFocus(false);
        onBlurCapture?.(event);
      }}
    >
      {children ??
        (withGrip && (
          <span aria-hidden="true">
            <GripVertical size={componentToken('layout.icon-xs')} />
          </span>
        ))}
    </Separator>
  );
}
