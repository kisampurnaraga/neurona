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
  private discoveredModels: HiggsfieldModelInfo[] = [];

  async discoverModels(): Promise<HiggsfieldModelInfo[]> {
    try {
      const response = await fetch(`${this.getEndpoint()}/models_explore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getSessionToken()}` },
        body: JSON.stringify({ action: 'list', limit: 100 })
      });
      const data = await response.json();
      if (data && data.models) {
          this.discoveredModels = data.models.map((m: any) => ({
            id: m.id,
            name: m.name,
            type: m.type === 'video' ? 'VIDEO' : 'IMAGE',
            tier: 'balanced',
            costUsd: 0.1,
            description: m.description,
            supportedAspectRatios: m.aspect_ratios || ['16:9', '9:16', '1:1']
          }));
      }
      return this.discoveredModels;
    } catch (e) {
      console.error('Discovery failed, falling back', e);
      return HIGGSFIELD_DEFAULT_MODELS;
    }
  }

  async initializeMCP() {
    await this.discoverModels();
    HiggsfieldMCPAdapter.isInitialized = true;
    return { success: true };
  }
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
    return {
      textToImage: true,
      imageToVideo: true,
      textToVideo: true,
      imageEdit: false,
      supportedModels: HIGGSFIELD_DEFAULT_MODELS
    };
  }

  private async sendJsonRpc(method: string, params: Record<string, any> = {}, timeoutMs = 15000): Promise<{ result?: any; error?: any; status: number; text: string }> {
    const sessionToken = await this.getValidSessionToken();
    const endpoint = this.getEndpoint();
    const requestId = `neurona_mcp_higgsfield_${Date.now()}_${randomUUID().substring(0, 6)}`;

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
      }, 12000);

      if (resp.status !== 200 || resp.error) {
        const errMsg = resp.error?.message || `Higgsfield MCP HTTP ${resp.status}: ${resp.text || 'Initialize failed'}`;
        console.warn('[Higgsfield MCP] Server initialize failed:', errMsg);
        HiggsfieldMCPAdapter.isInitialized = false;
        return {
          success: false,
          error: errMsg
        };
      }

      HiggsfieldMCPAdapter.isInitialized = true;
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
        name: t.name || t.id || 'unnamed_tool',
        description: t.description || 'Higgsfield Media Generation Tool',
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
    const defaultId = mediaType === 'image' ? 'soul_2' : 'veo3_1_lite';
    
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
    const modelDef = HIGGSFIELD_DEFAULT_MODELS.find(m => m.id === targetId) ||
      HIGGSFIELD_DEFAULT_MODELS.find(m => m.id === model) ||
      HIGGSFIELD_DEFAULT_MODELS.find(m => m.id === defaultId) ||
      HIGGSFIELD_DEFAULT_MODELS[0];

    return { modelId: targetId, modelDef };
  }

  public resolveToolName(category: 'IMAGE_TO_VIDEO' | 'TEXT_TO_VIDEO' | 'TEXT_TO_IMAGE'): string {
    const tools = HiggsfieldMCPAdapter.cachedTools || [];
    const findTool = (candidates: string[]) => {
      for (const c of candidates) {
        const match = tools.find(t => t.name === c);
        if (match) return match.name;
      }
      for (const c of candidates) {
        const match = tools.find(t => t.name.toLowerCase().includes(c.toLowerCase()));
        if (match) return match.name;
      }
      return null;
    };

    if (category === 'IMAGE_TO_VIDEO' || category === 'TEXT_TO_VIDEO') {
      const tool = findTool(['generate_video', 'higgsfield_generate_video', 'text_to_video', 'image_to_video']);
      return tool || 'generate_video';
    }

    if (category === 'TEXT_TO_IMAGE') {
      const tool = findTool(['generate_image', 'higgsfield_generate_image', 'text_to_image']);
      return tool || 'generate_image';
    }

    return 'generate_video';
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
      const headRes = await fetch(assetUrl, {
        method: 'HEAD',
        headers: { 'User-Agent': 'NEURONA-Asset-Validator/1.0' },
        signal: AbortSignal.timeout(10000)
      });

      if (headRes.ok || headRes.status === 304) {
        return;
      }
    } catch (err: any) {
      throw new Error(`Aset ${mediaType} Higgsfield tidak dapat diakses: ${err?.message || String(err)}`);
    }
  }

  private async callMCPTool(toolName: string, args: Record<string, any>, maxRetries = 3): Promise<any> {
    const endpoint = this.getEndpoint();
    const sessionToken = await this.getValidSessionToken();

    let lastError: Error | null = null;
    const timeoutMs = Number(process.env.HIGGSFIELD_TIMEOUT) || 90000;

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
          const dataMatch = text.match(/data:\s*({.+})/);
          if (dataMatch) {
            try {
              json = JSON.parse(dataMatch[1]);
            } catch {}
          }
        }

        if (!res.ok) {
          const isTransient = status === 429 || status === 502 || status === 503 || status === 504;
          const errMsg = `Higgsfield MCP HTTP ${status}: ${json?.error?.message || json?.message || text || 'Unknown error'}`;
          
          if (!isTransient || attempt === maxRetries) {
            throw new Error(errMsg);
          }

          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
          continue;
        }

        if (json?.error) {
          throw new Error(`Higgsfield MCP JSON-RPC Error: ${json.error.message || JSON.stringify(json.error)}`);
        }

        return json?.result || json;
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || String(err);
        const isNetworkOrTimeout = msg.includes('timeout') || msg.includes('ETIMEDOUT') || msg.includes('ECONNREFUSED') || msg.includes('fetch');
        
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

  private async waitForJob(jobId: string, timeoutSeconds = 120): Promise<string> {
    const startTime = Date.now();
    const maxWaitMs = timeoutSeconds * 1000;

    console.log(`[Higgsfield MCP] Awaiting job completion (jobId: ${jobId}, timeout: ${timeoutSeconds}s)...`);

    while (Date.now() - startTime < maxWaitMs) {
      await new Promise(r => setTimeout(r, 3500));

      try {
        const statusResult = await this.callMCPTool('job_status', { jobId }, 2);

        const gen = statusResult?.structuredContent?.generation || statusResult?.generation || {};
        const status = (gen.status || statusResult?.status || '').toLowerCase();

        if (status === 'completed' || status === 'success' || status === 'succeeded') {
          const url = this.extractAssetUrlFromResult(statusResult);
          if (url) {
            console.log(`[Higgsfield MCP] Job ${jobId} completed successfully! URL: ${url}`);
            return url;
          }
        } else if (status === 'failed' || status === 'cancelled' || status === 'rejected') {
          const failureReason = gen.error || gen.failedReason || statusResult?.error || 'Generation rejected by provider';
          throw new Error(`Higgsfield job [${jobId}] failed: ${failureReason}`);
        }
      } catch (err: any) {
        if (err?.message?.includes('failed:')) {
          throw err;
        }
        console.warn(`[Higgsfield MCP] Polling notice for job ${jobId}: ${err?.message}`);
      }
    }

    throw new Error(`Higgsfield video generation timed out after ${timeoutSeconds}s (jobId: ${jobId}).`);
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
      let mediaValue = request.imageUrl;

      // If imageUrl is a web URL, import it to get media value
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

      const toolArgs = {
        params: {
          model: modelId,
          prompt: request.prompt || 'Fluid cinematic camera motion and realistic movement',
          aspect_ratio: aspectRatio,
          duration,
          medias: mediaValue ? [{ value: mediaValue, role: 'start_image' }] : [],
          count: 1
        }
      };

      console.log(`[Higgsfield MCP] Calling ${toolName} with model ${modelId} for Image-to-Video...`);
      const mcpResult = await this.callMCPTool(toolName, toolArgs);
      const jobId = this.extractJobId(mcpResult);
      let assetUrl: string | null = null;

      if (jobId) {
        request.onProgress?.(`Higgsfield MCP: Job ${jobId.substring(0, 8)} in progress...`);
        assetUrl = await this.waitForJob(jobId, 120);
      } else {
        assetUrl = this.extractAssetUrlFromResult(mcpResult);
      }

      if (!assetUrl) {
        throw new Error(`Higgsfield MCP returned empty video result for model [${modelId}].`);
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
      console.log(`[Higgsfield MCP] Calling ${toolName} with model ${modelId} for Text-to-Video...`);

      const toolArgs = {
        params: {
          model: modelId,
          prompt: request.prompt || 'Cinematic futuristic visual scene',
          aspect_ratio: aspectRatio,
          duration,
          count: 1
        }
      };

      const mcpResult = await this.callMCPTool(toolName, toolArgs);
      const jobId = this.extractJobId(mcpResult);
      let assetUrl: string | null = null;

      if (jobId) {
        request.onProgress?.(`Higgsfield MCP: Job ${jobId.substring(0, 8)} in progress...`);
        assetUrl = await this.waitForJob(jobId, 120);
      } else {
        assetUrl = this.extractAssetUrlFromResult(mcpResult);
      }

      if (!assetUrl) {
        throw new Error(`Higgsfield MCP returned empty video result for model [${modelId}].`);
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

  async generateImage(request: any): Promise<any> {
    const generationId = `higgsfield_t2i_${Date.now()}_${randomUUID().substring(0, 8)}`;
    const { modelId, modelDef } = this.resolveModelId(request.model, 'image');
    const estimatedCost = modelDef?.costUsd || 0.05;
    const aspectRatio = request.aspectRatio || '16:9';

    // Extract reference image URL/UUID/DataUri
    const refImg = request.mediaId || request.referenceImage || (Array.isArray(request.referenceImageUrls) && request.referenceImageUrls[0]) || null;

    try {
      const toolName = this.resolveToolName('TEXT_TO_IMAGE');
      console.log(`[Higgsfield MCP] Calling ${toolName} with model ${modelId} for Text-to-Image...`);

      const toolArgs: any = {
        params: {
          model: modelId,
          prompt: request.prompt || 'High quality cinematic character concept artwork',
          aspect_ratio: aspectRatio,
          count: 1
        }
      };

      if (refImg) {
        console.log(`[Higgsfield MCP] Image reference detected: ${refImg}. Adding medias parameters.`);
        toolArgs.params.medias = [
          { value: refImg, role: 'image' }
        ];
      }

      const mcpResult = await this.callMCPTool(toolName, toolArgs);
      const jobId = this.extractJobId(mcpResult);
      let assetUrl: string | null = null;

      if (jobId) {
        request.onProgress?.(`Higgsfield MCP: Image Job ${jobId.substring(0, 8)} in progress...`);
        assetUrl = await this.waitForJob(jobId, 60);
      } else {
        assetUrl = this.extractAssetUrlFromResult(mcpResult);
      }

      if (!assetUrl) {
        throw new Error(`Higgsfield MCP returned empty image result for model [${modelId}].`);
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
