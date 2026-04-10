import { Test, TestingModule } from '@nestjs/testing';
import { PasswordService } from './password.service';
import * as bcrypt from 'bcrypt';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswordService],
    }).compile();

    service = module.get<PasswordService>(PasswordService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      const password = 'testPassword123';
      const hash = await service.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash).toMatch(/^\$2[aby]\$.{56}$/); // bcrypt hash format
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'testPassword123';
      const hash1 = await service.hashPassword(password);
      const hash2 = await service.hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string password', async () => {
      const password = '';
      const hash = await service.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).toMatch(/^\$2[aby]\$.{56}$/);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for matching password and hash', async () => {
      const password = 'testPassword123';
      const hash = await bcrypt.hash(password, 10);

      const result = await service.verifyPassword(password, hash);

      expect(result).toBe(true);
    });

    it('should return false for non-matching password and hash', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword456';
      const hash = await bcrypt.hash(password, 10);

      const result = await service.verifyPassword(wrongPassword, hash);

      expect(result).toBe(false);
    });

    it('should return false for empty password against valid hash', async () => {
      const password = 'testPassword123';
      const hash = await bcrypt.hash(password, 10);

      const result = await service.verifyPassword('', hash);

      expect(result).toBe(false);
    });

    it('should handle case-sensitive passwords correctly', async () => {
      const password = 'TestPassword123';
      const hash = await bcrypt.hash(password, 10);

      const resultCorrectCase = await service.verifyPassword('TestPassword123', hash);
      const resultWrongCase = await service.verifyPassword('testpassword123', hash);

      expect(resultCorrectCase).toBe(true);
      expect(resultWrongCase).toBe(false);
    });
  });
});
