#!/usr/bin/env node
/**
 * HTML → PDF (brochure marketing).
 * Usage : node scripts/render-marketing-brochure.mjs
 * Sortie : docs/marketing/ImmoPilot-brochure-demo.pdf
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const html = path.join(root, 'docs/marketing/brochure/brochure.html');
const pdf = path.join(root, 'docs/marketing/ImmoPilot-brochure-demo.pdf');

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`file://${html.replace(/\\/g, '/')}`, { waitUntil: 'networkidle' });
  await page.pdf({
    path: pdf,
    format: 'A4',
    printBackground: true,
    margin: { top: '12mm', bottom: '14mm', left: '14mm', right: '14mm' },
  });
  await browser.close();
  console.log('PDF :', pdf);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});