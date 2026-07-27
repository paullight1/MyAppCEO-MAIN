import { ModerationController } from './moderation.controller';

describe('ModerationController claim workflow', () => {
  const createController = () => {
    const moderationService = {
      claimItem: jest.fn().mockResolvedValue({
        success: true,
        message: 'generated_code claimed successfully',
        item: { id: 'submission-1', status: 'under_review' },
      }),
    };
    const auditLogService = {};

    return {
      controller: new ModerationController(moderationService as any, auditLogService as any),
      moderationService,
    };
  };

  it('returns the claimed moderation item and forwards actor context', async () => {
    const { controller, moderationService } = createController();

    const result = await controller.claimItem(
      'generated_code',
      'submission-1',
      {
        user: { id: 'admin-1', role: 'moderator' },
        ip: '127.0.0.1',
      } as any,
    );

    expect(moderationService.claimItem).toHaveBeenCalledWith(
      'generated_code',
      'submission-1',
      'admin-1',
      'moderator',
      '127.0.0.1',
    );
    expect(result).toEqual({
      success: true,
      message: 'generated_code claimed successfully',
      data: { id: 'submission-1', status: 'under_review' },
    });
  });
});
