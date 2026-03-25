import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from '../services/auth.service';
import { SignUpDto } from '../dto/sign-up.dto';
import { SignInDto } from '../dto/sign-in.dto';
import { AuthResponse } from '../dto/auth-response.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockAuthResponse: AuthResponse = {
    accessToken: 'jwt-token-123',
    user: {
      id: 'user-123',
      email: 'test@example.com',
      roles: ['user'],
    },
  };

  beforeEach(async () => {
    const mockAuthService = {
      signUp: jest.fn(),
      signIn: jest.fn(),
      logout: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signUp', () => {
    it('should successfully sign up a new user', async () => {
      const signUpDto: SignUpDto = {
        email: 'newuser@example.com',
        password: 'password123',
        roles: ['user'],
      };

      authService.signUp.mockResolvedValue(mockAuthResponse);

      const result = await controller.signUp(signUpDto);

      expect(authService.signUp).toHaveBeenCalledWith(signUpDto);
      expect(result).toEqual(mockAuthResponse);
    });

    it('should propagate errors from auth service', async () => {
      const signUpDto: SignUpDto = {
        email: 'existing@example.com',
        password: 'password123',
      };

      authService.signUp.mockRejectedValue(new Error('Email already registered'));

      await expect(controller.signUp(signUpDto)).rejects.toThrow('Email already registered');
    });
  });

  describe('signIn', () => {
    it('should successfully sign in a user', async () => {
      const signInDto: SignInDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      authService.signIn.mockResolvedValue(mockAuthResponse);

      const result = await controller.signIn(signInDto);

      expect(authService.signIn).toHaveBeenCalledWith(signInDto);
      expect(result).toEqual(mockAuthResponse);
    });

    it('should propagate UnauthorizedException from auth service', async () => {
      const signInDto: SignInDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      authService.signIn.mockRejectedValue(new UnauthorizedException('Invalid credentials'));

      await expect(controller.signIn(signInDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should successfully logout a user', async () => {
      const token = 'Bearer jwt-token-123';
      const expectedResult = { message: 'Logged out successfully' };

      authService.logout.mockResolvedValue(expectedResult);

      const result = await controller.logout(token);

      expect(authService.logout).toHaveBeenCalledWith('jwt-token-123');
      expect(result).toEqual(expectedResult);
    });

    it('should throw UnauthorizedException when token does not have Bearer prefix', async () => {
      const token = 'jwt-token-123';

      await expect(controller.logout(token)).rejects.toThrow(UnauthorizedException);
      await expect(controller.logout(token)).rejects.toThrow('Missing or invalid Authorization header');
    });

    it('should throw UnauthorizedException when authorization header is missing', async () => {
      await expect(controller.logout(undefined as any)).rejects.toThrow(UnauthorizedException);
      await expect(controller.logout(undefined as any)).rejects.toThrow('Missing or invalid Authorization header');
    });

    it('should throw UnauthorizedException when authorization header is empty', async () => {
      await expect(controller.logout('')).rejects.toThrow(UnauthorizedException);
      await expect(controller.logout('')).rejects.toThrow('Missing or invalid Authorization header');
    });
  });
});
