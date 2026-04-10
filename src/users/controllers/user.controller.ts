import { Controller, Get, Param, Logger } from '@nestjs/common';
import { UserService } from '../services/user.service';

/**
 * UserController
 * 
 * Handles user-related endpoints for retrieving user information.
 */
@Controller('users')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  /**
   * Validate if a user exists by ID
   * 
   * GET /users/:userId/validate
   * 
   * @param userId - User's unique identifier
   * @returns User validation response
   */
  @Get(':userId/validate')
  async validateUser(@Param('userId') userId: string): Promise<{ exists: boolean; userId: string }> {
    this.logger.log(`GET /users/${userId}/validate`);
    const exists = await this.userService.userExists(userId);
    
    return {
      exists,
      userId,
    };
  }

  /**
   * Note: user detail retrieval intentionally omitted to keep this service auth-focused.
   */
}
