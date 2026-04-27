/**
 * E2E Test Suite: Delete Campground (US1-3)
 * Frontend: Admin Panel → Campgrounds tab → Delete confirmation modal
 *
 * Preconditions:
 * - Frontend running at http://localhost:3000
 * - Backend running and connected
 * - Admin account: admin@gmail.com / 123456
 * - Campground "Samila Beach" is created via API before each test
 *   and cleaned up via API after each test
 *
 * Equivalence Classes:
 *   Class 1 (Valid)   — Correct name typed  → deletion succeeds
 *   Class 2 (Invalid) — Wrong name typed    → Delete button disabled
 *   Class 3 (Invalid) — Empty input         → Delete button disabled
 *   Class 4 (Invalid) — Partial name typed  → Delete button disabled
 */

import { test, expect, Page, request as playwrightRequest } from '@playwright/test';

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL    = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL  || 'http://localhost:5000';

const ADMIN_EMAIL    = 'admin@gmail.com';
const ADMIN_PASSWORD = '123456';

const CAMPGROUND_NAME = 'Samila Beach';

// ─── API Helpers ──────────────────────────────────────────────────────────────

async function getAdminToken(): Promise<string> {
  const ctx = await playwrightRequest.newContext();
  const res  = await ctx.post(`${BACKEND_URL}/api/v1/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const { token } = await res.json();
  await ctx.dispose();
  return token;
}

/** Create "Samila Beach" via API and return its _id */
async function createSamilaBeach(): Promise<string> {
  const token = await getAdminToken();
  const ctx   = await playwrightRequest.newContext();
  const res   = await ctx.post(`${BACKEND_URL}/api/v1/campgrounds`, {
    data: {
      name:    CAMPGROUND_NAME,
      address: 'Songkhla',
      tel:     '081-234-5678',
      picture: 'https://tinyurl.com/5n6zfbdv',
    },
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  await ctx.dispose();
  return json.data?._id;
}

/** Delete campground by ID via API (cleanup) */
async function deleteCampgroundById(id: string) {
  if (!id) return;
  const token = await getAdminToken();
  const ctx   = await playwrightRequest.newContext();
  await ctx.delete(`${BACKEND_URL}/api/v1/campgrounds/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await ctx.dispose();
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE_URL}/authentication`);
  await page.getByPlaceholder('your@email.com').fill(ADMIN_EMAIL);
  await page.getByPlaceholder('••••••••').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(`${BASE_URL}/`);
}

async function goToCampgroundsTab(page: Page) {
  await page.goto(`${BASE_URL}/admin`);
  await page.getByRole('button', { name: /campgrounds/i }).click();
}

/** Open the delete confirmation modal for "Samila Beach" */
async function openDeleteModal(page: Page) {
  // Locate the specific campground card by its heading, then find the Delete button within it
  const card = page.locator('[data-testid^="campground-card-"]').filter({
    has: page.getByRole('heading', { name: CAMPGROUND_NAME, exact: true }),
  });
  await card.getByRole('button', { name: /delete/i }).click();
  await expect(page.getByText('Delete Campground')).toBeVisible();
}

// ─── Per-test state ───────────────────────────────────────────────────────────

let campgroundId: string;

test.beforeEach(async ({ page }) => {
  campgroundId = await createSamilaBeach();
  await loginAsAdmin(page);
  await goToCampgroundsTab(page);
});

test.afterEach(async () => {
  // Cleanup: no-op if TC-1 already deleted via UI (API returns 400, ignored)
  await deleteCampgroundById(campgroundId);
});

// ─── TC3-1: Correct name typed (Class 1 — Valid) ─────────────────────────────

test('TC3-1: Correct name typed → deletion succeeds', async ({ page }) => {
  await openDeleteModal(page);

  await page.getByPlaceholder('Type campground name to confirm').fill(CAMPGROUND_NAME);

  // Delete button must be enabled when name matches exactly
  const deleteBtn = page.getByRole('button', { name: /^delete$/i }).last();
  await expect(deleteBtn).toBeEnabled();

  await deleteBtn.click();

  // Toast confirms deletion
  await expect(
    page.getByText(new RegExp(`${CAMPGROUND_NAME}.*deleted|deleted.*${CAMPGROUND_NAME}`, 'i'))
  ).toBeVisible();

  // Campground no longer visible in the list
  await expect(page.getByRole('heading', { name: CAMPGROUND_NAME, exact: true })).not.toBeVisible();
});

// ─── TC3-2: Wrong name typed (Class 2 — Invalid) ─────────────────────────────

test('TC3-2: Wrong name typed → Delete button stays disabled', async ({ page }) => {
  await openDeleteModal(page);

  // Type a completely different name
  await page.getByPlaceholder('Type campground name to confirm').fill('Phuket Beach');

  const deleteBtn = page.getByRole('button', { name: /^delete$/i }).last();
  await expect(deleteBtn).toBeDisabled();
});

// ─── TC3-3: Empty input (Class 3 — Invalid) ──────────────────────────────────

test('TC3-3: Empty input → Delete button stays disabled', async ({ page }) => {
  await openDeleteModal(page);

  // Input is empty by default — button must be disabled immediately
  const deleteBtn = page.getByRole('button', { name: /^delete$/i }).last();
  await expect(deleteBtn).toBeDisabled();
});

// ─── TC3-4: Partial name typed (Class 4 — Invalid) ───────────────────────────

test('TC3-4: Partial name "Samila" typed → Delete button stays disabled', async ({ page }) => {
  await openDeleteModal(page);

  // "Samila" is a prefix of "Samila Beach" but not the full name
  await page.getByPlaceholder('Type campground name to confirm').fill('Samila');

  const deleteBtn = page.getByRole('button', { name: /^delete$/i }).last();
  await expect(deleteBtn).toBeDisabled();
});
