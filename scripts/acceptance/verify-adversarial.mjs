/** Controlled negative fixtures verify that the same browser oracle rejects the reported defects. */
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { assertDensityChanges, assertPushFilterLayout } from './oracles.mjs';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
try {
  for (const broken of [false, true]) {
    await page.setContent(`<style>
      .aegis-data-grid { width: 600px; }
      .aegis-grid-row { height: 48px; }
      ${broken ? '' : '.aegis-data-grid[data-density="compact"] .aegis-grid-row {height:36px} .aegis-data-grid[data-density="comfortable"] .aegis-grid-row {height:60px}'}
    </style><div class="aegis-data-grid" data-density="default"><div role="group" aria-label="Row density">${['compact', 'default', 'comfortable'].map((density) => `<button aria-pressed="${density === 'default'}">${density}</button>`).join('')}</div><div class="aegis-grid-row">Real fixture row</div></div>`);
    await page.evaluate(() => {
      for (const button of document.querySelectorAll('button'))
        button.onclick = () => {
          document.querySelector('.aegis-data-grid').dataset.density = button.textContent;
          for (const control of document.querySelectorAll('button'))
            control.setAttribute('aria-pressed', String(control === button));
        };
    });
    const run = () => assertDensityChanges({ grid: page.locator('.aegis-data-grid') });
    if (broken) await assert.rejects(run, /rendered row height/);
    else await run();
    console.log(
      `PASS density ${broken ? 'fixed-height mutant rejected' : 'working fixture accepted'}`,
    );
  }
  for (const declaration of [
    'opacity:0',
    'font-size:0',
    'color:transparent',
    'clip-path:inset(100%)',
  ]) {
    const style = await page.addStyleTag({ content: `.aegis-grid-row { ${declaration} }` });
    await assert.rejects(
      () => assertDensityChanges({ grid: page.locator('.aegis-data-grid') }),
      /visibly painted/,
    );
    await style.evaluate((element) => element.remove());
    console.log(`PASS density concealment mutant rejected: ${declaration}`);
  }
  for (const broken of [false, true]) {
    await page.setContent(`<style>
      body{margin:0} main{display:grid;grid-template-columns:1fr;width:1100px}
      main[data-open="true"]{${broken ? '' : 'grid-template-columns:280px minmax(0,1fr);gap:20px'}}
      aside{height:300px;width:280px;background:#ddd;${broken ? 'position:fixed;left:0;top:0' : ''}}
      section{min-height:400px;background:#eee}
    </style><main><section aria-label="Results"><button>Open record</button></section></main>`);
    const results = page.getByRole('region', { name: 'Results' });
    const before = await results.boundingBox();
    await page.evaluate(() => {
      const workspace = document.querySelector('main');
      workspace.dataset.open = 'true';
      const panel = document.createElement('aside');
      panel.setAttribute('aria-label', 'Filters');
      panel.textContent = 'Filters';
      workspace.prepend(panel);
    });
    const run = () =>
      assertPushFilterLayout({
        page,
        panel: page.getByRole('complementary', { name: 'Filters' }),
        results,
        before,
        interactive: page.getByRole('button', { name: 'Open record' }),
      });
    if (broken) await assert.rejects(run, /reduces results width/);
    else await run();
    console.log(`PASS filtering ${broken ? 'overlay mutant rejected' : 'push fixture accepted'}`);
  }
} finally {
  await browser.close();
}
