import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IdeasService } from './ideas.service';
import {
  CreateIdeaDto,
  UpdateIdeaDto,
  GeneratePRDDto,
  PatchPRDNodeDto,
  RefinePRDNodeDto,
  ExpandPRDNodeDto,
  GenerateDesignsDto,
  EstimateCostDto,
  IdeaFilterDto,
} from './dto/idea.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Ideas')
@Controller('ideas')
export class IdeasController {
  constructor(private readonly ideasService: IdeasService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new app idea' })
  async create(@Body() dto: CreateIdeaDto, @CurrentUser() user: any) {
    return this.ideasService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all ideas with optional filters' })
  async findAll(@Query() filters: IdeaFilterDto) {
    return this.ideasService.findAll(filters);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all ideas owned by the current user' })
  async findMine(@CurrentUser() user: any) {
    return this.ideasService.findMine(user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single idea by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ideasService.findOneForUser(id, user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an idea' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateIdeaDto,
    @CurrentUser() user: any,
  ) {
    return this.ideasService.update(id, dto, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an idea' })
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ideasService.remove(id, user.id);
  }

  @Post(':id/generate-prd')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate PRD for an idea using AI' })
  async generatePRD(
    @Param('id') id: string,
    @Body() dto: GeneratePRDDto,
    @CurrentUser() user: any,
  ) {
    return this.ideasService.generatePRD(id, dto, user.id);
  }

  @Get(':id/prd')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the PRD for an idea' })
  async getPRD(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ideasService.getPRD(id, user.id);
  }

  @Get(':id/prd/versions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get compact PRD version history for an idea' })
  async getPRDVersionHistory(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ideasService.getPRDVersionHistory(id, user.id);
  }

  @Patch(':id/prd')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the editable PRD mind map for an idea' })
  async updatePRD(
    @Param('id') id: string,
    @Body() dto: { nodes: any[] },
    @CurrentUser() user: any,
  ) {
    return this.ideasService.updatePRD(id, dto.nodes, user.id);
  }

  @Get(':id/prd/graph')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the editable PRD as a graph-compatible tree' })
  async getPRDGraph(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ideasService.getPRDGraph(id, user.id);
  }

  @Patch(':id/prd/nodes/:nodeId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Patch a PRD graph node' })
  async patchPRDNode(
    @Param('id') id: string,
    @Param('nodeId') nodeId: string,
    @Body() dto: PatchPRDNodeDto,
    @CurrentUser() user: any,
  ) {
    return this.ideasService.patchPRDNode(id, nodeId, dto, user.id);
  }

  @Post(':id/prd/nodes/:nodeId/refine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refine a PRD graph node' })
  async refinePRDNode(
    @Param('id') id: string,
    @Param('nodeId') nodeId: string,
    @Body() dto: RefinePRDNodeDto,
    @CurrentUser() user: any,
  ) {
    return this.ideasService.refinePRDNode(id, nodeId, dto, user.id);
  }

  @Post(':id/prd/nodes/:nodeId/expand')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Expand a PRD graph node with implementation-ready child nodes' })
  async expandPRDNode(
    @Param('id') id: string,
    @Param('nodeId') nodeId: string,
    @Body() dto: ExpandPRDNodeDto,
    @CurrentUser() user: any,
  ) {
    return this.ideasService.expandPRDNode(id, nodeId, dto, user.id);
  }

  @Post(':id/prd/validate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate PRD graph readiness' })
  async validatePRD(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ideasService.validatePRD(id, user.id);
  }

  @Post(':id/generate-designs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate design mockups for an idea using AI' })
  async generateDesigns(
    @Param('id') id: string,
    @Body() dto: GenerateDesignsDto,
    @CurrentUser() user: any,
  ) {
    return this.ideasService.generateDesigns(id, dto, user.id);
  }

  @Get(':id/designs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all design mockups for an idea' })
  async getDesigns(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ideasService.getDesigns(id, user.id);
  }

  @Post(':id/estimate-cost')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Calculate cost estimate for an idea' })
  async estimateCost(
    @Param('id') id: string,
    @Body() dto: EstimateCostDto,
    @CurrentUser() user: any,
  ) {
    return this.ideasService.estimateCost(id, dto, user.id);
  }

  @Post(':id/convert-to-app')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Convert a fundable idea into a managed app workspace' })
  async convertToApp(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ideasService.convertToApp(id, user.id);
  }
}
