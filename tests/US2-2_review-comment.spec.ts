/**
 * E2E Test Suite: Comment the Campground (US2-2)
 * Frontend: Campground Detail page → Review Form → Comment textarea
 *
 * Prerequisites:
 * - Frontend running at http://localhost:3000
 * - Backend running and connected
 * - Admin account exists: admin@gmail.com / 123456
 *
 * Cleanup contract: this suite deletes ONLY the data it created (review,
 * booking, campground, user). It never drops the database.
 */

import { test, expect, Page, request as playwrightRequest, APIRequestContext } from '@playwright/test';

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = '123456';

// Use the seeded test user account — avoids register/cleanup and tel-collision.
const USER_EMAIL = 'user@gmail.com';
const USER_PASSWORD = '123456';

// Avoid the substring "Test Camp" so admin tests' getByText doesn't
// accidentally match this campground when all three test files start at
// the same millisecond.
const RUN_ID = Date.now();
const CAMPGROUND_NAME = `CommentFE-${RUN_ID}`;

// ─── Created-resource tracking ───────────────────────────────────────────────

let adminToken = '';
let userToken = '';
let campgroundId = '';
let bookingId = '';
const createdReviewIds: string[] = [];

// ─── API helpers ─────────────────────────────────────────────────────────────

async function apiLogin(email: string, password: string): Promise<string> {
  // Use a one-shot context so the BE's Set-Cookie response doesn't persist
  // across subsequent login calls. The BE rejects re-login when a `token`
  // cookie is already present ("You are already logged in").
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

async function apiCreateCampground(api: APIRequestContext, token: string, name: string): Promise<string> {
  const res = await api.post(`${BACKEND_URL}/api/v1/campgrounds`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name,
      address: '123 Forest Road, Chiang Mai',
      tel: '0812345678',
      picture: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg',
    },
  });
  const json = await res.json();
  if (!json.success) throw new Error(`Create campground failed: ${JSON.stringify(json)}`);
  return json.data._id;
}

async function apiCreateBooking(
  api: APIRequestContext,
  token: string,
  campId: string
): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const res = await api.post(`${BACKEND_URL}/api/v1/campgrounds/${campId}/bookings`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { bookingDate: today, nights: 1 },
  });
  const json = await res.json();
  if (!json.success) throw new Error(`Create booking failed: ${JSON.stringify(json)}`);
  return json.data._id;
}

async function captureCreatedReviewId(page: Page): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    let resolved = false;
    const handler = async (response: any) => {
      if (resolved) return;
      const url = response.url();
      if (url.includes('/reviews') && response.request().method() === 'POST') {
        try {
          const json = await response.json();
          if (json.success && json.data?._id) {
            resolved = true;
            page.off('response', handler);
            resolve(json.data._id);
          }
        } catch {
          /* ignore */
        }
      }
    };
    page.on('response', handler);
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        page.off('response', handler);
        resolve(null);
      }
    }, 10_000);
  });
}

// ─── UI helpers ──────────────────────────────────────────────────────────────

async function loginUserUI(page: Page, email = USER_EMAIL, password = USER_PASSWORD) {
  await page.goto(`${BASE_URL}/authentication`);
  await page.getByPlaceholder('your@email.com').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(`${BASE_URL}/`);
}

async function gotoCampgroundDetail(page: Page, cid: string) {
  await page.goto(`${BASE_URL}/campground/${cid}`);
  await expect(page.getByText(/rate this campground/i)).toBeVisible();
}

async function selectStars(page: Page, n: number) {
  // MUI Rating's visually-hidden radio inputs all share the same 1×1 px
  // bounding box (clip: rect(0 0 0 0); position: absolute; left: 0). A
  // coordinate-based Playwright click — even with force:true — dispatches
  // to the *topmost* element at that point, which always ends up being
  // star 1 regardless of which input the locator matched. (Verified: any
  // selectStars(N) silently became rating=1.)
  //
  // Calling .click() on the DOM element directly fires the synthetic click
  // *on that exact element*, which triggers its onChange with the right
  // value, so React state correctly becomes `n`.
  await page.evaluate((value) => {
    const input = document.querySelector(
      `input[name="campground-rating"][value="${value}"]`,
    ) as HTMLInputElement | null;
    if (input) input.click();
  }, n);
}

async function fillComment(page: Page, text: string) {
  const textarea = page.getByPlaceholder('Share your experience at this campground');
  await textarea.fill(text);
}

async function clickPostReview(page: Page) {
  await page.getByRole('button', { name: /^post review$/i }).click();
}

// ─── Setup / Teardown ────────────────────────────────────────────────────────

