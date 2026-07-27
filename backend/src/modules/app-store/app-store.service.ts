import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Inject,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import { apps, appStoreConnections } from '../../database/schema';
import { TokenCryptoService } from '../../common/crypto/token-crypto.service';
import { ConnectAppStoreDto } from './dto/connect-app-store.dto';

export type AppStoreStatus = 'connected' | 'invalid' | 'expired';

/** Row shape without the encrypted private key — safe to return to clients. */
export interface AppStoreConnectionView {
  id: string;
  appId: string;
  issuerId: string;
  keyId: string;
  vendorNumber: string | null;
  teamName: string | null;
  status: AppStoreStatus;
  appCount: number | null;
  lastSyncedAt: Date | null;
  connectedAt: Date;
}

interface AppleCredentials {
  issuerId: string;
  keyId: string;
  privateKey: string;
}

@Injectable()
export class AppStoreService {
  private readonly logger = new Logger(AppStoreService.name);

  /** Apple's App Store Connect API base. */
  private static readonly ASC_BASE = 'https://api.appstoreconnect.apple.com/v1';
  /** Required audience claim for App Store Connect API tokens. */
  private static readonly ASC_AUDIENCE = 'appstoreconnect-v1';
  /** Apple rejects tokens whose lifetime exceeds 20 minutes. */
  private static readonly TOKEN_TTL = '18m';

  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly tokenCrypto: TokenCryptoService,
    private readonly jwt: JwtService,
  ) {}

  // ─── Ownership ─────────────────────────────────────────────────────────────

  private async assertAppOwnership(appId: string, userId: string): Promise<void> {
    const [app] = await this.db
      .select({ ownerId: apps.ownerId })
      .from(apps)
      .where(eq(apps.id, appId));

    if (!app) throw new BadRequestException('App not found');
    if (app.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this app');
    }
  }

  // ─── Apple auth ────────────────────────────────────────────────────────────

  /**
   * Mint a short-lived ES256 JWT for the App Store Connect API. The `kid`
   * header is the Key ID and the key is the developer's .p8 (PKCS#8) private
   * key. Apple validates iss/exp/aud on every request.
   */
  private signToken(creds: AppleCredentials): string {
    try {
      return this.jwt.sign(
        {},
        {
          algorithm: 'ES256',
          privateKey: creds.privateKey,
          keyid: creds.keyId,
          issuer: creds.issuerId,
          audience: AppStoreService.ASC_AUDIENCE,
          expiresIn: AppStoreService.TOKEN_TTL,
        },
      );
    } catch (err: any) {
      this.logger.warn(`Failed to sign App Store Connect token: ${err?.message}`);
      throw new BadRequestException(
        'Could not sign a token with that private key. Make sure you uploaded the exact .p8 file for this Key ID.',
      );
    }
  }

  /**
   * Verify credentials by listing the team's apps. Returns the app count (and
   * a best-effort provider/team name) on success, or throws with a clear
   * message on failure.
   */
  private async verifyWithApple(
    creds: AppleCredentials,
  ): Promise<{ appCount: number; teamName: string | null }> {
    const token = this.signToken(creds);

    let res: any;
    try {
      res = await fetch(`${AppStoreService.ASC_BASE}/apps?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err: any) {
      this.logger.error(`App Store Connect request failed: ${err?.message}`);
      throw new BadRequestException('Could not reach App Store Connect. Try again shortly.');
    }

    if (res.status === 401 || res.status === 403) {
      throw new BadRequestException(
        'Apple rejected these credentials. Double-check the Issuer ID, Key ID, and that the .p8 matches this key and has API access.',
      );
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.warn(`App Store Connect returned ${res.status}: ${body}`);
      throw new BadRequestException(`App Store Connect error (${res.status}). Please try again.`);
    }

    const json: any = await res.json().catch(() => ({}));
    const appCount = Array.isArray(json?.data) ? json.data.length : 0;
    // The apps list doesn't expose a team name; leave it null unless a future
    // endpoint (e.g. provider info) is added.
    return { appCount, teamName: null };
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /** Current connection for an app (null if none), without secrets. */
  async getConnection(
    appId: string,
    userId: string,
  ): Promise<AppStoreConnectionView | null> {
    await this.assertAppOwnership(appId, userId);
    const [row] = await this.db
      .select()
      .from(appStoreConnections)
      .where(eq(appStoreConnections.appId, appId));
    return row ? this.toView(row) : null;
  }

  /** Validate credentials with Apple, then store them (encrypted) for the app. */
  async connect(
    dto: ConnectAppStoreDto,
    userId: string,
  ): Promise<AppStoreConnectionView> {
    await this.assertAppOwnership(dto.appId, userId);

    const creds: AppleCredentials = {
      issuerId: dto.issuerId,
      keyId: dto.keyId,
      privateKey: dto.privateKey,
    };

    const { appCount, teamName } = await this.verifyWithApple(creds);

    const encryptedKey = this.tokenCrypto.encrypt(dto.privateKey);
    const now = new Date();

    const [existing] = await this.db
      .select({ id: appStoreConnections.id })
      .from(appStoreConnections)
      .where(eq(appStoreConnections.appId, dto.appId));

    if (existing) {
      const [updated] = await this.db
        .update(appStoreConnections)
        .set({
          issuerId: dto.issuerId,
          keyId: dto.keyId,
          privateKey: encryptedKey,
          vendorNumber: dto.vendorNumber ?? null,
          teamName,
          status: 'connected',
          appCount,
          lastSyncedAt: now,
          updatedAt: now,
        })
        .where(eq(appStoreConnections.id, existing.id))
        .returning();
      return this.toView(updated);
    }

    const [created] = await this.db
      .insert(appStoreConnections)
      .values({
        appId: dto.appId,
        issuerId: dto.issuerId,
        keyId: dto.keyId,
        privateKey: encryptedKey,
        vendorNumber: dto.vendorNumber ?? null,
        teamName,
        status: 'connected',
        appCount,
        lastSyncedAt: now,
      })
      .returning();
    return this.toView(created);
  }

  /** Re-verify the stored key and refresh cached metadata. */
  async sync(appId: string, userId: string): Promise<AppStoreConnectionView> {
    await this.assertAppOwnership(appId, userId);

    const [row] = await this.db
      .select()
      .from(appStoreConnections)
      .where(eq(appStoreConnections.appId, appId));
    if (!row) throw new BadRequestException('App Store Connect is not connected for this app');

    const privateKey = this.tokenCrypto.decrypt(row.privateKey);
    if (!privateKey) throw new BadRequestException('Stored key is unreadable. Please reconnect.');

    const now = new Date();
    try {
      const { appCount, teamName } = await this.verifyWithApple({
        issuerId: row.issuerId,
        keyId: row.keyId,
        privateKey,
      });
      const [updated] = await this.db
        .update(appStoreConnections)
        .set({ status: 'connected', appCount, teamName, lastSyncedAt: now, updatedAt: now })
        .where(eq(appStoreConnections.id, row.id))
        .returning();
      return this.toView(updated);
    } catch (err) {
      // Mark the connection invalid so the UI can prompt a reconnect.
      const [updated] = await this.db
        .update(appStoreConnections)
        .set({ status: 'invalid', updatedAt: now })
        .where(eq(appStoreConnections.id, row.id))
        .returning();
      this.logger.warn(`App Store Connect sync failed for app ${appId}`);
      return this.toView(updated);
    }
  }

  /** Remove stored credentials for an app. */
  async disconnect(appId: string, userId: string): Promise<{ success: boolean }> {
    await this.assertAppOwnership(appId, userId);
    await this.db
      .delete(appStoreConnections)
      .where(eq(appStoreConnections.appId, appId));
    return { success: true };
  }

  /**
   * Returns a valid Bearer token for an app's stored key, for internal use by
   * metric-sync jobs. The private key never leaves the backend.
   */
  async getAccessTokenForApp(appId: string): Promise<string> {
    const [row] = await this.db
      .select()
      .from(appStoreConnections)
      .where(eq(appStoreConnections.appId, appId));
    if (!row) throw new BadRequestException('App Store Connect is not connected for this app');

    const privateKey = this.tokenCrypto.decrypt(row.privateKey);
    if (!privateKey) throw new BadRequestException('Stored key is unreadable. Please reconnect.');

    return this.signToken({ issuerId: row.issuerId, keyId: row.keyId, privateKey });
  }

  // ─── Mapping ───────────────────────────────────────────────────────────────

  /** Strip the encrypted private key before returning a row to the client. */
  private toView(row: any): AppStoreConnectionView {
    return {
      id: row.id,
      appId: row.appId,
      issuerId: row.issuerId,
      keyId: row.keyId,
      vendorNumber: row.vendorNumber ?? null,
      teamName: row.teamName ?? null,
      status: (row.status as AppStoreStatus) ?? 'connected',
      appCount: row.appCount ?? null,
      lastSyncedAt: row.lastSyncedAt ?? null,
      connectedAt: row.createdAt,
    };
  }
}
