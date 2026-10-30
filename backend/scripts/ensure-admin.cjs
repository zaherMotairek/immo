/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Garantit le compte admin (e-mail / mot de passe seed) au build Render.
 * N’est pas exécuté à chaque réveil du free tier — seulement au build/deploy.
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const DEFAULT_ORG_ID = '00000000-0000-4000-8000-000000000001';

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@immopilot.local';
  const password = process.env.SEED_ADMIN_PASSWORD || 'AdminImmo2026!';
  const hash = await bcrypt.hash(password, 12);

  await prisma.organization.upsert({
    where: { id: DEFAULT_ORG_ID },
    create: { id: DEFAULT_ORG_ID, name: 'Par défaut' },
    update: {},
  });

  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash: hash,
      name: 'Administrateur',
      organizationId: DEFAULT_ORG_ID,
      role: 'PLATFORM_ADMIN',
      orgRole: 'OWNER',
    },
    update: {
      passwordHash: hash,
      organizationId: DEFAULT_ORG_ID,
      role: 'PLATFORM_ADMIN',
      orgRole: 'OWNER',
    },
  });

  console.log('ensure-admin OK —', email);
}

main()
  .catch((e) => {
    console.error('ensure-admin échec:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
