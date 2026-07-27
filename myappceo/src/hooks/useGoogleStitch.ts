import { useState, useCallback, useRef } from 'react';
import { apiGetAuth, apiPost } from '../lib/apiClient';
import { useGenerationProgress } from './useGenerationProgress';
import { sanitizePrompt } from '../utils/security';

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface BrandColors {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
}

export interface GeneratedDesign {
    nodeId: string;
    imageUrl: string;
    thumbnailUrl?: string;
    prompt: string;
    createdAt: Date;
    error?: string;
}

export interface DesignGenerationRequest {
    ideaId: string;
    nodeId: string;
    label: string;
    description?: string;
    children?: string[];
    brandColors: BrandColors;
    platform: 'mobile' | 'web' | 'tablet' | 'desktop';
    style?: 'modern' | 'classic' | 'minimal' | 'playful';
    engine?: 'gemini' | 'claude';
}

export interface BatchDesignRequest {
    ideaId: string;
    nodes: DesignGenerationRequest[];
    brandColors: BrandColors;
    platform: 'mobile' | 'web' | 'tablet' | 'desktop';
    engine?: 'gemini' | 'claude';
}

type StyleType = 'modern' | 'classic' | 'minimal' | 'playful';
type PlatformType = 'mobile' | 'web';
const PROMPT_VERSION = 'design-prompt-v1';

const hashKey = (value: string) => {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = ((hash << 5) - hash) + value.charCodeAt(index);
        hash |= 0;
    }
    return Math.abs(hash).toString(36);
};

const PROMPT_TEMPLATES: Record<PlatformType, Record<StyleType, string>> = {
    mobile: {
        modern: `Create a high-fidelity {platform} UI design mockup.
Screen: "{label}"
{description}

REQUIREMENTS:
- iOS/Android app screen in {style} style
- Premium, polished aesthetic with subtle shadows and depth
- Clean {colorPrimary} primary color accent
- Professional typography (SF Pro / system fonts)
- Proper spacing and visual hierarchy
- Include realistic placeholder content
- High-resolution (4K) presentation quality
- No watermarks or placeholder text visible in final output`,

        classic: `Create a professional enterprise {platform} UI design.
Screen: "{label}"
{description}

REQUIREMENTS:
- Corporate/enterprise design language
- Structured layouts with data grids and tables
- Trustworthy, established aesthetic
- Conservative {colorPrimary} color usage
- Clear information hierarchy
- Professional iconography
- Business-appropriate placeholder content`,

        minimal: `Create an ultra-minimalist luxury {platform} UI design.
Screen: "{label}"
{description}

REQUIREMENTS:
- Swiss design inspired minimalism
- Extensive whitespace
- Stark black/white contrast with {colorPrimary} accent
- Premium luxury feel
- Essential elements only
- Sophisticated typography
- No unnecessary decorations`,

        playful: `Create a fun, vibrant {platform} app UI design.
Screen: "{label}"
{description}

REQUIREMENTS:
- Friendly, approachable design
- Rounded corners, soft shapes
- Playful micro-interactions implied
- Bright {colorPrimary} color palette
- Cheerful typography
- Inviting and engaging layout`
    },
    web: {
        modern: `Create a modern web application UI design.
Page: "{label}"
{description}

REQUIREMENTS:
- Responsive web layout (desktop)
- Contemporary SaaS aesthetic
- Clean navigation and header
- Card-based content sections
- {colorPrimary} brand accents
- Professional yet approachable`,

        classic: `Create a professional business website design.
Page: "{label}"
{description}

REQUIREMENTS:
- Corporate web design
- Traditional layout patterns
- Clear CTAs and navigation
- Trust-building aesthetic
- Professional imagery placeholders`,

        minimal: `Create a minimalist portfolio-style website.
Page: "{label}"
{description}

REQUIREMENTS:
- Maximum whitespace
- Focus on content
- Subtle {colorPrimary} accents
- Editorial typography
- Clean lines`,

        playful: `Create a creative agency style website.
Page: "{label}"
{description}

REQUIREMENTS:
- Bold design choices
- Creative layouts
- Vibrant {colorPrimary} use
- Expressive typography
- Engaging visuals`
    }
};

