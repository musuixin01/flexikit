import { IsString, Length } from 'class-validator';

export class AdminDeleteUserDto {
  @IsString()
  @Length(1, 50)
  readonly confirmationUsername!: string;
}
