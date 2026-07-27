import { Injectable, Inject, Logger, ForbiddenException } from '@nestjs/common';
import { SUPABASE_ADMIN } from '../supabase/supabase.module';
import { SupabaseClient } from '@supabase/supabase-js';
import { SendMessageDto } from './dto/message.dto';
import { NotificationsService, NotificationType } from '../notifications/notifications.service';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @Inject(SUPABASE_ADMIN) private supabase: SupabaseClient,
    private notificationsService: NotificationsService,
  ) {}

  async sendMessage(dto: SendMessageDto, senderId: string) {
    // 1. Get or Create Conversation
    let conversationId = dto.conversationId;

    if (!conversationId) {
      // Logic to find existing conversation between these two for this listing
      const { data: existing } = await this.supabase
        .from('conversations')
        .select('id')
        .or(`and(participant_one.eq.${senderId},participant_two.eq.${dto.recipientId}),and(participant_one.eq.${dto.recipientId},participant_two.eq.${senderId})`)
        .maybeSingle();

      if (existing) {
        conversationId = existing.id;
      } else {
        const { data: neu, error: neuErr } = await this.supabase
          .from('conversations')
          .insert({
            participant_one: senderId,
            participant_two: dto.recipientId,
            listing_id: dto.listingId,
            last_message: dto.content,
            updated_at: new Date().toISOString(),
          })
          .select('id')
          .single();
        
        if (neuErr) throw neuErr;
        conversationId = neu.id;
      }
    }

    // 2. Insert Message
    const { data: msg, error: msgErr } = await this.supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: dto.content,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (msgErr) throw msgErr;

    // 3. Update Conversation last_message
    await this.supabase
      .from('conversations')
      .update({ 
        last_message: dto.content, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', conversationId);

    // 4. Notify Recipient
    await this.notificationsService.notify(
      dto.recipientId,
      NotificationType.NEW_MESSAGE,
      'New Message',
      `You have a new message regarding your inquiry.`,
      { conversationId, senderId }
    );

    return msg;
  }

  async getConversations(userId: string) {
    const { data, error } = await this.supabase
      .from('conversations')
      .select('*, participant_one_user:users!participant_one(full_name, avatar_url), participant_two_user:users!participant_two(full_name, avatar_url)')
      .or(`participant_one.eq.${userId},participant_two.eq.${userId}`)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getMessages(conversationId: string, userId: string) {
    // Basic security check
    const { data: conv } = await this.supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .or(`participant_one.eq.${userId},participant_two.eq.${userId}`)
      .single();

    if (!conv) throw new ForbiddenException('Unauthorized or not found');

    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }
}
