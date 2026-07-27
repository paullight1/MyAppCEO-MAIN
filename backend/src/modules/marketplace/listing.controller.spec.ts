import { ListingController } from './listing.controller';

describe('ListingController ownership routes', () => {
  const user = { id: 'seller-1' };

  it('passes the current user id when updating listing status', async () => {
    const listingService = {
      updateStatus: jest.fn().mockResolvedValue({ id: 'listing-1' }),
    };
    const controller = new ListingController(listingService as any);

    await (controller.updateStatus as any)('listing-1', { status: 'active' }, user);

    expect(listingService.updateStatus).toHaveBeenCalledWith(
      'listing-1',
      { status: 'active' },
      'seller-1',
    );
  });

  it('passes the current user id when deleting a listing', async () => {
    const listingService = {
      remove: jest.fn().mockResolvedValue({ success: true }),
    };
    const controller = new ListingController(listingService as any);

    await (controller.remove as any)('listing-1', user);

    expect(listingService.remove).toHaveBeenCalledWith('listing-1', 'seller-1');
  });
});
