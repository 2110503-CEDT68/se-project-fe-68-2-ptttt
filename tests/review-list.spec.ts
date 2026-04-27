/**
 * E2E Test Suite: Review List & Review Item (US2-3)
 * Frontend: Campground Detail page → ReviewList → ReviewItem
 *
 * Prerequisites:
 * - Frontend running at http://localhost:3000
 * - Backend running and connected
 * - Admin account exists: admin@gmail.com / 123456
 * - User account exists:  user@gmail.com  / 123456
 *
 * Cleanup contract: this suite deletes ONLY the data it created.
 * It never drops the database.
 */

import { test, expect, Page, request as playwrightRequest, APIRequestContext } from '@playwright/test';

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_URL    = process.env.FRONTEND_URL || 'http://localhost:3001';
const BACKEND_URL = process.env.BACKEND_URL  || 'http://localhost:5000';

const ADMIN_EMAIL    = 'admin@gmail.com';
const ADMIN_PASSWORD = '123456';
const USER_EMAIL     = 'user@gmail.com';
const USER_PASSWORD  = '123456';

const RUN_ID          = Date.now();
const CAMPGROUND_NAME = `ReviewList-${RUN_ID}`;

// ─── Resource tracking ───────────────────────────────────────────────────────

let adminToken   = '';
let userToken    = '';
let campgroundId = '';
let bookingId    = '';
const createdReviewIds:  string[] = [];
const createdBookingIds: string[] = [];

// ─── API helpers ─────────────────────────────────────────────────────────────

async function apiLogin(email: string, password: string): Promise<string> {
  const ctx = await playwrightRequest.newContext();
  try {
    const res  = await ctx.post(`${BACKEND_URL}/api/v1/auth/login`, { data: { email, password } });
    const json = await res.json();
    if (!json.token) throw new Error(`Login failed for ${email}: ${JSON.stringify(json)}`);
    return json.token;
  } finally {
    await ctx.dispose();
  }
}

async function apiCreateCampground(api: APIRequestContext, token: string, name: string): Promise<string> {
  const res  = await api.post(`${BACKEND_URL}/api/v1/campgrounds`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name, address: '1 Test Road', tel: '0800000001', picture: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg' },
  });
  const json = await res.json();
  if (!json.success) throw new Error(`Create campground failed: ${JSON.stringify(json)}`);
  return json.data._id;
}

async function apiCreateBooking(api: APIRequestContext, token: string, campId: string): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const res   = await api.post(`${BACKEND_URL}/api/v1/campgrounds/${campId}/bookings`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { bookingDate: today, nights: 1 },
  });
  const json = await res.json();
  if (!json.success) throw new Error(`Create booking failed: ${JSON.stringify(json)}`);
  return json.data._id;
}

async function apiCreateReview(
  api: APIRequestContext,
  token: string,
  campId: string,
  bkId: string,
  rating: number,
  comment: string,
): Promise<string> {
  const res  = await api.post(`${BACKEND_URL}/api/v1/campgrounds/${campId}/reviews`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { booking: bkId, rating, comment },
  });
  const json = await res.json();
  if (!json.success) throw new Error(`Create review failed: ${JSON.stringify(json)}`);
  return json.data._id;
}

// ─── UI helpers ──────────────────────────────────────────────────────────────

