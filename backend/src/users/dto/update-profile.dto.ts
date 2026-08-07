import { IsString, IsOptional, IsEmail } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  avatarType?: 'upload' | 'preset' | 'emoji';

  @IsOptional()
  @IsEmail()
  email?: string;
}