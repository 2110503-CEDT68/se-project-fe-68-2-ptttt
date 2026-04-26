import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.test') });

export default defineConfig({
  testDir: './tests',
  // 60s — Next.js dev mode can be slow on first compile of /authentication
  // and /campground/[id]; 30s was getting tripped on the second run
  // when other tests contend for the dev server.
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: `${process.env.FRONTEND_URL}`,
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
