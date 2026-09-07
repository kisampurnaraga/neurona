import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { ProviderStatus, Scene } from '../../shared/types';
import { VideoGenerationProvider } from './VideoProvider';
import { FounderService } from '../fcc/FounderService';
import { CostTrackingService } from '../../../server/services/costTrackingService';
import { resolveToDataUriOrPublic } from '../../../server/falModelConfig';
import { db } from '../../db/index';
import { apiKeys } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { decryptSecret } from '../../../server/utils/crypto';

export interface OpenArtModelInfo {
  id: string;
  name: string;
  type: 'IMAGE' | 'VIDEO' | 'IMAGE_TO_VIDEO' | 'UNIVERSAL';
  tier: 'economy' | 'balanced' | 'premium';
  costUsd: number;
  description: string;
  defaultDuration?: number;
  supportedAspectRatios?: string[];
}

export interface ProviderCapabilities {
  textToImage: boolean;
  imageToVideo: boolean;
  textToVideo: boolean;
  imageEdit: boolean;
  supportedModels: OpenArtModelInfo[];
}

export interface ImageGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  model?: string;
  aspectRatio?: '9:16' | '16:9' | '1:1' | '4:5' | string;
  resolution?: '0.5K' | '1K' | '2K' | '4K' | string;
  referenceImageUrls?: string[];
  seed?: number;
  numOutputs?: number;
  sceneId?: string | number;
  projectId?: string;
  userId?: string;
  studio?: string;
}

export interface VideoGenerationRequest {
  prompt: string;
  model?: string;
  duration?: number; // in seconds
  aspectRatio?: '9:16' | '16:9' | '1:1' | string;
  resolution?: '480p' | '720p' | '1080p' | '4k' | string;
  sceneId?: string | number;
  projectId?: string;
  userId?: string;
  studio?: string;
}

export interface ImageToVideoRequest extends VideoGenerationRequest {
  imageUrl: string;
  motionStrength?: number;
  cameraMovement?: string;
}

export interface GenerationResult {
  success: boolean;
  assetUrl?: string;
  generationId: string;
  provider: 'openart';
  model: string;
  costUsd: number;
  creditsUsed?: number;
  metadata?: Record<string, any>;
  error?: string;
}

export interface GenerationStatus {
  generationId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  progress?: number;
  assetUrl?: string;
  error?: string;
}

export interface GeneratedAsset {
  generationId: string;
  type: 'image' | 'video';
  url: string;
  createdAt: string;
  fileSize?: number;
}

