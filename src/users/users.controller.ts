import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { SignInDto, SignUpDto, UsersService } from './users.service';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('auth/signup')
  @HttpCode(HttpStatus.CREATED)
  signUp(@Body() body: SignUpDto) {
    return this.usersService.signUp(body);
  }

  @Post('auth/signin')
  @HttpCode(HttpStatus.OK)
  signIn(@Body() body: SignInDto) {
    return this.usersService.signIn(body);
  }

  @Post('auth/logout')
  @HttpCode(HttpStatus.OK)
  logout(@Headers('authorization') authorization?: string) {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    return this.usersService.logout();
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('users/:userId/validate')
  async validateUser(@Param('userId') userId: string) {
    return {
      exists: await this.usersService.userExists(userId),
      userId,
    };
  }
}
