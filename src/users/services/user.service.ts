import { Injectable, Logger } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';

/**
 * UserService
 * 
 * Handles user-related business logic.
 */
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly userRepository: UserRepository) {}

  /**
   * Check if a user exists by ID
   * 
   * @param userId - User's unique identifier
   * @returns true if user exists, false otherwise
   */
  async userExists(userId: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    return !!user;
  }

  /**
   * Get user by ID
   * 
   * @param userId - User's unique identifier
   * @returns User if found, undefined otherwise
   */
  async getUserById(userId: string) {
    return this.userRepository.findById(userId);
  }
}
