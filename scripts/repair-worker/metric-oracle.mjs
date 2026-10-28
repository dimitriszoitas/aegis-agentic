import { AssertionError } from 'node:assert';
import { chromium } from '@playwright/test';

// The historical oracle remains byte-for-byte unchanged. This wrapper records
// its actual error type through IPC and prevents browser network egress.
const origin = new URL(process.env.FORMA_URL).origin;
const blocked = [];
const launch = chromium.launch.bind(chromium);
chromium.launch = async (...args) => {
  const browser = await launch(...args);
  const newPage = browser.newPage.bind(browser);
  browser.newPage = async (...pageArgs) => {
    const page = await newPage({ ...pageArgs[0], serviceWorkers: 'block' });
    await page.route('**/*', (route) => {
      const url = new URL(route.request().url());
      if (url.origin === origin || ['data:', 'blob:'].includes(url.protocol))
        return route.continue();
      blocked.push(url.origin);
      return route.abort('blockedbyclient');
    });
    return page;
  };
  return browser;
};
try {
  await import('../verify-forma-metrics.mjs');
  process.send?.({ status: blocked.length ? 'error' : 'passed', blocked });
} catch (error) {
  process.send?.({
    status: error instanceof AssertionError && !blocked.length ? 'failed' : 'error',
    diagnostic: String(error?.stack || error),
    blocked,
  });
  process.exitCode = 1;
}