async function loginUserUI(page: Page) {
  await page.goto(`${BASE_URL}/authentication`);
  await page.getByPlaceholder('your@email.com').fill(USER_EMAIL);
  await page.getByPlaceholder('••••••••').fill(USER_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(`${BASE_URL}/`);
}

async function gotoCampgroundDetail(page: Page, cid: string) {
  await page.goto(`${BASE_URL}/campground/${cid}`);
  await expect(page.getByText(/rate this campground/i)).toBeVisible();
}

// ─── Setup ────────────────────────────────────────────────────────

test.beforeAll(async () => {
  const api = await playwrightRequest.newContext();
  try {
    adminToken   = await apiLogin(ADMIN_EMAIL, ADMIN_PASSWORD);
    userToken    = await apiLogin(USER_EMAIL,  USER_PASSWORD);
    campgroundId = await apiCreateCampground(api, adminToken, CAMPGROUND_NAME);
    bookingId    = await apiCreateBooking(api, userToken, campgroundId);
    createdBookingIds.push(bookingId);
    console.log(`Setup OK — campground=${campgroundId} booking=${bookingId}`);
  } finally {
    await api.dispose();
  }
});

// ─── Cleanup ────────────────────────────────────────────────────────

test.afterAll(async () => {
  const api = await playwrightRequest.newContext();
  try {
    for (const rid of createdReviewIds) {
      const r = await api.delete(`${BACKEND_URL}/api/v1/reviews/${rid}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      console.log(`Cleanup review ${rid} → ${r.status()}`);
    }
    for (const bkid of createdBookingIds) {
      const r = await api.delete(`${BACKEND_URL}/api/v1/bookings/${bkid}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      console.log(`Cleanup booking ${bkid} → ${r.status()}`);
    }
    if (campgroundId) {
      const r = await api.delete(`${BACKEND_URL}/api/v1/campgrounds/${campgroundId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      console.log(`Cleanup campground ${campgroundId} → ${r.status()}`);
    }
  } finally {
    await api.dispose();
  }
});


// ─── Review List ─────────────────────────────────────────────────────────────

// TC3-1 must run first — campground has no reviews yet at this point
test('TC3-1: Shows "No reviews yet" when campground has no reviews', async ({ page }) => {
  await loginUserUI(page);
  await gotoCampgroundDetail(page, campgroundId);
  await expect(page.getByText('No reviews yet. Be the first to review!')).toBeVisible();
});

test('TC3-2: Posted review appears in the review list', async ({ page }) => {
  const api = await playwrightRequest.newContext();
  try {
    const rid = await apiCreateReview(api, userToken, campgroundId, bookingId, 4, 'Great campsite!');
    createdReviewIds.push(rid);
  } finally {
    await api.dispose();
  }

  await loginUserUI(page);
  await gotoCampgroundDetail(page, campgroundId);
  await expect(page.getByText('Great campsite!')).toBeVisible();
});

test('TC3-3: Sort "Highest rated" shows highest-rated review first', async ({ page }) => {
  const api = await playwrightRequest.newContext();
  try {
    const bk  = await apiCreateBooking(api, userToken, campgroundId);
    createdBookingIds.push(bk);
    const rid = await apiCreateReview(api, userToken, campgroundId, bk, 1, 'One star comment');
    createdReviewIds.push(rid);
  } finally {
    await api.dispose();
  }

  await loginUserUI(page);
  await gotoCampgroundDetail(page, campgroundId);

  await page.getByRole('button', { name: /most recent/i }).click();
  await page.getByRole('button', { name: /highest rated/i }).click();

  const fiveIdx = await page.getByText('Great campsite!').evaluate((el) =>
    [...document.querySelectorAll('p')].indexOf(el as HTMLParagraphElement)
  );
  const oneIdx = await page.getByText('One star comment').evaluate((el) =>
    [...document.querySelectorAll('p')].indexOf(el as HTMLParagraphElement)
  );
  expect(fiveIdx).toBeLessThan(oneIdx);
});

test('TC3-4: Sort "Lowest rated" shows lowest-rated review first', async ({ page }) => {
  await loginUserUI(page);
  await gotoCampgroundDetail(page, campgroundId);

  await page.getByRole('button', { name: /most recent/i }).click();
  await page.getByRole('button', { name: /lowest rated/i }).click();

  const oneIdx = await page.getByText('One star comment').evaluate((el) =>
    [...document.querySelectorAll('p')].indexOf(el as HTMLParagraphElement)
  );
  const fiveIdx = await page.getByText('Great campsite!').evaluate((el) =>
    [...document.querySelectorAll('p')].indexOf(el as HTMLParagraphElement)
  );
  expect(oneIdx).toBeLessThan(fiveIdx);
});

test('TC3-5: Sort "Most recent" shows most recent review first', async ({ page }) => {
  const api = await playwrightRequest.newContext();
  try {
    const bk  = await apiCreateBooking(api, userToken, campgroundId);
    createdBookingIds.push(bk);
    const rid = await apiCreateReview(api, userToken, campgroundId, bk, 3, 'Newest review');
    createdReviewIds.push(rid);
  } finally {
    await api.dispose();
  }

  await loginUserUI(page);
  await gotoCampgroundDetail(page, campgroundId);

  await page.getByRole('button', { name: /most recent/i }).click();   // open dropdown
  await page.getByRole('button', { name: /highest rated/i }).click();  // select highest
  await page.getByRole('button', { name: /highest rated/i }).click();  // open dropdown again
  await page.getByRole('button', { name: /most recent/i }).click();    // select most recent

  const newestIdx = await page.getByText('Newest review').evaluate((el) =>
    [...document.querySelectorAll('p')].indexOf(el as HTMLParagraphElement)
  );
  const fiveIdx = await page.getByText('Great campsite!').evaluate((el) =>
    [...document.querySelectorAll('p')].indexOf(el as HTMLParagraphElement)
  );
  expect(newestIdx).toBeLessThan(fiveIdx);
});

// ─── Review Item ─────────────────────────────────────────────────────────────

test('TC3-6: Delete button is visible to the review owner', async ({ page }) => {
  await loginUserUI(page);
  await gotoCampgroundDetail(page, campgroundId);
  await expect(page.locator('button[title="Delete review"]').first()).toBeVisible();
});

test('TC3-7: Delete button is NOT visible when not logged in', async ({ page }) => {
  await gotoCampgroundDetail(page, campgroundId);
  await expect(page.locator('button[title="Delete review"]')).not.toBeVisible();
});

test('TC3-8: Cancelling the confirm dialog keeps the review', async ({ page }) => {
  await loginUserUI(page);
  await gotoCampgroundDetail(page, campgroundId);
  await expect(page.getByText('Great campsite!')).toBeVisible();

  page.once('dialog', (dialog) => dialog.dismiss());
  await page.locator('button[title="Delete review"]').first().click();

  await expect(page.getByText('Great campsite!')).toBeVisible();
});

test('TC3-9: Owner can delete their own review', async ({ page }) => {
  const api = await playwrightRequest.newContext();
  try {
    const bk = await apiCreateBooking(api, userToken, campgroundId);
    createdBookingIds.push(bk);
    await apiCreateReview(api, userToken, campgroundId, bk, 3, 'Will delete this.');
  } finally {
    await api.dispose();
  }

  await loginUserUI(page);
  await gotoCampgroundDetail(page, campgroundId);
  await expect(page.getByText('Will delete this.')).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('button[title="Delete review"]').first().click();

  await expect(page.getByText(/deleted successfully/i)).toBeVisible();
  await expect(page.getByText('Will delete this.')).not.toBeVisible();
});

test('TC3-10: Review by a deleted user shows "Anonymous"', async ({ page }) => {
  // Register a temporary user
  const tempEmail    = `temp-${Date.now()}@test.com`;
  const tempPassword = '123456';

  const api = await playwrightRequest.newContext();
  let tempUserId = '';
  try {
    // Register
    const regRes = await api.post(`${BACKEND_URL}/api/v1/auth/register`, {
      data: { name: 'Temp User', email: tempEmail, password: tempPassword, tel: '0800000099', role: 'user' },
    });
    const regJson = await regRes.json();
    if (!regJson.success) throw new Error(`Register failed: ${JSON.stringify(regJson)}`);

    // Login to get temp token
    const tempToken = await apiLogin(tempEmail, tempPassword);

    // Get user id
    const meRes  = await api.get(`${BACKEND_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${tempToken}` },
    });
    const meJson = await meRes.json();
    tempUserId   = meJson.data._id;

    // Create booking + review as temp user
    const bk  = await apiCreateBooking(api, tempToken, campgroundId);
    const rid = await apiCreateReview(api, tempToken, campgroundId, bk, 5, 'Review by temp user');
    createdReviewIds.push(rid);
    createdBookingIds.push(bk);

    // Delete the temp user (admin action)
    await api.delete(`${BACKEND_URL}/api/v1/auth/delete/${tempUserId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  } finally {
    await api.dispose();
  }

  // Navigate as logged-in user and verify "Anonymous" is shown
  await loginUserUI(page);
  await gotoCampgroundDetail(page, campgroundId);
  await expect(page.getByText('Anonymous')).toBeVisible();
});
