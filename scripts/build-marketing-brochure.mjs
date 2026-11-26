#!/usr/bin/env node
/**
 * Génère docs/marketing/brochure/brochure.html depuis content.fr.json + pricing + contact.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const marketing = path.join(root, 'docs/marketing');

const content = JSON.parse(fs.readFileSync(path.join(marketing, 'content.fr.json'), 'utf8'));
const pricing = JSON.parse(fs.readFileSync(path.join(marketing, 'pricing.json'), 'utf8'));
const contact = JSON.parse(fs.readFileSync(path.join(marketing, 'contact.json'), 'utf8'));

const contactLine = [contact.whatsapp, contact.phone, contact.email, contact.website]
  .filter(Boolean)
  .join(' · ');
const contactDisplay = contactLine || contact.placeholderLabel || 'À compléter';

function shot(vp, file) {
  return `../shots/${vp}/${file}`;
}

function screenBlock(s, index) {
  const n = index + 1;
  const m = s.shots?.mobile;
  const d = s.shots?.desktop;
  return `
    <section class="page screen-page">
      <p class="section-num">Écran ${n}</p>
      <h2>${s.title}</h2>
      <div class="shot-row">
        ${m ? `<figure class="phone-frame"><span class="marker">①</span><img src="${shot('mobile', m)}" alt="${s.title} mobile" /></figure>` : ''}
        ${d ? `<figure class="desktop-frame"><span class="marker">②</span><img src="${shot('desktop', d)}" alt="${s.title} bureau" /></figure>` : ''}
      </div>
      <dl class="screen-meta">
        <dt>Ce que vous voyez</dt><dd>${s.see}</dd>
        <dt>Ce que vous pouvez faire</dt><dd>${s.do}</dd>
        <dt>Comment faire</dt><dd><ol>${s.how.map((h) => `<li>${h}</li>`).join('')}</ol></dd>
        <dt>Pourquoi c'est utile</dt><dd>${s.why}</dd>
      </dl>
    </section>`;
}

const plansRows = pricing.plans
  .map(
    (p) =>
      `<tr><td><strong>${p.name}</strong></td><td>${p.monthlyAmountFcfa == null ? 'À définir' : p.monthlyAmountFcfa === 0 ? '0' : p.monthlyAmountFcfa + ' F CFA'}</td><td>${(p.includedFeatures || []).slice(0, 2).join(' · ')}</td></tr>`,
  )
  .join('');

const faqHtml = content.faq.map((f) => `<div class="faq-item"><p class="faq-q">${f.q}</p><p>${f.a}</p></div>`).join('');

const html = `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>ImmoPilot — Brochure</title>
    <link rel="stylesheet" href="brochure.css" />
  </head>
  <body>
    <section class="page cover" id="p1">
      <p class="kicker">Gestion locative · Côte d'Ivoire</p>
      <h1>${content.meta.product}</h1>
      <p class="lead">${content.meta.tagline}</p>
      <p class="note">${content.meta.demoNotice}</p>
    </section>

    <section class="page" id="p2">
      <h2>${content.ownerPain?.title || "Le quotidien d'un propriétaire"}</h2>
      ${(content.ownerPain?.paragraphs || []).map((p) => `<p>${p}</p>`).join('')}
    </section>

    <section class="page" id="p3">
      <h2>${content.solutionGlance?.title || 'La solution en un coup d\'œil'}</h2>
      <ul class="icon-list">${(content.solutionGlance?.items || []).map((i) => `<li>${i}</li>`).join('')}</ul>
    </section>

    <section class="page" id="p4">
      <h2>${content.benefits.title}</h2>
      <ul>${content.benefits.items.map((i) => `<li>${i}</li>`).join('')}</ul>
      <aside class="calc-box">
        <strong>${content.benefits.calcExample.title}</strong>
        ${content.benefits.calcExample.lines.map((l) => `<p>${l}</p>`).join('')}
      </aside>
    </section>

    <section class="page" id="p5">
      <h2>${content.steps.title}</h2>
      <ol class="steps">${content.steps.items.map((i) => `<li>${i}</li>`).join('')}</ol>
    </section>

    ${content.screens.map(screenBlock).join('\n')}

    <section class="page" id="p-mobile">
      <h2>${content.mobileApp.title}</h2>
      ${content.mobileApp.paragraphs.map((p) => `<p>${p}</p>`).join('')}
      <figure class="phone-frame"><img src="${shot('mobile', 'profil.png')}" alt="Mon compte mobile" /></figure>
    </section>

    <section class="page" id="p-security">
      <h2>${content.security.title}</h2>
      <ul>${content.security.points.map((p) => `<li>${p}</li>`).join('')}</ul>
    </section>

    <section class="page" id="p-pricing">
      <h2>Nos formules</h2>
      <p class="note">${pricing.note}</p>
      <table class="plans"><thead><tr><th>Formule</th><th>Mensuel</th><th>Inclus</th></tr></thead><tbody>${plansRows}</tbody></table>
      <p class="caption">${pricing.paymentMethodsHint}</p>
    </section>

    <section class="page" id="p-faq">
      <h2>Questions fréquentes</h2>
      ${faqHtml}
    </section>

    <section class="page" id="p-soon">
      <h2>${content.comingSoon.title}</h2>
      <ul class="soon">${content.comingSoon.items.map((i) => `<li>${i}</li>`).join('')}</ul>
    </section>

    <section class="page" id="p-cta">
      <h2>${content.cta.title}</h2>
      <ol>${content.cta.steps.map((s) => `<li>${s}</li>`).join('')}</ol>
      <p class="contact-placeholder">${contactDisplay}</p>
    </section>

    <section class="page cover back" id="p-back">
      <h2>ImmoPilot</h2>
      <p class="lead">Vos biens. Vos loyers. Votre sérénité.</p>
      <p class="note">${content.meta.tagline}</p>
    </section>
  </body>
</html>`;

fs.writeFileSync(path.join(marketing, 'brochure/brochure.html'), html);
console.log('Brochure HTML générée :', path.join(marketing, 'brochure/brochure.html'));
console.log('Pages sections:', 6 + content.screens.length + 7);