/**
 * E2E Test Suite: Review Page State Update Logic
 * Frontend: Campground Detail page -> Review Form / Review Item -> router.refresh()
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

const BASE_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "123456";
const USER_EMAIL = "user@gmail.com";
const USER_PASSWORD = "123456";

const RUN_ID = Date.now();

type TestResource = {
  campgroundId: string;
  bookingIds: string[];
  reviewIds: string[];
};

let adminToken = "";
let userToken = "";
let currentResource: TestResource | null = null;

async function apiLogin(email: string, password: string): Promise<string> {
  // Use a one-shot context so login cookies from one call do not affect the next.
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
      address: "123 Forest Road, Chiang Mai",
      tel: "0812345678",
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
  bookingId: string,
  rating: number,
  comment: string,
): Promise<string> {
  const res = await api.post(`${BACKEND_URL}/api/v1/campgrounds/${campId}/reviews`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { booking: bookingId, rating, comment },
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(`Create review failed: ${JSON.stringify(json)}`);
  }
  return json.data._id;
}

async function loginUserUI(page: Page) {
  await page.goto(`${BASE_URL}/authentication`);
  await page.getByPlaceholder("your@email.com").fill(USER_EMAIL);
  await page.getByPlaceholder("••••••••").fill(USER_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(`${BASE_URL}/`);
}

async function gotoCampgroundDetail(page: Page, campgroundId: string) {
  await page.goto(`${BASE_URL}/campground/${campgroundId}`);
  await expect(page.getByText(/rate this campground/i)).toBeVisible();
}

async function selectStars(page: Page, n: number) {
  // MUI Rating uses visually-hidden radio inputs, so force the click on the
  // target value instead of relying on Playwright's visibility checks.
  await page
    .locator(`input[name="campground-rating"][value="${n}"]`)
    .click({ force: true });
}

async function fillComment(page: Page, text: string) {
  await page.getByPlaceholder("Share your experience at this campground").fill(text);
}

async function clickPostReview(page: Page) {
  await page.getByRole("button", { name: /^post review$/i }).click();
}

async function captureCreatedReviewId(page: Page): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    let resolved = false;
    const handler = async (response: any) => {
      if (resolved) return;
      const url = response.url();
      if (url.includes("/reviews") && response.request().method() === "POST") {
        try {
          const json = await response.json();
          if (json.success && json.data?._id) {
            resolved = true;
            page.off("response", handler);
            resolve(json.data._id);
          }
        } catch {
          // ignore parse errors
        }
      }
    };

    page.on("response", handler);

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        page.off("response", handler);
        resolve(null);
      }
    }, 10_000);
  });
}

async function createFreshResource(nameSuffix: string): Promise<TestResource> {
  const api = await playwrightRequest.newContext();
  try {
    const campgroundId = await apiCreateCampground(
      api,
      adminToken,
      `ReviewRefresh-${RUN_ID}-${nameSuffix}`,
    );
    const bookingId = await apiCreateBooking(api, userToken, campgroundId);
    return {
      campgroundId,
      bookingIds: [bookingId],
      reviewIds: [],
    };
  } finally {
    await api.dispose();
  }
}

async function cleanupResource(resource: TestResource | null) {
  if (!resource) return;

  const api = await playwrightRequest.newContext();
  try {
    for (const reviewId of resource.reviewIds) {
      await api.delete(`${BACKEND_URL}/api/v1/reviews/${reviewId}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
    }

    for (const bookingId of resource.bookingIds) {
      await api.delete(`${BACKEND_URL}/api/v1/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
    }

    await api.delete(`${BACKEND_URL}/api/v1/campgrounds/${resource.campgroundId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  } finally {
    await api.dispose();
  }
}

test.beforeAll(async () => {
  adminToken = await apiLogin(ADMIN_EMAIL, ADMIN_PASSWORD);
  userToken = await apiLogin(USER_EMAIL, USER_PASSWORD);
});

test.afterEach(async () => {
  await cleanupResource(currentResource);
  currentResource = null;
});

test("TC-S1: Posting a review refreshes the page state immediately", async ({ page }) => {
  currentResource = await createFreshResource("post");

  await loginUserUI(page);
  await gotoCampgroundDetail(page, currentResource.campgroundId);

  // Initial state: no reviews yet for this fresh campground.
  await expect(page.getByText("No reviews yet. Be the first to review!")).toBeVisible();
  await expect(page.getByText("0.0")).toBeVisible();

  const reviewIdPromise = captureCreatedReviewId(page);

  await selectStars(page, 5);
  await fillComment(page, "State refresh after posting.");
  await clickPostReview(page);

  await expect(page.getByText(/review posted successfully/i)).toBeVisible();

  const createdReviewId = await reviewIdPromise;
  if (createdReviewId) currentResource.reviewIds.push(createdReviewId);

  // router.refresh() should update both the summary section and the review list
  // without needing a manual reload in the test. This spec focuses on the
  // state transition itself, not the star-value mapping (covered elsewhere).
  await expect(page.getByText("State refresh after posting.")).toBeVisible();
  await expect(
    page.locator("div.text-sm.text-slate-400", { hasText: /^1 review$/i }),
  ).toBeVisible();
  await expect(page.getByText("No reviews yet. Be the first to review!")).not.toBeVisible();
});

test("TC-S2: Deleting the last review refreshes the page back to the empty state", async ({ page }) => {
  currentResource = await createFreshResource("delete");

  const api = await playwrightRequest.newContext();
  try {
    const reviewId = await apiCreateReview(
      api,
      userToken,
      currentResource.campgroundId,
      currentResource.bookingIds[0],
      4,
      "Delete me and refresh the page.",
    );
    currentResource.reviewIds.push(reviewId);
  } finally {
    await api.dispose();
  }

  await loginUserUI(page);
  await gotoCampgroundDetail(page, currentResource.campgroundId);

  await expect(page.getByText("Delete me and refresh the page.")).toBeVisible();
  await expect(page.getByText("4.0")).toBeVisible();
  await expect(
    page.locator("div.text-sm.text-slate-400", { hasText: /^1 review$/i }),
  ).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.locator('button[title="Delete review"]').first().click();

  await expect(page.getByText(/deleted successfully/i)).toBeVisible();

  // router.refresh() should pull the server-rendered empty state back in.
  await expect(page.getByText("Delete me and refresh the page.")).not.toBeVisible();
  await expect(page.getByText("No reviews yet. Be the first to review!")).toBeVisible();
  await expect(page.getByText("0.0")).toBeVisible();
  await expect(
    page.locator("div.text-sm.text-slate-400", { hasText: /^0 reviews$/i }),
  ).toBeVisible();

  // The review has already been deleted by the UI flow, so skip API cleanup for it.
  currentResource.reviewIds = [];
});
