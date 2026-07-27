import { FinancesService } from './finances.service';

const createSelectChain = (rows: any[]) => {
  const where = jest.fn().mockResolvedValue(rows);
  const from = jest.fn().mockReturnValue({ where });
  return { chain: { from }, from, where };
};

describe('FinancesService', () => {
  it('builds an authenticated user dashboard from owned apps and investment holdings', async () => {
    const ownedApps = [
      {
        id: 'app-owned',
        name: 'Owned App',
        category: 'SaaS',
        monthlyRevenue: '1200.50',
        estimatedValue: '24000.00',
      },
    ];
    const holdingRows = [
      {
        holding: {
          id: 'holding-1',
          investorId: 'user-1',
          appId: 'app-invested',
          amount: '5000.00',
          stakePct: '10.0000',
          acquiredAt: new Date('2026-01-01T00:00:00.000Z'),
        },
        app: {
          id: 'app-invested',
          name: 'Invested App',
          category: 'Marketplace',
          monthlyRevenue: '800.00',
          estimatedValue: '70000.00',
        },
      },
    ];

    const ownedChain = createSelectChain(ownedApps);
    const holdingsWhere = jest.fn().mockResolvedValue(holdingRows);
    const holdingsChain = {
      from: jest.fn().mockReturnValue({
        leftJoin: jest.fn().mockReturnValue({
          where: holdingsWhere,
        }),
      }),
    };
    const db = {
      select: jest.fn().mockReturnValueOnce(ownedChain.chain).mockReturnValueOnce(holdingsChain),
    };

    const result = await new FinancesService(db).getDashboard('user-1');

    expect(result.metrics.totalRevenue).toBe(1200.5);
    expect(result.metrics.portfolioValue).toBe(7000);
    expect(result.metrics.netProfit).toBe(1200.5);
    expect(result.stakes).toEqual([
      expect.objectContaining({
        id: 'holding-1',
        userId: 'user-1',
        listingId: 'app-invested',
        ownershipPercentage: 10,
        amountInvested: 5000,
        currentValue: 7000,
        listing: expect.objectContaining({ name: 'Invested App', monthlyRevenue: 800 }),
      }),
    ]);
    expect(result.revenueBySource).toEqual([
      { source: 'SaaS', value: 1200.5, pct: 100 },
    ]);
  });
});
