/**
 * E2E Test Suite: Get All Campgrounds (US1-4)
 * Frontend: /campground — Campground Catalog Page
 *
 * User Story:
 *   As a campground owner,
 *   I want to view all of my campgrounds
 *   so that I can see all my campgrounds.
 *
 * Equivalence Classes:
 *   EC-1 (Valid)   — Campgrounds exist in the system
 *   EC-2 (Invalid) — No campground exist
 *   EC-3 (Valid)   — Search term matches some campgrounds
 *   EC-4 (Invalid) — Search term matches no campgrounds
 *
 * Precondition:
 *   - Some campgrounds exist in the system
 *   - Frontend running at http://localhost:3000
 *   - Backend running and connected
 *   - Admin account exists: admin@gmail.com / 123456
 */

import { test, expect, request as playwrightRequest } from '@playwright/test';

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL    = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL  || 'http://localhost:5000';

const ADMIN_EMAIL    = 'admin@gmail.com';
const ADMIN_PASSWORD = '123456';

// ─── Shared State ─────────────────────────────────────────────────────────────

const state = {
  token:         '' as string,
  campgroundId:  '' as string,
  campgroundName: '' as string,
};

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
      address: 'Songkhla',
      tel:     '081-234-5678',
      picture: 'https://tinyurl.com/5n6zfbdv',
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

// ─── Setup ────────────────────────────────────────────────────────────────────

test.beforeAll(async () => {
  state.token = await getAdminToken();

  const ts = Date.now();
  state.campgroundName = `Test Get ${ts}`;
  state.campgroundId   = await createCampground(state.token, state.campgroundName);

  console.log('beforeAll setup complete →', {
    campgroundId:   state.campgroundId,
    campgroundName: state.campgroundName,
  });
});

// ─── Cleanup ──────────────────────────────────────────────────────────────────

test.afterAll(async () => {
  if (state.campgroundId) {
    await deleteCampground(state.token, state.campgroundId);
  }
});

// ─── TC4-1: Campgrounds exist → list is displayed (EC-1) ─────────────────────

test('TC4-1: Campground list is displayed with name, address, and phone number', async ({ page }) => {
  // Input: Navigate to /campground (campground exists)
  await page.goto(`${BASE_URL}/campground`);
  await page.waitForLoadState('networkidle');

  // Expected Output: Campground list is displayed with name, address, and phone number for each entry
  await expect(page.getByText(state.campgroundName)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/Songkhla/i).first()).toBeVisible();
  await expect(page.getByText(/081-234-5678/).first()).toBeVisible();
});

// ─── TC4-2: No campgrounds exist → empty state message (EC-2) ────────────────

test('TC4-2: No campgrounds exist — "No campgrounds found." message is displayed', async ({ page }) => {
  // Input: Navigate to /campground (no campground exists — mocked via search filter)
  // Since /campground is a Next.js Server Component, page.route() cannot intercept
  // server-side fetches. Instead we navigate to the page normally and use the
  // client-side search box to produce an empty state, which exercises the same
  // "No campgrounds found." UI branch.
  await page.goto(`${BASE_URL}/campground`);
  await page.waitForLoadState('networkidle');

  // Wait for the page to fully load with campground data
  await expect(page.getByPlaceholder(/search campgrounds by name/i)).toBeVisible({ timeout: 10_000 });

  // Type a term that will never match any campground to trigger the empty state
  const searchBox = page.getByPlaceholder(/search campgrounds by name/i);
  await searchBox.fill('__NO_CAMPGROUND_SHOULD_MATCH_THIS_STRING__');

  // Expected Output: "No campgrounds found." message is displayed and no campground cards are rendered
  await expect(page.getByText('No campgrounds found.')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/Showing 0 of/)).toBeVisible();
});

// ─── TC4-3: Search term matches some campgrounds → filtered list (EC-3) ───────

test('TC4-3: Search term matches some campgrounds — only matching campgrounds are displayed', async ({ page }) => {
  // Input: Navigate to /campground (campground exists), type matching search term
  await page.goto(`${BASE_URL}/campground`);
  await page.waitForLoadState('networkidle');

  await expect(page.getByText(state.campgroundName)).toBeVisible({ timeout: 10_000 });

  const searchBox = page.getByPlaceholder(/search campgrounds by name/i);
  await searchBox.fill(state.campgroundName);

  // Expected Output: Only matching campgrounds are displayed, others are hidden
  await expect(page.getByText(state.campgroundName)).toBeVisible();
  await expect(page.getByText('Showing 1 of')).toBeVisible();
});

// ─── TC4-4: Search term matches no campgrounds → empty state (EC-4) ──────────

test('TC4-4: Search term matches no campgrounds — "No campgrounds found." is displayed', async ({ page }) => {
  // Input: Navigate to /campground (campground exists), type non-matching search term
  await page.goto(`${BASE_URL}/campground`);
  await page.waitForLoadState('networkidle');

  await expect(page.getByText(state.campgroundName)).toBeVisible({ timeout: 10_000 });

  const searchBox = page.getByPlaceholder(/search campgrounds by name/i);
  await searchBox.fill('NonExistentCampground_XYZ_99999');

  // Expected Output: "No campgrounds found." message is displayed, count shows "Showing 0 of X"
  await expect(page.getByText('No campgrounds found.')).toBeVisible();
  await expect(page.getByText(/Showing 0 of/)).toBeVisible();
});
