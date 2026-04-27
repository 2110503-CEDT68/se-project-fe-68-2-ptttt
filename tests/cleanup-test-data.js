/**
 * cleanup-test-data.js
 *
 * Emergency cleanup — deletes leftover campgrounds created by Playwright tests.
 *
 * Usage:
 *   node cleanup-test-data.js
 */

const BACKEND_URL    = process.env.BACKEND_URL    || 'http://localhost:5000';
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123456';

const TEST_PREFIXES = [
  'Test',
  'DeleteOnly',
  'Test Camp',
  'Test Update',
  'Test Campground',
  'Duplicate Camp',
  'Samila Beach',
  'AvgRating-',
  'PaginationTest-',
  'AdminTest-',
  'SummaryTest-',
  'CommentFE-',
  'ReviewList-',
  'RatingFE-',
  'ReviewRefresh-',
];

async function getAdminToken() {
  const res  = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const json = await res.json();
  if (!json.token) throw new Error(`Login failed: ${JSON.stringify(json)}`);
  console.log('✓ Logged in as admin');
  return json.token;
}

async function fetchAllCampgrounds(token) {
  const res  = await fetch(`${BACKEND_URL}/api/v1/campgrounds?limit=1000`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.success || !Array.isArray(json.data)) {
    throw new Error(`Failed to fetch campgrounds: ${JSON.stringify(json)}`);
  }
  return json.data;
}

async function deleteCampground(token, id, name) {
  const res = await fetch(`${BACKEND_URL}/api/v1/campgrounds/${id}`, {
    method:  'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.ok) {
    console.log(`  ✓ Deleted: "${name}"`);
  } else {
    const body = await res.text();
    console.warn(`  ✗ Failed: "${name}" — HTTP ${res.status}: ${body}`);
  }
}

async function main() {
  console.log('=== Playwright Test Data Cleanup ===');
  console.log(`Backend: ${BACKEND_URL}\n`);

  const token   = await getAdminToken();
  const all     = await fetchAllCampgrounds(token);
  const targets = all.filter((c) => TEST_PREFIXES.some((p) => c.name.startsWith(p)));

  console.log(`Found ${targets.length} test campground(s) to delete out of ${all.length} total.\n`);

  if (targets.length === 0) {
    console.log('Nothing to clean up. ✓');
    return;
  }

  for (const camp of targets) {
    await deleteCampground(token, camp._id, camp.name);
  }

  console.log(`\nDone. Deleted ${targets.length} campground(s).`);
}

main().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
