import { build } from 'vite';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir, copyFile, readdir, stat, cp } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const require = createRequire(import.meta.url);
execFileSync(process.execPath, ['scripts/generate-ai-contracts.mjs', '--check'], {
  stdio: 'inherit',
});
await build({ configFile: 'vite.library.config.ts', logLevel: 'warn' });
execFileSync(
  process.execPath,
  [require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.package.json'],
  { stdio: 'inherit' },
);
const typesRoot = join(root, 'lib-dist/types');
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory() ? files(join(directory, entry.name)) : join(directory, entry.name),
      ),
    )
  ).flat();
}
const declarations = (await files(typesRoot)).filter((path) => path.endsWith('.d.ts'));
for (const path of declarations) {
  let text = await readFile(path, 'utf8');
  text = text.replace(/^import\s+['"][^'"]+\.css['"];?\s*$/gm, '');
  text = text.replace(/(['"])(@\/[^'"]+|\.{1,2}\/[^'"]+)\1/g, (match, quote, specifier) => {
    if (specifier.endsWith('.json')) return match;
    const target = specifier.startsWith('@/')
      ? join(typesRoot, specifier.slice(2))
      : resolve(dirname(path), specifier);
    const declaration = declarations.find(
      (candidate) => candidate === `${target}.d.ts` || candidate === join(target, 'index.d.ts'),
    );
    if (!declaration) throw new Error(`Unresolved declaration reference ${specifier} in ${path}`);
    let emitted = relative(dirname(path), declaration)
      .replaceAll('\\', '/')
      .replace(/\.d\.ts$/, '.js');
    if (!emitted.startsWith('.')) emitted = `./${emitted}`;
    return `${quote}${emitted}${quote}`;
  });
  if (path.endsWith('/aws-logo/aws-logo.d.ts')) {
    const manifest = JSON.parse(await readFile('src/components/aws-logo/manifest.json', 'utf8'));
    text = text.replace(/^import manifest from ['"]\.\/manifest\.json['"];?\s*$/m, '');
    text = text.replace(
      'keyof typeof manifest.logos',
      Object.keys(manifest.logos)
        .map((name) => JSON.stringify(name))
        .join(' | '),
    );
    if (text.includes('manifest.'))
      throw new Error('AWS declaration still references its private JSON manifest');
  }
  await writeFile(path, text);
}
await copyFile('src/package/reset.css', 'lib-dist/reset.css');
await copyFile('tokens/design-tokens.json', 'lib-dist/token-manifest.json');
await cp('public/ai', 'lib-dist/ai', { recursive: true });
await copyFile('public/llms.txt', 'lib-dist/llms.txt');
await writeFile(
  'lib-dist/tokens.css',
  (
    await Promise.all(
      [
        'tokens.css',
        'primitive-color-tokens.css',
        'component-tokens.css',
        'component-runtime-tokens.css',
        'elevation-tokens.css',
        'design-tokens.css',
      ].map((name) => readFile(`src/styles/${name}`, 'utf8')),
    )
  ).join('\n'),
);
await mkdir('lib-dist/fonts', { recursive: true });
await mkdir('lib-dist/licenses', { recursive: true });
for (const packageName of ['tailwindcss', 'tw-animate-css', 'react-day-picker']) {
  await copyFile(`node_modules/${packageName}/LICENSE`, `lib-dist/licenses/${packageName}-MIT.txt`);
}
let fontCss = '/* Optional self-hosted fonts. Original OFL licenses are in ./licenses/. */\n';
for (const [family, weights] of [
  ['figtree', [400, 500, 600, 700]],
  ['jetbrains-mono', [400]],
]) {
  for (const weight of weights) {
    const source = require.resolve(`@fontsource/${family}/${weight}.css`);
    let css = await readFile(source, 'utf8');
    css = css.replace(/,\s*url\([^)]*\.woff['"]?\)\s*format\(['"]woff['"]\)/g, '');
    const assets = [...css.matchAll(/url\(['"]?\.\/files\/([^'")]+\.woff2)['"]?\)/g)];
    for (const [, filename] of assets)
      await copyFile(join(dirname(source), 'files', filename), join('lib-dist/fonts', filename));
    css = css.replaceAll('./files/', './fonts/');
    if (/\.woff['"]?\)/.test(css)) throw new Error('Unexpected unbundled font fallback');
    fontCss += `${css}\n`;
  }
  await copyFile(
    join(dirname(require.resolve(`@fontsource/${family}/400.css`)), 'LICENSE'),
    `lib-dist/licenses/${family}-OFL.txt`,
  );
}
await writeFile('lib-dist/fonts.css', fontCss);
await copyFile('src/components/aws-logo/ATTRIBUTION.md', 'lib-dist/licenses/AWS-ATTRIBUTION.md');
await copyFile(
  'src/components/aws-logo/asset-checksums.json',
  'lib-dist/licenses/AWS-checksums.json',
);
const manifest = JSON.parse(await readFile('package.json', 'utf8'));
for (const [name, mapping] of Object.entries(manifest.exports)) {
  for (const target of typeof mapping === 'string' ? [mapping] : Object.values(mapping)) {
    if (!(await stat(target)).isFile()) throw new Error(`Missing public export ${name}: ${target}`);
  }
}
const outputs = await files('lib-dist');
for (const path of outputs.filter((path) => /\.(js|d\.ts)$/.test(path))) {
  const source = await readFile(path, 'utf8');
  if (/['"]@\//.test(source) || /@untitledui|import\.meta\.glob/.test(source))
    throw new Error(`Unresolved or restricted import in ${path}`);
}
console.log(
  `Built ${manifest.name}@${manifest.version}: ${Object.keys(manifest.exports).length} public entries, ${outputs.length} files.`,
);
