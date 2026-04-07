#!/usr/bin/env node

/**
 * Script pour créer l'accès de connexion pour un owner existant
 * Usage: node scripts/create-owner-access.js <owner-email> <password>
 * Exemple: node scripts/create-owner-access.js neoba@demo.com owner123
 */

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()

async function createOwnerAccess(ownerEmail, password) {
  try {
    console.log(`🔍 Recherche de l'owner avec l'email: ${ownerEmail}`)
    
    // 1. Vérifier que l'owner existe
    const owner = await prisma.owner.findFirst({
      where: { email: ownerEmail },
      include: {
        properties: true,
        agent: true
      }
    })
    
    if (!owner) {
      throw new Error(`❌ Owner avec l'email ${ownerEmail} non trouvé`)
    }
    
    console.log(`✅ Owner trouvé: ${owner.legal_name} (ID: ${owner.id})`)
    console.log(`   - Type: ${owner.type}`)
    console.log(`   - Agence (tenant_id): ${owner.tenant_id}`)
    console.log(`   - Propriétés: ${owner.properties.length}`)
    console.log(`   - Agent assigné: ${owner.agent?.full_name || 'Aucun'}`)
    
    // 2. Vérifier si un AppUser existe déjà
    const existingUser = await prisma.appUser.findUnique({
      where: { email: ownerEmail }
    })
    
    if (existingUser) {
      console.log(`⚠️  Un AppUser existe déjà pour ${ownerEmail}`)
      console.log(`   - ID: ${existingUser.id}`)
      console.log(`   - Nom: ${existingUser.full_name}`)
      
      // Vérifier s'il a déjà une membership
      const existingMembership = await prisma.membership.findFirst({
        where: {
          user_id: existingUser.id,
          agency: { tenant_id: owner.tenant_id }
        },
        include: { agency: true }
      })
      
      if (existingMembership) {
        console.log(`✅ Membership existante trouvée:`)
        console.log(`   - Agence: ${existingMembership.agency.name}`)
        console.log(`   - Rôle: ${existingMembership.role_code}`)
        console.log(`   - Is Owner: ${existingMembership.is_owner}`)
        
        if (existingMembership.is_owner) {
          console.log(`🎉 L'owner a déjà accès ! Vous pouvez vous connecter avec:`)
          console.log(`   Email: ${ownerEmail}`)
          console.log(`   Mot de passe: [déjà configuré]`)
          return
        }
      }
    }
    
    // 3. Créer ou mettre à jour l'AppUser
    let appUser
    const hashedPassword = await bcrypt.hash(password, 10)
    
    if (existingUser) {
      // Mettre à jour le mot de passe
      appUser = await prisma.appUser.update({
        where: { id: existingUser.id },
        data: {
          pwd_hash: hashedPassword,
          full_name: owner.legal_name
        }
      })
      console.log(`🔄 AppUser mis à jour avec nouveau mot de passe`)
    } else {
      // Créer un nouvel AppUser
      appUser = await prisma.appUser.create({
        data: {
          email: ownerEmail,
          full_name: owner.legal_name,
          pwd_hash: hashedPassword,
          email_verified: true // On assume que l'email est vérifié
        }
      })
      console.log(`✅ AppUser créé: ${appUser.full_name} (ID: ${appUser.id})`)
    }
    
    // 4. Trouver l'agence correspondante
    const agency = await prisma.agency.findUnique({
      where: { tenant_id: owner.tenant_id }
    })
    
    if (!agency) {
      throw new Error(`❌ Agence non trouvée pour tenant_id: ${owner.tenant_id}`)
    }
    
    console.log(`🏢 Agence trouvée: ${agency.name} (ID: ${agency.id})`)
    
    // 5. Créer ou mettre à jour la Membership
    const existingMembership = await prisma.membership.findFirst({
      where: {
        agency_id: agency.id,
        user_id: appUser.id
      }
    })
    
    let membership
    if (existingMembership) {
      membership = await prisma.membership.update({
        where: { id: existingMembership.id },
        data: {
          is_owner: true,
          role_code: 'OWNER',
          status: 'ACTIVE'
        }
      })
      console.log(`🔄 Membership mise à jour: is_owner=true, role=OWNER`)
    } else {
      membership = await prisma.membership.create({
        data: {
          agency_id: agency.id,
          user_id: appUser.id,
          role_code: 'OWNER',
          is_owner: true,
          status: 'ACTIVE'
        }
      })
      console.log(`✅ Membership créée: is_owner=true, role=OWNER`)
    }
    
    // 6. Résultat final
    console.log(`\n🎉 SUCCÈS ! L'owner peut maintenant se connecter:`)
    console.log(`   📧 Email: ${ownerEmail}`)
    console.log(`   🔑 Mot de passe: ${password}`)
    console.log(`   🏢 Agence: ${agency.name}`)
    console.log(`   👤 Rôle: OWNER`)
    console.log(`   🌐 Interface: /owner`)
    console.log(`\n📋 Informations de connexion:`)
    console.log(`   - AppUser ID: ${appUser.id}`)
    console.log(`   - Owner ID: ${owner.id}`)
    console.log(`   - Agency ID: ${agency.id}`)
    console.log(`   - Membership ID: ${membership.id}`)
    
  } catch (error) {
    console.error(`❌ Erreur:`, error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Exécution du script
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length < 2) {
    console.log(`Usage: node scripts/create-owner-access.js <owner-email> <password>`)
    console.log(`Exemple: node scripts/create-owner-access.js neoba@demo.com owner123`)
    process.exit(1)
  }
  
  const [ownerEmail, password] = args
  
  if (!ownerEmail.includes('@')) {
    console.error(`❌ Email invalide: ${ownerEmail}`)
    process.exit(1)
  }
  
  if (password.length < 6) {
    console.error(`❌ Mot de passe trop court (minimum 6 caractères)`)
    process.exit(1)
  }
  
  console.log(`🚀 Création de l'accès pour l'owner: ${ownerEmail}`)
  console.log(`⏰ ${new Date().toLocaleString()}`)
  console.log(`\n`)
  
  await createOwnerAccess(ownerEmail, password)
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`💥 Script échoué:`, error)
    process.exit(1)
  })
}

module.exports = { createOwnerAccess }
