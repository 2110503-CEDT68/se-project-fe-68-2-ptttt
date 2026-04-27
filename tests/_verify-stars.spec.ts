import { test, expect, request as playwrightRequest } from '@playwright/test';

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

test('verify selectStars(4) actually sets rating to 4', async ({ page }) => {
  // Login as user
  await page.goto(`${BASE_URL}/authentication`);
  await page.getByPlaceholder('your@email.com').fill('user@gmail.com');
  await page.getByPlaceholder('••••••••').fill('123456');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(`${BASE_URL}/`);

  // Setup: create a campground + booking via API
  const ctx = await playwrightRequest.newContext();
  const adminLogin = await ctx.post(`${BACKEND_URL}/api/v1/auth/login`, {
    data: { email: 'admin@gmail.com', password: '123456' },
  });
  const adminToken = (await adminLogin.json()).token;
  await ctx.dispose();

  const ctx2 = await playwrightRequest.newContext();
  const userLogin = await ctx2.post(`${BACKEND_URL}/api/v1/auth/login`, {
    data: { email: 'user@gmail.com', password: '123456' },
  });
  const userToken = (await userLogin.json()).token;
  await ctx2.dispose();

  const api = await playwrightRequest.newContext();
  const campRes = await api.post(`${BACKEND_URL}/api/v1/campgrounds`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { name: `VerifyStars-${Date.now()}`, address: 'x', tel: '0800000000', picture: 'https://example.com/x.jpg' },
  });
  const campId = (await campRes.json()).data._id;

  const bkRes = await api.post(`${BACKEND_URL}/api/v1/campgrounds/${campId}/bookings`, {
    headers: { Authorization: `Bearer ${userToken}` },
    data: { bookingDate: new Date().toISOString().slice(0, 10), nights: 1 },
  });
  const bkId = (await bkRes.json()).data._id;

  await page.goto(`${BASE_URL}/campground/${campId}`);
  await expect(page.getByText(/rate this campground/i)).toBeVisible();

  // Click input with value=4
  await page.locator('input[name="campground-rating"][value="4"]').click({ force: true });

  // Read what the form says
  const ratingText = await page.locator('span', { hasText: /you rated:/i }).textContent({ timeout: 3000 });
  console.log('>>> ACTUAL DISPLAY:', ratingText);

  // Cleanup
  await api.delete(`${BACKEND_URL}/api/v1/bookings/${bkId}`, { headers: { Authorization: `Bearer ${userToken}` } });
  await api.delete(`${BACKEND_URL}/api/v1/campgrounds/${campId}`, { headers: { Authorization: `Bearer ${adminToken}` } });
  await api.dispose();

  // Assert exactly 4
  expect(ratingText).toMatch(/you rated:\s*4\s*\/\s*5/i);
});
