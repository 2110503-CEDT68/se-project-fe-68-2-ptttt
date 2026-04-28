/**
 * E2E Test Suite: Delete Review (US2-4)
 * Frontend: Campground Detail page → ReviewItem → Delete button
 *
 * Equivalence Classes:
 *   EC-1 (Valid)   — User is the review owner and Review ID is valid
 *   EC-2 (Invalid) — User is NOT the review owner (different user)
 *   EC-3 (Valid)   — Delete the only review → stats reset to zero
 *   EC-4 (Valid)   — Delete one review from multiple → stats decrease correctly
 *   EC-5 (Valid)   — Delete review → ratingCount array updates correctly
 *
 * Precondition:
 *   - User is logged in as user@gmail.com
 *   - User has an active booking for the test campground
 *   - User has already posted one review for that booking
 *   - Frontend running at http://localhost:3000
 *   - Backend running and connected
 */

import {
  test,
  expect,
  Page,
  request as playwrightRequest,
  APIRequestContext,
} from "@playwright/test";

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_URL    = process.env.FRONTEND_URL || "http://localhost:3000";
const BACKEND_URL = process.env.BACKEND_URL  || "http://localhost:5000";

const ADMIN_EMAIL    = "admin@gmail.com";
const ADMIN_PASSWORD = "123456";
const USER_EMAIL     = "user@gmail.com";
const USER_PASSWORD  = "123456";

const RUN_ID = Date.now();

// ─── Resource tracking ───────────────────────────────────────────────────────

let adminToken  = "";
let userToken   = "";
let user2Token  = "";
let user2Id     = "";
const createdCampgroundIds: string[] = [];
const createdBookingIds:    string[] = [];
const createdReviewIds:     string[] = [];

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
    data: { name, address: "Songkhla", tel: "081-234-5678", picture: "https://tinyurl.com/5n6zfbdv" },
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
  bookingId: string,
  rating: number,
  comment: string,
): Promise<string> {
  const res  = await api.post(`${BACKEND_URL}/api/v1/campgrounds/${campId}/reviews`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { booking: bookingId, rating, comment },
  });
  const json = await res.json();
  if (!json.success) throw new Error(`Create review failed: ${JSON.stringify(json)}`);
  return json.data._id;
}

// ─── UI helpers ──────────────────────────────────────────────────────────────

