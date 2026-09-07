import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { db } from '../../src/db/index';
import { systemSettings } from '../../src/db/schema';
import { eq } from 'drizzle-orm';

export interface GenerationCostRecord {
  generationId: string;
  userId?: string;
  organizationId?: string;
  projectId?: string;
  studio?: string; // 'AFFILIATE' | 'ANIMASI' | 'EDUKASI' | string
  sceneId?: string | number;
  provider: string; // 'openart' | 'fal' | 'google_veo' | 'byteplus' | 'openai' | string
  model: string;
  operation: 'TEXT_TO_IMAGE' | 'IMAGE_TO_VIDEO' | 'TEXT_TO_VIDEO' | 'IMAGE_EDIT' | 'AUDIO_TTS' | string;
  status: 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILED' | 'RETRYING' | 'FALLBACK';
  duration?: number; // seconds
  resolution?: string; // '720p' | '1080p' | '1K' | '2K' | '4K' | string
  estimatedCost: number; // in USD
  actualCost: number; // in USD
  providerCreditsUsed?: number;
  userCreditsDeducted?: number;
  error?: string;
  fallbackTo?: string;
  idempotencyKey?: string;
  createdAt: string;
  completedAt?: string;
}

export interface CostSummaryStats {
  totalCostUsd: number;
  costTodayUsd: number;
  costThisMonthUsd: number;
  totalGenerations: number;
  successfulGenerations: number;
  failedGenerations: number;
  costByProvider: Record<string, { totalCost: number; count: number }>;
  costByStudio: Record<string, { totalCost: number; count: number }>;
  costByModel: Record<string, { totalCost: number; count: number }>;
  costByUser: Record<string, { totalCost: number; count: number }>;
  costByProject: Record<string, { totalCost: number; count: number }>;
  recentLogs: GenerationCostRecord[];
}

export class CostTrackingService {
  private static inMemoryLogs: GenerationCostRecord[] = [];
  private static maxInMemory = 1000;
  private static isInitialized = false;

