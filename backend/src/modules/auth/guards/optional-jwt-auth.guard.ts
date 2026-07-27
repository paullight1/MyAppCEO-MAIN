import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('supabase') {
  handleRequest(err: any, user: any) {
    return user;
  }
}