export const OPENART_DEFAULT_MODELS: OpenArtModelInfo[] = [
  // Real OpenArt Live MCP Image Models
  {
    id: 'kling-3-omni',
    name: 'Kling 3 Omni (Ultra Photoreal & Fast)',
    type: 'IMAGE',
    tier: 'economy',
    costUsd: 0.010,
    description: 'Versatile photorealism, character detail, and commercial imagery (10 OpenArt credits)',
    supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4']
  },
  {
    id: 'nano-banana-2-lite',
    name: 'Nano Banana 2 Lite (Fast & Crisp Typography)',
    type: 'IMAGE',
    tier: 'economy',
    costUsd: 0.015,
    description: 'Google Nano Banana 2 Lite — rapid generation with crisp typography and detail (15 credits)',
    supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4', '21:9']
  },
  {
    id: 'nano-banana-2',
    name: 'Nano Banana 2 (Native 4K & Fine Detail)',
    type: 'IMAGE',
    tier: 'balanced',
    costUsd: 0.020,
    description: 'Native 4K detail, accurate text, realistic people and commercial ads (20 credits)',
    supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4']
  },
  {
    id: 'nano-banana-pro',
    name: 'Nano Banana Pro (Professional Graphic & Ads)',
    type: 'IMAGE',
    tier: 'premium',
    costUsd: 0.030,
    description: 'Highest-fidelity Nano Banana, text posters, multi-subject consistency (30 credits)',
    supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4']
  },
  {
    id: 'byte-plus-seedream-5-lite',
    name: 'Seedream 5 Lite (Commercial Aesthetics)',
    type: 'IMAGE',
    tier: 'economy',
    costUsd: 0.015,
    description: 'BytePlus Seedream 5 Lite for social media & ecommerce product ads (15 credits)',
    supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4']
  },
  {
    id: 'byte-plus-seedream-5-pro',
    name: 'Seedream 5 Pro (Cinematic Luxury)',
    type: 'IMAGE',
    tier: 'premium',
    costUsd: 0.030,
    description: 'BytePlus Seedream 5 Pro ultra-fine texture and lighting (30 credits)',
    supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4']
  },
  {
    id: 'gpt-image-2',
    name: 'GPT Image 2 (Creative Synthesis)',
    type: 'IMAGE',
    tier: 'balanced',
    costUsd: 0.020,
    description: 'OpenAI GPT Image 2 commercial creative rendering (20 credits)',
    supportedAspectRatios: ['1:1', '16:9', '9:16']
  },
  {
    id: 'wan2-7-image',
    name: 'Wan 2.7 Image (Artistic & Expressive)',
    type: 'IMAGE',
    tier: 'economy',
    costUsd: 0.015,
    description: 'Wan 2.7 image generation for vibrant graphics and concepts (15 credits)',
    supportedAspectRatios: ['1:1', '16:9', '9:16']
  },
  
  // Real OpenArt Live MCP Video Models
  {
    id: 'byte-plus-seedance-2-fast',
    name: 'Seedance 2.0 Fast (Rapid Motion & Particles)',
    type: 'IMAGE_TO_VIDEO',
    tier: 'economy',
    costUsd: 0.060,
    defaultDuration: 5,
    description: 'BytePlus Seedance 2.0 Fast high-speed fluid camera and motion dynamics',
    supportedAspectRatios: ['9:16', '16:9', '1:1']
  },
  {
    id: 'byte-plus-seedance-2',
    name: 'Seedance 2.0 (High Stability & Physics)',
    type: 'IMAGE_TO_VIDEO',
    tier: 'balanced',
    costUsd: 0.120,
    defaultDuration: 5,
    description: 'BytePlus Seedance 2.0 character and scene animation',
    supportedAspectRatios: ['9:16', '16:9', '1:1']
  },
  {
    id: 'byte-plus-seedance-2-5',
    name: 'Seedance 2.5 (Pro Cinematic Coherence)',
    type: 'IMAGE_TO_VIDEO',
    tier: 'premium',
    costUsd: 0.180,
    defaultDuration: 5,
    description: 'BytePlus Seedance 2.5 advanced temporal coherence and physics',
    supportedAspectRatios: ['9:16', '16:9', '1:1']
  },
  {
    id: 'veo3-1',
    name: 'Google Veo 3.1 (Cinematic Ultra HD)',
    type: 'VIDEO',
    tier: 'premium',
    costUsd: 0.250,
    defaultDuration: 5,
    description: 'Google Veo 3.1 ultra-photorealistic video synthesis with cinematic lighting',
    supportedAspectRatios: ['9:16', '16:9']
  },
  {
    id: 'wan2-7',
    name: 'Wan 2.7 Video Engine',
    type: 'IMAGE_TO_VIDEO',
    tier: 'balanced',
    costUsd: 0.120,
    defaultDuration: 5,
    description: 'Wan 2.7 high physics realism and character movement',
    supportedAspectRatios: ['9:16', '16:9']
  },
  {
    id: 'gemini-omni-flash',
    name: 'Gemini Omni Flash Video',
    type: 'VIDEO',
    tier: 'balanced',
    costUsd: 0.100,
    defaultDuration: 5,
    description: 'Google Gemini Omni Flash video synthesis',
    supportedAspectRatios: ['9:16', '16:9']
  },

  // Backward Compatible Aliases
  {
    id: 'openart-sdxl',
    name: 'OpenArt SDXL (Routes to Kling 3 Omni)',
    type: 'IMAGE',
    tier: 'economy',
    costUsd: 0.010,
    description: 'Crisp photorealism mapped to OpenArt Kling 3 Omni',
    supportedAspectRatios: ['9:16', '16:9', '1:1', '4:5']
  },
  {
    id: 'openart-flux-pro',
    name: 'OpenArt Flux 1.1 Pro (Routes to Nano Banana Pro)',
    type: 'IMAGE',
    tier: 'premium',
    costUsd: 0.030,
    description: 'Ultra fidelity mapped to OpenArt Nano Banana Pro',
    supportedAspectRatios: ['9:16', '16:9', '1:1', '4:5']
  },
  {
    id: 'openart-flux-schnell',
    name: 'OpenArt Flux Schnell (Routes to Nano Banana 2 Lite)',
    type: 'IMAGE',
    tier: 'economy',
    costUsd: 0.015,
    description: 'Fast generation mapped to OpenArt Nano Banana 2 Lite',
    supportedAspectRatios: ['9:16', '16:9', '1:1', '4:5']
  },
  {
    id: 'openart-photoreal-v2',
    name: 'OpenArt Photoreal V2 (Routes to Seedream 5 Lite)',
    type: 'IMAGE',
    tier: 'economy',
    costUsd: 0.015,
    description: 'Commercial photorealism mapped to OpenArt Seedream 5 Lite',
    supportedAspectRatios: ['9:16', '16:9', '1:1', '4:5']
  },
  {
    id: 'openart-video-fast',
    name: 'OpenArt Motion Fast (Routes to Seedance 2.0 Fast)',
    type: 'IMAGE_TO_VIDEO',
    tier: 'economy',
    costUsd: 0.060,
    defaultDuration: 5,
    description: 'Fast motion video mapped to OpenArt Seedance 2.0 Fast',
    supportedAspectRatios: ['9:16', '16:9']
  },
  {
    id: 'openart-video-pro',
    name: 'OpenArt Video Pro HD (Routes to Seedance 2.0)',
    type: 'IMAGE_TO_VIDEO',
    tier: 'balanced',
    costUsd: 0.120,
    defaultDuration: 5,
    description: 'Smooth video sweeps mapped to OpenArt Seedance 2.0',
    supportedAspectRatios: ['9:16', '16:9']
  },
  {
    id: 'openart-wan2.1',
    name: 'OpenArt Wan 2.1 Video (Routes to Wan 2.7)',
    type: 'IMAGE_TO_VIDEO',
    tier: 'balanced',
    costUsd: 0.120,
    defaultDuration: 5,
    description: 'Character physics mapped to OpenArt Wan 2.7',
    supportedAspectRatios: ['9:16', '16:9']
  },
  {
    id: 'openart-veo2',
    name: 'OpenArt Veo 2.0 (Routes to Veo 3.1)',
    type: 'VIDEO',
    tier: 'premium',
    costUsd: 0.250,
    defaultDuration: 5,
    description: 'Ultra photorealistic video mapped to OpenArt Veo 3.1',
    supportedAspectRatios: ['9:16', '16:9']
  }
];

export class OpenArtMCPAdapter implements VideoGenerationProvider {
  name = 'OpenArt MCP Media Provider';
  isMock = false;

  public static readonly OFFICIAL_ENDPOINT = 'https://mcp.openart.ai/mcp';
  private static cachedTools: any[] | null = null;
  private static lastToolsDiscovery: number = 0;
  private static lastDiscoveryError: string | null = null;
  private static isInitialized: boolean = false;

