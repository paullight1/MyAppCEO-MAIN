import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { DRIZZLE } from '../../database/database.module';
import { apps, socialAccounts } from '../../database/schema';
import { eq, and } from 'drizzle-orm';
import { CacheService } from '../../common/cache/cache.service';
import { TokenCryptoService } from '../../common/crypto/token-crypto.service';

export type SocialPlatform = 'meta' | 'tiktok' | 'twitter';

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  /** Platforms that require PKCE (RFC 7636) during the code exchange. */
  usesPkce?: boolean;
}

interface OAuthStateData {
  userId: string;
  appId: string;
  platform: SocialPlatform;
  codeVerifier?: string;
  createdAt: number;
}

/** Cryptographically-strong, URL-safe random string. */
const randomUrlSafe = (bytes = 32): string =>
  randomBytes(bytes).toString('base64url');

/** BASE64URL(SHA256(verifier)) — the PKCE S256 code challenge. */
const pkceChallenge = (verifier: string): string =>
  createHash('sha256').update(verifier).digest('base64url');

@Injectable()
export class SocialOauthService {
  private static readonly STATE_TTL_SECONDS = 600; // 10 minutes

  private readonly platformConfigs: Record<SocialPlatform, OAuthConfig> = {
    meta: {
      clientId: process.env.META_CLIENT_ID || '',
      clientSecret: process.env.META_CLIENT_SECRET || '',
      redirectUri:
        process.env.META_REDIRECT_URI ||
        'http://localhost:3000/oauth-callback/meta',
      authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
      tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
      scopes: [
        'pages_manage_posts',
        'pages_read_engagement',
        'instagram_basic',
        'instagram_manage_insights',
      ],
    },
    tiktok: {
      clientId: process.env.TIKTOK_CLIENT_ID || '',
      clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
      redirectUri:
        process.env.TIKTOK_REDIRECT_URI ||
        'http://localhost:3000/oauth-callback/tiktok',
      authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
      tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
      scopes: ['user.info.basic', 'video.upload', 'video.list', 'publish.video'],
    },
    twitter: {
      clientId: process.env.TWITTER_CLIENT_ID || '',
      clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
      redirectUri:
        process.env.TWITTER_REDIRECT_URI ||
        'http://localhost:3000/oauth-callback/twitter',
      authUrl: 'https://twitter.com/i/oauth2/authorize',
      tokenUrl: 'https://api.twitter.com/2/oauth2/token',
      scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
      usesPkce: true,
    },
  };

  // In-memory fallback used only when Redis is not configured (local dev).
  // Prod uses the shared cache so state survives across instances/restarts.
  private readonly localStateStore = new Map<string, OAuthStateData>();

  constructor(
    @Inject(DRIZZLE) private db: any,
    private readonly cache: CacheService,
    private readonly tokenCrypto: TokenCryptoService,
  ) {}

  // ─── State store (Redis-backed, in-memory fallback) ────────────────────────

  private stateKey(state: string): string {
    return `oauth:state:${state}`;
  }

  private async putState(state: string, data: OAuthStateData): Promise<void> {
    if (this.cache.isEnabled()) {
      await this.cache.set(
        this.stateKey(state),
        data,
        SocialOauthService.STATE_TTL_SECONDS,
      );
      return;
    }
    this.pruneLocalState();
    this.localStateStore.set(state, data);
  }

  /** Reads and atomically consumes the state (single-use). */
  private async takeState(state: string): Promise<OAuthStateData | null> {
    if (this.cache.isEnabled()) {
      const data = await this.cache.get<OAuthStateData>(this.stateKey(state));
      if (data) await this.cache.del(this.stateKey(state));
      return data;
    }

    const data = this.localStateStore.get(state) ?? null;
    this.localStateStore.delete(state);
    if (!data) return null;
    if (this.isExpired(data)) return null;
    return data;
  }

  private isExpired(data: OAuthStateData): boolean {
    return (
      Date.now() - data.createdAt >
      SocialOauthService.STATE_TTL_SECONDS * 1000
    );
  }

  private pruneLocalState(): void {
    for (const [key, value] of this.localStateStore) {
      if (this.isExpired(value)) this.localStateStore.delete(key);
    }
  }

  // ─── Ownership ─────────────────────────────────────────────────────────────

