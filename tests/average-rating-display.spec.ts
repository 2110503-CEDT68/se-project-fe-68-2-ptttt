/**
 * E2E Test Suite: Average Rating Display (US2-3)
 * Frontend: Campground Card (catalog page) + Campground Detail page
 *
 * Prerequisites:
 * - Frontend running at http://localhost:3001
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
  request as playwrightRequest,
  APIRequestContext,
} from "@playwright/test";

const BASE_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "123456";
const USER_EMAIL = "user@gmail.com";
const USER_PASSWORD = "123456";

const RUN_ID = Date.now();
const DETAIL_CAMPGROUND_NAME = `AvgRating-${RUN_ID}`;
const CARD_CAMPGROUND_NAME = `${DETAIL_CAMPGROUND_NAME}-card`;
const EMPTY_CARD_CAMPGROUND_NAME = `${DETAIL_CAMPGROUND_NAME}-card-empty`;
const ZERO_CAMPGROUND_NAME = `${DETAIL_CAMPGROUND_NAME}-zero`;

let adminToken = "";
let userToken = "";
let campgroundId = "";
let bookingId = "";
let reviewId = "";
let zeroCampId = "";
let catalogRatedCampId = "";
let catalogEmptyCampId = "";

const REVIEW_RATING = 4;

type CampgroundSnapshot = {
  _id: string;
  id?: string;
  name: string;
  address: string;
  tel: string;
  picture: string;
  sumRating: number;
  countReview: number;
  ratingCount: number[];
};

let catalogRatedOriginal: CampgroundSnapshot | null = null;
let catalogEmptyOriginal: CampgroundSnapshot | null = null;

async function apiLogin(email: string, password: string): Promise<string> {
  // Use a one-shot request context so backend auth cookies from one login do
  // not leak into the next login attempt.
  const ctx = await playwrightRequest.newContext();
  try {
    const res = await ctx.post(`${BACKEND_URL}/api/v1/auth/login`, {
      data: { email, password },
    });
    const json = await res.json();
    if (!json.token) {
      throw new Error(`Login failed for ${email}: ${JSON.stringify(json)}`);
    }
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
      address: "1 Test Road, Chiang Mai",
      tel: "0800000099",
      picture:
        "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg",
    },
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(`Create campground failed: ${JSON.stringify(json)}`);
  }
  return json.data._id;
}

async function apiGetCampgrounds(
  api: APIRequestContext,
): Promise<CampgroundSnapshot[]> {
  // Read the same first page the catalog UI renders. We reuse 2 visible rows
  // for card assertions because newly-created campgrounds do not show up
  // reliably on the cached catalog page during the same test run.
  const res = await api.get(`${BACKEND_URL}/api/v1/campgrounds?limit=25`);
  const json = await res.json();
  if (!json.success || !Array.isArray(json.data)) {
    throw new Error(`Get campgrounds failed: ${JSON.stringify(json)}`);
  }
  return json.data;
}

async function apiUpdateCampground(
  api: APIRequestContext,
  token: string,
  campId: string,
  data: Partial<CampgroundSnapshot>,
) {
  const res = await api.put(`${BACKEND_URL}/api/v1/campgrounds/${campId}`, {
    headers: { Authorization: `Bearer ${token}` },
    data,
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(`Update campground failed: ${JSON.stringify(json)}`);
  }
}

async function apiCreateBooking(
  api: APIRequestContext,
  token: string,
  campId: string,
): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const res = await api.post(`${BACKEND_URL}/api/v1/campgrounds/${campId}/bookings`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { bookingDate: today, nights: 1 },
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(`Create booking failed: ${JSON.stringify(json)}`);
  }
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
  const res = await api.post(`${BACKEND_URL}/api/v1/campgrounds/${campId}/reviews`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { booking: bkId, rating, comment },
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(`Create review failed: ${JSON.stringify(json)}`);
  }
  return json.data._id;
}

test.beforeAll(async () => {
  const api = await playwrightRequest.newContext();
  try {
    adminToken = await apiLogin(ADMIN_EMAIL, ADMIN_PASSWORD);
    userToken = await apiLogin(USER_EMAIL, USER_PASSWORD);

    // Detail-page tests use fully-owned test data that gets deleted in cleanup.
    campgroundId = await apiCreateCampground(api, adminToken, DETAIL_CAMPGROUND_NAME);
    bookingId = await apiCreateBooking(api, userToken, campgroundId);
    reviewId = await apiCreateReview(
      api,
      userToken,
      campgroundId,
      bookingId,
      REVIEW_RATING,
      "Nice place!",
    );

    zeroCampId = await apiCreateCampground(api, adminToken, ZERO_CAMPGROUND_NAME);

    const catalogCampgrounds = await apiGetCampgrounds(api);
    if (catalogCampgrounds.length < 2) {
      throw new Error("Need at least 2 visible catalog campgrounds for card tests");
    }

    // Card tests need campgrounds that are already visible on /campground.
    // We temporarily repurpose 2 visible entries, then restore them in teardown.
    catalogRatedOriginal = {
      ...catalogCampgrounds[0],
      ratingCount: [...(catalogCampgrounds[0].ratingCount ?? [0, 0, 0, 0, 0])],
    };
    catalogEmptyOriginal = {
      ...catalogCampgrounds[1],
      ratingCount: [...(catalogCampgrounds[1].ratingCount ?? [0, 0, 0, 0, 0])],
    };

    catalogRatedCampId = catalogRatedOriginal._id;
    catalogEmptyCampId = catalogEmptyOriginal._id;

    await apiUpdateCampground(api, adminToken, catalogRatedCampId, {
      name: CARD_CAMPGROUND_NAME,
      sumRating: REVIEW_RATING,
      countReview: 1,
      ratingCount: [0, 0, 0, 1, 0],
    });

    await apiUpdateCampground(api, adminToken, catalogEmptyCampId, {
      name: EMPTY_CARD_CAMPGROUND_NAME,
      sumRating: 0,
      countReview: 0,
      ratingCount: [0, 0, 0, 0, 0],
    });
  } finally {
    await api.dispose();
  }
});

test.afterAll(async () => {
  const api = await playwrightRequest.newContext();
  try {
    if (reviewId) {
      await api.delete(`${BACKEND_URL}/api/v1/reviews/${reviewId}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
    }

    if (bookingId) {
      await api.delete(`${BACKEND_URL}/api/v1/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
    }

    if (campgroundId) {
      await api.delete(`${BACKEND_URL}/api/v1/campgrounds/${campgroundId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }

    if (zeroCampId) {
      await api.delete(`${BACKEND_URL}/api/v1/campgrounds/${zeroCampId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }

    if (catalogRatedOriginal) {
      await apiUpdateCampground(api, adminToken, catalogRatedOriginal._id, {
        name: catalogRatedOriginal.name,
        address: catalogRatedOriginal.address,
        tel: catalogRatedOriginal.tel,
        picture: catalogRatedOriginal.picture,
        sumRating: catalogRatedOriginal.sumRating,
        countReview: catalogRatedOriginal.countReview,
        ratingCount: catalogRatedOriginal.ratingCount,
      });
    }

    if (catalogEmptyOriginal) {
      await apiUpdateCampground(api, adminToken, catalogEmptyOriginal._id, {
        name: catalogEmptyOriginal.name,
        address: catalogEmptyOriginal.address,
        tel: catalogEmptyOriginal.tel,
        picture: catalogEmptyOriginal.picture,
        sumRating: catalogEmptyOriginal.sumRating,
        countReview: catalogEmptyOriginal.countReview,
        ratingCount: catalogEmptyOriginal.ratingCount,
      });
    }
  } finally {
    await api.dispose();
  }
});

test("TC-1: Campground card shows star icon and average rating", async ({ page }) => {
  await page.goto(`${BASE_URL}/campground`);

  // These card tests target visible catalog records, so use the text anchor and
  // scope upward to the rendered card container.
  const card = page.getByText(CARD_CAMPGROUND_NAME).locator("../..");

  await expect(card.locator("svg").first()).toBeVisible();
  await expect(card.getByText("4.0")).toBeVisible();
});

test("TC-2: Campground card shows correct review count", async ({ page }) => {
  await page.goto(`${BASE_URL}/campground`);

  const card = page.getByText(CARD_CAMPGROUND_NAME).locator("../..");

  await expect(card.getByText(/1 review/i)).toBeVisible();
});

test('TC-3: Campground with no reviews shows "No reviews" on card', async ({ page }) => {
  await page.goto(`${BASE_URL}/campground`);

  const card = page.getByText(EMPTY_CARD_CAMPGROUND_NAME).locator("../..");

  await expect(card.getByText(/no reviews/i)).toBeVisible();
});

test("TC-4: Detail page shows correct average rating number", async ({ page }) => {
  await page.goto(`${BASE_URL}/campground/${campgroundId}`);

  await expect(page.getByText("4.0")).toBeVisible();
});

test("TC-5: Detail page shows correct total review count", async ({ page }) => {
  await page.goto(`${BASE_URL}/campground/${campgroundId}`);

  // The detail page also renders a separate "1 Review" heading in ReviewList,
  // so use a narrow locator for the summary text to avoid strict-mode clashes.
  await expect(
    page.locator("div.text-sm.text-slate-400", { hasText: /^1 review$/i }),
  ).toBeVisible();
});

test("TC-6: Detail page shows star breakdown bars", async ({ page }) => {
  await page.goto(`${BASE_URL}/campground/${campgroundId}`);

  // A plain getByText("4") is ambiguous here because "4" also appears in the
  // campground name, the average "4.0", and hidden rating text. Match the
  // actual breakdown row by combining the star label and its count.
  const breakdownRow = page
    .locator("div.flex.items-center.gap-3")
    .filter({
      has: page.locator("span.text-sm.text-slate-300", { hasText: /^4$/ }),
    })
    .filter({
      has: page.locator("div.text-sm.text-slate-400.w-12.text-right", {
        hasText: /^1$/,
      }),
    });

  await expect(breakdownRow).toBeVisible();
});

test("TC-7: Detail page shows 0.0 average when campground has no reviews", async ({ page }) => {
  await page.goto(`${BASE_URL}/campground/${zeroCampId}`);

  await expect(page.getByText("0.0")).toBeVisible();
});
