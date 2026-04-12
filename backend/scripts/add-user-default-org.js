/**
 * Ajoute un utilisateur sur l’organisation par défaut (mêmes données que l’admin).
 * Usage : node scripts/add-user-default-org.js
 *   NEW_USER_EMAIL, NEW_USER_PASSWORD (requis)
 *   NEW_USER_NAME (optionnel)
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const DEFAULT_ORG_ID = '00000000-0000-4000-8000-000000000001';

async function main() {
  const email = process.env.NEW_USER_EMAIL?.trim();
  const password = process.env.NEW_USER_PASSWORD;
  if (!email || !password) {
    console.error('Définissez NEW_USER_EMAIL et NEW_USER_PASSWORD.');
    process.exit(1);
  }
  const name = process.env.NEW_USER_NAME?.trim() || 'Gestionnaire test';

  const prisma = new PrismaClient();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Compte déjà présent :', email);
    await prisma.$disconnect();
    return;
  }

  const hash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      email,
      passwordHash: hash,
      name,
      organizationId: DEFAULT_ORG_ID,
    },
  });

  console.log('OK — même organisation que admin@immopilot.local (données démo partagées).');
  console.log('E-mail :', email);
  console.log('Mot de passe :', password);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
