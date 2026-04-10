import {
  IsArray,
  IsNotEmpty,
  ValidateNested,
  IsInt,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateOrderProductDto {
  @IsNotEmpty()
  productId!: string;

  @IsInt()
  @IsNotEmpty()
  quantity!: number; // Positive to add, negative to subtract, 0 for no change
}

export class UpdateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateOrderProductDto)
  @IsOptional()
  products?: UpdateOrderProductDto[];
}
