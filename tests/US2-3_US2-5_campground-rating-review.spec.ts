/**
 * E2E Test Suite: Campground Rating & Review Display (US2-3 + US2-5)
 * Frontend: /campground (catalog) + /campground/:id (detail page)
 *
 * US2-3: As a customer I want to see rating and comment of campground
 *        so that I can use it for choosing campground.
 * US2-5: As a campground owner I want to see my rating and comment
 *        so that I can monitor customer satisfaction and improve my service.
 *
 * Both US share the same UI and differ only in the role of the viewer.
 * All TC are valid for both roles.
 *
 * Test accounts:
 *   Admin : admin@gmail.com / 123456
 *   User A: user@gmail.com  / 123456  (primary reviewer)
 *   User B: user2@gmail.com / 123456  (secondary reviewer — registered in beforeAll)
 *
 * Cleanup contract: deletes ONLY data created by this suite. Never drops the DB.
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
const USER_A_EMAIL   = "user@gmail.com";
const USER_A_PASSWORD = "123456";

const RUN_ID = Date.now();

// Campground names
const CAMP_EMPTY_NAME        = `RatingReview-Empty-${RUN_ID}`;       // 0 reviews
const CAMP_SINGLE_NAME       = `RatingReview-Single-${RUN_ID}`;      // 1 review (rating 4, user A)
const CAMP_MULTI_NAME        = `RatingReview-Multi-${RUN_ID}`;       // 3 reviews (ratings 5,4,1 — two users)
const CAMP_SORT_NAME         = `RatingReview-Sort-${RUN_ID}`;        // reviews for sort tests
const CAMP_SUMMARY_NAME      = `RatingReview-Summary-${RUN_ID}`;     // summary view test
const CAMP_NONEXISTENT_ID    = "000000000000000000000000";

// ─── Shared state ─────────────────────────────────────────────────────────────

let adminToken  = "";
let userAToken  = "";
let userBToken  = "";
let userBId     = "";
let userCToken  = "";
let userCId     = "";
const userBEmail = `user2-${RUN_ID}@test.com`;
const userCEmail = `user3-${RUN_ID}@test.com`;

// Campground IDs
let campEmptyId   = "";
let campSingleId  = "";
let campMultiId   = "";
let campSortId    = "";
let campSummaryId = "";

// Review/booking IDs for cleanup
const createdCampgroundIds: string[] = [];
const createdBookingIds:    string[] = [];
const createdReviewIds:     string[] = [];

// Catalog card test — dedicated campgrounds created in beforeAll
type CampgroundSnapshot = {
  _id: string; name: string; address: string; tel: string; picture: string;
  sumRating: number; countReview: number; ratingCount: number[];
};
const CARD_RATED_NAME = `Rated Campground ${RUN_ID}`;
const CARD_EMPTY_NAME = `Empty Campground ${RUN_ID}`;

// ─── API helpers ──────────────────────────────────────────────────────────────

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
    data: { name, address: "1 Test Road, Chiang Mai", tel: "0800000099",
            picture: "https://tinyurl.com/5n6zfbdv" },
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
  api: APIRequestContext, token: string, campId: string,
  bkId: string, rating: number, comment: string,
): Promise<string> {
  const res  = await api.post(`${BACKEND_URL}/api/v1/campgrounds/${campId}/reviews`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { booking: bkId, rating, comment },
  });
  const json = await res.json();
  if (!json.success) throw new Error(`Create review failed: ${JSON.stringify(json)}`);
  return json.data._id;
}

async function apiUpdateCampground(
  api: APIRequestContext, token: string, campId: string, data: Partial<CampgroundSnapshot>,
) {
  const res  = await api.put(`${BACKEND_URL}/api/v1/campgrounds/${campId}`, {
    headers: { Authorization: `Bearer ${token}` },
    data,
  });
  const json = await res.json();
  if (!json.success) throw new Error(`Update campground failed: ${JSON.stringify(json)}`);
}

// ─── UI helpers ──────────────────────────────────────────────────────────────

async function loginUI(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/authentication`);
  await page.getByPlaceholder("your@email.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(`${BASE_URL}/`);
}

async function gotoDetail(page: Page, cid: string) {
  await page.goto(`${BASE_URL}/campground/${cid}`);
  await expect(page.getByText(/rate this campground/i)).toBeVisible({ timeout: 10_000 });
}

// ─── Setup ────────────────────────────────────────────────────────────────────

test.beforeAll(async () => {
  const api = await playwrightRequest.newContext();
  try {
    adminToken = await apiLogin(ADMIN_EMAIL, ADMIN_PASSWORD);
    userAToken = await apiLogin(USER_A_EMAIL, USER_A_PASSWORD);

    // Register User B
    await api.post(`${BACKEND_URL}/api/v1/auth/register`, {
      data: { name: "User B", email: userBEmail, password: "123456",
              tel: `08${RUN_ID.toString().slice(-8)}`, role: "user" },
    });
    userBToken = await apiLogin(userBEmail, "123456");
    const meRes = await api.get(`${BACKEND_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${userBToken}` },
    });
    userBId = (await meRes.json()).data._id;

    // Register User C
    await api.post(`${BACKEND_URL}/api/v1/auth/register`, {
      data: { name: "User C", email: userCEmail, password: "123456",
              tel: `09${RUN_ID.toString().slice(-8)}`, role: "user" },
    });
    userCToken = await apiLogin(userCEmail, "123456");
    const meResC = await api.get(`${BACKEND_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${userCToken}` },
    });
    userCId = (await meResC.json()).data._id;

    // ── CAMP_EMPTY: no reviews ────────────────────────────────────────────────
    campEmptyId = await apiCreateCampground(api, adminToken, CAMP_EMPTY_NAME);
    createdCampgroundIds.push(campEmptyId);

    // ── CAMP_SINGLE: 1 review by User A (rating 4) ───────────────────────────
    campSingleId = await apiCreateCampground(api, adminToken, CAMP_SINGLE_NAME);
    createdCampgroundIds.push(campSingleId);
    const bkSingle = await apiCreateBooking(api, userAToken, campSingleId);
    createdBookingIds.push(bkSingle);
    const rvSingle = await apiCreateReview(api, userAToken, campSingleId, bkSingle, 4, "User A: Great place!");
    createdReviewIds.push(rvSingle);

    // ── CAMP_MULTI: 3 reviews by 3 users (5★ User A, 4★ User B, 1★ User C) ──
    campMultiId = await apiCreateCampground(api, adminToken, CAMP_MULTI_NAME);
    createdCampgroundIds.push(campMultiId);
    const bkM1 = await apiCreateBooking(api, userAToken, campMultiId);
    createdBookingIds.push(bkM1);
    const rvM1 = await apiCreateReview(api, userAToken, campMultiId, bkM1, 5, "User A: Excellent!");
    createdReviewIds.push(rvM1);
    const bkM2 = await apiCreateBooking(api, userBToken, campMultiId);
    createdBookingIds.push(bkM2);
    const rvM2 = await apiCreateReview(api, userBToken, campMultiId, bkM2, 4, "User B: Very nice.");
    createdReviewIds.push(rvM2);
    const bkM3 = await apiCreateBooking(api, userCToken, campMultiId);
    createdBookingIds.push(bkM3);
    const rvM3 = await apiCreateReview(api, userCToken, campMultiId, bkM3, 1, "User C: Not great.");
    createdReviewIds.push(rvM3);

    // ── CAMP_SORT: 2 reviews for sort tests (4★ User A, 2★ User B) ───────────
    campSortId = await apiCreateCampground(api, adminToken, CAMP_SORT_NAME);
    createdCampgroundIds.push(campSortId);
    const bkS1 = await apiCreateBooking(api, userAToken, campSortId);
    createdBookingIds.push(bkS1);
    const rvS1 = await apiCreateReview(api, userAToken, campSortId, bkS1, 4, "Sort: Four stars");
    createdReviewIds.push(rvS1);
    const bkS2 = await apiCreateBooking(api, userBToken, campSortId);
    createdBookingIds.push(bkS2);
    const rvS2 = await apiCreateReview(api, userBToken, campSortId, bkS2, 2, "Sort: Two stars");
    createdReviewIds.push(rvS2);

    // ── CAMP_SUMMARY: 2 reviews for summary view (5★ User A, 4★ User B) ──────
    campSummaryId = await apiCreateCampground(api, adminToken, CAMP_SUMMARY_NAME);
    createdCampgroundIds.push(campSummaryId);
    const bkSv1 = await apiCreateBooking(api, userAToken, campSummaryId);
    createdBookingIds.push(bkSv1);
    const rvSv1 = await apiCreateReview(api, userAToken, campSummaryId, bkSv1, 5, "Summary: Excellent!");
    createdReviewIds.push(rvSv1);
    const bkSv2 = await apiCreateBooking(api, userBToken, campSummaryId);
    createdBookingIds.push(bkSv2);
    const rvSv2 = await apiCreateReview(api, userBToken, campSummaryId, bkSv2, 4, "Summary: Very nice.");
    createdReviewIds.push(rvSv2);

    // ── Catalog card tests: create dedicated campgrounds ─────────────────────
    // Create a rated campground directly with known stats via API update
    const catalogRatedId = await apiCreateCampground(api, adminToken, CARD_RATED_NAME);
    createdCampgroundIds.push(catalogRatedId);
    await apiUpdateCampground(api, adminToken, catalogRatedId,
      { sumRating: 4, countReview: 1, ratingCount: [0,0,0,1,0] });

    const catalogEmptyId = await apiCreateCampground(api, adminToken, CARD_EMPTY_NAME);
    createdCampgroundIds.push(catalogEmptyId);

    console.log("beforeAll OK →", { campEmptyId, campSingleId, campMultiId, campSortId, campSummaryId });
  } finally {
    await api.dispose();
  }
});

test.afterAll(async () => {
  const api = await playwrightRequest.newContext();
  try {
    for (const rid of createdReviewIds)
      await api.delete(`${BACKEND_URL}/api/v1/reviews/${rid}`,
        { headers: { Authorization: `Bearer ${userAToken}` } }).catch(() => {});
    for (const bid of createdBookingIds)
      await api.delete(`${BACKEND_URL}/api/v1/bookings/${bid}`,
        { headers: { Authorization: `Bearer ${userAToken}` } }).catch(() => {});
    for (const cid of createdCampgroundIds)
      await api.delete(`${BACKEND_URL}/api/v1/campgrounds/${cid}`,
        { headers: { Authorization: `Bearer ${adminToken}` } }).catch(() => {});
    if (userBId)
      await api.delete(`${BACKEND_URL}/api/v1/auth/delete/${userBId}`,
        { headers: { Authorization: `Bearer ${adminToken}` } }).catch(() => {});
    if (userCId)
      await api.delete(`${BACKEND_URL}/api/v1/auth/delete/${userCId}`,
        { headers: { Authorization: `Bearer ${adminToken}` } }).catch(() => {});
  } finally {
    await api.dispose();
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP A — Catalog Card Display
// ═══════════════════════════════════════════════════════════════════════════════

test("TC7-1: Campground card shows star icon, average rating 4.0, and review count", async ({ page }) => {
  await page.goto(`${BASE_URL}/campground`);
  const card = page.getByText(CARD_RATED_NAME).locator("../..");
  await expect(card.locator("svg").first()).toBeVisible();
  await expect(card.getByText("4.0")).toBeVisible();
  await expect(card.getByText(/1 review/i)).toBeVisible();
});

test('TC7-2: Campground card with no reviews shows "No reviews"', async ({ page }) => {
  await page.goto(`${BASE_URL}/campground`);
  const card = page.getByText(CARD_EMPTY_NAME).locator("../..");
  await expect(card.getByText(/no reviews/i)).toBeVisible();
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP B — Detail Page: Empty State (0 reviews)
// ═══════════════════════════════════════════════════════════════════════════════

test("TC7-3: Detail page shows empty state correctly when campground has no reviews", async ({ page }) => {
  await page.goto(`${BASE_URL}/campground/${campEmptyId}`);
  await expect(page.getByText("0.0")).toBeVisible();
  await expect(page.getByText(/no reviews yet.*be the first to review/i)).toBeVisible();
  await expect(page.locator("div.text-sm.text-slate-400", { hasText: /^0 reviews$/i })).toBeVisible();
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP C — Detail Page: Single Review (User A, rating 4)
// ═══════════════════════════════════════════════════════════════════════════════

test("TC7-4: Detail page shows correct stats and comment for a single review", async ({ page }) => {
  await page.goto(`${BASE_URL}/campground/${campSingleId}`);
  // Average rating and count
  await expect(page.getByText("4.0")).toBeVisible();
  await expect(page.locator("div.text-sm.text-slate-400", { hasText: /^1 review$/i })).toBeVisible();
  // Star breakdown row for 4★
  const row = page
    .locator("div.flex.items-center.gap-3")
    .filter({ has: page.locator("span.text-sm.text-slate-300", { hasText: /^4$/ }) })
    .filter({ has: page.locator("div.text-sm.text-slate-400.w-12.text-right", { hasText: /^1$/ }) });
  await expect(row).toBeVisible();
  // Comment visible
  await expect(page.getByText("User A: Great place!")).toBeVisible();
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP D — Detail Page: Multiple Reviews (3 users, ratings 5+4+1)
// ═══════════════════════════════════════════════════════════════════════════════

test("TC7-5: Detail page shows correct stats, breakdown, and all comments for multiple reviews", async ({ page }) => {
  // avg = (5+4+1)/3 = 3.3
  await page.goto(`${BASE_URL}/campground/${campMultiId}`);
  // Average and count
  await expect(page.getByText("3.3")).toBeVisible();
  await expect(page.locator("div.text-sm.text-slate-400", { hasText: /^3 reviews$/i })).toBeVisible();
  // Star breakdown
  const fiveRow = page.locator("div.flex.items-center.gap-3")
    .filter({ has: page.locator("span.text-sm.text-slate-300", { hasText: /^5$/ }) })
    .filter({ has: page.locator("div.text-sm.text-slate-400.w-12.text-right", { hasText: /^1$/ }) });
  await expect(fiveRow).toBeVisible();
  const fourRow = page.locator("div.flex.items-center.gap-3")
    .filter({ has: page.locator("span.text-sm.text-slate-300", { hasText: /^4$/ }) })
    .filter({ has: page.locator("div.text-sm.text-slate-400.w-12.text-right", { hasText: /^1$/ }) });
  await expect(fourRow).toBeVisible();
  const oneRow = page.locator("div.flex.items-center.gap-3")
    .filter({ has: page.locator("span.text-sm.text-slate-300", { hasText: /^1$/ }) })
    .filter({ has: page.locator("div.text-sm.text-slate-400.w-12.text-right", { hasText: /^1$/ }) });
  await expect(oneRow).toBeVisible();
  // All comments visible
  await expect(page.getByText("User A: Excellent!")).toBeVisible();
  await expect(page.getByText("User B: Very nice.")).toBeVisible();
  await expect(page.getByText("User C: Not great.")).toBeVisible();
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP E — Sort: Highest Rated / Lowest Rated / Most Recent
// ═══════════════════════════════════════════════════════════════════════════════

test('TC7-6: Sort "Highest rated" shows 4★ review before 2★ review', async ({ page }) => {
  await loginUI(page, USER_A_EMAIL, USER_A_PASSWORD);
  await gotoDetail(page, campSortId);

  await page.getByRole("button", { name: /most recent/i }).click();
  await page.getByRole("button", { name: /highest rated/i }).click();

  const highIdx = await page.getByText("Sort: Four stars").evaluate((el) =>
    [...document.querySelectorAll("p")].indexOf(el as HTMLParagraphElement));
  const lowIdx  = await page.getByText("Sort: Two stars").evaluate((el) =>
    [...document.querySelectorAll("p")].indexOf(el as HTMLParagraphElement));
  expect(highIdx).toBeLessThan(lowIdx);
});

test('TC7-7: Sort "Lowest rated" shows 2★ review before 4★ review', async ({ page }) => {
  await loginUI(page, USER_A_EMAIL, USER_A_PASSWORD);
  await gotoDetail(page, campSortId);

  await page.getByRole("button", { name: /most recent/i }).click();
  await page.getByRole("button", { name: /lowest rated/i }).click();

  const lowIdx  = await page.getByText("Sort: Two stars").evaluate((el) =>
    [...document.querySelectorAll("p")].indexOf(el as HTMLParagraphElement));
  const highIdx = await page.getByText("Sort: Four stars").evaluate((el) =>
    [...document.querySelectorAll("p")].indexOf(el as HTMLParagraphElement));
  expect(lowIdx).toBeLessThan(highIdx);
});

test('TC7-8: Sort "Most recent" shows most recently posted review first', async ({ page }) => {
  // User B's review was posted after User A's, so it should appear first
  await loginUI(page, USER_A_EMAIL, USER_A_PASSWORD);
  await gotoDetail(page, campSortId);

  // Switch to highest rated first, then back to most recent
  await page.getByRole("button", { name: /most recent/i }).click();
  await page.getByRole("button", { name: /highest rated/i }).click();
  await page.getByRole("button", { name: /highest rated/i }).click();
  await page.getByRole("button", { name: /most recent/i }).click();

  const recentIdx = await page.getByText("Sort: Two stars").evaluate((el) =>
    [...document.querySelectorAll("p")].indexOf(el as HTMLParagraphElement));
  const olderIdx  = await page.getByText("Sort: Four stars").evaluate((el) =>
    [...document.querySelectorAll("p")].indexOf(el as HTMLParagraphElement));
  expect(recentIdx).toBeLessThan(olderIdx);
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP F — Summary View (US2-5)
// ═══════════════════════════════════════════════════════════════════════════════

test("TC7-9: Summary view shows campground info, average rating, and all reviews", async ({ page }) => {
  await page.goto(`${BASE_URL}/campground/${campSummaryId}`);
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/Test Road/i)).toBeVisible();
  await expect(page.getByText("4.5")).toBeVisible(); // (5+4)/2
  await expect(page.getByText("Summary: Excellent!")).toBeVisible();
  await expect(page.getByText("Summary: Very nice.")).toBeVisible();
});

test("TC7-10: Non-existent campground ID shows error message", async ({ page }) => {
  await page.goto(`${BASE_URL}/campground/${CAMP_NONEXISTENT_ID}`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(/failed to fetch campground/i)).toBeVisible({ timeout: 10_000 });
});