import { IsString, MinLength } from 'class-validator';
import { AuthClientContextDto } from './auth-client-context.dto';

export class LoginDto extends AuthClientContextDto {
  @IsString()
  username: string;

  @IsString()
  @MinLength(6)
  password: string;
}