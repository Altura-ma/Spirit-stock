/**
 * Seed script for /products collection.
 *
 * Usage:
 *   1. Download your Firebase service account key from:
 *      Firebase Console → Project Settings → Service accounts → Generate new private key
 *   2. Save it as scripts/serviceAccountKey.json
 *   3. Run: node scripts/seed-products.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
let serviceAccount
try {
  serviceAccount = require('./serviceAccountKey.json')
} catch {
  console.error('❌  Missing scripts/serviceAccountKey.json')
  console.error('   Download it from Firebase Console → Project Settings → Service accounts')
  process.exit(1)
}

initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

const products = [
  // Whisky
  { name: 'Black Label', brand: 'Johnnie Walker', category: 'whisky', volume: '70cl' },
  { name: 'Red Label', brand: 'Johnnie Walker', category: 'whisky', volume: '70cl' },
  { name: 'Gold Label', brand: 'Johnnie Walker', category: 'whisky', volume: '70cl' },
  { name: '12 ans', brand: 'Chivas Regal', category: 'whisky', volume: '70cl' },
  { name: '18 ans', brand: 'Chivas Regal', category: 'whisky', volume: '70cl' },
  { name: 'Single Malt 12 ans', brand: 'Glenfiddich', category: 'whisky', volume: '70cl' },
  { name: 'Single Malt 15 ans', brand: 'Glenfiddich', category: 'whisky', volume: '70cl' },
  { name: 'Original', brand: 'Jack Daniel\'s', category: 'whisky', volume: '70cl' },
  { name: 'Honey', brand: 'Jack Daniel\'s', category: 'whisky', volume: '70cl' },
  { name: '12 ans d\'âge', brand: 'Jameson', category: 'whisky', volume: '70cl' },

  // Rhum
  { name: 'Blanc Agricole', brand: 'Clément', category: 'rhum', volume: '70cl' },
  { name: 'VSOP', brand: 'Clément', category: 'rhum', volume: '70cl' },
  { name: 'Superior', brand: 'Bacardi', category: 'rhum', volume: '70cl' },
  { name: 'Carta Blanca', brand: 'Bacardi', category: 'rhum', volume: '70cl' },
  { name: '7 ans', brand: 'Diplomatico', category: 'rhum', volume: '70cl' },
  { name: 'Reserva Exclusiva', brand: 'Diplomatico', category: 'rhum', volume: '70cl' },

  // Vodka
  { name: 'Original', brand: 'Grey Goose', category: 'vodka', volume: '70cl' },
  { name: 'La Poire', brand: 'Grey Goose', category: 'vodka', volume: '70cl' },
  { name: 'Blue', brand: 'Absolut', category: 'vodka', volume: '70cl' },
  { name: 'Citron', brand: 'Absolut', category: 'vodka', volume: '70cl' },
  { name: 'Classic', brand: 'Belvedere', category: 'vodka', volume: '70cl' },
  { name: 'No. 21', brand: 'Ketel One', category: 'vodka', volume: '70cl' },

  // Gin
  { name: 'London Dry', brand: 'Tanqueray', category: 'gin', volume: '70cl' },
  { name: 'No. Ten', brand: 'Tanqueray', category: 'gin', volume: '70cl' },
  { name: 'London Dry', brand: 'Hendrick\'s', category: 'gin', volume: '70cl' },
  { name: 'London Dry', brand: 'Bombay Sapphire', category: 'gin', volume: '70cl' },
  { name: 'Premier Cru', brand: 'Citadelle', category: 'gin', volume: '70cl' },

  // Tequila
  { name: 'Silver', brand: 'Patron', category: 'tequila', volume: '70cl' },
  { name: 'Reposado', brand: 'Patron', category: 'tequila', volume: '70cl' },
  { name: 'Blanco', brand: 'Don Julio', category: 'tequila', volume: '70cl' },
  { name: 'Silver', brand: 'Jose Cuervo', category: 'tequila', volume: '70cl' },

  // Cognac
  { name: 'VS', brand: 'Hennessy', category: 'cognac', volume: '70cl' },
  { name: 'VSOP', brand: 'Hennessy', category: 'cognac', volume: '70cl' },
  { name: 'XO', brand: 'Hennessy', category: 'cognac', volume: '70cl' },
  { name: 'VSOP', brand: 'Rémy Martin', category: 'cognac', volume: '70cl' },
  { name: 'XO', brand: 'Rémy Martin', category: 'cognac', volume: '70cl' },

  // Champagne
  { name: 'Brut', brand: 'Moët & Chandon', category: 'champagne', volume: '75cl' },
  { name: 'Brut', brand: 'Veuve Clicquot', category: 'champagne', volume: '75cl' },
  { name: 'Brut', brand: 'Laurent-Perrier', category: 'champagne', volume: '75cl' },
  { name: 'Brut Réserve', brand: 'Pol Roger', category: 'champagne', volume: '75cl' },

  // Liqueur
  { name: 'Triple Sec', brand: 'Cointreau', category: 'liqueur', volume: '70cl' },
  { name: 'Original', brand: 'Amaretto Disaronno', category: 'liqueur', volume: '70cl' },
  { name: 'Crème de Cassis', brand: 'Védrenne', category: 'liqueur', volume: '70cl' },
  { name: 'Blue', brand: 'Curaçao Bols', category: 'liqueur', volume: '70cl' },
  { name: 'Original', brand: 'Baileys', category: 'liqueur', volume: '70cl' },
  { name: 'Original', brand: 'Kahlúa', category: 'liqueur', volume: '70cl' },
]

async function seed() {
  const col = db.collection('products')
  let added = 0
  for (const product of products) {
    await col.add(product)
    added++
    process.stdout.write(`\r  ✓ ${added}/${products.length} produits ajoutés`)
  }
  console.log(`\n\n✅  ${added} produits ajoutés avec succès dans /products`)
}

seed().catch(err => { console.error(err); process.exit(1) })
