/** Rebuild source-derived documentation. No component behavior or styles are executed. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { supportsStoryArgs } from './component-story-args.mjs';
import { createSharedRuleLookup, sharedRuleOwners } from './component-doc-ownership.mjs';
import { storyNameFromExport, toId } from 'storybook/internal/csf';
import {
  documentationMetaId,
  documentationRouteTitle,
  documentationSections,
} from './component-doc-navigation.mjs';

const root = process.cwd();
const inspectFamily = process.argv
  .find((argument) => argument.startsWith('--inspect-family='))
  ?.split('=')[1];
const require = createRequire(import.meta.url);
// Vite already supplies the parser used for this project's CSS build.
const postcss = createRequire(require.resolve('vite/package.json'))('postcss');
const output = path.join(root, 'src/stories/component-docs');
const generated = path.join(output, 'generated');
const pages = path.join(output, 'pages');
const relative = (file) => path.relative(root, file).split(path.sep).join('/');
const categoryManifest = JSON.parse(
  fs.readFileSync(path.join(root, 'tokens/component-categories.json'), 'utf8'),
);
const designTokenManifest = JSON.parse(
  fs.readFileSync(path.join(root, 'tokens/design-tokens.json'), 'utf8'),
);
const sharedRuleFor = createSharedRuleLookup(designTokenManifest.consumers);
const sharedFiles = new Set(categoryManifest.sharedFiles);
const categoryPrefixes = Object.entries(categoryManifest.categories)
  .flatMap(([group, category]) =>
    category.prefixes.map((prefix) => ({ prefix, group, category: category.title })),
  )
  .sort((a, b) => b.prefix.length - a.prefix.length);
function categoryFor(file) {
  const name = path.isAbsolute(file) ? relative(file) : file;
  return categoryPrefixes.find((entry) => name.startsWith(entry.prefix));
}
function componentDirectory(file) {
  return file.match(/^(.*\/src\/(?:components|patterns)\/[^/]+)\//)?.[1];
}

const unique = (values) => [...new Set(values)].sort();
function walkFiles(directory, predicate) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(file, predicate) : predicate(file) ? [file] : [];
  });
}
const configPath = ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.json');
const config = ts.readConfigFile(configPath, ts.sys.readFile);
const parsedConfig = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
const checker = program.getTypeChecker();
const formatFlags =
  ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope;
function unwrap(node) {
  while (
    node &&
    (ts.isAsExpression(node) ||
      ts.isSatisfiesExpression(node) ||
      ts.isParenthesizedExpression(node) ||
      ts.isExpressionWithTypeArguments(node))
  )
    node = node.expression;
  return node;
}
function symbolOf(node) {
  node = unwrap(node);
  let symbol = node && checker.getSymbolAtLocation(node);
  if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
  return symbol;
}
function resolveValue(node) {
  node = unwrap(node);
  if (node && ts.isIdentifier(node)) {
    const declaration = symbolOf(node)?.valueDeclaration;
    if (declaration && ts.isVariableDeclaration(declaration) && declaration.initializer)
      return resolveValue(declaration.initializer);
  }
  return node;
}
function property(object, name) {
  object = resolveValue(object);
  if (!object || !ts.isObjectLiteralExpression(object)) return undefined;
  const prop = object.properties.find(
    (entry) => entry.name && entry.name.getText().replace(/^['"]|['"]$/g, '') === name,
  );
  return (
    prop &&
    (ts.isPropertyAssignment(prop)
      ? prop.initializer
      : ts.isShorthandPropertyAssignment(prop)
        ? prop.name
        : undefined)
  );
}
function literal(node) {
  node = resolveValue(node);
  return node && (ts.isStringLiteralLike(node) || ts.isNumericLiteral(node))
    ? node.text
    : undefined;
}
function exportModifier(node) {
  return node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
}
function componentTokenDefinition(name) {
  if (!name) return undefined;
  const source = program.getSourceFile(path.join(root, 'src/lib/component-design-tokens.ts'));
  const declaration = source?.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => [...statement.declarationList.declarations])
    .find((node) => node.name.getText() === 'componentTokenDefinitions');
  return property(declaration?.initializer, name);
}
function componentTokenCssName(name) {
  return literal(property(componentTokenDefinition(name), 'cssVariable')) ?? `--component-${name}`;
}
function componentTokenDefault(name) {
  const token = componentTokenDefinition(name);
  const value = literal(property(token, 'value'));
  const unit = literal(property(token, 'unit')) ?? '';
  return value === undefined ? undefined : `${value}${unit} (var(${componentTokenCssName(name)}))`;
}
function staticDefault(node) {
  if (!node) return undefined;
  node = unwrap(node);
  if (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    ['componentToken', 'readComponentTokenNumber'].includes(node.expression.text)
  )
    return componentTokenDefault(literal(node.arguments[0]));
  if (ts.isElementAccessExpression(node) && ts.isIdentifier(node.expression)) {
    const owner = symbolOf(node.expression)?.valueDeclaration;
    const initializer =
      owner && ts.isVariableDeclaration(owner) ? unwrap(owner.initializer) : undefined;
    if (
      node.expression.text === 'componentTokenDefaults' ||
      (initializer &&
        ts.isCallExpression(initializer) &&
        initializer.expression.getText() === 'useComponentTokenNumbers')
    )
      return componentTokenDefault(literal(node.argumentExpression));
  }
  if (ts.isStringLiteralLike(node)) return JSON.stringify(node.text);
  if (
    ts.isNumericLiteral(node) ||
    [ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword, ts.SyntaxKind.NullKeyword].includes(
      node.kind,
    )
  )
    return node.getText();
  if (ts.isPrefixUnaryExpression(node) && ts.isNumericLiteral(node.operand)) return node.getText();
  if (
    ts.isArrayLiteralExpression(node) &&
    node.elements.every((item) => staticDefault(item) !== undefined)
  )
    return node.getText();
  if (
    ts.isObjectLiteralExpression(node) &&
    node.properties.every(
      (item) => ts.isPropertyAssignment(item) && staticDefault(item.initializer) !== undefined,
    )
  )
    return node.getText();
  // Dynamic expressions and imported values are deliberately not advertised as defaults.
  return undefined;
}
function defaultsIn(declaration) {
  const defaults = new Map();
  function visit(node) {
    if (
      ts.isFunctionLike(node) &&
      node.parameters?.[0] &&
      ts.isObjectBindingPattern(node.parameters[0].name)
    ) {
      for (const binding of node.parameters[0].name.elements) {
        const value = staticDefault(binding.initializer);
        if (value !== undefined)
          defaults.set(binding.propertyName?.getText() ?? binding.name.getText(), value);
      }
      const aliases = new Map(
        node.parameters[0].name.elements
          .filter((binding) => ts.isIdentifier(binding.name))
          .map((binding) => [
            binding.name.text,
            binding.propertyName?.getText() ?? binding.name.text,
          ]),
      );
      function tokenFallback(child) {
        if (
          ts.isBinaryExpression(child) &&
          child.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken &&
          ts.isIdentifier(child.left) &&
          aliases.has(child.left.text)
        ) {
          const value = staticDefault(child.right);
          if (value !== undefined) defaults.set(aliases.get(child.left.text), value);
        }
        ts.forEachChild(child, tokenFallback);
      }
      if (node.body) tokenFallback(node.body);
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(declaration);
  return defaults;
}
const propLiteralValues = new Map();
function propsFor(expression) {
  const symbol = symbolOf(expression);
  const declaration = symbol?.valueDeclaration;
  if (!symbol || !declaration) return [];
  const component = symbol.getName();
  const componentType = checker.getTypeOfSymbolAtLocation(symbol, declaration);
  const signatures = checker.getSignaturesOfType(componentType, ts.SignatureKind.Call);
  const defaults = defaultsIn(declaration);
  const properties = new Map();
  for (const signature of signatures) {
    const parameter = signature.parameters[0];
    if (!parameter) continue;
    const propsType = checker.getTypeOfSymbolAtLocation(
      parameter,
      parameter.valueDeclaration ?? declaration,
    );
    const alternatives = propsType.isUnion() ? propsType.types : [propsType];
    for (const alternative of alternatives) {
      for (const prop of checker.getPropertiesOfType(alternative)) {
        const node = prop.valueDeclaration ?? prop.declarations?.[0] ?? declaration;
        const type = checker.getTypeOfSymbolAtLocation(prop, node);
        const literals = (type.isUnion() ? type.types : [type])
          .filter((value) => value.isStringLiteral())
          .map((value) => value.value);
        if (literals.length)
          propLiteralValues.set(`${component}:${prop.getName()}`, unique(literals));
        const entry = {
          component,
          name: prop.getName(),
          type: checker.typeToString(type, node, formatFlags),
          required:
            !(prop.flags & ts.SymbolFlags.Optional) &&
            alternatives.every((item) => checker.getPropertyOfType(item, prop.getName())),
          ...(defaults.has(prop.getName()) ? { defaultValue: defaults.get(prop.getName()) } : {}),
          description: ts.displayPartsToString(prop.getDocumentationComment(checker)),
          inherited: node.getSourceFile().fileName !== declaration.getSourceFile().fileName,
        };
        const existing = properties.get(entry.name);
        if (existing && existing.type !== entry.type)
          entry.type = unique([existing.type, entry.type]).join(' | ');
        properties.set(entry.name, entry);
      }
    }
  }
  return [...properties.values()].sort(
    (a, b) => Number(a.inherited) - Number(b.inherited) || a.name.localeCompare(b.name),
  );
}
function resolveModule(specifier, from) {
  if (specifier.endsWith('.css')) {
    const target = specifier.startsWith('@/')
      ? path.join(root, 'src', specifier.slice(2))
      : path.resolve(path.dirname(from), specifier);
    return fs.existsSync(target) ? target : undefined;
  }
  return ts.resolveModuleName(specifier, from, parsedConfig.options, ts.sys).resolvedModule
    ?.resolvedFileName;
}
function sourceClosure(initial) {
  const files = new Set();
  function add(file) {
    if (
      !file ||
      files.has(file) ||
      !file.startsWith(path.join(root, 'src')) ||
      /\.stories\.|\.test\.|\/assets\//.test(file)
    )
      return;
    files.add(file);
    if (file.endsWith('.css')) return;
    const source = program.getSourceFile(file);
    if (!source) return;
    for (const statement of source.statements) {
      if (
        (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) &&
        statement.moduleSpecifier &&
        ts.isStringLiteral(statement.moduleSpecifier)
      ) {
        if (ts.isImportDeclaration(statement) && statement.importClause?.isTypeOnly) continue;
        add(resolveModule(statement.moduleSpecifier.text, file));
      }
    }
  }
  initial.forEach(add);
  return [...files].sort();
}
/** Follow actual rendered/called components, not every export of an imported barrel. */
function bindingSources(initial, componentName) {
  const sources = new Map();
  const rootDirectories = new Set(initial.map(componentDirectory).filter(Boolean));
  function add(file, owner) {
    if (
      !file ||
      sources.has(file) ||
      !file.startsWith(path.join(root, 'src')) ||
      /\.stories\.|\.test\.|\/assets\//.test(file)
    )
      return;
    sources.set(file, owner);
    if (file.endsWith('.css')) return;
    const source = program.getSourceFile(file);
    if (!source) return;
    const directory = componentDirectory(file);
    for (const statement of source.statements) {
      if (
        !ts.isImportDeclaration(statement) ||
        !ts.isStringLiteral(statement.moduleSpecifier) ||
        statement.importClause?.isTypeOnly
      )
        continue;
      const dependency = resolveModule(statement.moduleSpecifier.text, file);
      const dependencyDirectory = dependency && componentDirectory(dependency);
      // Local implementation files and utility helpers belong to this implementation.
      // Another component is included only when its value is actually rendered/called below.
      if (dependency && (!dependencyDirectory || dependencyDirectory === directory))
        add(dependency, owner);
    }
    function visit(node) {
      const expression =
        ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)
          ? node.tagName
          : ts.isCallExpression(node)
            ? node.expression
            : undefined;
      const symbol = expression && symbolOf(expression);
      for (const declaration of symbol?.declarations ?? []) {
        const dependency = declaration.getSourceFile().fileName;
        const dependencyDirectory = componentDirectory(dependency);
        if (!dependencyDirectory || dependency === file) continue;
        const category = categoryFor(dependency);
        add(
          dependency,
          rootDirectories.has(dependencyDirectory)
            ? { kind: 'owned', component: componentName, ...category }
            : { kind: 'nested', component: symbol.getName(), ...category },
        );
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  initial.forEach((file) =>
    add(file, { kind: 'owned', component: componentName, ...categoryFor(file) }),
  );
  return sources;
}

/** Token registries define values. Importing a registry does not consume every entry. */
function tokenRegistrySource(source) {
  return source.statements.some((statement) => {
    if (!ts.isVariableStatement(statement)) return false;
    return statement.declarationList.declarations.some((declaration) => {
      const value = unwrap(declaration.initializer);
      if (!value || !ts.isObjectLiteralExpression(value) || value.properties.length < 2)
        return false;
      const values = value.properties.map((entry) =>
        ts.isPropertyAssignment(entry) ? unwrap(entry.initializer) : undefined,
      );
      return values.every(
        (entry) =>
          entry &&
          ((ts.isStringLiteralLike(entry) && /^var\(--/.test(entry.text)) ||
            (ts.isObjectLiteralExpression(entry) &&
              property(entry, 'value') &&
              property(entry, 'unit'))),
      );
    });
  });
}
const cssCache = new Map();
const tokensIn = (value) =>
  unique([...value.matchAll(/var\(\s*(--[\w-]+)(?=\s*[,)])/g)].map((match) => match[1]));
function cssRows(file) {
  if (cssCache.has(file)) return cssCache.get(file);
  const rows = [];
  const stylesheet = postcss.parse(fs.readFileSync(file, 'utf8'), { from: file });
  stylesheet.walkDecls((declaration) => {
    const conditions = [],
      selectors = [];
    for (
      let parent = declaration.parent;
      parent && parent.type !== 'root';
      parent = parent.parent
    ) {
      if (parent.type === 'atrule') conditions.unshift(`@${parent.name} ${parent.params}`.trim());
      if (parent.type === 'rule') selectors.unshift(parent.selector);
    }
    let selector = selectors.shift() ?? ':root';
    for (const nested of selectors)
      selector = nested.includes('&') ? nested.replaceAll('&', selector) : `${selector} ${nested}`;
    rows.push({
      file: relative(file),
      selector,
      conditions,
      property: declaration.prop,
      value: declaration.value,
      tokens: tokensIn(declaration.value),
    });
  });
  cssCache.set(file, rows);
  return rows;
}
const globalStyles = [
  ...walkFiles(path.join(root, 'src/styles'), (file) => file.endsWith('.css')),
  path.join(root, 'src/package/styles.css'),
];
function extractSource(files) {
  const classes = new Set(),
    roles = new Set(),
    ariaAttributes = new Set(),
    nativeElements = new Set(),
    keyboardKeys = new Set(),
    dependencies = new Set(),
    relatedComponents = new Set();
  const runtime = [];
  function runtimeProperty(node, key = '') {
    let parent = node.parent;
    while (parent && !ts.isSourceFile(parent) && !ts.isVariableDeclaration(parent)) {
      if (ts.isJsxAttribute(parent) || ts.isPropertyAssignment(parent))
        return parent.name.getText().replace(/^['"]|['"]$/g, '');
      parent = parent.parent;
    }
    if (/duration|delay/.test(key)) return 'duration';
    if (/icon/.test(key)) return /stroke/.test(key) ? 'icon stroke-width' : 'icon size';
    if (/opacity/.test(key)) return 'opacity';
    if (/font|line-height/.test(key)) return key;
    if (/gap|padding|offset|inset/.test(key)) return 'spacing';
    if (/height|row-(compact|default|comfortable)/.test(key)) return 'height';
    if (/width|column|breakpoint/.test(key)) return 'width';
    if (/radius/.test(key)) return 'border-radius';
    if (/stroke/.test(key)) return 'stroke-width';
    return key ? 'layout measurement' : 'runtime style';
  }
  for (const file of files.filter((item) => /\.[jt]sx?$/.test(item))) {
    const source = program.getSourceFile(file);
    if (!source) continue;
    const definitionSource = !componentDirectory(file) && tokenRegistrySource(source);
    const text = source.getFullText();
    for (const match of text.matchAll(/['"`](aegis-[\w-]+(?: [\w-]+)*)['"`]/g))
      match[1].split(/\s+/).forEach((name) => classes.add(name));
    function visit(node) {
      const addRuntime = (name) => {
        if (typeof name !== 'string' || !componentTokenDefinition(name)) return;
        const token = componentTokenCssName(name);
        runtime.push({
          file: relative(file),
          selector: `[${relative(file)}]`,
          conditions: [],
          property: runtimeProperty(node, name),
          value: `var(${token})`,
          tokens: [token],
        });
      };
      if (!definitionSource && ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        if (['componentToken', 'readComponentTokenNumber'].includes(node.expression.text))
          addRuntime(literal(node.arguments[0]));
        if (node.expression.text === 'useComponentTokenNumbers') {
          const names = resolveValue(node.arguments[0]);
          if (names && ts.isArrayLiteralExpression(names))
            names.elements.forEach((item) => addRuntime(literal(item)));
        }
      }
      if (
        !definitionSource &&
        ts.isElementAccessExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'componentTokenDefaults'
      )
        addRuntime(literal(node.argumentExpression));
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const element = node.tagName.getText();
        if (/^[a-z][a-z\d-]*$/.test(element)) nativeElements.add(element);
        for (const attr of node.attributes.properties) {
          if (!ts.isJsxAttribute(attr)) continue;
          const name = attr.name.getText();
          if (name.startsWith('aria-')) ariaAttributes.add(name);
          if (name === 'role' && attr.initializer && ts.isStringLiteral(attr.initializer))
            roles.add(attr.initializer.text);
          if (name === 'className' && attr.initializer) {
            function classValues(value) {
              if (ts.isStringLiteralLike(value) && /^[a-zA-Z_][\w-]*(?: [\w-]+)*$/.test(value.text))
                value.text.split(/\s+/).forEach((name) => classes.add(name));
              ts.forEachChild(value, classValues);
            }
            classValues(attr.initializer);
          }
        }
      }
      const isEventKey = (value) =>
        value &&
        ((ts.isPropertyAccessExpression(value) && value.name.text === 'key') ||
          (ts.isElementAccessExpression(value) && literal(value.argumentExpression) === 'key'));
      if (
        ts.isStringLiteralLike(node) &&
        /^(Arrow(Up|Down|Left|Right)|Enter|Escape|Tab|Home|End|PageUp|PageDown|Backspace|Delete|Space| )$/.test(
          node.text,
        )
      ) {
        const parent = node.parent;
        const comparison =
          ts.isBinaryExpression(parent) && (isEventKey(parent.left) || isEventKey(parent.right));
        const switchCase =
          ts.isCaseClause(parent) &&
          ts.isSwitchStatement(parent.parent.parent) &&
          isEventKey(parent.parent.parent.expression);
        const arrayCheck =
          ts.isArrayLiteralExpression(parent) &&
          ts.isPropertyAccessExpression(parent.parent) &&
          parent.parent.name.text === 'includes' &&
          ts.isCallExpression(parent.parent.parent) &&
          parent.parent.parent.arguments.some(isEventKey);
        if (comparison || switchCase || arrayCheck)
          keyboardKeys.add(node.text === ' ' ? 'Space' : node.text);
      }
      if (
        (ts.isStringLiteralLike(node) || ts.isTemplateExpression(node)) &&
        node.getText().includes('var(--') &&
        !definitionSource
      ) {
        const value = ts.isStringLiteralLike(node) ? node.text : node.getText();
        runtime.push({
          file: relative(file),
          selector: `[${relative(file)}]`,
          conditions: [],
          property: runtimeProperty(node),
          value,
          tokens: tokensIn(value),
        });
      }
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const specifier = node.moduleSpecifier.text;
        if (!specifier.startsWith('.') && !specifier.startsWith('@/')) dependencies.add(specifier);
        if (specifier.startsWith('@/components/') || specifier.startsWith('@/patterns/'))
          relatedComponents.add(specifier.split('/').slice(0, 3).join('/'));
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  return {
    cssClasses: [...classes].filter(Boolean).sort(),
    runtime,
    relatedComponents: [...relatedComponents].sort(),
    accessibility: {
      roles: [...roles].sort(),
      ariaAttributes: [...ariaAttributes].sort(),
      nativeElements: [...nativeElements].sort(),
      keyboardKeys: [...keyboardKeys].sort(),
      dependencies: [...dependencies].sort(),
    },
  };
}
const catalogueFile = path.join(root, 'src/marketing/component-catalogue.ts');
const catalogueCode = ts.transpileModule(fs.readFileSync(catalogueFile, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { componentCatalogue } = await import(
  `data:text/javascript;base64,${Buffer.from(catalogueCode).toString('base64')}`
);
const discoveryCode = ts.transpileModule(
  fs.readFileSync(path.join(output, 'component-discovery.ts'), 'utf8'),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } },
).outputText;
const { componentAliases } = await import(
  `data:text/javascript;base64,${Buffer.from(discoveryCode).toString('base64')}`
);
const entries = [];
const storyFiles = walkFiles(path.join(root, 'src'), (file) => /\.stories\.tsx?$/.test(file));
for (const file of storyFiles) {
  const source = program.getSourceFile(file);
  if (!source) continue;
  const exported = source.statements.find(ts.isExportAssignment);
  const meta = resolveValue(exported?.expression);
  const title = literal(property(meta, 'title'));
  const explicitId = literal(property(meta, 'id'));
  if (!title || (!/^(Components|Patterns)\//.test(title) && explicitId !== 'foundations-icons'))
    continue;
  const id = explicitId ?? toId(title),
    name = title.split('/').at(-1);
  if (inspectFamily && id !== inspectFamily) continue;
  const main = property(meta, 'component');
  const components = main ? [main] : [];
  if (id === 'foundations-icons') {
    const iconSource = program.getSourceFile(path.join(root, 'src/components/icon/index.tsx'));
    const searchExport = checker
      .getExportsOfModule(checker.getSymbolAtLocation(iconSource))
      .find((symbol) => symbol.getName() === 'Search');
    if (searchExport?.valueDeclaration?.name)
      components.splice(0, components.length, searchExport.valueDeclaration.name);
  }
  const subcomponents = resolveValue(property(meta, 'subcomponents'));
  if (subcomponents && ts.isObjectLiteralExpression(subcomponents))
    for (const entry of subcomponents.properties) {
      if (ts.isShorthandPropertyAssignment(entry)) components.push(entry.name);
      else if (ts.isPropertyAssignment(entry)) components.push(entry.initializer);
    }
  const componentNames = components
    .map((expression) => symbolOf(expression)?.getName())
    .filter(Boolean);
  const initialFiles = unique(
    components.flatMap(
      (expression) =>
        symbolOf(expression)?.declarations?.map(
          (declaration) => declaration.getSourceFile().fileName,
        ) ?? [],
    ),
  );
  if (id === 'foundations-icons')
    initialFiles.push(path.join(root, 'src/components/icon/index.tsx'));
  const files = sourceClosure(initialFiles);
  const bindingFiles = bindingSources(initialFiles, name);
  const extracted = extractSource([...bindingFiles.keys()]);
  const own = extractSource(initialFiles);
  const storyMetadata = [];
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement) || !exportModifier(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      const exportName = declaration.name.getText();
      if (!declaration.initializer || exportName.startsWith('_')) continue;
      const story = resolveValue(declaration.initializer);
      if (!story || !ts.isObjectLiteralExpression(story)) continue;
      storyMetadata.push({
        id: toId(id, storyNameFromExport(exportName)),
        name: literal(property(story, 'name')) ?? storyNameFromExport(exportName),
        exportName,
        sourceFile: relative(file),
        supportsArgs: supportsStoryArgs(story, meta, checker),
      });
    }
  }
  const curated =
    componentCatalogue.find((entry) => entry.docsUrl.includes(`${id}--docs`)) ??
    componentCatalogue.find((entry) => componentNames.includes(entry.name));
  const descriptionNode = property(property(property(meta, 'parameters'), 'docs'), 'description');
  const description =
    literal(property(descriptionNode, 'component')) ??
    curated?.description ??
    ts.displayPartsToString(symbolOf(main)?.getDocumentationComment(checker) ?? []) ??
    '';
  const ownedRow = (row, ownership) => ({
    ...row,
    ownership: {
      kind: ownership.kind,
      component: ownership.component,
      ...(ownership.category ? { category: ownership.category } : {}),
      ...(ownership.group ? { group: ownership.group } : {}),
    },
  });
  const css = [...bindingFiles]
    .filter(([item]) => item.endsWith('.css'))
    .flatMap(([file, ownership]) => cssRows(file).map((row) => ownedRow(row, ownership)));
  const runtime = extracted.runtime.map((row) =>
    ownedRow(row, bindingFiles.get(path.join(root, row.file))),
  );
  const ownerFacts = new Map();
  for (const [file, ownership] of bindingFiles) {
    if (!/\.[jt]sx?$/.test(file)) continue;
    const key = `${ownership.kind}:${ownership.component}`;
    const facts = ownerFacts.get(key) ?? {
      ownership,
      classes: new Set(),
      nativeElements: new Set(),
    };
    const sourceFacts = extractSource([file]);
    sourceFacts.cssClasses.forEach((name) => facts.classes.add(name));
    sourceFacts.accessibility.nativeElements.forEach((name) => facts.nativeElements.add(name));
    ownerFacts.set(key, facts);
  }
  const allGlobalRows = globalStyles.flatMap(cssRows);
  const boundGlobalRows = allGlobalRows.flatMap((row) => {
    if (row.property.startsWith('--')) return [];
    const rule = sharedRuleFor(row);
    if (sharedFiles.has(row.file) && row.tokens.length && !rule)
      throw new Error(`Missing exact shared CSS ownership: ${row.file} ${row.selector}`);
    const bindings = [];
    for (const selector of postcss.list.comma(row.selector)) {
      const owners = sharedRuleOwners(row, selector, rule, [...ownerFacts.values()]);
      for (const owner of owners) bindings.push(ownedRow({ ...row, selector }, owner));
      if (
        !owners.length &&
        !row.conditions.some((condition) => /^@scope\b/.test(condition)) &&
        (/\[class(?:\^|\*)=['"] ?aegis-/.test(selector) ||
          (['html', 'body', '*'].includes(selector) &&
            ['font-family', 'font-size', 'line-height', 'box-sizing', 'color'].includes(
              row.property,
            )))
      )
        bindings.push(
          ownedRow({ ...row, selector }, { kind: 'inherited', component: 'Page defaults' }),
        );
    }
    return bindings;
  });
  const ownTokens = new Set([...css, ...runtime, ...boundGlobalRows].flatMap((row) => row.tokens));
  const globalDefinitions = [];
  const included = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    for (const row of allGlobalRows) {
      if (!row.property.startsWith('--') || !ownTokens.has(row.property) || included.has(row))
        continue;
      globalDefinitions.push(ownedRow(row, { kind: 'definition', component: 'Token definitions' }));
      included.add(row);
      for (const token of row.tokens)
        if (!ownTokens.has(token)) {
          ownTokens.add(token);
          changed = true;
        }
    }
  }
  const globalRows = [...boundGlobalRows, ...globalDefinitions];
  const dedup = new Map(
    [...css, ...globalRows, ...runtime].map((row) => [JSON.stringify(row), row]),
  );
  const props = components.flatMap(propsFor);
  const variants =
    curated?.variants?.map((variant) => {
      const actualDefault = props.find((prop) => prop.name === variant.name)?.defaultValue;
      return {
        name: variant.name,
        values: variant.values,
        ...(actualDefault !== undefined ? { default: actualDefault.replace(/^"|"$/g, '') } : {}),
      };
    }) ?? [];
  for (const prop of props.filter((prop) => !prop.inherited)) {
    const values = propLiteralValues.get(`${prop.component}:${prop.name}`) ?? [];
    if (
      values.length >= 2 &&
      values.length <= 24 &&
      !variants.some((variant) => variant.name === prop.name)
    )
      variants.push({
        name: prop.name,
        values: unique(values),
        ...(prop.defaultValue ? { default: prop.defaultValue.replace(/^"|"$/g, '') } : {}),
      });
  }
  const imports = components.map((expression) => {
    const componentName = symbolOf(expression)?.getName() ?? expression.getText();
    const sourceFile = symbolOf(expression)?.valueDeclaration?.getSourceFile().fileName;
    const segment = sourceFile?.match(/src\/(?:components|patterns)\/([^/]+)/)?.[1];
    return {
      name: componentName,
      path: sourceFile?.includes('/src/patterns/')
        ? '@dimitriszoitas/aegis-ui/patterns'
        : (curated?.importPath ??
          (segment
            ? `@dimitriszoitas/aegis-ui/${segment === 'icon' ? 'icons' : segment}`
            : relative(sourceFile ?? file))),
    };
  });
  entries.push({
    id,
    tokenGroup: categoryFor(initialFiles[0] ?? '')?.group,
    name,
    title,
    category: title.split('/').slice(0, -1).join('/'),
    kind: title.startsWith('Patterns/')
      ? 'pattern'
      : title.startsWith('Components/')
        ? 'component'
        : 'foundation',
    aliases: unique([...(componentAliases[id] ?? []), ...(curated?.keywords ?? [])]),
    description,
    purpose: curated?.purpose ?? description,
    usage: curated?.usage ?? '',
    anatomy: curated?.anatomy ?? own.cssClasses,
    sourceFiles: unique([...files, file].map(relative).concat(globalRows.map((row) => row.file))),
    exportNames: componentNames,
    imports,
    stories: storyMetadata,
    props,
    css: [...dedup.values()],
    variants,
    cssClasses: own.cssClasses,
    relatedComponents: extracted.relatedComponents,
    accessibility: { ...own.accessibility, dependencies: extracted.accessibility.dependencies },
  });
  // Keep compiler/source provenance in sourceFiles; no runtime inspection is claimed here.
}
entries.sort((a, b) => a.title.localeCompare(b.title));
if (!entries.length)
  throw new Error('No component families found. Refusing to replace generated docs.');
if (inspectFamily) {
  const metadata = entries.find((entry) => entry.id === inspectFamily);
  if (!metadata) throw new Error(`Unknown component family: ${inspectFamily}`);
  console.log(JSON.stringify(metadata, null, 2));
  process.exit(0);
}
const outputs = new Map();
const sections = documentationSections;
const index = [
  '// Generated by scripts/generate-component-docs.mjs. Do not edit by hand.',
  "import type { ComponentMetadata } from '../types';",
];
for (const metadata of entries) {
  outputs.set(
    path.join(generated, `${metadata.id}.json`),
    JSON.stringify(metadata, null, 2) + '\n',
  );
  const directory = path.join(pages, metadata.id);
  for (const [section, label] of sections) {
    const navigationTag =
      section === 'overview' ? 'aegis-component-hub' : 'aegis-component-section';
    const title =
      section === 'overview' ? metadata.title : `${documentationRouteTitle(metadata)}/${label}`;
    outputs.set(
      path.join(directory, `${section}.mdx`),
      `import { Meta } from '@storybook/addon-docs/blocks';\nimport { ComponentDocumentation } from '../../component-documentation';\n\n<Meta title=${JSON.stringify(title)} id=${JSON.stringify(documentationMetaId(metadata, label))} tags={${JSON.stringify([navigationTag])}} />\n\n<ComponentDocumentation componentId=${JSON.stringify(metadata.id)} section=${JSON.stringify(section)} />\n`,
    );
  }
}
index.push(
  '\nexport const componentMetadata: Record<string, Pick<ComponentMetadata, "name" | "title" | "category" | "description" | "kind" | "aliases">> = {',
);
entries.forEach((entry) =>
  index.push(
    `  ${JSON.stringify(entry.id)}: ${JSON.stringify({ name: entry.name, title: entry.title, category: entry.category, description: entry.purpose || entry.description, kind: entry.kind, aliases: entry.aliases })},`,
  ),
);
index.push('};', '', 'const loaders: Record<string, () => Promise<ComponentMetadata>> = {');
// Load validated metadata as data: inferring every generated JSON row produces
// enormous structural unions and can exhaust TypeScript's relation cache.
entries.forEach((entry) =>
  index.push(
    `  ${JSON.stringify(entry.id)}: () => import('./${entry.id}.json?raw').then((module) => JSON.parse(module.default) as ComponentMetadata),`,
  ),
);
index.push(
  '};',
  '',
  'export function loadComponentMetadata(id: string): Promise<ComponentMetadata> {',
  '  const loader = loaders[id];',
  '  if (!loader) return Promise.reject(new Error(`Unknown component documentation: ${id}`));',
  '  return loader();',
  '}',
  '',
);
outputs.set(path.join(generated, 'index.ts'), index.join('\n'));
function fingerprint(file, text) {
  if (file.endsWith('.json')) return JSON.stringify(JSON.parse(text));
  if (file.endsWith('.mdx')) {
    const meta = text.match(/<Meta\b([\s\S]*?)\/>/)?.[1] ?? '';
    const title = meta.match(/title="([^"]+)"/)?.[1];
    const id = meta.match(/\bid="([^"]+)"/)?.[1];
    const tags = [
      ...(meta.match(/tags=\{\[([\s\S]*?)\]\}/)?.[1] ?? '').matchAll(/['"]([^'"]+)['"]/g),
    ]
      .map((match) => match[1])
      .sort();
    const componentId = text.match(/componentId="([^"]+)"/)?.[1];
    const section = text.match(/section="([^"]+)"/)?.[1];
    const imports = [...text.matchAll(/import\s+{\s*(\w+)\s*}\s+from\s+['"]([^'"]+)['"];?/g)].map(
      (match) => match.slice(1),
    );
    const remainder = text
      .replace(/import\s+{[^}]+}\s+from\s+['"][^'"]+['"];?/g, '')
      .replace(/<Meta\b[\s\S]*?\/>/, '')
      .replace(/<ComponentDocumentation\s+componentId="[^"]+"\s+section="[^"]+"\s*\/>/, '')
      .trim();
    return JSON.stringify({ title, id, tags, componentId, section, imports, remainder });
  }
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, text);
  const tokens = [];
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan())
    tokens.push([token, scanner.getTokenValue() ?? scanner.getTokenText()]);
  return JSON.stringify(tokens);
}
if (process.argv.includes('--check')) {
  const stale = [];
  for (const [file, text] of outputs) {
    if (
      !fs.existsSync(file) ||
      fingerprint(file, fs.readFileSync(file, 'utf8')) !== fingerprint(file, text)
    )
      stale.push(relative(file));
  }
  for (const directory of [generated, pages])
    if (fs.existsSync(directory))
      for (const file of walkFiles(directory, () => true))
        if (!outputs.has(file)) stale.push(`Unexpected: ${relative(file)}`);
  if (stale.length) {
    console.error(
      `Component documentation is stale. Run node scripts/generate-component-docs.mjs.\n${stale.join('\n')}`,
    );
    process.exitCode = 1;
  } else
    console.log(
      'Component documentation matches current props, defaults, source styles, stories, and one canonical hub plus 11 compatible section routes per family.',
    );
} else {
  for (const directory of [generated, pages]) {
    fs.mkdirSync(directory, { recursive: true });
    for (const file of walkFiles(directory, () => true)) if (!outputs.has(file)) fs.rmSync(file);
  }
  for (const [file, text] of outputs) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (
      !fs.existsSync(file) ||
      fingerprint(file, fs.readFileSync(file, 'utf8')) !== fingerprint(file, text)
    )
      fs.writeFileSync(file, text);
  }
}
console.log(
  `Generated ${entries.length} families, ${entries.length * sections.length} MDX pages, ${entries.reduce((total, entry) => total + entry.props.length, 0)} public props and ${entries.reduce((total, entry) => total + entry.css.length, 0)} CSS declarations.`,
);
