#!/usr/bin/env node

/**
 * Generate bcrypt hash for admin password
 * Usage: node scripts/generate-admin-hash.js "YourPassword123!"
 */

const bcrypt = require('bcryptjs');

const password = process.argv[2];
if (!password) {
  console.error('❌ Please provide a password as an argument');
  console.error('Usage: node scripts/generate-admin-hash.js "YourPassword123!"');
  process.exit(1);
}

// Validate password strength
const minLength = 8;
const hasUpperCase = /[A-Z]/.test(password);
const hasLowerCase = /[a-z]/.test(password);
const hasNumbers = /\d/.test(password);
const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

if (password.length < minLength) {
  console.error(`❌ Password must be at least ${minLength} characters long`);
  process.exit(1);
}

if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
  console.error('❌ Password must contain:');
  console.error('  - At least one uppercase letter');
  console.error('  - At least one lowercase letter');
  console.error('  - At least one number');
  console.error('  - At least one special character');
  process.exit(1);
}

// Generate hash
const saltRounds = 12;
const hash = bcrypt.hashSync(password, saltRounds);

console.log('✅ Password hash generated successfully!');
console.log('');
console.log('🔐 Hash (copy this to your environment variable):');
console.log(hash);
console.log('');
console.log('📝 Environment variable example:');
console.log(`ADMIN_PASSWORD_HASH="${hash}"`);
console.log('');
console.log('🛡️ Security Notes:');
console.log('  - This hash is safe to store in environment variables');
console.log('  - Never share the original password');
console.log('  - Use different passwords for different environments');
console.log('  - Consider using a password manager');