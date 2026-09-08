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
    id: 'higgsfield-video-pro',
    name: 'Higgsfield Video Pro',
    type: 'VIDEO',
    tier: 'premium',
    costUsd: 0.150,
    defaultDuration: 5,
    description: 'Higgsfield Video Pro cinematic generation (15 credits)',
    supportedAspectRatios: ['9:16', '16:9', '1:1']
  },
  {
    id: 'higgsfield-anim',
    name: 'Higgsfield Anim (Image-to-Video)',
    type: 'IMAGE_TO_VIDEO',
    tier: 'balanced',
    costUsd: 0.100,
    defaultDuration: 5,
    description: 'Higgsfield Anim fluid character and object animation (10 credits)',
    supportedAspectRatios: ['9:16', '16:9', '1:1']
  }
];

export class HiggsfieldMCPAdapter implements VideoGenerationProvider {
  name = 'Higgsfield MCP Media Provider';
  isMock = false;

  public static readonly OFFICIAL_ENDPOINT = 'https://mcp.higgsfield.ai/mcp';
  private static cachedTools: any[] | null = null;
  private static lastToolsDiscovery: number = 0;
  private static lastDiscoveryError: string | null = null;
  private static isInitialized: boolean = false;

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
    return {
      textToImage: false,
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
    const aliasMap: Record<string, string> = {
      'higgsfield-video-pro': 'higgsfield-video-pro',
      'higgsfield-anim': 'higgsfield-anim'
    };

    const targetId = aliasMap[model] || (model && model !== 'default' ? model : 'higgsfield-video-pro');
    const modelDef = HIGGSFIELD_DEFAULT_MODELS.find(m => m.id === targetId) ||
      HIGGSFIELD_DEFAULT_MODELS.find(m => m.id === model) ||
      HIGGSFIELD_DEFAULT_MODELS[0];

    return { modelId: targetId, modelDef };
  }

  public resolveToolName(category: 'IMAGE_TO_VIDEO' | 'TEXT_TO_VIDEO'): string {
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

    if (category === 'IMAGE_TO_VIDEO') {
      const tool = findTool(['higgsfield_image_to_video', 'image_to_video', 'higgsfield_generate_video', 'generate_video']);
      if (tool) return tool;
      if (tools.length > 0) {
        const schemaMatch = tools.find(t => t.inputSchema?.properties?.image_url || t.inputSchema?.properties?.image || t.inputSchema?.properties?.visualReferences);
        if (schemaMatch) return schemaMatch.name;
        throw new Error(`Tool untuk kategori ${category} tidak ditemukan pada server Higgsfield MCP.`);
      }
      return 'higgsfield_generate_video';
    }

    if (category === 'TEXT_TO_VIDEO') {
      const tool = findTool(['higgsfield_text_to_video', 'text_to_video', 'higgsfield_generate_video', 'generate_video']);
      if (tool) return tool;
      if (tools.length > 0) {
        const schemaMatch = tools.find(t => t.inputSchema?.properties?.prompt);
        if (schemaMatch) return schemaMatch.name;
        throw new Error(`Tool untuk kategori ${category} tidak ditemukan pada server Higgsfield MCP.`);
      }
      return 'higgsfield_generate_video';
    }

    return 'higgsfield_generate_video';
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

    const structuredResources = result.structuredContent?.resources || result.resources;
    if (Array.isArray(structuredResources) && structuredResources.length > 0) {
      const first = structuredResources[0];
      if (first.url) return first.url;
      if (first.uri) return first.uri;
      if (first.thumbnailUrl) return first.thumbnailUrl;
    }

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

    return null;
  }

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

  private async waitForCreation(historyId: string, timeoutSeconds = 90, isVideo = false): Promise<string> {
    try {
      const waitResult = await this.callMCPTool('higgsfield_creation_wait', {
        historyId,
        timeoutSeconds: Math.min(timeoutSeconds, 90)
      }, 2);

      const assetUrl = this.extractAssetUrlFromResult(waitResult);
      if (assetUrl) {
        return assetUrl;
      }
    } catch (waitErr: any) {
      console.warn(`[Higgsfield MCP] wait notice: ${waitErr?.message}. Falling back to polling...`);
    }

    const startTime = Date.now();
    const maxWaitMs = timeoutSeconds * 1000;
    while (Date.now() - startTime < maxWaitMs) {
      await new Promise(r => setTimeout(r, 4000));
      try {
        const getResult = await this.callMCPTool('higgsfield_creation_get', { historyId }, 1);
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
          throw new Error(`Higgsfield generation ${historyId} ended with status [${status}]: ${parsed?.error || parsed?.failedReason || 'Generation rejected'}`);
        }
      } catch (e: any) {
        if (e.message?.includes('ended with status')) throw e;
      }
    }

    throw new Error(`Higgsfield creation timed out after ${timeoutSeconds}s (historyId: ${historyId})`);
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
    const model = (explicitModel && explicitModel.startsWith('higgsfield')) ? explicitModel : 'higgsfield-video-pro';

    if (rawImageUrl) {
      onProgress?.(`Higgsfield MCP: Animating image keyframe (${model})...`);
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
      onProgress?.(`Higgsfield MCP: Rendering text-to-video (${model})...`);
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

  async imageToVideo(request: any): Promise<any> {
    const generationId = `higgsfield_i2v_${Date.now()}_${randomUUID().substring(0, 8)}`;
    const { modelId, modelDef } = this.resolveModelId(request.model, 'video');
    const estimatedCost = modelDef.costUsd;

    CostTrackingService.startGeneration({
      generationId,
      userId: request.userId,
      projectId: request.projectId,
      studio: request.studio,
      sceneId: request.sceneId,
      provider: 'higgsfield',
      model: modelId,
      operation: 'IMAGE_TO_VIDEO',
      duration: request.duration || 5,
      resolution: request.resolution || '720p',
      estimatedCost
    });

    try {
      const toolName = this.resolveToolName('IMAGE_TO_VIDEO');
      let assetUrl: string | null = null;

      const toolArgs = {
        model: modelId,
        mode: 'image2video',
        params: {
          prompt: request.prompt || 'Fluid cinematic camera motion and realistic movement',
          aspectRatio: request.aspectRatio || '16:9',
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

    CostTrackingService.startGeneration({
      generationId,
      userId: request.userId,
      projectId: request.projectId,
      studio: request.studio,
      sceneId: request.sceneId,
      provider: 'higgsfield',
      model: modelId,
      operation: 'TEXT_TO_VIDEO',
      duration: request.duration || 5,
      resolution: request.resolution || '1080p',
      estimatedCost
    });

    try {
      const toolName = this.resolveToolName('TEXT_TO_VIDEO');
      let assetUrl: string | null = null;

      const toolArgs = {
        model: modelId,
        mode: 'text2video',
        params: {
          prompt: request.prompt,
          aspectRatio: request.aspectRatio || '16:9'
        }
      };

      const mcpResult = await this.callMCPTool(toolName, toolArgs);
      const historyId = this.extractHistoryId(mcpResult);
      if (historyId) {
        assetUrl = await this.waitForCreation(historyId, 120, true);
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
}
