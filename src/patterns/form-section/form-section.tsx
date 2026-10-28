import { useId, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { mergeDescriptionIds } from '@/components/field';
import { ContentGrid, type ContentGridProps } from '@/patterns/page-layout';
import { cn } from '@/lib/utils';
import './form-section.css';

export interface FormSectionProps extends Omit<ComponentPropsWithoutRef<'fieldset'>, 'children'> {
  legend: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** Maximum field columns; the shared grid collapses with available container width. */
  maxColumns?: ContentGridProps['maxColumns'];
  minItemWidth?: ContentGridProps['minItemWidth'];
  /** Host-owned controls after the fields, inside the native disabled boundary. */
  actions?: ReactNode;
}

/** Native field grouping and responsive layout; no form element, field state or submission logic. */
export function FormSection({
  legend,
  description,
  children,
  maxColumns = 1,
  minItemWidth = 'regular',
  actions,
  disabled,
  className,
  'aria-describedby': describedBy,
  ...props
}: FormSectionProps) {
  const descriptionId = `aegis-form-section-description-${useId()}`;
  const hasDescription = description !== undefined && description !== null && description !== false;
  return (
    <fieldset
      {...props}
      disabled={disabled}
      className={cn('aegis-form-section', className)}
      aria-describedby={mergeDescriptionIds(
        describedBy,
        hasDescription ? descriptionId : undefined,
      )}
    >
      <legend className="aegis-form-section-legend" data-form-section-slot="legend">
        {legend}
      </legend>
      <div className="aegis-form-section-content">
        {hasDescription && (
          <div
            className="aegis-form-section-description"
            id={descriptionId}
            data-form-section-slot="description"
          >
            {description}
          </div>
        )}
        <ContentGrid
          maxColumns={maxColumns}
          minItemWidth={minItemWidth}
          data-form-section-slot="fields"
        >
          {children}
        </ContentGrid>
        {actions !== undefined && actions !== null && actions !== false && (
          <div className="aegis-form-section-actions" data-form-section-slot="actions">
            {actions}
          </div>
        )}
      </div>
    </fieldset>
  );
}
