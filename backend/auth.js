import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Store auth files in persistent volume when available
const dataDir = existsSync(path.join(__dirname, 'firebase-projects'))
  ? path.join(__dirname, 'firebase-projects')
  : existsSync(path.join(__dirname, '../firebase-projects'))
    ? path.join(__dirname, '../firebase-projects')
    : __dirname;

const tokensFile = path.join(dataDir, '.tokens.json');
const secretFile = path.join(dataDir, '.jwt-secret');

let JWT_SECRET;
let tokensCache = null;

async function loadTokens() {
  tokensCache = JSON.parse(await readFile(tokensFile, 'utf-8'));
  return tokensCache;
}

export function invalidateTokensCache() {
  tokensCache = null;
}

// Load or generate JWT_SECRET
if (existsSync(secretFile)) {
  JWT_SECRET = await readFile(secretFile, 'utf-8');
} else {
  JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
  await writeFile(secretFile, JWT_SECRET);
}

// Initialize tokens file
export async function initAuth() {
  if (!existsSync(tokensFile)) {
    await writeFile(tokensFile, JSON.stringify([], null, 2));
  }
}

// Auth middleware
export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify token hasn't been revoked (use cache to avoid disk read per request)
    const tokens = tokensCache || await loadTokens();
    if (tokens.length === 0) {
      return res.status(401).json({ error: 'Token revoked' });
    }
    const suffix = token.slice(-20);
    const matches = await Promise.all(tokens.map(t => bcrypt.compare(suffix, t.tokenHash)));
    if (!matches.some(Boolean)) {
      return res.status(401).json({ error: 'Token revoked' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Check if a username already has a token
export async function checkUsernameExists(username) {
  const tokens = JSON.parse(await readFile(tokensFile, 'utf-8'));
  return tokens.some(t => t.username === username);
}

// Generate token (called from CLI)
export async function generateToken(username) {
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '365d' });
  const tokenHash = await bcrypt.hash(token.slice(-20), 10);
  
  const tokens = JSON.parse(await readFile(tokensFile, 'utf-8'));
  tokens.push({
    username,
    tokenHash,
    createdAt: new Date().toISOString()
  });
  await writeFile(tokensFile, JSON.stringify(tokens, null, 2));
  invalidateTokensCache();
  
  return token;
}

export { JWT_SECRET, tokensFile };
