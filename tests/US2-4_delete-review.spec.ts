/**
 * E2E Test Suite: Delete Rating & Comment (US2-4)
 * Frontend: Campground Detail page → ReviewItem → Delete button
 *
 * Test Plan Reference: DOCS/Sirawit_US2-4.docx
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

import {
  test,
  expect,
  Page,
  request as playwrightRequest,
  APIRequestContext,
} from "@playwright/test";

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "123456";
const USER_EMAIL = "user@gmail.com";
const USER_PASSWORD = "123456";

const RUN_ID = Date.now();
const CAMPGROUND_NAME = `DeleteReview-${RUN_ID}`;

// ─── Resource tracking ───────────────────────────────────────────────────────

let adminToken = "";
let userToken = "";
let user2Token = "";
let campgroundId = "";
const createdCampgroundIds: string[] = [];
const createdBookingIds: string[] = [];
const createdReviewIds: string[] = [];
let user2Id = "";

// ─── API helpers ─────────────────────────────────────────────────────────────

async function apiLogin(email: string, password: string): Promise<string> {
  const ctx = await playwrightRequest.newContext();
  try {
    const res = await ctx.post(`${BACKEND_URL}/api/v1/auth/login`, {
      data: { email, password },
    });
    const json = await res.json();
    if (!json.token)
      throw new Error(`Login failed for ${email}: ${JSON.stringify(json)}`);
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
      address: "123 Forest Road, Chiang Mai",
      tel: "0812345678",
      picture:
        "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg",
    },
  });
  const json = await res.json();
  if (!json.success)
    throw new Error(`Create campground failed: ${JSON.stringify(json)}`);
  return json.data._id;
}

async function apiCreateBooking(
  api: APIRequestContext,
  token: string,
  campId: string,
): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const res = await api.post(
    `${BACKEND_URL}/api/v1/campgrounds/${campId}/bookings`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: { bookingDate: today, nights: 1 },
    },
  );
  const json = await res.json();
  if (!json.success)
    throw new Error(`Create booking failed: ${JSON.stringify(json)}`);
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
  const res = await api.post(
    `${BACKEND_URL}/api/v1/campgrounds/${campId}/reviews`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: { booking: bookingId, rating, comment },
    },
  );
  const json = await res.json();
  if (!json.success)
    throw new Error(`Create review failed: ${JSON.stringify(json)}`);
  return json.data._id;
}

async function apiGetCampground(
  api: APIRequestContext,
  campId: string,
): Promise<any> {
  const res = await api.get(`${BACKEND_URL}/api/v1/campgrounds/${campId}`);
  const json = await res.json();
  if (!json.success)
    throw new Error(`Get campground failed: ${JSON.stringify(json)}`);
  return json.data;
}

async function apiRegisterUser(
  api: APIRequestContext,
  email: string,
  name: string,
  tel: string,
): Promise<string> {
  const res = await api.post(`${BACKEND_URL}/api/v1/auth/register`, {
    data: { name, email, password: "123456", tel, role: "user" },
  });
  const json = await res.json();
  if (!json.success)
    throw new Error(`Register failed: ${JSON.stringify(json)}`);
  return json._id;
}

async function apiGetUserProfile(
  api: APIRequestContext,
  token: string,
): Promise<any> {
  const res = await api.get(`${BACKEND_URL}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.success)
    throw new Error(`Get profile failed: ${JSON.stringify(json)}`);
  return json.data;
}

// ─── UI helpers ──────────────────────────────────────────────────────────────

async function loginUserUI(
  page: Page,
  email = USER_EMAIL,
  password = USER_PASSWORD,
) {
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
  // Find the review by its comment text, then find the delete button within that review
  const reviewItem = page
    .locator("div.flex.gap-4.py-5")
    .filter({ hasText: reviewText });
  const deleteBtn = reviewItem.locator('button[title="Delete review"]');
  await deleteBtn.click();
}

// ─── Setup ───────────────────────────────────────────────────────────────────

test.beforeAll(async () => {
  const api = await playwrightRequest.newContext();
  try {
    adminToken = await apiLogin(ADMIN_EMAIL, ADMIN_PASSWORD);
    userToken = await apiLogin(USER_EMAIL, USER_PASSWORD);

    // Register a second user for authorization tests
    const user2Email = `user2-${RUN_ID}@test.com`;
    await apiRegisterUser(api, user2Email, "Test User 2", `08${RUN_ID.toString().slice(-8)}`);
    user2Token = await apiLogin(user2Email, "123456");
    const user2Profile = await apiGetUserProfile(api, user2Token);
    user2Id = user2Profile._id;

    campgroundId = await apiCreateCampground(api, adminToken, CAMPGROUND_NAME);

    console.log(`Setup OK: campground=${campgroundId}`);
  } finally {
    await api.dispose();
  }
});

test.afterAll(async () => {
  const api = await playwrightRequest.newContext();
  try {
    // Delete reviews
    for (const rid of createdReviewIds) {
      await api
        .delete(`${BACKEND_URL}/api/v1/reviews/${rid}`, {
          headers: { Authorization: `Bearer ${userToken}` },
        })
        .catch(() => {});
      console.log(`Cleanup: delete review ${rid}`);
    }

    // Delete bookings
    for (const bid of createdBookingIds) {
      await api
        .delete(`${BACKEND_URL}/api/v1/bookings/${bid}`, {
          headers: { Authorization: `Bearer ${userToken}` },
        })
        .catch(() => {});
      console.log(`Cleanup: delete booking ${bid}`);
    }

    // Delete campgrounds (including fresh ones created in tests)
    for (const cid of createdCampgroundIds) {
      await api.delete(`${BACKEND_URL}/api/v1/campgrounds/${cid}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      console.log(`Cleanup: delete campground ${cid}`);
    }

    // Delete main campground
    if (campgroundId) {
      await api.delete(`${BACKEND_URL}/api/v1/campgrounds/${campgroundId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      console.log(`Cleanup: delete campground ${campgroundId}`);
    }

    // Delete user2
    if (user2Id) {
      await api.delete(`${BACKEND_URL}/api/v1/auth/delete/${user2Id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      console.log(`Cleanup: delete user2 ${user2Id}`);
    }
  } finally {
    await api.dispose();
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// TC4-1: Valid review ID and owner authorization
// ═════════════════════════════════════════════════════════════════════════════

test("TC4-1: Owner can delete their review with valid ID", async ({ page }) => {
  const api = await playwrightRequest.newContext();
  let bookingId = "";
  let reviewId = "";

  try {
    bookingId = await apiCreateBooking(api, userToken, campgroundId);
    createdBookingIds.push(bookingId);

    reviewId = await apiCreateReview(
      api,
      userToken,
      campgroundId,
      bookingId,
      5,
      "TC4-1: Valid review to delete",
    );
    createdReviewIds.push(reviewId);
  } finally {
    await api.dispose();
  }

  await loginUserUI(page);
  await gotoCampgroundDetail(page, campgroundId);

  // Verify review is visible
  await expect(page.getByText("TC4-1: Valid review to delete")).toBeVisible();

  // Accept the confirmation dialog
  page.once("dialog", (dialog) => dialog.accept());

  // Click delete
  await clickDeleteReview(page, "TC4-1: Valid review to delete");

  // Success toast should appear
  await expect(page.getByText(/deleted successfully/i)).toBeVisible();

  // Review should be removed from the page
  await expect(
    page.getByText("TC4-1: Valid review to delete"),
  ).not.toBeVisible();

  // Remove from tracking since it's already deleted
  const idx = createdReviewIds.indexOf(reviewId);
  if (idx > -1) createdReviewIds.splice(idx, 1);
});

// ═════════════════════════════════════════════════════════════════════════════
// TC4-4: User is the owner of the review
// ═════════════════════════════════════════════════════════════════════════════

test("TC4-4: Review owner can successfully delete their review", async ({
  page,
}) => {
  const api = await playwrightRequest.newContext();
  let bookingId = "";
  let reviewId = "";

  try {
    bookingId = await apiCreateBooking(api, userToken, campgroundId);
    createdBookingIds.push(bookingId);

    reviewId = await apiCreateReview(
      api,
      userToken,
      campgroundId,
      bookingId,
      4,
      "TC4-4: Owner's review",
    );
    createdReviewIds.push(reviewId);
  } finally {
    await api.dispose();
  }

  await loginUserUI(page);
  await gotoCampgroundDetail(page, campgroundId);

  await expect(page.getByText("TC4-4: Owner's review")).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await clickDeleteReview(page, "TC4-4: Owner's review");

  await expect(page.getByText(/deleted successfully/i)).toBeVisible();
  await expect(page.getByText("TC4-4: Owner's review")).not.toBeVisible();

  const idx = createdReviewIds.indexOf(reviewId);
  if (idx > -1) createdReviewIds.splice(idx, 1);
});

// ═════════════════════════════════════════════════════════════════════════════
// TC4-5: User is NOT the owner (authorization failure)
// ═════════════════════════════════════════════════════════════════════════════

test("TC4-5: Non-owner cannot see delete button for another user's review", async ({
  page,
}) => {
  const api = await playwrightRequest.newContext();
  let bookingId = "";
  let reviewId = "";

  try {
    // User 1 creates a review
    bookingId = await apiCreateBooking(api, userToken, campgroundId);
    createdBookingIds.push(bookingId);

    reviewId = await apiCreateReview(
      api,
      userToken,
      campgroundId,
      bookingId,
      3,
      "TC4-5: User1's review",
    );
    createdReviewIds.push(reviewId);
  } finally {
    await api.dispose();
  }

  // User 2 logs in and views the campground
  const user2Email = `user2-${RUN_ID}@test.com`;
  await loginUserUI(page, user2Email, "123456");
  await gotoCampgroundDetail(page, campgroundId);

  // Review should be visible
  await expect(page.getByText("TC4-5: User1's review")).toBeVisible();

  // Delete button should NOT be visible to user2
  const reviewItem = page
    .locator("div.flex.gap-4.py-5")
    .filter({ hasText: "TC4-5: User1's review" });
  await expect(reviewItem.locator('button[title="Delete review"]')).not.toBeVisible();
});

// ═════════════════════════════════════════════════════════════════════════════
// TC4-7: Delete the only review → stats reset to zero
// ═════════════════════════════════════════════════════════════════════════════

test("TC4-7: Deleting the only review resets campground stats to zero", async ({
  page,
}) => {
  // Create a fresh campground for this test to avoid interference
  const api = await playwrightRequest.newContext();
  let freshCampId = "";
  let bookingId = "";
  let reviewId = "";

  try {
    freshCampId = await apiCreateCampground(
      api,
      adminToken,
      `DeleteOnly-${Date.now()}`,
    );
    createdCampgroundIds.push(freshCampId);

    bookingId = await apiCreateBooking(api, userToken, freshCampId);
    createdBookingIds.push(bookingId);

    reviewId = await apiCreateReview(
      api,
      userToken,
      freshCampId,
      bookingId,
      4,
      "TC4-7: Only review",
    );
    createdReviewIds.push(reviewId);
  } finally {
    await api.dispose();
  }

  await loginUserUI(page);
  await gotoCampgroundDetail(page, freshCampId);

  // Verify initial state: 1 review, rating 4.0
  await expect(page.getByText("4.0")).toBeVisible();
  await expect(
    page.locator("div.text-sm.text-slate-400", { hasText: /^1 review$/i }),
  ).toBeVisible();

  // Delete the review
  page.once("dialog", (dialog) => dialog.accept());
  await clickDeleteReview(page, "TC4-7: Only review");

  await expect(page.getByText(/deleted successfully/i)).toBeVisible();

  // Stats should reset to zero
  await expect(page.getByText("0.0")).toBeVisible();
  await expect(
    page.locator("div.text-sm.text-slate-400", { hasText: /^0 reviews$/i }),
  ).toBeVisible();

  // Empty state message should appear
  await expect(
    page.getByText(/no reviews yet.*be the first to review/i),
  ).toBeVisible();

  const idx = createdReviewIds.indexOf(reviewId);
  if (idx > -1) createdReviewIds.splice(idx, 1);
});

// ═════════════════════════════════════════════════════════════════════════════
// TC4-8: Delete one of multiple reviews → stats decrease correctly
// ═════════════════════════════════════════════════════════════════════════════

test("TC4-8: Deleting one review from multiple reviews updates stats correctly", async ({
  page,
}) => {
  // Create a fresh campground for this test to avoid interference
  const api = await playwrightRequest.newContext();
  let freshCampId = "";
  let booking1Id = "";
  let booking2Id = "";
  let review1Id = "";
  let review2Id = "";

  try {
    freshCampId = await apiCreateCampground(
      api,
      adminToken,
      `DeleteMultiple-${Date.now()}`,
    );
    createdCampgroundIds.push(freshCampId);

    // User 1 creates first review (rating 4)
    booking1Id = await apiCreateBooking(api, userToken, freshCampId);
    createdBookingIds.push(booking1Id);

    review1Id = await apiCreateReview(
      api,
      userToken,
      freshCampId,
      booking1Id,
      4,
      "TC4-8: First review",
    );
    createdReviewIds.push(review1Id);

    // User 2 creates second review (rating 2)
    booking2Id = await apiCreateBooking(api, user2Token, freshCampId);
    createdBookingIds.push(booking2Id);

    review2Id = await apiCreateReview(
      api,
      user2Token,
      freshCampId,
      booking2Id,
      2,
      "TC4-8: Second review",
    );
    createdReviewIds.push(review2Id);
  } finally {
    await api.dispose();
  }

  await loginUserUI(page);
  await gotoCampgroundDetail(page, freshCampId);

  // Initial state: 2 reviews, average = (4+2)/2 = 3.0
  await expect(page.getByText("3.0")).toBeVisible();
  await expect(
    page.locator("div.text-sm.text-slate-400", { hasText: /^2 reviews$/i }),
  ).toBeVisible();

  // Delete user1's review (rating 4)
  page.once("dialog", (dialog) => dialog.accept());
  await clickDeleteReview(page, "TC4-8: First review");

  await expect(page.getByText(/deleted successfully/i)).toBeVisible();

  // Stats should update: 1 review remaining, average = 2.0
  await expect(page.getByText("2.0")).toBeVisible();
  await expect(
    page.locator("div.text-sm.text-slate-400", { hasText: /^1 review$/i }),
  ).toBeVisible();

  const idx = createdReviewIds.indexOf(review1Id);
  if (idx > -1) createdReviewIds.splice(idx, 1);
});

// ═════════════════════════════════════════════════════════════════════════════
// TC4-9: ratingCount array updates correctly after deletion
// ═════════════════════════════════════════════════════════════════════════════

test("TC4-9: Deleting a review decreases the correct ratingCount bucket", async ({
  page,
}) => {
  // Create a fresh campground for this test to avoid interference
  const api = await playwrightRequest.newContext();
  let freshCampId = "";
  let bookingId = "";
  let reviewId = "";

  try {
    freshCampId = await apiCreateCampground(
      api,
      adminToken,
      `DeleteRatingCount-${Date.now()}`,
    );
    createdCampgroundIds.push(freshCampId);

    bookingId = await apiCreateBooking(api, userToken, freshCampId);
    createdBookingIds.push(bookingId);

    reviewId = await apiCreateReview(
      api,
      userToken,
      freshCampId,
      bookingId,
      5,
      "TC4-9: Five star review",
    );
    createdReviewIds.push(reviewId);
  } finally {
    await api.dispose();
  }

  await loginUserUI(page);
  await gotoCampgroundDetail(page, freshCampId);

  // Verify 5-star count is 1
  const fiveStarRow = page
    .locator("div.flex.items-center.gap-3")
    .filter({ has: page.locator("span.text-sm.text-slate-300", { hasText: /^5$/ }) })
    .filter({
      has: page.locator("div.text-sm.text-slate-400.w-12.text-right", {
        hasText: /^1$/,
      }),
    });
  await expect(fiveStarRow).toBeVisible();

  // Delete the review
  page.once("dialog", (dialog) => dialog.accept());
  await clickDeleteReview(page, "TC4-9: Five star review");

  await expect(page.getByText(/deleted successfully/i)).toBeVisible();

  // 5-star count should now be 0
  const fiveStarRowAfter = page
    .locator("div.flex.items-center.gap-3")
    .filter({ has: page.locator("span.text-sm.text-slate-300", { hasText: /^5$/ }) })
    .filter({
      has: page.locator("div.text-sm.text-slate-400.w-12.text-right", {
        hasText: /^0$/,
      }),
    });
  await expect(fiveStarRowAfter).toBeVisible();

  const idx = createdReviewIds.indexOf(reviewId);
  if (idx > -1) createdReviewIds.splice(idx, 1);
});

// ═════════════════════════════════════════════════════════════════════════════
// Additional: Cancel delete confirmation keeps the review
// ═════════════════════════════════════════════════════════════════════════════

test("TC4-Extra: Cancelling delete confirmation keeps the review", async ({
  page,
}) => {
  const api = await playwrightRequest.newContext();
  let bookingId = "";
  let reviewId = "";

  try {
    bookingId = await apiCreateBooking(api, userToken, campgroundId);
    createdBookingIds.push(bookingId);

    reviewId = await apiCreateReview(
      api,
      userToken,
      campgroundId,
      bookingId,
      3,
      "TC4-Extra: Cancel delete",
    );
    createdReviewIds.push(reviewId);
  } finally {
    await api.dispose();
  }

  await loginUserUI(page);
  await gotoCampgroundDetail(page, campgroundId);

  await expect(page.getByText("TC4-Extra: Cancel delete")).toBeVisible();

  // Dismiss the confirmation dialog
  page.once("dialog", (dialog) => dialog.dismiss());
  await clickDeleteReview(page, "TC4-Extra: Cancel delete");

  // Review should still be visible
  await expect(page.getByText("TC4-Extra: Cancel delete")).toBeVisible();

  // No success toast should appear
  await expect(page.getByText(/deleted successfully/i)).not.toBeVisible();
});
