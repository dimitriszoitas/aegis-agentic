import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readdirSync, existsSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import manifest from './package.json' with { type: 'json' };

const entry: Record<string, string> = {
  index: 'src/index.ts',
  icons: 'src/components/icon/index.tsx',
  theme: 'src/package/theme.ts',
  types: 'src/package/types.ts',
  patterns: 'src/package/patterns.ts',
  ai: 'src/lib/ai.ts',
  filters: 'src/lib/filters.ts',
  'time-range': 'src/lib/time-range.ts',
  utils: 'src/lib/utils.ts',
  primitives: 'src/package/primitives.ts',
};
for (const directory of readdirSync('src/components')) {
  const path = `src/components/${directory}/index.ts`;
  if (existsSync(path)) entry[directory] = path;
}
for (const directory of readdirSync('src/patterns')) {
  const path = `src/patterns/${directory}/index.ts`;
  if (existsSync(path) && directory !== 'business-app') {
    entry[`patterns/${directory}`] = path;
  }
}
const dependencies = [
  ...Object.keys(manifest.dependencies),
  ...Object.keys(manifest.peerDependencies),
];
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'aegis-package-boundary',
      generateBundle(_options, bundle) {
        for (const output of Object.values(bundle)) {
          if (output.type !== 'chunk') continue;
          for (const id of Object.keys(output.modules)) {
            if (
              /@untitledui|\/src\/stories\/|\.stories\.|\/src\/marketing\/|\/sample-data\/(?:fixtures|rules)\./.test(
                id,
              )
            ) {
              this.error(`Non-library module in package: ${id}`);
            }
          }
        }
      },
    },
  ],
  publicDir: false,
  base: './',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    outDir: 'lib-dist',
    emptyOutDir: true,
    target: 'es2022',
    minify: false,
    sourcemap: true,
    lib: {
      entry,
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
      cssFileName: 'styles',
    },
    rolldownOptions: {
      external: (id) =>
        dependencies.some((name) => id === name || id.startsWith(`${name}/`)) &&
        !id.endsWith('.css'),
      output: {
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (asset) =>
          asset.names.some((name) => name.endsWith('.css'))
            ? '[name][extname]'
            : 'assets/[name]-[hash][extname]',
        banner: (chunk) =>
          /\/src\/(?:components|patterns|package\/(?:theme|patterns))\//.test(
            chunk.facadeModuleId ?? '',
          ) ||
          chunk.facadeModuleId?.endsWith('/src/index.ts') ||
          /\/src\/package\/(?:theme|patterns)\.ts$/.test(chunk.facadeModuleId ?? '')
            ? '"use client";'
            : '',
      },
    },
  },
});
