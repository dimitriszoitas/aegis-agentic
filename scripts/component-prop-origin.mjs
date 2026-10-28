import path from 'node:path';

/** Preserve actual inheritance while distinguishing component APIs from DOM/React plumbing. */
export function componentPropOrigin(declarationFile, componentFile, root) {
  const source = path.relative(root, declarationFile).split(path.sep).join('/');
  const nativeDeclaration =
    /(?:^|\/)node_modules\/@types\/(?:react|react-dom)(?:\/|$)/.test(source) ||
    /(?:^|\/)node_modules\/typescript\/lib\/lib\.[^/]+\.d\.ts$/.test(source);
  const localDeclaration = !source.startsWith('../') && !source.includes('node_modules/');
  return {
    inherited: declarationFile !== componentFile,
    declaration: {
      source,
      kind: nativeDeclaration ? 'platform' : localDeclaration ? 'design-system' : 'dependency',
    },
  };
}

/** Older metadata without provenance remains conservative about inherited props. */
export const isComponentProp = (prop) =>
  !prop.inherited ||
  prop.declaration?.kind === 'design-system' ||
  prop.declaration?.kind === 'dependency';