export function useGoogleStitch(ideaId?: string) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [lastError, setLastError] = useState<string | null>(null);

    // Track in-flight generations with a counter so `isGenerating` stays true
    // while ANY generation runs (single or batched) and only flips false once
    // the last one settles — no mid-batch flicker, no stuck-true on success.
    const activeCountRef = useRef(0);
    const beginGeneration = useCallback(() => {
        activeCountRef.current += 1;
        setIsGenerating(true);
    }, []);
    const endGeneration = useCallback(() => {
        activeCountRef.current = Math.max(0, activeCountRef.current - 1);
        if (activeCountRef.current === 0) setIsGenerating(false);
    }, []);

    // Utilize the WebSocket-based generation progress hook
    const {
        progressMap: progress,
        initializeProgress,
        updateProgress,
        isConnected
    } = useGenerationProgress({ ideaId: ideaId || '', enabled: !!ideaId });

    const buildPrompt = useCallback((
        label: string,
        description: string | undefined,
        children: string[],
        brandColors: BrandColors,
        platform: string,
        style: string = 'modern'
    ): string => {
        const safeLabel = sanitizePrompt(label);
        const safeDescription = description ? sanitizePrompt(description) : '';
        const safeChildren = children.map(c => sanitizePrompt(c));
        
        const platformKey: PlatformType = platform === 'mobile' || platform === 'tablet' ? 'mobile' : 'web';
        const styleKey: StyleType = (style as StyleType) || 'modern';
        
        const template = PROMPT_TEMPLATES[platformKey]?.[styleKey] || PROMPT_TEMPLATES.mobile.modern;
        
        let prompt = template
            .replace('{label}', safeLabel)
            .replace('{description}', safeDescription ? `\nDescription: ${safeDescription}` : '')
            .replace('{platform}', platform === 'mobile' ? 'Mobile App (iOS/Android)' : 'Web Application')
            .replace('{style}', style)
            .replace('{colorPrimary}', brandColors.primary)
            .replace('{colorSecondary}', brandColors.secondary);

        if (safeChildren.length > 0) {
            prompt += `\n\nFEATURES TO INCLUDE:\n${safeChildren.map((f, i) => `${i + 1}. ${f}`).join('\n')}`;
        }

        prompt += `\n\nCOLOR PALETTE:\nPrimary: ${brandColors.primary}\nSecondary: ${brandColors.secondary}\nAccent: ${brandColors.accent}\nBackground: ${brandColors.background}`;

        return prompt;
    }, []);

    const generateDesign = useCallback(async (
        request: DesignGenerationRequest,
        retries: number = 2
    ): Promise<GeneratedDesign | null> => {
        beginGeneration();
        setLastError(null);
        try {
        updateProgress(request.nodeId, { status: 'processing', progress: 0 });

        const prompt = buildPrompt(
            request.label,
            request.description,
            request.children || [],
            request.brandColors,
            request.platform,
            request.style
        );

        let lastErrorAttempt: Error | null = null;

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                updateProgress(request.nodeId, { 
                    status: 'processing', 
                    progress: attempt === 0 ? 10 : 30 + (attempt * 20) 
                });

                const response = await apiPost<ApiResponse<{
                    imageUrl: string;
                    thumbnailUrl?: string;
                }>>('/designs/generate', {
                    ideaId: request.ideaId,
                    nodeId: request.nodeId,
                    idempotencyKey: `design-${hashKey(JSON.stringify({
                        ideaId: request.ideaId,
                        nodeId: request.nodeId,
                        platform: request.platform,
                        style: request.style || 'modern',
                        brandColors: request.brandColors,
                        promptVersion: PROMPT_VERSION,
                    }))}`,
                    promptVersion: PROMPT_VERSION,
                    prompt,
                    brandColors: request.brandColors,
                    platform: request.platform,
                    style: request.style || 'modern',
                    engine: request.engine || 'gemini',
                });

                if (response.success && response.data) {
                    const design = response.data;

                    updateProgress(request.nodeId, {
                        status: 'completed',
                        progress: 100,
                        imageUrl: design.imageUrl
                    });

                    return {
                        nodeId: request.nodeId,
                        imageUrl: design.imageUrl,
                        thumbnailUrl: design.thumbnailUrl,
                        prompt,
                        createdAt: new Date(),
                    };
                }

                lastErrorAttempt = new Error(response.message || response.error || 'Generation failed');
            } catch (error) {
                lastErrorAttempt = error instanceof Error ? error : new Error(String(error));
                console.error(`Design generation attempt ${attempt + 1} failed:`, lastErrorAttempt);
                
                if (attempt < retries) {
                    const backoffMs = Math.pow(2, attempt) * 1000;
                    await new Promise(resolve => setTimeout(resolve, backoffMs));
                }
            }
        }

        console.error('All retry attempts failed for design generation');
        setLastError(lastErrorAttempt?.message || 'Generation failed after retries');

        updateProgress(request.nodeId, {
            status: 'failed',
            progress: 0,
            error: lastErrorAttempt?.message
        });

        return null;
        } finally {
            endGeneration();
        }
    }, [apiPost, buildPrompt, updateProgress, beginGeneration, endGeneration]);

    const generateAllDesigns = useCallback(async (
        requests: BatchDesignRequest,
        onProgress?: (nodeId: string, progress: number) => void
    ): Promise<GeneratedDesign[]> => {
        beginGeneration();
        const results: GeneratedDesign[] = [];

        // Initialize progress for all nodes to be generated
        initializeProgress(requests.nodes.map(n => n.nodeId));

        try {
            // Process in parallel with a limit (max 3 concurrent)
            const CONCURRENT_LIMIT = 3;

            for (let i = 0; i < requests.nodes.length; i += CONCURRENT_LIMIT) {
                const batch = requests.nodes.slice(i, i + CONCURRENT_LIMIT);

                const batchResults = await Promise.all(
                    batch.map(async (nodeRequest) => {
                        try {
                            updateProgress(nodeRequest.nodeId, {
                                status: 'processing',
                                progress: 30
                            });

                            const result = await generateDesign({
                                ...nodeRequest,
                                ideaId: requests.ideaId,
                                brandColors: requests.brandColors,
                                platform: requests.platform,
                            });

                            if (result) {
                                results.push(result);
                                onProgress?.(nodeRequest.nodeId, 100);
                            }

                            return result;
                        } catch (error) {
                            console.error(`Error generating design for ${nodeRequest.nodeId}:`, error);
                            updateProgress(nodeRequest.nodeId, {
                                status: 'failed',
                                progress: 0,
                                error: String(error)
                            });
                            return null;
                        }
                    })
                );

                // Small delay between batches to avoid rate limiting
                if (i + CONCURRENT_LIMIT < requests.nodes.length) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            return results;
        } finally {
            endGeneration();
        }
    }, [generateDesign, initializeProgress, updateProgress, beginGeneration, endGeneration]);

    const getDesignByNodeId = useCallback(async (
        ideaId: string,
        nodeId: string
    ): Promise<GeneratedDesign | null> => {
        try {
            const response = await apiGetAuth<ApiResponse<GeneratedDesign>>(`/designs/${ideaId}/nodes/${nodeId}`);
            if (response.success && response.data) {
                return response.data;
            }
            return null;
        } catch {
            return null;
        }
    }, []);

    const getAllDesigns = useCallback(async (
        ideaId: string
    ): Promise<GeneratedDesign[]> => {
        try {
            const response = await apiGetAuth<ApiResponse<GeneratedDesign[]>>(`/designs/${ideaId}`);
            if (response.success && response.data) {
                return response.data;
            }
            return [];
        } catch {
            return [];
        }
    }, []);

    return {
        isGenerating,
        lastError,
        progress,
        isConnected,
        generateDesign,
        generateAllDesigns,
        getDesignByNodeId,
        getAllDesigns,
    };
}
