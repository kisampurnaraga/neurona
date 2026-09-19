import { describe, it, expect } from 'vitest';
import {
  resolveProviderSafeModel,
  HIGGSFIELD_CATALOG_MODELS,
  OPENART_CATALOG_MODELS,
} from '../../src/shared/modelCatalog';

/**
 * The catalog's core rule is "display name is never a routing key" and
 * "never cross-execute Higgsfield and OpenArt models". Both rules exist because
 * violating them sends work to the wrong provider and burns credits.
 */
describe('model catalog integrity', () => {
  it('routes by internal model id within the correct provider', () => {
    const result = resolveProviderSafeModel({
      inputModel: 'veo3_1_lite',
      explicitProvider: 'higgsfield',
    });
    expect(result.provider).toBe('higgsfield');
    expect(result.internalModelId).toBe('veo3_1_lite');
  });

  it('respects an explicit provider for an OpenArt model', () => {
    const result = resolveProviderSafeModel({
      inputModel: 'veo3-1',
      explicitProvider: 'openart',
    });
    expect(result.provider).toBe('openart');
  });

  it('never resolves an OpenArt-only model to Higgsfield', () => {
    const result = resolveProviderSafeModel({
      inputModel: 'nano-banana-pro',
      explicitProvider: 'openart',
    });
    expect(result.provider).not.toBe('higgsfield');
  });

  it('returns a model definition that matches the resolved provider', () => {
    const result = resolveProviderSafeModel({
      inputModel: 'veo3_1_lite',
      explicitProvider: 'higgsfield',
    });
    expect(result.modelDef.provider).toBe('higgsfield');
    expect(result.modelDef.internalModelId).toBe(result.internalModelId);
  });

  it('exposes distinct catalog entries per provider', () => {
    expect(HIGGSFIELD_CATALOG_MODELS.length).toBeGreaterThan(0);
    expect(OPENART_CATALOG_MODELS.length).toBeGreaterThan(0);
    for (const model of HIGGSFIELD_CATALOG_MODELS) {
      expect(model.provider).toBe('higgsfield');
    }
    for (const model of OPENART_CATALOG_MODELS) {
      expect(model.provider).toBe('openart');
    }
  });

  it('gives every catalog entry a positive credit cost', () => {
    for (const model of [...HIGGSFIELD_CATALOG_MODELS, ...OPENART_CATALOG_MODELS]) {
      expect(model.costCredits).toBeGreaterThan(0);
    }
  });
});
