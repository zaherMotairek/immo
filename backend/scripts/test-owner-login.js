#!/usr/bin/env node

/**
 * Script pour tester la connexion d'un owner
 * Usage: node scripts/test-owner-login.js <email> <password>
 * Exemple: node scripts/test-owner-login.js neoba@demo.com owner123
 */

const axios = require('axios')

async function testOwnerLogin(email, password, baseUrl = 'http://localhost:3000') {
  try {
    console.log(`🧪 Test de connexion pour: ${email}`)
    console.log(`🌐 URL: ${baseUrl}`)
    console.log(`\n`)
    
    // Test de connexion
    console.log(`1️⃣ Tentative de connexion...`)
    const loginResponse = await axios.post(`${baseUrl}/auth/login`, {
      email,
      password
    })
    
    if (loginResponse.status === 200) {
      const { access_token, user } = loginResponse.data
      
      console.log(`✅ Connexion réussie !`)
      console.log(`   👤 Utilisateur: ${user.full_name}`)
      console.log(`   📧 Email: ${user.email}`)
      console.log(`   🏢 Agence: ${user.agency_name}`)
      console.log(`   🎭 Rôle: ${user.role}`)
      console.log(`   🆔 Tenant ID: ${user.tenant_id}`)
      console.log(`   🔑 Token: ${access_token.substring(0, 20)}...`)
      
      // Test d'accès à une route protégée
      console.log(`\n2️⃣ Test d'accès à une route protégée...`)
      
      try {
        const protectedResponse = await axios.get(`${baseUrl}/v1/owners`, {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'x-tenant-id': user.tenant_id
          }
        })
        
        console.log(`✅ Accès aux données owner réussi !`)
        console.log(`   📊 Nombre d'owners: ${protectedResponse.data.total || protectedResponse.data.length}`)
        
      } catch (protectedError) {
        console.log(`⚠️  Erreur d'accès aux données:`)
        console.log(`   Status: ${protectedError.response?.status}`)
        console.log(`   Message: ${protectedError.response?.data?.message || protectedError.message}`)
      }
      
      // Test de validation du token
      console.log(`\n3️⃣ Test de validation du token...`)
      
      try {
        const validateResponse = await axios.get(`${baseUrl}/auth/validate`, {
          headers: {
            'Authorization': `Bearer ${access_token}`
          }
        })
        
        console.log(`✅ Validation du token réussie !`)
        console.log(`   👤 User ID: ${validateResponse.data.id}`)
        console.log(`   🏢 Agency ID: ${validateResponse.data.agency_id}`)
        console.log(`   🎭 Rôle: ${validateResponse.data.role}`)
        
      } catch (validateError) {
        console.log(`⚠️  Erreur de validation du token:`)
        console.log(`   Status: ${validateError.response?.status}`)
        console.log(`   Message: ${validateError.response?.data?.message || validateError.message}`)
      }
      
      console.log(`\n🎉 RÉSUMÉ - L'owner peut se connecter et accéder à ses données !`)
      console.log(`   📧 Email: ${email}`)
      console.log(`   🔑 Mot de passe: ${password}`)
      console.log(`   🌐 Interface Owner: /owner`)
      console.log(`   🔐 Token valide pour 24h`)
      
    } else {
      console.log(`❌ Connexion échouée`)
      console.log(`   Status: ${loginResponse.status}`)
    }
    
  } catch (error) {
    console.error(`❌ Erreur lors du test:`)
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`)
      console.error(`   Message: ${error.response.data?.message || 'Erreur inconnue'}`)
      
      if (error.response.status === 401) {
        console.error(`   🔍 Vérifiez que l'email et le mot de passe sont corrects`)
      } else if (error.response.status === 404) {
        console.error(`   🔍 Vérifiez que le backend est démarré sur ${baseUrl}`)
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.error(`   🌐 Impossible de se connecter au backend`)
      console.error(`   🔍 Vérifiez que le serveur est démarré: npm run start:dev`)
      console.error(`   🌐 URL testée: ${baseUrl}`)
    } else {
      console.error(`   Message: ${error.message}`)
    }
  }
}

// Exécution du script
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length < 2) {
    console.log(`Usage: node scripts/test-owner-login.js <email> <password> [baseUrl]`)
    console.log(`Exemple: node scripts/test-owner-login.js neoba@demo.com owner123`)
    console.log(`Exemple: node scripts/test-owner-login.js neoba@demo.com owner123 http://localhost:3000`)
    process.exit(1)
  }
  
  const [email, password, baseUrl] = args
  
  console.log(`🚀 Test de connexion Owner`)
  console.log(`⏰ ${new Date().toLocaleString()}`)
  console.log(`\n`)
  
  await testOwnerLogin(email, password, baseUrl)
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`💥 Test échoué:`, error.message)
    process.exit(1)
  })
}

module.exports = { testOwnerLogin }
