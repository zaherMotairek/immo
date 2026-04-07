const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAppUser() {
  try {
    // Vérifier si un utilisateur existe déjà
    const existingUser = await prisma.appUser.findFirst({
      where: { email: 'admin@sync-kiz.com' }
    });
    
    if (existingUser) {
      console.log('✅ Utilisateur existe déjà:', existingUser.email);
      return;
    }

    // Créer un mot de passe hashé
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Créer l'utilisateur app
    const user = await prisma.appUser.create({
      data: {
        email: 'admin@sync-kiz.com',
        full_name: 'Admin System',
        pwd_hash: hashedPassword,
        email_verified: true
      }
    });

    console.log('✅ Utilisateur app créé avec succès !');
    console.log('📧 Email:', user.email);
    console.log('👤 Nom:', user.full_name);
    console.log('🔑 Mot de passe: admin123');
    console.log('\n🌐 Connectez-vous sur: http://localhost:5173');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAppUser();
