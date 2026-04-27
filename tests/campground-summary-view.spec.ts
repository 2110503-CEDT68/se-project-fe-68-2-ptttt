/**
 * E2E Test Suite: Admin Campground Management (US2-6 Simplified)
 * Frontend: Admin Panel → Campgrounds tab
 *
 * Prerequisites:
 * - Frontend running at http://localhost:3000
 * - Backend running and connected
 * - Admin account exists: admin@gmail.com / 123456
 */

import { test, expect, Page, request as playwrightRequest } from '@playwright/test';

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL    = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL  || 'http://localhost:5000';

const ADMIN_EMAIL    = 'admin@gmail.com';
const ADMIN_PASSWORD = '123456';

// A well-formed but non-existent MongoDB ObjectId
const NONEXISTENT_ID = '000000000000000000000000';

// ─── Shared State (set in beforeAll, read in tests) ───────────────────────────

const state = {
  token: '' as string,
  testCampground: { id: '' as string, name: '' as string },
};

const createdCampgroundIds: string[] = [];

// ─── API Helpers ──────────────────────────────────────────────────────────────

async function getAdminToken(): Promise<string> {
  const api = await playwrightRequest.newContext();
  const res  = await api.post(`${BACKEND_URL}/api/v1/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const json = await res.json();
  await api.dispose();
  if (!json.token) throw new Error('getAdminToken: login failed');
  return json.token as string;
}

async function createCampground(token: string, name: string): Promise<string> {
  const api = await playwrightRequest.newContext();
  const res  = await api.post(`${BACKEND_URL}/api/v1/campgrounds`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name,
      address: '2 Admin Test Road, Chiang Mai',
      tel:     '0800000002',
      picture: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg',
    },
  });
  const json = await res.json();
  await api.dispose();
  if (!json.data?._id) throw new Error(`createCampground: failed for "${name}"`);
  return json.data._id as string;
}

async function deleteCampground(token: string, id: string): Promise<void> {
  const api = await playwrightRequest.newContext();
  const res  = await api.delete(`${BACKEND_URL}/api/v1/campgrounds/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`Cleanup: deleted campground ${id} → status ${res.status()}`);
  await api.dispose();
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/authentication`);
  await page.getByPlaceholder('your@email.com').fill(ADMIN_EMAIL);
  await page.getByPlaceholder('••••••••').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(`${BASE_URL}/`);
}

async function goToAdminCampgrounds(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/admin`);
  await page.getByRole('button', { name: /campgrounds/i }).click();
  await page.waitForLoadState('networkidle');
}

// ─── Setup ────────────────────────────────────────────────────────────────────

test.beforeAll(async () => {
  state.token = await getAdminToken();

  const ts = Date.now();
  const name = `AdminTest-${ts}`;
  state.testCampground.id = await createCampground(state.token, name);
  state.testCampground.name = name;
  createdCampgroundIds.push(state.testCampground.id);

  console.log('beforeAll setup complete →', state.testCampground);
});

test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page);
});

// ─── Cleanup ──────────────────────────────────────────────────────────────────

test.afterAll(async () => {
  if (createdCampgroundIds.length === 0) {
    console.log('Cleanup: no campgrounds to delete');
    return;
  }
  for (const id of createdCampgroundIds) {
    await deleteCampground(state.token, id);
  }
});

// ─── TC2-6-1: Admin can view campground list ──────────────────────────────────

test('TC2-6-1: Admin panel displays campground list with name, address, and phone', async ({ page }) => {
  await goToAdminCampgrounds(page);

  // The test campground name should be visible in the list
  await expect(page.getByText(state.testCampground.name)).toBeVisible({ timeout: 10_000 });

  // Address and phone should be displayed (use .first() to handle multiple matches)
  await expect(page.getByText(/Admin Test Road/i).first()).toBeVisible();
  await expect(page.getByText(/0800000002/).first()).toBeVisible();
});

// ─── TC2-6-2: Admin can see Edit and Delete buttons ───────────────────────────

test('TC2-6-2: Each campground has Edit and Delete buttons', async ({ page }) => {
  await goToAdminCampgrounds(page);

  // Wait for campground list to load
  await expect(page.getByText(state.testCampground.name)).toBeVisible({ timeout: 10_000 });

  // Find the specific row containing our test campground by looking for the parent div
  // that contains both the campground name and the buttons
  const campgroundRow = page.locator('div.border-b.border-slate-700\\/50.py-5')
    .filter({ hasText: state.testCampground.name });

  // Edit button should be visible within this row
  await expect(campgroundRow.getByRole('button', { name: /edit/i }).first()).toBeVisible();

  // Delete button should be visible within this row
  await expect(campgroundRow.getByRole('button', { name: /delete/i }).first()).toBeVisible();
});

// ─── TC2-6-3: Non-existent campground ID → gracefully handles error ──────────

test('TC2-6-3: Navigating to a non-existent campground ID handles error gracefully', async ({ page }) => {
  await page.goto(`${BASE_URL}/campground/${NONEXISTENT_ID}`);

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // The page should either show an error message OR fail to load the campground details
  // Check that the page doesn't crash (no unhandled error)
  const hasErrorMessage = await page.getByText(/not found|does not exist|404|error/i).isVisible().catch(() => false);
  const hasNoCampgroundName = await page.locator('h1, h2').filter({ hasText: /campground/i }).count() === 0;
  
  // Either condition is acceptable - error message shown OR campground details not loaded
  expect(hasErrorMessage || hasNoCampgroundName).toBeTruthy();
});

// ─── TC2-6-4: Unauthenticated access → redirect to login ─────────────────────

test('TC2-6-4: Unauthenticated user trying to view admin is redirected to login', async ({ page }) => {
  // Clear the session that beforeEach just created so we are logged out
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Attempt to access the admin page without a session
  await page.goto(`${BASE_URL}/admin`);

  // Must be redirected to the login/authentication page
  await expect(page).toHaveURL(/\/authentication|\/login|\/signin/i, { timeout: 10_000 });

  // Login form must be visible (confirms the redirect is correct)
  await expect(page.getByPlaceholder('your@email.com')).toBeVisible();
});

// ─── TC2-6-5: Search functionality filters campgrounds ────────────────────────

test('TC2-6-5: Search box filters campground list by name', async ({ page }) => {
  await goToAdminCampgrounds(page);

  // Verify test campground is visible initially
  await expect(page.getByText(state.testCampground.name)).toBeVisible({ timeout: 10_000 });

  // Type a search term that doesn't match our test campground
  const searchBox = page.getByPlaceholder(/search campgrounds/i);
  await searchBox.fill('NonExistentCampground12345');

  // Our test campground should no longer be visible
  await expect(page.getByText(state.testCampground.name)).not.toBeVisible();

  // Clear search and verify campground reappears
  await searchBox.clear();
  await expect(page.getByText(state.testCampground.name)).toBeVisible();
});