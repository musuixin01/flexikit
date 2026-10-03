import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class LogoutDto {
  @IsOptional()
  @IsString()
  @MinLength(50)
  @MaxLength(160)
  refresh_token?: string;
}
