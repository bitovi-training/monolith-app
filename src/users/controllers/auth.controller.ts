import { Controller, Post, Body, HttpCode, HttpStatus, Logger, Headers, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { SignUpDto } from '../dto/sign-up.dto';
import { SignInDto } from '../dto/sign-in.dto';
import { AuthResponse } from '../dto/auth-response.dto';

/**
 * AuthController
 * 
 * Handles authentication endpoints for sign up, sign in, and logout.
 */
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * Sign up a new user
   * 
   * POST /auth/signup
   * 
   * @param signUpDto - User registration data
   * @returns Authentication response with token and user info
   */
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signUp(@Body() signUpDto: SignUpDto): Promise<AuthResponse> {
    this.logger.log(`POST /auth/signup - ${signUpDto.email}`);
    return this.authService.signUp(signUpDto);
  }

  /**
   * Sign in an existing user
   * 
   * POST /auth/signin
   * 
   * @param signInDto - User credentials
   * @returns Authentication response with token and user info
   */
  @Post('signin')
  @HttpCode(HttpStatus.OK)
  async signIn(@Body() signInDto: SignInDto): Promise<AuthResponse> {
    this.logger.log(`POST /auth/signin - ${signInDto.email}`);
    return this.authService.signIn(signInDto);
  }

  /**
   * Logout the current user
   * 
   * POST /auth/logout
   * 
   * @param authorization - Authorization header with Bearer token
   * @returns Success message
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Headers('authorization') authorization?: string): Promise<{ message: string }> {
    this.logger.log('POST /auth/logout');

    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authorization.substring('Bearer '.length).trim();
    return this.authService.logout(token);
  }
}
