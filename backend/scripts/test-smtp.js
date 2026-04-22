/**
 * Test d’envoi SMTP (relances, mot de passe oublié).
 * Usage : depuis le dossier backend : node scripts/test-smtp.js [email_destinataire]
 * Charge automatiquement backend/.env (lignes KEY=VAL).
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

async function main() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? '587');
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = (process.env.SMTP_USER ?? '').trim();
  const pass = (process.env.SMTP_PASS ?? '').trim();
  const from = (process.env.MAIL_FROM ?? '').trim() || user;
  const to = process.argv[2]?.trim() || user;

  if (!host || !user || !pass) {
    console.error('Manque SMTP_HOST, SMTP_USER ou SMTP_PASS dans backend/.env');
    process.exit(1);
  }
  if (!to) {
    console.error('Indiquez un destinataire : node scripts/test-smtp.js votre@email.com');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  const info = await transporter.sendMail({
    from,
    to,
    subject: 'ImmoPilot — test SMTP',
    text: 'Si vous recevez ce message, la configuration SMTP est correcte.',
    html: '<p>Si vous recevez ce message, la configuration <strong>SMTP</strong> est correcte.</p>',
  });

  console.log('OK — e-mail envoyé. MessageId :', info.messageId ?? '—');
}

main().catch((e) => {
  console.error('Échec SMTP :', e.message || e);
  process.exit(1);
});
