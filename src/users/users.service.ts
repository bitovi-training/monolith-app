import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    roles: string[];
  };
}

export interface SignUpDto {
  email: string;
  password: string;
  roles?: string[];
}

export interface SignInDto {
  email: string;
  password: string;
}

@Injectable()
export class UsersService {
  private readonly users = new Map<string, UserRecord>();

  constructor() {
    this.seedUsers();
  }

  private seedUsers() {
    const now = new Date().toISOString();
    const defaults: Array<{
      id: string;
      email: string;
      password: string;
      roles: string[];
    }> = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        email: 'admin@example.com',
        password: 'password123',
        roles: ['admin', 'user'],
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        email: 'user@example.com',
        password: 'password123',
        roles: ['user'],
      },
    ];

    for (const u of defaults) {
      this.users.set(u.id, {
        id: u.id,
        email: u.email,
        passwordHash: this.hashPassword(u.password),
        roles: u.roles,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  private hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
  }

  private createToken(user: UserRecord): string {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'none', typ: 'JWT' };
    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      iat: now,
      exp: now + 24 * 60 * 60,
    };

    const encode = (value: string) =>
      Buffer.from(value, 'utf-8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

    return `${encode(JSON.stringify(header))}.${encode(JSON.stringify(payload))}.`;
  }

  async signUp(dto: SignUpDto): Promise<AuthResponse> {
    const email = dto.email.toLowerCase();
    const existing = [...this.users.values()].find((u) => u.email === email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const now = new Date().toISOString();
    const user: UserRecord = {
      id: randomUUID(),
      email,
      passwordHash: this.hashPassword(dto.password),
      roles: dto.roles?.length ? dto.roles : ['user'],
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(user.id, user);

    return {
      accessToken: this.createToken(user),
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles,
      },
    };
  }

  async signIn(dto: SignInDto): Promise<AuthResponse> {
    const email = dto.email.toLowerCase();
    const user = [...this.users.values()].find((u) => u.email === email);
    if (!user || user.passwordHash !== this.hashPassword(dto.password)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    user.updatedAt = new Date().toISOString();

    return {
      accessToken: this.createToken(user),
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles,
      },
    };
  }

  async logout(): Promise<{ message: string }> {
    return { message: 'Logged out successfully' };
  }

  userExists(userId: string): boolean {
    return this.users.has(userId);
  }
}
