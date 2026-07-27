import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

/**
 * Symmetric encryption for sensitive secrets stored at rest (OAuth access /
 * refresh tokens, etc.).
 *
 * Format of an encrypted value: `v1:<iv>:<authTag>:<ciphertext>` where every
 * segment is base64url. Decryption is backward compatible: any value that does
 * not carry the `v1:` prefix is treated as legacy plaintext and returned as-is,
 * so existing rows keep working until they are re-written encrypted.
 *
 * The key is derived from the `TOKEN_ENCRYPTION_KEY` env var. Provide a strong
 * 32-byte secret (e.g. `openssl rand -base64 32`). In production the app should
 * refuse to boot without it; see `assertConfigured()`.
 */
@Injectable()
export class TokenCryptoService {
  private readonly logger = new Logger(TokenCryptoService.name);
  private static readonly VERSION = 'v1';
  private static readonly ALGORITHM = 'aes-256-gcm';
  private readonly key: Buffer | null;

  constructor(private readonly config: ConfigService) {
    const secret = this.config.get<string>('TOKEN_ENCRYPTION_KEY')?.trim();

    if (!secret) {
      this.key = null;
      const message =
        'TOKEN_ENCRYPTION_KEY is not set; OAuth tokens will be stored WITHOUT encryption.';
      if (this.config.get<string>('NODE_ENV') === 'production') {
        // Fail loud in prod: storing third-party tokens in plaintext is unsafe.
        throw new Error(`${message} Refusing to start.`);
      }
      this.logger.warn(message);
      return;
    }

    // Derive a fixed-length 32-byte key from whatever secret was provided so
    // operators can use passphrases or base64 secrets interchangeably.
    this.key = createHash('sha256').update(secret).digest();
  }

  /** Encrypt a secret. Returns null for null/undefined input. */
  encrypt(plaintext: string | null | undefined): string | null {
    if (plaintext === null || plaintext === undefined) return null;
    if (!this.key) return plaintext; // dev fallback (warned at boot)

    const iv = randomBytes(12);
    const cipher = createCipheriv(TokenCryptoService.ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [
      TokenCryptoService.VERSION,
      iv.toString('base64url'),
      authTag.toString('base64url'),
      encrypted.toString('base64url'),
    ].join(':');
  }

  /** Decrypt a value produced by `encrypt`. Legacy plaintext is returned as-is. */
  decrypt(value: string | null | undefined): string | null {
    if (value === null || value === undefined) return null;

    const parts = value.split(':');
    if (parts[0] !== TokenCryptoService.VERSION || parts.length !== 4) {
      // Not in our encrypted envelope → legacy plaintext row.
      return value;
    }
    if (!this.key) {
      throw new Error(
        'Encrypted token found but TOKEN_ENCRYPTION_KEY is not configured.',
      );
    }

    const [, ivB64, tagB64, dataB64] = parts;
    const decipher = createDecipheriv(
      TokenCryptoService.ALGORITHM,
      this.key,
      Buffer.from(ivB64, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64url')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }
}
