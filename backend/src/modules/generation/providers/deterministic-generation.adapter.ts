import {
  allGenerationCapabilities,
  GenerationProviderAdapter,
  GenerationProviderName,
  GenerationProviderSelection,
  StructuredJsonGenerationInput,
  StructuredJsonGenerationResult,
} from './generation-provider.types';

export class DeterministicGenerationAdapter implements GenerationProviderAdapter {
  readonly name: GenerationProviderName = 'deterministic';
  readonly capabilities = allGenerationCapabilities;

  defaultModel() {
    return 'deterministic-v1';
  }

  async generateJson(
    input: StructuredJsonGenerationInput,
    selection: GenerationProviderSelection,
  ): Promise<StructuredJsonGenerationResult> {
    return {
      content: input.fallback,
      provider: selection.provider,
      model: selection.model,
      capability: selection.capability,
      usedFallback: true,
      metadata: {
        fallbackReason: 'deterministic_generation',
        adapter: this.name,
      },
    };
  }
}