async function loginUserUI(page: Page, email = USER_EMAIL, password = USER_PASSWORD) {
  await page.goto(`${BASE_URL}/authentication`);
  await page.getByPlaceholder("your@email.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(`${BASE_URL}/`);
}

async function gotoCampgroundDetail(page: Page, cid: string) {
  await page.goto(`${BASE_URL}/campground/${cid}`);
  await expect(page.getByText(/rate this campground/i)).toBeVisible();
}

async function clickDeleteReview(page: Page, reviewText: string) {
  const reviewItem = page.locator("div.flex.gap-4.py-5").filter({ hasText: reviewText });
  await reviewItem.locator('button[title="Delete review"]').click();
}

// ─── Setup / Teardown ────────────────────────────────────────────────────────

test.beforeAll(async () => {
  const api = await playwrightRequest.newContext();
  try {
    adminToken = await apiLogin(ADMIN_EMAIL, ADMIN_PASSWORD);
    userToken  = await apiLogin(USER_EMAIL,  USER_PASSWORD);

    // Register a second user for TC8-2 (non-owner test)
    const user2Email = `user2-${RUN_ID}@test.com`;
    const tel2 = `08${RUN_ID.toString().slice(-8)}`;
    await api.post(`${BACKEND_URL}/api/v1/auth/register`, {
      data: { name: "Test User 2", email: user2Email, password: "123456", tel: tel2, role: "user" },
    });
    user2Token = await apiLogin(user2Email, "123456");
    const profileRes = await api.get(`${BACKEND_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    user2Id = (await profileRes.json()).data._id;
  } finally {
    await api.dispose();
  }
});

test.afterAll(async () => {
  const api = await playwrightRequest.newContext();
  try {
    for (const rid of createdReviewIds) {
      await api.delete(`${BACKEND_URL}/api/v1/reviews/${rid}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      }).catch(() => {});
    }
    for (const bid of createdBookingIds) {
      await api.delete(`${BACKEND_URL}/api/v1/bookings/${bid}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      }).catch(() => {});
    }
    for (const cid of createdCampgroundIds) {
      await api.delete(`${BACKEND_URL}/api/v1/campgrounds/${cid}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      }).catch(() => {});
    }
    if (user2Id) {
      await api.delete(`${BACKEND_URL}/api/v1/auth/delete/${user2Id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      }).catch(() => {});
    }
  } finally {
    await api.dispose();
  }
});

// ─── TC8-1: Owner deletes their own review (EC-1) ────────────────────────────

test("TC8-1: Owner can delete their review — toast shown and review disappears", async ({ page }) => {
  const api = await playwrightRequest.newContext();
  let campId = "", bookingId = "", reviewId = "";
  try {
    campId    = await apiCreateCampground(api, adminToken, `TC8-1-${Date.now()}`);
    createdCampgroundIds.push(campId);
    bookingId = await apiCreateBooking(api, userToken, campId);
    createdBookingIds.push(bookingId);
    reviewId  = await apiCreateReview(api, userToken, campId, bookingId, 4, "TC8-1: Owner review");
    createdReviewIds.push(reviewId);
  } finally {
    await api.dispose();
  }

  await loginUserUI(page);
  await gotoCampgroundDetail(page, campId);
  await expect(page.getByText("TC8-1: Owner review")).toBeVisible();

  page.once("dialog", (d) => d.accept());
  await clickDeleteReview(page, "TC8-1: Owner review");

  // Toast confirms deletion
  await expect(page.getByText(/deleted successfully/i)).toBeVisible();
  // Review disappears immediately
  await expect(page.getByText("TC8-1: Owner review")).not.toBeVisible();

  const idx = createdReviewIds.indexOf(reviewId);
  if (idx > -1) createdReviewIds.splice(idx, 1);
});

// ─── TC8-2: Non-owner cannot see Delete button (EC-2) ────────────────────────

test("TC8-2: Non-owner cannot see Delete button for another user's review", async ({ page }) => {
  const api = await playwrightRequest.newContext();
  let campId = "", bookingId = "", reviewId = "";
  try {
    campId    = await apiCreateCampground(api, adminToken, `Test Delete Review ${Date.now()}`);
    createdCampgroundIds.push(campId);
    bookingId = await apiCreateBooking(api, userToken, campId);
    createdBookingIds.push(bookingId);
    reviewId  = await apiCreateReview(api, userToken, campId, bookingId, 3, "TC8-2: User1 review");
    createdReviewIds.push(reviewId);
  } finally {
    await api.dispose();
  }

  // Login as user2 (not the review owner)
  const user2Email = `user2-${RUN_ID}@test.com`;
  await loginUserUI(page, user2Email, "123456");
  await gotoCampgroundDetail(page, campId);

  await expect(page.getByText("TC8-2: User1 review")).toBeVisible();

  // Delete button must NOT be visible to user2
  const reviewItem = page.locator("div.flex.gap-4.py-5").filter({ hasText: "TC8-2: User1 review" });
  await expect(reviewItem.locator('button[title="Delete review"]')).not.toBeVisible();
});

// ─── TC8-3: Delete only review → stats reset to zero (EC-3) ──────────────────

test("TC8-3: Deleting the only review resets stats to 0.0 and shows empty message", async ({ page }) => {
  const api = await playwrightRequest.newContext();
  let campId = "", bookingId = "", reviewId = "";
  try {
    campId    = await apiCreateCampground(api, adminToken, `Test Delete Review ${Date.now()}`);
    createdCampgroundIds.push(campId);
    bookingId = await apiCreateBooking(api, userToken, campId);
    createdBookingIds.push(bookingId);
    reviewId  = await apiCreateReview(api, userToken, campId, bookingId, 4, "TC8-3: Only review");
    createdReviewIds.push(reviewId);
  } finally {
    await api.dispose();
  }

  await loginUserUI(page);
  await gotoCampgroundDetail(page, campId);

  // Verify initial state
  await expect(page.getByText("4.0")).toBeVisible();
  await expect(page.locator("div.text-sm.text-slate-400", { hasText: /^1 review$/i })).toBeVisible();

  page.once("dialog", (d) => d.accept());
  await clickDeleteReview(page, "TC8-3: Only review");
  await expect(page.getByText(/deleted successfully/i)).toBeVisible();

  // Stats reset to zero
  await expect(page.getByText("0.0")).toBeVisible();
  await expect(page.locator("div.text-sm.text-slate-400", { hasText: /^0 reviews$/i })).toBeVisible();
  await expect(page.getByText(/no reviews yet.*be the first to review/i)).toBeVisible();

  const idx = createdReviewIds.indexOf(reviewId);
  if (idx > -1) createdReviewIds.splice(idx, 1);
});

// ─── TC8-4: Delete one of multiple reviews → stats decrease correctly (EC-4) ─

test("TC8-4: Deleting one review from two updates average and count correctly", async ({ page }) => {
  const api = await playwrightRequest.newContext();
  let campId = "", booking1Id = "", booking2Id = "", review1Id = "", review2Id = "";
  try {
    campId     = await apiCreateCampground(api, adminToken, `Test Delete Review ${Date.now()}`);
    createdCampgroundIds.push(campId);

    // User 1 (rating 4)
    booking1Id = await apiCreateBooking(api, userToken, campId);
    createdBookingIds.push(booking1Id);
    review1Id  = await apiCreateReview(api, userToken, campId, booking1Id, 4, "TC8-4: User1 review");
    createdReviewIds.push(review1Id);

    // User 2 (rating 2)
    booking2Id = await apiCreateBooking(api, user2Token, campId);
    createdBookingIds.push(booking2Id);
    review2Id  = await apiCreateReview(api, user2Token, campId, booking2Id, 2, "TC8-4: User2 review");
    createdReviewIds.push(review2Id);
  } finally {
    await api.dispose();
  }

  await loginUserUI(page);
  await gotoCampgroundDetail(page, campId);

  // Initial: 2 reviews, average = (4+2)/2 = 3.0
  await expect(page.getByText("3.0")).toBeVisible();
  await expect(page.locator("div.text-sm.text-slate-400", { hasText: /^2 reviews$/i })).toBeVisible();

  // Delete user1's review (rating 4)
  page.once("dialog", (d) => d.accept());
  await clickDeleteReview(page, "TC8-4: User1 review");
  await expect(page.getByText(/deleted successfully/i)).toBeVisible();

  // After: 1 review remaining (rating 2), average = 2.0
  await expect(page.getByText("2.0")).toBeVisible();
  await expect(page.locator("div.text-sm.text-slate-400", { hasText: /^1 review$/i })).toBeVisible();
  await expect(page.getByText("TC8-4: User2 review")).toBeVisible();

  const idx = createdReviewIds.indexOf(review1Id);
  if (idx > -1) createdReviewIds.splice(idx, 1);
});

// ─── TC8-5: ratingCount array updates correctly after deletion (EC-5) ─────────

test("TC8-5: Deleting a 5-star review decreases the 5★ count from 1 to 0", async ({ page }) => {
  const api = await playwrightRequest.newContext();
  let campId = "", bookingId = "", reviewId = "";
  try {
    campId    = await apiCreateCampground(api, adminToken, `Test Delete Review ${Date.now()}`);
    createdCampgroundIds.push(campId);
    bookingId = await apiCreateBooking(api, userToken, campId);
    createdBookingIds.push(bookingId);
    reviewId  = await apiCreateReview(api, userToken, campId, bookingId, 5, "TC8-5: Five star review");
    createdReviewIds.push(reviewId);
  } finally {
    await api.dispose();
  }

  await loginUserUI(page);
  await gotoCampgroundDetail(page, campId);

  // Verify 5★ count = 1 before deletion
  const fiveStarBefore = page
    .locator("div.flex.items-center.gap-3")
    .filter({ has: page.locator("span.text-sm.text-slate-300", { hasText: /^5$/ }) })
    .filter({ has: page.locator("div.text-sm.text-slate-400.w-12.text-right", { hasText: /^1$/ }) });
  await expect(fiveStarBefore).toBeVisible();

  page.once("dialog", (d) => d.accept());
  await clickDeleteReview(page, "TC8-5: Five star review");
  await expect(page.getByText(/deleted successfully/i)).toBeVisible();

  // 5★ count should now be 0
  const fiveStarAfter = page
    .locator("div.flex.items-center.gap-3")
    .filter({ has: page.locator("span.text-sm.text-slate-300", { hasText: /^5$/ }) })
    .filter({ has: page.locator("div.text-sm.text-slate-400.w-12.text-right", { hasText: /^0$/ }) });
  await expect(fiveStarAfter).toBeVisible();

  const idx = createdReviewIds.indexOf(reviewId);
  if (idx > -1) createdReviewIds.splice(idx, 1);
});