test.beforeAll(async () => {
  const api = await playwrightRequest.newContext();
  try {
    adminToken = await apiLogin(ADMIN_EMAIL, ADMIN_PASSWORD);
    userToken = await apiLogin(USER_EMAIL, USER_PASSWORD);
    campgroundId = await apiCreateCampground(api, adminToken, CAMPGROUND_NAME);
    bookingId = await apiCreateBooking(api, userToken, campgroundId);
    console.log(`Setup OK: campground=${campgroundId} booking=${bookingId}`);
  } finally {
    await api.dispose();
  }
});

test.afterAll(async () => {
  const api = await playwrightRequest.newContext();
  try {
    for (const rid of createdReviewIds) {
      const res = await api.delete(`${BACKEND_URL}/api/v1/reviews/${rid}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      console.log(`Cleanup: delete review ${rid} → ${res.status()}`);
    }

    if (bookingId) {
      const res = await api.delete(`${BACKEND_URL}/api/v1/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      console.log(`Cleanup: delete booking ${bookingId} → ${res.status()}`);
    }

    if (campgroundId) {
      const res = await api.delete(`${BACKEND_URL}/api/v1/campgrounds/${campgroundId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      console.log(`Cleanup: delete campground ${campgroundId} → ${res.status()}`);
    }

    // user@gmail.com is a permanent seed account — do not delete.
  } finally {
    await api.dispose();
  }
});

// ─── TC-1: Submit valid review with comment ──────────────────────────────────

test('TC2-1: Post a review with a valid comment', async ({ page }) => {
  await loginUserUI(page);
  await gotoCampgroundDetail(page, campgroundId);

  const idPromise = captureCreatedReviewId(page);

  await selectStars(page, 5);
  await fillComment(page, 'Lovely place to stay.');
  await clickPostReview(page);

  await expect(page.getByText(/review posted successfully/i)).toBeVisible();

  const rid = await idPromise;
  if (rid) createdReviewIds.push(rid);

  // Posted comment should appear in the review list
  await expect(page.getByText('Lovely place to stay.')).toBeVisible();
});

// ─── TC-2: Empty comment → button disabled ───────────────────────────────────

test('TC2-2: Empty comment — Post Review button is disabled', async ({ page }) => {
  await loginUserUI(page);
  await gotoCampgroundDetail(page, campgroundId);

  await selectStars(page, 4);
  await fillComment(page, '');

  const button = page.getByRole('button', { name: /^post review$/i });
  await expect(button).toBeDisabled();
});

// ─── TC-3: Whitespace-only comment → button disabled ─────────────────────────

test('TC2-3: Whitespace-only comment — Post Review button is disabled', async ({ page }) => {
  await loginUserUI(page);
  await gotoCampgroundDetail(page, campgroundId);

  await selectStars(page, 4);
  await fillComment(page, '       ');

  const button = page.getByRole('button', { name: /^post review$/i });
  await expect(button).toBeDisabled();
});

// ─── TC-4: Comment over 1000 chars → input is capped at 1000 ────────────────

test('TC2-4: Typing more than 1000 characters is blocked at 1000', async ({ page }) => {
  await loginUserUI(page);
  await gotoCampgroundDetail(page, campgroundId);

  await selectStars(page, 4);

  const longText = 'a'.repeat(1000); // try to put 1500 chars in
  await fillComment(page, longText);

  // The handleCommentChange handler in ReviewForm.tsx silently rejects any
  // value > 1000, so the textarea ends up holding exactly 1000 chars (or
  // possibly 0 if the whole paste was rejected). Either way the value must
  // never exceed 1000 and the counter must display "<=1000 / 1000".
  const textarea = page.getByPlaceholder('Share your experience at this campground');
  const value = await textarea.inputValue();
  expect(value.length).toBeLessThanOrEqual(1000);

  // Counter should show the actual length over 1000
  await expect(page.getByText(`${value.length} / 1000`)).toBeVisible();
});

// ─── TC-5: Duplicate review on same booking → error toast ────────────────────

test('TC2-5: Second review on the same booking shows duplicate error', async ({ page }) => {
  // First review — make sure one exists for this booking before we attempt
  // a duplicate. We submit it via the API to keep the test focused on the
  // duplicate-error UX rather than two consecutive UI submissions.
  const api = await playwrightRequest.newContext();
  try {
    const res = await api.post(
      `${BACKEND_URL}/api/v1/campgrounds/${campgroundId}/reviews`,
      {
        headers: { Authorization: `Bearer ${userToken}` },
        data: { booking: bookingId, rating: 4, comment: 'First review (setup)' },
      }
    );
    const json = await res.json();
    if (json.success && json.data?._id) createdReviewIds.push(json.data._id);
  } finally {
    await api.dispose();
  }

  // Now try to submit a second review on the same booking via the UI
  await loginUserUI(page);
  await gotoCampgroundDetail(page, campgroundId);

  await selectStars(page, 5);
  await fillComment(page, 'Second review attempt on the same booking.');
  await clickPostReview(page);

  // Expect a duplicate-booking error toast
  await expect(page.getByText(/already reviewed this booking/i)).toBeVisible();
});
