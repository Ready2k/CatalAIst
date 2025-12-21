import * as crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JsonStorageService } from './storage.service';

export interface User {
  userId: string;
  username: string;
  passwordHash: string;
  role: 'admin' | 'user';
  createdAt: string;
  lastLogin?: string;
  apiKey?: string; // For storing user's OpenAI/Bedrock credentials
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsSessionToken?: string;
  awsRegion?: string;
  preferredProvider?: 'openai' | 'bedrock';
  preferredModel?: string;
}

export interface UserCredentials {
  apiKey?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsSessionToken?: string;
  awsRegion?: string;
  provider?: 'openai' | 'bedrock';
  model?: string;
}

/**
 * User management service
 * Handles user authentication, registration, and credential storage
 */
export class UserService {
  private storage: JsonStorageService;
  private encryptionKey: Buffer;
  private algorithm = 'aes-256-gcm';

  constructor(dataDir?: string) {
    this.storage = new JsonStorageService(dataDir);
    
    // Use encryption key for storing API credentials
    const keyString = process.env.CREDENTIALS_ENCRYPTION_KEY || process.env.JWT_SECRET || 'change-in-production';
    this.encryptionKey = crypto.scryptSync(keyString, 'salt', 32);
  }

  /**
   * Create a new user
   */
  async createUser(
    username: string,
    password: string,
    role: 'admin' | 'user' = 'user'
  ): Promise<User> {
    // Check if user already exists
    const existingUser = await this.getUserByUsername(username);
    if (existingUser) {
      throw new Error('Username already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const user: User = {
      userId: crypto.randomUUID(),
      username,
      passwordHash,
      role,
      createdAt: new Date().toISOString()
    };

    await this.storage.writeJson(`users/${user.userId}.json`, user);
    await this.updateUsernameIndex(username, user.userId);

    return user;
  }

  /**
   * Authenticate user and generate JWT token
   */
  async login(username: string, password: string): Promise<{
    token: string;
    user: Omit<User, 'passwordHash'>;
  }> {
    const user = await this.getUserByUsername(username);
    
    if (!user) {
      throw new Error('Invalid username or password');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValid) {
      throw new Error('Invalid username or password');
    }

    // Update last login
    user.lastLogin = new Date().toISOString();
    await this.storage.writeJson(`users/${user.userId}.json`, user);

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const token = jwt.sign(
      {
        userId: user.userId,
        username: user.username,
        role: user.role
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    // Return user without password hash
    const { passwordHash, ...userWithoutPassword } = user;

    return {
      token,
      user: userWithoutPassword
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const user = await this.storage.readJson<User>(`users/${userId}.json`);
      return user;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<User | null> {
    try {
      // Read username index
      const index = await this.storage.readJson<{ [username: string]: string }>('users/username-index.json');
      const userId = index[username.toLowerCase()];
      
      if (!userId) {
        return null;
      }

      return await this.getUserById(userId);
    } catch (error) {
      return null;
    }
  }

  /**
   * Update username index for fast lookups
   */
  private async updateUsernameIndex(username: string, userId: string): Promise<void> {
    let index: { [username: string]: string } = {};
    
    try {
      index = await this.storage.readJson('users/username-index.json');
    } catch (error) {
      // Index doesn't exist yet
    }

    index[username.toLowerCase()] = userId;
    await this.storage.writeJson('users/username-index.json', index);
  }

  /**
   * Store encrypted user credentials (API keys, AWS credentials)
   */
  async storeCredentials(userId: string, credentials: UserCredentials): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Encrypt sensitive credentials
    if (credentials.apiKey) {
      user.apiKey = this.encrypt(credentials.apiKey);
    }
    if (credentials.awsAccessKeyId) {
      user.awsAccessKeyId = this.encrypt(credentials.awsAccessKeyId);
    }
    if (credentials.awsSecretAccessKey) {
      user.awsSecretAccessKey = this.encrypt(credentials.awsSecretAccessKey);
    }
    if (credentials.awsSessionToken) {
      user.awsSessionToken = this.encrypt(credentials.awsSessionToken);
    }
    if (credentials.awsRegion) {
      user.awsRegion = credentials.awsRegion;
    }
    if (credentials.provider) {
      user.preferredProvider = credentials.provider;
    }
    if (credentials.model) {
      user.preferredModel = credentials.model;
    }

    await this.storage.writeJson(`users/${userId}.json`, user);
  }

  /**
   * Get decrypted user credentials
   */
  async getCredentials(userId: string): Promise<UserCredentials> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const credentials: UserCredentials = {
      provider: user.preferredProvider,
      model: user.preferredModel,
      awsRegion: user.awsRegion
    };

    if (user.apiKey) {
      credentials.apiKey = this.decrypt(user.apiKey);
    }
    if (user.awsAccessKeyId) {
      credentials.awsAccessKeyId = this.decrypt(user.awsAccessKeyId);
    }
    if (user.awsSecretAccessKey) {
      credentials.awsSecretAccessKey = this.decrypt(user.awsSecretAccessKey);
    }
    if (user.awsSessionToken) {
      credentials.awsSessionToken = this.decrypt(user.awsSessionToken);
    }

    return credentials;
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const isValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid current password');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.storage.writeJson(`users/${userId}.json`, user);
  }

  /**
   * Change user role (admin only)
   */
  async changeUserRole(userId: string, newRole: 'admin' | 'user'): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.role = newRole;
    await this.storage.writeJson(`users/${userId}.json`, user);
  }

  /**
   * Reset user password (admin only)
   */
  async resetUserPassword(userId: string, newPassword: string): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.storage.writeJson(`users/${userId}.json`, user);
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Remove from username index
    try {
      const index = await this.storage.readJson<{ [username: string]: string }>('users/username-index.json');
      delete index[user.username.toLowerCase()];
      await this.storage.writeJson('users/username-index.json', index);
    } catch (error) {
      // Ignore if index doesn't exist
    }

    // Delete user file
    await this.storage.delete(`users/${userId}.json`);
  }

  /**
   * List all users (admin only)
   */
  async listUsers(): Promise<Omit<User, 'passwordHash' | 'apiKey' | 'awsAccessKeyId' | 'awsSecretAccessKey' | 'awsSessionToken'>[]> {
    try {
      const index = await this.storage.readJson<{ [username: string]: string }>('users/username-index.json');
      const userIds = Object.values(index);
      
      const users = await Promise.all(
        userIds.map(async (userId) => {
          const user = await this.getUserById(userId);
          if (!user) return null;
          
          const { passwordHash, apiKey, awsAccessKeyId, awsSecretAccessKey, awsSessionToken, ...safeUser } = user;
          return safeUser;
        })
      );

      return users.filter((u): u is NonNullable<typeof u> => u !== null);
    } catch (error) {
      return [];
    }
  }

  /**
   * Encrypt sensitive data
   */
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv) as crypto.CipherGCM;
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt sensitive data
   */
  private decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv) as crypto.DecipherGCM;
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
