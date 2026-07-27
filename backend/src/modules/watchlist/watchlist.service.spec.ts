import { WatchlistService } from './watchlist.service';

describe('WatchlistService', () => {
  const listing = {
    id: '2f2b9242-a7dc-4d81-9e2b-7f7f6a7ac671',
    name: 'LaunchOps',
    askingPrice: '1000.00',
    monthlyRevenue: '250.50',
    status: 'active',
  };

  const favorite = {
    id: '6b8ec050-0306-4c6e-b168-e4b56b6d8f0a',
    user_id: '9a323155-cde0-423e-80e6-923a727a7d40',
    listing_id: listing.id,
    created_at: '2026-05-31T12:00:00.000Z',
    notes: 'Review metrics',
    status: 'active',
  };

  const createDb = (rows = [listing]) => {
    const where = jest.fn().mockResolvedValue(rows);
    const from = jest.fn(() => ({ where }));
    const select = jest.fn(() => ({ from }));
    return { db: { select }, where };
  };

  it('upserts by user and listing when saving a watchlist item', async () => {
    const { db } = createDb();
    const single = jest.fn().mockResolvedValue({ data: favorite, error: null });
    const select = jest.fn(() => ({ single }));
    const upsert = jest.fn(() => ({ select }));
    const supabase = { from: jest.fn(() => ({ upsert })) };
    const service = new WatchlistService(supabase as any, db);

    const result = await service.create(favorite.user_id, {
      listingId: listing.id,
      notes: favorite.notes,
      source: 'local_storage_migration',
    });

    expect(supabase.from).toHaveBeenCalledWith('favorites');
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: favorite.user_id,
        listing_id: listing.id,
        notes: favorite.notes,
        status: 'active',
      }),
      { onConflict: 'user_id,listing_id' },
    );
    expect(result).toMatchObject({
      id: favorite.id,
      listingId: listing.id,
      addedAt: favorite.created_at,
      notes: favorite.notes,
      status: 'active',
      listing: expect.objectContaining({ id: listing.id, askingPrice: 1000 }),
    });
  });

  it('scopes updates to the current user and listing', async () => {
    const { db } = createDb();
    const maybeSingle = jest.fn().mockResolvedValue({ data: favorite, error: null });
    const updateBuilder: any = {
      eq: jest.fn(() => updateBuilder),
      select: jest.fn(() => ({ maybeSingle })),
    };
    const update = jest.fn(() => updateBuilder);
    const supabase = { from: jest.fn(() => ({ update })) };
    const service = new WatchlistService(supabase as any, db);

    await service.update(favorite.user_id, listing.id, {
      notes: 'Updated',
      status: 'archived',
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        notes: 'Updated',
        status: 'archived',
      }),
    );
    expect(updateBuilder.eq).toHaveBeenNthCalledWith(1, 'user_id', favorite.user_id);
    expect(updateBuilder.eq).toHaveBeenNthCalledWith(2, 'listing_id', listing.id);
  });

  it('scopes deletes to the current user and listing', async () => {
    const { db } = createDb();
    const deleteBuilder: any = {
      eq: jest.fn(() => deleteBuilder),
      then: (resolve: any) => Promise.resolve({ error: null }).then(resolve),
    };
    const remove = jest.fn(() => deleteBuilder);
    const supabase = { from: jest.fn(() => ({ delete: remove })) };
    const service = new WatchlistService(supabase as any, db);

    await service.remove(favorite.user_id, listing.id);

    expect(remove).toHaveBeenCalled();
    expect(deleteBuilder.eq).toHaveBeenNthCalledWith(1, 'user_id', favorite.user_id);
    expect(deleteBuilder.eq).toHaveBeenNthCalledWith(2, 'listing_id', listing.id);
  });
});
