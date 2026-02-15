import jwt from 'jsonwebtoken';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tokensFile = path.join(__dirname, 'tokens.json');
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

// Initialize tokens file
export async function initAuth() {
  if (!existsSync(tokensFile)) {
    await writeFile(tokensFile, JSON.stringify([], null, 2));
  }
}

// Auth middleware
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Generate token (called from CLI)
export async function generateToken(username) {
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '365d' });
  
  const tokens = JSON.parse(await readFile(tokensFile, 'utf-8'));
  tokens.push({
    username,
    token,
    createdAt: new Date().toISOString()
  });
  await writeFile(tokensFile, JSON.stringify(tokens, null, 2));
  
  return token;
}

export { JWT_SECRET };
