import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserRepository } from '../repositories/user.repository';
import { PasswordService } from './password.service';
import { JwtService } from './jwt.service';
import { SignUpDto } from '../dto/sign-up.dto';
import { SignInDto } from '../dto/sign-in.dto';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<UserRepository>;
  let passwordService: jest.Mocked<PasswordService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashedPassword123',
    roles: ['user'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockUserRepository = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      touch: jest.fn(),
    };

    const mockPasswordService = {
      hashPassword: jest.fn(),
      verifyPassword: jest.fn(),
    };

    const mockJwtService = {
      generateToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: PasswordService,
          useValue: mockPasswordService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(UserRepository);
    passwordService = module.get(PasswordService);
    jwtService = module.get(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signUp', () => {
    const signUpDto: SignUpDto = {
      email: 'newuser@example.com',
      password: 'password123',
      roles: ['user'],
    };

    it('should successfully sign up a new user', async () => {
      userRepository.findByEmail.mockResolvedValue(undefined);
      passwordService.hashPassword.mockResolvedValue('hashedPassword');
      userRepository.create.mockResolvedValue(mockUser);
      jwtService.generateToken.mockReturnValue('jwt-token-123');

      const result = await service.signUp(signUpDto);

      expect(userRepository.findByEmail).toHaveBeenCalledWith(signUpDto.email);
      expect(passwordService.hashPassword).toHaveBeenCalledWith(signUpDto.password);
      expect(userRepository.create).toHaveBeenCalledWith(
        signUpDto.email,
        'hashedPassword',
        signUpDto.roles,
      );
      expect(jwtService.generateToken).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.email,
        mockUser.roles,
      );
      expect(result).toEqual({
        accessToken: 'jwt-token-123',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          roles: mockUser.roles,
        },
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(service.signUp(signUpDto)).rejects.toThrow(ConflictException);
      await expect(service.signUp(signUpDto)).rejects.toThrow('Email already registered');
      expect(passwordService.hashPassword).not.toHaveBeenCalled();
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('should use default "user" role when roles not provided', async () => {
      const signUpDtoNoRoles: SignUpDto = {
        email: 'newuser@example.com',
        password: 'password123',
      };

      userRepository.findByEmail.mockResolvedValue(undefined);
      passwordService.hashPassword.mockResolvedValue('hashedPassword');
      userRepository.create.mockResolvedValue(mockUser);
      jwtService.generateToken.mockReturnValue('jwt-token-123');

      await service.signUp(signUpDtoNoRoles);

      expect(userRepository.create).toHaveBeenCalledWith(
        signUpDtoNoRoles.email,
        'hashedPassword',
        ['user'],
      );
    });
  });

  describe('signIn', () => {
    const signInDto: SignInDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should successfully sign in a user with valid credentials', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      passwordService.verifyPassword.mockResolvedValue(true);
      jwtService.generateToken.mockReturnValue('jwt-token-123');

      const result = await service.signIn(signInDto);

      expect(userRepository.findByEmail).toHaveBeenCalledWith(signInDto.email);
      expect(passwordService.verifyPassword).toHaveBeenCalledWith(
        signInDto.password,
        mockUser.passwordHash,
      );
      expect(userRepository.touch).toHaveBeenCalledWith(mockUser.id);
      expect(jwtService.generateToken).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.email,
        mockUser.roles,
      );
      expect(result).toEqual({
        accessToken: 'jwt-token-123',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          roles: mockUser.roles,
        },
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      userRepository.findByEmail.mockResolvedValue(undefined);

      await expect(service.signIn(signInDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.signIn(signInDto)).rejects.toThrow('Invalid credentials');
      expect(passwordService.verifyPassword).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      passwordService.verifyPassword.mockResolvedValue(false);

      await expect(service.signIn(signInDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.signIn(signInDto)).rejects.toThrow('Invalid credentials');
      expect(userRepository.touch).not.toHaveBeenCalled();
      expect(jwtService.generateToken).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should successfully logout a user', async () => {
      const token = 'jwt-token-123';

      const result = await service.logout(token);

      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });
});
