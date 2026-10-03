import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  AUTH_CLIENT_TYPES,
  type AuthClientContextInput,
} from '../auth-client-context';

export class AuthClientContextDto implements AuthClientContextInput {
  @IsOptional()
  @IsIn(AUTH_CLIENT_TYPES)
  client_type?: (typeof AUTH_CLIENT_TYPES)[number];

  @IsOptional()
  @IsUUID('4')
  client_instance_id?: string;

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  client_name?: string;
}
