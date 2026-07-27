import { DeterministicGenerationAdapter } from './deterministic-generation.adapter';
import {
  allGenerationCapabilities,
  GenerationProviderAdapter,
  GenerationProviderName,
  GenerationProviderSelection,
  StructuredJsonGenerationInput,
  StructuredJsonGenerationResult,
} from './generation-provider.types';

export class PlaceholderGenerationAdapter implements GenerationProviderAdapter {
  readonly capabilities = allGenerationCapabilities;

  constructor(
    readonly name: Exclude<GenerationProviderName, 'openai' | 'deterministic'>,
    private readonly envKeys: string[],
    private readonly fallbackModel: string,
    private readonly deterministic = new DeterministicGenerationAdapter(),
  ) {}

  defaultModel() {
    return process.env[this.modelEnvKey] || this.fallbackModel;
  }

  async generateJson(
    input: StructuredJsonGenerationInput,
    selection: GenerationProviderSelection,
  ): Promise<StructuredJsonGenerationResult> {
    const missingEnv = this.envKeys.filter((key) => !process.env[key]);

    if (missingEnv.length > 0) {
      const fallback = await this.deterministic.generateJson(input, selection);
      return {
        ...fallback,
        provider: this.name,
        model: selection.model,
        metadata: {
          ...fallback.metadata,
          adapter: this.name,
          fallbackReason: 'provider_not_configured',
          missingEnv,
        },
      };
    }

    const fallback = await this.deterministic.generateJson(input, selection);
    return {
      ...fallback,
      provider: this.name,
      model: selection.model,
      metadata: {
        ...fallback.metadata,
        adapter: this.name,
        fallbackReason: 'adapter_placeholder',
        configuredEnv: this.envKeys,
      },
    };
  }

  private get modelEnvKey() {
    return `${this.name.toUpperCase()}_GENERATION_MODEL`;
  }
}
