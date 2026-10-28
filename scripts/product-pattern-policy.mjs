import ts from 'typescript';
import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { resolve, relative, isAbsolute, sep } from 'node:path';

export const patternPolicyCapability = Object.freeze({
  version: '2',
  schemaVersions: [2],
  runtime: 'runtime/pattern-policy.mjs',
  schema: 'schemas/product-pattern-policy.schema.json',
  command: 'patterns check <policy.json> --project <project-root>',
});

const limits = [
  'Checks declared JSX syntax and import identity, not executed render counts, responsive appearance, accessibility, or interaction behavior.',
  'Only declared pages and an optional literal route inventory are inspected; undeclared routes are not discovered automatically.',
  'Route inventory checks reject direct local writes, including destructuring and for-in/of targets, and array-binding escapes; callback effects, returned entry aliases and external runtime mutation are not analyzed.',
  'Public named or namespace imports are supported. Local aliases, re-export resolution, dynamic component construction, and spread-prop values are not inferred.',
  'Required props check explicit presence; propValues checks direct primitive literals only. Expressions, spread overrides and encoded JSX attribute strings are not evaluated. Local implementation files are fingerprinted, not behaviorally validated.',
  'Policy and source hashes identify this evidence; they do not authenticate owner approval or prove component package integrity.',
];
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;
const unique = (values) => new Set(values).size === values.length;
const relativePath = (value, dot = false) =>
  nonempty(value) &&
  ((dot && value === '.') ||
    (!value.startsWith('/') &&
      !value.includes('\\') &&
      !value.includes(':') &&
      value.split('/').every((part) => part && part !== '.' && part !== '..')));
const within = (scope, file) => scope === '.' || file.startsWith(scope + '/');
const sha = (value) => createHash('sha256').update(value).digest('hex');
const canonical = (value) =>
  JSON.stringify(value, (_key, item) =>
    object(item)
      ? Object.fromEntries(
          Object.keys(item)
            .sort()
            .map((key) => [key, item[key]]),
        )
      : item,
  );
const issue = (rule, message, extra = {}) => ({ ...extra, rule, message });
const keyFor = (value) => `${value.page}/${value.pattern}/${value.rule}`;
const allowedExceptionRule =
  /^(missing-import|cardinality|spread-props|required-prop:[\w-]+|forbidden-prop:[\w-]+|prop-value:[\w-]+|forbidden-tag:[a-z][\w-]*)$/;

