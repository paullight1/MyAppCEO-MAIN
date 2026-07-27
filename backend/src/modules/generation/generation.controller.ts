import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GenerationService } from './generation.service';
import { GenerationRequestDto, ReviewSubmissionDto, SandboxRunRequestDto, ScreenGenerationRequestDto } from './dto/generation.dto';

@ApiTags('Generation Pipeline')
@ApiBearerAuth()
@Controller('generation')
@UseGuards(JwtAuthGuard)
export class GenerationController {
  constructor(private readonly generationService: GenerationService) {}

  @Post('ideas/:ideaId/build-plan')
  @ApiOperation({ summary: 'Generate a durable build plan artifact from a PRD' })
  createBuildPlan(
    @Param('ideaId', ParseUUIDPipe) ideaId: string,
    @Body() dto: GenerationRequestDto,
    @Request() req: any,
  ) {
    return this.generationService.createBuildPlan(ideaId, req.user.id, dto);
  }

  @Post('ideas/:ideaId/code')
  @ApiOperation({ summary: 'Generate a durable code scaffold artifact from a build plan' })
  generateCode(
    @Param('ideaId', ParseUUIDPipe) ideaId: string,
    @Body() dto: GenerationRequestDto,
    @Request() req: any,
  ) {
    return this.generationService.generateCode(ideaId, req.user.id, dto);
  }

  @Post('ideas/:ideaId/screens/:nodeId')
  @ApiOperation({ summary: 'Generate a durable screen spec artifact from a PRD page node' })
  generateScreenArtifact(
    @Param('ideaId', ParseUUIDPipe) ideaId: string,
    @Param('nodeId') nodeId: string,
    @Body() dto: ScreenGenerationRequestDto,
    @Request() req: any,
  ) {
    return this.generationService.generateScreenArtifact(ideaId, nodeId, req.user.id, dto);
  }

  @Post('artifacts/:artifactId/sandbox-run')
  @ApiOperation({ summary: 'Prepare a durable sandbox runner contract for a generated code scaffold' })
  createSandboxRun(
    @Param('artifactId', ParseUUIDPipe) artifactId: string,
    @Body() dto: SandboxRunRequestDto,
    @Request() req: any,
  ) {
    return this.generationService.createSandboxRun(artifactId, req.user.id, dto);
  }

  @Post('ideas/:ideaId/submit-review')
  @ApiOperation({ summary: 'Submit generated code artifacts for admin review' })
  submitForReview(
    @Param('ideaId', ParseUUIDPipe) ideaId: string,
    @Body() dto: ReviewSubmissionDto,
    @Request() req: any,
  ) {
    return this.generationService.submitForReview(ideaId, req.user.id, dto);
  }

  @Get('ideas/:ideaId/artifacts')
  @ApiOperation({ summary: 'List generated artifacts for an idea' })
  listArtifacts(
    @Param('ideaId', ParseUUIDPipe) ideaId: string,
    @Request() req: any,
  ) {
    return this.generationService.listArtifacts(ideaId, req.user.id);
  }

  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Get generation job status' })
  getJob(@Param('jobId', ParseUUIDPipe) jobId: string, @Request() req: any) {
    return this.generationService.getJob(jobId, req.user.id);
  }


  @Patch('jobs/:jobId/cancel')
  @ApiOperation({ summary: 'Cancel a queued or running generation job' })
  cancelJob(@Param('jobId', ParseUUIDPipe) jobId: string, @Request() req: any) {
    return this.generationService.cancelJob(jobId, req.user.id);
  }

  @Post('jobs/:jobId/retry')
  @ApiOperation({ summary: 'Retry a failed or cancelled generation job' })
  retryJob(@Param('jobId', ParseUUIDPipe) jobId: string, @Request() req: any) {
    return this.generationService.retryJob(jobId, req.user.id);
  }
}