  private static init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    try {
      const row = db.select().from(systemSettings).where(eq(systemSettings.key, 'media_generation_cost_logs')).get();
      if (row && row.value) {
        const parsed = JSON.parse(row.value);
        if (Array.isArray(parsed)) {
          this.inMemoryLogs = parsed;
        }
      }
    } catch (e) {
      console.warn('[CostTrackingService] Failed to load cost logs from DB:', (e as any)?.message);
    }
  }

  private static persist() {
    try {
      const now = new Date().toISOString();
      const existing = db.select().from(systemSettings).where(eq(systemSettings.key, 'media_generation_cost_logs')).get();
      const value = JSON.stringify(this.inMemoryLogs.slice(-this.maxInMemory));
      if (existing) {
        db.update(systemSettings)
          .set({ value, updatedAt: now })
          .where(eq(systemSettings.key, 'media_generation_cost_logs'))
          .run();
      } else {
        db.insert(systemSettings)
          .values({ key: 'media_generation_cost_logs', value, updatedAt: now })
          .run();
      }
    } catch (e) {
      console.error('[CostTrackingService] Failed to persist cost logs to SQLite:', (e as any)?.message);
    }
  }

  /**
   * Log generation start
   */
  static startGeneration(data: {
    generationId?: string;
    userId?: string;
    organizationId?: string;
    projectId?: string;
    studio?: string;
    sceneId?: string | number;
    provider: string;
    model: string;
    operation: 'TEXT_TO_IMAGE' | 'IMAGE_TO_VIDEO' | 'TEXT_TO_VIDEO' | 'IMAGE_EDIT' | 'AUDIO_TTS' | string;
    duration?: number;
    resolution?: string;
    estimatedCost: number;
    providerCreditsUsed?: number;
    userCreditsDeducted?: number;
    idempotencyKey?: string;
  }): GenerationCostRecord {
    this.init();

    const record: GenerationCostRecord = {
      generationId: data.generationId || `gen_${Date.now()}_${randomUUID().substring(0, 8)}`,
      userId: data.userId || 'anonymous',
      organizationId: data.organizationId || 'default',
      projectId: data.projectId,
      studio: data.studio || 'AFFILIATE',
      sceneId: data.sceneId,
      provider: data.provider,
      model: data.model,
      operation: data.operation,
      status: 'STARTED',
      duration: data.duration,
      resolution: data.resolution,
      estimatedCost: data.estimatedCost || 0,
      actualCost: 0,
      providerCreditsUsed: data.providerCreditsUsed || 0,
      userCreditsDeducted: data.userCreditsDeducted || 0,
      idempotencyKey: data.idempotencyKey,
      createdAt: new Date().toISOString()
    };

    console.log(`[MEDIA_PROVIDER] provider=${record.provider} operation=${record.operation} model=${record.model} project=${record.projectId || 'N/A'} scene=${record.sceneId || 'N/A'} status=started estimatedCost=$${record.estimatedCost.toFixed(4)}`);

    this.inMemoryLogs.push(record);
    if (this.inMemoryLogs.length > this.maxInMemory * 1.5) {
      this.inMemoryLogs = this.inMemoryLogs.slice(-this.maxInMemory);
    }
    this.persist();

    return record;
  }

  /**
   * Complete generation record
   */
  static completeGeneration(generationId: string, updates: {
    status?: 'SUCCESS' | 'FAILED' | 'FALLBACK';
    actualCost?: number;
    providerCreditsUsed?: number;
    error?: string;
    fallbackTo?: string;
  }) {
    this.init();
    const record = this.inMemoryLogs.find(r => r.generationId === generationId);
    if (!record) return;

    record.status = updates.status || 'SUCCESS';
    if (updates.actualCost !== undefined) record.actualCost = updates.actualCost;
    else if (record.status === 'SUCCESS' && record.actualCost === 0) record.actualCost = record.estimatedCost;
    
    if (updates.providerCreditsUsed !== undefined) record.providerCreditsUsed = updates.providerCreditsUsed;
    if (updates.error) record.error = updates.error;
    if (updates.fallbackTo) record.fallbackTo = updates.fallbackTo;
    record.completedAt = new Date().toISOString();

    console.log(`[MEDIA_PROVIDER] provider=${record.provider} operation=${record.operation} model=${record.model} status=${record.status.toLowerCase()} generationId=${record.generationId} estimatedCost=$${record.estimatedCost.toFixed(4)} actualCost=$${record.actualCost.toFixed(4)} duration=${record.duration || 5}s`);

    this.persist();
    return record;
  }

  /**
   * Check if an operation with this idempotencyKey is already pending or completed
   */
  static findByIdempotency(idempotencyKey?: string): GenerationCostRecord | undefined {
    if (!idempotencyKey) return undefined;
    this.init();
    return this.inMemoryLogs.find(r => r.idempotencyKey === idempotencyKey);
  }

  /**
   * Aggregated Cost Summary for Founder Control Center and Dashboard
   */
  static getCostSummary(): CostSummaryStats {
    this.init();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let totalCostUsd = 0;
    let costTodayUsd = 0;
    let costThisMonthUsd = 0;
    let successfulGenerations = 0;
    let failedGenerations = 0;

    const costByProvider: Record<string, { totalCost: number; count: number }> = {};
    const costByStudio: Record<string, { totalCost: number; count: number }> = {};
    const costByModel: Record<string, { totalCost: number; count: number }> = {};
    const costByUser: Record<string, { totalCost: number; count: number }> = {};
    const costByProject: Record<string, { totalCost: number; count: number }> = {};

    for (const log of this.inMemoryLogs) {
      const cost = log.actualCost || (log.status === 'SUCCESS' ? log.estimatedCost : 0);
      const logTime = new Date(log.createdAt).getTime();

      totalCostUsd += cost;
      if (logTime >= startOfToday) costTodayUsd += cost;
      if (logTime >= startOfMonth) costThisMonthUsd += cost;

      if (log.status === 'SUCCESS') successfulGenerations++;
      if (log.status === 'FAILED') failedGenerations++;

      // By Provider
      const pKey = log.provider || 'unknown';
      if (!costByProvider[pKey]) costByProvider[pKey] = { totalCost: 0, count: 0 };
      costByProvider[pKey].totalCost += cost;
      costByProvider[pKey].count++;

      // By Studio
      const sKey = log.studio || 'AFFILIATE';
      if (!costByStudio[sKey]) costByStudio[sKey] = { totalCost: 0, count: 0 };
      costByStudio[sKey].totalCost += cost;
      costByStudio[sKey].count++;

      // By Model
      const mKey = log.model || 'unknown';
      if (!costByModel[mKey]) costByModel[mKey] = { totalCost: 0, count: 0 };
      costByModel[mKey].totalCost += cost;
      costByModel[mKey].count++;

      // By User
      const uKey = log.userId || 'anonymous';
      if (!costByUser[uKey]) costByUser[uKey] = { totalCost: 0, count: 0 };
      costByUser[uKey].totalCost += cost;
      costByUser[uKey].count++;

      // By Project
      const prKey = log.projectId || 'unassigned';
      if (!costByProject[prKey]) costByProject[prKey] = { totalCost: 0, count: 0 };
      costByProject[prKey].totalCost += cost;
      costByProject[prKey].count++;
    }

    return {
      totalCostUsd: Number(totalCostUsd.toFixed(4)),
      costTodayUsd: Number(costTodayUsd.toFixed(4)),
      costThisMonthUsd: Number(costThisMonthUsd.toFixed(4)),
      totalGenerations: this.inMemoryLogs.length,
      successfulGenerations,
      failedGenerations,
      costByProvider,
      costByStudio,
      costByModel,
      costByUser,
      costByProject,
      recentLogs: this.inMemoryLogs.slice(-50).reverse()
    };
  }

  /**
   * Filter cost logs for a specific provider (e.g. OpenArt)
   */
  static getProviderStats(providerName: string) {
    this.init();
    const summary = this.getCostSummary();
    const provKey = providerName.toLowerCase();
    
    // Find matching provider records
    const matching = this.inMemoryLogs.filter(l => l.provider.toLowerCase().includes(provKey));
    let totalCost = 0;
    let count = 0;
    let successful = 0;
    
    matching.forEach(m => {
      totalCost += m.actualCost || (m.status === 'SUCCESS' ? m.estimatedCost : 0);
      count++;
      if (m.status === 'SUCCESS') successful++;
    });

    return {
      provider: providerName,
      totalCostUsd: Number(totalCost.toFixed(4)),
      generationCount: count,
      successRate: count > 0 ? `${((successful / count) * 100).toFixed(1)}%` : '100%',
      recentLogs: matching.slice(-20).reverse()
    };
  }
}
