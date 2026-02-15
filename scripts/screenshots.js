import puppeteer from 'puppeteer';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_URL = 'http://localhost:5173';
const SCREENSHOTS_DIR = './docs/screenshots';

let backendProcess, frontendProcess;

function startServers() {
  return new Promise((resolve) => {
    console.log('Starting backend...');
    backendProcess = spawn('npm', ['run', 'dev'], {
      cwd: join(__dirname, '../backend'),
      shell: true,
      stdio: 'ignore'
    });

    console.log('Starting frontend...');
    frontendProcess = spawn('npm', ['run', 'dev'], {
      cwd: join(__dirname, '../frontend'),
      shell: true,
      stdio: 'ignore'
    });

    console.log('Waiting for servers to start...');
    setTimeout(resolve, 10000);
  });
}

function stopServers() {
  if (backendProcess) backendProcess.kill();
  if (frontendProcess) frontendProcess.kill();
}

async function takeScreenshots() {
  if (!existsSync(SCREENSHOTS_DIR)) {
    await mkdir(SCREENSHOTS_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({ headless: false, defaultViewport: { width: 1920, height: 1080 } });
  const page = await browser.newPage();

  console.log('Taking screenshots...');

  // 1. Dashboard - initial state
  await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2' });
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/01-dashboard.png`, fullPage: true });
  console.log('✓ 1. Dashboard');

  // 2. Select "Create New Project" from dropdown
  await page.waitForSelector('select', { timeout: 5000 });
  await page.select('select', '__create_new__');
  await new Promise(r => setTimeout(r, 1000));

  // 3. Fill project name and select services
  await page.waitForSelector('input[placeholder="Enter project name"]');
  await page.type('input[placeholder="Enter project name"]', 'demo-project');
  
  const checkboxes = await page.$$('input[type="checkbox"]');
  for (let i = 0; i < Math.min(3, checkboxes.length); i++) {
    await checkboxes[i].click();
  }
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/02-project-setup.png` });
  console.log('✓ 2. Project Setup');

  // 4. Create project
  const createBtn = await page.$('button');
  if (createBtn) {
    await createBtn.click();
    await new Promise(r => setTimeout(r, 3000));
  }

  await page.waitForSelector('button', { timeout: 5000 }).catch(() => {});
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/03-project-created.png`, fullPage: true });
  console.log('✓ 3. Project Created');

  // 5. Start emulator
  const startBtn = await page.$$('button');
  for (const btn of startBtn) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('Start Emulator')) {
      await btn.hover();
      await new Promise(r => setTimeout(r, 300));
      await btn.click();
      console.log('✓ 4. Starting emulator (waiting 15s)...');
      await new Promise(r => setTimeout(r, 15000));
      break;
    }
  }

  // 6. Emulator running with logs
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/04-emulator-running.png`, fullPage: true });
  console.log('✓ 5. Emulator Running');

  // 7. Scroll to snapshots section
  await page.evaluate(() => {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.scrollTop = 800;
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/05-snapshots.png` });
  console.log('✓ 6. Snapshots Manager');

  // 8. Open rules editor
  await page.evaluate(() => {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.scrollTop = 0;
  });
  await new Promise(r => setTimeout(r, 500));
  
  const rulesButtons = await page.$$('button');
  for (const btn of rulesButtons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('firestore') || text.includes('Firestore')) {
      await btn.hover();
      await new Promise(r => setTimeout(r, 300));
      await btn.click();
      await new Promise(r => setTimeout(r, 2000));
      break;
    }
  }
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/06-rules-editor.png`, fullPage: true });
  console.log('✓ 7. Rules Editor');

  await browser.close();
  stopServers();
  console.log('\n✅ Screenshots saved to', SCREENSHOTS_DIR);
}

(async () => {
  await startServers();
  await takeScreenshots();
  process.exit(0);
})().catch((err) => {
  console.error(err);
  stopServers();
  process.exit(1);
});
