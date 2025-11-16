// Test script to check for suspicious keys
const fs = require('fs');

const checkForSuspiciousKeys = (obj, path = 'root') => {
  const suspiciousKeys = ['__proto__', 'constructor', 'prototype'];
  const found = [];
  
  if (obj && typeof obj === 'object') {
    const ownKeys = Object.keys(obj);
    
    // Check current level
    for (const key of ownKeys) {
      if (suspiciousKeys.includes(key)) {
        found.push(`${path}.${key}`);
      }
    }
    
    // Recursively check nested objects and arrays
    for (const key of ownKeys) {
      if (obj[key] && typeof obj[key] === 'object') {
        found.push(...checkForSuspiciousKeys(obj[key], `${path}.${key}`));
      }
    }
  }
  
  return found;
};

// Read the file
const data = JSON.parse(fs.readFileSync('Logs/new_rules.json', 'utf8'));

// Extract matrix
const matrixData = data.matrix || data;

console.log('Checking for suspicious keys...');
const suspicious = checkForSuspiciousKeys(matrixData);

if (suspicious.length > 0) {
  console.log('❌ Found suspicious keys:', suspicious);
} else {
  console.log('✅ No suspicious keys found!');
}

// Also check the raw data
console.log('\nChecking raw import data...');
const suspiciousRaw = checkForSuspiciousKeys(data);
if (suspiciousRaw.length > 0) {
  console.log('❌ Found suspicious keys in raw data:', suspiciousRaw);
} else {
  console.log('✅ No suspicious keys in raw data!');
}
