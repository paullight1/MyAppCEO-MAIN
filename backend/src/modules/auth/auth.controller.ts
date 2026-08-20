import { Controller, Post, Body, UnauthorizedException, UseGuards, Get, Req, Res, UsePipes, ValidationPipe } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearAuthCookies,
  readCookie,
  setAuthCookies,
} from './auth-cookies';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // ─── Cookie-based auth broker (httpOnly sessions) ──────────────────────────
  // The backend performs the Supabase sign-in and stores tokens in httpOnly
  // cookies, so the browser never handles them. Tokens are never returned in
  // the response body.

  @Post('session')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Broker login: sign in and set httpOnly session cookies' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async createSession(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { session, user } = await this.authService.signInWithSupabase(body.email, body.password);
    setAuthCookies(res, session);
    return { user };
  }

  @Post('signup')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Broker signup: register and set httpOnly session cookies' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async signup(
    @Body() body: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.signUpWithSupabase(body.email, body.password, {
      full_name: body.fullName,
    });
    if (result.session) {
      setAuthCookies(res, result.session);
    }
    return { user: result.user, needsEmailConfirmation: result.needsEmailConfirmation };
  }

  @Post('refresh')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Rotate the session using the httpOnly refresh cookie' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = readCookie(req, REFRESH_TOKEN_COOKIE);
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token');
    }
    try {
      const { session, user } = await this.authService.refreshSupabaseSession(refreshToken);
      setAuthCookies(res, session);
      return { user };
    } catch (err) {
      // A bad/expired refresh token should not leave stale cookies behind.
      clearAuthCookies(res);
      throw err;
    }
  }

  @Get('session')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get the current session user (from cookie or bearer)' })
  async getSession(@Req() req: any) {
    return { user: req.user };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Clear session cookies and revoke the session' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const accessToken = readCookie(req, ACCESS_TOKEN_COOKIE);
    if (accessToken) {
      await this.authService.revokeSupabaseSession(accessToken);
    }
    clearAuthCookies(res);
    return { success: true };
  }

  // Legacy credential endpoints remain temporarily for backwards compatibility,
  // but public registration is constrained by RegisterDto/UsersService and can
  // never assign a privileged role.
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Legacy login with email and password' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async login(@Body() body: LoginDto) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Legacy registration (always creates a non-privileged CEO user)' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Req() req: any) {
    return req.user;
  }
}
