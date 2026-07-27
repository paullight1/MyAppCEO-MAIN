import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

export enum AdminRole {
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
  MODERATOR = 'moderator',
  FINANCE = 'finance',
  ANALYST = 'analyst',
  SUPPORT_AGENT = 'support_agent',
  FINANCE_OPERATOR = 'finance_operator',
  CONTENT_REVIEWER = 'content_reviewer',
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const userRoles = Array.from(new Set([
      ...(Array.isArray(user.roles) ? user.roles : []),
      ...(user.role ? [user.role] : []),
    ]));
    const hasRole = this.hasRequiredRole(userRoles, requiredRoles);

    if (!hasRole) {
      throw new ForbiddenException(
        `Insufficient permissions. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }

  private hasRequiredRole(
    userRoles: string[],
    requiredRoles: AdminRole[],
  ): boolean {
    if (userRoles.includes(AdminRole.SUPER_ADMIN) || userRoles.includes(AdminRole.ADMIN)) {
      return true;
    }

    return requiredRoles.some((role) => userRoles.includes(role));
  }
}
