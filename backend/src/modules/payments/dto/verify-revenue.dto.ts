import { IsUUID } from 'class-validator';

/**
 * Legacy compatibility input. The client may identify the app it wants to
 * verify, but never the Stripe account used as evidence. Account identity is
 * resolved from the authenticated seller on the server.
 */
export class VerifyRevenueDto {
  @IsUUID()
  appId: string;
}
