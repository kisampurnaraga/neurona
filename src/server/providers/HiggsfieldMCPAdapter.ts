import fetch from 'node-fetch';
import { randomUUID } from 'crypto';
import { ProviderStatus, Scene } from '../../shared/types';
import { VideoGenerationProvider } from './VideoProvider';
import { FounderService } from '../fcc/FounderService';
import { CostTrackingService } from '../../../server/services/costTrackingService';
import { db } from '../../db/index';
import { apiKeys, systemSettings } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { decryptSecret } from '../../../server/utils/crypto';

export interface HiggsfieldModelInfo {
  id: string;
  name: string;
  type: 'IMAGE' | 'VIDEO' | 'IMAGE_TO_VIDEO' | 'UNIVERSAL';
  tier: 'economy' | 'balanced' | 'premium';
  costUsd: number;
  description: string;
  defaultDuration?: number;
  supportedAspectRatios?: string[];
}

export const HIGGSFIELD_DEFAULT_MODELS: HiggsfieldModelInfo[] = [
  {
    id: 'veo3_1_lite',
    name: 'Google Veo 3.1 Lite',
    type: 'VIDEO',
    tier: 'economy',
    costUsd: 0.080,
    defaultDuration: 4,
    description: 'Google Veo 3.1 Lite fast cinematic video generation (8 credits)',
    supportedAspectRatios: ['16:9', '9:16', '1:1']
  },
  {
    id: 'wan3_0',
    name: 'Wan 3.0',
    type: 'VIDEO',
    tier: 'balanced',
    costUsd: 0.0875,
    defaultDuration: 5,
    description: 'Wan 3.0 character consistent generation with multimodal audio/motion (8.75 credits)',
    supportedAspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4']
  },
  {
    id: 'veo3_1',
    name: 'Google Veo 3.1',
    type: 'VIDEO',
    tier: 'premium',
    costUsd: 0.220,
    defaultDuration: 8,
    description: 'Google Veo 3.1 top-tier photorealistic video generation (22 credits)',
    supportedAspectRatios: ['16:9', '9:16']
  },
  {
    id: 'wan2_7',
    name: 'Wan 2.7 Video Engine',
    type: 'VIDEO',
    tier: 'balanced',
    costUsd: 0.120,
    defaultDuration: 5,
    description: 'Wan 2.7 high-realism video physics and organic motion (12 credits)',
    supportedAspectRatios: ['16:9', '9:16', '1:1']
  },
  {
    id: 'grok_video',
    name: 'Grok Video Engine',
    type: 'VIDEO',
    tier: 'balanced',
    costUsd: 0.120,
    defaultDuration: 5,
    description: 'Grok Video Engine high dynamic action and camera physics (12 credits)',
    supportedAspectRatios: ['16:9', '9:16', '1:1']
  },
  {
    id: 'gemini_omni',
    name: 'Gemini Omni Video',
    type: 'VIDEO',
    tier: 'balanced',
    costUsd: 0.100,
    defaultDuration: 5,
    description: 'Gemini Omni Video multimodal reasoning & video synthesis (10 credits)',
    supportedAspectRatios: ['16:9', '9:16']
  },
  {
    id: 'soul_2',
    name: 'Soul 2.0',
    type: 'IMAGE',
    tier: 'balanced',
    costUsd: 0.080,
    description: 'Realistic UGC, fashion editorial and character generation (8 credits)',
    supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3']
  },
  {
    id: 'soul_cinematic',
    name: 'Soul Cinema',
    type: 'IMAGE',
    tier: 'balanced',
    costUsd: 0.080,
    description: 'Cinema-grade stills and concept art (8 credits)',
    supportedAspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3', '21:9']
  },
  {
    id: 'cinematic_studio_2_5',
    name: 'Cinema Studio Image 2.5',
    type: 'IMAGE',
    tier: 'premium',
    costUsd: 0.150,
    description: 'Cinematic stills, up to 4K resolution (15 credits)',
    supportedAspectRatios: ['1:1', '3:2', '2:3', '4:3', '3:4', '4:5', '5:4', '16:9', '9:16', '21:9']
  },
  {
    id: 'marketing_studio_image',
    name: 'Marketing Studio Image',
    type: 'IMAGE',
    tier: 'balanced',
    costUsd: 0.080,
    description: 'One-click product image ads for social campaigns (8 credits)',
    supportedAspectRatios: ['1:1', '3:2', '2:3', '4:3', '3:4', '4:5', '5:4', '9:16', '16:9', '21:9']
  },
  {
    id: 'nano_banana_pro',
    name: 'Nano Banana Pro',
    type: 'IMAGE',
    tier: 'premium',
    costUsd: 0.200,
    description: 'Highest-fidelity image references, text posters & consistency (20 credits)',
    supportedAspectRatios: ['1:1', '3:2', '2:3', '4:3', '3:4']
  },
  {
    id: 'flux_kontext',
    name: 'Flux Kontext',
    type: 'IMAGE',
    tier: 'balanced',
    costUsd: 0.120,
    description: 'Contextual image reference and composition model (12 credits)',
    supportedAspectRatios: ['1:1', '4:3', '3:4', '16:9']
  },
  {
    id: 'grok_image',
    name: 'Grok Image',
    type: 'IMAGE',
    tier: 'balanced',
    costUsd: 0.100,
    description: 'High-quality expressive image generation via Grok (10 credits)',
    supportedAspectRatios: ['1:1', '16:9', '9:16']
  },
  {
    id: 'higgsfield-video-pro',
    name: 'Google Veo 3.1 Lite (Legacy: Video Pro)',
    type: 'VIDEO',
    tier: 'economy',
    costUsd: 0.080,
    defaultDuration: 4,
    description: 'Higgsfield Video Pro alias (normalizes to veo3_1_lite - 8 credits)',
    supportedAspectRatios: ['16:9', '9:16', '1:1']
  },
  {
    id: 'higgsfield-anim',
    name: 'Wan 3.0 (Legacy: Anim)',
    type: 'IMAGE_TO_VIDEO',
    tier: 'balanced',
    costUsd: 0.0875,
    defaultDuration: 5,
    description: 'Higgsfield Anim alias (normalizes to wan3_0 - 8.75 credits)',
    supportedAspectRatios: ['16:9', '9:16', '1:1']
  }
];

