import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

/**
 * PasswordService
 * 
 * Handles password hashing and verification using bcrypt.
 */
@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name);
  private readonly saltRounds = 10;

  /**
   * Hash a plain text password
   * 
   * @param password - Plain text password
   * @returns Hashed password
   */
  async hashPassword(password: string): Promise<string> {
    const hash = await bcrypt.hash(password, this.saltRounds);
    this.logger.log('Password hashed successfully');
    return hash;
  }

  /**
   * Verify a password against a hash
   * 
   * @param password - Plain text password
   * @param hash - Hashed password to compare against
   * @returns True if password matches, false otherwise
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const isMatch = await bcrypt.compare(password, hash);
    this.logger.log(`Password verification: ${isMatch ? 'success' : 'failed'}`);
    return isMatch;
  }
}
