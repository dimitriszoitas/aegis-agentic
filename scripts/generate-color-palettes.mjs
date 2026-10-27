/** Generate canonical primitive ramps and the exact semantic migration map. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile('src/lib/color-palettes.ts', 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const {
  colorPalettes,
  colorSteps,
  colorAlphaStops,
  createPrimitiveColorCss,
  createSemanticColorMap,
} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
assert.ok(colorPalettes.length >= 20);
assert.equal(colorSteps.length, 14);
assert.equal(colorAlphaStops.length, 14);
const outputs = [
  ['src/styles/primitive-color-tokens.css', createPrimitiveColorCss()],
  ['src/lib/semantic-color-map.json', JSON.stringify(createSemanticColorMap(), null, 2) + '\n'],
];
for (const [filename, output] of outputs) {
  if (process.argv.includes('--check'))
    assert.equal(
      await readFile(filename, 'utf8'),
      output,
      `Run node scripts/generate-color-palettes.mjs to update ${filename}.`,
    );
  else await writeFile(filename, output);
}
console.log(
  `${process.argv.includes('--check') ? 'Checked' : 'Generated'} ${colorPalettes.length} palettes, ${colorPalettes.length * colorSteps.length} opaque colors, ${colorPalettes.length * colorAlphaStops.length * 2} alpha colors, 16 opacity constants, 3 absolute endpoints and the exact semantic color map.`,
);
