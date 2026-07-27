import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, IsUUID, IsUrl, Min, Max, MinLength } from 'class-validator';

export class CreatePhaseDto {
  @IsNumber()
  phaseNumber: number;

  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  estimatedDays?: number;
}

export class UpdatePhaseDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  completionPct?: number;

  @IsOptional()
  @IsEnum(['not_started', 'in_progress', 'completed', 'blocked', 'skipped'])
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  startDate?: Date;

  @IsOptional()
  endDate?: Date;
}

export class CreateMilestoneDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  requiresOwnerApproval?: boolean;

  @IsOptional()
  dueDate?: Date;
}

export class UpdateMilestoneDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['pending', 'in_progress', 'completed', 'blocked', 'overdue', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @IsOptional()
  @IsNumber()
  estimatedHours?: number;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['todo', 'in_progress', 'done', 'blocked', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @IsOptional()
  @IsNumber()
  actualHours?: number;
}

export class CreateProgressUpdateDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsUUID()
  phaseId?: string;

  @IsOptional()
  @IsUUID()
  milestoneId?: string;

  @IsOptional()
  @IsEnum(['owner_only', 'investors', 'public'])
  visibility?: string;

  @IsOptional()
  attachments?: any[];
}

export class CreateDeploymentDto {
  @IsEnum(['ios', 'android', 'web', 'desktop'])
  platform: string;

  @IsString()
  version: string;

  @IsNumber()
  buildNumber: number;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  storeUrl?: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  downloadUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateDeploymentDto {
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  storeUrl?: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  downloadUrl?: string;

  @IsOptional()
  @IsEnum(['preparing', 'submitted', 'in_review', 'approved', 'rejected', 'live'])
  status?: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AddTeamMemberDto {
  @IsUUID()
  userId: string;

  @IsEnum(['lead_developer', 'developer', 'designer', 'project_manager', 'qa_engineer', 'devops'])
  role: string;

  @IsOptional()
  @IsBoolean()
  canUpdateProgress?: boolean;

  @IsOptional()
  @IsBoolean()
  canPostUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  canManageTasks?: boolean;
}

export class UpdateTeamMemberDto {
  @IsOptional()
  @IsEnum(['lead_developer', 'developer', 'designer', 'project_manager', 'qa_engineer', 'devops'])
  role?: string;

  @IsOptional()
  @IsBoolean()
  canUpdateProgress?: boolean;

  @IsOptional()
  @IsBoolean()
  canPostUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  canManageTasks?: boolean;

  @IsOptional()
  @IsEnum(['active', 'inactive', 'removed'])
  status?: string;
}
