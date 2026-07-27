import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EscrowService } from './escrow.service';

const createWhereChain = (rows: any[]) => ({
  from: jest.fn().mockReturnValue({
    where: jest.fn().mockResolvedValue(rows),
  }),
});

describe('EscrowService', () => {
  const buyerOffer = {
    id: 'offer-1',
    listingId: 'listing-1',
    buyerId: 'buyer-1',
    amount: '15000.00',
    status: 'accepted',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  };
  const listing = {
    id: 'listing-1',
    sellerId: 'seller-1',
    name: 'Acme App',
  };
  const buyer = { id: 'buyer-1', fullName: 'Buyer One', email: 'buyer@example.com' };
  const seller = { id: 'seller-1', fullName: 'Seller One', email: 'seller@example.com' };

  it('lists accepted offer escrow deals for the authenticated buyer or seller', async () => {
    const db = {
      select: jest
        .fn()
        .mockReturnValueOnce(createWhereChain([{ offer: buyerOffer, listing }]))
        .mockReturnValueOnce(createWhereChain([buyer, seller])),
    };

    const deals = await new EscrowService(db).findMine('buyer-1');

    expect(deals).toEqual([
      expect.objectContaining({
        id: 'offer-1',
        listingId: 'listing-1',
        listingName: 'Acme App',
        buyerName: 'Buyer One',
        sellerName: 'Seller One',
        amount: 15000,
        status: 'funding',
        stage: 1,
      }),
    ]);
  });

  it('returns detail only for a participant in the escrow deal', async () => {
    const db = {
      select: jest
        .fn()
        .mockReturnValueOnce(createWhereChain([{ offer: buyerOffer, listing }]))
        .mockReturnValueOnce(createWhereChain([buyer, seller])),
    };

    await expect(new EscrowService(db).findOne('offer-1', 'stranger')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('computes escrow stats from the authenticated user deals', async () => {
    const db = {
      select: jest
        .fn()
        .mockReturnValueOnce(createWhereChain([{ offer: buyerOffer, listing }]))
        .mockReturnValueOnce(createWhereChain([buyer, seller])),
    };

    await expect(new EscrowService(db).getStats('buyer-1')).resolves.toEqual({
      totalValue: 15000,
      activeDeals: 1,
      completedDeals: 0,
    });
  });

  it('rejects unimplemented escrow mutations with a clear client error', async () => {
    await expect(new EscrowService({} as any).create('offer-1', 'buyer-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
