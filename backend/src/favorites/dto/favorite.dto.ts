import { IsInt } from 'class-validator';

export class FavoriteDto {
  @IsInt()
  tool_id: number;
}