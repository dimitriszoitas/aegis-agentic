/** Verifies deterministic source extraction and optionally every live Storybook link. */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';
import {
  documentationId,
  documentationMetaId,
  documentationSections,
  foundationNavigation,
} from './component-doc-navigation.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
execFileSync(process.execPath, ['scripts/generate-component-docs.mjs', '--check'], {
  stdio: 'inherit',
});
const directory = 'src/stories/component-docs/generated';
const families = fs
  .readdirSync(directory)
  .filter((file) => file.endsWith('.json'))
  .map((file) => JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8')));
const labels = documentationSections.map(([, label]) => label);
const ids = new Set();
for (const family of families) {
  if (ids.has(family.id)) throw new Error(`Duplicate componentId: ${family.id}`);
  ids.add(family.id);
  const wrappers = fs
    .readdirSync(`src/stories/component-docs/pages/${family.id}`)
    .filter((file) => file.endsWith('.mdx'));
  if (wrappers.length !== 12)
    throw new Error(`${family.id} has ${wrappers.length} documentation pages instead of 12.`);
  for (const wrapper of wrappers) {
    const content = fs.readFileSync(
      `src/stories/component-docs/pages/${family.id}/${wrapper}`,
      'utf8',
    );
    const expectedTag =
      wrapper === 'overview.mdx' ? 'aegis-component-hub' : 'aegis-component-section';
    const meta = content.match(/<Meta\b([\s\S]*?)\/>/)?.[1] ?? '';
    const tags = [
      ...(meta.match(/tags=\{\[([\s\S]*?)\]\}/)?.[1] ?? '').matchAll(/['"]([^'"]+)['"]/g),
    ].map((match) => match[1]);
    const section = documentationSections.find(([key]) => `${key}.mdx` === wrapper);
    if (!section || meta.match(/\bid="([^"]+)"/)?.[1] !== documentationMetaId(family, section[1]))
      throw new Error(`${family.id}/${wrapper} must preserve its explicit documentation route ID.`);
    if (tags.length !== 1 || tags[0] !== expectedTag)
      throw new Error(`${family.id}/${wrapper} must carry only the ${expectedTag} navigation tag.`);
  }
  if (!family.props.length)
    throw new Error(`${family.id} has no public props. Check component resolution.`);
  for (const file of family.sourceFiles)
    if (!fs.existsSync(file)) throw new Error(`Missing source: ${file}`);
}
for (const page of foundationNavigation) {
  const content = fs.readFileSync(page.source, 'utf8');
  const meta = page.source.endsWith('.mdx')
    ? (content.match(/<Meta\b([\s\S]*?)\/>/)?.[1] ?? '')
    : storyMetadataSource(content, page.source);
  const title = meta.match(/\btitle(?:=|:)\s*['"]([^'"]+)['"]/)?.[1];
  const id = meta.match(/\bid(?:=|:)\s*['"]([^'"]+)['"]/)?.[1];
  if (title !== page.title || id !== (page.sourceId ?? page.id.replace(/--docs$/, '')))
    throw new Error(
      `Foundation navigation differs from ${page.source}: expected ${page.title} with stable ID ${page.id}.`,
    );
}

function storyMetadataSource(content, filename) {
  const source = ts.createSourceFile(
    filename,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let expression = source.statements.find(ts.isExportAssignment)?.expression;
  while (expression) {
    if (ts.isObjectLiteralExpression(expression)) return expression.getText(source);
    if (ts.isIdentifier(expression)) {
      const name = expression.text;
      expression = source.statements
        .filter(ts.isVariableStatement)
        .flatMap((statement) => [...statement.declarationList.declarations])
        .find((declaration) => declaration.name.getText(source) === name)?.initializer;
    } else if (
      ts.isSatisfiesExpression(expression) ||
      ts.isAsExpression(expression) ||
      ts.isParenthesizedExpression(expression)
    ) {
      expression = expression.expression;
    } else break;
  }
  return '';
}
const urlIndex = process.argv.indexOf('--storybook-url');
if (urlIndex !== -1) {
  const base = process.argv[urlIndex + 1];
  if (!base) throw new Error('Provide the local Storybook URL after --storybook-url.');
  const response = await fetch(`${base.replace(/\/$/, '')}/index.json`);
  if (!response.ok) throw new Error(`Storybook index returned ${response.status}.`);
  const index = await response.json();
  const missing = [];
  const hubs = new Set();
  for (const family of families) {
    for (const story of family.stories) if (!index.entries[story.id]) missing.push(story.id);
    for (const label of labels) {
      const id = documentationId(family, label);
      const entry = index.entries[id];
      if (!entry) missing.push(id);
      else if (label === 'Overview') {
        if (!entry.tags?.includes('aegis-component-hub'))
          throw new Error(`Canonical hub ${id} is missing its sidebar navigation tag.`);
        hubs.add(id);
      } else if (!entry.tags?.includes('aegis-component-section'))
        throw new Error(`Legacy section ${id} is missing its compatibility navigation tag.`);
    }
  }
  for (const page of foundationNavigation) {
    const entry = index.entries[page.id];
    if (!entry) missing.push(page.id);
    else if (entry.title !== page.title)
      throw new Error(`Foundation navigation label differs for ${page.id}: ${entry.title}.`);
  }
  // Icons keeps its original autogenerated Docs destination indexed, although the sidebar hides it.
  if (!index.entries['foundations-icons--docs']) missing.push('foundations-icons--docs');
  if (missing.length) throw new Error(`Broken Storybook links:\n${missing.join('\n')}`);
  const indexedHubs = Object.values(index.entries).filter((entry) =>
    entry.tags?.includes('aegis-component-hub'),
  );
  if (indexedHubs.length !== families.length || indexedHubs.some((entry) => !hubs.has(entry.id)))
    throw new Error(
      'The Storybook index must contain exactly one canonical navigation hub per family.',
    );
  console.log(
    'Every canonical hub, legacy section route and stable story link resolves in the Storybook index.',
  );
}
console.log(
  `Checked ${foundationNavigation.length} foundation destinations, ${families.length} component families and ${families.length} navigation hubs with ${families.length * 11} compatible section routes.`,
);
