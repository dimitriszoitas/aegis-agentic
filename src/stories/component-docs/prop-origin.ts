import type { ComponentMetadata } from './types';

/** Match the source generator policy; unknown legacy inheritance stays hidden by default. */
export const isComponentProp = (prop: ComponentMetadata['props'][number]) =>
  !prop.inherited ||
  prop.declaration?.kind === 'design-system' ||
  prop.declaration?.kind === 'dependency';
