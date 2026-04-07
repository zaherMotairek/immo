const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createMembership() {
  try {
    // 1. Trouver ou créer une agence par défaut
    let agency = await prisma.agency.findFirst();
    
    if (!agency) {
      console.log('🏢 Création d\'une agence par défaut...');
      agency = await prisma.agency.create({
        data: {
          tenant_id: 'default-tenant',
          name: 'Agence par défaut',
          region_code: 'FR',
          settings_json: {}
        }
      });
      console.log('✅ Agence créée:', agency.name);
    } else {
      console.log('✅ Agence trouvée:', agency.name);
    }

    // 2. Trouver l'utilisateur app
    const user = await prisma.appUser.findFirst({
      where: { email: 'admin@sync-kiz.com' }
    });

    if (!user) {
      console.log('❌ Utilisateur non trouvé. Créons-le d\'abord...');
      
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const newUser = await prisma.appUser.create({
        data: {
          email: 'admin@sync-kiz.com',
          full_name: 'Admin System',
          pwd_hash: hashedPassword,
          email_verified: true
        }
      });
      console.log('✅ Utilisateur créé:', newUser.email);
      return await createMembershipForUser(newUser.id, agency.id);
    }

    // 3. Vérifier si une membership existe déjà
    const existingMembership = await prisma.membership.findFirst({
      where: {
        user_id: user.id,
        agency_id: agency.id
      }
    });

    if (existingMembership) {
      console.log('✅ Membership existe déjà pour cet utilisateur');
      return;
    }

    // 4. Créer la membership
    const membership = await prisma.membership.create({
      data: {
        user_id: user.id,
        agency_id: agency.id,
        role_code: 'ADMIN',
        is_owner: true,
        status: 'ACTIVE'
      }
    });

    console.log('🎉 SUCCÈS ! Membership créée !');
    console.log('📧 Email:', user.email);
    console.log('🏢 Agence:', agency.name);
    console.log('👤 Rôle:', membership.role_code);
    console.log('🔑 Mot de passe: admin123');
    console.log('\n🌐 Connectez-vous sur: http://localhost:5173');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function createMembershipForUser(userId, agencyId) {
  const membership = await prisma.membership.create({
    data: {
      user_id: userId,
      agency_id: agencyId,
      role_code: 'ADMIN',
      is_owner: true,
      status: 'ACTIVE'
    }
  });

  console.log('🎉 SUCCÈS ! Membership créée !');
  console.log('👤 Rôle:', membership.role_code);
  console.log('🔑 Mot de passe: admin123');
  console.log('\n🌐 Connectez-vous sur: http://localhost:5173');
}

createMembership();
