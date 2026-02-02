#!/usr/bin/env node
/**
 * Quick test script to verify login credentials
 * Usage: node test-login.js
 */

const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Read the user file
const userFile = path.join(__dirname, 'data/users/05002e84-fb37-4e0c-af20-bafcb57aa6fa.json');
const user = JSON.parse(fs.readFileSync(userFile, 'utf8'));

console.log('=== Login Test ===\n');
console.log('Username in file:', user.username);
console.log('Password hash:', user.passwordHash);
console.log('\nTesting passwords...\n');

// Test common password variations
const testPasswords = [
    'admin',
    'Admin',
    'password',
    'Password',
    'admin123',
    'Admin123'
];

testPasswords.forEach(password => {
    const isValid = bcrypt.compareSync(password, user.passwordHash);
    console.log(`Password "${password}": ${isValid ? '✓ MATCH' : '✗ no match'}`);
});

console.log('\n=== Username Index ===\n');
const indexFile = path.join(__dirname, 'data/users/username-index.json');
const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
console.log('Index contents:', JSON.stringify(index, null, 2));

console.log('\n=== Instructions ===');
console.log('1. Try logging in with username: james (lowercase)');
console.log('2. If none of the test passwords worked, run: npm run reset-password:dev');
console.log('3. When resetting, use username: james (lowercase)');
