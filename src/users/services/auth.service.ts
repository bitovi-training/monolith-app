import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { SignUpDto } from '../dto/sign-up.dto';
import { SignInDto } from '../dto/sign-in.dto';
import { AuthResponse } from '../dto/auth-response.dto';
import { UserRepository } from '../repositories/user.repository';
import { PasswordService } from './password.service';
import { JwtService } from './jwt.service';

/**
 * AuthService
 * 
 * Handles user authentication logic including sign up, sign in, and logout.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Register a new user
   * 
   * @param signUpDto - Sign up data
   * @returns Authentication response with token and user info
   * @throws ConflictException if email is already registered
   */
  async signUp(signUpDto: SignUpDto): Promise<AuthResponse> {
    this.logger.log(`Sign up attempt: ${signUpDto.email}`);

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(signUpDto.email);
    if (existingUser) {
      this.logger.warn(`Sign up failed: email already registered - ${signUpDto.email}`);
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await this.passwordService.hashPassword(signUpDto.password);

    // Create user with default or provided roles
    const user = await this.userRepository.create(
      signUpDto.email,
      passwordHash,
      signUpDto.roles || ['user'],
    );

    // Generate JWT token
    const accessToken = this.jwtService.generateToken(user.id, user.email, user.roles);

    this.logger.log(`Sign up successful: ${user.email} (${user.id})`);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles,
      },
    };
  }

  /**
   * Authenticate an existing user
   * 
   * @param signInDto - Sign in credentials
   * @returns Authentication response with token and user info
   * @throws UnauthorizedException if credentials are invalid
   */
  async signIn(signInDto: SignInDto): Promise<AuthResponse> {
    this.logger.log(`Sign in attempt: ${signInDto.email}`);

    // Find user by email
    const user = await this.userRepository.findByEmail(signInDto.email);
    if (!user) {
      this.logger.warn(`Sign in failed: user not found - ${signInDto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await this.passwordService.verifyPassword(
      signInDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      this.logger.warn(`Sign in failed: invalid password - ${signInDto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update user's last activity
    await this.userRepository.touch(user.id);

    // Generate JWT token
    const accessToken = this.jwtService.generateToken(user.id, user.email, user.roles);

    this.logger.log(`Sign in successful: ${user.email} (${user.id})`);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles,
      },
    };
  }

  /**
   * Logout a user by invalidating their token
   * 
   * @param token - JWT token to invalidate
   * @returns Success message
   */
  async logout(token: string): Promise<{ message: string }> {
    this.logger.log('User logged out successfully');

    return {
      message: 'Logged out successfully',
    };
  }

  // Token blacklisting intentionally omitted in this mock service.
}
