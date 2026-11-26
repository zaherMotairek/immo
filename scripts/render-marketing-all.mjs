#!/usr/bin/env node
/** Génère brochure PDF, flyer PDF/PNG, visuels sociaux PNG. */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const marketing = path.join(root, 'docs/marketing');
const ads = path.join(marketing, 'ads');
const require = createRequire(path.join(root, 'frontend/package.json'));
const { chromium } = require('playwright');

function fileUrl(p) {
  return `file:///${p.replace(/\\/g, '/')}`;
}

async function pdf(page, htmlPath, outPdf) {
  await page.goto(fileUrl(htmlPath), { waitUntil: 'networkidle' });
  await page.pdf({
    path: outPdf,
    format: 'A4',
    printBackground: true,
    margin: { top: '12mm', bottom: '14mm', left: '14mm', right: '14mm' },
  });
  console.log('PDF', outPdf);
}

async function pngPage(page, htmlPath, outPng, width, height) {
  await page.setViewportSize({ width, height });
  await page.goto(fileUrl(htmlPath), { waitUntil: 'networkidle' });
  await page.screenshot({ path: outPng, fullPage: false });
  console.log('PNG', outPng);
}

async function main() {
  fs.mkdirSync(ads, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await pdf(page, path.join(marketing, 'brochure/brochure.html'), path.join(marketing, 'ImmoPilot-brochure.pdf'));
  await pdf(page, path.join(ads, 'flyer.html'), path.join(ads, 'ImmoPilot-flyer.pdf'));
  await pngPage(page, path.join(ads, 'flyer.html'), path.join(ads, 'ImmoPilot-flyer.png'), 794, 1123);

  await pngPage(page, path.join(ads, 'social-loyers.html'), path.join(ads, 'social-loyers-1080.png'), 1080, 1080);
  await pngPage(page, path.join(ads, 'social-quittances.html'), path.join(ads, 'social-quittances-1080.png'), 1080, 1080);
  await pngPage(page, path.join(ads, 'social-story.html'), path.join(ads, 'social-story-1080x1920.png'), 1080, 1920);

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});