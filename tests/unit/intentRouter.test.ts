import { describe, it, expect } from 'vitest';
import { ConversationalIntentRouter } from '../../src/server/core/IntentRouter';

/**
 * The conversational router decides which of the eight studios handles a
 * request. It is the entry point of the whole production pipeline, so a
 * mis-route wastes real provider credits.
 */
describe('ConversationalIntentRouter', () => {
  const route = (prompt: string, project: any = null, hasAssets = false, explicit?: any) =>
    ConversationalIntentRouter.route(prompt, project, hasAssets, explicit);

  it('wakes up on a bare wake word', async () => {
    expect((await route('neurona')).intent).toBe('WAKE');
    expect((await route('hey neurona')).intent).toBe('WAKE');
  });

  it('greets the user', async () => {
    expect((await route('halo')).intent).toBe('GREETING');
    expect((await route('selamat pagi')).intent).toBe('GREETING');
  });

  it('asks for clarification when the request is too vague', async () => {
    const result = await route('saya ingin membuat video');
    expect(result.intent).toBe('AMBIGUOUS');
  });

  it('routes animation requests and derives the art style', async () => {
    const anime = await route('buatkan animasi anime tentang kucing');
    expect(anime.intent).toBe('ANIMATION_PRODUCTION_REQUEST');
    expect(anime.videoType).toBe('ANIMATION');
    expect(anime.quickConfig?.artStyle).toBe('ANIME_SHINKAI');
    expect(anime.action).toBe('START_PRODUCTION');

    const pixar = await route('bikin video animasi 3d pixar');
    expect(pixar.quickConfig?.artStyle).toBe('3D_PIXAR');
  });

  it('routes educational requests and picks the visual style', async () => {
    const whiteboard = await route('video pembelajaran whiteboard tentang fotosintesis');
    expect(whiteboard.intent).toBe('EDUCATIONAL_PRODUCTION_REQUEST');
    expect(whiteboard.videoType).toBe('EDUCATIONAL');
    expect(whiteboard.quickConfig?.visualStyle).toBe('WHITEBOARD_ANIMATION');
  });

  it('routes ads, film, affiliate and quick-create requests', async () => {
    expect((await route('buatkan iklan parfum')).videoType).toBe('VIDEO_ADS');
    expect((await route('buat film pendek thriller')).videoType).toBe('FILM');
    expect((await route('video affiliate shopee sepatu')).videoType).toBe('AFFILIATE');
    expect((await route('video cepat instan')).videoType).toBe('QUICK_CREATE');
  });

  it('lets an explicit studio selection override keyword guessing', async () => {
    const result = await route('apa saja', null, false, 'FULL' as any);
    expect(result.intent).toBe('FULL_PRODUCTION_REQUEST');
    expect(result.videoType).toBe('FULL');
  });

  it('returns UNKNOWN with guidance for unrecognised input', async () => {
    const result = await route('xyzzy plugh');
    expect(result.intent).toBe('UNKNOWN');
    expect(result.response.length).toBeGreaterThan(0);
  });

  it('requires approval before continuing a fallback-quota project', async () => {
    const pending = { status: 'QUOTA_FALLBACK_PENDING' } as any;
    expect((await route('ya', pending)).intent).toBe('FALLBACK_APPROVE');
    expect((await route('tidak', pending)).intent).toBe('FALLBACK_REJECT');
  });

  it('treats "lanjut" as approval only when the project awaits approval', async () => {
    const awaiting = { status: 'AWAITING_APPROVAL' } as any;
    const approved = await route('lanjut', awaiting);
    expect(approved.intent).toBe('APPROVAL');
    expect(approved.action).toBe('APPROVE');

    const producing = { status: 'PRODUCING' } as any;
    expect((await route('lanjut', producing)).intent).toBe('AMBIGUOUS');
  });

  it('directs model switching to the Founder Control Center', async () => {
    const result = await route('ganti model ke openai');
    expect(result.intent).toBe('SWITCH_MODEL_OPENAI');
  });
});