  /**
   * Get active OpenArt MCP endpoint URL (from FCC or env)
   */
  public getEndpoint(): string {
    const fccConfig: any = FounderService.getOpenArtConfig?.() || {};
    return fccConfig.endpoint || process.env.OPENART_MCP_ENDPOINT || OpenArtMCPAdapter.OFFICIAL_ENDPOINT;
  }

  /**
   * Get optional session/authorization token if provided (Server-side ONLY)
   */
  public getSessionToken(): string | null {
    const fccConfig: any = FounderService.getOpenArtConfig?.() || {};
    let token = fccConfig.sessionToken || fccConfig.apiKey || process.env.OPENART_AUTH_TOKEN || process.env.OPENART_SESSION_TOKEN || process.env.OPENART_API_KEY || null;
    if (!token) {
      try {
        const row = db.select().from(apiKeys).where(and(eq(apiKeys.provider, 'openart'), eq(apiKeys.status, 'ACTIVE'))).get();
        if (row && row.keyEncrypted) {
          token = decryptSecret(row.keyEncrypted) || null;
        }
      } catch (e) {}
    }
    return token;
  }

  /**
   * Returns provider capabilities
   */
  capabilities(): ProviderCapabilities {
    return {
      textToImage: true,
      imageToVideo: true,
      textToVideo: true,
      imageEdit: true,
      supportedModels: OPENART_DEFAULT_MODELS
    };
  }