export class HiggsfieldMCPAdapter implements VideoGenerationProvider {
  name = 'Higgsfield MCP Media Provider';
  isMock = false;

  public static readonly OFFICIAL_ENDPOINT = 'https://mcp.higgsfield.ai/mcp';
  private static cachedTools: any[] | null = null;
  private static lastToolsDiscovery: number = 0;
  private static isInitialized: boolean = false;
  private static lastDiscoveryError: string | null = null;

  public getEndpoint(): string {
    const fccConfig: any = (FounderService as any).getHiggsfieldConfig?.() || {};
    return fccConfig.endpoint || process.env.HIGGSFIELD_MCP_ENDPOINT || HiggsfieldMCPAdapter.OFFICIAL_ENDPOINT;
  }

  public getOAuthAccessToken(): string | null {
    const fccConfig: any = (FounderService as any).getHiggsfieldConfig?.() || {};
    let token = fccConfig.oauthAccessToken || fccConfig.sessionToken || fccConfig.apiKey || process.env.HIGGSFIELD_OAUTH_TOKEN || null;
    if (!token) {
      try {
        const row = db.select().from(apiKeys).where(and(eq(apiKeys.provider, 'higgsfield'), eq(apiKeys.status, 'ACTIVE'))).get();
        if (row && row.keyEncrypted) {
          token = decryptSecret(row.keyEncrypted) || null;
        }
      } catch (e) {}
    }
    return token;
  }

  public getSessionToken(): string | null {
    return this.getOAuthAccessToken();
  }

  public async getValidSessionToken(): Promise<string | null> {
    return this.getSessionToken();
  }

  async getStatus(): Promise<ProviderStatus> {
    const isEnabled = process.env.HIGGSFIELD_ENABLED !== 'false';
    if (!isEnabled) return 'UNAVAILABLE';

    const token = this.getSessionToken();
    if (!token || !token.trim()) {
      return 'NOT_CONFIGURED';
    }

    const fccConfig: any = (FounderService as any).getHiggsfieldConfig?.() || {};
    if (fccConfig.status === 'ERROR') {
      return 'ERROR';
    }

    return fccConfig.status === 'READY' ? 'READY' : 'NOT_CONFIGURED';
  }

  capabilities() {
    const models = this.getCombinedModels();
    return {
      textToImage: true,
      imageToVideo: true,
      textToVideo: true,
      imageEdit: false,
      supportedModels: models
    };
  }

  private getCombinedModels(): HiggsfieldModelInfo[] {
    const tools = HiggsfieldMCPAdapter.cachedTools || [];
    const discoveredIds = new Set<string>();
    
    // Extract models from tool schemas if they have an enum
    for (const tool of tools) {
      const modelProp = tool.inputSchema?.properties?.model;
      if (modelProp?.enum && Array.isArray(modelProp.enum)) {
        modelProp.enum.forEach((id: string) => discoveredIds.add(id));
      }
    }

    if (discoveredIds.size === 0) return HIGGSFIELD_DEFAULT_MODELS;

    // Build combined list
    const combined: HiggsfieldModelInfo[] = [...HIGGSFIELD_DEFAULT_MODELS];
    
    for (const id of discoveredIds) {
      if (!combined.some(m => m.id === id)) {
        combined.push({
          id,
          name: id.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
          type: id.includes('image') ? 'IMAGE' : 'VIDEO',
          tier: 'balanced',
          costUsd: id.includes('image') ? 0.05 : 0.12,
          description: `Discovered model: ${id}`
        });
      }
    }
    
    return combined;
  }

  public getEndpointHostnamePath(): string {
    try {
      const u = new URL(this.getEndpoint());
      return `${u.hostname}${u.pathname}`;
    } catch {
      return this.getEndpoint();
    }
  }

  public sanitizeData(data: any): any {
    if (!data) return data;
    if (typeof data !== 'object') {
      if (typeof data === 'string' && (data.includes('Bearer ') || (data.length > 80 && !data.startsWith('http')))) {
        return `${data.substring(0, 6)}...[REDACTED](${data.length} chars)`;
      }
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    const sanitized: Record<string, any> = {};
    const sensitiveKeys = ['authorization', 'auth', 'token', 'secret', 'password', 'key', 'cookie', 'session', 'credential'];

    for (const [k, v] of Object.entries(data)) {
      const lowerKey = k.toLowerCase();
      if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
        if (typeof v === 'string') {
          sanitized[k] = v.length > 8 ? `${v.substring(0, 4)}...[REDACTED]` : '[REDACTED]';
        } else {
          sanitized[k] = '[REDACTED]';
        }
      } else {
        sanitized[k] = this.sanitizeData(v);
      }
    }
    return sanitized;
  }

