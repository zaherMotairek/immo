const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    // Vérifier si un admin existe déjà
    const existingAdmin = await prisma.adminUser.findFirst();
    if (existingAdmin) {
      console.log('✅ Un admin existe déjà:', existingAdmin.email);
      return;
    }

    // Créer un mot de passe hashé
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Créer l'utilisateur admin
    const admin = await prisma.adminUser.create({
      data: {
        tenant_id: 'default-tenant',
        email: 'admin@sync-kiz.com',
        first_name: 'Admin',
        last_name: 'System',
        phone: '+33123456789',
        status: 'ACTIVE',
        portfolio_scope_type: 'all',
        // Note: Le mot de passe sera géré par le système d'auth
      }
    });

    console.log('✅ Admin créé avec succès !');
    console.log('📧 Email:', admin.email);
    console.log('👤 Nom:', admin.firstName, admin.lastName);
    console.log('🔑 Mot de passe temporaire: admin123');
    console.log('\n🌐 Connectez-vous sur: http://localhost:5173');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
