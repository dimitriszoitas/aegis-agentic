#!/usr/bin/env node
// Static evidence only. Never imports or executes application modules.
import fs from 'node:fs';
import path from 'node:path';
import { builtinModules, createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { discoverUI } from './ui-discovery.mjs';

export function auditComponentUsage({ root, entries, inventory, publicEntries = [] }) {
  root = path.resolve(root);
  const require = createRequire(path.join(root, 'package.json'));
  let ts;
  try { ts = require('typescript'); } catch {
    throw new Error('This optional analyzer requires TypeScript in the target repository. Install its existing development dependencies first; no application code is executed.');
  }
  const relative = (file) => path.relative(root, file).split(path.sep).join('/');
  const inside = (file) => !relative(file).startsWith('../') && !path.isAbsolute(relative(file));
  const discovery = discoverUI({ root });
  const files = discovery.sourceFiles.filter((entry) => entry.kind === 'script').map((entry) => path.resolve(root, entry.file));
  const fileSet = new Set(files);
  const fallbackOptions = { allowJs: true, jsx: ts.JsxEmit.ReactJSX, moduleResolution: ts.ModuleResolutionKind.Bundler };
  const configs = new Map();
  const configurationIssues = [];
  function readConfig(configFile) {
    configFile = path.resolve(configFile);
    if (configs.has(configFile)) return;
    configs.set(configFile, null); // A reference cycle must not recurse forever.
    const read = ts.readConfigFile(configFile, ts.sys.readFile);
    if (read.error) {
      configurationIssues.push({ file: relative(configFile), reason: ts.flattenDiagnosticMessageText(read.error.messageText, ' ') });
      return;
    }
    const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, path.dirname(configFile), undefined, configFile);
    // "No inputs" is valid for a solution or an inherited settings-only config.
    for (const error of parsed.errors.filter((item) => item.code !== 18003)) {
      configurationIssues.push({ file: relative(configFile), reason: ts.flattenDiagnosticMessageText(error.messageText, ' ') });
    }
    configs.set(configFile, { file: configFile, directory: path.dirname(configFile), options: parsed.options, files: new Set(parsed.fileNames.map((file) => path.resolve(file))) });
    for (const reference of parsed.projectReferences ?? []) {
      const target = reference.path.endsWith('.json') ? reference.path : path.join(reference.path, 'tsconfig.json');
      readConfig(target);
    }
  }
  const configPath = ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.json');
  if (configPath) readConfig(configPath);
  // Workspace packages can own an independent tsconfig even without a root
  // project reference. Only read config files, never package/application code.
  for (const { directory } of discovery.scope.directories) {
    const file = path.resolve(root, directory, 'tsconfig.json');
    if (fs.existsSync(file)) readConfig(file);
  }
  const availableConfigs = [...configs.values()].filter(Boolean);
  const configurationsForFile = (file) => {
    const matched = availableConfigs.filter((config) => config.files.has(file));
    if (matched.length) {
      const depth = Math.max(...matched.map((config) => config.directory.length));
      return matched.filter((config) => config.directory.length === depth);
    }
    const ancestors = availableConfigs.filter((config) => file.startsWith(config.directory + path.sep));
    ancestors.sort((a, b) => b.directory.length - a.directory.length);
    return ancestors.length ? [ancestors[0]] : [];
  };
  const configByFile = new Map(files.map((file) => [file, configurationsForFile(file)]));
  const rootOptions = configPath && configs.get(configPath)?.options || fallbackOptions;
  const options = { ...fallbackOptions, ...rootOptions, noEmit: true, skipLibCheck: true, allowJs: true };
  const resolutionCache = new Map();
  const ambiguousResolutions = new Map();
  const resolveModule = (name, file) => {
    const key = `${file}\0${name}`;
    if (resolutionCache.has(key)) return resolutionCache.get(key);
    const owning = configByFile.get(file) ?? configurationsForFile(file);
    const choices = owning.length ? owning.map((config) => config.options) : [options];
    const resolved = choices.map((compilerOptions) => ts.resolveModuleName(name, file, { ...fallbackOptions, ...compilerOptions, allowJs: true }, ts.sys).resolvedModule);
    const targets = new Map(resolved.filter(Boolean).map((result) => [result.resolvedFileName, result]));
    if (targets.size > 1 || targets.size && resolved.some((result) => !result)) {
      ambiguousResolutions.set(key, { file: relative(file), expression: name, reason: 'owning TypeScript configurations disagree on module resolution' });
    }
    const result = targets.size === 1 && !ambiguousResolutions.has(key) ? [...targets.values()][0] : undefined;
    resolutionCache.set(key, result);
    return result;
  };
  const host = ts.createCompilerHost(options);
  host.resolveModuleNames = (names, containingFile) => names.map((name) => resolveModule(name, containingFile));
  const program = ts.createProgram(files, options, host);
  const checker = program.getTypeChecker();
  const testFile = (file) => /(?:\.(?:test|spec)\.|(?:^|\/)(?:__tests__|tests?|cypress)\/)/.test(relative(file));
  const storyFile = (file) => /\.stories\./.test(file) || relative(file).startsWith('.storybook/');
  const html = path.join(root, 'index.html');
  const inferred = fs.existsSync(html)
    ? [...fs.readFileSync(html, 'utf8').matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/g)]
      .map((match) => path.resolve(root, match[1].replace(/^\//, ''))).filter((file) => fileSet.has(file))
    : [];
  const roots = (entries ?? inferred).map((file) => path.resolve(root, file));
  if (!roots.length || roots.some((file) => !fileSet.has(file))) throw new Error('Provide real application entry points using --entry=src/main.tsx (repeatable). Missing entries are not interpreted as an unused application.');
  const unresolved = configurationIssues.map((issue) => ({ file: relative(roots[0]), line: 1, expression: issue.file, reason: `TypeScript configuration needs review: ${issue.reason}` }));
  const graph = new Map();
  const builtins = new Set(builtinModules.flatMap((name) => [name, `node:${name.replace(/^node:/, '')}`]));
  const localModule = (name, file) => name.startsWith('.') || name.startsWith('/') || (configByFile.get(file) ?? []).some((config) => Object.keys(config.options.paths ?? {}).some((alias) => name.startsWith(alias.replace(/\*.*$/, ''))));
  for (const file of files) {
    const source = program.getSourceFile(file);
    if (!source) continue;
    const edges = new Map();
    const add = (target, node, kind, symbol) => {
      if (!target || target === file || !fileSet.has(target)) return;
      const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
      const key = `${target}:${line}:${kind}:${symbol ?? ''}`;
      edges.set(key, { file: target, line, kind, ...(symbol ? { symbol } : {}) });
    };
    const moduleTarget = (name, node, kind, load = true) => {
      const target = resolveModule(name, file)?.resolvedFileName;
      if (target && fileSet.has(target)) { if (load) add(target, node, kind); }
      else if ((!target || !/[/\\]node_modules[/\\]/.test(target)) && !builtins.has(name) && !/\.(?:css|scss|less|svg|png|jpe?g|gif|webp|json|wasm|woff2?|ttf)(?:\?.*)?$/.test(name)) {
        unresolved.push({ file: relative(file), line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, expression: name, reason: ambiguousResolutions.get(`${file}\0${name}`)?.reason ?? (localModule(name, file) ? 'unresolved local module' : 'unresolved module; local/workspace/external ownership requires review') });
      }
    };
    const addSymbol = (symbol, node) => {
      const seenExports = new Set();
      const selectedExport = (moduleFile, exportName) => {
        const key = `${moduleFile}:${exportName}`;
        if (seenExports.has(key)) return;
        seenExports.add(key);
        const moduleSource = program.getSourceFile(moduleFile);
        if (!moduleSource) return;
        for (const statement of moduleSource.statements) {
          if (!ts.isExportDeclaration(statement) || statement.isTypeOnly || !statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
          const named = statement.exportClause && ts.isNamedExports(statement.exportClause)
            ? statement.exportClause.elements.find((element) => !element.isTypeOnly && element.name.text === exportName) : undefined;
          if (statement.exportClause && !named) continue;
          const target = resolveModule(statement.moduleSpecifier.text, moduleFile)?.resolvedFileName;
          if (!target || !fileSet.has(target)) continue;
          if (!statement.exportClause) {
            const targetSource = program.getSourceFile(target);
            const targetModule = targetSource && checker.getSymbolAtLocation(targetSource);
            if (!targetModule || !checker.getExportsOfModule(targetModule).some((entry) => entry.name === exportName)) continue;
          }
          add(target, node, 'selected re-export path', exportName);
          selectedExport(target, named?.propertyName?.text ?? named?.name.text ?? exportName);
        }
      };
      for (const declaration of symbol?.declarations ?? []) {
        let parent = declaration;
        while (parent && !ts.isImportDeclaration(parent) && !ts.isSourceFile(parent)) parent = parent.parent;
        if (parent && ts.isImportDeclaration(parent) && ts.isStringLiteral(parent.moduleSpecifier)) {
          moduleTarget(parent.moduleSpecifier.text, node, 'used import path');
          const target = resolveModule(parent.moduleSpecifier.text, file)?.resolvedFileName;
          const exportName = ts.isImportSpecifier(declaration) ? declaration.propertyName?.text ?? declaration.name.text : ts.isImportClause(declaration) ? 'default' : undefined;
          if (target && fileSet.has(target) && exportName) selectedExport(target, exportName);
        }
      }
      const seen = new Set();
      while (symbol && symbol.flags & ts.SymbolFlags.Alias && !seen.has(symbol)) {
        seen.add(symbol);
        symbol = checker.getAliasedSymbol(symbol);
      }
      for (const declaration of symbol?.declarations ?? []) {
        let erased = false;
        for (let parent = declaration; parent && !ts.isSourceFile(parent); parent = parent.parent) {
          if (ts.isTypeNode(parent) || ts.isInterfaceDeclaration(parent) || ts.isTypeAliasDeclaration(parent)) { erased = true; break; }
        }
        if (!erased) add(declaration.getSourceFile().fileName, node, 'runtime symbol reference', symbol.getName());
      }
    };
    function visit(node) {
      if (ts.isTypeNode(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) return;
      if (ts.isImportDeclaration(node)) {
        if (!node.importClause && ts.isStringLiteral(node.moduleSpecifier)) moduleTarget(node.moduleSpecifier.text, node, 'side-effect import');
        else if (!node.importClause?.isTypeOnly && ts.isStringLiteral(node.moduleSpecifier)) {
          const bindings = node.importClause?.namedBindings;
          const onlyTypes = !node.importClause?.name && bindings && ts.isNamedImports(bindings) && bindings.elements.every((item) => item.isTypeOnly);
          if (!onlyTypes) moduleTarget(node.moduleSpecifier.text, node, 'import resolution', false);
        }
        return;
      }
      // The checker resolves requested symbols through re-export barrels.
      // Traversing every export here would falsely mark unused siblings used.
      if (ts.isExportDeclaration(node)) {
        if (!node.isTypeOnly && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) moduleTarget(node.moduleSpecifier.text, node, 're-export resolution', false);
        return;
      }
      if (ts.isCallExpression(node)) {
        const expression = node.expression.getText(source);
        if (node.expression.kind === ts.SyntaxKind.ImportKeyword || expression === 'require') {
          if (node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) moduleTarget(node.arguments[0].text, node, 'literal lazy/import');
          else unresolved.push({ file: relative(file), line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, expression, reason: 'dynamic module expression requires manual resolution' });
        }
        if (expression === 'import.meta.glob' || expression === 'import.meta.globEager') unresolved.push({ file: relative(file), line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, expression, reason: 'glob registry requires explicit expansion or runtime evidence' });
      }
      if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression)) {
        addSymbol(checker.getPropertyOfType(checker.getTypeAtLocation(node.expression), node.argumentExpression.text), node);
      }
      if (ts.isIdentifier(node)) {
        let symbol = ts.isShorthandPropertyAssignment(node.parent)
          ? checker.getShorthandAssignmentValueSymbol(node.parent)
          : checker.getSymbolAtLocation(node);
        const namespace = symbol?.declarations?.some((declaration) => ts.isNamespaceImport(declaration)
          && ts.isImportDeclaration(declaration.parent.parent)
          && ts.isStringLiteral(declaration.parent.parent.moduleSpecifier)
          && localModule(declaration.parent.parent.moduleSpecifier.text, file));
        const literalAccess = ts.isElementAccessExpression(node.parent) && node.parent.expression === node && ts.isStringLiteralLike(node.parent.argumentExpression);
        if (namespace && !literalAccess && !(ts.isPropertyAccessExpression(node.parent) && node.parent.expression === node)) {
          unresolved.push({ file: relative(file), line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, expression: node.parent.getText(source).slice(0, 160), reason: 'namespace passed or indexed dynamically; export usage requires inspection' });
        }
        addSymbol(symbol, node);
        if (!symbol?.declarations?.length && node.parent && ts.isElementAccessExpression(node.parent) && node.parent.expression === node) {
          unresolved.push({ file: relative(file), line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, expression: node.parent.getText(source).slice(0, 160), reason: 'computed registry access requires inspection' });
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    graph.set(file, [...edges.values()]);
  }
  const trace = (starts, application = false) => {
    const found = new Map(starts.map((file) => [file, [relative(file)]]));
    const queue = [...starts];
    for (let i = 0; i < queue.length; i++) for (const edge of graph.get(queue[i]) ?? []) {
      if (application && (testFile(edge.file) || storyFile(edge.file))) continue;
      if (!found.has(edge.file)) { found.set(edge.file, [...found.get(queue[i]), relative(edge.file)]); queue.push(edge.file); }
    }
    return found;
  };
  const app = trace(roots, true);
  const stories = trace(files.filter(storyFile));
  const tests = trace(files.filter(testFile));
  const publicFiles = publicEntries.map((file) => path.resolve(root, file));
  const exported = new Set();
  for (const file of publicFiles) {
    const source = program.getSourceFile(file);
    if (!source) throw new Error(`Public entry does not exist: ${relative(file)}`);
    exported.add(file);
    const module = checker.getSymbolAtLocation(source);
    for (let symbol of module ? checker.getExportsOfModule(module) : []) {
      if (symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
      for (const declaration of symbol.declarations ?? []) exported.add(declaration.getSourceFile().fileName);
    }
  }
  // An earlier catalog is supplemental evidence, never the boundary of discovery.
  const supplied = inventory ? JSON.parse(fs.readFileSync(path.resolve(root, inventory), 'utf8')).entries.map((entry) => path.resolve(root, entry.file)) : [];
  const missingInventoryFiles = supplied.filter((file) => !fileSet.has(file)).map(relative);
  const candidates = [...discovery.entries.map((entry) => path.resolve(root, entry.file)), ...supplied];
  const candidateInfo = new Map(discovery.entries.map((entry) => [entry.file, entry]));
  const activeUnresolved = unresolved.filter((item) => app.has(path.resolve(root, item.file)));
  const records = [...new Set(candidates)].filter((file) => fileSet.has(file)).map((file) => {
    const appPath = app.get(file);
    const status = appPath ? 'app-reachable' : activeUnresolved.length ? 'uncertain' : exported.has(file) ? 'public-api-only' : stories.has(file) && tests.has(file) ? 'stories-and-tests-only' : stories.has(file) ? 'stories-only' : tests.has(file) ? 'tests-only' : 'no-detected-reference';
    const incoming = [];
    for (const [from, edges] of graph) for (const edge of edges) if (edge.file === file) incoming.push({ file: relative(from), line: edge.line, kind: edge.kind, symbol: edge.symbol, reachableFromApp: app.has(from) });
    const detail = candidateInfo.get(relative(file));
    return { file: relative(file), candidateKind: detail?.kind ?? 'supplemental-inventory', localComponents: detail?.localComponents ?? [], status, appPath: appPath ?? null, storyPath: stories.get(file) ?? null, testPath: tests.get(file) ?? null, publicExport: exported.has(file), incoming, runtimeObservation: 'not-measured', removalDecision: 'not-authorized-by-this-report' };
  }).sort((a,b) => a.file.localeCompare(b.file));
  const summary = records.reduce((counts, item) => { counts[item.status] = (counts[item.status] ?? 0) + 1; return counts; }, {});
  return {
    schemaVersion: 2,
    method: 'Static value-symbol reachability from actual app entries, plus literal lazy imports. Type positions are excluded; the TypeScript checker resolves aliases and selected re-exports. Story/test roots are reported separately. Reachable means potentially used, not observed rendering or invocation frequency.',
    limitations: ['All runtime references in a reachable module are considered, including inactive branches and locally unused functions.', 'Dynamic imports, glob registries and unresolved local modules require inspection; unresolved app edges prevent definitive negative classifications.', 'This file-level report does not prove every export or variant in a module is used.', 'Public entry points must be supplied explicitly when external consumers exist; no inferred deletion permission.', 'No telemetry is collected and application modules are never executed.'],
    scope: discovery.scope, discoverySummary: discovery.summary, discoverySourceHash: discovery.sourceHash, missingInventoryFiles, configurationIssues,
    appEntries: roots.map(relative), publicEntries: publicFiles.map(relative),
    sourceHash: createHash('sha256').update(files.filter(inside).sort().map((file) => relative(file) + '\0' + fs.readFileSync(file, 'utf8')).join('\0')).digest('hex'),
    summary, total: records.length, unresolvedAppEdges: activeUnresolved, unresolvedOtherEdges: unresolved.filter((item) => !app.has(path.resolve(root,item.file))), entries: records,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const get = (name) => args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
  const getAll = (name) => args.filter((arg) => arg.startsWith(`--${name}=`)).map((arg) => arg.slice(name.length + 3));
  const root = path.resolve(get('root') ?? process.cwd());
  const entries = getAll('entry');
  const report = auditComponentUsage({ root, entries: entries.length ? entries : undefined, inventory: get('inventory'), publicEntries: getAll('public-entry') });
  const out = path.resolve(root, get('out') ?? 'docs/systemization/component-usage.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ output: out, total: report.total, summary: report.summary, unresolvedAppEdges: report.unresolvedAppEdges.length }));
}
