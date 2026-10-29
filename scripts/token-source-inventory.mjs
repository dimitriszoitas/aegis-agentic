/** Runtime presentation inventory shared by every token-consumer audit.
 * Agentic compiler/registry/maintenance modules are data and tooling, not presentation
 * consumers. New UI belongs in components/ or must be listed explicitly here.
 * This inventory discovers files independently of manifest registration, so omitting a
 * consumer from the manifest cannot hide it from category ownership enforcement.
 */
export const productionConsumerDirectories = [
  'src/components',
  'src/patterns',
  'src/agentic/components',
  'src/product',
];
export const productionConsumerEntries = [
  'src/agentic/portability-panel.tsx',
  'src/agentic/recipe-panel.tsx',
  'src/agentic/workbench.tsx',
  'src/agentic/workbench.css',
  'src/agentic/infrastructure-panel.tsx',
  'src/agentic/infrastructure-panel.css',
];
