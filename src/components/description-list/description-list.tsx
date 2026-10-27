import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import './description-list.css';
export interface DescriptionItem {
  id: string;
  label: ReactNode;
  value: ReactNode;
}
export interface DescriptionListProps {
  items: readonly DescriptionItem[];
  columns?: 1 | 2 | 3;
  orientation?: 'stacked' | 'horizontal';
  emptyValue?: ReactNode;
  className?: string;
}
/** Semantic label/value pairs for record metadata. */
export function DescriptionList({
  items,
  columns = 1,
  orientation = 'stacked',
  emptyValue = 'Not provided',
  className,
}: DescriptionListProps) {
  return (
    <dl
      className={cn('aegis-description-list', className)}
      data-columns={columns}
      data-orientation={orientation}
    >
      {items.map((item) => (
        <div key={item.id}>
          <dt>{item.label}</dt>
          <dd>
            {item.value === null || item.value === undefined || item.value === ''
              ? emptyValue
              : item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
