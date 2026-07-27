import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ListingService } from './listing.service';

describe('ListingService ownership checks', () => {
  const listing = {
    id: 'listing-1',
    sellerId: 'seller-1',
    name: 'Demo Listing',
    slug: 'demo-listing',
    status: 'draft',
    listingType: 'sale',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const createService = (existingRows: any[]) => {
    const updateReturning = jest.fn().mockResolvedValue([{ ...listing, status: 'active' }]);
    const deleteWhere = jest.fn().mockResolvedValue(undefined);

    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(existingRows),
        }),
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: updateReturning,
          }),
        }),
      }),
      delete: jest.fn().mockReturnValue({
        where: deleteWhere,
      }),
    };

    const service = new ListingService(
      db,
      { from: jest.fn() } as any,
      {
        deleteListing: jest.fn().mockResolvedValue(undefined),
        indexListing: jest.fn().mockResolvedValue(undefined),
      } as any,
      {
        del: jest.fn().mockResolvedValue(undefined),
        deleteByPattern: jest.fn().mockResolvedValue(undefined),
      } as any,
    );

    return { service, db, updateReturning, deleteWhere };
  };

  it('rejects status updates when the current user does not own the listing', async () => {
    const { service, db } = createService([listing]);

    await expect(
      (service.updateStatus as any)('listing-1', { status: 'active' }, 'other-user'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(db.update).not.toHaveBeenCalled();
  });

  it('rejects status updates for missing listings before mutating', async () => {
    const { service, db } = createService([]);

    await expect(
      (service.updateStatus as any)('missing-listing', { status: 'active' }, 'seller-1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(db.update).not.toHaveBeenCalled();
  });

  it('rejects deletes when the current user does not own the listing', async () => {
    const { service, db } = createService([listing]);

    await expect((service.remove as any)('listing-1', 'other-user')).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    expect(db.delete).not.toHaveBeenCalled();
  });
});
