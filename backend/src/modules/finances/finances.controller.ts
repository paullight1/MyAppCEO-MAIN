import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FinancesService } from './finances.service';

@ApiTags('Finances')
@Controller('finances')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FinancesController {
  constructor(private readonly financesService: FinancesService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get the authenticated user finance dashboard' })
  async getDashboard(@CurrentUser() user: any): Promise<any> {
    return {
      success: true,
      data: await this.financesService.getDashboard(user.id),
    };
  }
}
