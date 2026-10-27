/** Audit fixed presentation values in runtime components, and generated CSS consistency. */
import ts from 'typescript';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? files(new URL(`${entry.name}/`, directory))
          : new URL(entry.name, directory),
      ),
    )
  ).flat();
}
const visual = new Set([
  'size',
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'defaultWidth',
  'defaultHeight',
  'defaultSize',
  'minSize',
  'maxSize',
  'workspaceMinHeight',
  'contentMinSize',
  'strokeWidth',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
  'opacity',
  'fillOpacity',
  'stopOpacity',
  'gap',
  'padding',
  'paddingInline',
  'paddingBlock',
  'paddingTop',
  'paddingBottom',
  'paddingLeft',
  'paddingRight',
  'paddingInlineStart',
  'paddingInlineEnd',
  'paddingBlockStart',
  'paddingBlockEnd',
  'margin',
  'marginInline',
  'marginBlock',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginInlineStart',
  'marginInlineEnd',
  'marginBlockStart',
  'marginBlockEnd',
  'border',
  'borderTop',
  'borderBottom',
  'borderLeft',
  'borderRight',
  'outline',
  'boxShadow',
  'borderRadius',
  'flexBasis',
  'sideOffset',
  'alignOffset',
  'collisionPadding',
  'tickMargin',
  'minTickGap',
  'maxBarSize',
  'travellerWidth',
  'paddingAngle',
  'innerRadius',
  'outerRadius',
  'markerWidth',
  'markerHeight',
]);
const findings = [];
let checked = 0;
const runtimeFiles = [
  ...(await files(new URL('src/components/', root))),
  ...(await files(new URL('src/patterns/', root))),
];
for (const url of runtimeFiles) {
  if (!/\.tsx?$/.test(url.pathname) || /\.(stories|test)\./.test(url.pathname)) continue;
  checked++;
  const source = ts.createSourceFile(
    url.pathname,
    await readFile(url, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    url.pathname.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  function inspect(node) {
    let name, value;
    if (ts.isJsxAttribute(node)) {
      name = node.name.getText(source);
      value =
        node.initializer && ts.isJsxExpression(node.initializer)
          ? node.initializer.expression
          : node.initializer;
    } else if (ts.isPropertyAssignment(node)) {
      name = node.name.getText(source).replaceAll(/['"]/g, '');
      value = node.initializer;
    } else if (ts.isBindingElement(node)) {
      name = (node.propertyName ?? node.name).getText(source);
      value = node.initializer;
    }
    if (visual.has(name) && value) {
      // Zero removes a dimension/decoration. Percent-full is structural sizing, not a preset.
      const text = value.getText(source);
      const literal = ts.isNumericLiteral(value) || ts.isStringLiteral(value);
      const fixed = literal && /^['"]?-?(?:\d*\.)?\d+(?:px|rem|em|%)?['"]?$/.test(text);
      const structural = /^['"]?(?:0(?:px)?|100%)['"]?$/.test(text);
      // CodeMirror's unchanged-code margin/minSize are counts of source lines, not pixels.
      const lineCount =
        url.pathname.endsWith('/diff-view.tsx') &&
        value.parent.parent.getText(source).includes('margin: 3, minSize: 6');
      const embeddedLength =
        (ts.isStringLiteral(value) ||
          ts.isNoSubstitutionTemplateLiteral(value) ||
          ts.isTemplateExpression(value)) &&
        /(?:^|[^\w.-])[1-9]\d*(?:\.\d+)?(?:px|rem|em)\b/.test(text);
      if (((fixed && !structural) || embeddedLength) && !lineCount) {
        const position = source.getLineAndCharacterOfPosition(value.getStart(source));
        findings.push(
          `${fileURLToPath(url).slice(fileURLToPath(root).length)}:${position.line + 1} ${name}=${text}`,
        );
      }
    }
    ts.forEachChild(node, inspect);
  }
  inspect(source);
}

// Read only the numeric map with the TypeScript parser, avoiding a runtime TS-loader requirement.
const definitionFile = new URL('src/lib/component-design-tokens.ts', root);
const definitionSource = ts.createSourceFile(
  definitionFile.pathname,
  await readFile(definitionFile, 'utf8'),
  ts.ScriptTarget.Latest,
  true,
);
let definitions;
function findDefinition(node) {
  if (
    ts.isVariableDeclaration(node) &&
    node.name.getText(definitionSource) === 'componentTokenDefinitions'
  ) {
    definitions = node.initializer.expression;
  }
  ts.forEachChild(node, findDefinition);
}
findDefinition(definitionSource);
const manifest = JSON.parse(await readFile(new URL('tokens/design-tokens.json', root), 'utf8'));
const declarations = definitions.properties.map((property) => {
  const name = property.name.text;
  const members = Object.fromEntries(
    property.initializer.properties.map((member) => [
      member.name.getText(definitionSource),
      member.initializer.getText(definitionSource),
    ]),
  );
  const variable = members.cssVariable ? members.cssVariable.slice(1, -1) : `--component-${name}`;
  const token = manifest.tokens[variable];
  if (token?.tier !== 'group')
    findings.push(`${variable} must be a canonical runtime group token.`);
  return `  ${variable}: ${token?.value};`;
});
const expected = `/* Generated from tokens/design-tokens.json via componentTokenGroupValues. */\n:root {\n${declarations.join('\n')}\n}\n`;
if (
  (await readFile(new URL('src/styles/component-runtime-tokens.css', root), 'utf8')) !== expected
) {
  findings.push(
    'component-runtime-tokens.css differs from canonical manifest group values; regenerate it.',
  );
}
if (findings.length) {
  console.error(findings.join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    `Checked ${checked} runtime component/pattern files; no fixed values found in audited visual attributes, properties, defaults, or CSS-in-JS lengths. Dynamic/data math and intrinsic SVG path/viewBox coordinates are excluded. Generated CSS matches ${declarations.length} tokens.`,
  );
}
