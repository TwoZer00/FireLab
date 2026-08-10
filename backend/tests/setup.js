import { initAuth, generateToken } from '../auth.js';
import { writeFile, rm } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use a temp dir for test data so we don't pollute real projects
export const TEST_PROJECTS_DIR = path.join(__dirname, '../firebase-projects-test');

// Patch projectsDir used by server — must happen before server import
process.env.TEST_PROJECTS_DIR = TEST_PROJECTS_DIR;

export let authToken;

export async function setupTestAuth() {
  await initAuth();
  authToken = await generateToken('test-user');
}

export async function cleanupTestProjects() {
  if (existsSync(TEST_PROJECTS_DIR)) {
    await rm(TEST_PROJECTS_DIR, { recursive: true, force: true });
  }
}
