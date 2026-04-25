/**
 * E2E Test Suite: Create Campground (US1-1)
 * Frontend: Admin Panel → Campgrounds tab → Create modal
 *
 * Prerequisites:
 * - Frontend running at http://localhost:3000
 * - Backend running and connected
 * - Admin account exists: admin@gmail.com / 123456
 */

import { test, expect, Page, request as playwrightRequest } from '@playwright/test';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = '123456';

// Track campground IDs created during tests for cleanup
const createdCampgroundIds: string[] = [];

const VALID_CAMPGROUND = {
  name: `Test Camp ${Date.now()}`, // unique name to avoid duplicate
  address: '123 Forest Road, Chiang Mai',
  tel: '0812345678',
  picture: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg',
};

/** Login as admin and navigate to admin campgrounds tab */
async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE_URL}/authentication`);
  // Use placeholder text that matches the actual HTML
  await page.getByPlaceholder('your@email.com').fill(ADMIN_EMAIL);
  await page.getByPlaceholder('••••••••').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(`${BASE_URL}/`);
}

/** Navigate to admin page and open Campgrounds tab */
async function goToCampgroundsTab(page: Page) {
  await page.goto(`${BASE_URL}/admin`);
  await page.getByRole('button', { name: /campgrounds/i }).click();
}

/** Open the Create Campground modal */
async function openCreateModal(page: Page) {
  await page.getByRole('button', { name: /add campground/i }).click();
  await expect(page.getByText('Create New Campground')).toBeVisible();
}

/** Fill the create form */
async function fillCreateForm(
  page: Page,
  data: { name?: string; address?: string; tel?: string; picture?: string }
) {
  if (data.name !== undefined) {
    await page.getByPlaceholder('e.g. Pine Valley Camp').fill(data.name);
  }
  if (data.address !== undefined) {
    await page.getByPlaceholder('e.g. 123 Forest Rd').fill(data.address);
  }
  if (data.tel !== undefined) {
    await page.getByPlaceholder('e.g. 053-123-456').fill(data.tel);
  }
  if (data.picture !== undefined) {
    await page.getByPlaceholder('https://example.com/image.jpg').fill(data.picture);
  }
}

/** Listen for POST /api/v1/campgrounds response and resolve with the created _id.
 *  Must be called BEFORE the action that triggers the POST request.
 */
async function captureCreatedCampgroundId(page: Page): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    let resolved = false;

    const responseHandler = async (response: any) => {
      if (resolved) return;
      if (response.url().includes('/api/v1/campgrounds') && response.request().method() === 'POST') {
        try {
          const json = await response.json();
          if (json.success && json.data?._id) {
            resolved = true;
            page.off('response', responseHandler);
            resolve(json.data._id);
          }
        } catch {
          // ignore parse errors
        }
      }
    };

    page.on('response', responseHandler);

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        page.off('response', responseHandler);
        console.warn('captureCreatedCampgroundId: timed out waiting for POST /api/v1/campgrounds response');
        resolve(null);
      }
    }, 10_000);
  });
}

// ─── Setup ────────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page);
  await goToCampgroundsTab(page);
});

// ─── Cleanup ──────────────────────────────────────────────────────────────────

test.afterAll(async () => {
  if (createdCampgroundIds.length === 0) {
    console.log('Cleanup: no campgrounds to delete');
    return;
  }

  console.log(`Cleanup: deleting ${createdCampgroundIds.length} campground(s):`, createdCampgroundIds);

  const apiContext = await playwrightRequest.newContext();

  const loginRes = await apiContext.post(`${BACKEND_URL}/api/v1/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const loginJson = await loginRes.json();
  const token = loginJson.token;

  if (!token) {
    console.warn('Cleanup: could not get admin token, skipping DB cleanup');
    await apiContext.dispose();
    return;
  }

  for (const id of createdCampgroundIds) {
    const res = await apiContext.delete(`${BACKEND_URL}/api/v1/campgrounds/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`Cleanup: deleted campground ${id} → status ${res.status()}`);
  }

  await apiContext.dispose();
});

// ─── TC-1: Create with valid data (Valid) ─────────────────────────────────────

test('TC-1: Create campground with valid data', async ({ page }) => {
  // Start capturing the API response BEFORE clicking create
  const idPromise = captureCreatedCampgroundId(page);

  await openCreateModal(page);
  await fillCreateForm(page, VALID_CAMPGROUND);
  await page.getByRole('button', { name: /create campground/i }).click();

  // Toast success should appear
  await expect(page.getByText(/created successfully/i)).toBeVisible();

  // Track created ID for cleanup
  const id = await idPromise;
  if (id) createdCampgroundIds.push(id);

  // Modal should close
  await expect(page.getByText('Create New Campground')).not.toBeVisible();

  // New campground should appear in the list
  await expect(page.getByText(VALID_CAMPGROUND.name)).toBeVisible();
});

// ─── TC-2: Missing name (Invalid) ────────────────────────────────────────────

test('TC-2: Missing campground name field', async ({ page }) => {
  await openCreateModal(page);
  await fillCreateForm(page, {
    name: '',
    address: VALID_CAMPGROUND.address,
    tel: VALID_CAMPGROUND.tel,
    picture: VALID_CAMPGROUND.picture,
  });

  await page.getByRole('button', { name: /create campground/i }).click();

  // Toast error should appear
  await expect(page.getByText(/campground name is required/i)).toBeVisible();

  // Modal should remain open
  await expect(page.getByText('Create New Campground')).toBeVisible();
});

// ─── TC-3: Missing address (Invalid) ─────────────────────────────────────────

test('TC-3: Missing address field', async ({ page }) => {
  await openCreateModal(page);
  await fillCreateForm(page, {
    name: VALID_CAMPGROUND.name,
    address: '',
    tel: VALID_CAMPGROUND.tel,
    picture: VALID_CAMPGROUND.picture,
  });

  await page.getByRole('button', { name: /create campground/i }).click();

  await expect(page.getByText(/address is required/i)).toBeVisible();
  await expect(page.getByText('Create New Campground')).toBeVisible();
});

// ─── TC-4: Missing phone number (Invalid) ────────────────────────────────────

test('TC-4: Missing phone number field', async ({ page }) => {
  await openCreateModal(page);
  await fillCreateForm(page, {
    name: VALID_CAMPGROUND.name,
    address: VALID_CAMPGROUND.address,
    tel: '',
    picture: VALID_CAMPGROUND.picture,
  });

  await page.getByRole('button', { name: /create campground/i }).click();

  await expect(page.getByText(/phone number is required/i)).toBeVisible();
  await expect(page.getByText('Create New Campground')).toBeVisible();
});

// ─── TC-5: Missing picture URL (Invalid) ─────────────────────────────────────

test('TC-5: Missing picture URL field', async ({ page }) => {
  await openCreateModal(page);
  await fillCreateForm(page, {
    name: VALID_CAMPGROUND.name,
    address: VALID_CAMPGROUND.address,
    tel: VALID_CAMPGROUND.tel,
    picture: '',
  });

  await page.getByRole('button', { name: /create campground/i }).click();

  await expect(page.getByText(/picture url is required/i)).toBeVisible();
  await expect(page.getByText('Create New Campground')).toBeVisible();
});

// ─── TC-6: Duplicate campground name (Invalid) ───────────────────────────────

test('TC-6: Duplicate campground name', async ({ page }) => {
  const duplicateName = `Duplicate Camp ${Date.now()}`;

  // Start capturing before the first create
  const idPromise = captureCreatedCampgroundId(page);

  // Create first campground
  await openCreateModal(page);
  await fillCreateForm(page, { ...VALID_CAMPGROUND, name: duplicateName });
  await page.getByRole('button', { name: /create campground/i }).click();
  await expect(page.getByText(/created successfully/i)).toBeVisible();

  // Track created ID for cleanup
  const id = await idPromise;
  if (id) createdCampgroundIds.push(id);

  // Try to create with same name
  await openCreateModal(page);
  await fillCreateForm(page, { ...VALID_CAMPGROUND, name: duplicateName });
  await page.getByRole('button', { name: /create campground/i }).click();

  // Should show error from API
  await expect(page.getByText(/already exists/i)).toBeVisible();

  // Modal should remain open
  await expect(page.getByText('Create New Campground')).toBeVisible();
});
