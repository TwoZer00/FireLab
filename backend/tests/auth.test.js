import { describe, it, expect, beforeEach } from 'vitest';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

import { initAuth, generateToken, checkUsernameExists, authMiddleware, invalidateTokensCache, tokensFile } from '../auth.js';

async function resetTokens(contents = []) {
  invalidateTokensCache();
  await mkdir(path.dirname(tokensFile), { recursive: true });
  await writeFile(tokensFile, JSON.stringify(contents, null, 2));
}

function mockRes() {
  const res = { statusCode: null, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

function mockReq(token) {
  return { headers: { authorization: token ? `Bearer ${token}` : undefined } };
}

describe('authMiddleware', () => {
  beforeEach(async () => {
    await initAuth();
  });

  it('rejects when no authorization header', async () => {
    const req = { headers: {} };
    const res = mockRes();
    await authMiddleware(req, res, () => {});
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('No token provided');
  });

  it('rejects when tokens.json is empty (all revoked)', async () => {
    await resetTokens([]);
    const token = await generateToken('temp-user');
    await resetTokens([]); // revoke after generating
    const req = mockReq(token);
    const res = mockRes();
    await authMiddleware(req, res, () => {});
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Token revoked');
  });

  it('rejects a valid JWT whose hash is not in tokens.json', async () => {
    // Generate token, then wipe tokens.json so hash is gone
    const token = await generateToken('ghost-user');
    await resetTokens([]);
    const req = mockReq(token);
    const res = mockRes();
    await authMiddleware(req, res, () => {});
    expect(res.statusCode).toBe(401);
  });

  it('calls next() for a valid, non-revoked token', async () => {
    await resetTokens([]);
    const token = await generateToken('valid-user');
    const req = mockReq(token);
    const res = mockRes();
    let nextCalled = false;
    await authMiddleware(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(req.user.username).toBe('valid-user');
  });
});

describe('checkUsernameExists', () => {
  beforeEach(async () => {
    await resetTokens([]);
  });

  it('returns false when no tokens exist', async () => {
    expect(await checkUsernameExists('nobody')).toBe(false);
  });

  it('returns true when username has a token', async () => {
    await generateToken('alice');
    expect(await checkUsernameExists('alice')).toBe(true);
  });

  it('returns false for a different username', async () => {
    await generateToken('alice');
    expect(await checkUsernameExists('bob')).toBe(false);
  });
});

describe('generateToken', () => {
  beforeEach(async () => {
    await resetTokens([]);
  });

  it('returns a JWT string', async () => {
    const token = await generateToken('user1');
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('appends entry to tokens.json', async () => {
    await generateToken('user2');
    const tokens = JSON.parse(await import('fs/promises').then(fs => fs.readFile(tokensFile, 'utf-8')));
    expect(tokens.some(t => t.username === 'user2')).toBe(true);
  });

  it('multiple tokens for same username are allowed', async () => {
    await generateToken('multi');
    await generateToken('multi');
    const tokens = JSON.parse(await import('fs/promises').then(fs => fs.readFile(tokensFile, 'utf-8')));
    expect(tokens.filter(t => t.username === 'multi')).toHaveLength(2);
  });
});
