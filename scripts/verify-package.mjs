import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { build } from 'vite';

// Run after build:package. The fixture intentionally has no source alias, Tailwind
// plugin, or access to the repository's node_modules during module resolution.
const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const manifest = JSON.parse(await readFile(join(repository, 'package.json'), 'utf8'));
const arguments_ = process.argv.slice(2);
assert(
  arguments_.length === 0 || (arguments_.length === 2 && arguments_[0] === '--tarball'),
  'Usage: node scripts/verify-package.mjs [--tarball /path/to/package.tgz]',
);
assert(manifest.exports?.['.'], 'Build the publishable package before running this check.');

const temporary = await mkdtemp(join(tmpdir(), 'aegis-package-consumer-'));
const consumer = join(temporary, 'consumer');
const report = { package: manifest.name, version: manifest.version, checks: [], themes: [] };
const publicBase = '/consumer/';
let browser;
let server;
let headlessServer;
let succeeded = false;

function run(command, arguments_, cwd, timeout = 180_000) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, arguments_, {
      cwd,
      env: { ...process.env, CI: '1', NO_COLOR: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    let stdout = '';
    const append = (chunk) => {
      output = (output + chunk.toString()).slice(-1_000_000);
    };
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      append(chunk);
    });
    child.stderr.on('data', append);
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`${command} exceeded ${timeout / 1000}s.\n${output}`));
    }, timeout);
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once('close', (code, signal) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(`${command} failed (${code ?? signal}).\n${output}`));
      else resolveRun(stdout);
    });
  });
}

function passed(name) {
  report.checks.push(name);
  console.log(`✓ ${name}`);
}

async function serve(directory) {
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
  };
  const http = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
      if (!pathname.startsWith(publicBase)) {
        response.writeHead(404).end('Not found');
        return;
      }
      const file = resolve(directory, pathname.slice(publicBase.length) || 'index.html');
      const relativePath = relative(directory, file);
      if (relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
        response.writeHead(403).end();
        return;
      }
      const content = await readFile(file);
      response.writeHead(200, {
        'Content-Type': types[extname(file)] ?? 'application/octet-stream',
      });
      response.end(content);
    } catch {
      response.writeHead(404).end('Not found');
    }
  });
  await new Promise((resolveListen, reject) => {
    http.once('error', reject);
    http.listen(0, '127.0.0.1', resolveListen);
  });
  return http;
}

