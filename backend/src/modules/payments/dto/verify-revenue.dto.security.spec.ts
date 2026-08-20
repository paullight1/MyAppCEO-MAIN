import { ValidationPipe } from '@nestjs/common';
import { VerifyRevenueDto } from './verify-revenue.dto';

describe('VerifyRevenueDto security', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  it('rejects caller-supplied Stripe account identifiers', async () => {
    await expect(
      pipe.transform(
        {
          appId: '11111111-1111-4111-8111-111111111111',
          stripeAccountId: 'acct_attacker',
        },
        { type: 'body', metatype: VerifyRevenueDto },
      ),
    ).rejects.toThrow();
  });
});
