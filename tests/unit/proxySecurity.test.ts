import { describe, it, expect } from 'vitest';
import { validateProxyUrl } from '../../server/utils/ssrf';

/**
 * SSRF guard tests for the open /api/proxy-image and /api/proxy-video routes.
 *
 * Only the deterministic rejection paths are asserted here. Accepting a URL
 * additionally requires a live DNS lookup of an allow-listed host, which would
 * make the suite depend on network availability.
 */
describe('validateProxyUrl', () => {
  it('rejects non-HTTP protocols', async () => {
    expect(await validateProxyUrl('file:///etc/passwd')).toBe(false);
    expect(await validateProxyUrl('gopher://fal.run/')).toBe(false);
    expect(await validateProxyUrl('ftp://fal.run/x')).toBe(false);
  });

  it('rejects hosts outside the allowlist', async () => {
    expect(await validateProxyUrl('https://evil.example.com/x.png')).toBe(false);
    expect(await validateProxyUrl('https://169.254.169.254/latest/meta-data/')).toBe(false);
    expect(await validateProxyUrl('http://127.0.0.1:3000/api/fcc/config')).toBe(false);
    expect(await validateProxyUrl('http://localhost:3000/')).toBe(false);
  });

  it('rejects a lookalike domain that merely ends with an allowed name', async () => {
    // The allowlist uses a dot boundary, so "notfal.run" must not match "fal.run".
    expect(await validateProxyUrl('https://notfal.run/x.png')).toBe(false);
    expect(await validateProxyUrl('https://evil-googleapis.com/x')).toBe(false);
  });

  it('rejects malformed URLs without throwing', async () => {
    expect(await validateProxyUrl('')).toBe(false);
    expect(await validateProxyUrl('not a url')).toBe(false);
    expect(await validateProxyUrl('http://')).toBe(false);
  });
});
