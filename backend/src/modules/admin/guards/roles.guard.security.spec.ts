import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole, RolesGuard } from './roles.guard';

describe('RolesGuard privilege boundaries', () => {
  it('does not let a regular admin satisfy a super-admin-only route', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([AdminRole.SUPER_ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'admin-1', role: AdminRole.ADMIN, roles: [AdminRole.ADMIN] },
        }),
      }),
    } as any;

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
