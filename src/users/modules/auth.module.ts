import { Module } from '@nestjs/common';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { JwtService } from '../services/jwt.service';
import { PasswordService } from '../services/password.service';
import { UserRepository } from '../repositories/user.repository';

/**
 * AuthModule
 * 
 * Encapsulates authentication functionality including sign up, sign in, and logout.
 */
@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtService, PasswordService, UserRepository],
  exports: [AuthService, JwtService, UserRepository],
})
export class AuthModule {}
