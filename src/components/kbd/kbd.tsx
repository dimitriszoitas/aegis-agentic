import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import './kbd.css';
export interface KbdProps extends ComponentProps<'kbd'> {
  size?: 'sm' | 'md';
}
export function Kbd({ size = 'sm', className, ...props }: KbdProps) {
  return <kbd className={cn('aegis-kbd', className)} data-size={size} {...props} />;
}
