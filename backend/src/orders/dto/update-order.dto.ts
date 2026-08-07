import { IsArray, IsInt } from 'class-validator';

export class UpdateOrderDto {
  @IsArray()
  @IsInt({ each: true })
  ordered_ids: number[];
}