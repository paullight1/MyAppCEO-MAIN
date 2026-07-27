import { IsString, IsOptional, IsEnum, IsArray, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTopicDto {
  @ApiProperty({ example: 'How to monetize my app?' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'I am looking for advice on monetization strategies...' })
  @IsString()
  content: string;

  @ApiProperty({ example: 'qa' })
  @IsString()
  forumSlug: string;

  @ApiPropertyOptional({ example: ['monetization', 'revenue'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateTopicDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isSolved?: boolean;
}

export class CreatePostDto {
  @ApiProperty({ example: 'Great question! Have you considered subscription model?' })
  @IsString()
  content: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentId?: string;
}

export class UpdatePostDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;
}

export class VoteDto {
  @ApiProperty({ enum: ['topic', 'post'] })
  @IsEnum(['topic', 'post'])
  targetType: 'topic' | 'post';

  @ApiProperty({ example: 'uuid-of-target' })
  @IsString()
  targetId: string;

  @ApiProperty({ enum: ['upvote', 'downvote'] })
  @IsEnum(['upvote', 'downvote'])
  voteType: 'upvote' | 'downvote';
}

export class TopicFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  forum?: string;

  @ApiPropertyOptional({ enum: ['latest', 'popular', 'trending'] })
  @IsOptional()
  @IsEnum(['latest', 'popular', 'trending'])
  sort?: 'latest' | 'popular' | 'trending';

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class PaginatedResponseDto<T> {
  @ApiProperty()
  data: T[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
