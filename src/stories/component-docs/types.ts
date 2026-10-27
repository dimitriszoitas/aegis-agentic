export interface ComponentMetadata {
  id: string;
  name: string;
  title: string;
  category: string;
  kind: 'component' | 'pattern' | 'foundation';
  aliases: string[];
  /** Sidebar category that owns this implementation’s design bindings. */
  tokenGroup?: string;
  description: string;
  purpose?: string;
  usage?: string;
  anatomy: string[];
  sourceFiles: string[];
  exportNames?: string[];
  imports: { name: string; path: string }[];
  stories: {
    id: string;
    name: string;
    exportName: string;
    sourceFile?: string;
    /** True for automatic component rendering or a custom render that reads its args. */
    supportsArgs?: boolean;
  }[];
  props: {
    component: string;
    name: string;
    type: string;
    required: boolean;
    defaultValue?: string;
    description?: string;
    inherited?: boolean;
  }[];
  css: {
    file: string;
    selector: string;
    conditions: string[];
    property: string;
    value: string;
    tokens: string[];
    ownership?: {
      kind: 'owned' | 'nested' | 'inherited' | 'definition';
      component: string;
      category?: string;
      group?: string;
    };
  }[];
  variants: { name: string; values: string[]; default?: string }[];
  cssClasses?: string[];
  relatedComponents?: string[];
  accessibility?: {
    roles: string[];
    ariaAttributes: string[];
    nativeElements: string[];
    keyboardKeys: string[];
    dependencies: string[];
  };
}
export type DocumentationSection =
  | 'tokens'
  | 'overview'
  | 'anatomy'
  | 'types'
  | 'variants'
  | 'intent'
  | 'states'
  | 'sizes'
  | 'usage'
  | 'accessibility'
  | 'api'
  | 'context';
export interface ComputedBinding {
  id: string;
  element: string;
  selector: string;
  property: string;
  declaration: string;
  tokens: string[];
  values: Record<string, string>;
  tokenValues: Record<string, Record<string, string>>;
}
