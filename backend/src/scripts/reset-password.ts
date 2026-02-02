#!/usr/bin/env ts-node
/**
 * Script to reset a user's password
 * Usage: npm run reset-password:dev
 */

import { config } from 'dotenv';
import { UserService } from '../services/user.service';
import * as readline from 'readline';

config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
            resolve(answer);
        });
    });
}

async function resetPassword() {
    console.log('=== Reset User Password ===\n');

    const dataDir = process.env.DATA_DIR || './data';
    const userService = new UserService(dataDir);

    try {
        const username = await question('Enter username: ');

        if (!username) {
            console.error('Error: Username is required');
            process.exit(1);
        }

        // Check if user exists
        const user = await userService.getUserByUsername(username);
        if (!user) {
            console.error(`Error: User '${username}' not found`);
            process.exit(1);
        }

        console.log(`Resetting password for user: ${user.username} (${user.role})`);

        let password = await question('Enter new password (min 8 characters): ');
        password = password.trim();

        if (!password || password.length < 8) {
            console.error('Error: Password must be at least 8 characters');
            process.exit(1);
        }

        let confirmPassword = await question('Confirm password: ');
        confirmPassword = confirmPassword.trim();

        if (password !== confirmPassword) {
            console.error('Error: Passwords do not match');
            process.exit(1);
        }

        // Reset password
        await userService.resetUserPassword(user.userId, password);

        console.log('\n✓ Password reset successfully!');
        console.log('\nYou can now login with the new password.');

    } catch (error) {
        console.error('\nError resetting password:', error);
        process.exit(1);
    } finally {
        rl.close();
    }
}

resetPassword();
