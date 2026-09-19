import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Static guard audit.
 *
 * This is the regression net for the original vulnerability: 28 privileged
 * endpoints were gated on a forgeable `x-role: founder` header. A behavioural
 * test would need a live server; asserting on the route table catches the same
 * mistake in milliseconds and fails the build immediately.
 */

const root = path.resolve(__dirname, '../..');
const serverSource = fs.readFileSync(path.join(root, 'server.ts'), 'utf8');

/**
 * The only /api/fcc routes allowed to run without a founder JWT.
 * Documented and justified individually below.
 */
const PUBLIC_FCC_ROUTES = new Set([
  // OAuth redirect targets: the provider's browser redirect cannot carry an
  // Authorization header. Protected instead by PKCE verifier + state validation
  // with replay protection (see *OAuthService.exchangeCodeForToken).
  '/api/fcc/openart/oauth/callback',
  '/api/fcc/higgsfield/oauth/callback',
  // Permanently disabled legacy route; always responds 403.
  '/api/fcc/higgsfield/auth/verify',
]);

interface RouteRegistration {
  method: string;
  routePath: string;
  source: string;
  index: number;
}

/** Extract every route registration together with the text that follows it. */
function extractRoutes(source: string): RouteRegistration[] {
  const routes: RouteRegistration[] = [];
  const pattern = /app\.(get|post|put|delete|patch|all)\(\s*(\[[^\]]*\]|'[^']*')/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source)) !== null) {
    const method = match[1].toUpperCase();
    const rawPaths = match[2];
    const paths = [...rawPaths.matchAll(/'([^']+)'/g)].map((m) => m[1]);
    const following = source.slice(match.index, match.index + 320);

    for (const p of paths) {
      routes.push({ method, routePath: p, source: following, index: match.index });
    }
  }
  return routes;
}

const routes = extractRoutes(serverSource);

/**
 * Matches the header name only when it appears as a quoted string literal,
 * i.e. real code (`headers['x-role']`, `{ 'x-role': ... }`). Comments that
 * explain the removed vulnerability are allowed to name it in prose.
 */
const QUOTED_X_ROLE = /['"]x-role['"]/;

describe('no forgeable identity headers are trusted', () => {
  it('server.ts does not read an x-role header anywhere', () => {
    const offenders = [...serverSource.matchAll(new RegExp(QUOTED_X_ROLE, 'g'))];
    expect(offenders).toHaveLength(0);
  });

  it('no client component sends an x-role header', () => {
    const dirs = ['src/components', 'src/utils', 'src/lib'];
    const files: string[] = [];

    const walk = (dir: string) => {
      const full = path.join(root, dir);
      if (!fs.existsSync(full)) return;
      for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
        const rel = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(rel);
        else if (/\.(ts|tsx)$/.test(entry.name)) files.push(rel);
      }
    };
    walk('src/components');
    walk('src/utils');
    walk('src/lib');

    const offenders = files.filter((f) =>
      QUOTED_X_ROLE.test(fs.readFileSync(path.join(root, f), 'utf8'))
    );
    expect(offenders).toEqual([]);
    expect(dirs.length).toBeGreaterThan(0);
  });

  it('does not advertise identity headers over CORS', () => {
    const corsHeader = serverSource.match(
      /Access-Control-Allow-Headers'[^)]*\)/
    )?.[0] ?? '';
    expect(corsHeader).not.toMatch(/x-role/);
    expect(corsHeader).not.toMatch(/x-user-id/);
    expect(corsHeader).not.toMatch(/x-user-email/);
    expect(corsHeader).toMatch(/Authorization/);
  });
});

describe('Founder Control Center routes require a founder JWT', () => {
  const fccRoutes = routes.filter((r) => r.routePath.startsWith('/api/fcc/'));

  it('finds the founder routes at all', () => {
    expect(fccRoutes.length).toBeGreaterThan(20);
  });

  it.each(
    fccRoutes
      .filter((r) => !PUBLIC_FCC_ROUTES.has(r.routePath))
      .map((r) => [`${r.method} ${r.routePath}`, r] as const)
  )('%s uses requireFounder', (_label, route) => {
    expect(route.source).toMatch(/requireFounder/);
  });

  it('keeps the public OAuth callbacks on the allowlist only', () => {
    const unguarded = fccRoutes
      .filter((r) => !/requireFounder/.test(r.source))
      .map((r) => r.routePath);
    expect(new Set(unguarded)).toEqual(PUBLIC_FCC_ROUTES);
  });
});

