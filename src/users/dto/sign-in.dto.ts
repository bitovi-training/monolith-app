import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO for user sign in
 */
export class SignInDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