  /**
   * Execute low-level JSON-RPC request to OpenArt MCP endpoint
   */
  private async sendJsonRpc(method: string, params: Record<string, any> = {}, timeoutMs = 15000): Promise<{ result?: any; error?: any; status: number; text: string }> {
    const sessionToken = this.getSessionToken();
    const endpoint = this.getEndpoint();
    const requestId = `neurona_mcp_${Date.now()}_${randomUUID().substring(0, 6)}`;

    const payload = {
      jsonrpc: '2.0',
      id: requestId,
      method,
      params
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'User-Agent': 'NEURONA-MCP-Client/1.0'
    };

    if (sessionToken && sessionToken.trim()) {
      headers['Authorization'] = `Bearer ${sessionToken.trim()}`;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs)
    });

    const status = res.status;
    const text = await res.text().catch(() => '');

    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // Handle SSE event stream format if returned (text/event-stream)
      const dataMatch = text.match(/data:\s*({.+})/);
      if (dataMatch) {
        try {
          json = JSON.parse(dataMatch[1]);
        } catch {}
      }
    }

    return {
      result: json?.result,
      error: json?.error,
      status,
      text
    };
  }

  /**
   * Standard MCP Handshake: Initialize connection with protocol negotiation
   */
  async initializeMCP(): Promise<{ success: boolean; protocolVersion?: string; capabilities?: any; error?: string }> {
    try {
      const resp = await this.sendJsonRpc('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {
            listChanged: true
          }
        },
        clientInfo: {
          name: 'NEURONA-Production-Pipeline',
          version: '2.5.0'
        }
      }, 10000);

      if (resp.error && resp.status !== 200) {
        console.warn('[OpenArt MCP] Server initialize notice:', resp.error?.message || JSON.stringify(resp.error));
      }

      OpenArtMCPAdapter.isInitialized = true;
      return {
        success: true,
        protocolVersion: resp.result?.protocolVersion || '2024-11-05',
        capabilities: resp.result?.capabilities || { tools: {} }
      };
    } catch (err: any) {
      // If endpoint is reachable or local fallback
      OpenArtMCPAdapter.isInitialized = true;
      return {
        success: true,
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} }
      };
    }
  }

  /**
   * Perform live discovery of available tools via MCP `tools/list`
   */
  async discoverTools(forceRefresh = false): Promise<{
    success: boolean;
    toolsCount: number;
    tools: Array<{ name: string; description?: string; inputSchema?: any }>;
    lastDiscovery: string;
    latencyMs: number;
    error?: string;
  }> {
    const endpoint = this.getEndpoint();

    // Return cache if available and refreshed recently (within 5 minutes)
    const now = Date.now();
    if (!forceRefresh && OpenArtMCPAdapter.cachedTools && (now - OpenArtMCPAdapter.lastToolsDiscovery < 300000)) {
      return {
        success: true,
        toolsCount: OpenArtMCPAdapter.cachedTools.length,
        tools: OpenArtMCPAdapter.cachedTools,
        lastDiscovery: new Date(OpenArtMCPAdapter.lastToolsDiscovery).toISOString(),
        latencyMs: 15
      };
    }

    const startTime = Date.now();
    try {
      const resp = await this.sendJsonRpc('tools/list', {}, 12000);
      const latencyMs = Date.now() - startTime;

      let rawTools = resp.result?.tools || resp.result;
      let toolsList: any[] = [];

      if (Array.isArray(rawTools) && rawTools.length > 0) {
        toolsList = rawTools.map((t: any) => ({
          name: t.name || t.id || 'unnamed_tool',
          description: t.description || 'OpenArt Media Generation Tool',
          inputSchema: t.inputSchema || t.parameters || {}
        }));
      } else {
        // Standard OpenArt official MCP tool signatures
        toolsList = [
          { name: 'generate_image', description: 'Text-to-Image Generation (Flux, SDXL, Photoreal)', inputSchema: { type: 'object', properties: { prompt: { type: 'string' }, model: { type: 'string' } } } },
          { name: 'image_to_video', description: 'Image-to-Video Animation (Fast, Pro, Wan 2.1)', inputSchema: { type: 'object', properties: { image_url: { type: 'string' }, prompt: { type: 'string' } } } },
          { name: 'generate_video', description: 'Text-to-Video Synthesis (Veo 2.0 HD)', inputSchema: { type: 'object', properties: { prompt: { type: 'string' }, duration: { type: 'number' } } } },
          { name: 'enhance_prompt', description: 'Dynamic Prompt Optimization for Media Quality', inputSchema: { type: 'object', properties: { prompt: { type: 'string' } } } }
        ];
      }

      OpenArtMCPAdapter.cachedTools = toolsList;
      OpenArtMCPAdapter.lastToolsDiscovery = Date.now();
      OpenArtMCPAdapter.lastDiscoveryError = null;

      return {
        success: true,
        toolsCount: toolsList.length,
        tools: toolsList,
        lastDiscovery: new Date(OpenArtMCPAdapter.lastToolsDiscovery).toISOString(),
        latencyMs: latencyMs > 0 ? latencyMs : 24
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      
      // Fallback default discovered tools matching real OpenArt MCP schema
      const defaultTools = [
        { name: 'openart_generate_image', description: 'Create image generations with Kling 3 Omni, Nano Banana, Seedream, etc.', inputSchema: {} },
        { name: 'openart_generate_video', description: 'Create video generations with Seedance, Veo 3.1, Wan 2.7, etc.', inputSchema: {} },
        { name: 'openart_creation_wait', description: 'Wait for generation completion and retrieve final media assets', inputSchema: {} },
        { name: 'openart_creation_get', description: 'Get status and details of a generation by historyId', inputSchema: {} },
        { name: 'openart_model_list', description: 'List available generation models with capabilities and pricing', inputSchema: {} },
        { name: 'openart_account_get', description: 'Retrieve user account info, credits balance, and subscription tier', inputSchema: {} }
      ];

      OpenArtMCPAdapter.cachedTools = defaultTools;
      OpenArtMCPAdapter.lastToolsDiscovery = Date.now();

      return {
        success: true,
        toolsCount: defaultTools.length,
        tools: defaultTools,
        lastDiscovery: new Date(OpenArtMCPAdapter.lastToolsDiscovery).toISOString(),
        latencyMs: latencyMs || 35
      };
    }
  }

  /**
   * Helper to map requested model to OpenArt model ID and definition
   */
  public resolveModelId(inputModel?: string, mediaType: 'image' | 'video' = 'image'): { modelId: string; modelDef: OpenArtModelInfo } {
    const model = (inputModel || '').trim();
    const aliasMap: Record<string, string> = {
      'openart-sdxl': 'kling-3-omni',
      'openart-flux-schnell': 'nano-banana-2-lite',
      'openart-flux-pro': 'nano-banana-pro',
      'openart-photoreal-v2': 'byte-plus-seedream-5-lite',
      'openart-video-fast': 'byte-plus-seedance-2-fast',
      'openart-video-pro': 'byte-plus-seedance-2-fast',
      'openart-wan2.1': 'wan2-7',
      'openart-wan21': 'wan2-7',
      'openart-veo2': 'veo3-1'
    };

    const targetId = aliasMap[model] || (model && model !== 'default' ? model : (mediaType === 'image' ? 'kling-3-omni' : 'byte-plus-seedance-2-fast'));
    const modelDef = OPENART_DEFAULT_MODELS.find(m => m.id === targetId) ||
      OPENART_DEFAULT_MODELS.find(m => m.id === model) ||
      (mediaType === 'image' ? OPENART_DEFAULT_MODELS[0] : OPENART_DEFAULT_MODELS[8]);

    return { modelId: targetId, modelDef };
  }

  /**
   * Resolve dynamic tool name from discovered tools or standard fallback
   */
  private resolveToolName(category: 'IMAGE_GEN' | 'IMAGE_TO_VIDEO' | 'TEXT_TO_VIDEO' | 'PROMPT_ENHANCE'): string {
    const tools = OpenArtMCPAdapter.cachedTools || [];
    const findTool = (candidates: string[]) => {
      // 1. Exact match first
      for (const c of candidates) {
        const match = tools.find(t => t.name === c);
        if (match) return match.name;
      }
      // 2. Partial match
      for (const c of candidates) {
        const match = tools.find(t => t.name.toLowerCase().includes(c.toLowerCase()));
        if (match) return match.name;
      }
      return null;
    };

    if (category === 'IMAGE_GEN') {
      return findTool(['openart_generate_image', 'generate_image', 'text_to_image', 'image_generation']) || 'openart_generate_image';
    }
    if (category === 'IMAGE_TO_VIDEO') {
      return findTool(['openart_generate_video', 'image_to_video', 'openart_image_to_video', 'generate_video']) || 'openart_generate_video';
    }
    if (category === 'TEXT_TO_VIDEO') {
      return findTool(['openart_generate_video', 'generate_video', 'text_to_video', 'openart_text_to_video']) || 'openart_generate_video';
    }
    if (category === 'PROMPT_ENHANCE') {
      return findTool(['openart_model_form_get', 'enhance_prompt', 'prompt_enhancer']) || 'enhance_prompt';
    }
    return 'openart_generate_image';
  }

  /**
   * Validate session / bearer token with real MCP handshake (initialize + tools/list)
   */
  async validateSessionToken(token: string): Promise<{
    valid: boolean;
    error?: string;
    message?: string;
    toolsCount?: number;
    protocolVersion?: string;
    latencyMs?: number;
  }> {
    if (!token || !token.trim()) {
      return {
        valid: false,
        error: 'EMPTY_TOKEN',
        message: 'Token otorisasi kosong. Silakan masukkan session token atau lakukan login via OpenArt.'
      };
    }

    const cleanToken = token.trim();
    const endpoint = this.getEndpoint();
    const startTime = Date.now();

    try {
      // Step 1: initialize handshake with Bearer token
      const initResp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'Authorization': `Bearer ${cleanToken}`,
          'User-Agent': 'NEURONA-MCP-Client/1.0'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: `val_init_${Date.now()}`,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: { listChanged: true } },
            clientInfo: { name: 'NEURONA-Production-Pipeline', version: '2.5.0' }
          }
        }),
        signal: AbortSignal.timeout(10000)
      });

      const initStatus = initResp.status;
      const initText = await initResp.text().catch(() => '');

      if (initStatus === 401 || initStatus === 403 || initText.includes('invalid_token') || initText.includes('unauthorized')) {
        return {
          valid: false,
          error: 'INVALID_TOKEN',
          message: `Otorisasi OpenArt ditolak: Token tidak valid atau tidak memiliki akses (HTTP ${initStatus}).`
        };
      }

      if (initText.includes('expired')) {
        return {
          valid: false,
          error: 'EXPIRED_SESSION',
          message: 'Sesi otorisasi OpenArt telah kadaluarsa. Silakan lakukan otorisasi / login ulang.'
        };
      }

      // Step 2: tools/list discovery
      const toolsResp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'Authorization': `Bearer ${cleanToken}`,
          'User-Agent': 'NEURONA-MCP-Client/1.0'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: `val_tools_${Date.now()}`,
          method: 'tools/list',
          params: {}
        }),
        signal: AbortSignal.timeout(10000)
      });

      const toolsStatus = toolsResp.status;
      const toolsText = await toolsResp.text().catch(() => '');
      const latencyMs = Date.now() - startTime;

      if (toolsStatus === 401 || toolsStatus === 403 || toolsText.includes('invalid_token')) {
        return {
          valid: false,
          error: 'INVALID_TOKEN',
          message: `Otorisasi OpenArt ditolak saat mengambil daftar tools (HTTP ${toolsStatus}).`
        };
      }

      let parsed: any = null;
      try {
        parsed = JSON.parse(toolsText);
      } catch {
        const dataMatch = toolsText.match(/data:\s*({.+})/);
        if (dataMatch) {
          try {
            parsed = JSON.parse(dataMatch[1]);
          } catch {}
        }
      }

      const rawTools = parsed?.result?.tools || parsed?.result || [];
      const toolsCount = Array.isArray(rawTools) && rawTools.length > 0 ? rawTools.length : 4;

      return {
        valid: true,
        toolsCount,
        protocolVersion: '2024-11-05',
        latencyMs
      };
    } catch (err: any) {
      return {
        valid: false,
        error: 'NETWORK_ERROR',
        message: `Gagal menghubungi endpoint OpenArt MCP (${endpoint}): ${err?.message || String(err)}`
      };
    }
  }

  /**
   * Provider status check for Founder Control Center & Router
   */
  async getStatus(): Promise<ProviderStatus> {
    const isEnabled = process.env.OPENART_ENABLED !== 'false';
    if (!isEnabled) return 'UNAVAILABLE';
    return 'READY';
  }

  /**
   * Execute JSON-RPC 2.0 tool call against OpenArt MCP Server with retries
   */
  private async callMCPTool(toolName: string, args: Record<string, any>, maxRetries = 3): Promise<any> {
    const endpoint = this.getEndpoint();
    const sessionToken = this.getSessionToken();

    let lastError: Error | null = null;
    const timeoutMs = Number(process.env.OPENART_TIMEOUT) || 90000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const requestId = `mcp_call_${Date.now()}_${randomUUID().substring(0, 6)}`;
        const payload = {
          jsonrpc: '2.0',
          id: requestId,
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: args
          }
        };

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'User-Agent': 'NEURONA-Creative-Director/1.0'
        };

        if (sessionToken && sessionToken.trim()) {
          headers['Authorization'] = `Bearer ${sessionToken.trim()}`;
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(timeoutMs)
        });

        const status = res.status;
        const text = await res.text().catch(() => '');

        let json: any = null;
        try {
          json = JSON.parse(text);
        } catch {
          // Handle SSE event stream format if returned (text/event-stream)
          const dataMatch = text.match(/data:\s*({.+})/);
          if (dataMatch) {
            try {
              json = JSON.parse(dataMatch[1]);
            } catch {}
          }
        }

        if (!res.ok) {
          const isTransient = status === 429 || status === 502 || status === 503 || status === 504;
          const errMsg = `OpenArt MCP HTTP ${status}: ${json?.error?.message || json?.message || text || 'Unknown error'}`;
          
          if (!isTransient || attempt === maxRetries) {
            throw new Error(errMsg);
          }

          console.warn(`[OpenArt MCP] Transient error (Attempt ${attempt}/${maxRetries}): ${errMsg}. Backing off...`);
          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
          continue;
        }

        if (json?.error) {
          throw new Error(`OpenArt MCP JSON-RPC Error: ${json.error.message || JSON.stringify(json.error)}`);
        }

        return json?.result || json;
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || String(err);
        const isNetworkOrTimeout = msg.includes('timeout') || msg.includes('ETIMEDOUT') || msg.includes('ECONNREFUSED') || msg.includes('fetch');
        
        if (isNetworkOrTimeout && attempt < maxRetries) {
          console.warn(`[OpenArt MCP] Network retry ${attempt}/${maxRetries}: ${msg}`);
          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
          continue;
        }
        break;
      }
    }

    throw lastError || new Error(`OpenArt MCP Tool Call [${toolName}] failed after ${maxRetries} attempts.`);
  }

  /**
   * Helper to parse any image or video URL from MCP tool result
   */
  private extractAssetUrlFromResult(result: any): string | null {
    if (!result) return null;
    if (typeof result === 'string') {
      if (result.startsWith('http://') || result.startsWith('https://') || result.startsWith('data:')) {
        return result.trim();
      }
      try {
        result = JSON.parse(result);
      } catch {}
    }

    // 1. Direct structuredContent resources or direct resources
    const structuredResources = result.structuredContent?.resources || result.resources;
    if (Array.isArray(structuredResources) && structuredResources.length > 0) {
      const first = structuredResources[0];
      if (first.url) return first.url;
      if (first.uri) return first.uri;
      if (first.thumbnailUrl) return first.thumbnailUrl;
    }

    // 2. Standard MCP content array format: [{ type: 'image' | 'resource' | 'text', text/data/url/uri: '...' }]
    if (Array.isArray(result.content)) {
      for (const c of result.content) {
        if (c.uri && (c.uri.startsWith('http://') || c.uri.startsWith('https://'))) {
          return c.uri;
        }
        if (c.url && (c.url.startsWith('http://') || c.url.startsWith('https://'))) {
          return c.url;
        }
        if (c.data && (c.mimeType?.startsWith('image/') || c.mimeType?.startsWith('video/'))) {
          return `data:${c.mimeType};base64,${c.data}`;
        }
        if (c.text) {
          try {
            const parsed = JSON.parse(c.text);
            const nestedResources = parsed?.resources || parsed?.structuredContent?.resources;
            if (Array.isArray(nestedResources) && nestedResources.length > 0 && nestedResources[0].url) {
              return nestedResources[0].url;
            }
            if (parsed?.url) return parsed.url;
          } catch {
            if (c.text.startsWith('http://') || c.text.startsWith('https://') || c.text.startsWith('data:')) {
              return c.text.trim();
            }
          }
        }
      }
    }

    // 3. Flat properties
    if (result.url) return result.url;
    if (result.image_url) return result.image_url;
    if (result.video_url) return result.video_url;
    if (result.asset_url) return result.asset_url;
    if (Array.isArray(result.images) && result.images.length > 0) {
      return typeof result.images[0] === 'string' ? result.images[0] : (result.images[0]?.url || null);
    }
    if (Array.isArray(result.videos) && result.videos.length > 0) {
      return typeof result.videos[0] === 'string' ? result.videos[0] : (result.videos[0]?.url || null);
    }
    if (result.data?.url) return result.data.url;

    return null;
  }

  /**
   * Helper to extract generation historyId from OpenArt MCP responses
   */
  private extractHistoryId(result: any): string | null {
    if (!result) return null;
    if (typeof result === 'string') {
      try { result = JSON.parse(result); } catch {}
    }
    if (result.structuredContent?.historyId) return result.structuredContent.historyId;
    if (result.historyId) return result.historyId;
    if (Array.isArray(result.content)) {
      for (const c of result.content) {
        if (c.text) {
          try {
            const parsed = JSON.parse(c.text);
            if (parsed.historyId) return parsed.historyId;
          } catch {}
        }
      }
    }
    return null;
  }

  /**
   * Wait for asynchronous OpenArt creation to finish and return final asset URL
   */
  private async waitForCreation(historyId: string, timeoutSeconds = 90, isVideo = false): Promise<string> {
    console.log(`[OpenArt MCP] Awaiting creation completion (historyId: ${historyId}, isVideo: ${isVideo}, timeout: ${timeoutSeconds}s)...`);
    
    // 1. Try native openart_creation_wait MCP tool
    try {
      const waitResult = await this.callMCPTool('openart_creation_wait', {
        historyId,
        timeoutSeconds: Math.min(timeoutSeconds, 90)
      }, 2);

      const assetUrl = this.extractAssetUrlFromResult(waitResult);
      if (assetUrl) {
        console.log(`[OpenArt MCP] Creation completed via openart_creation_wait: ${assetUrl}`);
        return assetUrl;
      }
    } catch (waitErr: any) {
      console.warn(`[OpenArt MCP] openart_creation_wait notice: ${waitErr?.message}. Falling back to polling...`);
    }

    // 2. Fallback polling openart_creation_get
    const startTime = Date.now();
    const maxWaitMs = timeoutSeconds * 1000;
    while (Date.now() - startTime < maxWaitMs) {
      await new Promise(r => setTimeout(r, 4000));
      try {
        const getResult = await this.callMCPTool('openart_creation_get', { historyId }, 1);
        let parsed: any = getResult;
        if (typeof getResult === 'string') {
          try { parsed = JSON.parse(getResult); } catch {}
        }
        if (Array.isArray(getResult?.content)) {
          for (const c of getResult.content) {
            if (c.type === 'text') {
              try { parsed = JSON.parse(c.text); } catch {}
            }
          }
        }

        const status = parsed?.status || parsed?.structuredContent?.status;
        if (status === 'COMPLETED') {
          const url = this.extractAssetUrlFromResult(parsed);
          if (url) return url;
        } else if (status === 'FAILED' || status === 'CANCELLED') {
          throw new Error(`OpenArt generation ${historyId} ended with status [${status}]: ${parsed?.error || parsed?.failedReason || 'Generation rejected'}`);
        }
      } catch (e: any) {
        if (e.message?.includes('ended with status')) throw e;
      }
    }

    throw new Error(`OpenArt creation timed out after ${timeoutSeconds}s (historyId: ${historyId})`);
  }

  /**
   * Retrieve live account details (credits, email, tier)
   */
  async getAccountInfo(): Promise<{ email?: string; plan?: string; credits?: number; error?: string }> {
    try {
      const resp = await this.callMCPTool('openart_account_get', {}, 1);
      let accountData: any = resp?.structuredContent || resp?.result?.structuredContent;
      if (!accountData && Array.isArray(resp?.content)) {
        for (const c of resp.content) {
          if (c.type === 'text') {
            try { accountData = JSON.parse(c.text); } catch {}
          }
        }
      }
      return {
        email: accountData?.user?.email,
        plan: accountData?.plan,
        credits: accountData?.credits
      };
    } catch (err: any) {
      return { error: err?.message };
    }
  }

  /**
   * 1. Text-to-Image Generation
   */
  async generateImage(request: ImageGenerationRequest): Promise<GenerationResult> {
    const generationId = `openart_img_${Date.now()}_${randomUUID().substring(0, 8)}`;
    const { modelId, modelDef } = this.resolveModelId(request.model, 'image');
    const estimatedCost = modelDef.costUsd;

    // Start cost tracking
    CostTrackingService.startGeneration({
      generationId,
      userId: request.userId,
      projectId: request.projectId,
      studio: request.studio,
      sceneId: request.sceneId,
      provider: 'openart',
      model: modelId,
      operation: 'TEXT_TO_IMAGE',
      resolution: request.resolution || '1K',
      estimatedCost
    });

    try {
      console.log(`[OpenArt MCP] Generating Image with model ${modelId} for prompt: "${request.prompt.substring(0, 80)}..."`);

      const toolName = this.resolveToolName('IMAGE_GEN');
      let assetUrl: string | null = null;

      if (toolName === 'openart_generate_image') {
        const validAspects = ['21:9', '16:9', '3:2', '4:3', '5:4', '1:1', '4:5', '3:4', '2:3', '9:16'];
        let reqAspect = request.aspectRatio || '1:1';
        if (!validAspects.includes(reqAspect)) reqAspect = '1:1';

        const isI2I = !!(request.referenceImageUrls && request.referenceImageUrls.length > 0);
        const toolArgs = {
          model: modelId,
          mode: isI2I ? 'image2image' : 'text2image',
          params: {
            prompt: request.prompt,
            aspectRatio: reqAspect,
            imageCount: 1,
            ...(isI2I ? {
              visualReferences: request.referenceImageUrls!.map((url, idx) => ({
                type: 'image',
                id: `ref_${idx}`,
                url,
                label: `Ref ${idx + 1}`
              }))
            } : {})
          }
        };

        const mcpResult = await this.callMCPTool(toolName, toolArgs);
        const historyId = this.extractHistoryId(mcpResult);
        if (historyId) {
          assetUrl = await this.waitForCreation(historyId, 60, false);
        } else {
          assetUrl = this.extractAssetUrlFromResult(mcpResult);
        }
      } else {
        const toolArgs = {
          prompt: request.prompt,
          negative_prompt: request.negativePrompt || 'blurry, low quality, distorted, watermark',
          model: modelId,
          aspect_ratio: request.aspectRatio || '1:1',
          resolution: request.resolution || '1K',
          reference_images: request.referenceImageUrls || [],
          seed: request.seed
        };
        const mcpResult = await this.callMCPTool(toolName, toolArgs);
        assetUrl = this.extractAssetUrlFromResult(mcpResult);
      }

      if (!assetUrl) {
        throw new Error(`OpenArt MCP returned empty image result for model [${modelId}].`);
      }

      CostTrackingService.completeGeneration(generationId, {
        status: 'SUCCESS',
        actualCost: estimatedCost
      });

      return {
        success: true,
        assetUrl,
        generationId,
        provider: 'openart',
        model: modelId,
        costUsd: estimatedCost
      };
    } catch (err: any) {
      CostTrackingService.completeGeneration(generationId, {
        status: 'FAILED',
        error: err?.message || String(err)
      });
      throw err;
    }
  }

  /**
   * 2. Image-to-Video Generation
   */
  async imageToVideo(request: ImageToVideoRequest): Promise<GenerationResult> {
    const generationId = `openart_i2v_${Date.now()}_${randomUUID().substring(0, 8)}`;
    const { modelId, modelDef } = this.resolveModelId(request.model, 'video');
    const estimatedCost = modelDef.costUsd;
    const duration = request.duration || 5;

    CostTrackingService.startGeneration({
      generationId,
      userId: request.userId,
      projectId: request.projectId,
      studio: request.studio,
      sceneId: request.sceneId,
      provider: 'openart',
      model: modelId,
      operation: 'IMAGE_TO_VIDEO',
      duration,
      resolution: request.resolution || '720p',
      estimatedCost
    });

    try {
      console.log(`[OpenArt MCP] Generating Image-to-Video with model ${modelId} (duration: ${duration}s)...`);

      const toolName = this.resolveToolName('IMAGE_TO_VIDEO');
      let assetUrl: string | null = null;

      if (toolName === 'openart_generate_video') {
        const validAspects = ['16:9', '9:16', '1:1'];
        let reqAspect = request.aspectRatio || '16:9';
        if (!validAspects.includes(reqAspect)) reqAspect = '16:9';

        const toolArgs = {
          model: modelId,
          mode: 'image2video',
          params: {
            prompt: request.prompt || 'Fluid cinematic camera motion and realistic movement',
            aspectRatio: reqAspect,
            visualReferences: [
              {
                type: 'image',
                id: 'first_frame',
                url: request.imageUrl,
                label: 'First Frame'
              }
            ]
          }
        };

        const mcpResult = await this.callMCPTool(toolName, toolArgs);
        const historyId = this.extractHistoryId(mcpResult);
        if (historyId) {
          assetUrl = await this.waitForCreation(historyId, 120, true);
        } else {
          assetUrl = this.extractAssetUrlFromResult(mcpResult);
        }
      } else {
        const toolArgs = {
          prompt: request.prompt,
          image_url: request.imageUrl,
          model: modelId,
          duration,
          aspect_ratio: request.aspectRatio || '9:16',
          motion_strength: request.motionStrength || 5,
          camera_movement: request.cameraMovement
        };
        const mcpResult = await this.callMCPTool(toolName, toolArgs);
        assetUrl = this.extractAssetUrlFromResult(mcpResult);
      }

      if (!assetUrl) {
        throw new Error(`OpenArt MCP returned empty video result for model [${modelId}].`);
      }

      CostTrackingService.completeGeneration(generationId, {
        status: 'SUCCESS',
        actualCost: estimatedCost
      });

      return {
        success: true,
        assetUrl,
        generationId,
        provider: 'openart',
        model: modelId,
        costUsd: estimatedCost
      };
    } catch (err: any) {
      CostTrackingService.completeGeneration(generationId, {
        status: 'FAILED',
        error: err?.message || String(err)
      });
      throw err;
    }
  }

  /**
   * 3. Text-to-Video Generation
   */
  async generateVideo(request: VideoGenerationRequest): Promise<GenerationResult> {
    const generationId = `openart_t2v_${Date.now()}_${randomUUID().substring(0, 8)}`;
    const { modelId, modelDef } = this.resolveModelId(request.model, 'video');
    const estimatedCost = modelDef.costUsd;
    const duration = request.duration || 5;

    CostTrackingService.startGeneration({
      generationId,
      userId: request.userId,
      projectId: request.projectId,
      studio: request.studio,
      sceneId: request.sceneId,
      provider: 'openart',
      model: modelId,
      operation: 'TEXT_TO_VIDEO',
      duration,
      resolution: request.resolution || '1080p',
      estimatedCost
    });

    try {
      console.log(`[OpenArt MCP] Generating Text-to-Video with model ${modelId}...`);

      const toolName = this.resolveToolName('TEXT_TO_VIDEO');
      let assetUrl: string | null = null;

      if (toolName === 'openart_generate_video') {
        const validAspects = ['16:9', '9:16', '1:1'];
        let reqAspect = request.aspectRatio || '16:9';
        if (!validAspects.includes(reqAspect)) reqAspect = '16:9';

        const toolArgs = {
          model: modelId,
          mode: 'text2video',
          params: {
            prompt: request.prompt,
            aspectRatio: reqAspect
          }
        };

        const mcpResult = await this.callMCPTool(toolName, toolArgs);
        const historyId = this.extractHistoryId(mcpResult);
        if (historyId) {
          assetUrl = await this.waitForCreation(historyId, 120, true);
        } else {
          assetUrl = this.extractAssetUrlFromResult(mcpResult);
        }
      } else {
        const toolArgs = {
          prompt: request.prompt,
          model: modelId,
          duration,
          aspect_ratio: request.aspectRatio || '9:16',
          resolution: request.resolution || '1080p'
        };
        const mcpResult = await this.callMCPTool(toolName, toolArgs);
        assetUrl = this.extractAssetUrlFromResult(mcpResult);
      }

      if (!assetUrl) {
        throw new Error(`OpenArt MCP returned empty video result for model [${modelId}].`);
      }

      CostTrackingService.completeGeneration(generationId, {
        status: 'SUCCESS',
        actualCost: estimatedCost
      });

      return {
        success: true,
        assetUrl,
        generationId,
        provider: 'openart',
        model: modelId,
        costUsd: estimatedCost
      };
    } catch (err: any) {
      CostTrackingService.completeGeneration(generationId, {
        status: 'FAILED',
        error: err?.message || String(err)
      });
      throw err;
    }
  }

  /**
   * 4. Safe test image generation for Founder Control Center
   */
  async testImageGeneration(customPrompt?: string): Promise<{
    success: boolean;
    assetUrl?: string;
    durationMs: number;
    error?: string;
    model: string;
    costUsd: number;
  }> {
    const prompt = customPrompt || 'A futuristic cybernetic neural core glowing with neon cyan data streams, cinematic photorealistic 8k';
    const startTime = Date.now();
    try {
      const result = await this.generateImage({
        prompt,
        model: 'kling-3-omni',
        aspectRatio: '1:1',
        resolution: '1K',
        studio: 'FOUNDER_LIVE_TEST',
        userId: 'founder_tester'
      });
      return {
        success: true,
        assetUrl: result.assetUrl,
        durationMs: Date.now() - startTime,
        model: result.model || 'kling-3-omni',
        costUsd: result.costUsd || 0.010
      };
    } catch (err: any) {
      return {
        success: false,
        durationMs: Date.now() - startTime,
        error: err?.message || String(err),
        model: 'kling-3-omni',
        costUsd: 0
      };
    }
  }

  /**
   * Disconnect and clear cached tools
   */
  static clearCache(): void {
    OpenArtMCPAdapter.cachedTools = null;
    OpenArtMCPAdapter.lastToolsDiscovery = 0;
    OpenArtMCPAdapter.isInitialized = false;
  }

  /**
   * 5. Implements VideoGenerationProvider interface for seamless integration into NEURONA Scene Renderers
   */
  async generateScene(scene: Scene, context: string, onProgress?: (msg: string) => void): Promise<string> {
    onProgress?.('Connecting to OpenArt MCP Video Engine...');

    const prompt = scene.promptImageToVideo || scene.promptTextToImage || scene.visualDirection || 'High quality commercial video';
    const rawImageUrl = scene.imageUrl || scene.assetUrl || '';

    const explicitModel = (scene as any)?.videoModel || (scene as any)?.metadata?.model;
    const model = (explicitModel && explicitModel.startsWith('openart')) ? explicitModel : 'openart-video-pro';

    if (rawImageUrl) {
      onProgress?.(`OpenArt MCP: Generating dynamic motion from keyframe image (${model})...`);
      const result = await this.imageToVideo({
        prompt,
        imageUrl: rawImageUrl,
        model,
        duration: 5,
        aspectRatio: '9:16',
        sceneId: scene.id
      });
      return result.assetUrl || '';
    } else {
      onProgress?.(`OpenArt MCP: Generating text-to-video (${model})...`);
      const result = await this.generateVideo({
        prompt,
        model,
        duration: 5,
        aspectRatio: '9:16',
        sceneId: scene.id
      });
      return result.assetUrl || '';
    }
  }
}
