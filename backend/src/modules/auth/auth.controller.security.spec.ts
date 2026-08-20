import { AuthController } from './auth.controller';

describe('AuthController security surface', () => {
  it('does not expose the legacy local-JWT login or registration handlers', () => {
    const prototype = AuthController.prototype as any;

    expect(prototype.login).toBeUndefined();
    expect(prototype.register).toBeUndefined();
  });
});