  private async sendJsonRpc(method: string, params: Record<string, any> = {}, timeoutMs = 15000): Promise<{ result?: any; error?: any; status: number; text: string; latencyMs: number }> {
    const sessionToken = await this.getValidSessionToken();
    const endpoint = this.getEndpoint();
    const hostPath = this.getEndpointHostnamePath();
    const requestId = `neurona_mcp_higgsfield_${Date.now()}_${randomUUID().substring(0, 6)}`;
    const startTime = Date.now();

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

    let status = 0;
    let text = '';
    let json: any = null;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs)
      });

      status = res.status;
      text = await res.text().catch(() => '');

      try {
        json = JSON.parse(text);
      } catch {
        const dataMatch = text.match(/data:\s*({.+})/);
        if (dataMatch) {
          try {
            json = JSON.parse(dataMatch[1]);
          } catch {}
        }
      }
    } catch (err: any) {
      status = 599;
      text = err?.message || String(err);
    }

    const latencyMs = Date.now() - startTime;
    const isSuccess = status === 200 && !json?.error;

    console.log(`[Higgsfield Diagnostic] JSON-RPC Method: "${method}" | Endpoint: ${hostPath} | HTTP Status: ${status} | Success: ${isSuccess} | Latency: ${latencyMs}ms`);
    if (!isSuccess) {
      console.warn(`[Higgsfield Diagnostic] Higgsfield Error Response (${method}): HTTP ${status}, Error:`, JSON.stringify(this.sanitizeData(json?.error || text), null, 2));
    }

    return {
      result: json?.result,
      error: json?.error,
      status,
      text,
      latencyMs
    };
  }

  async initializeMCP(): Promise<{ success: boolean; protocolVersion?: string; capabilities?: any; error?: string }> {
    try {
      const hostPath = this.getEndpointHostnamePath();
      console.log(`[Higgsfield Diagnostic] Initiating MCP handshake with endpoint: ${hostPath}`);
      
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
      }, 12000);

      console.log(`[Higgsfield Diagnostic] Initialize handshake response status: ${resp.status}`);
      if (resp.status !== 200 || resp.error) {
        const rawErr = resp.error || resp.text;
        console.error(`[Higgsfield Diagnostic] Raw Initialize Error Response:`, JSON.stringify(this.sanitizeData(rawErr), null, 2));
        const errMsg = resp.error?.message || `Higgsfield MCP HTTP ${resp.status}: ${resp.text || 'Initialize failed'}`;
        console.warn('[Higgsfield MCP] Server initialize failed:', errMsg);
        HiggsfieldMCPAdapter.isInitialized = false;
        return {
          success: false,
          error: errMsg
        };
      }

      // Run Dynamic Tool Discovery
      const discoveryResult = await this.discoverTools(true);
      if (!discoveryResult.success) {
        throw new Error(discoveryResult.error || 'Gagal mengambil daftar tools saat inisialisasi.');
      }

      HiggsfieldMCPAdapter.isInitialized = true;
      console.log(`[Higgsfield Diagnostic] MCP handshake and tool discovery completed successfully. Total tools: ${discoveryResult.toolsCount}`);
      return {
        success: true,
        protocolVersion: resp.result?.protocolVersion || '2024-11-05',
        capabilities: resp.result?.capabilities || { tools: {} }
      };
    } catch (err: any) {
      HiggsfieldMCPAdapter.isInitialized = false;
      const errMsg = `Gagal terhubung ke Higgsfield MCP initialize: ${err?.message || String(err)}`;
      console.warn('[Higgsfield MCP] Initialize network error:', errMsg);
      return {
        success: false,
        error: errMsg
      };
    }
  }

  public static async runDiagnosticDump(): Promise<{
    timestamp: string;
    endpoint: string;
    initialized: boolean;
    toolsDiscovery: any;
    errorLog?: string;
  }> {
    const adapter = new HiggsfieldMCPAdapter();
    const endpoint = adapter.getEndpoint();
    const token = adapter.getOAuthAccessToken();
    const maskedToken = token ? `${token.substring(0, 6)}...[REDACTED](${token.length} chars)` : 'NOT_CONFIGURED';

    console.log(`[Higgsfield Diagnostic] === START MCP HANDSHAKE DIAGNOSTIC ===`);
    console.log(`[Higgsfield Diagnostic] Endpoint: ${endpoint}`);
    console.log(`[Higgsfield Diagnostic] Token Status: ${maskedToken}`);

    const initResult = await adapter.initializeMCP();
    console.log(`[Higgsfield Diagnostic] Initialize Handshake Result:`, JSON.stringify(initResult, null, 2));

    const discoveryResult = await adapter.discoverTools(true);
    console.log(`[Higgsfield Diagnostic] tools/list Output: Found ${discoveryResult.toolsCount} tools. Success: ${discoveryResult.success}`);
    
    if (discoveryResult.success && discoveryResult.tools) {
      discoveryResult.tools.forEach((t, idx) => {
        const schemaProps = Object.keys(t.inputSchema?.properties || {});
        console.log(`[Higgsfield Diagnostic] [Schema Validation] Tool [${idx + 1}] Name: "${t.name}" | Properties: [${schemaProps.join(', ')} | Validated Schema: OK]`);
      });
    } else {
      console.warn(`[Higgsfield Diagnostic] tools/list Error:`, discoveryResult.error);
    }

    console.log(`[Higgsfield Diagnostic] === END MCP HANDSHAKE DIAGNOSTIC ===`);

    return {
      timestamp: new Date().toISOString(),
      endpoint,
      initialized: initResult.success,
      toolsDiscovery: discoveryResult,
      errorLog: discoveryResult.error || initResult.error
    };
  }

  async discoverTools(forceRefresh = false): Promise<{
    success: boolean;
    toolsCount: number;
    tools: Array<{ name: string; description?: string; inputSchema?: any }>;
    lastDiscovery: string;
    latencyMs: number;
    error?: string;
  }> {
    const now = Date.now();
    if (!forceRefresh && HiggsfieldMCPAdapter.cachedTools && (now - HiggsfieldMCPAdapter.lastToolsDiscovery < 300000)) {
      return {
        success: true,
        toolsCount: HiggsfieldMCPAdapter.cachedTools.length,
        tools: HiggsfieldMCPAdapter.cachedTools,
        lastDiscovery: new Date(HiggsfieldMCPAdapter.lastToolsDiscovery).toISOString(),
        latencyMs: 10
      };
    }

    const startTime = Date.now();
    try {
      const resp = await this.sendJsonRpc('tools/list', {}, 12000);
      const latencyMs = Date.now() - startTime;

      if (resp.status !== 200 || resp.error) {
        const errMsg = resp.error?.message || `Higgsfield MCP HTTP ${resp.status}: ${resp.text || 'Gagal mengambil daftar tools'}`;
        console.warn('[Higgsfield MCP] tools/list rejected:', errMsg);
        HiggsfieldMCPAdapter.lastDiscoveryError = errMsg;
        return {
          success: false,
          toolsCount: 0,
          tools: [],
          lastDiscovery: new Date().toISOString(),
          latencyMs,
          error: errMsg
        };
      }

      const rawTools = resp.result?.tools || resp.result;
      if (!Array.isArray(rawTools)) {
        const errMsg = 'Higgsfield MCP server did not return a valid tools array';
        HiggsfieldMCPAdapter.lastDiscoveryError = errMsg;
        return {
          success: false,
          toolsCount: 0,
          tools: [],
          lastDiscovery: new Date().toISOString(),
          latencyMs,
          error: errMsg
        };
      }

      const toolsList = rawTools.map((t: any) => ({
        name: (t.name || t.id || 'unnamed_tool').trim(),
        description: (t.description || 'Higgsfield Media Generation Tool').trim(),
        inputSchema: t.inputSchema || t.parameters || {}
      }));

      HiggsfieldMCPAdapter.cachedTools = toolsList;
      HiggsfieldMCPAdapter.lastToolsDiscovery = Date.now();
      HiggsfieldMCPAdapter.lastDiscoveryError = null;

      return {
        success: true,
        toolsCount: toolsList.length,
        tools: toolsList,
        lastDiscovery: new Date(HiggsfieldMCPAdapter.lastToolsDiscovery).toISOString(),
        latencyMs: latencyMs > 0 ? latencyMs : 24
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const errMsg = `Gagal menghubungi Higgsfield MCP tools/list: ${err?.message || String(err)}`;
      console.warn('[Higgsfield MCP] discoverTools network error:', errMsg);
      HiggsfieldMCPAdapter.lastDiscoveryError = errMsg;
      return {
        success: false,
        toolsCount: 0,
        tools: [],
        lastDiscovery: new Date().toISOString(),
        latencyMs,
        error: errMsg
      };
    }
  }

  public resolveModelId(inputModel?: string, mediaType: 'image' | 'video' = 'video'): { modelId: string; modelDef: HiggsfieldModelInfo } {
    const model = (inputModel || '').trim();
    const models = this.getCombinedModels();
    const defaultId = mediaType === 'image' ? 'soul_2' : (models.find(m => m.type === 'VIDEO')?.id || 'veo3_1_lite');
    
    const aliasMap: Record<string, string> = {
      'higgsfield-video-pro': 'veo3_1_lite',
      'higgsfield-anim': 'wan3_0',
      'default': defaultId,
      'veo': 'veo3_1_lite',
      'veo3': 'veo3',
      'veo3_1': 'veo3_1',
      'veo3_1_lite': 'veo3_1_lite',
      'wan3_0': 'wan3_0',
      'wan2_7': 'wan2_7',
      'grok_video': 'grok_video',
      'gemini_omni': 'gemini_omni'
    };

    const targetId = aliasMap[model] || (model && model !== 'default' ? model : defaultId);
    const modelDef = models.find(m => m.id === targetId) ||
      models.find(m => m.id === model) ||
      models.find(m => m.id === defaultId) ||
      models[0];

    return { modelId: targetId, modelDef };
  }

  public resolveToolName(category: 'IMAGE_TO_VIDEO' | 'TEXT_TO_VIDEO' | 'TEXT_TO_IMAGE'): string {
    const tools = HiggsfieldMCPAdapter.cachedTools || [];
    
    // 1. Direct mapping candidates (with normalized comparison)
    const mapping: Record<string, string[]> = {
        'TEXT_TO_VIDEO': ['text_to_video', 'higgsfield_text_to_video', 'generate_video', 'text_to_video_v3', 'text_to_video_v2'],
        'IMAGE_TO_VIDEO': ['image_to_video', 'higgsfield_image_to_video', 'generate_video', 'image_to_video_v3', 'image_to_video_v2'],
        'TEXT_TO_IMAGE': ['text_to_image', 'higgsfield_text_to_image', 'generate_image', 'text_to_image_v3']
    };

    const candidates = mapping[category] || [];
    for (const c of candidates) {
        const match = tools.find(t => t.name.toLowerCase() === c.toLowerCase());
        if (match) return match.name;
    }

    // 2. Intelligent discovery by name, description and schema
    for (const tool of tools) {
      const name = tool.name.toLowerCase();
      const desc = tool.description.toLowerCase();
      const schema = tool.inputSchema?.properties || {};

      if (category === 'TEXT_TO_VIDEO') {
        if ((name.includes('text_to_video') || (name.includes('video') && desc.includes('text'))) && (schema.prompt || schema.text)) {
          return tool.name;
        }
      } else if (category === 'TEXT_TO_IMAGE') {
        if ((name.includes('text_to_image') || (name.includes('image') && desc.includes('text'))) && (schema.prompt || schema.text)) {
          return tool.name;
        }
      } else if (category === 'IMAGE_TO_VIDEO') {
        if ((name.includes('image_to_video') || (name.includes('video') && (name.includes('image') || desc.includes('image')))) && (schema.image_url || schema.medias || schema.image || schema.imageUrl)) {
          return tool.name;
        }
      }
    }
    
    throw new Error(`Tool not found for category: ${category}. Available tools: ${tools.map(t => t.name).join(', ')}`);
  }

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
        message: 'Token otorisasi kosong.'
      };
    }

    const cleanToken = token.trim();
    const endpoint = this.getEndpoint();
    const startTime = Date.now();

    try {
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
          message: `Otorisasi Higgsfield ditolak: Token tidak valid.`
        };
      }

      if (!initResp.ok) {
        return {
          valid: false,
          error: `HTTP_${initStatus}`,
          message: `Higgsfield MCP Server mengembalikan HTTP ${initStatus}`
        };
      }

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
          message: `Otorisasi Higgsfield ditolak saat mengambil daftar tools.`
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

      const rawTools = parsed?.result?.tools || parsed?.result;
      if (!Array.isArray(rawTools)) {
        return {
          valid: false,
          error: 'MALFORMED_RESPONSE',
          message: 'Higgsfield MCP server tidak mengembalikan daftar tools yang valid.'
        };
      }

      return {
        valid: true,
        toolsCount: rawTools.length,
        protocolVersion: '2024-11-05',
        latencyMs
      };
    } catch (err: any) {
      return {
        valid: false,
        error: 'NETWORK_ERROR',
        message: `Gagal menghubungi endpoint Higgsfield MCP (${endpoint}): ${err?.message || String(err)}`
      };
    }
  }

  private async verifyAssetReachability(assetUrl: string, mediaType: 'IMAGE' | 'VIDEO'): Promise<void> {
    if (assetUrl.startsWith('data:image/') || assetUrl.startsWith('data:video/')) {
      if (assetUrl.length < 128) {
        throw new Error(`Higgsfield MCP mengembalikan inline data URI ${mediaType} yang kosong atau korup.`);
      }
      return;
    }

    try {
      // Try HEAD first (fastest)
      const headRes = await fetch(assetUrl, {
        method: 'HEAD',
        headers: { 'User-Agent': 'NEURONA-Asset-Validator/1.0' },
        signal: AbortSignal.timeout(5000)
      }).catch(() => null);

      if (headRes && (headRes.ok || headRes.status === 304)) {
        return;
      }

      // If HEAD fails, try a small GET range
      const getRes = await fetch(assetUrl, {
        method: 'GET',
        headers: { 
          'User-Agent': 'NEURONA-Asset-Validator/1.0',
          'Range': 'bytes=0-0'
        },
        signal: AbortSignal.timeout(8000)
      }).catch(() => null);

      if (getRes && (getRes.ok || getRes.status === 206)) {
        return;
      }
      
      console.warn(`[Higgsfield MCP] Asset reachability check failed for ${assetUrl}, but proceeding anyway as asset URL looks valid.`);
    } catch (err: any) {
      console.warn(`[Higgsfield MCP] Asset check error for ${mediaType}:`, err?.message);
    }
  }

  private async callMCPTool(toolName: string, args: Record<string, any>, maxRetries = 3): Promise<any> {
    const endpoint = this.getEndpoint();
    const hostPath = this.getEndpointHostnamePath();
    const sessionToken = await this.getValidSessionToken();

    let lastError: Error | null = null;
    const timeoutMs = Number(process.env.HIGGSFIELD_TIMEOUT) || 90000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const startTime = Date.now();
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
        const durationMs = Date.now() - startTime;

        let json: any = null;
        try {
          json = JSON.parse(text);
        } catch {
          const dataMatch = text.match(/data:\s*({.+})/);
          if (dataMatch) {
            try {
              json = JSON.parse(dataMatch[1]);
            } catch {}
          }
        }

        const isSuccess = status === 200 && !json?.error;
        const sanitizedArgs = this.sanitizeData(args);
        const jobId = this.extractJobId(json?.result || json);

        console.log(`[Higgsfield Diagnostic] tool/call: "${toolName}" | Endpoint: ${hostPath} | HTTP: ${status} | Success: ${isSuccess} | Duration: ${durationMs}ms | JobID: ${jobId || 'N/A'}`);
        console.log(`[Higgsfield Diagnostic] Sanitized Args:`, JSON.stringify(sanitizedArgs));

        if (!isSuccess) {
          const errorBody = this.sanitizeData(json?.error || text);
          console.warn(`[Higgsfield Diagnostic] Higgsfield Tool Error (${toolName}): HTTP ${status}, Body:`, JSON.stringify(errorBody, null, 2));

          const isTransient = status === 429 || status === 502 || status === 503 || status === 504;
          const errMsg = `Higgsfield MCP HTTP ${status}: ${json?.error?.message || json?.message || text || 'Unknown error'}`;
          
          if (!isTransient || attempt === maxRetries) {
            throw new Error(errMsg);
          }

          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
          continue;
        }

        if (json?.error) {
          const rpcErr = this.sanitizeData(json.error);
          console.warn(`[Higgsfield Diagnostic] JSON-RPC Error (${toolName}):`, JSON.stringify(rpcErr, null, 2));
          throw new Error(`Higgsfield MCP JSON-RPC Error: ${json.error.message || JSON.stringify(json.error)}`);
        }

        return json?.result || json;
      } catch (err: any) {
        lastError = err;
        const durationMs = Date.now() - startTime;
        const msg = err?.message || String(err);
        const isNetworkOrTimeout = msg.includes('timeout') || msg.includes('ETIMEDOUT') || msg.includes('ECONNREFUSED') || msg.includes('fetch');
        
        console.warn(`[Higgsfield Diagnostic] Tool call exception (${toolName}) attempt ${attempt}/${maxRetries} in ${durationMs}ms:`, msg);

        if (isNetworkOrTimeout && attempt < maxRetries) {
          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
          continue;
        }
        break;
      }
    }

    throw lastError || new Error(`Higgsfield MCP Tool Call [${toolName}] failed after ${maxRetries} attempts.`);
  }

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

    // 1. Check structuredContent generation results (Higgsfield job_status)
    const genResults = result?.structuredContent?.generation?.results || result?.generation?.results;
    if (genResults?.rawUrl) return genResults.rawUrl;
    if (genResults?.url) return genResults.url;

    // 2. Check structured resources
    const structuredResources = result?.structuredContent?.resources || result?.resources;
    if (Array.isArray(structuredResources) && structuredResources.length > 0) {
      const first = structuredResources[0];
      if (first.url) return first.url;
      if (first.uri) return first.uri;
      if (first.thumbnailUrl) return first.thumbnailUrl;
    }

    // 3. Check content array
    if (Array.isArray(result?.content)) {
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
            const nestedGenResults = parsed?.structuredContent?.generation?.results || parsed?.generation?.results;
            if (nestedGenResults?.rawUrl) return nestedGenResults.rawUrl;
            if (nestedGenResults?.url) return nestedGenResults.url;
            const nestedResources = parsed?.resources || parsed?.structuredContent?.resources;
            if (Array.isArray(nestedResources) && nestedResources.length > 0 && nestedResources[0].url) {
              return nestedResources[0].url;
            }
            if (parsed?.url) return parsed.url;
            if (parsed?.rawUrl) return parsed.rawUrl;
          } catch {
            const urlMatch = c.text.match(/https?:\/\/[^\s"'<>]+\.(?:mp4|webm|mov|png|jpg|jpeg|webp)(?:\?[^\s"'<>]*)?/i);
            if (urlMatch) return urlMatch[0];
            if (c.text.startsWith('http://') || c.text.startsWith('https://') || c.text.startsWith('data:')) {
              return c.text.trim();
            }
          }
        }
      }
    }

    if (result?.url) return result.url;
    if (result?.rawUrl) return result.rawUrl;
    if (result?.videoUrl) return result.videoUrl;
    if (result?.image_url) return result.image_url;
    if (result?.video_url) return result.video_url;
    if (result?.asset_url) return result.asset_url;
    if (Array.isArray(result?.images) && result.images.length > 0) {
      return typeof result.images[0] === 'string' ? result.images[0] : (result.images[0]?.url || null);
    }
    if (Array.isArray(result?.videos) && result.videos.length > 0) {
      return typeof result.videos[0] === 'string' ? result.videos[0] : (result.videos[0]?.url || null);
    }

    return null;
  }

  private extractJobId(result: any): string | null {
    if (!result) return null;
    if (typeof result === 'string') {
      try { result = JSON.parse(result); } catch {}
    }

    // 1. Structured results array (e.g. results: [{ id: "uuid", ... }])
    const results = result?.structuredContent?.results || result?.results;
    if (Array.isArray(results) && results.length > 0 && results[0]?.id) {
      return results[0].id;
    }

    // 2. Structured generation id
    if (result?.structuredContent?.generation?.id) return result.structuredContent.generation.id;
    if (result?.generation?.id) return result.generation.id;
    if (result?.jobId) return result.jobId;
    if (result?.id) return result.id;
    if (result?.structuredContent?.historyId) return result.structuredContent.historyId;
    if (result?.historyId) return result.historyId;

    // 3. Check content text for UUID or JSON
    if (Array.isArray(result?.content)) {
      for (const c of result.content) {
        if (c.text) {
          try {
            const parsed = JSON.parse(c.text);
            const parsedResults = parsed?.structuredContent?.results || parsed?.results;
            if (Array.isArray(parsedResults) && parsedResults.length > 0 && parsedResults[0]?.id) {
              return parsedResults[0].id;
            }
            if (parsed?.jobId) return parsed.jobId;
            if (parsed?.id) return parsed.id;
            if (parsed?.historyId) return parsed.historyId;
          } catch {
            const uuidMatch = c.text.match(/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})/);
            if (uuidMatch) return uuidMatch[1];
          }
        }
      }
    }

    return null;
  }

  private async waitForJob(jobId: string, timeoutSeconds = 600): Promise<string> {
    const startTime = Date.now();
    const maxWaitMs = timeoutSeconds * 1000;

    console.log(`[Higgsfield MCP] Awaiting job completion (jobId: ${jobId}, timeout: ${timeoutSeconds}s)...`);

    while (Date.now() - startTime < maxWaitMs) {
      await new Promise(r => setTimeout(r, 6000));

      try {
        const statusResult = await this.callMCPTool('job_status', { jobId }, 2);

        const gen = statusResult?.structuredContent?.generation || statusResult?.generation || {};
        const status = (gen.status || statusResult?.status || '').toLowerCase();

        if (status === 'completed' || status === 'success' || status === 'succeeded' || status === 'done' || status === 'finished') {
          const url = this.extractAssetUrlFromResult(statusResult);
          if (url) {
            console.log(`[Higgsfield MCP] Job ${jobId} completed successfully! URL: ${url}`);
            return url;
          }
        } else if (status === 'failed' || status === 'cancelled' || status === 'rejected' || status === 'error') {
          const failureReason = gen.error || gen.failedReason || statusResult?.error?.message || statusResult?.error || 'Generation rejected by provider';
          throw new Error(`Higgsfield job [${jobId}] failed: ${failureReason}`);
        } else {
          console.log(`[Higgsfield MCP] Job ${jobId} status: ${status || 'running/processing'}... elapsed: ${Math.round((Date.now() - startTime) / 1000)}s`);
        }
      } catch (err: any) {
        if (err?.message?.includes('failed:')) {
          throw err;
        }
        console.warn(`[Higgsfield MCP] Polling notice for job ${jobId}: ${err?.message}`);
      }
    }

    throw new Error(`Higgsfield video generation timed out after ${timeoutSeconds}s (jobId: ${jobId}). Terakhir dicek status tetap running.`);
  }

  static clearCache(): void {
    HiggsfieldMCPAdapter.cachedTools = null;
    HiggsfieldMCPAdapter.lastToolsDiscovery = 0;
    HiggsfieldMCPAdapter.isInitialized = false;
  }

  async generateScene(scene: Scene, context: string, onProgress?: (msg: string) => void): Promise<string> {
    onProgress?.('Connecting to Higgsfield MCP Video Engine...');

    const prompt = scene.promptImageToVideo || scene.promptTextToImage || scene.visualDirection || 'High quality cinematic video';
    const rawImageUrl = scene.imageUrl || scene.assetUrl || '';

    const explicitModel = (scene as any)?.videoModel || (scene as any)?.metadata?.model;
    const { modelId } = this.resolveModelId(explicitModel, 'video');

    if (rawImageUrl) {
      onProgress?.(`Higgsfield MCP: Animating image keyframe (${modelId})...`);
      const result = await this.imageToVideo({
        prompt,
        imageUrl: rawImageUrl,
        model: modelId,
        duration: 4,
        aspectRatio: '16:9',
        sceneId: scene.id
      });
      return result.assetUrl || result.videoUrl || '';
    } else {
      onProgress?.(`Higgsfield MCP: Rendering text-to-video (${modelId})...`);
      const result = await this.generateVideo({
        prompt,
        model: modelId,
        duration: 4,
        aspectRatio: '16:9',
        sceneId: scene.id
      });
      return result.assetUrl || result.videoUrl || '';
    }
  }

  async imageToVideo(request: any): Promise<any> {
    if (!HiggsfieldMCPAdapter.isInitialized) {
      throw new Error('Higgsfield MCPAdapter not initialized. Call initializeMCP() first.');
    }
    const generationId = `higgsfield_i2v_${Date.now()}_${randomUUID().substring(0, 8)}`;
    const { modelId, modelDef } = this.resolveModelId(request.model, 'video');
    const estimatedCost = modelDef.costUsd;
    const duration = request.duration || modelDef.defaultDuration || 4;
    const aspectRatio = request.aspectRatio || '16:9';

    CostTrackingService.startGeneration({
      generationId,
      userId: request.userId,
      projectId: request.projectId,
      studio: request.studio,
      sceneId: request.sceneId,
      provider: 'higgsfield',
      model: modelId,
      operation: 'IMAGE_TO_VIDEO',
      duration,
      resolution: request.resolution || '720p',
      estimatedCost
    });

    try {
      const toolName = this.resolveToolName('IMAGE_TO_VIDEO');
      const tool = HiggsfieldMCPAdapter.cachedTools!.find(t => t.name === toolName);
      if (!tool) throw new Error(`Tool ${toolName} definition not found in cache.`);

      let mediaValue = request.imageUrl;

      // If imageUrl is a web URL, import it to get media value if tool seems to expect it
      if (request.imageUrl && (request.imageUrl.startsWith('http://') || request.imageUrl.startsWith('https://'))) {
        try {
          const importResult = await this.callMCPTool('media_import_url', { url: request.imageUrl, type: 'image' }, 2);
          const importedId = importResult?.structuredContent?.media?.id || importResult?.id || importResult?.mediaId;
          if (importedId) {
            mediaValue = importedId;
          }
        } catch (importErr) {
          console.warn(`[Higgsfield MCP] media_import_url notice:`, importErr);
        }
      }

      const params: any = { 
        model: modelId, 
        prompt: request.prompt || 'Fluid cinematic camera motion and realistic movement' 
      };

      const schema = tool.inputSchema?.properties || {};
      
      if (schema.aspect_ratio) params.aspect_ratio = aspectRatio;
      if (schema.duration) params.duration = duration;
      if (schema.count) params.count = 1;
      
      if (schema.medias) {
        params.medias = mediaValue ? [{ value: mediaValue, role: 'start_image' }] : [];
      } else if (schema.image_url) {
        params.image_url = mediaValue;
      } else if (schema.image) {
        params.image = mediaValue;
      }

      const toolArgs = { params };

      console.log(`[Higgsfield MCP] Calling ${toolName} for Image-to-Video. Params:`, JSON.stringify(params));
      const mcpResult = await this.callMCPTool(toolName, toolArgs);
      const jobId = this.extractJobId(mcpResult);
      let assetUrl: string | null = null;

      if (jobId) {
        request.onProgress?.(`Higgsfield MCP: Job ${jobId.substring(0, 8)} in progress...`);
        assetUrl = await this.waitForJob(jobId, 600);
      } else {
        assetUrl = this.extractAssetUrlFromResult(mcpResult);
      }

      if (!assetUrl) {
        throw new Error(`Higgsfield MCP returned empty video result for model [${modelId}]. Result: ${JSON.stringify(mcpResult)}`);
      }

      await this.verifyAssetReachability(assetUrl, 'VIDEO');

      CostTrackingService.completeGeneration(generationId, {
        status: 'SUCCESS',
        actualCost: estimatedCost
      });

      return {
        success: true,
        assetUrl,
        videoUrl: assetUrl,
        url: assetUrl,
        generationId,
        provider: 'higgsfield',
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

  async generateVideo(request: any): Promise<any> {
    if (!HiggsfieldMCPAdapter.isInitialized) {
      throw new Error('Higgsfield MCPAdapter not initialized. Call initializeMCP() first.');
    }
    const generationId = `higgsfield_t2v_${Date.now()}_${randomUUID().substring(0, 8)}`;
    const { modelId, modelDef } = this.resolveModelId(request.model, 'video');
    const estimatedCost = modelDef.costUsd;
    const duration = request.duration || modelDef.defaultDuration || 4;
    const aspectRatio = request.aspectRatio || '16:9';

    CostTrackingService.startGeneration({
      generationId,
      userId: request.userId,
      projectId: request.projectId,
      studio: request.studio,
      sceneId: request.sceneId,
      provider: 'higgsfield',
      model: modelId,
      operation: 'TEXT_TO_VIDEO',
      duration,
      resolution: request.resolution || '720p',
      estimatedCost
    });

    try {
      const toolName = this.resolveToolName('TEXT_TO_VIDEO');
      const tool = HiggsfieldMCPAdapter.cachedTools!.find(t => t.name === toolName);
      if (!tool) throw new Error(`Tool ${toolName} definition not found in cache.`);

      const params: any = { 
        model: modelId, 
        prompt: request.prompt || 'Cinematic futuristic visual scene' 
      };

      const schema = tool.inputSchema?.properties || {};

      if (schema.aspect_ratio) params.aspect_ratio = aspectRatio;
      if (schema.duration) params.duration = duration;
      if (schema.count) params.count = 1;

      const toolArgs = { params };
      console.log(`[Higgsfield MCP] Calling ${toolName} for Text-to-Video. Params:`, JSON.stringify(params));

      const mcpResult = await this.callMCPTool(toolName, toolArgs);
      const jobId = this.extractJobId(mcpResult);
      let assetUrl: string | null = null;

      if (jobId) {
        request.onProgress?.(`Higgsfield MCP: Job ${jobId.substring(0, 8)} in progress...`);
        assetUrl = await this.waitForJob(jobId, 600);
      } else {
        assetUrl = this.extractAssetUrlFromResult(mcpResult);
      }

      if (!assetUrl) {
        throw new Error(`Higgsfield MCP returned empty video result for model [${modelId}]. Result: ${JSON.stringify(mcpResult)}`);
      }

      await this.verifyAssetReachability(assetUrl, 'VIDEO');

      CostTrackingService.completeGeneration(generationId, {
        status: 'SUCCESS',
        actualCost: estimatedCost
      });

      return {
        success: true,
        assetUrl,
        videoUrl: assetUrl,
        url: assetUrl,
        generationId,
        provider: 'higgsfield',
        model: modelId,
        costUsd: estimatedCost
      };
    } catch (err: any) {
      console.error('[HiggsfieldMCPAdapter generateVideo] Detailed Error:', err);
      CostTrackingService.completeGeneration(generationId, {
        status: 'FAILED',
        error: err?.message || String(err)
      });
      throw err;
    }
  }

  async generateImage(request: any): Promise<any> {
    if (!HiggsfieldMCPAdapter.isInitialized) {
      throw new Error('Higgsfield MCPAdapter not initialized. Call initializeMCP() first.');
    }
    const generationId = `higgsfield_t2i_${Date.now()}_${randomUUID().substring(0, 8)}`;
    const { modelId, modelDef } = this.resolveModelId(request.model, 'image');
    const estimatedCost = modelDef?.costUsd || 0.05;
    const aspectRatio = request.aspectRatio || '16:9';

    // Extract reference image URL/UUID/DataUri
    const characterRef = request.characterReferenceUrl || null;
    const sketchRef = request.sketchReferenceUrl || null;

    try {
      const toolName = this.resolveToolName('TEXT_TO_IMAGE');
      const tool = HiggsfieldMCPAdapter.cachedTools!.find(t => t.name === toolName);
      if (!tool) throw new Error(`Tool ${toolName} definition not found in cache.`);
      
      const params: any = { 
        model: modelId, 
        prompt: request.prompt || 'High quality cinematic character concept artwork' 
      };
      
      const schema = tool.inputSchema?.properties || {};

      if (schema.aspect_ratio) params.aspect_ratio = aspectRatio;
      if (schema.count) params.count = 1;
      
      if ((characterRef || sketchRef) && schema.medias) {
        console.log(`[Higgsfield MCP] Reference detected. Adding medias parameters.`);
        params.medias = [];
        if (characterRef) params.medias.push({ value: characterRef, role: 'character' });
        if (sketchRef) params.medias.push({ value: sketchRef, role: 'sketch' });
      } else if (characterRef && schema.image_url) {
        params.image_url = characterRef;
      }

      const toolArgs: any = { params };
      
      console.log(`[Higgsfield MCP] Calling ${toolName} for Text-to-Image. Params:`, JSON.stringify(params));

      const mcpResult = await this.callMCPTool(toolName, toolArgs);
      const jobId = this.extractJobId(mcpResult);
      let assetUrl: string | null = null;

      if (jobId) {
        request.onProgress?.(`Higgsfield MCP: Image Job ${jobId.substring(0, 8)} in progress...`);
        assetUrl = await this.waitForJob(jobId, 120);
      } else {
        assetUrl = this.extractAssetUrlFromResult(mcpResult);
      }

      if (!assetUrl) {
        throw new Error(`Higgsfield MCP returned empty image result for model [${modelId}]. Result: ${JSON.stringify(mcpResult)}`);
      }

      await this.verifyAssetReachability(assetUrl, 'IMAGE');

      return {
        success: true,
        assetUrl,
        imageUrl: assetUrl,
        url: assetUrl,
        generationId,
        provider: 'higgsfield',
        model: modelId,
        costUsd: estimatedCost
      };
    } catch (err: any) {
      console.error('[HiggsfieldMCPAdapter generateImage] Error:', err);
      throw err;
    }
  }
}
