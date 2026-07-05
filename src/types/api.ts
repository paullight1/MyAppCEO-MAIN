export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface ApiError {
    success: false;
    message: string;
    code?: string;
    details?: Record<string, unknown>;
}

export interface ValidationError {
    success: false;
    message: string;
    validationErrors: {
        field: string;
        message: string;
    }[];
}

export type ApiResult<T> = ApiResponse<T> | ApiError | ValidationError;

export type AppWorkspaceSourceType = 'manual' | 'store_import' | 'idea_generated' | 'marketplace_listing';
export type AppWorkspaceStatus = 'draft' | 'setup' | 'active' | 'paused' | 'archived' | 'deleted';
export type AppWorkspaceRole = 'owner' | 'cofounder' | 'shareholder' | 'prospective' | 'admin' | 'support';
export type AppWorkspaceMemberStatus = 'invited' | 'active' | 'suspended' | 'removed';

export interface AppWorkspace {
    id: string;
    owner_id: string;
    name: string;
    slug?: string;
    category?: string;
    description?: string;
    icon_url?: string;
    status: AppWorkspaceStatus;
    source_type: AppWorkspaceSourceType;
    listing_id?: string;
    source_idea_id?: string;
    imported_store_app_id?: string;
    setup_state: Record<string, unknown>;
    metadata: Record<string, unknown>;
    created_by?: string;
    onboarding_completed_at?: string;
    created_at: string;
    updated_at: string;
}

export interface AppWorkspaceMember {
    id: string;
    workspace_id: string;
    user_id: string;
    role: AppWorkspaceRole;
    status: AppWorkspaceMemberStatus;
    invited_by?: string;
    invited_at?: string;
    joined_at?: string;
    removed_at?: string;
    permissions: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface ImportedStoreApp {
    id: string;
    owner_id: string;
    platform: 'ios' | 'android';
    provider: 'apple_app_store' | 'google_play';
    external_app_id?: string;
    bundle_id?: string;
    package_name?: string;
    store_url: string;
    name: string;
    developer?: string;
    category?: string;
    description?: string;
    icon_url?: string;
    artwork_url?: string;
    screenshots: string[];
    rating?: number;
    rating_count?: number;
    price_text?: string;
    version?: string;
    release_date?: string;
    store_updated_at?: string;
    raw_metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export function isApiError(result: ApiResult<unknown>): result is ApiError {
    return !result.success && 'message' in result;
}

export function isValidationError(result: ApiResult<unknown>): result is ValidationError {
    return !result.success && 'validationErrors' in result;
}

export function getErrorMessage(result: ApiResult<unknown>): string {
    if (isValidationError(result)) {
        return result.validationErrors
            .map(e => `${e.field}: ${e.message}`)
            .join(', ');
    }
    if (isApiError(result)) {
        return result.message;
    }
    if ('message' in result) {
        return result.message;
    }
    return 'An unknown error occurred';
}
