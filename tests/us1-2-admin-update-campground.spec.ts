/**
 * E2E Test Suite: Update Campground (US1-2)
 * Frontend: Admin Panel → Campgrounds tab → Edit campground row
 *
 * Prerequisites:
 * - Frontend running at http://localhost:3000
 * - Backend running and connected
 * - Admin account exists: admin@gmail.com / 123456
 *
 * Cleanup contract: this suite deletes ONLY the data it created (campgrounds).
 * It never drops the database.
 */

import { test, expect, Page, request as playwrightRequest, APIRequestContext } from '@playwright/test';

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = '123456';

// ─── Resource tracking ───────────────────────────────────────────────────────

let adminToken = '';
const createdCampgroundIds: string[] = [];

// ─── API helpers ─────────────────────────────────────────────────────────────

async function apiLogin(email: string, password: string): Promise<string> {
  // One-shot context so the BE Set-Cookie doesn't persist into a follow-up
  // login (the BE's "already logged in" cookie check would reject it).
  const ctx = await playwrightRequest.newContext();
  try {
    const res = await ctx.post(`${BACKEND_URL}/api/v1/auth/login`, {
      data: { email, password },
    });
    const json = await res.json();
    if (!json.token) throw new Error(`Login failed for ${email}: ${JSON.stringify(json)}`);
    return json.token;
  } finally {
    await ctx.dispose();
  }
}

async function apiCreateCampground(
  api: APIRequestContext,
  token: string,
  name: string,
): Promise<string> {
  const res = await api.post(`${BACKEND_URL}/api/v1/campgrounds`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name,
      address: 'Songkhla',
      tel: '081-234-5678',
      picture: 'https://tinyurl.com/5n6zfbdv',
    },
  });
  const json = await res.json();
  if (!json.success) throw new Error(`Create campground failed: ${JSON.stringify(json)}`);
  return json.data._id;
}

// ─── UI helpers ──────────────────────────────────────────────────────────────

async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE_URL}/authentication`);
  await page.getByPlaceholder('your@email.com').fill(ADMIN_EMAIL);
  await page.getByPlaceholder('••••••••').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(`${BASE_URL}/`);
}

async function gotoCampgroundsTab(page: Page) {
  await page.goto(`${BASE_URL}/admin`);
  await page.getByRole('button', { name: /campgrounds/i }).click();
}

/**
 * Locate the row for a specific campground by its name.
 *
 * Important: do NOT use `page.locator('div').filter({ hasText: name }).first()`.
 * That matches every <div> ancestor that contains the name, including the
 * outer list container — which leaks every Edit button on the page into the
 * locator (strict-mode violation when the DB has multiple campgrounds).
 *
 * Instead, anchor on the <h2> that renders the campground name, then walk
 * up to the closest `border-b` row wrapper.
 */
function findRow(page: Page, name: string) {
  const heading = page.locator('h2.text-white.font-semibold', { hasText: name });
  return heading.locator('xpath=ancestor::div[contains(@class, "border-b")][1]');
}

async function clickEdit(page: Page, name: string) {
  const row = findRow(page, name);
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: /^edit$/i }).click();
}

async function fillEditField(page: Page, placeholder: string, value: string) {
  const input = page.getByPlaceholder(placeholder, { exact: true });
  await input.fill(value);
}

async function clickSave(page: Page) {
  await page.getByRole('button', { name: /^save$/i }).click();
}

async function clickCancel(page: Page) {
  await page.getByRole('button', { name: /^cancel$/i }).click();
}

// ─── Setup / Teardown ────────────────────────────────────────────────────────

test.beforeAll(async () => {
  adminToken = await apiLogin(ADMIN_EMAIL, ADMIN_PASSWORD);
});

test.afterAll(async () => {
  const api = await playwrightRequest.newContext();
  try {
    for (const id of createdCampgroundIds) {
      const res = await api.delete(`${BACKEND_URL}/api/v1/campgrounds/${id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      console.log(`Cleanup: delete campground ${id} → ${res.status()}`);
    }
  } finally {
    await api.dispose();
  }
});

/**
 * Helper that creates a fresh campground with a unique name for the current
 * test. Returns the name. Each test owns its own campground so they cannot
 * interfere with each other when run in parallel.
 */
async function freshCampground(): Promise<string> {
  const name = `Test Update ${Date.now()}`;
  const api = await playwrightRequest.newContext();
  try {
    const id = await apiCreateCampground(api, adminToken, name);
    createdCampgroundIds.push(id);
    return name;
  } finally {
    await api.dispose();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 1 — Valid update
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC2-1: Update all fields with valid data (Valid) ────────────────────────

test('TC2-1: Update campground with all valid fields', async ({ page }) => {
  const original = await freshCampground();
  const updated = `${original} V2`;

  await loginAsAdmin(page);
  await gotoCampgroundsTab(page);

  await clickEdit(page, original);
  await fillEditField(page, 'Name', updated);
  await fillEditField(page, 'Address', 'Songkhla, Thailand');
  await fillEditField(page, 'Tel', '081-234-9876');
  await fillEditField(page, 'Picture URL', 'https://tinyurl.com/5n6zfbdv');
  await clickSave(page);

  await expect(page.getByText(/updated successfully/i)).toBeVisible();
  // The new name should now appear in the list
  await expect(page.locator('h2.text-white.font-semibold', { hasText: updated })).toBeVisible();
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 2 — Required-field validation
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC2-2: Empty name field (Invalid) ───────────────────────────────────────

test('TC2-2: Update campground with empty name field', async ({ page }) => {
  const original = await freshCampground();

  await loginAsAdmin(page);
  await gotoCampgroundsTab(page);

  await clickEdit(page, original);
  await fillEditField(page, 'Name', '');
  await clickSave(page);

  await expect(page.getByText(/campground name is required/i)).toBeVisible();
  // Edit form stays open — Save button still visible
  await expect(page.getByRole('button', { name: /^save$/i })).toBeVisible();
});

// ─── TC2-3: Empty address field (Invalid) ────────────────────────────────────

test('TC2-3: Update campground with empty address field', async ({ page }) => {
  const original = await freshCampground();

  await loginAsAdmin(page);
  await gotoCampgroundsTab(page);

  await clickEdit(page, original);
  await fillEditField(page, 'Address', '');
  await clickSave(page);

  await expect(page.getByText(/address is required/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /^save$/i })).toBeVisible();
});

// ─── TC2-4: Empty phone number field (Invalid) ───────────────────────────────

test('TC2-4: Update campground with empty phone number field', async ({ page }) => {
  const original = await freshCampground();

  await loginAsAdmin(page);
  await gotoCampgroundsTab(page);

  await clickEdit(page, original);
  await fillEditField(page, 'Tel', '');
  await clickSave(page);

  await expect(page.getByText(/phone number is required/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /^save$/i })).toBeVisible();
});

// ─── TC2-5: Empty picture URL field (Invalid) ────────────────────────────────

test('TC2-5: Update campground with empty picture URL field', async ({ page }) => {
  const original = await freshCampground();

  await loginAsAdmin(page);
  await gotoCampgroundsTab(page);

  await clickEdit(page, original);
  await fillEditField(page, 'Picture URL', '');
  await clickSave(page);

  await expect(page.getByText(/picture url is required/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /^save$/i })).toBeVisible();
});
