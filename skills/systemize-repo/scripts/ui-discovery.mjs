#!/usr/bin/env node
// Candidate discovery, not an automatic migration or a semantic equivalence proof.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const hash = (value) => createHash('sha256').update(value).digest('hex');
const ignoredDirectories = new Set(['node_modules', '.git', '.next', '.turbo', '.cache', '.codex', '.claude', '.agents', 'dist', 'build', 'coverage', 'storybook-static', 'vendor']);
const isScript = (file) => /\.[cm]?[jt]sx?$/.test(file) && !/\.d\.[cm]?ts$/.test(file);
const isExample = (file) => /\.(stories|examples|test|spec)\.[^.]+$/.test(file) || /(?:^|\/)(?:__tests__|tests?|cypress|\.storybook)\//.test(file);
const designProperty = /^(?:color|background\w*|border\w*|outline\w*|boxShadow|textShadow|font\w*|lineHeight|letterSpacing|opacity|width|height|minWidth|maxWidth|minHeight|maxHeight|gap|rowGap|columnGap|padding\w*|margin\w*|top|left|right|bottom|inset\w*|transition\w*|animation\w*)$/;
const designUtility = /^(?:(?:[\w-]+):)*(?:-?(?:p[trblxy]?|m[trblxy]?|gap(?:-[xy])?|space-[xy]|w|min-w|max-w|h|min-h|max-h|size|top|left|right|bottom|inset|rounded(?:-[trbl]{1,2})?|border(?:-[trblxy])?|shadow|opacity|duration|delay|tracking|leading|text|bg|fill|stroke|ring|outline|font))-(?:\d[\w./-]*|\[[^\]]+\]|(?:red|blue|green|amber|gray|slate|zinc|neutral|orange|yellow|cyan|violet|purple|pink|emerald|teal|indigo)-\d+(?:\/\d+)?|white|black|xs|sm|base|lg|xl|[2-9]xl|none|full)$/;