export function validatePatternPolicy(policy) {
  const issues = [];
  const check = (condition, message) => {
    if (!condition) issues.push(issue('policy-schema', message));
  };
  const keys = (value, allowed, name) => {
    for (const key of Object.keys(value)) check(allowed.includes(key), `${name}.${key} is unknown`);
  };
  const strings = (value) => Array.isArray(value) && value.every(nonempty) && unique(value);
  if (!object(policy))
    return { valid: false, issues: [issue('policy-schema', 'Policy must be an object')] };
  keys(
    policy,
    [
      'schemaVersion',
      'product',
      'revision',
      'scope',
      'route',
      'mode',
      'pages',
      'patterns',
      'exceptions',
      'checks',
      'changePolicy',
      'routeInventory',
    ],
    'policy',
  );
  check(policy.schemaVersion === 2, 'schemaVersion must be 2; migrate legacy policies explicitly');
  check(nonempty(policy.product), 'product is required');
  check(
    Number.isSafeInteger(policy.revision) && policy.revision > 0,
    'revision must be a positive integer',
  );
  check(
    relativePath(policy.scope, true),
    'scope must be a normalized project-relative directory or .',
  );
  check(Array.isArray(policy.pages) && policy.pages.length > 0, 'pages must be a nonempty array');
  check(
    object(policy.patterns) && Object.keys(policy.patterns).length > 0,
    'patterns must be a nonempty object',
  );
  check(Array.isArray(policy.exceptions), 'exceptions must be an array, including when empty');
  if (policy.route !== undefined) check(typeof policy.route === 'string', 'route must be a string');
  if (policy.mode !== undefined) check(object(policy.mode), 'mode must be an object');
  if (policy.checks !== undefined)
    check(strings(policy.checks), 'checks must contain unique nonempty strings');
  if (policy.changePolicy !== undefined)
    check(nonempty(policy.changePolicy), 'changePolicy must be nonempty');
  if (!Array.isArray(policy.pages) || !object(policy.patterns) || !Array.isArray(policy.exceptions))
    return { valid: false, issues };
  const pageIds = new Set();
  const sources = new Set();
  for (const page of policy.pages) {
    if (!object(page)) {
      check(false, 'Each page must be an object');
      continue;
    }
    keys(page, ['id', 'source', 'title', 'collection', 'patterns'], 'page');
    for (const field of ['title', 'collection'])
      if (page[field] !== undefined)
        check(typeof page[field] === 'string', `page.${field} must be a string`);
    check(nonempty(page.id) && !pageIds.has(page.id), 'Page IDs must be nonempty and unique');
    pageIds.add(page.id);
    check(
      relativePath(page.source) && within(policy.scope, page.source),
      `${page.id}: source must be within scope`,
    );
    check(!sources.has(page.source), `${page.id}: page sources must be unique`);
    sources.add(page.source);
    check(
      strings(page.patterns) && page.patterns.length > 0,
      `${page.id}: patterns must be a nonempty unique array`,
    );
    for (const id of Array.isArray(page.patterns) ? page.patterns : []) {
      check(Object.hasOwn(policy.patterns, id), `${page.id}: unknown pattern ${id}`);
      check(
        nonempty(policy.patterns[id]?.module) && nonempty(policy.patterns[id]?.export),
        `${page.id}: ${id} must name an executable import`,
      );
    }
  }
  for (const [id, pattern] of Object.entries(policy.patterns)) {
    if (!object(pattern)) {
      check(false, `${id}: pattern must be an object`);
      continue;
    }
    check(/^[\w-]+$/.test(id), `Invalid pattern ID ${id}`);
    keys(
      pattern,
      [
        'module',
        'export',
        'source',
        'cardinality',
        'requiredProps',
        'forbiddenProps',
        'propValues',
        'forbiddenLocalTags',
        'invariants',
        'allowedVariations',
        'desktopSearchWidthToken',
        'mobileSearchWidth',
      ],
      id,
    );
    if (pattern.module !== undefined || pattern.export !== undefined) {
      check(
        nonempty(pattern.module) &&
          nonempty(pattern.export) &&
          /^[A-Za-z_$][\w$]*$/.test(pattern.export),
        `${id}: module and named export are required`,
      );
      check(
        object(pattern.cardinality) &&
          Number.isSafeInteger(pattern.cardinality.min) &&
          pattern.cardinality.min >= 0 &&
          Number.isSafeInteger(pattern.cardinality.max) &&
          pattern.cardinality.max >= pattern.cardinality.min,
        `${id}: cardinality requires finite integers 0 <= min <= max`,
      );
      if (object(pattern.cardinality))
        keys(pattern.cardinality, ['min', 'max'], `${id}.cardinality`);
    } else {
      check(
        [
          'cardinality',
          'requiredProps',
          'forbiddenProps',
          'propValues',
          'forbiddenLocalTags',
        ].every((key) => pattern[key] === undefined),
        `${id}: executable constraints need module and export`,
      );
    }
    for (const property of [
      'requiredProps',
      'forbiddenProps',
      'forbiddenLocalTags',
      'invariants',
      'allowedVariations',
    ]) {
      if (pattern[property] !== undefined)
        check(strings(pattern[property]), `${id}.${property} must contain unique nonempty strings`);
    }
    for (const name of [
      ...(Array.isArray(pattern.requiredProps) ? pattern.requiredProps : []),
      ...(Array.isArray(pattern.forbiddenProps) ? pattern.forbiddenProps : []),
    ])
      check(/^[\w-]+$/.test(name), `${id}: invalid prop name ${name}`);
    for (const tag of Array.isArray(pattern.forbiddenLocalTags) ? pattern.forbiddenLocalTags : [])
      check(
        /^[a-z][\w-]*$/.test(tag),
        `${id}: forbiddenLocalTags supports intrinsic lowercase JSX tags`,
      );
    check(
      !(
        Array.isArray(pattern.requiredProps) &&
        Array.isArray(pattern.forbiddenProps) &&
        pattern.requiredProps.some((name) => pattern.forbiddenProps.includes(name))
      ),
      `${id}: required and forbidden props overlap`,
    );
    if (pattern.propValues !== undefined) {
      check(object(pattern.propValues), `${id}.propValues must be an object`);
      for (const [name, value] of object(pattern.propValues)
        ? Object.entries(pattern.propValues)
        : []) {
        check(/^[\w-]+$/.test(name), `${id}: invalid prop value name ${name}`);
        check(
          value === null ||
            typeof value === 'string' ||
            typeof value === 'boolean' ||
            (typeof value === 'number' && Number.isFinite(value)),
          `${id}.${name}: expected value must be a JSON primitive`,
        );
        check(
          !Array.isArray(pattern.forbiddenProps) || !pattern.forbiddenProps.includes(name),
          `${id}.${name}: cannot require a value for a forbidden prop`,
        );
      }
    }
    if (pattern.source !== undefined)
      check(
        relativePath(pattern.source) && within(policy.scope, pattern.source),
        `${id}: local source must be within scope`,
      );
    for (const field of ['desktopSearchWidthToken', 'mobileSearchWidth'])
      if (pattern[field] !== undefined)
        check(typeof pattern[field] === 'string', `${id}.${field} must be a string`);
  }
  const exceptionKeys = new Set();
  for (const exception of policy.exceptions) {
    if (!object(exception)) {
      check(false, 'Each exception must be an object');
      continue;
    }
    keys(exception, ['page', 'pattern', 'rule', 'reason'], 'exception');
    check(pageIds.has(exception.page), 'Exception must name an existing page');
    const pagePatterns = policy.pages.find((p) => p?.id === exception.page)?.patterns;
    check(
      Array.isArray(pagePatterns) && pagePatterns.includes(exception.pattern),
      'Exception must name a pattern used by its page',
    );
    check(
      allowedExceptionRule.test(exception.rule),
      'Exception must name a supported, specific rule',
    );
    check(nonempty(exception.reason), 'Exception requires a reason');
    check(!exceptionKeys.has(keyFor(exception)), 'Duplicate exception scope');
    exceptionKeys.add(keyFor(exception));
  }
  if (policy.routeInventory !== undefined) {
    const route = policy.routeInventory;
    check(object(route), 'routeInventory must be an object');
    if (object(route)) {
      keys(route, ['source', 'variable', 'idProperty'], 'routeInventory');
      check(
        relativePath(route.source) && within(policy.scope, route.source),
        'Route inventory source must be within scope',
      );
      check(
        nonempty(route.variable) && /^[A-Za-z_$][\w$]*$/.test(route.variable),
        'Route inventory variable must be an identifier',
      );
      check(nonempty(route.idProperty), 'Route inventory idProperty is required');
    }
  }
  return { valid: issues.length === 0, issues };
}

