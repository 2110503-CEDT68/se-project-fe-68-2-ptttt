/**
 * E2E Test Suite: Pagination for Comments (US2-5)
 * Frontend: Campground Detail Page → Reviews Section
 *
 * Business Rule: Pagination controls appear only when total reviews > 5.
 *                Each page displays up to 5 reviews.
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

// ─── Shared State (set in beforeAll, read in tests) ───────────────────────────

const state = {
  token:        '' as string,
  campFiveId:   '' as string,  // exactly 5 reviews → no pagination shown
  campSevenId:  '' as string,  // 7 reviews         → pagination required
  campZeroId:   '' as string,  // 0 reviews          → empty state
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
      address: '1 Test Road, Chiang Mai',
      tel:     '0800000001',
      picture: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg',
    },
  });
  const json = await res.json();
  await api.dispose();
  if (!json.data?._id) throw new Error(`createCampground: failed for "${name}"`);
  return json.data._id as string;
}

async function createBooking(token: string, campgroundId: string): Promise<string> {
  const api = await playwrightRequest.newContext();
  const res = await api.post(`${BACKEND_URL}/api/v1/campgrounds/${campgroundId}/bookings`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { 
      bookingDate: '2025-07-01',
      nights: 2
    },
  });
  const json = await res.json();
  await api.dispose();
  
  if (!json.data?._id) {
    console.error('createBooking failed. Response:', JSON.stringify(json, null, 2));
    throw new Error(`createBooking: failed. Status: ${res.status()}, Response: ${JSON.stringify(json)}`);
  }
  return json.data._id as string;
}

async function postReview(token: string, campgroundId: string, bookingId: string, index: number): Promise<void> {
  const api = await playwrightRequest.newContext();
  await api.post(`${BACKEND_URL}/api/v1/campgrounds/${campgroundId}/reviews`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { 
      rating: (index % 5) + 1, 
      comment: `Test review number ${index + 1}`,
      booking: bookingId
    },
  });
  await api.dispose();
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

/** Navigate to the campground detail page and wait for the reviews section */
async function goToReviewsSection(page: Page, campgroundId: string): Promise<void> {
  await page.goto(`${BASE_URL}/campground/${campgroundId}`);
  // Wait for ReviewList component to render (it's always present, even with 0 reviews)
  await page.waitForLoadState('networkidle');
}

/** 
 * Review cards locator — target the parent container of each review
 * Each review is wrapped in a div with classes: flex gap-4 py-5 border-b
 */
function getReviewCards(page: Page) {
  return page.locator('div.flex.gap-4.py-5').filter({ has: page.locator('div[class*="rounded-full"]') });
}

// ─── Setup ────────────────────────────────────────────────────────────────────

