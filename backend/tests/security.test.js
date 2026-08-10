import { describe, it, expect } from 'vitest';
import path from 'path';

// Import the functions directly — they're not exported from server.js,
// so we test them via the HTTP layer for traversal cases, and duplicate
// the logic here to document the expected contract.
// For direct unit tests we re-implement the same logic to verify behavior.

// Mirrors server.js implementation
function safeJoin(base, ...parts) {
  const resolved = path.resolve(base, ...parts);
  if (!resolved.startsWith(path.resolve(base) + path.sep) && resolved !== path.resolve(base)) {
    throw new Error('Path traversal detected');
  }
  return resolved;
}

function validateSegment(segment) {
  if (!segment || typeof segment !== 'string' || segment.includes('..') || segment.includes('/') || segment.includes('\\') || segment.trim() === '') {
    throw new Error('Invalid path segment');
  }
  return segment;
}

describe('validateSegment', () => {
  it('accepts valid names', () => {
    expect(validateSegment('my-project')).toBe('my-project');
    expect(validateSegment('project_123')).toBe('project_123');
    expect(validateSegment('snapshot-2024-01-01')).toBe('snapshot-2024-01-01');
  });

  it('rejects empty string', () => {
    expect(() => validateSegment('')).toThrow('Invalid path segment');
  });

  it('rejects whitespace-only string', () => {
    expect(() => validateSegment('   ')).toThrow('Invalid path segment');
  });

  it('rejects double-dot traversal', () => {
    expect(() => validateSegment('..')).toThrow('Invalid path segment');
    expect(() => validateSegment('foo..bar')).toThrow('Invalid path segment');
  });

  it('rejects forward slash', () => {
    expect(() => validateSegment('foo/bar')).toThrow('Invalid path segment');
  });

  it('rejects backslash', () => {
    expect(() => validateSegment('foo\\bar')).toThrow('Invalid path segment');
  });

  it('rejects null/undefined', () => {
    expect(() => validateSegment(null)).toThrow('Invalid path segment');
    expect(() => validateSegment(undefined)).toThrow('Invalid path segment');
  });
});

describe('safeJoin', () => {
  const base = '/app/projects';

  it('resolves a valid child path', () => {
    const result = safeJoin(base, 'my-project');
    expect(result).toBe(path.resolve(base, 'my-project'));
  });

  it('resolves nested valid path', () => {
    const result = safeJoin(base, 'my-project', 'emulator-data', 'snap1');
    expect(result.startsWith(path.resolve(base))).toBe(true);
  });

  it('throws on traversal via ..', () => {
    expect(() => safeJoin(base, '..', 'etc', 'passwd')).toThrow('Path traversal detected');
  });

  it('throws on absolute path injection', () => {
    expect(() => safeJoin(base, '/etc/passwd')).toThrow('Path traversal detected');
  });

  it('allows path equal to base itself', () => {
    expect(() => safeJoin(base)).not.toThrow();
  });
});
