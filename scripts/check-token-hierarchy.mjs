/** Validate the declared three-tier graph independently of its generator. */
import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { postcss, numericFragments } from './check-component-css-tokens.mjs';

export const configurations = [
  'fundamental.light',
  'fundamental.dark',
  'fundamental-floating.light',
  'fundamental-floating.dark',
];
const cssName = /^--[\w-]+$/;
const tiers = new Set(['primitive', 'semantic', 'group']);
const stableTypes =
  /^(?:spacing|sizing|size|font(?:family|size|weight)?|typography|lineheight|letterspacing)$/i;
const normalize = (value) => value.replace(/\s+/g, ' ').trim();

/** Comments and quoted content are not variable references. Fallbacks are dependencies too. */
export function expressionReferences(expression) {
  const clean = expression
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(['"])(?:\\.|(?!\1)[^\\])*\1/g, '');
  return [...clean.matchAll(/\bvar\(\s*(--[\w-]+)/g)].map((match) => match[1]);
}

function rawExpressionIssues(value) {
  // A referenced token may be composed with CSS arithmetic, color spaces, angles,
  // percentages and unitless coefficients. Authored colors, lengths and text
  // remain primitive values. Removing each var name also avoids digits in names.
  const clean = value.replace(/\/\*[\s\S]*?\*\//g, '').replace(/var\(\s*--[\w-]+/g, 'var(TOKEN');
  const issues = [];
  if (!expressionReferences(value).length)
    issues.push('must reference a token from the preceding tier');
  if (/#[\da-f]{3,8}\b/i.test(clean)) issues.push('contains a raw color');
  if (/(?:^|[^\w.-])[+-]?(?:\d*\.)?\d+(?:px|r?em|ch|lh|vw|vh|dvw|dvh|cqw|cqh|s|ms)\b/i.test(clean))
    issues.push('contains a raw dimension or duration');
  if (/(['"])(?:\\.|(?!\1)[^\\])*\1/.test(clean)) issues.push('contains a raw quoted value');
  for (const fragment of numericFragments(value)) {
    const functions = fragment.functions.map((entry) => entry.name);
    const arithmetic = functions.some((name) => ['calc', 'min', 'max', 'clamp'].includes(name));
    const colorGeometry = functions.some((name) => /gradient$|^color-mix$/.test(name));
    if (
      !(fragment.unit === '' && arithmetic) &&
      !(fragment.unit === '%' && (arithmetic || colorGeometry)) &&
      !(['deg', 'rad', 'grad', 'turn'].includes(fragment.unit) && colorGeometry)
    )
      issues.push(`contains raw value ${fragment.raw} outside a structural expression`);
  }
  // Literal color channels and named colors can otherwise hide beside a valid var().
  if (/\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\(\s*[\d.+-]/i.test(clean))
    issues.push('contains raw color channels');
  const allowed = new Set([
    'TOKEN',
    'in',
    'srgb',
    'srgb-linear',
    'display-p3',
    'a98-rgb',
    'prophoto-rgb',
    'rec2020',
    'xyz',
    'xyz-d50',
    'xyz-d65',
    'lab',
    'lch',
    'oklab',
    'oklch',
    'hsl',
    'hwb',
    'shorter',
    'longer',
    'increasing',
    'decreasing',
    'hue',
    'from',
    'r',
    'g',
    'b',
    'h',
    's',
    'l',
    'w',
    'a',
    'c',
    'alpha',
    'x',
    'y',
    'z',
    'to',
    'left',
    'right',
    'top',
    'bottom',
    'center',
    'circle',
    'ellipse',
    'closest-side',
    'farthest-side',
    'closest-corner',
    'farthest-corner',
    'at',
    'deg',
    'rad',
    'turn',
    'grad',
    'e',
  ]);
  for (const match of clean.matchAll(/[a-zA-Z_][\w-]*/g)) {
    const word = match[0];
    if (
      allowed.has(word) ||
      clean
        .slice(match.index + word.length)
        .trimStart()
        .startsWith('(')
    )
      continue;
    // Unitless numeric exponents are structural and CSS angle units are allowed above.
    if (
      match.index > 0 &&
      /[\d.]/.test(clean[match.index - 1]) &&
      ['deg', 'rad', 'turn', 'grad', 'e'].includes(word)
    )
      continue;
    issues.push(`contains unreferenced value ${word}`);
  }
  return [...new Set(issues)];
}

function dynamicEntries(manifest) {
  return new Map(
    (manifest.dynamicVariables ?? []).map((entry) => [
      typeof entry === 'string' ? entry : entry.name,
      typeof entry === 'string' ? {} : entry,
    ]),
  );
}
function stableToken(token) {
  return token.invariant === true || stableTypes.test(token.type?.replace(/[\s_-]/g, '') ?? '');
}

/** Category ownership follows the central sidebar map, using the most specific path. */
export function categoryForFile(categoryMap, file) {
  const matches = Object.entries(categoryMap.categories ?? {})
    .flatMap(([family, category]) =>
      (category.prefixes ?? [])
        .filter((prefix) => (prefix.endsWith('/') ? file.startsWith(prefix) : file === prefix))
        .map((prefix) => ({ family, prefix })),
    )
    .sort((a, b) => b.prefix.length - a.prefix.length);
  return matches[0]?.family;
}

function validateCategoryMap(categoryMap) {
  const errors = [];
  const prefixes = new Map();
  if (categoryMap.version !== 1)
    errors.push({ code: 'category-map-version', message: 'category map version must be 1' });
  if (!Object.keys(categoryMap.categories ?? {}).length)
    errors.push({
      code: 'category-map-empty',
      message: 'the central category map must declare categories',
    });
  for (const [family, category] of Object.entries(categoryMap.categories ?? {})) {
    if (!/^[a-z][a-z0-9-]*$/.test(family) || typeof category.title !== 'string')
      errors.push({ code: 'category-map-family', message: `invalid category ${family}` });
    if (!Array.isArray(category.prefixes)) {
      errors.push({
        code: 'category-map-prefix',
        message: `${family} requires an explicit prefix list`,
      });
      continue;
    }
    for (const prefix of category.prefixes) {
      if (
        typeof prefix !== 'string' ||
        !prefix ||
        isAbsolute(prefix) ||
        prefix.split('/').includes('..')
      )
        errors.push({
          code: 'category-map-prefix',
          message: `${family} has an invalid source prefix`,
        });
      else if (prefixes.has(prefix))
        errors.push({
          code: 'category-map-prefix',
          message: `${prefix} is assigned to both ${prefixes.get(prefix)} and ${family}`,
        });
      else prefixes.set(prefix, family);
    }
  }
  if (
    !Array.isArray(categoryMap.sharedFiles) ||
    categoryMap.sharedFiles.some(
      (file) => typeof file !== 'string' || isAbsolute(file) || file.split('/').includes('..'),
    )
  )
    errors.push({
      code: 'category-map-shared',
      message: 'sharedFiles must be exact relative source paths',
    });
  return errors;
}

export function validateTokenHierarchy(manifest, { categoryMap } = {}) {
  const errors = [];
  const add = (code, token, message, extra = {}) => errors.push({ code, token, message, ...extra });
  if (categoryMap) errors.push(...validateCategoryMap(categoryMap));
  if (manifest.version !== 1) add('manifest-version', '', 'version must be 1');
  if (
    !Array.isArray(manifest.configurations) ||
    manifest.configurations.length !== 4 ||
    new Set(manifest.configurations).size !== 4 ||
    configurations.some((key) => !manifest.configurations.includes(key))
  )
    add('configurations', '', 'exactly the four canonical configurations are required');
  const tokens = manifest.tokens ?? {};
  const graph = new Map();
  const paths = new Set();
  const counts = { primitive: 0, semantic: 0, group: 0, dependencies: 0 };
  for (const [name, token] of Object.entries(tokens)) {
    if (!cssName.test(name))
      add('token-name', name, 'token key must be a CSS custom property name');
    if (!tiers.has(token.tier)) {
      add('token-tier', name, 'unknown tier');
      continue;
    }
    counts[token.tier]++;
    if (typeof token.path !== 'string' || !token.path.trim())
      add('token-path', name, 'canonical path is required');
    else if (paths.has(`${token.tier}:${token.path}`))
      add('duplicate-path', name, `duplicate path ${token.path} within ${token.tier}`);
    else paths.add(`${token.tier}:${token.path}`);
    if (typeof token.type !== 'string' || !token.type.trim())
      add('token-type', name, 'type is required');
    if (token.tier === 'group') {
      if (typeof token.family !== 'string' || !/^[a-z][a-z0-9-]*$/.test(token.family))
        add('group-family', name, 'group tokens require a valid category family');
      else if (categoryMap && !categoryMap.categories?.[token.family])
        add('group-category', name, `unknown sidebar category ${token.family}`);
      if (token.family && !name.startsWith(`--group-${token.family}-`))
        add(
          'group-prefix',
          name,
          `group tokens owned by ${token.family} must use --group-${token.family}-`,
        );
    }
    let expressions = [];
    if (token.tier === 'semantic') {
      const maps = token.mappings ?? {};
      for (const key of configurations)
        if (typeof maps[key] !== 'string' || !maps[key].trim())
          add('missing-mapping', name, `missing mapping for ${key}`, { configuration: key });
      for (const key of Object.keys(maps))
        if (!configurations.includes(key))
          add('unknown-mapping', name, `unknown configuration ${key}`);
      if (token.value !== undefined)
        add('semantic-value', name, 'semantic values belong in four explicit mappings');
      expressions = Object.entries(maps).filter(([, value]) => typeof value === 'string');
      if (stableToken(token) && new Set(expressions.map(([, value]) => normalize(value))).size > 1)
        add(
          'invariant',
          name,
          'invariant typography, sizing or spacing differs between configurations',
        );
    } else {
      if (typeof token.value !== 'string' || !token.value.trim())
        add('missing-value', name, 'a nonempty string value is required');
      else expressions = [['value', token.value]];
      if (token.mappings !== undefined)
        add('unexpected-mappings', name, 'only semantic tokens may define configuration mappings');
    }
    const edges = new Set();
    for (const [configuration, value] of expressions) {
      const refs = expressionReferences(value);
      counts.dependencies += refs.length;
      if (token.tier !== 'primitive')
        for (const issue of rawExpressionIssues(value))
          add('raw-value', name, issue, { configuration, value });
      for (const ref of refs) {
        edges.add(ref);
        const target = tokens[ref];
        if (!target)
          add('unknown-reference', name, `unknown token ${ref}`, { configuration, reference: ref });
        else if (
          token.tier === 'primitive' ||
          target.tier !== (token.tier === 'semantic' ? 'primitive' : 'semantic')
        )
          add('tier-bypass', name, `${token.tier} must not reference ${target.tier} ${ref}`, {
            configuration,
            reference: ref,
          });
      }
    }
    graph.set(name, edges);
  }
  const visiting = new Set(),
    visited = new Set();
  function visit(name, trail) {
    if (visiting.has(name)) {
      add('cycle', name, [...trail.slice(trail.indexOf(name)), name].join(' → '));
      return;
    }
    if (visited.has(name)) return;
    visiting.add(name);
    for (const ref of graph.get(name) ?? []) if (graph.has(ref)) visit(ref, [...trail, name]);
    visiting.delete(name);
    visited.add(name);
  }
  for (const name of graph.keys()) visit(name, []);
  for (const [name, entry] of dynamicEntries(manifest)) {
    if (!cssName.test(name ?? ''))
      add('dynamic-name', name, 'runtime variable must have an explicit CSS name');
    if (tokens[name])
      add(
        'dynamic-collision',
        name,
        'a design token cannot also be exempted as a runtime variable',
      );
    if (
      entry.files &&
      (!Array.isArray(entry.files) || entry.files.some((file) => typeof file !== 'string'))
    )
      add('dynamic-files', name, 'runtime files must be an explicit path list');
  }
  return { counts, errors };
}

export function validateConsumerReferences(manifest, { file, family, property, value, line }) {
  const errors = [];
  const tokens = manifest.tokens ?? {};
  const dynamic = dynamicEntries(manifest);
  const declaration = tokens[property];
  const allowedTier = declaration?.tier === 'group' ? 'semantic' : 'group';
  const references = expressionReferences(value);
  if (!family)
    errors.push({
      code: 'consumer-owner',
      file,
      line,
      message: 'token consumers require one category owner',
    });
  if (declaration?.tier === 'group' && declaration.family !== family)
    errors.push({
      code: 'consumer-family',
      file,
      line,
      token: property,
      message: `${family ?? 'unowned consumer'} cannot define a ${declaration.family} group token`,
    });
  if (property?.startsWith('--') && declaration && declaration.tier !== 'group')
    errors.push({
      code: 'consumer-definition',
      file,
      line,
      token: property,
      message: 'consumers may not redefine primitive or semantic tokens',
    });
  for (const ref of references) {
    const token = tokens[ref];
    const runtime = dynamic.get(ref);
    if (runtime && (!runtime.files || runtime.files.includes(file))) {
      if (declaration?.tier === 'group')
        errors.push({
          code: 'group-runtime',
          file,
          line,
          token: ref,
          message: 'group definitions may only reference semantics, not runtime state',
        });
      continue;
    }
    if (!token)
      errors.push({
        code: 'consumer-unknown',
        file,
        line,
        token: ref,
        message: 'unknown or out-of-scope runtime variable',
      });
    else if (token.tier !== allowedTier)
      errors.push({
        code: 'consumer-bypass',
        file,
        line,
        token: ref,
        message: `${property ?? 'runtime consumer'} must reference ${allowedTier} tokens, received ${token.tier}`,
      });
    else if (token.tier === 'group' && token.family !== family)
      errors.push({
        code: 'consumer-family',
        file,
        line,
        token: ref,
        message: `${family ?? 'unowned consumer'} cannot borrow a ${token.family} group token`,
      });
  }
  if (declaration?.tier === 'group')
    for (const message of rawExpressionIssues(value))
      errors.push({ code: 'consumer-raw-group', file, line, token: property, message });
  return errors;
}

/** Numeric helpers retain their public API; resolve their CSS names from the source map. */
async function runtimeTokenNames(rootDir) {
  try {
    const source = ts.createSourceFile(
      'component-design-tokens.ts',
      await readFile(resolve(rootDir, 'src/lib/component-design-tokens.ts'), 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    const names = new Map();
    const visit = (node) => {
      if (
        ts.isVariableDeclaration(node) &&
        node.name.getText(source) === 'componentTokenDefinitions'
      ) {
        let initializer = node.initializer;
        while (
          initializer &&
          (ts.isAsExpression(initializer) || ts.isSatisfiesExpression(initializer))
        )
          initializer = initializer.expression;
        if (initializer && ts.isObjectLiteralExpression(initializer))
          for (const property of initializer.properties) {
            if (
              !ts.isPropertyAssignment(property) ||
              !ts.isObjectLiteralExpression(property.initializer)
            )
              continue;
            const name = property.name.getText(source).replace(/^['"]|['"]$/g, '');
            const custom = property.initializer.properties.find(
              (entry) =>
                ts.isPropertyAssignment(entry) && entry.name.getText(source) === 'cssVariable',
            );
            names.set(
              name,
              custom && ts.isStringLiteral(custom.initializer)
                ? custom.initializer.text
                : `--component-${name}`,
            );
          }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    return names;
  } catch (error) {
    if (error.code === 'ENOENT') return new Map();
    throw error;
  }
}

/** Registration cannot hide a new runtime component from category enforcement. */
export async function productionConsumerFiles(rootDir, categoryMap) {
  const files = new Set();
  async function visit(directory) {
    let entries;
    try {
      entries = await readdir(resolve(rootDir, directory), { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    for (const entry of entries) {
      const file = `${directory}/${entry.name}`;
      if (entry.isDirectory()) await visit(file);
      else if (/\.(?:css|tsx?)$/.test(file) && !/\.(?:stories|test)\./.test(file)) files.add(file);
    }
  }
  await Promise.all([visit('src/components'), visit('src/patterns')]);
  for (const file of categoryMap.sharedFiles) {
    try {
      if ((await stat(resolve(rootDir, file))).isFile()) files.add(file);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return [...files].sort();
}

export async function auditTokenConsumers(
  manifest,
  { rootDir = process.cwd(), categoryMap: suppliedCategoryMap } = {},
) {
  const errors = [],
    unsupported = [];
  let files = 0,
    expressions = 0;
  let categoryMap = suppliedCategoryMap;
  if (!categoryMap) {
    try {
      categoryMap = JSON.parse(
        await readFile(resolve(rootDir, 'tokens/component-categories.json'), 'utf8'),
      );
    } catch (error) {
      return {
        files,
        expressions,
        errors: [{ code: 'category-map-file', message: error.message }],
        unsupported,
      };
    }
  }
  errors.push(...validateCategoryMap(categoryMap));
  if (errors.length) return { files, expressions, errors, unsupported };
  const inventory = await productionConsumerFiles(rootDir, categoryMap);
  const registered = new Set((manifest.consumers ?? []).map((consumer) => consumer.file));
  for (const file of inventory)
    if (!registered.has(file))
      errors.push({
        code: 'consumer-coverage',
        file,
        message: 'production CSS/TS consumer is missing from the token manifest',
      });
  const helpers = await runtimeTokenNames(rootDir);
  const consumerFiles = new Set();
  for (const consumer of manifest.consumers ?? []) {
    const { file, family } = consumer;
    if (
      typeof file !== 'string' ||
      isAbsolute(file) ||
      relative(rootDir, resolve(rootDir, file)).startsWith('..')
    ) {
      errors.push({
        code: 'consumer-path',
        file,
        message: 'consumer path must remain inside the project',
      });
      continue;
    }
    if (consumerFiles.has(file)) {
      errors.push({
        code: 'consumer-duplicate',
        file,
        message: 'consumer file is registered more than once',
      });
      continue;
    }
    consumerFiles.add(file);
    const shared = categoryMap.sharedFiles.includes(file);
    const expectedFamily = categoryForFile(categoryMap, file);
    if (!shared && !expectedFamily) {
      errors.push({
        code: 'consumer-category',
        file,
        message: 'source path has no category in the central map',
      });
      continue;
    }
    if (!shared && family !== expectedFamily)
      errors.push({
        code: 'consumer-category',
        file,
        message: `source path belongs to ${expectedFamily}, not ${family ?? 'an unassigned family'}`,
      });
    if (!shared && (consumer.rules?.length || consumer.keyframes?.length))
      errors.push({
        code: 'consumer-rule-override',
        file,
        message: 'per-rule ownership is only allowed for centrally declared shared CSS files',
      });
    if (shared && !file.endsWith('.css')) {
      errors.push({
        code: 'consumer-shared-format',
        file,
        message: 'shared ownership requires CSS rules',
      });
      continue;
    }
    let text;
    try {
      text = await readFile(resolve(rootDir, file), 'utf8');
    } catch (error) {
      errors.push({ code: 'consumer-file', file, message: error.message });
      continue;
    }
    files++;
    const inspect = (value, property, line, owner = expectedFamily) => {
      expressions++;
      errors.push(
        ...validateConsumerReferences(manifest, { file, family: owner, property, value, line }),
      );
    };
    if (file.endsWith('.css')) {
      const css = postcss.parse(text, { from: file });
      const ruleOwners = new Map(),
        keyframeOwners = new Map();
      const selectors = new Map(),
        keyframes = new Map();
      const sourceContext = (node) => {
        const context = [];
        for (let parent = node.parent; parent; parent = parent.parent)
          if (parent.type === 'atrule')
            context.unshift({ name: normalize(parent.name), params: normalize(parent.params) });
        return context;
      };
      const identity = (key, context) => JSON.stringify([key, context]);
      const addSource = (available, key, node) => {
        const context = sourceContext(node);
        if (!available.has(key)) available.set(key, new Map());
        available.get(key).set(JSON.stringify(context), context);
      };
      css.walkRules((rule) => addSource(selectors, normalize(rule.selector), rule));
      css.walkAtRules((rule) => {
        if (/^(?:-\w+-)?keyframes$/.test(rule.name))
          addSource(keyframes, normalize(rule.params), rule);
      });
      const register = (entries, field, owners, available) => {
        if (entries !== undefined && !Array.isArray(entries)) {
          errors.push({
            code: 'consumer-rule-owner',
            file,
            message: `${field} ownership must be an explicit list`,
          });
          return;
        }
        for (const entry of entries ?? []) {
          const key = typeof entry?.[field] === 'string' ? normalize(entry[field]) : '';
          if (!key || !categoryMap.categories[entry.family]) {
            errors.push({
              code: 'consumer-rule-owner',
              file,
              message: `invalid ${field} category ownership`,
            });
            continue;
          }
          let context;
          if (entry.context !== undefined) {
            if (
              !Array.isArray(entry.context) ||
              entry.context.some(
                (ancestor) =>
                  !ancestor ||
                  typeof ancestor.name !== 'string' ||
                  !normalize(ancestor.name) ||
                  typeof ancestor.params !== 'string',
              )
            ) {
              errors.push({
                code: 'consumer-rule-context',
                file,
                message: `${field} ${key} context must be an ordered list of at-rule names and parameters`,
              });
              continue;
            }
            context = entry.context.map(({ name, params }) => ({
              name: normalize(name),
              params: normalize(params),
            }));
          } else {
            const contexts = available.get(key);
            if (contexts?.size > 1) {
              errors.push({
                code: 'consumer-rule-ambiguous',
                file,
                message: `${field} ${key} exists in ${contexts.size} at-rule contexts; supply its full enclosing context`,
              });
              continue;
            }
            context = contexts?.values().next().value ?? [];
          }
          const ownerKey = identity(key, context);
          const description = `${field} ${key} in ${JSON.stringify(context)}`;
          if (owners.has(ownerKey))
            errors.push({
              code: 'consumer-rule-duplicate',
              file,
              message: `${description} has duplicate ownership entries`,
            });
          else owners.set(ownerKey, entry.family);
          if (!available.get(key)?.has(JSON.stringify(context)))
            errors.push({
              code: 'consumer-rule-stale',
              file,
              message: `${description} does not exist in source`,
            });
        }
      };
      if (shared) {
        register(consumer.rules, 'selector', ruleOwners, selectors);
        register(consumer.keyframes, 'name', keyframeOwners, keyframes);
      }
      const reported = new Set();
      css.walkDecls((declaration) => {
        if (!shared) {
          inspect(declaration.value, declaration.prop, declaration.source.start.line);
          return;
        }
        const hasToken = declaration.value.includes('var(') || manifest.tokens?.[declaration.prop];
        if (!hasToken) return;
        let current = declaration.parent,
          selector,
          keyframe;
        while (current && current.type !== 'root') {
          if (current.type === 'rule' && selector === undefined) selector = current;
          if (current.type === 'atrule' && /^(?:-\w+-)?keyframes$/.test(current.name))
            keyframe = current;
          current = current.parent;
        }
        const node = keyframe ?? selector;
        const key = keyframe
          ? normalize(keyframe.params)
          : selector
            ? normalize(selector.selector)
            : '(declaration outside a rule)';
        const context = node ? sourceContext(node) : [];
        const ownerKey = identity(key, context);
        const owner = keyframe ? keyframeOwners.get(ownerKey) : ruleOwners.get(ownerKey);
        if (!owner) {
          if (!reported.has(ownerKey)) {
            errors.push({
              code: 'consumer-rule-unowned',
              file,
              line: declaration.source.start.line,
              message: `${keyframe ? '@keyframes ' : ''}${key} in ${JSON.stringify(context)} requires exact category ownership metadata`,
            });
            reported.add(ownerKey);
          }
          return;
        }
        inspect(declaration.value, declaration.prop, declaration.source.start.line, owner);
      });
    } else if (/\.tsx?$/.test(file)) {
      const source = ts.createSourceFile(
        file,
        text,
        ts.ScriptTarget.Latest,
        true,
        file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
      const inspectNode = (node) => {
        const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
        if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
          if (node.text.includes('var('))
            inspect(
              node.text,
              ts.isPropertyAssignment(node.parent)
                ? node.parent.name.getText(source).replace(/^['"]|['"]$/g, '')
                : undefined,
              line,
            );
        } else if (ts.isTemplateExpression(node) && node.getText(source).includes('var(')) {
          let value = node.getText(source);
          for (const runtime of manifest.dynamicVariables ?? []) {
            if (
              typeof runtime !== 'string' &&
              runtime.sourceTemplate &&
              runtime.reason &&
              runtime.files?.includes(file)
            )
              value = value.replaceAll(`var(${runtime.sourceTemplate}`, `var(${runtime.name}`);
          }
          inspect(value, undefined, line);
          if (/var\(\s*--[^)]*\$\{/.test(value))
            unsupported.push({
              file,
              line,
              message: 'dynamic token name requires explicit generator evidence',
            });
        }
        if (
          ts.isCallExpression(node) &&
          ts.isIdentifier(node.expression) &&
          ['componentToken', 'readComponentTokenNumber', 'useComponentTokenNumbers'].includes(
            node.expression.text,
          )
        ) {
          const argument = node.arguments[0];
          const args =
            argument && ts.isArrayLiteralExpression(argument)
              ? argument.elements
              : argument
                ? [argument]
                : [];
          for (const arg of args)
            if (ts.isStringLiteral(arg))
              inspect(
                `var(${helpers.get(arg.text) ?? `--component-${arg.text}`})`,
                undefined,
                line,
              );
            else
              unsupported.push({
                file,
                line,
                message:
                  'nonliteral numeric token helper argument requires explicit generator evidence',
              });
        }
        if (
          ts.isCallExpression(node) &&
          ts.isPropertyAccessExpression(node.expression) &&
          node.expression.name.text === 'getPropertyValue' &&
          node.arguments[0] &&
          ts.isStringLiteral(node.arguments[0]) &&
          node.arguments[0].text.startsWith('--')
        )
          inspect(`var(${node.arguments[0].text})`, undefined, line);
        if (
          ts.isPropertyAccessExpression(node) &&
          ts.isIdentifier(node.expression) &&
          node.expression.text === 'componentTokenDefaults'
        )
          inspect(
            `var(${helpers.get(node.name.text) ?? `--component-${node.name.text}`})`,
            undefined,
            line,
          );
        if (
          ts.isElementAccessExpression(node) &&
          ts.isIdentifier(node.expression) &&
          node.expression.text === 'componentTokenDefaults' &&
          node.argumentExpression &&
          ts.isStringLiteral(node.argumentExpression)
        )
          inspect(
            `var(${helpers.get(node.argumentExpression.text) ?? `--component-${node.argumentExpression.text}`})`,
            undefined,
            line,
          );
        ts.forEachChild(node, inspectNode);
      };
      inspectNode(source);
    } else
      unsupported.push({ file, message: 'consumer format is not audited; expected CSS/TS/TSX' });
  }
  return { files, inventoryFiles: inventory.length, expressions, errors, unsupported };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const index = process.argv.indexOf('--manifest');
  const file = index < 0 ? 'tokens/design-tokens.json' : process.argv[index + 1];
  try {
    const manifest = JSON.parse(await readFile(file, 'utf8'));
    const categoryIndex = process.argv.indexOf('--categories');
    const categoryFile =
      categoryIndex < 0 ? 'tokens/component-categories.json' : process.argv[categoryIndex + 1];
    const categoryMap = JSON.parse(await readFile(categoryFile, 'utf8'));
    const graph = validateTokenHierarchy(manifest, { categoryMap });
    const consumers = await auditTokenConsumers(manifest, { categoryMap });
    const report = { manifest: file, graph, consumers };
    if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2));
    else {
      for (const issue of [...graph.errors, ...consumers.errors, ...consumers.unsupported])
        console.error(
          `${issue.file ?? issue.token ?? file}${issue.line ? `:${issue.line}` : ''} [${issue.code ?? 'unsupported'}] ${issue.message}`,
        );
      console.log(
        `Token hierarchy: ${Object.values(graph.counts)
          .slice(0, 3)
          .reduce(
            (sum, value) => sum + value,
            0,
          )} tokens, ${graph.counts.dependencies} references, ${consumers.files} consumer files; ${graph.errors.length + consumers.errors.length} violations, ${consumers.unsupported.length} unresolved source expressions.`,
      );
    }
    if (graph.errors.length || consumers.errors.length || consumers.unsupported.length)
      process.exitCode = 1;
  } catch (error) {
    console.error(`Token hierarchy could not run: ${error.message}`);
    process.exitCode = 1;
  }
}
