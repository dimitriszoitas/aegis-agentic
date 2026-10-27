import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import './card.css';

export interface CardProps extends ComponentProps<'section'> {
  elevation?: 'flat' | 'raised' | 'floating';
}

/** A composable surface. Use the header, content and footer slots for consistent spacing. */
export function Card({ elevation = 'raised', className, ...props }: CardProps) {
  return <section className={cn('aegis-card', className)} data-elevation={elevation} {...props} />;
}
export type CardHeaderProps = ComponentProps<'header'>;
export function CardHeader({ className, ...props }: CardHeaderProps) {
  return <header className={cn('aegis-card-header', className)} {...props} />;
}
export type CardTitleProps = ComponentProps<'h3'>;
export function CardTitle({ className, ...props }: CardTitleProps) {
  return <h3 className={cn('aegis-card-title', className)} {...props} />;
}
export type CardDescriptionProps = ComponentProps<'p'>;
export function CardDescription({ className, ...props }: CardDescriptionProps) {
  return <p className={cn('aegis-card-description', className)} {...props} />;
}
export type CardContentProps = ComponentProps<'div'>;
export function CardContent({ className, ...props }: CardContentProps) {
  return <div className={cn('aegis-card-content', className)} {...props} />;
}
export type CardFooterProps = ComponentProps<'footer'>;
export function CardFooter({ className, ...props }: CardFooterProps) {
  return <footer className={cn('aegis-card-footer', className)} {...props} />;
}
