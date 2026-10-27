import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import '@/components/button/button.css';
export interface ButtonGroupProps extends HTMLAttributes<HTMLDivElement> {
  'aria-label': string;
}
export function ButtonGroup({ className, ...props }: ButtonGroupProps) {
  return <div {...props} role="group" className={cn('button-group', className)} />;
}
