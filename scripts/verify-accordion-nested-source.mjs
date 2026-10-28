import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium, expect } from '@playwright/test';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = resolve(root, 'artifacts/accordion-nested');
const fixture = await mkdtemp(resolve(root, 'scripts/.accordion-nested-'));
await mkdir(output, { recursive: true });
await writeFile(
  resolve(fixture, 'index.html'),
  '<!doctype html><html lang="en"><title>Nested accordion keyboard fixture</title><body><div id="root"></div><script type="module" src="./fixture.tsx"></script></body></html>',
);
await writeFile(
  resolve(fixture, 'fixture.tsx'),
  `
import { createRoot } from 'react-dom/client';
import '@/package/reset.css';
import '@/package/styles.css';
import { Accordion } from '@/components/accordion';
createRoot(document.getElementById('root')!).render(<main>
  {(['vertical', 'horizontal'] as const).map(outer => <section key={outer} aria-label={outer + ' outer accordion'}>
    <h2>{outer} outer accordion</h2>
    <Accordion type="multiple" orientation={outer} defaultValue={['first']} items={[
      { value: 'first', title: 'Outer first', content: <Accordion type="multiple" orientation={outer === 'vertical' ? 'horizontal' : 'vertical'} items={[
        { value: 'first', title: 'Inner first', content: 'First inner content.' },
        { value: 'disabled', title: 'Inner disabled', content: 'Unavailable content.', disabled: true },
        { value: 'last', title: 'Inner last', content: 'Last inner content.' },
      ]} /> },
      { value: 'last', title: 'Outer last', content: 'Last outer content.' },
    ]} />
  </section>)}
</main>);
`,
);
const server = await createServer({
  root,
  configFile: resolve(root, 'vite.config.ts'),
  server: { host: '127.0.0.1', port: 0 },
});
const report = {
  status: 'running',
  checks: [],
  errors: [],
  limitations: [
    'Focused Chromium nested keyboard regression; not certification of every Accordion behavior.',
  ],
};
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  page.on('pageerror', (error) => report.errors.push(error.message));
  await page.goto(
    `http://127.0.0.1:${server.httpServer.address().port}/${relative(root, fixture)}/index.html`,
  );
  for (const outer of ['vertical', 'horizontal']) {
    const example = page.getByRole('region', { name: `${outer} outer accordion` });
    const first = example.getByRole('button', { name: 'Inner first', exact: true });
    const last = example.getByRole('button', { name: 'Inner last', exact: true });
    const outerFirst = example.getByRole('button', { name: 'Outer first', exact: true });
    const perpendicular =
      outer === 'vertical' ? ['ArrowDown', 'ArrowUp'] : ['ArrowRight', 'ArrowLeft'];
    const own = outer === 'vertical' ? ['ArrowRight', 'ArrowLeft'] : ['ArrowDown', 'ArrowUp'];
    await first.focus();
    for (const key of perpendicular) {
      await page.keyboard.press(key);
      await expect(
        first,
        `${outer}: nested perpendicular ${key} must not move outer focus`,
      ).toBeFocused();
    }
    await page.keyboard.press(own[0]);
    await expect(last).toBeFocused();
    await expect(
      example.getByRole('button', { name: 'Inner disabled', exact: true }),
    ).toBeDisabled();
    await page.keyboard.press(own[1]);
    await expect(first).toBeFocused();
    await page.keyboard.press('End');
    await expect(last).toBeFocused();
    await page.keyboard.press('Home');
    await expect(first).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(first).toHaveAttribute('aria-expanded', 'true');
    await expect(outerFirst).toHaveAttribute('aria-expanded', 'true');
    await outerFirst.focus();
    await page.keyboard.press(perpendicular[0]);
    await expect(example.getByRole('button', { name: 'Outer last', exact: true })).toBeFocused();
    report.checks.push(
      `${outer} outer: perpendicular nested arrows retain inner focus; own-axis arrows skip disabled, Home/End stay nested, Enter toggles only inner, and direct outer navigation works.`,
    );
  }
  assert.deepEqual(report.errors, []);
  report.status = 'passed';
  await page.screenshot({ path: resolve(output, 'nested-keyboard.png'), fullPage: true });
} catch (error) {
  report.status = 'failed';
  report.failure = String(error.stack ?? error);
  throw error;
} finally {
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close();
  await server.close();
  await rm(fixture, { recursive: true, force: true });
}
console.log(JSON.stringify(report, null, 2));
