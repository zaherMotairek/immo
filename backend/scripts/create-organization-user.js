/**
 * Crée une nouvelle organisation + un utilisateur (client isolé).
 * Usage : node scripts/create-organization-user.js
 * Variables d’environnement :
 *   DATABASE_URL (requis)
 *   NEW_ORG_NAME     (optionnel, défaut "Nouveau client")
 *   NEW_USER_EMAIL   (requis)
 *   NEW_USER_PASSWORD (requis)
 *
 * Exemple (PowerShell) :
 *   $env:NEW_USER_EMAIL="client2@example.com"; $env:NEW_USER_PASSWORD="Secret123!"; node scripts/create-organization-user.js
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function main() {
  const email = process.env.NEW_USER_EMAIL?.trim();
  const password = process.env.NEW_USER_PASSWORD;
  if (!email || !password) {
    console.error('Définissez NEW_USER_EMAIL et NEW_USER_PASSWORD.');
    process.exit(1);
  }
  const orgName = process.env.NEW_ORG_NAME?.trim() || 'Nouveau client';

  const prisma = new PrismaClient();
  const hash = await bcrypt.hash(password, 12);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.error('Cet e-mail est déjà utilisé.');
    process.exit(1);
  }

  const org = await prisma.organization.create({
    data: { name: orgName },
  });

  await prisma.user.create({
    data: {
      email,
      passwordHash: hash,
      name: orgName,
      organizationId: org.id,
    },
  });

  console.log('Organisation créée :', org.id, org.name);
  console.log('Utilisateur :', email);
  console.log('Ce compte ne voit que les données de cette organisation (biens / locataires créés après connexion).');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
