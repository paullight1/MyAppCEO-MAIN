import { AdminNotificationsService } from './admin-notifications.service';

describe('AdminNotificationsService', () => {
  const createSupabase = (profileRows: Array<{ id: string; notification_preferences?: unknown }> = []) => {
    let insertedNotifications: any[] = [];

    const usersLimit = jest.fn().mockResolvedValue({
      data: [
        {
          id: 'user-1',
          email: 'one@example.com',
          full_name: 'User One',
          role: 'ceo',
          created_at: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'user-2',
          email: 'two@example.com',
          full_name: 'User Two',
          role: 'creator',
          created_at: '2026-01-02T00:00:00.000Z',
        },
      ],
      error: null,
    });
    const usersOrder = jest.fn().mockReturnValue({ limit: usersLimit });
    const usersSelect = jest.fn().mockReturnValue({ order: usersOrder });

    const userProfilesIn = jest.fn().mockResolvedValue({
      data: profileRows,
      error: null,
    });
    const userProfilesSelect = jest.fn().mockReturnValue({ in: userProfilesIn });

    const notificationsInsertSelect = jest.fn().mockImplementation(async () => ({
      data: insertedNotifications.map((_, index) => ({ id: `notif-${index + 1}` })),
      error: null,
    }));
    const notificationsInsert = jest.fn().mockImplementation((rows: any[]) => {
      insertedNotifications = rows;
      return {
        select: notificationsInsertSelect,
      };
    });
    const notificationsDeleteEq = jest.fn().mockResolvedValue({
      data: [{ id: 'notif-1' }],
      error: null,
    });
    const notificationsDeleteSelect = jest.fn().mockReturnValue({
      eq: notificationsDeleteEq,
    });
    const notificationsDelete = jest.fn().mockReturnValue({
      select: notificationsDeleteSelect,
    });

    const supabase = {
      from: jest.fn((table: string) => {
        if (table === 'users') {
          return { select: usersSelect };
        }
        if (table === 'user_profiles') {
          return { select: userProfilesSelect };
        }
        if (table === 'notifications') {
          return {
            insert: notificationsInsert,
            delete: notificationsDelete,
          };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    return {
      supabase,
      notificationsInsert,
      notificationsDeleteEq,
      userProfilesIn,
    };
  };

  it('sends one audited notification per targeted user', async () => {
    const { supabase, notificationsInsert, userProfilesIn } = createSupabase();
    const auditLogService = { log: jest.fn().mockResolvedValue({ success: true }) };
    const service = new AdminNotificationsService(
      supabase as any,
      auditLogService as any,
    );

    const result = await service.sendNotification(
      {
        targetType: 'all',
        type: 'announcement',
        title: 'Launch',
        message: 'New release is live',
        showPopup: true,
      },
      {
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
        ip: '127.0.0.1',
        userAgent: 'jest',
      },
    );

    expect(userProfilesIn).not.toHaveBeenCalled();
    expect(notificationsInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: 'user-1',
        type: 'announcement',
        title: 'Launch',
        message: 'New release is live',
        data: { show_popup: true },
        read: false,
      }),
      expect.objectContaining({
        user_id: 'user-2',
        type: 'announcement',
        title: 'Launch',
        message: 'New release is live',
        data: { show_popup: true },
        read: false,
      }),
    ]);
    expect(auditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-1',
        action: 'ADMIN_NOTIFICATION_SENT',
        resourceType: 'system',
        metadata: expect.objectContaining({ recipientCount: 2 }),
      }),
    );
    expect(result).toEqual({ recipientCount: 2, notificationIds: ['notif-1', 'notif-2'] });
  });

  it('filters promotional notifications using stored marketing preferences', async () => {
    const { supabase, notificationsInsert, userProfilesIn } = createSupabase([
      { id: 'user-1', notification_preferences: { marketingNotificationPreference: 'skip' } },
      { id: 'user-2', notification_preferences: { marketingNotificationPreference: 'want' } },
    ]);
    const auditLogService = { log: jest.fn().mockResolvedValue({ success: true }) };
    const service = new AdminNotificationsService(
      supabase as any,
      auditLogService as any,
    );

    const result = await service.sendNotification(
      {
        targetType: 'all',
        type: 'promotional',
        title: 'Promo',
        message: 'Check out the new launch',
      },
      {
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
        ip: '127.0.0.1',
        userAgent: 'jest',
      },
    );

    expect(userProfilesIn).toHaveBeenCalledWith('id', ['user-1', 'user-2']);
    expect(notificationsInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: 'user-2',
        type: 'promotional',
        title: 'Promo',
        message: 'Check out the new launch',
        read: false,
      }),
    ]);
    expect(auditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ recipientCount: 1 }),
      }),
    );
    expect(result).toEqual({ recipientCount: 1, notificationIds: ['notif-1'] });
  });

  it('rejects promotional sends when every selected user opted out', async () => {
    const { supabase, notificationsInsert } = createSupabase([
      { id: 'user-1', notification_preferences: { marketingNotificationPreference: 'skip' } },
      { id: 'user-2', notification_preferences: { marketingNotificationPreference: 'skip' } },
    ]);
    const auditLogService = { log: jest.fn().mockResolvedValue({ success: true }) };
    const service = new AdminNotificationsService(
      supabase as any,
      auditLogService as any,
    );

    await expect(service.sendNotification(
      {
        targetType: 'all',
        type: 'promotional',
        title: 'Promo',
        message: 'Check out the new launch',
      },
      {
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
        ip: '127.0.0.1',
        userAgent: 'jest',
      },
    )).rejects.toThrow('All selected users opted out of marketing notifications');

    expect(notificationsInsert).not.toHaveBeenCalled();
  });

  it('deletes a notification through the service role and writes an audit log', async () => {
    const { supabase, notificationsDeleteEq } = createSupabase();
    const auditLogService = { log: jest.fn().mockResolvedValue({ success: true }) };
    const service = new AdminNotificationsService(
      supabase as any,
      auditLogService as any,
    );

    const result = await service.deleteNotification('notif-1', {
      id: 'admin-1',
      email: 'admin@example.com',
      role: 'admin',
      ip: '127.0.0.1',
      userAgent: 'jest',
    });

    expect(notificationsDeleteEq).toHaveBeenCalledWith('id', 'notif-1');
    expect(auditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-1',
        action: 'ADMIN_NOTIFICATION_DELETED',
        resourceType: 'system',
        resourceId: 'notif-1',
      }),
    );
    expect(result).toEqual({ id: 'notif-1' });
  });
});
