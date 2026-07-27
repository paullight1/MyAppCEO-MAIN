import { IsString, IsOptional } from 'class-validator';

export class CreateRuleDto {
  @IsString()
  name: string;

  @IsString()
  triggerType: string;

  @IsString()
  triggerValue: string;

  @IsString()
  actionType: string;

  actionPayload: any;
}
