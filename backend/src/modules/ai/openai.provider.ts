import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export const OPENAI_CLIENT = 'OPENAI_CLIENT';

export const OpenAIProvider = {
  provide: OPENAI_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    return new OpenAI({
      apiKey: configService.get<string>('OPENAI_API_KEY'),
    });
  },
};
