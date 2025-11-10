#!/usr/bin/env node
/**
 * Script to create the first admin user
 * Usage: node create-admin.js
 */

const readline = require('readline');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function createAdmin() {
  console.log('=== Create Admin User ===\n');

  try {
    // Dynamically import the UserService
    const { UserService } = require('../services/user.service');
    
    const dataDir = process.env.DATA_DIR || './data';
    const userService = new UserService(dataDir);

    const username = await question('Enter admin username: ');
    
    if (!username || username.length < 3) {
      console.error('Error: Username must be at least 3 characters');
      process.exit(1);
    }

    // Check if user already exists
    const existingUser = await userService.getUserByUsername(username);
    if (existingUser) {
      console.error(`Error: User '${username}' already exists`);
      process.exit(1);
    }

    const password = await question('Enter admin password (min 8 characters): ');
    
    if (!password || password.length < 8) {
      console.error('Error: Password must be at least 8 characters');
      process.exit(1);
    }

    const confirmPassword = await question('Confirm password: ');
    
    if (password !== confirmPassword) {
      console.error('Error: Passwords do not match');
      process.exit(1);
    }

    // Create admin user
    const user = await userService.createUser(username, password, 'admin');

    console.log('\n✓ Admin user created successfully!');
    console.log(`  User ID: ${user.userId}`);
    console.log(`  Username: ${user.username}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Created: ${user.createdAt}`);
    console.log('\nYou can now login with these credentials.');

  } catch (error) {
    console.error('\nError creating admin user:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

createAdmin();
