import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
import prettier from 'prettier';

const manifest = JSON.parse(
  await readFile(new URL('../tokens/design-tokens.json', import.meta.url), 'utf8'),
);
const entries = Object.entries(manifest.tokens);
const primitives = entries.filter(([, token]) => token.tier === 'primitive');
const semantics = entries.filter(([, token]) => token.tier === 'semantic');
const groups = entries.filter(([, token]) => token.tier === 'group');

// light-dark() resolves in the consuming element's color scheme. Merge color operands,
// rather than copying class ancestry rules that break nested light/dark previews.
export function mergeModes(light, dark, tokens) {
  if (light === dark) return light;
  const expression = /var\((--[\w-]+)\)/g;
  const left = [...light.matchAll(expression)];
  const right = [...dark.matchAll(expression)];
  if (
    left.length !== right.length ||
    light.replace(expression, 'TOKEN') !== dark.replace(expression, 'TOKEN')
  )
    throw new Error(`Mode expressions have incompatible shapes: ${light} / ${dark}`);
  let index = 0;
  return light.replace(expression, (value, name) => {
    const other = right[index++][1];
    if (name === other) return value;
    if (tokens[name]?.type !== 'color' || tokens[other]?.type !== 'color')
      throw new Error(`MODE_VALUE:${name} / ${other}`);
    return `light-dark(var(${name}), var(${other}))`;
  });
}

const modeValues = new Map();
function combined(name, token, theme) {
  try {
    return mergeModes(
      token.mappings[`${theme}.light`],
      token.mappings[`${theme}.dark`],
      manifest.tokens,
    );
  } catch (error) {
    if (!error.message.startsWith('MODE_VALUE:')) throw error;
    if (
      token.mappings['fundamental.light'] !== token.mappings['fundamental-floating.light'] ||
      token.mappings['fundamental.dark'] !== token.mappings['fundamental-floating.dark']
    )
      throw error;
    modeValues.set(name, token);
    return token.mappings[`${theme}.light`];
  }
}
let css =
  '/* Generated from tokens/design-tokens.json. Edit the manifest, then run tokens:generate. */\n';
css +=
  ':root {\n' +
  primitives.map(([name, token]) => `  ${name}: ${token.value};`).join('\n') +
  '\n}\n';
for (const theme of ['fundamental', 'fundamental-floating']) {
  const selector =
    theme === 'fundamental'
      ? ":root, [data-layout-theme='fundamental'], [data-layout-theme='fundamental'] :is(.dark, .aegis-theme-light)"
      : "[data-layout-theme='fundamental-floating'], [data-layout-theme='fundamental-floating'] :is(.dark, .aegis-theme-light)";
  css += `${selector} {\n`;
  css += semantics.map(([name, token]) => `  ${name}: ${combined(name, token, theme)};`).join('\n');
  css += '\n}\n';
}
for (const mode of ['light', 'dark']) {
  css +=
    `${mode === 'dark' ? '.dark' : ':root, .aegis-theme-light'} {\n` +
    [...modeValues]
      .map(([name, token]) => `  ${name}: ${token.mappings[`fundamental.${mode}`]};`)
      .join('\n') +
    '\n}\n';
}
css += ':root, [data-layout-theme], .dark, .aegis-theme-light {\n';
css +=
  groups
    .filter(([, token]) => token.scope !== 'local')
    .map(([name, token]) => `  ${name}: ${token.value};`)
    .join('\n') + '\n}\n';
css +=
  ':root, [data-layout-theme], .dark, .aegis-theme-light {\n' +
  Object.entries(manifest.compatibility ?? {})
    .filter(([name]) => !manifest.tokens[name])
    .map(([name, target]) => `  ${name}: var(${target});`)
    .join('\n') +
  '\n}\n';
css +=
  '@media (forced-colors: active) {\n  :root, [data-layout-theme], .dark, .aegis-theme-light {\n    --semantic-ring-focus: var(--primitive-color-system-focus);\n  }\n}\n';
const target = new URL('../src/styles/design-tokens.css', import.meta.url);
if (process.argv.includes('--check')) {
  if ((await readFile(target, 'utf8')) !== css)
    throw new Error('Token CSS is stale. Run npm run tokens:generate.');
} else await writeFile(target, css);
console.log(
  `Token hierarchy: ${primitives.length} primitives, ${semantics.length} semantics, ${groups.length} group tokens.`,
);

// Keep the numeric bridge's public names and SSR defaults; CSS always follows group aliases.
const runtimeFile = new URL('../src/lib/component-design-tokens.ts', import.meta.url);
const runtimeSource = ts.createSourceFile(
  runtimeFile.pathname,
  await readFile(runtimeFile, 'utf8'),
  ts.ScriptTarget.Latest,
  true,
);
let definitions;
function findDefinitions(node) {
  if (
    ts.isVariableDeclaration(node) &&
    node.name.getText(runtimeSource) === 'componentTokenDefinitions'
  )
    definitions = node.initializer.expression;
  ts.forEachChild(node, findDefinitions);
}
findDefinitions(runtimeSource);
const runtimeValues = {};
const runtimeDeclarations = [];
for (const property of definitions.properties) {
  const name = property.name.text;
  const members = Object.fromEntries(
    property.initializer.properties.map((member) => [
      member.name.getText(runtimeSource),
      member.initializer.getText(runtimeSource),
    ]),
  );
  const variable = members.cssVariable ? members.cssVariable.slice(1, -1) : `--component-${name}`;
  const token = manifest.tokens[variable];
  if (token?.tier !== 'group') throw new Error(`Runtime token must be group-owned: ${variable}`);
  runtimeValues[name] = token.value;
  runtimeDeclarations.push(`  ${variable}: ${token.value};`);
}
const bridge = await prettier.format(
  `/* Generated from tokens/design-tokens.json. Runtime CSS aliases preserve numeric SSR defaults. */
import type { ComponentTokenName } from './component-design-tokens';
export const componentTokenGroupValues = ${JSON.stringify(runtimeValues, null, 2)} as const satisfies Record<ComponentTokenName, string>;
`,
  { ...(await prettier.resolveConfig(runtimeFile.pathname)), parser: 'typescript' },
);
const runtimeCss = `/* Generated from tokens/design-tokens.json via componentTokenGroupValues. */\n:root {\n${runtimeDeclarations.join('\n')}\n}\n`;
for (const [file, content] of [
  ['../src/lib/component-token-group-values.ts', bridge],
  ['../src/styles/component-runtime-tokens.css', runtimeCss],
]) {
  const url = new URL(file, import.meta.url);
  if (process.argv.includes('--check')) {
    if ((await readFile(url, 'utf8')) !== content)
      throw new Error(`Stale generated token file: ${file}`);
  } else await writeFile(url, content);
}
