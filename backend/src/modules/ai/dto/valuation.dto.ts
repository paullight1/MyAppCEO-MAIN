import { IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValuationRequestDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  category: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  monthlyRevenue: number;

  @ApiProperty()
  @IsString()
  description: string;
}