function sourceProgram(sourceMap) {
  const files = Object.fromEntries(
    Object.entries(sourceMap).map(([file, text]) => [
      file,
      ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX),
    ]),
  );
  const host = {
    getSourceFile: (file) => files[file],
    getDefaultLibFileName: () => '',
    writeFile() {},
    getCurrentDirectory: () => '',
    getDirectories: () => [],
    fileExists: (file) => Object.hasOwn(files, file),
    readFile: (file) => sourceMap[file],
    getCanonicalFileName: (file) => file,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
  };
  const program = ts.createProgram(
    Object.keys(files),
    { noResolve: true, noLib: true, jsx: ts.JsxEmit.Preserve },
    host,
  );
  return { files, checker: program.getTypeChecker() };
}
function openingElements(source) {
  const found = [];
  function walk(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) found.push(node);
    ts.forEachChild(node, walk);
  }
  walk(source);
  return found;
}
function bindingsFor(source, pattern, checker) {
  const bindings = [];
  for (const node of source.statements) {
    if (
      !ts.isImportDeclaration(node) ||
      node.moduleSpecifier.text !== pattern.module ||
      node.importClause?.isTypeOnly
    )
      continue;
    const binding = node.importClause?.namedBindings;
    if (binding && ts.isNamedImports(binding)) {
      for (const item of binding.elements)
        if (!item.isTypeOnly && (item.propertyName?.text ?? item.name.text) === pattern.export)
          bindings.push({ symbol: checker.getSymbolAtLocation(item.name), namespace: false });
    } else if (binding && ts.isNamespaceImport(binding))
      bindings.push({ symbol: checker.getSymbolAtLocation(binding.name), namespace: true });
  }
  return bindings;
}
function matches(node, bindings, pattern, checker) {
  return bindings.some(
    ({ symbol, namespace }) =>
      symbol &&
      (namespace
        ? ts.isPropertyAccessExpression(node.tagName) &&
          ts.isIdentifier(node.tagName.expression) &&
          node.tagName.name.text === pattern.export &&
          checker.getSymbolAtLocation(node.tagName.expression) === symbol
        : ts.isIdentifier(node.tagName) && checker.getSymbolAtLocation(node.tagName) === symbol),
  );
}
function unwrap(node) {
  while (
    node &&
    (ts.isAsExpression(node) ||
      ts.isSatisfiesExpression(node) ||
      ts.isParenthesizedExpression(node))
  )
    node = node.expression;
  return node;
}

