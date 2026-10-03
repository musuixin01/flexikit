import { Equals, IsString } from 'class-validator';

export class DeleteAccountDto {
  @IsString()
  @Equals('DELETE', { message: '删除账户确认文本必须为 DELETE' })
  readonly confirmation!: string;
}
