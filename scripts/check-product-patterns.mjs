import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const policy = JSON.parse(await readFile('src/product/pattern-policy.json', 'utf8'));
assert.equal(policy.schemaVersion, 1, 'Unsupported product pattern policy');
const parse = async (file) =>
  ts.createSourceFile(
    file,
    await readFile(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
function elements(source, name) {
  const found = [];
  function walk(node) {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      node.tagName.getText(source) === name
    )
      found.push(node);
    ts.forEachChild(node, walk);
  }
  walk(source);
  return found;
}
function requirePattern(source, pattern, file) {
  const declaration = source.statements.find(
    (node) => ts.isImportDeclaration(node) && node.moduleSpecifier.text === pattern.module,
  );
  const binding = declaration?.importClause?.namedBindings;
  const specifier =
    binding && ts.isNamedImports(binding)
      ? binding.elements.find((e) => (e.propertyName?.text ?? e.name.text) === pattern.export)
      : null;
  assert(
    specifier,
    `${file} must import the agreed ${pattern.export} pattern from ${pattern.module}`,
  );
  const instances = elements(source, specifier.name.text);
  assert.equal(instances.length, 1, `${file} must render one shared ${pattern.export}`);
  return instances[0];
}
const app = await parse('src/product/forma-app.tsx');
const declaration = app.statements
  .flatMap((node) => (ts.isVariableStatement(node) ? [...node.declarationList.declarations] : []))
  .find((d) => d.name.getText(app) === 'pages');
const array = ts.isAsExpression(declaration.initializer)
  ? declaration.initializer.expression
  : declaration.initializer;
const routes = array.elements.map(
  (e) => e.properties.find((p) => p.name.getText(app) === 'id').initializer.text,
);
assert.deepEqual(
  routes,
  policy.pages.map((p) => p.id),
  'Every product route must be covered by its pattern policy',
);
for (const page of policy.pages) {
  const source = await parse(page.source);
  requirePattern(source, policy.patterns.pageHeader, page.source);
  assert.equal(
    elements(source, 'h1').length,
    0,
    `${page.source} must let PageHeader own its page title`,
  );
  if (page.collection) {
    requirePattern(source, policy.patterns.collectionFilters, page.source);
    const grid =
      page.collection === 'grid' && requirePattern(source, policy.patterns.dataGrid, page.source);
    if (grid) {
      assert(
        !grid.attributes.properties.some((p) => p.name?.text === 'renderToolbar'),
        `${page.source} must preserve the shared grid display controls`,
      );
      assert(
        grid.attributes.properties.some((p) => p.name?.text === 'density'),
        `${page.source} must consume the workspace density`,
      );
    }
  }
}
console.log(
  `Forma pattern policy r${policy.revision}: ${policy.pages.length} pages use the shared header and collection patterns.`,
);