function literalPropValue(attribute) {
  const initializer = attribute.initializer;
  if (!initializer) return { known: true, value: true };
  if (ts.isStringLiteral(initializer)) {
    // JSX quoted strings have entity and newline semantics distinct from JS strings.
    // Require an explicit JS string literal for those cases rather than guessing.
    if (/[\r\n]|&(?:#\d+|#x[\da-f]+|[a-z][\w]+);/i.test(initializer.text)) return { known: false };
    return { known: true, value: initializer.text };
  }
  if (!ts.isJsxExpression(initializer)) return { known: false };
  const expression = unwrap(initializer.expression);
  if (!expression) return { known: false };
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression))
    return { known: true, value: expression.text };
  if (expression.kind === ts.SyntaxKind.TrueKeyword) return { known: true, value: true };
  if (expression.kind === ts.SyntaxKind.FalseKeyword) return { known: true, value: false };
  if (expression.kind === ts.SyntaxKind.NullKeyword) return { known: true, value: null };
  if (ts.isNumericLiteral(expression))
    return { known: Number.isFinite(Number(expression.text)), value: Number(expression.text) };
  if (
    ts.isPrefixUnaryExpression(expression) &&
    ts.isNumericLiteral(expression.operand) &&
    [ts.SyntaxKind.PlusToken, ts.SyntaxKind.MinusToken].includes(expression.operator)
  ) {
    const value =
      Number(expression.operand.text) * (expression.operator === ts.SyntaxKind.MinusToken ? -1 : 1);
    return { known: Number.isFinite(value), value };
  }
  return { known: false };
}