export function discoverUI({ root }) {
  root = path.resolve(root);
  let ts;
  try { ts = createRequire(path.join(root, 'package.json'))('typescript'); }
  catch { throw new Error('UI discovery requires the target repository’s installed TypeScript. No source modules are executed.'); }
  const relative = (file) => path.relative(root, file).split(path.sep).join('/');
  const directories = [], skipped = [], sourceFiles = [], entries = [], findings = [], blocks = [];
  const all = [];
  function walk(dir) {
    const children = fs.readdirSync(dir, { withFileTypes: true });
    directories.push({ directory: relative(dir) || '.', files: children.filter((item) => item.isFile()).length });
    for (const item of children) {
      const file = path.join(dir, item.name), name = relative(file);
      if (item.isSymbolicLink()) { skipped.push({ path: name, reason: 'symbolic link; resolve its ownership and target separately' }); continue; }
      if (item.isDirectory()) {
        if (ignoredDirectories.has(item.name)) skipped.push({ path: name, reason: 'dependency, output, VCS or agent metadata directory; verify this classification for the target project' });
        else walk(file);
      } else all.push(file);
    }
  }
  walk(root);
  const fingerprintFiles = [];
  for (const file of all.sort()) {
    const name = relative(file);
    const script = isScript(name), stylesheet = /\.(?:css|scss|sass|less)$/.test(name), unsupported = /\.(?:vue|svelte|astro|html|mdx|hbs|handlebars|ejs|pug)$/.test(name);
    if (!script && !stylesheet && !unsupported) continue;
    const content = fs.readFileSync(file, 'utf8');
    const example = isExample(name);
    const generated = /(?:^|\n)\s*(?:(?:\/\*+|\/\/|\*|<!--)\s*)?(?:@generated|auto[- ]generated|generated file|this file is generated)\b/i.test(content.slice(0, 800));
    fingerprintFiles.push(`${name}\0${content}`);
    sourceFiles.push({ file: name, kind: script ? 'script' : stylesheet ? 'stylesheet' : 'unsupported-template', role: generated ? 'generated-review-owner' : example ? 'story-test-example' : 'production-candidate', hash: hash(content) });
    if (generated) { skipped.push({ path: name, reason: 'generated header: inspect generator and source of truth before migration' }); continue; }
    if (example) continue;
    if (unsupported) {
      findings.push({ id: hash(`${name}:adapter`).slice(0, 16), file: name, line: 1, kind: 'framework-review', detail: 'Template requires a framework-aware review; not parsed as React JSX.', status: 'unreviewed' });
      continue;
    }
    const occurrences = new Map();
    const add = (kind, line, detail, extra = {}) => {
      const base = `${name}:${line}:${kind}:${detail}`;
      const occurrence = occurrences.get(base) ?? 0;
      occurrences.set(base, occurrence + 1);
      findings.push({ id: hash(occurrence ? `${base}:occurrence:${occurrence}` : base).slice(0,16), file: name, line, kind, detail, status: 'unreviewed', ...extra });
    };
    if (stylesheet) {
      content.split('\n').forEach((line, index) => {
        if (/^\s*(?:\/\/|\/\*|\*)/.test(line)) return;
        const values = line.match(/#[\da-f]{3,8}\b|\b(?:rgb|hsl|oklch|oklab)a?\([^;]+?\)|-?\b\d+(?:\.\d+)?(?:px|rem|em|ms|s|vh|vw)\b/gi);
        if (values) add('style-literal', index + 1, line.trim().slice(0, 240), { values, decisionNeeded: 'primitive definition, approved exception, runtime geometry or consumer migration' });
      });
      continue;
    }
    const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, /\.[jt]sx$/.test(file) ? ts.ScriptKind.TSX : undefined);
    const lineOf = (node) => source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    const symbols = [], uses = [], roots = [];
    let nativeCount = 0, jsxCount = 0, reactFactory = false;
    const sourceText = (node) => node.getText(source).slice(0, 180);
    function inspect(node) {
      if (ts.isFunctionDeclaration(node) && node.name && /^[A-Z]/.test(node.name.text)) symbols.push({ name: node.name.text, line: lineOf(node), exported: !!node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) });
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && /^[A-Z]/.test(node.name.text) && node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer) || ts.isCallExpression(node.initializer))) symbols.push({ name: node.name.text, line: lineOf(node), exported: ts.isVariableDeclarationList(node.parent) && ts.isVariableStatement(node.parent.parent) && !!node.parent.parent.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) });
      if (ts.isCallExpression(node) && /(?:^|\.)createElement$/.test(node.expression.getText(source))) reactFactory = true;
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(source);
        jsxCount++;
        if (/^[a-z]/.test(tag)) nativeCount++;
        else uses.push({ name: tag, line: lineOf(node) });
      }
      if ((ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) && !ts.isJsxElement(node.parent) && !ts.isJsxFragment(node.parent)) roots.push(node);
      if (ts.isJsxAttribute(node) && node.name.getText(source) === 'className' && node.initializer) {
        const values = [];
        const strings = (part) => { if (ts.isStringLiteralLike(part)) values.push(...part.text.split(/\s+/).filter((v) => designUtility.test(v))); ts.forEachChild(part, strings); };
        strings(node.initializer);
        if (values.length) add('utility-design-value', lineOf(node), sourceText(node), { values: [...new Set(values)], decisionNeeded: 'inspect configured utility meaning and component/group ownership before replacing' });
      }
      if (ts.isJsxAttribute(node) && node.name.getText(source) === 'style' && node.initializer) {
        const inspectStyle = (part) => {
          if (ts.isPropertyAssignment(part) && designProperty.test(part.name.getText(source).replace(/['"]/g, ''))) {
            const value = part.initializer;
            const staticValue = ts.isNumericLiteral(value) || ts.isStringLiteralLike(value) || ts.isPrefixUnaryExpression(value) && ts.isNumericLiteral(value.operand);
            if (staticValue && !/\bvar\(--/.test(value.getText(source))) add('inline-design-value', lineOf(part), sourceText(part), { decisionNeeded: 'verify design default versus data/measurement; preserve exact value during token migration' });
          }
          ts.forEachChild(part, inspectStyle);
        };
        inspectStyle(node.initializer);
      }
      if (ts.isCallExpression(node) && /(?:^|\.)(?:cva|tv)$/.test(node.expression.getText(source))) add('variant-style-map', lineOf(node), sourceText(node), { decisionNeeded: 'reconcile variants and defaults with owning public component API and docs' });
      ts.forEachChild(node, inspect);
    }
    inspect(source);
    for (const node of roots) {
      const shape = [], native = [];
      function shapeOf(part) {
        if (ts.isJsxOpeningElement(part) || ts.isJsxSelfClosingElement(part)) {
          const tag = part.tagName.getText(source);
          shape.push([tag, part.attributes.properties.filter(ts.isJsxAttribute).map((attr) => attr.name.getText(source)).sort()]);
          if (/^[a-z]/.test(tag)) native.push(tag);
        }
        ts.forEachChild(part, shapeOf);
      }
      shapeOf(node);
      if (shape.length >= 4 && native.length >= 2) {
        const fingerprint = hash(JSON.stringify(shape));
        const record = { file: name, line: lineOf(node), endLine: source.getLineAndCharacterOfPosition(node.end).line + 1, nodeCount: shape.length, nativeTags: [...new Set(native)], fingerprint };
        blocks.push(record);
        add('inline-ui', record.line, `Inline composition with ${shape.length} elements; native elements include ${record.nativeTags.join(', ')}.`, { endLine: record.endLine, fingerprint, decisionNeeded: 'reuse a component, extend a supported variant, extract a pattern or retain deliberate host composition' });
      }
    }
    if (/\.[jt]sx$/.test(file) || jsxCount || reactFactory || symbols.length) entries.push({ file: name, kind: jsxCount || reactFactory ? 'rendering-source' : 'component-or-support-candidate', localComponents: symbols, componentUses: uses, jsxElements: jsxCount, nativeElements: nativeCount, classification: 'needs-family-review' });
  }
  const groups = new Map();
  for (const block of blocks) { if (!groups.has(block.fingerprint)) groups.set(block.fingerprint, []); groups.get(block.fingerprint).push(block); }
  const repetitions = [...groups].filter(([, group]) => group.length > 1).map(([fingerprint, occurrences]) => ({ fingerprint, occurrences, status: 'unreviewed', meaning: 'Similar JSX anatomy only; compare selection, event timing, API, providers, permissions and styling before consolidation.' }));
  return {
    schemaVersion: 1,
    method: 'Whole repository directory walk with recorded exclusions; React/JSX syntax, component references, inline UI, static design-value and structural repetition candidates. Source is never executed.',
    sourceHash: hash(fingerprintFiles.join('\0')),
    scope: { root: '.', directories, skipped, scopeReview: 'required', frameworks: 'TypeScript/JavaScript JSX and CSS; other templates explicitly reported for manual/framework-aware discovery' },
    summary: { scannedDirectories: directories.length, inspectedSourceFiles: sourceFiles.length, productionSourceFiles: sourceFiles.filter((f) => f.role === 'production-candidate').length, uiCandidateFiles: entries.length, findings: findings.length, repeatedStructures: repetitions.length, unsupportedTemplates: sourceFiles.filter((f) => f.kind === 'unsupported-template').length },
    limitations: ['Folder names do not determine whether a UI implementation is reusable.', 'Candidates are not confirmed defects and must receive source and rendered review.', 'JSX structure ignores expression contents; similar structure does not prove equivalent behavior.', 'CSS-in-JS factories, computed styles, template engines, runtime registries and unsupported frameworks require additional inspection.', 'A scanned file or existing story does not establish API, token, migration or rendered coverage.'],
    sourceFiles, entries, findings, repetitions,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const get = (name) => process.argv.slice(2).find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
  const root = path.resolve(get('root') ?? process.cwd());
  const report = discoverUI({ root });
  const out = path.resolve(root, get('out') ?? 'docs/systemization/ui-discovery.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ output: out, ...report.summary }));
}