test.beforeAll(async () => {
  state.token = await getAdminToken();

  const ts = Date.now();

  // Campground with exactly 5 reviews (threshold boundary)
  state.campFiveId = await createCampground(state.token, `PaginationTest-Five-${ts}`);
  createdCampgroundIds.push(state.campFiveId);
  for (let i = 0; i < 5; i++) {
    const bookingId = await createBooking(state.token, state.campFiveId);
    await postReview(state.token, state.campFiveId, bookingId, i);
  }

  // Campground with 7 reviews (over threshold → pagination required)
  state.campSevenId = await createCampground(state.token, `PaginationTest-Seven-${ts}`);
  createdCampgroundIds.push(state.campSevenId);
  for (let i = 0; i < 7; i++) {
    const bookingId = await createBooking(state.token, state.campSevenId);
    await postReview(state.token, state.campSevenId, bookingId, i);
  }

  // Campground with 0 reviews
  state.campZeroId = await createCampground(state.token, `PaginationTest-Zero-${ts}`);
  createdCampgroundIds.push(state.campZeroId);

  console.log('beforeAll setup complete →', {
    campFiveId:  state.campFiveId,
    campSevenId: state.campSevenId,
    campZeroId:  state.campZeroId,
  });
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

// ─── TC2-5-1: Exactly 5 reviews → all shown, no pagination ───────────────────

test('TC2-5-1: 5 reviews displayed on one page with no pagination controls', async ({ page }) => {
  await goToReviewsSection(page, state.campFiveId);

  // All 5 reviews visible
  const cards = getReviewCards(page);
  await expect(cards).toHaveCount(5, { timeout: 10_000 });

  // Pagination controls must NOT appear (threshold not exceeded)
  // Use a more specific selector that includes the border-t class
  const paginationContainer = page.locator('div.flex.items-center.justify-center.gap-2.border-t');
  await expect(paginationContainer).not.toBeVisible();
});

// ─── TC2-5-2: 7 reviews → pagination appears, page 1 has 5 reviews ───────────

test('TC2-5-2: 7 reviews trigger pagination; page 1 shows 5 reviews with Next enabled', async ({ page }) => {
  await goToReviewsSection(page, state.campSevenId);

  // Only 5 reviews on the first page
  const cards = getReviewCards(page);
  await expect(cards).toHaveCount(5, { timeout: 10_000 });

  // Pagination container should be visible
  // Use a more specific selector that includes the border-t class
  const paginationContainer = page.locator('div.flex.items-center.justify-center.gap-2.border-t');
  await expect(paginationContainer).toBeVisible();

  // Find the Previous button (has ChevronLeft icon, first button in container)
  const prevBtn = paginationContainer.locator('button').filter({ has: page.locator('svg.lucide-chevron-left') });
  await expect(prevBtn).toBeVisible();
  await expect(prevBtn).toBeDisabled(); // On page 1, Previous is disabled
  
  // Find the Next button (has ChevronRight icon, last button in container)
  const nextBtn = paginationContainer.locator('button').filter({ has: page.locator('svg.lucide-chevron-right') });
  await expect(nextBtn).toBeVisible();
  await expect(nextBtn).toBeEnabled(); // On page 1, Next is enabled
});

// ─── TC2-5-3: 0 reviews → empty message, no pagination ───────────────────────

test('TC2-5-3: No reviews shows empty-state message and no pagination controls', async ({ page }) => {
  await goToReviewsSection(page, state.campZeroId);

  // Empty-state message
  await expect(
    page.getByText(/no reviews yet|be the first/i),
  ).toBeVisible({ timeout: 10_000 });

  // No pagination controls
  const paginationContainer = page.locator('div.flex.items-center.justify-center.gap-2.border-t');
  await expect(paginationContainer).not.toBeVisible();
});

// ─── TC2-5-4: Click Next → page 2 shows remaining 2 reviews ──────────────────

test('TC2-5-4: Clicking Next navigates to page 2 showing remaining 2 reviews', async ({ page }) => {
  await goToReviewsSection(page, state.campSevenId);

  const cards = getReviewCards(page);

  // Confirm we start on page 1 (5 cards)
  await expect(cards).toHaveCount(5, { timeout: 10_000 });

  // Find pagination container
  const paginationContainer = page.locator('div.flex.items-center.justify-center.gap-2.border-t');
  
  // Find the Next button (ChevronRight)
  const nextBtn = paginationContainer.locator('button').filter({ has: page.locator('svg.lucide-chevron-right') });
  await nextBtn.click();

  // Wait for page transition and re-render
  await page.waitForTimeout(1000);

  // Only 2 remaining reviews on page 2
  await expect(cards).toHaveCount(2, { timeout: 10_000 });

  // On the last page: Next disabled, Previous enabled
  const prevBtn = paginationContainer.locator('button').filter({ has: page.locator('svg.lucide-chevron-left') });
  await expect(prevBtn).toBeEnabled();
  await expect(nextBtn).toBeDisabled();
});

// ─── TC2-5-5: Click Previous → back to page 1 with 5 reviews ─────────────────

test('TC2-5-5: Clicking Previous from page 2 returns to page 1 with 5 reviews', async ({ page }) => {
  await goToReviewsSection(page, state.campSevenId);

  const cards = getReviewCards(page);

  // Find pagination container
  const paginationContainer = page.locator('div.flex.items-center.justify-center.gap-2.border-t');
  
  // Navigate to page 2 first - click Next
  const nextBtn = paginationContainer.locator('button').filter({ has: page.locator('svg.lucide-chevron-right') });
  await nextBtn.click();
  await page.waitForTimeout(1000);
  await expect(cards).toHaveCount(2, { timeout: 10_000 });

  // Click Previous — back to page 1
  const prevBtn = paginationContainer.locator('button').filter({ has: page.locator('svg.lucide-chevron-left') });
  await prevBtn.click();
  await page.waitForTimeout(1000);
  await expect(cards).toHaveCount(5, { timeout: 10_000 });

  // Back on first page: Previous disabled, Next enabled
  await expect(prevBtn).toBeDisabled();
  await expect(nextBtn).toBeEnabled();
});

// ─── TC2-5-6: Out-of-range page via URL → graceful fallback ──────────────────

test('TC2-5-6: Requesting a non-existent page falls back gracefully without a crash', async ({ page }) => {
  await page.goto(`${BASE_URL}/campground/${state.campSevenId}?page=9999`);

  // The ReviewList component doesn't use URL query params for pagination
  // It uses client-side state, so invalid page params are ignored
  // The page should load normally and show page 1
  const cards = getReviewCards(page);
  await expect(cards).toHaveCount(5, { timeout: 10_000 });

  // The page must not be broken (no unhandled error boundary)
  await expect(page.getByText(/something went wrong|application error/i)).not.toBeVisible();
});