function routeReferenceIssues(source, declaration, checker) {
  const problems = [];
  const add = (node, message) =>
    problems.push(
      issue('route-inventory', message, {
        source: source.fileName,
        line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
      }),
    );
  if (!(declaration.parent.flags & ts.NodeFlags.Const))
    add(declaration, 'Route inventory must use a const binding; reassignment is unsupported');
  if (
    declaration.parent.parent.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    )
  )
    add(
      declaration,
      'Exported mutable route inventories require an application-specific coverage check',
    );
  const symbol = checker.getSymbolAtLocation(declaration.name);
  const readMethods = new Set([
    'at',
    'find',
    'findLast',
    'findIndex',
    'findLastIndex',
    'map',
    'filter',
    'some',
    'every',
    'includes',
    'indexOf',
    'lastIndexOf',
    'slice',
    'concat',
    'join',
    'toString',
    'toReversed',
    'toSorted',
    'toSpliced',
    'with',
  ]);
  function isWriteTarget(target) {
    while (target.parent) {
      const parent = target.parent;
      if (
        (ts.isBinaryExpression(parent) &&
          parent.left === target &&
          parent.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
          parent.operatorToken.kind <= ts.SyntaxKind.LastAssignment) ||
        ((ts.isForInStatement(parent) || ts.isForOfStatement(parent)) &&
          parent.initializer === target) ||
        (ts.isDeleteExpression(parent) && parent.expression === target) ||
        ((ts.isPrefixUnaryExpression(parent) || ts.isPostfixUnaryExpression(parent)) &&
          parent.operand === target &&
          [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(parent.operator))
      )
        return true;
      // A member can be nested inside an assignment pattern. Follow only target
      // positions, never computed keys or a default value's right-hand side.
      if (
        ((ts.isParenthesizedExpression(parent) ||
          ts.isAsExpression(parent) ||
          ts.isSatisfiesExpression(parent)) &&
          parent.expression === target) ||
        (ts.isPropertyAssignment(parent) && parent.initializer === target) ||
        (ts.isShorthandPropertyAssignment(parent) && parent.name === target) ||
        ((ts.isSpreadAssignment(parent) || ts.isSpreadElement(parent)) &&
          parent.expression === target) ||
        (ts.isArrayLiteralExpression(parent) && parent.elements.includes(target)) ||
        (ts.isObjectLiteralExpression(parent) && parent.properties.includes(target))
      )
        target = parent;
      else return false;
    }
    return false;
  }
  function walk(node) {
    if (
      ts.isIdentifier(node) &&
      node !== declaration.name &&
      (ts.isShorthandPropertyAssignment(node.parent) && node.parent.name === node
        ? checker.getShorthandAssignmentValueSymbol(node.parent)
        : checker.getSymbolAtLocation(node)) === symbol
    ) {
      let access = node;
      while (
        access.parent &&
        (((ts.isPropertyAccessExpression(access.parent) ||
          ts.isElementAccessExpression(access.parent)) &&
          access.parent.expression === access) ||
          ((ts.isParenthesizedExpression(access.parent) ||
            ts.isAsExpression(access.parent) ||
            ts.isSatisfiesExpression(access.parent)) &&
            access.parent.expression === access))
      )
        access = access.parent;
      const parent = access.parent;
      if (isWriteTarget(access))
        add(node, 'Route inventory or one of its entries is written after declaration');
      else if (parent && ts.isCallExpression(parent) && parent.expression === access) {
        const method = ts.isPropertyAccessExpression(access)
          ? access.name.text
          : ts.isElementAccessExpression(access) && ts.isStringLiteral(access.argumentExpression)
            ? access.argumentExpression.text
            : null;
        if (!readMethods.has(method))
          add(node, 'Mutating or unknown route inventory method is unsupported');
      } else if (
        access === node ||
        ts.isAsExpression(access) ||
        ts.isSatisfiesExpression(access) ||
        ts.isParenthesizedExpression(access)
      )
        add(
          node,
          'Route inventory escapes through an alias or argument; use an application-specific coverage check',
        );
      else if (
        ts.isPropertyAccessExpression(access) &&
        access.expression === node &&
        access.name.text !== 'length'
      )
        add(node, 'Route inventory method alias is unsupported');
    }
    ts.forEachChild(node, walk);
  }
  walk(source);
  return problems;
}

function declaredFiles(policy) {
  return [
    ...new Set([
      ...policy.pages.map((page) => page.source),
      ...Object.values(policy.patterns)
        .map((pattern) => pattern.source)
        .filter(Boolean),
      ...(policy.routeInventory ? [policy.routeInventory.source] : []),
    ]),
  ].sort();
}