  private async assertAppOwnership(appId: string, userId: string): Promise<void> {
    const [app] = await this.db
      .select({ ownerId: apps.ownerId })
      .from(apps)
      .where(eq(apps.id, appId));

    if (!app) {
      throw new BadRequestException('App not found');
    }
    if (app.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this app');
    }
  }

  // ─── Authorization ─────────────────────────────────────────────────────────

  async getAuthorizationUrl(
    platform: SocialPlatform,
    appId: string,
    userId: string,
  ): Promise<string> {
    const config = this.platformConfigs[platform];
    if (!config.clientId) {
      throw new BadRequestException(
        `OAuth not configured for ${platform}. Please set environment variables.`,
      );
    }

    await this.assertAppOwnership(appId, userId);

    const state = randomUrlSafe();
    const codeVerifier = config.usesPkce ? randomUrlSafe(64) : undefined;

    await this.putState(state, {
      userId,
      appId,
      platform,
      codeVerifier,
      createdAt: Date.now(),
    });

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      state,
      response_type: 'code',
      scope: config.scopes.join(' '),
    });

    if (codeVerifier) {
      params.set('code_challenge', pkceChallenge(codeVerifier));
      params.set('code_challenge_method', 'S256');
    }

    return `${config.authUrl}?${params.toString()}`;
  }

  async handleCallback(
    platform: SocialPlatform,
    code: string,
    state: string,
  ): Promise<{ success: boolean; account?: any; error?: string }> {
    const stateData = await this.takeState(state);
    if (!stateData || stateData.platform !== platform) {
      return { success: false, error: 'Invalid or expired state parameter' };
    }

    const config = this.platformConfigs[platform];

    try {
      const tokenResponse = await this.exchangeCodeForToken(
        platform,
        code,
        config,
        stateData.codeVerifier,
      );
      const userInfo = await this.getPlatformUserInfo(
        platform,
        tokenResponse.access_token,
      );

      const encryptedAccess = this.tokenCrypto.encrypt(
        tokenResponse.access_token,
      );
      const encryptedRefresh = this.tokenCrypto.encrypt(
        tokenResponse.refresh_token,
      );
      const tokenExpiresAt = tokenResponse.expires_in
        ? new Date(Date.now() + tokenResponse.expires_in * 1000)
        : null;

      const existingAccount = await this.db
        .select()
        .from(socialAccounts)
        .where(
          and(
            eq(socialAccounts.appId, stateData.appId),
            eq(socialAccounts.platform, platform),
          ),
        )
        .then((rows: any[]) => rows[0]);

      if (existingAccount) {
        await this.db
          .update(socialAccounts)
          .set({
            accessToken: encryptedAccess,
            refreshToken: encryptedRefresh,
            tokenExpiresAt,
            platformUserId: userInfo.id,
            username: userInfo.username,
            avatarUrl: userInfo.avatarUrl,
            updatedAt: new Date(),
          })
          .where(eq(socialAccounts.id, existingAccount.id));

        return {
          success: true,
          account: {
            id: existingAccount.id,
            appId: stateData.appId,
            platform,
            username: userInfo.username,
          },
        };
      }

      const [newAccount] = await this.db
        .insert(socialAccounts)
        .values({
          appId: stateData.appId,
          platform,
          platformUserId: userInfo.id,
          accessToken: encryptedAccess,
          refreshToken: encryptedRefresh,
          tokenExpiresAt,
          username: userInfo.username,
          avatarUrl: userInfo.avatarUrl,
        })
        .returning();

      return {
        success: true,
        account: {
          id: newAccount.id,
          appId: stateData.appId,
          platform,
          username: userInfo.username,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to connect account' };
    }
  }

  private async exchangeCodeForToken(
    platform: SocialPlatform,
    code: string,
    config: OAuthConfig,
    codeVerifier?: string,
  ): Promise<any> {
    const params = new URLSearchParams({
      client_id: config.clientId,
      code,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (config.usesPkce) {
      // PKCE flow (e.g. Twitter). Confidential clients still authenticate with
      // HTTP Basic; the verifier proves this is the same client that started.
      if (codeVerifier) params.set('code_verifier', codeVerifier);
      if (config.clientSecret) {
        const basic = Buffer.from(
          `${config.clientId}:${config.clientSecret}`,
        ).toString('base64');
        headers.Authorization = `Basic ${basic}`;
      }
    } else {
      params.set('client_secret', config.clientSecret);
    }

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers,
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new BadRequestException(`Failed to exchange code for token: ${error}`);
    }

    return response.json();
  }

  private async getPlatformUserInfo(
    platform: SocialPlatform,
    accessToken: string,
  ): Promise<any> {
    switch (platform) {
      case 'meta': {
        const response = await fetch(
          `https://graph.facebook.com/v18.0/me?fields=id,name,picture&access_token=${accessToken}`,
        );
        const data = await response.json();
        return {
          id: data.id,
          username: data.name,
          avatarUrl: data.picture?.data?.url,
        };
      }
      case 'tiktok': {
        const response = await fetch(
          'https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url,open_id',
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const data = await response.json();
        return {
          id: data.data?.user?.open_id,
          username: data.data?.user?.display_name,
          avatarUrl: data.data?.user?.avatar_url,
        };
      }
      case 'twitter': {
        const response = await fetch('https://api.twitter.com/2/users/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await response.json();
        return {
          id: data.data?.id,
          username: data.data?.username,
          avatarUrl: data.data?.profile_image_url,
        };
      }
      default:
        return { id: 'unknown', username: 'unknown' };
    }
  }

  async disconnectAccount(
    accountId: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    const [account] = await this.db
      .select({ id: socialAccounts.id, appId: socialAccounts.appId })
      .from(socialAccounts)
      .where(eq(socialAccounts.id, accountId));

    if (!account) {
      throw new BadRequestException('Connected account not found');
    }

    await this.assertAppOwnership(account.appId, userId);
    await this.db.delete(socialAccounts).where(eq(socialAccounts.id, accountId));
    return { success: true };
  }

  /**
   * Returns connected accounts for an app WITHOUT any token material. Access /
   * refresh tokens never leave the backend.
   */
  async getConnectedAccounts(appId: string, userId: string) {
    await this.assertAppOwnership(appId, userId);

    const rows = await this.db
      .select({
        id: socialAccounts.id,
        appId: socialAccounts.appId,
        platform: socialAccounts.platform,
        platformUserId: socialAccounts.platformUserId,
        username: socialAccounts.username,
        avatarUrl: socialAccounts.avatarUrl,
        tokenExpiresAt: socialAccounts.tokenExpiresAt,
        createdAt: socialAccounts.createdAt,
        updatedAt: socialAccounts.updatedAt,
      })
      .from(socialAccounts)
      .where(eq(socialAccounts.appId, appId));

    return rows;
  }

  /**
   * Returns a usable access token for internal use, refreshing if it is close
   * to expiry. Tokens are decrypted for use and re-encrypted when persisted.
   */
  async refreshTokenIfNeeded(account: any): Promise<string> {
    const accessToken = this.tokenCrypto.decrypt(account.accessToken);
    const refreshToken = this.tokenCrypto.decrypt(account.refreshToken);

    if (!refreshToken || !account.tokenExpiresAt) {
      if (!accessToken) throw new BadRequestException('No access token on file');
      return accessToken;
    }

    const expiresAt = new Date(account.tokenExpiresAt);
    const fiveMinutes = 5 * 60 * 1000;
    if (expiresAt.getTime() - Date.now() > fiveMinutes) {
      return accessToken as string;
    }

    const config = this.platformConfigs[account.platform as SocialPlatform];
    const params = new URLSearchParams({
      client_id: config.clientId,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    if (config.usesPkce && config.clientSecret) {
      const basic = Buffer.from(
        `${config.clientId}:${config.clientSecret}`,
      ).toString('base64');
      headers.Authorization = `Basic ${basic}`;
    } else {
      params.set('client_secret', config.clientSecret);
    }

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers,
      body: params.toString(),
    });

    if (!response.ok) {
      throw new BadRequestException('Failed to refresh token');
    }

    const tokenData = await response.json();

    await this.db
      .update(socialAccounts)
      .set({
        accessToken: this.tokenCrypto.encrypt(tokenData.access_token),
        refreshToken: this.tokenCrypto.encrypt(
          tokenData.refresh_token ?? refreshToken,
        ),
        tokenExpiresAt: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000)
          : null,
        updatedAt: new Date(),
      })
      .where(eq(socialAccounts.id, account.id));

    return tokenData.access_token;
  }
}
