import { UsersService } from './users.service';

describe('UsersService registration security', () => {
  it('ignores a caller-supplied privileged role and persists the safe default', async () => {
    const where = jest.fn().mockResolvedValue([]);
    const from = jest.fn().mockReturnValue({ where });
    const returning = jest.fn().mockResolvedValue([
      {
        id: 'user-1',
        email: 'user@example.com',
        role: 'ceo',
        fullName: 'Example User',
        passwordHash: 'hashed',
      },
    ]);
    const values = jest.fn().mockReturnValue({ returning });
    const db = {
      select: jest.fn().mockReturnValue({ from }),
      insert: jest.fn().mockReturnValue({ values }),
    };

    const service = new UsersService(db as any);

    await service.create({
      email: 'user@example.com',
      password: 'strong-password',
      fullName: 'Example User',
      role: 'admin',
    });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'ceo' }),
    );
  });
});
