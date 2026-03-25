import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { User } from '../models/user.entity';
import { v4 as uuidv4 } from 'uuid';

/**
 * UserRepository
 * 
 * In-memory storage for user data.
 * In production, this would be replaced with a database (e.g., PostgreSQL, MongoDB).
 * 
 * Mock users are seeded on startup for development and testing.
 */
@Injectable()
export class UserRepository implements OnModuleInit {
  private readonly logger = new Logger(UserRepository.name);
  private readonly users: Map<string, User> = new Map();

  /**
   * Seed mock users on module initialization
   */
  async onModuleInit() {
    await this.seedMockUsers();
  }

  /**
   * Seed predefined test users for development
   * All passwords are: password123
   */
  private async seedMockUsers() {
    // Pre-hashed password for 'password123' (bcrypt hash)
    const defaultPasswordHash = '$2b$10$6dg8POodXtd8msXSKr0KIuN0sQskcRu4/04IWdH2nTWQdG5pbSH26';
    
    const mockUsers = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        email: 'admin@example.com',
        passwordHash: defaultPasswordHash,
        roles: ['admin', 'user'],
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        email: 'user@example.com',
        passwordHash: defaultPasswordHash,
        roles: ['user'],
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        email: 'manager@example.com',
        passwordHash: defaultPasswordHash,
        roles: ['manager', 'user'],
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        email: 'test@example.com',
        passwordHash: defaultPasswordHash,
        roles: ['user'],
      },
    ];

    const now = new Date();
    
    mockUsers.forEach((mockUser) => {
      const user: User = {
        ...mockUser,
        createdAt: now,
        updatedAt: now,
      };
      this.users.set(user.id, user);
    });

    this.logger.log(`Seeded ${mockUsers.length} mock users for development`);
    this.logger.log('Mock credentials - Email: admin@example.com, user@example.com, manager@example.com, test@example.com | Password: password123');
  }

  /**
   * Find a user by email
   * 
   * @param email - User's email address
   * @returns User if found, undefined otherwise
   */
  async findByEmail(email: string): Promise<User | undefined> {
    const normalizedEmail = email.toLowerCase();
    const user = Array.from(this.users.values()).find(
      (u) => u.email.toLowerCase() === normalizedEmail,
    );

    if (user) {
      this.logger.log(`User found by email: ${email}`);
    } else {
      this.logger.log(`User not found by email: ${email}`);
    }

    return user;
  }

  /**
   * Find a user by ID
   * 
   * @param id - User's unique identifier
   * @returns User if found, undefined otherwise
   */
  async findById(id: string): Promise<User | undefined> {
    const user = this.users.get(id);

    if (user) {
      this.logger.log(`User found by ID: ${id}`);
    } else {
      this.logger.log(`User not found by ID: ${id}`);
    }

    return user;
  }

  /**
   * Create a new user
   * 
   * @param email - User's email address
   * @param passwordHash - Hashed password
   * @param roles - Array of role identifiers
   * @returns Created user
   */
  async create(email: string, passwordHash: string, roles: string[]): Promise<User> {
    const now = new Date();
    const user: User = {
      id: uuidv4(),
      email: email.toLowerCase(),
      passwordHash,
      roles: roles.length > 0 ? roles : ['user'], // Default to 'user' role
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(user.id, user);

    this.logger.log('User created', {
      userId: user.id,
      email: user.email,
      roles: user.roles,
    });

    return user;
  }

  /**
   * Update user's last updated timestamp
   * 
   * @param userId - User's unique identifier
   */
  async touch(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.updatedAt = new Date();
      this.logger.log(`User touched: ${userId}`);
    }
  }

  /**
   * Get all users (for debugging/admin purposes)
   * 
   * @returns Array of all users
   */
  async findAll(): Promise<User[]> {
    return Array.from(this.users.values());
  }
}
