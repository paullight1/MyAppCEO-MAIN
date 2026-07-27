export const generationProviderNames = [
  'openai',
  'gemini',
  'anthropic',
  'babycloud',
  'custom',
  'deterministic',
] as const;

export type GenerationProviderName = (typeof generationProviderNames)[number];

export const generationCapabilities = [
  'prd',
  'build_plan',
  'screen_spec',
  'code_scaffold',
  'review',
] as const;

export type GenerationCapability = (typeof generationCapabilities)[number];

export interface GenerationProviderRequest {
  provider?: string;
  model?: string;
  capability?: string;
}

export interface GenerationProviderSelection {
  provider: GenerationProviderName;
  model: string;
  capability: GenerationCapability;
}

export interface StructuredJsonGenerationInput {
  request?: GenerationProviderRequest;
  capability: GenerationCapability;
  systemPrompt: string;
  userPayload: Record<string, unknown>;
  fallback: any;
}

export interface StructuredJsonGenerationResult {
  content: any;
  provider: GenerationProviderName;
  model: string;
  capability: GenerationCapability;
  usedFallback: boolean;
  metadata?: Record<string, unknown>;
}

export interface GenerationProviderAdapter {
  readonly name: GenerationProviderName;
  readonly capabilities: readonly GenerationCapability[];
  defaultModel(): string;
  generateJson(
    input: StructuredJsonGenerationInput,
    selection: GenerationProviderSelection,
  ): Promise<StructuredJsonGenerationResult>;
}

export const isGenerationProviderName = (provider: string): provider is GenerationProviderName => (
  generationProviderNames.includes(provider as GenerationProviderName)
);

export const isGenerationCapability = (capability: string): capability is GenerationCapability => (
  generationCapabilities.includes(capability as GenerationCapability)
);

export const allGenerationCapabilities = generationCapabilities;
