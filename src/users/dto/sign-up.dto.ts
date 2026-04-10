import { IsEmail, IsNotEmpty, IsString, MinLength, IsArray, IsOptional } from 'class-validator';

/**
 * DTO for user sign up
 */
export class SignUpDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  roles?: string[];
}