try {
  await mkdir(consumer);
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  let tarball;
  if (arguments_.length) {
    tarball = resolve(arguments_[1]);
    assert((await stat(tarball)).isFile(), 'The tarball argument must be a file.');
  } else {
    console.log('Packing the existing package build…');
    const packed = JSON.parse(
      await run(
        npm,
        ['pack', '--ignore-scripts', '--json', '--pack-destination', temporary],
        repository,
      ),
    );
    assert.equal(packed.length, 1, 'Expected exactly one package tarball.');
    tarball = join(temporary, packed[0].filename);
  }

  await writeFile(
    join(consumer, 'package.json'),
    JSON.stringify(
      {
        name: 'aegis-isolated-consumer',
        private: true,
        type: 'module',
        dependencies: {
          [manifest.name]: `file:${tarball}`,
          react: manifest.peerDependencies.react,
          'react-dom': manifest.peerDependencies['react-dom'],
        },
        devDependencies: {
          '@types/react': '^19.0.0',
          '@types/react-dom': '^19.0.0',
        },
      },
      null,
      2,
    ),
  );
  console.log('Installing the tarball into a fresh consumer…');
  await run(
    npm,
    ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--prefer-online'],
    consumer,
  );
  const installed = JSON.parse(
    await readFile(join(consumer, 'node_modules', manifest.name, 'package.json'), 'utf8'),
  );
  assert.equal(installed.name, manifest.name);
  assert.equal(
    installed.version,
    manifest.version,
    'The tarball version must match this checkout.',
  );
  function exportTargets(mapping) {
    if (typeof mapping === 'string') return [mapping];
    if (mapping === null) return [];
    return Object.values(mapping).flatMap(exportTargets);
  }
  for (const target of new Set(exportTargets(installed.exports))) {
    assert(
      !target.includes('*'),
      'Add concrete export fixtures before introducing wildcard exports.',
    );
    assert(
      (await stat(join(consumer, 'node_modules', manifest.name, target))).isFile(),
      `The tarball is missing public export ${target}.`,
    );
  }
  passed('Tarball installs with React peers and all public export files');
  const exportedTokens = await readFile(
    join(consumer, 'node_modules', manifest.name, installed.exports['./tokens.css']),
    'utf8',
  );
  const primitiveSource = await readFile(
    join(repository, 'src/styles/primitive-color-tokens.css'),
    'utf8',
  );
  const tokenNames = (source, pattern) =>
    [...new Set([...source.matchAll(pattern)].map((match) => match[1]))].sort();
  for (const pattern of [
    /(--color-[a-z]+-(?:50|[1-9]00|1[0-3]00))\s*:/g,
    /(--color-[a-z]+-(?:300|700)-alpha-\d{2})\s*:/g,
  ]) {
    const expected = tokenNames(primitiveSource, pattern);
    assert(expected.length > 0, 'The source primitive ramp must not be empty.');
    assert.deepEqual(
      tokenNames(exportedTokens, pattern),
      expected,
      'The token-only export must contain every generated primitive ramp and alpha alias.',
    );
  }
  for (const name of [
    '--opacity-05',
    '--opacity-95',
    '--opacity-32',
    '--opacity-65',
    '--color-white',
    '--color-black',
    '--color-transparent',
    '--shadow-popover',
    '--shadow-dialog',
    '--drop-shadow-md',
  ])
    assert(exportedTokens.includes(`${name}:`), `The token-only export is missing ${name}.`);
  passed(
    'Token-only export includes all primitive/alpha colors, opacity stops and elevation aliases',
  );
  assert(
    installed.exports['./token-manifest.json'],
    'The canonical token manifest must have a public data export.',
  );
  const exportedTokenManifest = JSON.parse(
    await readFile(
      join(consumer, 'node_modules', manifest.name, installed.exports['./token-manifest.json']),
      'utf8',
    ),
  );
  const sourceTokenManifest = JSON.parse(
    await readFile(join(repository, 'tokens/design-tokens.json'), 'utf8'),
  );
  const exportedStyles = await readFile(
    join(consumer, 'node_modules', manifest.name, installed.exports['./styles.css']),
    'utf8',
  );
  assert.deepEqual(
    exportedTokenManifest,
    sourceTokenManifest,
    'The packaged canonical manifest must match its source.',
  );
  assert.equal(exportedTokenManifest.configurations.length, 4);
  for (const [name, token] of Object.entries(exportedTokenManifest.tokens)) {
    if (token.scope === 'local') {
      assert(
        !exportedTokens.includes(`${name}:`),
        `Local group ${name} must not become a global token-only default.`,
      );
      assert(
        exportedStyles.includes(`${name}:`),
        `The component stylesheet must declare local group ${name}.`,
      );
    } else {
      assert(
        exportedTokens.includes(`${name}:`),
        `The token-only export is missing canonical token ${name}.`,
      );
    }
    if (token.tier === 'semantic')
      assert.deepEqual(
        Object.keys(token.mappings).sort(),
        [...exportedTokenManifest.configurations].sort(),
        `${name} needs all four explicit mappings.`,
      );
  }
  passed('Canonical token manifest and four-configuration token CSS are packaged together');

  const imports = Object.keys(installed.exports).filter(
    (entry) => !entry.includes('*') && !entry.endsWith('.css') && !entry.endsWith('.json'),
  );
  const publicImportChecks = imports
    .map((entry, index) => {
      const specifier = entry === '.' ? manifest.name : `${manifest.name}/${entry.slice(2)}`;
      return `export type PublicEntry${index} = typeof import(${JSON.stringify(specifier)});`;
    })
    .join('\n');
  const packageName = JSON.stringify(manifest.name);
  const specifier = (subpath) => JSON.stringify(`${manifest.name}/${subpath}`);
  await writeFile(
    join(consumer, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        moduleResolution: 'Bundler',
        jsx: 'react-jsx',
        strict: true,
        skipLibCheck: false,
        noEmit: true,
        types: ['react', 'react-dom'],
      },
      include: ['consumer.tsx', 'public-exports.ts', 'headless/consumer.tsx'],
    }),
  );
  await writeFile(join(consumer, 'public-exports.ts'), publicImportChecks);
  await writeFile(
    join(consumer, 'consumer.tsx'),
    `import { useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Field, Select, Modal, type ButtonProps, type SelectOption } from ${packageName};
import { TextInput } from ${specifier('text-input')};
import { Check } from ${specifier('icons')};
import { AwsLogo } from ${specifier('aws-logo')};
import { applyTheme, applyLayoutTheme, type Theme } from ${specifier('theme')};
import type { RecordSource } from ${specifier('types')};
import ${specifier('reset.css')};
import ${specifier('styles.css')};
import ${specifier('fonts.css')};
import './consumer.css';

const buttonProps = { intent: 'function', size: 'md', emphasis: 'primary' } satisfies ButtonProps;
// A public component must retain its narrow prop types, not silently become any.
// @ts-expect-error Invalid sizes must remain rejected by the published declarations.
const invalidButtonProps: ButtonProps = { size: 'enormous' };
void invalidButtonProps;
const sources: RecordSource[] = ['Projects', 'Billing'];
const options: SelectOption[] = sources.map((source) => ({ value: source, label: source }));

function Consumer(): ReactNode {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('');
  const [source, setSource] = useState('Projects');
  const [theme, setTheme] = useState<Theme>('light');
  return (
    <main>
      <h1>Installed Aegis consumer</h1>
      <AwsLogo name="service-amazon-ec2" />
      <Button onClick={() => {
        const next = theme === 'light' ? 'dark' : 'light';
        applyTheme(next, { persist: false });
        setTheme(next);
      }}>Theme: {theme}</Button>
      <Button {...buttonProps} leadingIcon={<Check aria-hidden="true" />} onClick={() => setCount(count + 1)}>
        Count: {count}
      </Button>
      <Field label="Member name" helpText="Use your display name.">
        <TextInput value={name} onValueChange={setName} />
      </Field>
      <p role="status">Member: {name || 'Unassigned'}</p>
      <Select label="Data source" options={options} value={source} onValueChange={setSource} />
      <p data-testid="source">Selected source: {source}</p>
      <Modal title="Review changes" description="A portaled package dialog." size="small"
        trigger={<Button>Open review</Button>}>
        <TextInput label="Review note" defaultValue="Verified from the installed package" />
      </Modal>
    </main>
  );
}
applyTheme('light', { persist: false });
applyLayoutTheme('fundamental-floating', { persist: false });
createRoot(document.getElementById('root')!).render(<Consumer />);
`,
  );
  await writeFile(
    join(consumer, 'consumer.css'),
    `body { margin: 0; background: var(--color-bg-canvas); color: var(--color-text-primary); font-family: var(--font-ui); }
main { max-width: 640px; padding: 24px; display: flex; flex-direction: column; align-items: stretch; gap: 16px; }
h1 { font-size: 24px; }`,
  );
  await writeFile(
    join(consumer, 'index.html'),
    '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Aegis package consumer</title><link rel="icon" href="data:,"></head><body><div id="root"></div><script type="module" src="/consumer.tsx"></script></body></html>',
  );
  assert(
    installed.exports['./primitives'],
    'The package must expose the unstyled primitives entry.',
  );
  const headless = join(consumer, 'headless');
  await mkdir(headless);
  await writeFile(
    join(headless, 'consumer.tsx'),
    `import { useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Checkbox } from ${specifier('primitives')};

// This consumer deliberately imports no Aegis CSS, reset, fonts, theme, or tokens.
function HeadlessConsumer(): ReactNode {
  const [count, setCount] = useState(0);
  const [checked, setChecked] = useState(false);
  const [submitted, setSubmitted] = useState('Not submitted');
  return (
    <main>
      <h1>Unstyled Aegis primitives</h1>
      <Button onClick={() => setCount((current) => current + 1)}>Count: {count}</Button>
      <form onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(new FormData(event.currentTarget).get('updates') === 'enabled' ? 'Enabled' : 'Disabled');
      }}>
        <label>
          <Checkbox.Root name="updates" value="enabled" checked={checked} onCheckedChange={setChecked}>
            <Checkbox.Indicator>✓</Checkbox.Indicator>
          </Checkbox.Root>
          Receive project updates
        </label>
        <p role="status">Updates: {checked ? 'enabled' : 'disabled'}</p>
        <Button type="submit">Save preferences</Button>
      </form>
      <p data-testid="submitted">{submitted}</p>
    </main>
  );
}
createRoot(document.getElementById('root')!).render(<HeadlessConsumer />);
`,
  );
  await writeFile(
    join(headless, 'index.html'),
    '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Headless package consumer</title><link rel="icon" href="data:,"></head><body><div id="root"></div><script type="module" src="/consumer.tsx"></script></body></html>',
  );
  await run(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', consumer], consumer);
  passed(`Strict consumer TypeScript resolves ${imports.length} public entry points`);

  await writeFile(
    join(consumer, 'ssr.mjs'),
    `import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { Button } from ${specifier('button')};
const html = renderToString(createElement(Button, { intent: 'function' }, 'Server-rendered action'));
assert.match(html, /<button/);
assert.match(html, /Server-rendered action/);
assert.match(html, /aegis-button/);
`,
  );
  await run(process.execPath, ['ssr.mjs'], consumer);
  passed('Direct Button entry renders on the server without DOM globals');

  await build({
    root: consumer,
    base: publicBase,
    configFile: false,
    publicDir: false,
    logLevel: 'warn',
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rolldownOptions: {
        onwarn(warning, defaultHandler) {
          // Client directives are meaningful to RSC hosts, but this fixture is a SPA.
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes('use client'))
            return;
          defaultHandler(warning);
        },
      },
    },
  });
  passed('Production Vite bundle uses only published package imports and CSS');
  server = await serve(join(consumer, 'dist'));
  const address = server.address();
  assert(address && typeof address === 'object');
  browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1000, height: 900 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const errors = [];
  const failedResponses = [];
  report.browserErrors = errors;
  report.failedResponses = failedResponses;
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('requestfailed', (request) =>
    errors.push(`${request.url()}: ${request.failure()?.errorText}`),
  );
  page.on('response', (response) => {
    if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
  });
  await page.goto(`http://127.0.0.1:${address.port}${publicBase}`);
  await expect(page.getByRole('heading', { name: 'Installed Aegis consumer' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const lightBackground = await page
    .locator('body')
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  const action = page.getByRole('button', { name: 'Count: 0' });
  await expect(action).toHaveCSS('height', '34px');
  await expect(page.getByRole('img', { name: 'Amazon EC2' })).toBeVisible();
  await expect
    .poll(() =>
      page.getByRole('img', { name: 'Amazon EC2' }).evaluate((element) => element.naturalWidth),
    )
    .toBeGreaterThan(0);
  assert(await page.evaluate(() => document.fonts.check('14px Figtree')));
  assert(
    await page.evaluate(() =>
      [...document.fonts].some(
        (font) => font.family.includes('Figtree') && font.status === 'loaded',
      ),
    ),
  );
  await action.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Count: 1' })).toBeFocused();
  const member = page.getByRole('textbox', { name: 'Member name' });
  await expect(member).toHaveAccessibleDescription('Use your display name.');
  await member.fill('Alex Morgan');
  await expect(page.getByRole('status')).toHaveText('Member: Alex Morgan');

  for (const theme of ['light', 'dark']) {
    if (theme === 'dark') await page.getByRole('button', { name: 'Theme: light' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const select = page.getByRole('combobox', { name: 'Data source' });
    await select.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('listbox')).toBeVisible();
    await expect(
      page.getByRole('option', { name: theme === 'light' ? 'Projects' : 'Billing', exact: true }),
    ).toBeFocused();
    await page.keyboard.press(theme === 'light' ? 'End' : 'Home');
    await expect(
      page.getByRole('option', { name: theme === 'light' ? 'Billing' : 'Projects', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(select).toBeFocused();
    await expect(page.getByTestId('source')).toHaveText(
      `Selected source: ${theme === 'light' ? 'Billing' : 'Projects'}`,
    );
    const opener = page.getByRole('button', { name: 'Open review' });
    await opener.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Review changes' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('textbox', { name: 'Review note' })).toHaveValue(
      'Verified from the installed package',
    );
    const close = dialog.getByRole('button', { name: 'Close dialog' });
    const lastControl = dialog.getByRole('textbox', { name: 'Review note' });
    await expect(close).toBeFocused();
    await lastControl.focus();
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(lastControl).toBeFocused();
    const overlayAxe = await new AxeBuilder({ page })
      // Base UI's aria-hidden focus sentinels implement the native traversal checked above.
      .exclude('[data-base-ui-focus-guard]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    assert.deepEqual(
      overlayAxe.violations.map(({ id }) => id),
      [],
      `${theme} modal accessibility violations`,
    );
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    assert.deepEqual(
      axe.violations.map(({ id }) => id),
      [],
      `${theme} consumer accessibility violations`,
    );
    report.themes.push({ theme, violations: 0, modalViolations: 0 });
  }
  const darkBackground = await page
    .locator('body')
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  assert.notEqual(
    lightBackground,
    darkBackground,
    'Published light/dark tokens must change the rendered surface.',
  );
  assert.deepEqual(errors, [], 'The production consumer must not emit runtime or asset errors.');
  assert.deepEqual(failedResponses, [], 'Every production asset, including fonts, must load.');
  passed(
    'Light/dark behavior, Field semantics, Select keyboard, Modal focus trap, SVG/fonts, and accessibility',
  );
  // A separate production graph and fresh browser context prove the headless
  // entry does not inherit styles or tokens from the styled consumer above.
  const headlessBuild = await build({
    root: headless,
    base: publicBase,
    configFile: false,
    publicDir: false,
    logLevel: 'warn',
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rolldownOptions: {
        onwarn(warning, defaultHandler) {
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes('use client'))
            return;
          defaultHandler(warning);
        },
      },
    },
  });
  const headlessOutput = (Array.isArray(headlessBuild) ? headlessBuild : [headlessBuild]).flatMap(
    (result) => ('output' in result ? result.output : []),
  );
  assert(headlessOutput.length > 0, 'The headless production build must emit files.');
  const headlessModules = headlessOutput
    .filter((output) => output.type === 'chunk')
    .flatMap((output) => Object.keys(output.modules));
  const packageDirectory = join(consumer, 'node_modules', manifest.name).replaceAll('\\', '/');
  const packageModules = headlessModules.filter((id) =>
    id.replaceAll('\\', '/').startsWith(packageDirectory),
  );
  assert(
    packageModules.every((id) => id.endsWith('/lib-dist/primitives.js')),
    `Headless composition imported styled package modules: ${packageModules.join(', ')}`,
  );
  assert(
    !headlessOutput.some((output) => output.fileName.endsWith('.css')),
    'Headless composition must not generate a CSS asset.',
  );
  for (const output of headlessOutput) {
    if (output.type !== 'chunk') continue;
    assert(
      !output.code.includes('--color-bg-canvas'),
      'Headless bundle must not embed design tokens.',
    );
    assert(
      !output.code.includes('aegis-button'),
      'Headless bundle must not embed styled components.',
    );
  }
  passed(
    'Headless Button/Checkbox production graph contains no styled package modules or CSS assets',
  );
  headlessServer = await serve(join(headless, 'dist'));
  const headlessAddress = headlessServer.address();
  assert(headlessAddress && typeof headlessAddress === 'object');
  const headlessContext = await browser.newContext();
  const headlessPage = await headlessContext.newPage();
  const headlessErrors = [];
  const stylesheetRequests = [];
  headlessPage.on('pageerror', (error) => headlessErrors.push(error.message));
  headlessPage.on('console', (message) => {
    if (message.type() === 'error') headlessErrors.push(message.text());
  });
  headlessPage.on('request', (request) => {
    if (request.resourceType() === 'stylesheet') stylesheetRequests.push(request.url());
  });
  headlessPage.on('requestfailed', (request) => headlessErrors.push(request.url()));
  headlessPage.on('response', (response) => {
    if (response.status() >= 400) headlessErrors.push(`${response.status()} ${response.url()}`);
  });
  await headlessPage.goto(`http://127.0.0.1:${headlessAddress.port}${publicBase}`);
  await expect(
    headlessPage.getByRole('heading', { name: 'Unstyled Aegis primitives' }),
  ).toBeVisible();
  const headlessButton = headlessPage.getByRole('button', { name: 'Count: 0' });
  await headlessButton.focus();
  await headlessPage.keyboard.press('Enter');
  await expect(headlessPage.getByRole('button', { name: 'Count: 1' })).toBeFocused();
  await headlessPage.keyboard.press('Tab');
  const headlessCheckbox = headlessPage.getByRole('checkbox', { name: 'Receive project updates' });
  await expect(headlessCheckbox).toBeFocused();
  await headlessPage.keyboard.press('Space');
  await expect(headlessCheckbox).toBeChecked();
  await expect(headlessPage.getByRole('status')).toHaveText('Updates: enabled');
  await headlessPage.keyboard.press('Tab');
  await expect(headlessPage.getByRole('button', { name: 'Save preferences' })).toBeFocused();
  await headlessPage.keyboard.press('Enter');
  await expect(headlessPage.getByTestId('submitted')).toHaveText('Enabled');
  await headlessPage.locator('label').filter({ has: headlessCheckbox }).click();
  await expect(headlessCheckbox).not.toBeChecked();
  await headlessPage.getByRole('button', { name: 'Save preferences' }).click();
  await expect(headlessPage.getByTestId('submitted')).toHaveText('Disabled');
  const headlessPresentation = await headlessPage.evaluate(() => ({
    stylesheets: document.styleSheets.length,
    styleElements: document.querySelectorAll('style, link[rel="stylesheet"]').length,
    designTokens: ['--color-bg-canvas', '--font-ui', '--button-radius-md'].map((token) =>
      getComputedStyle(document.documentElement).getPropertyValue(token).trim(),
    ),
  }));
  assert.deepEqual(headlessPresentation, {
    stylesheets: 0,
    styleElements: 0,
    designTokens: ['', '', ''],
  });
  assert.deepEqual(stylesheetRequests, [], 'Headless controls must not request a stylesheet.');
  assert.deepEqual(headlessErrors, [], 'Headless controls must not emit runtime or asset errors.');
  const headlessAxe = await new AxeBuilder({ page: headlessPage })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  assert.deepEqual(
    headlessAxe.violations.map(({ id }) => id),
    [],
    'Headless accessibility violations',
  );
  report.headless = {
    assets: headlessOutput.map((output) => output.fileName),
    packageModules,
    presentation: headlessPresentation,
    stylesheetRequests,
    browserErrors: headlessErrors,
    violations: 0,
  };
  await headlessContext.close();
  passed(
    'Unstyled primitives retain keyboard, label, controlled state, native form and accessibility behavior without styles or tokens',
  );
  succeeded = true;
} catch (error) {
  report.error = error instanceof Error ? error.stack : String(error);
  console.error(report.error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (server) await new Promise((resolveClose) => server.close(resolveClose));
  if (headlessServer) await new Promise((resolveClose) => headlessServer.close(resolveClose));
  await mkdir(join(repository, 'test-results'), { recursive: true });
  await writeFile(
    join(repository, 'test-results', 'package-smoke.json'),
    JSON.stringify(report, null, 2),
  );
  if (succeeded && process.env.KEEP_PACKAGE_CONSUMER !== '1')
    await rm(temporary, { recursive: true, force: true });
  else console.log(`Consumer retained for inspection: ${temporary}`);
}

if (succeeded) console.log(`Package smoke test passed for ${manifest.name}@${manifest.version}.`);
