import { ValidationPipe } from '@nestjs/common';
import { RegisterDto } from './register.dto';

describe('RegisterDto security', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  it('rejects caller-supplied privileged roles', async () => {
    await expect(
      pipe.transform(
        {
          email: 'user@example.com',
          password: 'strong-password',
          fullName: 'Example User',
          role: 'admin',
        },
        { type: 'body', metatype: RegisterDto },
      ),
    ).rejects.toThrow();
  });
});
