import { Listing } from '../../../packages/types/src';

export type AppListing = Listing;

export interface UserStake {
    id: string;
    userId: string;
    listingId: string;
    ownershipPercentage: number;
    amountInvested: number;
    currentValue: number;
    totalDividends: number;
    acquiredAt: string;
    listing?: AppListing;
}

export interface WatchlistItem {
    id: string;
    listingId: string;
    addedAt: string;
    notes?: string;
    listing?: AppListing;
}

export interface SellerProfile {
    id: string;
    name: string;
    avatarUrl?: string;
    verified: boolean;
    memberSince: string;
    completedDeals: number;
}
