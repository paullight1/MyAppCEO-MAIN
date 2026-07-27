import OpenAI from 'openai';
import {
  allGenerationCapabilities,
  GenerationProviderAdapter,
  GenerationProviderSelection,
  StructuredJsonGenerationInput,
  StructuredJsonGenerationResult,
} from './generation-provider.types';

export class OpenAIGenerationAdapter implements GenerationProviderAdapter {
  readonly name = 'openai' as const;
  readonly capabilities = allGenerationCapabilities;

  constructor(private readonly openai: OpenAI) {}

  defaultModel() {
    return process.env.OPENAI_CODE_MODEL || process.env.OPENAI_PRD_MODEL || 'gpt-5.2';
  }

  async generateJson(
    input: StructuredJsonGenerationInput,
    selection: GenerationProviderSelection,
  ): Promise<StructuredJsonGenerationResult> {
    try {
      const response = await this.openai.chat.completions.create({
        model: selection.model,
        messages: [
          { role: 'system', content: input.systemPrompt },
          { role: 'user', content: JSON.stringify(input.userPayload) },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: `${selection.capability}_generation`,
            schema: {
              type: 'object',
              additionalProperties: true,
            },
            strict: false,
          },
        },
      });

      const parsed = this.parseOrFallback(response.choices[0].message.content, input.fallback);
      return {
        content: parsed.content,
        provider: this.name,
        model: selection.model,
        capability: selection.capability,
        usedFallback: parsed.usedFallback,
        metadata: {
          adapter: this.name,
          structuredOutput: 'json_schema',
          validatedByApplication: true,
        },
      };
    } catch {
      return {
        content: input.fallback,
        provider: this.name,
        model: selection.model,
        capability: selection.capability,
        usedFallback: true,
        metadata: {
          adapter: this.name,
          fallbackReason: 'provider_error',
          structuredOutput: 'json_schema',
          validatedByApplication: true,
        },
      };
    }
  }

  private parseOrFallback(content: string | null, fallback: any) {
    try {
      return { content: JSON.parse(content || ''), usedFallback: false };
    } catch {
      return { content: fallback, usedFallback: true };
    }
  }
}
