import { ForbiddenException } from '@nestjs/common';
import { PaymentsService } from './payments.service';

describe('PaymentsService revenue verification security', () => {
  it('rejects verification when the authenticated user does not own the listing', async () => {
    const limit = jest.fn().mockResolvedValue([
      {
        id: 'listing-1',
        appId: 'app-1',
        sellerId: 'owner-user',
        storeMetadata: {},
      },
    ]);
    const where = jest.fn().mockReturnValue({ limit });
    const from = jest.fn().mockReturnValue({ where });
    const db = {
      select: jest.fn().mockReturnValue({ from }),
    };
    const stripe = {
      payouts: {
        list: jest.fn().mockResolvedValue({ data: [] }),
      },
    };
    const supabase = {
      from: jest.fn(),
    };

    const service = new PaymentsService(
      stripe as any,
      supabase as any,
      db as any,
    );

    await expect(
      service.verifyRevenue('listing-1', 'attacker-user'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(stripe.payouts.list).not.toHaveBeenCalled();
  });
});
