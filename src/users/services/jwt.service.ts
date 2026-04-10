import { Injectable, Logger } from '@nestjs/common';

/**
 * JwtService
 * 
 * Generates JWT tokens for authenticated users.
 * This is a MOCK implementation that creates tokens without cryptographic signing.
 * 
 * ⚠️ WARNING: Does not sign tokens. For development/testing only.
 * In production, use a proper JWT library with signature verification.
 */
@Injectable()
export class JwtService {
  private readonly logger = new Logger(JwtService.name);

  /**
   * Generate a JWT token for a user
   * 
   * @param userId - User's unique identifier
   * @param email - User's email address
   * @param roles - Array of role identifiers
   * @returns JWT token string
   */
  generateToken(userId: string, email: string, roles: string[]): string {
    const now = Math.floor(Date.now() / 1000);
    // Use longer expiration in development (30 days), shorter in production (24 hours)
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const expiresIn = isDevelopment ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // 30 days or 24 hours in seconds

    // JWT header
    const header = {
      alg: 'none', // No algorithm (mock implementation)
      typ: 'JWT',
    };

    // JWT payload with standard claims
    const payload = {
      sub: userId, // Subject (user ID)
      email: email,
      roles: roles,
      iat: now, // Issued at
      exp: now + expiresIn, // Expiration time
    };

    // Base64url encode header and payload
    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));

    // Create token without signature (mock implementation)
    const token = `${encodedHeader}.${encodedPayload}.`;

    this.logger.log('Generated JWT token', {
      userId,
      email,
      rolesCount: roles.length,
      expiresAt: new Date((now + expiresIn) * 1000).toISOString(),
    });

    return token;
  }

  /**
   * Base64url encode a string
   * 
   * @param input - String to encode
   * @returns Base64url encoded string
   */
  private base64UrlEncode(input: string): string {
    const base64 = Buffer.from(input, 'utf-8').toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
}
