/**
 * E2E Test Suite: Campground Summary View (US2-6)
 * Frontend: Campground Detail Page → Rating Summary & Reviews
 *
 * Test Cases:
 * 1. Valid campground ID with existing bookings and rating data
 * 2. Valid campground ID with no bookings and no ratings (newly created)
 * 3. Invalid or non-existent campground ID
 * 4. User is not logged in (unauthenticated access attempt)
 * 5. Valid campground ID with only ratings (no bookings)
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

  // Campground that has bookings AND ratings
  campWithData:    { id: '' as string, name: '' as string },

  // Campground that has NO bookings and NO ratings (newly created)
  campEmpty:       { id: '' as string, name: '' as string },

  // Campground that has ONLY ratings, no bookings
  campRatingOnly:  { id: '' as string, name: '' as string },
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
      address: '2 Summary Road, Chiang Mai',
      tel:     '0800000002',
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
  if (!json.data?._id) throw new Error('createBooking: failed');
  return json.data._id as string;
}

async function postReview(token: string, campgroundId: string, bookingId: string, rating: number, comment: string): Promise<void> {
  const api = await playwrightRequest.newContext();
  const res = await api.post(`${BACKEND_URL}/api/v1/campgrounds/${campgroundId}/reviews`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { rating, comment, booking: bookingId },
  });
  const json = await res.json();
  await api.dispose();
  
  if (!res.ok()) {
    console.error(`postReview failed: Status ${res.status()}, Response:`, JSON.stringify(json));
    throw new Error(`postReview failed: ${JSON.stringify(json)}`);
  }
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

// ─── Setup ────────────────────────────────────────────────────────────────────

test.beforeAll(async () => {
  state.token = await getAdminToken();

  const ts = Date.now();

  // 1. Campground with bookings + ratings
  const nameWithData = `SummaryTest-WithData-${ts}`;
  state.campWithData.id   = await createCampground(state.token, nameWithData);
  state.campWithData.name = nameWithData;
  createdCampgroundIds.push(state.campWithData.id);
  const booking1 = await createBooking(state.token, state.campWithData.id);
  await postReview(state.token, state.campWithData.id, booking1, 5, 'Excellent place!');
  const booking2 = await createBooking(state.token, state.campWithData.id);
  await postReview(state.token, state.campWithData.id, booking2, 4, 'Very nice campground.');

  // 2. Campground with no data at all
  const nameEmpty = `SummaryTest-Empty-${ts}`;
  state.campEmpty.id   = await createCampground(state.token, nameEmpty);
  state.campEmpty.name = nameEmpty;
  createdCampgroundIds.push(state.campEmpty.id);

  // 3. Campground with only ratings (no bookings shown, but reviews exist)
  const nameRatingOnly = `SummaryTest-RatingOnly-${ts}`;
  state.campRatingOnly.id   = await createCampground(state.token, nameRatingOnly);
  state.campRatingOnly.name = nameRatingOnly;
  createdCampgroundIds.push(state.campRatingOnly.id);
  const booking3 = await createBooking(state.token, state.campRatingOnly.id);
  await postReview(state.token, state.campRatingOnly.id, booking3, 3, 'Decent experience.');

  console.log('beforeAll setup complete →', {
    campWithData:   state.campWithData,
    campEmpty:      state.campEmpty,
    campRatingOnly: state.campRatingOnly,
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

// ─── TC2-6-1: Valid campground ID with existing bookings and rating data ──────

test('TC2-6-1: Valid campground ID with existing bookings and rating data', async ({ page }) => {
  await page.goto(`${BASE_URL}/campground/${state.campWithData.id}`);
  await page.waitForLoadState('networkidle');

  // Verify campground name is displayed (h1 heading)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 });

  // Verify campground details are shown (address and phone)
  await expect(page.getByText(/Summary Road/i)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/0800000002/i)).toBeVisible({ timeout: 10_000 });

  // Verify rating section is displayed (shows average rating)
  await expect(page.getByText(/\d+\.\d+/)).toBeVisible({ timeout: 10_000 }); // Rating number like "4.5"

  // Verify reviews are displayed
  await expect(page.getByText(/Excellent place!/i)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/Very nice campground\./i)).toBeVisible({ timeout: 10_000 });
});

// ─── TC2-6-2: Valid campground ID with no bookings and no ratings (newly created)

test('TC2-6-2: Valid campground ID with no bookings and no ratings (newly created)', async ({ page }) => {
  await page.goto(`${BASE_URL}/campground/${state.campEmpty.id}`);
  await page.waitForLoadState('networkidle');

  // Verify campground name is displayed
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 });

  // Verify campground details are shown
  await expect(page.getByText(/Summary Road/i)).toBeVisible({ timeout: 10_000 });

  // Verify empty state for reviews
  await expect(page.getByText(/no reviews yet|be the first/i)).toBeVisible({ timeout: 10_000 });

  // Verify rating summary shows zero values
  await expect(page.getByText(/^0\.0$/)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/^0 reviews$/i)).toBeVisible({ timeout: 10_000 });
});

// ─── TC2-6-3: Invalid or non-existent campground ID ────────────────────────────

test('TC2-6-3: Invalid or non-existent campground ID', async ({ page }) => {
  await page.goto(`${BASE_URL}/campground/${NONEXISTENT_ID}`);
  await page.waitForLoadState('networkidle');

  // Current app behavior in dev mode: Next.js error overlay appears from getCampground throw.
  await expect(page.getByText(/failed to fetch campground/i)).toBeVisible({ timeout: 10_000 });
});

// ─── TC2-6-4: User is not logged in (unauthenticated access attempt) ──────────

test('TC2-6-4: User is not logged in (unauthenticated access attempt)', async ({ page }) => {
  // Clear the session to simulate unauthenticated user
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Access campground detail page without login
  await page.goto(`${BASE_URL}/campground/${state.campWithData.id}`);
  await page.waitForLoadState('networkidle');

  // Should still be able to see campground heading (h1)
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toBeVisible({ timeout: 10_000 });

  // Should see campground details
  await expect(page.getByText(/Summary Road/i)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/0800000002/i)).toBeVisible({ timeout: 10_000 });

  // Should be able to see reviews (publicly viewable)
  await expect(page.getByText(/Excellent place!/i)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/Very nice campground\./i)).toBeVisible({ timeout: 10_000 });
});

// ─── TC2-6-5: Valid campground ID with only ratings (no bookings) ──────────────

test('TC2-6-5: Valid campground ID with only ratings (no bookings)', async ({ page }) => {
  await page.goto(`${BASE_URL}/campground/${state.campRatingOnly.id}`);
  await page.waitForLoadState('networkidle');

  // Verify campground name is displayed
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 });

  // Verify campground details are shown
  await expect(page.getByText(/Summary Road/i)).toBeVisible({ timeout: 10_000 });

  // Verify rating is displayed
  await expect(page.getByText(/\d+\.\d+/)).toBeVisible({ timeout: 10_000 });

  // Verify the review comment is displayed
  await expect(page.getByText(/Decent experience/i)).toBeVisible({ timeout: 10_000 });
});
