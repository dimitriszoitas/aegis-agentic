import { componentTokenDefaults } from '@/lib/component-design-tokens';
export type SheetPlacement = 'bottom' | 'left' | 'right';

export function sheetBounds(
  available: number,
  contentMinimum: number,
  minimum: number,
  maximum: number,
) {
  const max = Math.max(0, Math.min(maximum, available - Math.max(0, contentMinimum)));
  return { min: Math.min(Math.max(0, minimum), max), max };
}

export function clampSheetSize(size: number, bounds: { min: number; max: number }) {
  return Math.round(
    Math.max(bounds.min, Math.min(Number.isFinite(size) ? size : bounds.min, bounds.max)),
  );
}

/** A positive pointer delta grows a left sheet and shrinks a bottom/right sheet. */
export function sheetPointerSize(placement: SheetPlacement, startSize: number, delta: number) {
  return startSize + (placement === 'left' ? delta : -delta);
}

export function sheetKeyboardSize(
  placement: SheetPlacement,
  current: number,
  key: string,
  shift: boolean,
  bounds: { min: number; max: number },
  steps = {
    regular: componentTokenDefaults['sheet-resize-step'],
    large: componentTokenDefaults['sheet-resize-step-large'],
  },
) {
  if (key === 'Home') return bounds.min;
  if (key === 'End') return bounds.max;
  const grow =
    placement === 'bottom' ? 'ArrowUp' : placement === 'left' ? 'ArrowRight' : 'ArrowLeft';
  const shrink =
    placement === 'bottom' ? 'ArrowDown' : placement === 'left' ? 'ArrowLeft' : 'ArrowRight';
  if (key !== grow && key !== shrink) return null;
  return clampSheetSize(
    current + (key === grow ? 1 : -1) * (shift ? steps.large : steps.regular),
    bounds,
  );
}
