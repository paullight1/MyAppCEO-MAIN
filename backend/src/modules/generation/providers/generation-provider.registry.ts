import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { OPENAI_CLIENT } from '../../ai/openai.provider';
import { DeterministicGenerationAdapter } from './deterministic-generation.adapter';
import {
  GenerationCapability,
  GenerationProviderAdapter,
  GenerationProviderRequest,
  GenerationProviderSelection,
  StructuredJsonGenerationInput,
  StructuredJsonGenerationResult,
  isGenerationCapability,
  isGenerationProviderName,
} from './generation-provider.types';
import { OpenAIGenerationAdapter } from './openai-generation.adapter';
import { PlaceholderGenerationAdapter } from './placeholder-generation.adapter';

export {
  generationCapabilities,
  generationProviderNames,
} from './generation-provider.types';

export type {
  GenerationCapability,
  GenerationProviderName,
  GenerationProviderRequest,
  GenerationProviderSelection,
  StructuredJsonGenerationInput,
  StructuredJsonGenerationResult,
} from './generation-provider.types';

@Injectable()
export class GenerationProviderRegistry {
  private readonly adapters: Map<string, GenerationProviderAdapter>;

  constructor(@Inject(OPENAI_CLIENT) openai: OpenAI) {
    const deterministic = new DeterministicGenerationAdapter();
    const adapters: GenerationProviderAdapter[] = [
      new OpenAIGenerationAdapter(openai),
      new PlaceholderGenerationAdapter('gemini', ['GEMINI_API_KEY'], 'gemini-placeholder-v1', deterministic),
      new PlaceholderGenerationAdapter('anthropic', ['ANTHROPIC_API_KEY'], 'claude-placeholder-v1', deterministic),
      new PlaceholderGenerationAdapter('babycloud', ['BABYCLOUD_API_KEY'], 'babycloud-placeholder-v1', deterministic),
      new PlaceholderGenerationAdapter('custom', ['CUSTOM_GENERATION_ENDPOINT'], 'custom-placeholder-v1', deterministic),
      deterministic,
    ];

    this.adapters = new Map(adapters.map((adapter) => [adapter.name, adapter]));
  }

  select(
    request: GenerationProviderRequest = {},
    capability: GenerationCapability = 'build_plan',
  ): GenerationProviderSelection {
    if (request.capability && !isGenerationCapability(request.capability)) {
      throw new BadRequestException(`Unsupported generation capability: ${request.capability}`);
    }
    if (request.capability && request.capability !== capability) {
      throw new BadRequestException(
        `Requested capability ${request.capability} does not match endpoint capability ${capability}`,
      );
    }

    const requestedProvider = request.provider || process.env.GENERATION_PROVIDER || 'openai';
    if (!isGenerationProviderName(requestedProvider)) {
      throw new BadRequestException(`Unsupported generation provider: ${requestedProvider}`);
    }

    const adapter = this.adapters.get(requestedProvider);
    if (!adapter) {
      throw new BadRequestException(`Unsupported generation provider: ${requestedProvider}`);
    }
    if (!adapter.capabilities.includes(capability)) {
      throw new BadRequestException(
        `Provider ${requestedProvider} does not support ${capability} generation`,
      );
    }

    return {
      provider: requestedProvider,
      model: request.model || adapter.defaultModel(),
      capability,
    };
  }

  async generateJson(input: StructuredJsonGenerationInput): Promise<StructuredJsonGenerationResult> {
    const selection = this.select(input.request, input.capability);
    const adapter = this.adapters.get(selection.provider);
    if (!adapter) {
      throw new BadRequestException(`Unsupported generation provider: ${selection.provider}`);
    }
    return adapter.generateJson(input, selection);
  }
}
