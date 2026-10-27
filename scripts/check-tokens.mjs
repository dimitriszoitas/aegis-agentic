import { readdir, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
execFileSync(process.execPath, ['scripts/generate-color-palettes.mjs', '--check'], {
  stdio: 'inherit',
});
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) await walk(path);
    else if (
      /\.(css|tsx?|mdx)$/.test(path) &&
      !path.endsWith('/tokens.css') &&
      path !== 'src/styles/minimalistic-tokens.css' &&
      path !== 'src/styles/v0-simple-tokens.css' &&
      path !== 'src/styles/fundamental-tokens.css' &&
      path !== 'src/styles/primitive-color-tokens.css' &&
      path !== 'src/styles/elevation-tokens.css' &&
      path !== 'src/styles/design-tokens.css'
    ) {
      const source = await readFile(path, 'utf8');
      if (/#[\da-fA-F]{3,8}\b/.test(source))
        throw new Error(`Raw hex color outside tokens.css: ${path}`);
    }
  }
}
await walk('src');
console.log('Semantic color token check passed.');
