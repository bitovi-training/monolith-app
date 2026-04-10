import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth.module';
import { HealthController } from './controllers/health.controller';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';
import { UserRepository } from './repositories/user.repository';

@Module({
  imports: [AuthModule],
  controllers: [HealthController, UserController],
  providers: [UserService, UserRepository],
})
export class UsersModule {}
