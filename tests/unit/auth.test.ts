import { describe, it, expect } from 'vitest';
import {
  generateToken,
  parseAndVerifyToken,
  verifyToken,
  requireRole,
  requireFounder,
  requireProjectAccess,
  type AuthenticatedRequest,
} from '../../server/middleware/auth';

/**
 * Security regression tests for the authentication and authorization layer.
 *
 * These exist because the original codebase gated 28 privileged endpoints on a
 * client-supplied `x-role: founder` header, which any caller could forge.
 * The cases below lock in the correct behaviour so that pattern cannot return.
 */

function mockRes() {
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

function mockReq(overrides: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest {
  return {
    headers: {},
    params: {},
    query: {},
    method: 'GET',
    ...overrides,
  } as unknown as AuthenticatedRequest;
}

const founderUser = {
  user_id: 'founder_root_001',
  email: 'founder@neurona.test',
  name: 'Founder',
  role: 'founder' as const,
  credits: 999999,
  status_aktif: true,
};

const regularUser = {
  user_id: 'usr_regular_001',
  email: 'user@neurona.test',
  name: 'Regular',
  role: 'user' as const,
  credits: 100,
  status_aktif: true,
};

describe('JWT issuing and verification', () => {
  it('round-trips a session payload', () => {
    const token = generateToken(regularUser);
    const decoded = parseAndVerifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.user_id).toBe(regularUser.user_id);
    expect(decoded?.role).toBe('user');
  });

  it('accepts `uid` as an alias for user_id', () => {
    const token = generateToken({ uid: 'usr_alias_001', email: 'a@b.test', role: 'user' });
    const decoded = parseAndVerifyToken(token);
    expect(decoded?.user_id).toBe('usr_alias_001');
  });

  it('rejects a tampered token', () => {
    const token = generateToken(regularUser);
    const [header, payload, signature] = token.split('.');
    // Flip the role inside the payload without re-signing.
    const forgedPayload = Buffer.from(
      JSON.stringify({ ...regularUser, role: 'founder' })
    ).toString('base64url');
    expect(parseAndVerifyToken(`${header}.${forgedPayload}.${signature}`)).toBeNull();
  });

  it('rejects malformed and empty input', () => {
    expect(parseAndVerifyToken('')).toBeNull();
    expect(parseAndVerifyToken('not-a-jwt')).toBeNull();
    expect(parseAndVerifyToken('a.b.c')).toBeNull();
  });
});

describe('verifyToken middleware', () => {
  it('rejects a request with no token', async () => {
    const res = mockRes();
    let nextCalled = false;
    await verifyToken(mockReq(), res, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
  });

  it('rejects a forged token', async () => {
    const res = mockRes();
    let nextCalled = false;
    await verifyToken(
      mockReq({ headers: { authorization: 'Bearer forged.token.value' } as any }),
      res,
      () => {
        nextCalled = true;
      }
    );
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
  });

  it('accepts a valid token and populates req.user from the database', async () => {
    const token = generateToken(founderUser);
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } as any });
    const res = mockRes();
    let nextCalled = false;

    await verifyToken(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(req.user?.role).toBe('founder');
    expect(req.user?.user_id).toBe('founder_root_001');
  });

  it('accepts ?token= for GET requests so EventSource can authenticate', async () => {
    const token = generateToken(founderUser);
    const req = mockReq({ method: 'GET', query: { token } as any });
    const res = mockRes();
    let nextCalled = false;

    await verifyToken(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
  });

  it('does NOT accept ?token= on mutating methods', async () => {
    const token = generateToken(founderUser);
    const res = mockRes();
    let nextCalled = false;

    await verifyToken(
      mockReq({ method: 'POST', query: { token } as any }),
      res,
      () => {
        nextCalled = true;
      }
    );

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
  });
});

describe('requireRole middleware', () => {
  it('denies when no user is attached', () => {
    const res = mockRes();
    requireRole(['founder'])(mockReq(), res, () => {});
    expect(res.statusCode).toBe(401);
  });

  it('denies a user whose role is not allowed', () => {
    const res = mockRes();
    requireRole(['founder'])(mockReq({ user: regularUser }), res, () => {});
    expect(res.statusCode).toBe(403);
    expect(res.body?.error).toBe('FORBIDDEN_ROLE_ACCESS');
  });

  it('allows a user whose role is allowed', () => {
    const res = mockRes();
    let nextCalled = false;
    requireRole(['founder'])(mockReq({ user: founderUser }), res, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(true);
  });
});

describe('requireFounder guard', () => {
  it('is composed of verifyToken followed by the founder role check', () => {
    expect(Array.isArray(requireFounder)).toBe(true);
    expect(requireFounder).toHaveLength(2);
    expect(typeof requireFounder[0]).toBe('function');
    expect(typeof requireFounder[1]).toBe('function');
  });

  it('runs verification before the role check', async () => {
    const res = mockRes();
    let nextCalled = false;
    // No token at all: verifyToken (first entry) must stop the chain.
    await (requireFounder[0] as any)(mockReq(), res, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
  });
});

describe('requireProjectAccess middleware', () => {
  const ownedProject = { id: 'proj_1', userId: regularUser.user_id };
  const otherUsersProject = { id: 'proj_2', userId: 'usr_someone_else' };
  const getProject = (id: string) =>
    ({ proj_1: ownedProject, proj_2: otherUsersProject } as Record<string, any>)[id];

  const run = (req: AuthenticatedRequest) => {
    const res = mockRes();
    let nextCalled = false;
    requireProjectAccess(getProject)(
      req,
      res,
      () => {
        nextCalled = true;
      }
    );
    return { res, nextCalled };
  };

  it('rejects an unauthenticated caller', () => {
    const { res, nextCalled } = run(mockReq({ params: { id: 'proj_1' } as any }));
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
  });

  it('allows the owner', () => {
    const { nextCalled } = run(
      mockReq({ user: regularUser, params: { id: 'proj_1' } as any })
    );
    expect(nextCalled).toBe(true);
  });

  it('rejects a different authenticated user', () => {
    const { res, nextCalled } = run(
      mockReq({ user: regularUser, params: { id: 'proj_2' } as any })
    );
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.body?.error).toBe('FORBIDDEN_PROJECT_ACCESS');
  });

  it('allows a founder to access any project', () => {
    const { nextCalled } = run(
      mockReq({ user: founderUser, params: { id: 'proj_2' } as any })
    );
    expect(nextCalled).toBe(true);
  });

  it('returns 404 for a project that does not exist', () => {
    const { res, nextCalled } = run(
      mockReq({ user: regularUser, params: { id: 'missing' } as any })
    );
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(404);
  });

  it('allows access to legacy projects that carry no owner', () => {
    const legacy = (id: string) =>
      ({ proj_legacy: { id, userId: undefined } } as Record<string, any>)[id];
    const res = mockRes();
    let nextCalled = false;
    requireProjectAccess(legacy)(
      mockReq({ user: regularUser, params: { id: 'proj_legacy' } as any }),
      res,
      () => {
        nextCalled = true;
      }
    );
    expect(nextCalled).toBe(true);
  });

  it('reads :projectId as well as :id', () => {
    const { nextCalled } = run(
      mockReq({ user: regularUser, params: { projectId: 'proj_1' } as any })
    );
    expect(nextCalled).toBe(true);
  });
});