export function auditPatternSources(policy, sourceMap = {}) {
  const validation = validatePatternPolicy(policy);
  const report = {
    schemaVersion: 1,
    checkerVersion: patternPolicyCapability.version,
    valid: false,
    policy: {
      product: policy?.product ?? null,
      revision: policy?.revision ?? null,
      sha256: sha(canonical(policy) ?? 'null'),
    },
    sources: [],
    checkedPatterns: 0,
    issues: [...validation.issues],
    exceptions: [],
    limits,
  };
  if (!validation.valid) return report;
  const declared = declaredFiles(policy);
  const available = {};
  for (const file of declared) {
    if (typeof sourceMap[file] !== 'string')
      report.issues.push(
        issue('missing-source', `Declared source is unavailable: ${file}`, { source: file }),
      );
    else {
      available[file] = sourceMap[file];
      report.sources.push({ path: file, sha256: sha(sourceMap[file]) });
    }
  }
  const { files, checker } = sourceProgram(available);
  for (const [file, source] of Object.entries(files))
    for (const diagnostic of source.parseDiagnostics)
      report.issues.push(
        issue('parse-error', ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'), {
          source: file,
          line: source.getLineAndCharacterOfPosition(diagnostic.start ?? 0).line + 1,
        }),
      );
  const findings = [];
  for (const page of policy.pages) {
    const source = files[page.source];
    if (!source || source.parseDiagnostics.length) continue;
    const elements = openingElements(source);
    for (const id of page.patterns) {
      report.checkedPatterns++;
      const pattern = policy.patterns[id];
      const add = (rule, message, node) =>
        findings.push(
          issue(rule, message, {
            page: page.id,
            pattern: id,
            source: page.source,
            ...(node
              ? { line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1 }
              : {}),
          }),
        );
      const bindings = bindingsFor(source, pattern, checker);
      const instances = elements.filter((node) => matches(node, bindings, pattern, checker));
      if (!bindings.length && pattern.cardinality.min > 0)
        add('missing-import', `Import ${pattern.export} from ${pattern.module}`);
      if (instances.length < pattern.cardinality.min || instances.length > pattern.cardinality.max)
        add(
          'cardinality',
          `Expected ${pattern.cardinality.min}..${pattern.cardinality.max} JSX occurrences of ${pattern.export}; found ${instances.length}`,
        );
      for (const node of instances) {
        const attributes = node.attributes.properties;
        const names = new Set(
          attributes.filter(ts.isJsxAttribute).map((attribute) => attribute.name.getText(source)),
        );
        if (attributes.some(ts.isJsxSpreadAttribute))
          add(
            'spread-props',
            'Spread props prevent verification of the declared public configuration',
            node,
          );
        for (const name of pattern.requiredProps ?? [])
          if (!names.has(name))
            add(`required-prop:${name}`, `Explicit ${name} prop is required`, node);
        for (const name of pattern.forbiddenProps ?? [])
          if (names.has(name))
            add(
              `forbidden-prop:${name}`,
              `${name} prop is forbidden by this product decision`,
              node,
            );
        for (const [name, expected] of Object.entries(pattern.propValues ?? {})) {
          const supplied = attributes.filter(
            (attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText(source) === name,
          );
          const actual =
            supplied.length === 1 && !attributes.some(ts.isJsxSpreadAttribute)
              ? literalPropValue(supplied[0])
              : { known: false };
          if (!actual.known)
            add(
              `prop-value:${name}`,
              `Unresolved ${name}: expected literal ${JSON.stringify(expected)}; supply one explicit primitive value without spreads`,
              node,
            );
          else if (actual.value !== expected)
            add(
              `prop-value:${name}`,
              `${name} must equal ${JSON.stringify(expected)}; found ${JSON.stringify(actual.value)}`,
              node,
            );
        }
      }
      for (const tag of pattern.forbiddenLocalTags ?? [])
        for (const node of elements)
          if (ts.isIdentifier(node.tagName) && node.tagName.text === tag)
            add(
              `forbidden-tag:${tag}`,
              `Local <${tag}> bypasses ${pattern.export}'s responsibility`,
              node,
            );
    }
  }
  const exceptions = new Map(
    policy.exceptions.map((exception) => [keyFor(exception), { ...exception, findings: [] }]),
  );
  for (const finding of findings) {
    const exception = exceptions.get(keyFor(finding));
    if (exception) exception.findings.push(finding);
    else report.issues.push(finding);
  }
  for (const exception of exceptions.values()) {
    if (exception.findings.length) report.exceptions.push(exception);
    else
      report.issues.push(
        issue(
          'unused-exception',
          'Exception did not match a finding; remove or correct its scope',
          { page: exception.page, pattern: exception.pattern },
        ),
      );
  }
  if (policy.routeInventory && files[policy.routeInventory.source]) {
    const inventory = policy.routeInventory;
    const source = files[inventory.source];
    const declaration = source.statements
      .flatMap((node) =>
        ts.isVariableStatement(node) ? [...node.declarationList.declarations] : [],
      )
      .find((node) => ts.isIdentifier(node.name) && node.name.text === inventory.variable);
    const array = unwrap(declaration?.initializer);
    if (declaration) report.issues.push(...routeReferenceIssues(source, declaration, checker));
    const ids =
      array && ts.isArrayLiteralExpression(array)
        ? array.elements.map((element) => {
            if (!ts.isObjectLiteralExpression(element)) return null;
            if (
              element.properties.some(
                (entry) =>
                  ts.isSpreadAssignment(entry) ||
                  (entry.name && ts.isComputedPropertyName(entry.name)),
              )
            )
              return null;
            const properties = element.properties.filter(
              (entry) =>
                entry.name?.getText(source).replace(/^['"]|['"]$/g, '') === inventory.idProperty,
            );
            const property = properties[0];
            return properties.length === 1 &&
              ts.isPropertyAssignment(property) &&
              ts.isStringLiteral(property.initializer)
              ? property.initializer.text
              : null;
          })
        : null;
    if (!ids || ids.some((id) => id === null))
      report.issues.push(
        issue(
          'route-inventory',
          'Route inventory must be a top-level literal array with literal string IDs',
          { source: inventory.source },
        ),
      );
    else if (JSON.stringify(ids) !== JSON.stringify(policy.pages.map((page) => page.id)))
      report.issues.push(
        issue('route-coverage', 'Route IDs and order must match the declared policy pages', {
          source: inventory.source,
        }),
      );
  }
  const compare = (a, b) =>
    canonical(a) < canonical(b) ? -1 : canonical(a) > canonical(b) ? 1 : 0;
  report.issues.sort(compare);
  report.exceptions.sort(compare);
  report.valid = report.issues.length === 0;
  return report;
}

function contained(root, path) {
  const rel = relative(root, path);
  return !isAbsolute(rel) && rel !== '..' && !rel.startsWith('..' + sep);
}
export async function auditProductPatterns({ root = '.', policyPath }) {
  const projectRoot = await realpath(resolve(root));
  const target = resolve(projectRoot, policyPath);
  if (!contained(projectRoot, target) || !contained(projectRoot, await realpath(target)))
    throw new Error('Policy path must remain within the project root, including symlinks');
  const policy = JSON.parse(await readFile(target, 'utf8'));
  const validation = validatePatternPolicy(policy);
  if (!validation.valid) return auditPatternSources(policy, {});
  const scope = resolve(projectRoot, policy.scope);
  if (!contained(projectRoot, await realpath(scope)))
    throw new Error('Policy scope escapes the project root through a symlink');
  const files = declaredFiles(policy);
  const sourceMap = {};
  const failures = [];
  for (const file of files) {
    try {
      const path = await realpath(resolve(projectRoot, file));
      if (!contained(scope, path))
        throw new Error('Source escapes the declared scope, including symlinks');
      sourceMap[file] = await readFile(path, 'utf8');
    } catch (error) {
      failures.push(
        issue('unreadable-source', error.code ? `${file}: ${error.code}` : error.message, {
          source: file,
        }),
      );
    }
  }
  const report = auditPatternSources(policy, sourceMap);
  report.issues.push(...failures);
  report.valid = report.issues.length === 0;
  return report;
}