describe('key-rotator routes are guarded', () => {
  const rotatorRoutes = routes.filter((r) => r.routePath.startsWith('/api/fcc/key-rotator'));

  it('covers every key-rotator endpoint', () => {
    expect(rotatorRoutes.length).toBeGreaterThanOrEqual(5);
  });

  it.each(rotatorRoutes.map((r) => [`${r.method} ${r.routePath}`, r] as const))(
    '%s uses requireFounder',
    (_label, route) => {
      expect(route.source).toMatch(/requireFounder/);
    }
  );
});

describe('credit-spending and project routes require authentication', () => {
  const mustBeAuthenticated: Array<[string, string]> = [
    ['POST', '/api/render'],
    ['POST', '/api/tts'],
    ['POST', '/api/projects'],
    ['POST', '/api/generate-character-sheet'],
    ['POST', '/api/audit-prompt'],
    ['GET', '/api/projects'],
    ['GET', '/api/projects/deleted'],
    ['GET', '/api/v1/projects'],
    ['DELETE', '/api/gallery/:id'],
  ];

  it.each(mustBeAuthenticated)('%s %s has an auth guard', (method, routePath) => {
    const route = routes.find((r) => r.method === method && r.routePath === routePath);
    expect(route, `route ${method} ${routePath} should exist`).toBeDefined();
    expect(route!.source).toMatch(/verifyToken|requireProjectOwnership|requireFounder/);
  });

  const projectScoped = [
    ['POST', '/api/projects/:id/approve'],
    ['POST', '/api/projects/:id/generate-scene-image'],
    ['POST', '/api/projects/:id/generate-all-images'],
    ['POST', '/api/projects/:id/generate-scene-video'],
    ['POST', '/api/projects/:id/override-scene'],
    ['POST', '/api/projects/:id/reorder-scenes'],
    ['POST', '/api/projects/:id/toggle-showcase'],
    ['DELETE', '/api/projects/:id'],
    ['DELETE', '/api/projects/:id/hard'],
  ];

  it.each(projectScoped)('%s %s enforces project ownership', (method, routePath) => {
    const route = routes.find((r) => r.method === method && r.routePath === routePath);
    expect(route, `route ${method} ${routePath} should exist`).toBeDefined();
    expect(route!.source).toMatch(/requireProjectOwnership/);
  });
});

describe('project ownership guard is composed correctly', () => {
  it('runs verifyToken before the ownership check', () => {
    // requireProjectAccess reads req.user, which only verifyToken populates.
    // Omitting verifyToken silently makes every project route return 401.
    const declaration = serverSource.match(
      /const requireProjectOwnership[^=]*=\s*\[([\s\S]*?)\];/
    );
    expect(declaration).not.toBeNull();
    const body = declaration![1];
    expect(body).toMatch(/verifyToken/);
    expect(body).toMatch(/requireProjectAccess/);

    const verifyIndex = body.indexOf('verifyToken');
    const accessIndex = body.indexOf('requireProjectAccess');
    expect(verifyIndex).toBeLessThan(accessIndex);
  });
});

describe('secrets are not hardcoded', () => {
  const filesToCheck = [
    'server/utils/crypto.ts',
    'server/routes/workerRoute.ts',
    'server/services/queueService.ts',
  ];

  it.each(filesToCheck)('%s contains no hardcoded secret literal', (file) => {
    const content = fs.readFileSync(path.join(root, file), 'utf8');
    expect(content).not.toMatch(/NEURONA_MASTER_ENCRYPTION_KEY_2026_PROD/);
    expect(content).not.toMatch(/neuronna-internal-worker-secret-2025/);
  });

  it('the worker endpoint fails closed when WORKER_SECRET is unset', () => {
    const content = fs.readFileSync(path.join(root, 'server/routes/workerRoute.ts'), 'utf8');
    // Must compare the presented secret, not merely compute it.
    expect(content).toMatch(/timingSafeEqual/);
    expect(content).toMatch(/safeEqual\(/);
    expect(content).toMatch(/503/);
  });
});
