import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import ts from 'typescript';

const manifest = JSON.parse(fs.readFileSync('package.json', 'utf8'));
for (const name of Object.keys(manifest.dependencies))
  assert(!/radix|cmdk|shadcn/.test(name), `Unexpected production interaction dependency: ${name}`);
assert(manifest.dependencies['@base-ui/react'], 'Base UI must be a production dependency.');

function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? files(file) : [file];
  });
}
const productionFiles = ['src/components', 'src/patterns', 'src/lib', 'src/package']
  .flatMap(files)
  .filter((file) => /\.tsx?$/.test(file) && !/\.(stories|test)\./.test(file));
let checkedImports = 0;
for (const file of productionFiles) {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const visit = (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const specifier = node.moduleSpecifier.text;
      checkedImports++;
      assert(
        !/^(radix-ui|@radix-ui\/|cmdk(?:\/|$)|shadcn(?:\/|$))/.test(specifier),
        `Legacy primitive import in ${file}: ${specifier}`,
      );
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}
const primitiveSource = ts.createSourceFile(
  'primitives.ts',
  fs.readFileSync('src/package/primitives.ts', 'utf8'),
  ts.ScriptTarget.Latest,
  true,
);
assert(primitiveSource.statements.length > 0, 'Headless entry must export primitives.');
for (const statement of primitiveSource.statements) {
  assert(
    ts.isExportDeclaration(statement) &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier),
    'Headless entry must contain only Base UI exports, with no styles or application logic.',
  );
  assert(
    /^@base-ui\/react(?:\/|$)/.test(statement.moduleSpecifier.text),
    'Headless entry must depend only on Base UI.',
  );
}
console.log(
  `Headless boundary passed for ${productionFiles.length} files and ${checkedImports} imports. Unrelated local review prototypes are outside the production boundary.`,
);
