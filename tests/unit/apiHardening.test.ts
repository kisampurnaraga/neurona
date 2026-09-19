/**
 * Regression tests for the API hardening pass (P1 #10 and the remaining
 * unauthenticated routes).
 *
 * These are static-source assertions on purpose: they must fail the moment
 * somebody re-introduces a wide-open body limit, drops the private-by-default
 * cache header, or mounts a production/LLM route without an auth guard.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const serverSource = readFileSync(join(root, 'server.ts'), 'utf8');
const appSource = readFileSync(join(root, 'src/App.tsx'), 'utf8');

/** Returns the text of a route registration, up to the end of its first line. */
const routeLine = (pattern: RegExp): string => {
  const match = serverSource.match(pattern);
  return match ? match[0] : '';
};

describe('batas ukuran body request', () => {
  it('tidak lagi memberi 200 MB ke semua rute', () => {
    expect(serverSource).not.toMatch(/express\.json\(\{\s*limit:\s*'200mb'/);
    expect(serverSource).not.toMatch(/express\.urlencoded\(\{[^}]*limit:\s*'200mb'/);
  });

  it('memakai batas bawaan yang kecil (10 MB)', () => {
    expect(serverSource).toMatch(/app\.use\(express\.json\(\{\s*limit:\s*'10mb'\s*\}\)\)/);
  });

  it('memberi jatah besar hanya pada rute yang membawa media pengguna', () => {
    const large = serverSource.match(
      /app\.use\(\s*\[([^\]]+)\],\s*express\.json\(\{\s*limit:\s*'100mb'\s*\}\)/
    );
    expect(large, 'parser berbatas besar harus ada dan dibatasi allowlist').not.toBeNull();

    const allowed = large![1].split(',').map((p) => p.trim().replace(/^['"]|['"]$/g, ''));
    expect(allowed).toEqual([
      '/api/projects',
      '/api/gallery/images/upload',
      '/api/generate-character-sheet',
    ]);
  });

  it('mendaftarkan parser besar SEBELUM parser bawaan', () => {
    const largeAt = serverSource.indexOf("limit: '100mb'");
    const defaultAt = serverSource.indexOf("limit: '10mb'");
    expect(largeAt).toBeGreaterThan(-1);
    expect(largeAt).toBeLessThan(defaultAt);
  });
});

describe('Cache-Control', () => {
  it('menetapkan no-store untuk seluruh /api secara bawaan', () => {
    expect(serverSource).toMatch(
      /app\.use\('\/api',\s*\(_req,\s*res,\s*next\)\s*=>\s*\{\s*res\.setHeader\('Cache-Control',\s*'no-store'\)/
    );
  });

  it('tetap mengizinkan cache publik khusus untuk rute media', () => {
    // Dua rute memakai res.setHeader('Cache-Control', ...) dan satu memakai
    // objek headers pada res.sendFile — dua bentuk penulisan itu harus dihitung.
    const setHeaderForm = serverSource.match(/Cache-Control',\s*'public, max-age=86400'/g) ?? [];
    const headersObjectForm = serverSource.match(/'Cache-Control':\s*'public, max-age=86400'/g) ?? [];
    expect(setHeaderForm.length + headersObjectForm.length).toBeGreaterThanOrEqual(3);
  });
});

describe('rute produksi & LLM wajib terotentikasi', () => {
  const guarded: Array<[string, RegExp]> = [
    ['POST /api/chat', /app\.post\('\/api\/chat',\s*verifyToken,\s*handleInteraction\)/],
    ['POST /api/interact', /app\.post\('\/api\/interact',\s*verifyToken,\s*handleInteraction\)/],
    ['POST /api/neurona-chat', /app\.post\('\/api\/neurona-chat',\s*\n?\s*verifyToken,/],
    ['POST /api/youtube/intelligence', /app\.post\('\/api\/youtube\/intelligence',\s*verifyToken,/],
    ['POST /api/youtube/strategy', /app\.post\('\/api\/youtube\/strategy',\s*verifyToken,/],
    ['POST /api/test-fal-model', /app\.post\('\/api\/test-fal-model',\s*requireFounder,/],
    ['GET /api/test-db', /app\.get\("\/api\/test-db",\s*requireFounder,/],
    ['GET /api/providers/status', /app\.get\("\/api\/providers\/status",\s*verifyToken,/],
    [
      'GET /api/v1/client/projects/:projectId',
      /app\.get\('\/api\/v1\/client\/projects\/:projectId',\s*requireProjectOwnership,/,
    ],
  ];

  for (const [name, pattern] of guarded) {
    it(`${name} memakai guard`, () => {
      expect(routeLine(pattern)).not.toBe('');
    });
  }
});

describe('peran pelaku tidak boleh berasal dari body request', () => {
  it('handleInteraction mengambil role dari sesi terverifikasi', () => {
    expect(serverSource).toMatch(
      /const userRole = \(req as AuthenticatedRequest\)\.user\?\.role;/
    );
  });

  it('handleInteraction tidak lagi mendestruktur userRole dari req.body', () => {
    const handler = serverSource.slice(
      serverSource.indexOf('const handleInteraction'),
      serverSource.indexOf('const handleInteraction') + 900
    );
    expect(handler).toContain('} = req.body;');
    expect(handler.slice(0, handler.indexOf('} = req.body;'))).not.toContain('userRole');
  });
});

describe('klien ikut menyesuaikan', () => {
  it('status provider diambil ulang setelah login', () => {
    expect(appSource).toMatch(/\}, \[currentUser\]\);/);
    expect(appSource).toMatch(/if \(!currentUser\) return;/);
  });
});

describe('kepemilikan proyek disimpan saat produksi dimulai', () => {
  const orchestrator = readFileSync(join(root, 'server/orchestrator.ts'), 'utf8');

  it('startProduction menyalin userId ke objek project', () => {
    // Tanpa ini, proyek baru tersimpan tanpa pemilik: requireProjectAccess
    // menganggapnya "legacy" (siapa pun boleh membuka) dan seluruh blok
    // `if (project.userId && ...)` untuk menahan/memotong kredit tidak jalan.
    expect(orchestrator).toMatch(/\(project as any\)\.userId = userId \|\| 'default-user';/);
  });

  it('startProduction menyalin isFounderBypass', () => {
    expect(orchestrator).toMatch(/\(project as any\)\.isFounderBypass = isFounderBypass;/);
  });

  it('userId dan isFounderBypass tersedia di tipe opsi produksi', () => {
    const optionsType = orchestrator.slice(
      orchestrator.indexOf('interface ProductionStartOptions'),
      orchestrator.indexOf('export class ProductionOrchestrator'),
    );
    expect(optionsType).toContain('userId?: string;');
    expect(optionsType).toContain('isFounderBypass?: boolean;');
  });

  it('nilai tersebut diambil dari destructuring options, bukan dari body klien', () => {
    expect(orchestrator).toMatch(/userRole, userId, isFounderBypass, executionMode,/);
  });

  it('POST /api/projects mencap userId dari sesi terverifikasi', () => {
    const route = serverSource.slice(
      serverSource.indexOf("app.post('/api/projects', verifyToken"),
      serverSource.indexOf("app.post('/api/projects', verifyToken") + 400,
    );
    expect(route).toContain('payload.userId = user.user_id;');
    expect(route).toContain('payload.isFounderBypass = user.role === \'founder\';');
  });
});
