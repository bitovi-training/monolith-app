import { Test, TestingModule } from '@nestjs/testing';
import { UserRepository } from './user.repository';

describe('UserRepository', () => {
  let repository: UserRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserRepository],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);
    // Wait for mock users to be seeded
    await repository.onModuleInit();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findByEmail', () => {
    it('should find a user by email', async () => {
      const user = await repository.findByEmail('admin@example.com');

      expect(user).toBeDefined();
      expect(user?.email).toBe('admin@example.com');
      expect(user?.roles).toContain('admin');
    });

    it('should be case-insensitive when finding by email', async () => {
      const user = await repository.findByEmail('ADMIN@EXAMPLE.COM');

      expect(user).toBeDefined();
      expect(user?.email).toBe('admin@example.com');
    });

    it('should return undefined for non-existent email', async () => {
      const user = await repository.findByEmail('nonexistent@example.com');

      expect(user).toBeUndefined();
    });

    it('should find all seeded users', async () => {
      const emails = [
        'admin@example.com',
        'user@example.com',
        'manager@example.com',
        'test@example.com',
      ];

      for (const email of emails) {
        const user = await repository.findByEmail(email);
        expect(user).toBeDefined();
        expect(user?.email).toBe(email);
      }
    });
  });

  describe('findById', () => {
    it('should find a user by ID', async () => {
      const createdUser = await repository.create(
        'testuser@example.com',
        'hashedPassword',
        ['user'],
      );

      const foundUser = await repository.findById(createdUser.id);

      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(createdUser.id);
      expect(foundUser?.email).toBe('testuser@example.com');
    });

    it('should return undefined for non-existent ID', async () => {
      const user = await repository.findById('non-existent-id');

      expect(user).toBeUndefined();
    });
  });

  describe('create', () => {
    it('should create a new user successfully', async () => {
      const email = 'newuser@example.com';
      const passwordHash = 'hashedPassword123';
      const roles = ['user'];

      const user = await repository.create(email, passwordHash, roles);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe(email);
      expect(user.passwordHash).toBe(passwordHash);
      expect(user.roles).toEqual(roles);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should normalize email to lowercase', async () => {
      const user = await repository.create(
        'TestUser@EXAMPLE.COM',
        'hashedPassword',
        ['user'],
      );

      expect(user.email).toBe('testuser@example.com');
    });

    it('should default to "user" role when empty roles array provided', async () => {
      const user = await repository.create(
        'defaultrole@example.com',
        'hashedPassword',
        [],
      );

      expect(user.roles).toEqual(['user']);
    });

    it('should allow multiple roles', async () => {
      const roles = ['user', 'admin', 'manager'];
      const user = await repository.create(
        'multirole@example.com',
        'hashedPassword',
        roles,
      );

      expect(user.roles).toEqual(roles);
    });

    it('should generate unique IDs for different users', async () => {
      const user1 = await repository.create('user1@example.com', 'hash1', ['user']);
      const user2 = await repository.create('user2@example.com', 'hash2', ['user']);

      expect(user1.id).not.toBe(user2.id);
    });
  });

  describe('touch', () => {
    it('should update the updatedAt timestamp', async () => {
      const user = await repository.create(
        'touchtest@example.com',
        'hashedPassword',
        ['user'],
      );

      const originalUpdatedAt = user.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await repository.touch(user.id);

      const updatedUser = await repository.findById(user.id);
      expect(updatedUser?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should not throw error for non-existent user ID', async () => {
      await expect(repository.touch('non-existent-id')).resolves.not.toThrow();
    });
  });

  describe('findAll', () => {
    it('should return all users including seeded ones', async () => {
      const users = await repository.findAll();

      expect(users.length).toBeGreaterThanOrEqual(4); // At least 4 seeded users
      expect(users.some((u) => u.email === 'admin@example.com')).toBe(true);
      expect(users.some((u) => u.email === 'user@example.com')).toBe(true);
    });

    it('should include newly created users', async () => {
      const newUser = await repository.create(
        'findalltest@example.com',
        'hashedPassword',
        ['user'],
      );

      const users = await repository.findAll();

      expect(users.some((u) => u.id === newUser.id)).toBe(true);
    });
  });
});
