export type UserRole = 'ceo' | 'investor' | 'creator' | 'admin' | 'analyst';
export type ListingStatus = 'draft' | 'pending_review' | 'under_review' | 'active' | 'paused' | 'sold' | 'rejected' | 'archived';
export type ListingType = 'sale' | 'investment' | 'both';
export type AppStatus = 'development' | 'publishing' | 'live' | 'sold' | 'archived';
export type AppSubmissionStatus = 'pending_review' | 'submitted' | 'under_review' | 'approved' | 'rejected';
export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'countered';
export type IdeaStatus = 'draft' | 'prd_generated' | 'designs_generated' | 'submitted' | 'completed';
export type IdeaPlatform = 'mobile' | 'web' | 'both';
export type PRDNodeType = 'root' | 'page' | 'feature' | 'component' | 'action';
export type PRDNodeStatus = 'pending' | 'approved' | 'needs_review';
export type ViewMode = 'prd' | 'design' | 'split';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  fullName?: string;
  companyName?: string;
  avatarUrl?: string;
  kycStatus: string;
  stripeAccountId?: string;
  stripeOnboardingComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface App {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description?: string;
  category?: string;
  status: AppStatus;
  monthlyRevenue: number;
  monthlyUsers: number;
  estimatedValue: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Listing {
  id: string;
  appId?: string;
  sellerId: string;
  name: string;
  slug: string;
  tagline?: string;
  category: string;
  shortDescription: string;
  longDescription: string;
  imageUrl: string;
  screenshots?: string[];
  demoVideoUrl?: string;
  techStack?: string[] | string;
  listingType: ListingType;
  askingPrice: number | null;
  targetRaise: number | null;
  equityAvailable: number | null;
  monthlyRevenue: number | null;
  revenueVerified: boolean;
  revenueProofUrl?: string;
  ageMonths: number;
  totalUsers: number;
  status: ListingStatus;

  // Analytics & Meta
  viewsCount?: number;
  savesCount?: number;
  offersCount?: number;
  trustScore?: number;
  repositoryUrl?: string;
  githubRepoUrl?: string;
  appStoreUrl?: string;
  playStoreUrl?: string;
  documentationUrl?: string;
  apiRequirements?: string;
  storeMetadata?: {
    source?: 'apple-app-store' | 'google-play';
    platform?: 'ios' | 'android';
    storeId?: string;
    developer?: string;
    bundleId?: string;
    packageName?: string;
    rating?: number;
    ratingCount?: number;
    priceText?: string;
    contentRating?: string;
    version?: string;
    releaseDate?: string;
    updatedAt?: string;
  };
  projectedApy?: number;
  valuationMultiple?: number;
  approvalStage?: 'draft' | 'awaiting_technical' | 'awaiting_financial' | 'approved' | 'rejected';

  // Data Room Fields
  trafficMetrics?: {
    monthlyVisitors: number;
    bounceRate: number;
    avgSessionDuration: number;
  };

  unitEconomics?: {
    cac: number;
    ltv: number;
    mrrChurn: number;
  };

  handoverReadiness?: {
    hostingProvider: string;
    domainRegistrar: string;
    hasDbSchema: boolean;
    hasSop: boolean;
  };

  createdAt: string;
  updatedAt?: string;
}

export interface DashboardOverview {
  mrr: {
    value: number;
    change: number;
  };
  users: {
    dau: number;
    mau: number;
    growth: number;
  };
  valuation: {
    current: number;
    multiple: number;
  };
}

export interface ForecastScenario {
  month: string;
  conservative: number;
  base: number;
  optimistic: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface Offer {
  id: string;
  listingId: string;
  buyerId: string;
  amount: number;
  message?: string;
  status: OfferStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export interface PRDNode {
  id: string;
  type: PRDNodeType;
  label: string;
  description?: string;
  children: PRDNode[];
  status: PRDNodeStatus;
  designGenerated: boolean;
  designUrl?: string;
  aiSuggestions?: string[];
}

export interface Idea {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  targetAudience?: string;
  problemSolved?: string;
  platform: IdeaPlatform;
  category: string;
  brandColors: BrandColors;
  referenceApps?: string[];
  prdTree: PRDNode[];
  status: IdeaStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface DesignRequest {
  nodeId: string;
  nodeType: 'page' | 'feature';
  label: string;
  description: string;
  children: string[];
  brandColors: BrandColors;
  platform: 'mobile' | 'web' | 'tablet';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  action?: string;
}

export interface GenerationProgress {
  nodeId: string;
  progress: number;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  imageUrl?: string;
  error?: string;
}
