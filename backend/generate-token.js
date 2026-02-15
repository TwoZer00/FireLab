import { generateToken } from './auth.js';

const username = process.argv[2];

if (!username) {
  console.log('\n❌ Usage: node generate-token.js <username>\n');
  console.log('Example: node generate-token.js john@email.com\n');
  process.exit(1);
}

const token = await generateToken(username);

console.log('\n✅ Access token generated!\n');
console.log(`Username: ${username}`);
console.log(`Token: ${token}\n`);
console.log('📋 Share this token with the user.');
console.log('⏰ Token expires in 365 days.\n');
