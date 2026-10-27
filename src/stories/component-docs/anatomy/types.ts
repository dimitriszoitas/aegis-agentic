import type { ReactNode } from 'react';

export interface AnatomyPart {
  name: string;
  description: string;
  /** A selector for the actual rendered part, scoped with data-anatomy attributes if needed. */
  selector: string;
  anchor?:
    | 'top-left'
    | 'top'
    | 'top-right'
    | 'left'
    | 'right'
    | 'bottom-left'
    | 'bottom'
    | 'bottom-right'
    | 'center';
}
export interface AnatomyDefinition {
  /** One or two actual component instances with optional content slots populated. */
  render: () => ReactNode;
  parts: AnatomyPart[];
  /** Space reserved for open menus, dialogs, and larger components. */
  height?: number;
  /** Explains complementary states when both cannot appear in one instance. */
  note?: string;
}
export type AnatomyRegistry = Record<string, AnatomyDefinition>;
