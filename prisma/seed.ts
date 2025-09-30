import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create a default store location
  const store = await prisma.storeLocation.create({
    data: {
      storeName: 'JustSell Demo Store',
      addressLine1: '123 Demo Street',
      city: 'Demo City',
      stateCode: 'CA',
      zipCode: '90210',
      phone: '(555) 123-4567',
      email: 'demo@justsell.com',
      taxId: '12-3456789',
    },
  })

  // Create default admin user
  const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'ChangeMe123!'
  // In production, this should be a properly hashed password from environment
  const passwordHash = process.env.NODE_ENV === 'production' 
    ? process.env.ADMIN_PASSWORD_HASH 
    : '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewbh6lrWHN6OsZOu' // temp dev password
  
  if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_PASSWORD_HASH) {
    throw new Error('ADMIN_PASSWORD_HASH environment variable is required in production')
  }

  const adminUser = await prisma.user.create({
    data: {
      username: process.env.ADMIN_USERNAME || 'admin',
      passwordHash: passwordHash!,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'ADMIN',
      storeId: store.id,
    },
  })

  // Create sample compliance rules
  const ageVerificationRule = await prisma.complianceRule.create({
    data: {
      ruleType: 'AGE_VERIFICATION',
      jurisdictionType: 'FEDERAL',
      jurisdictionCode: 'US',
      ruleDetails: {
        minAge: 21,
        requireIdUnder: 30,
        acceptableIds: ['DRIVER_LICENSE', 'STATE_ID', 'PASSPORT'],
      },
      effectiveDate: new Date('2021-01-01'),
      ruleSource: 'FDA',
      enforcementPriority: 'CRITICAL',
    },
  })

  const flavorBanRule = await prisma.complianceRule.create({
    data: {
      ruleType: 'FLAVOR_BAN',
      jurisdictionType: 'STATE',
      jurisdictionCode: 'CA',
      ruleDetails: {
        bannedFlavors: ['Fruit', 'Candy', 'Dessert'],
        exceptions: ['Tobacco', 'Menthol'],
        effectiveProducts: ['disposable_vapes', 'pods'],
      },
      effectiveDate: new Date('2022-01-01'),
      ruleSource: 'California Department of Public Health',
      enforcementPriority: 'HIGH',
    },
  })

  // Create sample product categories
  const sampleProducts = [
    {
      name: 'Premium Tobacco Pods (2-pack)',
      sku: 'PODS-TOB-001',
      barcode: '1234567890123',
      price: 15.99,
      cost: 8.00,
      quantity: 100,
      category: 'Pods',
      vendor: 'Premium Vapes Co.',
      description: 'High-quality tobacco flavored pods',
      flavorProfile: 'Tobacco',
      isSyntheticNicotine: false,
      volumeInMl: 1.8,
      isClosedSystem: true,
      numCartridges: 2,
      nicotineStrength: 50.0,
      ageRestricted: true,
    },
    {
      name: 'Disposable Vape - Menthol',
      sku: 'DISP-MENT-001',
      barcode: '2345678901234',
      price: 12.99,
      cost: 6.50,
      quantity: 50,
      category: 'Disposables',
      vendor: 'Cloud Nine Devices',
      description: 'Smooth menthol disposable vape device',
      flavorProfile: 'Menthol',
      isSyntheticNicotine: false,
      volumeInMl: 2.0,
      isClosedSystem: true,
      nicotineStrength: 20.0,
      ageRestricted: true,
      expirationDate: new Date('2025-12-31'),
      reasonForExpiration: 'Manufacturer',
      lotNumber: 'LOT-2024-001',
    },
  ]

  for (const productData of sampleProducts) {
    await prisma.product.create({ data: productData })
  }

  // Create sample customer
  const sampleCustomer = await prisma.customer.create({
    data: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phoneNumber: '(555) 987-6543',
      dateOfBirth: new Date('1985-06-15'),
      addressLine1: '456 Customer Ave',
      city: 'Demo City',
      state: 'CA',
      zipCode: '90211',
      loyaltyPoints: 250,
      loyaltyTier: 'SILVER',
      totalSpent: 125.50,
      transactionCount: 8,
      firstPurchaseDate: new Date('2024-01-15'),
      lastPurchaseDate: new Date('2024-08-01'),
      averageTransactionValue: 15.69,
      marketingOptIn: true,
      smsOptIn: false,
    },
  })

  // Create sample offers
  const loyaltyOffer = await prisma.offer.create({
    data: {
      name: '10% Off Your Next Purchase',
      description: 'Loyalty reward for silver tier customers',
      offerType: 'PERCENTAGE',
      discountValue: 10.0,
      minPurchaseAmount: 20.0,
      maxDiscountAmount: 5.0,
      targetAudience: 'LOYALTY_MEMBERS',
      customerSegments: {
        tiers: ['SILVER', 'GOLD', 'PLATINUM'],
        minSpent: 100,
      },
      maxUsesTotal: 100,
      maxUsesPerCustomer: 1,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      generatedByAi: false,
    },
  })

  console.log('✅ Database seeded successfully!')
  console.log(`Created store: ${store.storeName}`)
  console.log(`Created admin user: ${adminUser.username}`)
  console.log(`Created ${sampleProducts.length} sample products`)
  console.log(`Created customer: ${sampleCustomer.firstName} ${sampleCustomer.lastName}`)
  console.log(`Created ${await prisma.complianceRule.count()} compliance rules`)
  console.log(`Created ${await prisma.offer.count()} offers`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })