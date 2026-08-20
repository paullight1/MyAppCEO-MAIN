import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

export interface BrokerAuthResult {
  session: { access_token: string; refresh_token?: string | null; expires_in?: number | null };
  user: { id: string; email: string | null; fullName?: string | null; role?: string | null };
}

@Injectable()
export class AuthService {
  // Stateless Supabase client used only to broker GoTrue auth on the server.
  // Prefer the anon key (auth endpoints don't need service-role); fall back to
  // the service-role key so the broker still works if only that is configured.
  private readonly supabaseAuth: SupabaseClient;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    const url = this.configService.get<string>('SUPABASE_URL');
    const key =
      this.configService.get<string>('SUPABASE_ANON_KEY') ||
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) {
      throw new Error('SUPABASE_URL and an anon/service key are required for the auth broker');
    }
    this.supabaseAuth = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  private toBrokerUser(user: any): BrokerAuthResult['user'] {
    return {
      id: user?.id,
      email: user?.email ?? null,
      fullName: user?.user_metadata?.full_name ?? user?.user_metadata?.fullName ?? null,
      // Authorization roles are server-owned app_metadata/database state. Never
      // reflect a role from caller-controlled user_metadata as authoritative.
      role: user?.app_metadata?.role ?? null,
    };
  }

  /** Broker sign-in against Supabase GoTrue; returns tokens + user. */
  async signInWithSupabase(email: string, password: string): Promise<BrokerAuthResult> {
    const { data, error } = await this.supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.session) {
      throw new UnauthorizedException(error?.message || 'Invalid credentials');
    }
    return { session: data.session, user: this.toBrokerUser(data.user) };
  }

  /** Broker sign-up. When email confirmation is on, session may be null. */
  async signUpWithSupabase(
    email: string,
    password: string,
    metadata: Record<string, unknown> = {},
  ): Promise<{ session: BrokerAuthResult['session'] | null; user: BrokerAuthResult['user'] | null; needsEmailConfirmation: boolean }> {
    // Only profile metadata is accepted here. Authorization metadata is never
    // accepted from public signup requests.
    const safeMetadata = {
      full_name: typeof metadata.full_name === 'string' ? metadata.full_name : undefined,
    };
    const { data, error } = await this.supabaseAuth.auth.signUp({
      email,
      password,
      options: { data: safeMetadata },
    });
    if (error) {
      throw new BadRequestException(error.message);
    }
    return {
      session: data.session,
      user: data.user ? this.toBrokerUser(data.user) : null,
      needsEmailConfirmation: !data.session,
    };
  }

  /** Exchange a refresh token for a fresh session. */
  async refreshSupabaseSession(refreshToken: string): Promise<BrokerAuthResult> {
    const { data, error } = await this.supabaseAuth.auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (error || !data.session) {
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }
    return { session: data.session, user: this.toBrokerUser(data.user) };
  }

  /** Best-effort server-side revocation of a Supabase session. */
  async revokeSupabaseSession(accessToken: string): Promise<void> {
    try {
      await this.supabaseAuth.auth.admin.signOut(accessToken);
    } catch {
      // Non-fatal: cookies are cleared regardless of remote revocation success.
    }
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && await bcrypt.compare(pass, user.passwordHash)) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
      },
    };
  }

  async register(userData: any) {
    const user = await this.usersService.create(userData);
    return this.login(user);
  }
}
