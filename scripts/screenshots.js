import puppeteer from 'puppeteer';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';

const FRONTEND_URL = 'http://localhost:5173';
const SCREENSHOTS_DIR = './docs/screenshots';

async function takeScreenshots() {
  if (!existsSync(SCREENSHOTS_DIR)) {
    await mkdir(SCREENSHOTS_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({ headless: false, defaultViewport: { width: 1920, height: 1080 } });
  const page = await browser.newPage();

  console.log('Taking screenshots...');

  await page.goto(FRONTEND_URL);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/dashboard.png`, fullPage: true });
  console.log('✓ Dashboard');

  await browser.close();
  console.log('\n✅ Screenshots saved to', SCREENSHOTS_DIR);
}

takeScreenshots().catch(console.error);
