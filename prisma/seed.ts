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

  // Create GDPR and Privacy Policies
  const gdprPolicy = await prisma.policy.create({
    data: {
      policyType: 'GDPR_COMPLIANCE',
      title: 'General Data Protection Regulation (GDPR) Compliance Policy',
      content: `
# GDPR Compliance Policy

## 1. Data Controller Information
JustSell POS System acts as the data controller for personal data collected through this system.

## 2. Legal Basis for Processing
We process personal data under the following legal bases:
- **Consent**: For marketing communications and optional services
- **Contract**: For processing transactions and providing services
- **Legal Obligation**: For age verification and compliance requirements
- **Legitimate Interest**: For fraud prevention and security

## 3. Data Subject Rights
Under GDPR, you have the following rights:
- **Right to be informed**: Clear information about data collection and use
- **Right of access**: Request copies of your personal data
- **Right to rectification**: Request correction of inaccurate data
- **Right to erasure**: Request deletion of your data
- **Right to restrict processing**: Request limitation of data processing
- **Right to data portability**: Request transfer of your data
- **Right to object**: Object to processing based on legitimate interests
- **Rights related to automated decision making**: Protection from automated profiling

## 4. Data Retention
- **Transaction data**: Retained for 7 years for accounting and tax purposes
- **Customer data**: Retained while account is active plus 3 years
- **Age verification data**: Retained for minimum period required by law
- **Audit logs**: Retained for 5 years for compliance purposes

## 5. Data Protection Officer
Contact: dpo@justsell.com for any GDPR-related inquiries.

## 6. Breach Notification
Personal data breaches will be reported to supervisory authorities within 72 hours and affected individuals will be notified when required.

Last Updated: ${new Date().toISOString().split('T')[0]}
      `,
      version: '1.0',
      effectiveDate: new Date(),
      isActive: true,
      lastUpdated: new Date(),
      approvedBy: adminUser.id,
    },
  })

  const privacyPolicy = await prisma.policy.create({
    data: {
      policyType: 'PRIVACY_POLICY',
      title: 'Privacy Policy',
      content: `
# Privacy Policy

## Information We Collect
- **Personal Information**: Name, email, phone number, date of birth
- **Transaction Data**: Purchase history, payment information (encrypted)
- **Location Data**: Store location for compliance purposes
- **Device Information**: For security and fraud prevention

## How We Use Your Information
- Process transactions and maintain accounts
- Comply with age verification requirements
- Provide customer support and loyalty programs
- Send marketing communications (with consent)
- Prevent fraud and ensure security

## Information Sharing
We do not sell personal information. We may share data with:
- Payment processors (for transaction processing)
- Compliance authorities (when required by law)
- Service providers (under strict confidentiality agreements)

## Your Choices
- Opt out of marketing communications
- Request access to your data
- Request deletion of your account
- Update your preferences

## Security
We implement industry-standard security measures including encryption, access controls, and regular security audits.

## Contact Us
For privacy questions: privacy@justsell.com

Last Updated: ${new Date().toISOString().split('T')[0]}
      `,
      version: '1.0',
      effectiveDate: new Date(),
      isActive: true,
      lastUpdated: new Date(),
      approvedBy: adminUser.id,
    },
  })

  const termsOfService = await prisma.policy.create({
    data: {
      policyType: 'TERMS_OF_SERVICE',
      title: 'Terms of Service',
      content: `
# Terms of Service

## 1. Acceptance of Terms
By using JustSell POS system, you agree to these terms of service.

## 2. Age Requirements
- You must be 21+ years old to purchase tobacco and vaping products
- Valid government-issued photo ID required for age verification
- We reserve the right to refuse service to anyone

## 3. Product Information
- All products are genuine and sourced from authorized distributors
- Product descriptions are accurate to the best of our knowledge
- Prices and availability subject to change without notice

## 4. Returns and Refunds
- No returns on opened or used tobacco/vaping products
- Defective products may be exchanged within 7 days with receipt
- Refunds processed to original payment method

## 5. Loyalty Program
- Points earned on eligible purchases
- Points have no cash value and cannot be transferred
- Program rules may change with 30 days notice

## 6. Prohibited Uses
- Resale of purchased products is prohibited
- Fraudulent or illegal activities will result in account termination
- Sharing of account credentials is not allowed

## 7. Liability
- Use of products is at your own risk
- We are not liable for misuse of products
- Maximum liability limited to purchase price

Last Updated: ${new Date().toISOString().split('T')[0]}
      `,
      version: '1.0',
      effectiveDate: new Date(),
      isActive: true,
      lastUpdated: new Date(),
      approvedBy: adminUser.id,
    },
  })

  const cookiePolicy = await prisma.policy.create({
    data: {
      policyType: 'COOKIE_POLICY',
      title: 'Cookie Policy',
      content: `
# Cookie Policy

## What Are Cookies
Cookies are small text files stored on your device when you visit our website or use our application.

## Types of Cookies We Use

### Essential Cookies
- **Authentication**: Keep you logged in securely
- **Security**: Prevent fraud and unauthorized access
- **Preferences**: Remember your settings and preferences

### Analytics Cookies
- **Usage Analytics**: Understand how you use our system
- **Performance Monitoring**: Identify and fix technical issues
- **A/B Testing**: Improve user experience

### Marketing Cookies (Optional)
- **Personalization**: Show relevant offers and content
- **Campaign Tracking**: Measure marketing effectiveness

## Your Cookie Choices
- **Essential cookies**: Cannot be disabled as they're required for system operation
- **Optional cookies**: You can opt-out through your preferences
- **Browser settings**: You can disable cookies in your browser settings

## Cookie Management
Visit your account settings to manage your cookie preferences at any time.

Last Updated: ${new Date().toISOString().split('T')[0]}
      `,
      version: '1.0',
      effectiveDate: new Date(),
      isActive: true,
      lastUpdated: new Date(),
      approvedBy: adminUser.id,
    },
  })

  const ageVerificationPolicy = await prisma.policy.create({
    data: {
      policyType: 'AGE_VERIFICATION',
      title: 'Age Verification Policy',
      content: `
# Age Verification Policy

## Legal Requirements
Federal and state laws require age verification for tobacco and vaping product sales.

## Minimum Age
- **Federal minimum**: 21 years old (Tobacco 21 law)
- **State requirements**: May have additional restrictions
- **Local ordinances**: May impose stricter requirements

## Acceptable Forms of ID
- Valid driver's license
- State-issued ID card
- U.S. passport
- Military ID

## ID Requirements
- Must be current and not expired
- Must contain photo and date of birth
- Must be issued by government authority
- Suspicious or altered IDs will be rejected

## Verification Process
1. Customer presents ID
2. Staff visually inspects ID for authenticity
3. Verify customer appearance matches photo
4. Calculate age from birth date
5. Record verification in system

## Manager Override
Manager override available for:
- System technical issues
- Unclear ID situations
- Customer disputes
All overrides are logged and audited.

## Compliance Monitoring
- Regular compliance audits conducted
- Staff training updated quarterly
- Violation reporting to appropriate authorities

Last Updated: ${new Date().toISOString().split('T')[0]}
      `,
      version: '1.0',
      effectiveDate: new Date(),
      isActive: true,
      lastUpdated: new Date(),
      approvedBy: adminUser.id,
    },
  })

  // Create system settings and configurations
  const systemSettings = [
    {
      settingKey: 'STORE_TIMEZONE',
      settingValue: 'America/Los_Angeles',
      description: 'Default timezone for the store',
      category: 'SYSTEM',
    },
    {
      settingKey: 'CURRENCY_CODE',
      settingValue: 'USD',
      description: 'Primary currency for transactions',
      category: 'FINANCIAL',
    },
    {
      settingKey: 'TAX_CALCULATION_ENABLED',
      settingValue: 'true',
      description: 'Enable automatic tax calculation',
      category: 'TAX',
    },
    {
      settingKey: 'AGE_VERIFICATION_REQUIRED',
      settingValue: 'true',
      description: 'Require age verification for restricted products',
      category: 'COMPLIANCE',
    },
    {
      settingKey: 'LOYALTY_PROGRAM_ENABLED',
      settingValue: 'true',
      description: 'Enable customer loyalty program',
      category: 'CUSTOMER',
    },
    {
      settingKey: 'RECEIPT_PRINTER_TYPE',
      settingValue: 'THERMAL',
      description: 'Type of receipt printer (THERMAL, LASER, NONE)',
      category: 'HARDWARE',
    },
    {
      settingKey: 'MINIMUM_AGE_TOBACCO',
      settingValue: '21',
      description: 'Minimum age for tobacco product purchases',
      category: 'COMPLIANCE',
    },
    {
      settingKey: 'ID_SCAN_ENABLED',
      settingValue: 'false',
      description: 'Enable ID scanner integration',
      category: 'HARDWARE',
    },
    {
      settingKey: 'AUDIT_LOG_RETENTION_DAYS',
      settingValue: '2555', // 7 years
      description: 'Number of days to retain audit logs',
      category: 'COMPLIANCE',
    },
    {
      settingKey: 'GDPR_COMPLIANCE_ENABLED',
      settingValue: 'true',
      description: 'Enable GDPR compliance features',
      category: 'PRIVACY',
    },
    {
      settingKey: 'DATA_RETENTION_CUSTOMER_DAYS',
      settingValue: '1095', // 3 years
      description: 'Customer data retention period',
      category: 'PRIVACY',
    },
    {
      settingKey: 'MARKETING_OPT_IN_REQUIRED',
      settingValue: 'true',
      description: 'Require explicit opt-in for marketing',
      category: 'PRIVACY',
    },
    {
      settingKey: 'SESSION_TIMEOUT_MINUTES',
      settingValue: '30',
      description: 'User session timeout in minutes',
      category: 'SECURITY',
    },
    {
      settingKey: 'BACKUP_FREQUENCY_HOURS',
      settingValue: '24',
      description: 'Automatic backup frequency',
      category: 'SYSTEM',
    },
    {
      settingKey: 'LOW_STOCK_THRESHOLD',
      settingValue: '10',
      description: 'Alert when inventory falls below this level',
      category: 'INVENTORY',
    },
  ]

  for (const setting of systemSettings) {
    await prisma.systemSetting.create({ data: setting })
  }

  // Create additional compliance rules for different jurisdictions
  const additionalComplianceRules = [
    {
      ruleType: 'EXCISE_TAX',
      jurisdictionType: 'FEDERAL',
      jurisdictionCode: 'US',
      ruleDetails: {
        taxRate: 0.125, // $1.25 per pack equivalent
        applicableProducts: ['cigarettes', 'cigars', 'smokeless_tobacco'],
        taxCalculationMethod: 'per_unit',
      },
      effectiveDate: new Date('2009-04-01'),
      ruleSource: 'Internal Revenue Service',
      enforcementPriority: 'CRITICAL',
    },
    {
      ruleType: 'FLAVOR_BAN',
      jurisdictionType: 'STATE',
      jurisdictionCode: 'NY',
      ruleDetails: {
        bannedFlavors: ['Fruit', 'Candy', 'Dessert', 'Mint', 'Menthol'],
        exceptions: ['Tobacco'],
        effectiveProducts: ['e_cigarettes', 'disposable_vapes'],
      },
      effectiveDate: new Date('2022-09-01'),
      ruleSource: 'New York State Department of Health',
      enforcementPriority: 'HIGH',
    },
    {
      ruleType: 'ONLINE_SALES_BAN',
      jurisdictionType: 'STATE',
      jurisdictionCode: 'UT',
      ruleDetails: {
        bannedSalesChannels: ['online', 'mail_order'],
        requiresPhysicalPresence: true,
        applicableProducts: ['all_tobacco_products'],
      },
      effectiveDate: new Date('2020-01-01'),
      ruleSource: 'Utah Department of Health',
      enforcementPriority: 'HIGH',
    },
  ]

  for (const rule of additionalComplianceRules) {
    await prisma.complianceRule.create({ data: rule })
  }

  // Create notification templates
  const notificationTemplates = [
    {
      templateType: 'AGE_VERIFICATION_REQUIRED',
      subject: 'Age Verification Required',
      content: 'This product requires age verification. Please have your ID ready.',
      isActive: true,
      language: 'en',
    },
    {
      templateType: 'LOYALTY_POINTS_EARNED',
      subject: 'Points Earned!',
      content: 'You earned {points} loyalty points on your purchase. Total: {totalPoints}',
      isActive: true,
      language: 'en',
    },
    {
      templateType: 'LOW_STOCK_ALERT',
      subject: 'Low Stock Alert',
      content: 'Product {productName} is running low. Current stock: {quantity}',
      isActive: true,
      language: 'en',
    },
    {
      templateType: 'GDPR_DATA_REQUEST_RECEIVED',
      subject: 'Data Request Received',
      content: 'Your data access request has been received and will be processed within 30 days.',
      isActive: true,
      language: 'en',
    },
    {
      templateType: 'MARKETING_OPT_IN_CONFIRMATION',
      subject: 'Marketing Preferences Updated',
      content: 'Your marketing preferences have been updated successfully.',
      isActive: true,
      language: 'en',
    },
  ]

  for (const template of notificationTemplates) {
    await prisma.notificationTemplate.create({ data: template })
  }

  console.log('✅ Database seeded successfully!')
  console.log(`Created store: ${store.storeName}`)
  console.log(`Created admin user: ${adminUser.username}`)
  console.log(`Created ${sampleProducts.length} sample products`)
  console.log(`Created customer: ${sampleCustomer.firstName} ${sampleCustomer.lastName}`)
  console.log(`Created ${await prisma.complianceRule.count()} compliance rules`)
  console.log(`Created ${await prisma.offer.count()} offers`)
  console.log(`Created ${await prisma.policy.count()} policies (GDPR, Privacy, Terms, etc.)`)
  console.log(`Created ${await prisma.systemSetting.count()} system settings`)
  console.log(`Created ${await prisma.notificationTemplate.count()} notification templates`)
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