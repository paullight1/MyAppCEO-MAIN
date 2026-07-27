import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
} from "@nestjs/common";
import { ListingService } from "./listing.service";
import {
  CreateListingDto,
  ListingFilterDto,
  ReviewListingDto,
  TrackListingViewDto,
  UpdateListingDto,
  UpdateListingStatusDto,
  UpdatePricingDto,
} from "./dto/listing.dto";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { Request } from "express";

@ApiTags("Marketplace / Listings")
@Controller("listings")
export class ListingController {
  constructor(private readonly listingService: ListingService) {}

  @Get()
  @ApiOperation({ summary: "Get all active listings with filters" })
  async findAll(
    @Query() filters: ListingFilterDto,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.listingService.findAll(
      filters,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all listings owned by the current user" })
  async findAllMine(@CurrentUser() user: any) {
    return this.listingService.findAllMine(user.id);
  }

  @Post("sync-search")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Sync all active listings to Meilisearch" })
  async syncToSearch() {
    return this.listingService.syncAllToSearch();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a single listing by ID" })
  async findOne(@Param("id") id: string) {
    return this.listingService.findOne(id);
  }

  @Post(":id/views")
  @ApiOperation({ summary: "Track a public listing view" })
  async trackView(
    @Param("id") id: string,
    @Body() dto: TrackListingViewDto,
    @Req() req: Request,
  ) {
    return this.listingService.trackView(id, dto, {
      ip: req.ip,
      userAgent: req.get("user-agent"),
      referrer: req.get("referer") || req.get("referrer"),
    });
  }

  @Get(":id/history")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get listing activity history" })
  async getHistory(@Param("id") id: string, @CurrentUser() user: any) {
    return this.listingService.getHistory(id, user);
  }

  @Get(":id/review")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get listing review state" })
  async getReview(@Param("id") id: string, @CurrentUser() user: any) {
    return this.listingService.getReview(id, user);
  }

  @Post(":id/review")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Submit or process listing review metadata" })
  async review(
    @Param("id") id: string,
    @Body() dto: ReviewListingDto,
    @CurrentUser() user: any,
  ) {
    return this.listingService.review(id, dto, user);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new app listing" })
  async create(@Body() dto: CreateListingDto, @CurrentUser() user: any) {
    return this.listingService.create(dto, user.id);
  }

  @Patch(":id/status")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update listing status" })
  async updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateListingStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.listingService.updateStatus(id, dto, user.id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update listing details" })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateListingDto,
    @CurrentUser() user: any,
  ) {
    return this.listingService.update(id, dto, user.id);
  }

  @Patch(":id/pricing")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update listing pricing and details" })
  async updatePricing(
    @Param("id") id: string,
    @Body() dto: UpdatePricingDto,
    @CurrentUser() user: any,
  ) {
    return this.listingService.updatePricing(id, dto, user.id);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete a listing" })
  async remove(@Param("id") id: string, @CurrentUser() user: any) {
    return this.listingService.remove(id, user.id);
  }
}
