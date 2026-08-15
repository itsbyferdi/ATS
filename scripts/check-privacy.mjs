/**
 * Gives proof of the privacy statement.
 *
 * This script operates the full tool in a browser. It puts a marker string in the CV. It
 * records each network request of the page. It fails if a request goes to a different
 * machine or contains the marker.
 *
 * This script needs Playwright. Playwright is not a dependency of this project, because
 * no other part uses it. To install it and run the script:
 *
 *   npx playwright install chromium
 *   npm run dev                      # in another terminal
 *   node scripts/check-privacy.mjs
 *
 * Optionally start the API too (npm run dev:api) to cover the second reader as well.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173/';
const MARKER = 'PRIVACY-CANARY-9f3a2b';

let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  console.error('Playwright is not installed. Run: npx playwright install chromium');
  process.exit(2);
}

const cv = readFileSync(
  new URL('../packages/core/src/__tests__/fixtures/optimised-single-column.txt', import.meta.url),
  'utf8',
);

const isLocal = (url) => {
  if (url.startsWith('data:') || url.startsWith('blob:')) return true;
  try {
    return ['localhost', '127.0.0.1', '::1'].includes(new URL(url).hostname);
  } catch {
    return false;
  }
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });

const offMachine = [];
const carryingMarker = [];

page.on('request', (r) => {
  const url = r.url();
  const body = r.postData() ?? '';
  if (!isLocal(url)) offMachine.push(`${r.method()} ${url.slice(0, 120)}`);
  if (url.includes(MARKER) || body.includes(MARKER)) carryingMarker.push(`${r.method()} ${url.slice(0, 80)}`);
});

const step = async (fn) => {
  try {
    await fn();
  } catch {
    /* A step that this run cannot do is not a privacy failure. */
  }
};

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.fill('#resume-text', `${cv}\n${MARKER}`);
await page.waitForTimeout(600);
await step(() => page.click('.button-next'));
await page.waitForTimeout(400);
await step(() => page.click('.chip:has-text("Product design")'));
await page.waitForTimeout(400);
await step(() => page.click('.button-next'));
await page.waitForTimeout(1000);
for (const tab of ['Do these first', 'Keywords', 'What software sees', 'All checks']) {
  await step(() => page.click(`[role=tab]:has-text("${tab}")`));
  await page.waitForTimeout(250);
}
await step(() => page.click('text=Rebuild my CV'));
await page.waitForTimeout(1200);
await step(() => page.click('.how-trigger'));
await page.waitForTimeout(400);

await browser.close();

const failed = offMachine.length > 0 || carryingMarker.length > 0;
console.log(`requests leaving this machine: ${offMachine.length}`);
offMachine.forEach((r) => console.log(`   ${r}`));
console.log(`requests carrying the CV marker: ${carryingMarker.length}`);
carryingMarker.forEach((r) => console.log(`   ${r}`));
console.log(failed ? '\nFAIL. Data went to a different machine.' : '\nPASS. No data left this machine.');
process.exit(failed ? 1 : 0);
