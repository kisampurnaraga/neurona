import { describe, it, expect } from 'vitest';
import {
  isPlaceholderSubtitle,
  resolveSceneSubtitle,
} from '../../src/shared/subtitleUtils';

/**
 * The subtitle utilities were previously duplicated verbatim in src/utils and
 * server/utils. They now have a single source of truth in src/shared. These
 * tests pin the behaviour that both call sites depend on.
 */
describe('isPlaceholderSubtitle', () => {
  it('detects placeholder copy that must never be burned into a video', () => {
    expect(isPlaceholderSubtitle('teks hook di layar')).toBe(true);
    expect(isPlaceholderSubtitle('Text Overlay Here')).toBe(true);
    expect(isPlaceholderSubtitle('placeholder')).toBe(true);
    expect(isPlaceholderSubtitle('')).toBe(true);
    expect(isPlaceholderSubtitle(null)).toBe(true);
    expect(isPlaceholderSubtitle(undefined)).toBe(true);
  });

  it('accepts real narration', () => {
    expect(isPlaceholderSubtitle('Aeroflex HyperRun V2 bikin kaki kamu aman')).toBe(false);
  });
});

describe('resolveSceneSubtitle', () => {
  it('prefers an explicit subtitle field', () => {
    expect(
      resolveSceneSubtitle({ subtitle: 'Halo semuanya', textOverlay: 'teks hook di layar' })
    ).toBe('Halo semuanya');
  });

  it('falls back to dialogue when subtitles are placeholders', () => {
    const scene = {
      subtitle: 'subtitle here',
      dialogue: 'Coba deh, hasilnya beda banget.',
    };
    expect(resolveSceneSubtitle(scene)).toBe('Coba deh, hasilnya beda banget.');
  });

  it('never returns placeholder text when real content exists', () => {
    const result = resolveSceneSubtitle({
      subtitle: 'insert text here',
      textOverlay: 'text overlay',
      voiceOver: 'Narasi asli untuk adegan ini.',
    });
    expect(isPlaceholderSubtitle(result)).toBe(false);
  });
});
