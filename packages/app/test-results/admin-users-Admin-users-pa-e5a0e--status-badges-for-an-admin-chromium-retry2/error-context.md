# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-users.spec.ts >> Admin users page — listing and filters >> lists users with role and status badges for an admin
- Location: e2e/admin-users.spec.ts:138:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Wanda Worker')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Wanda Worker')
    - waiting for" http://localhost:3001/en/dashboard/admin/users" navigation to finish...
    - navigated to "http://localhost:3001/en/dashboard/admin/users"

```

```yaml
- alert
- dialog "Server Error":
  - navigation:
    - button "previous" [disabled]:
      - img "previous"
    - button "next" [disabled]:
      - img "next"
    - text: 1 of 1 error Next.js (14.2.35) is outdated
    - link "(learn more)":
      - /url: https://nextjs.org/docs/messages/version-staleness
  - heading "Server Error" [level=1]
  - paragraph: "TypeError: Cannot read properties of undefined (reading 'call')"
  - text: This error happened while generating the page. Any console logs will be displayed in the terminal window.
  - heading "Call Stack" [level=2]
  - group:
    - img
    - img
    - text: Next.js
  - heading "eval" [level=3]
  - text: webpack-internal:/node_modules/.pnpm/use-intl@4.9.1_react@18.3.1/node_modules/use-intl/dist/esm/development/formatters-r4aAmsMP.js
  - heading "(rsc)/../../node_modules/.pnpm/use-intl@4.9.1_react@18.3.1/node_modules/use-intl/dist/esm/development/formatters-r4aAmsMP.js" [level=3]
  - text: file:///Users/user/Documents/grntfox/Blue-Collar/packages/app/.next/server/vendor-chunks/use-intl@4.9.1_react@18.3.1.js (70:1)
  - group:
    - img
    - img
    - text: Next.js
  - heading "eval" [level=3]
  - text: webpack-internal:/node_modules/.pnpm/next-intl@4.9.1_next@14.2.35_@babel+core@7.29.0_@opentelemetry+api@1.9.1_@playwright+te_6fa6d9275d0a00aea124ee1f70eebdf9/node_modules/next-intl/dist/esm/development/server/react-server/getConfig.js
  - heading "(rsc)/../../node_modules/.pnpm/next-intl@4.9.1_next@14.2.35_@babel+core@7.29.0_@opentelemetry+api@1.9.1_@playwright+te_6fa6d9275d0a00aea124ee1f70eebdf9/node_modules/next-intl/dist/esm/development/server/react-server/getConfig.js" [level=3]
  - text: file:///Users/user/Documents/grntfox/Blue-Collar/packages/app/.next/server/vendor-chunks/next-intl@4.9.1_next@14.2.35_@babel+core@7.29.0_@opentelemetry+api@1.9.1_@playwright+te_6fa6d9275d0a00aea124ee1f70eebdf9.js (70:1)
  - group:
    - img
    - img
    - text: Next.js
  - heading "eval" [level=3]
  - text: webpack-internal:/node_modules/.pnpm/next-intl@4.9.1_next@14.2.35_@babel+core@7.29.0_@opentelemetry+api@1.9.1_@playwright+te_6fa6d9275d0a00aea124ee1f70eebdf9/node_modules/next-intl/dist/esm/development/server/react-server/getConfigNow.js
  - heading "(rsc)/../../node_modules/.pnpm/next-intl@4.9.1_next@14.2.35_@babel+core@7.29.0_@opentelemetry+api@1.9.1_@playwright+te_6fa6d9275d0a00aea124ee1f70eebdf9/node_modules/next-intl/dist/esm/development/server/react-server/getConfigNow.js" [level=3]
  - text: file:///Users/user/Documents/grntfox/Blue-Collar/packages/app/.next/server/vendor-chunks/next-intl@4.9.1_next@14.2.35_@babel+core@7.29.0_@opentelemetry+api@1.9.1_@playwright+te_6fa6d9275d0a00aea124ee1f70eebdf9.js (80:1)
  - group:
    - img
    - img
    - text: Next.js
```

# Test source

```ts
  44  |       id: 'u-1',
  45  |       firstName: 'Wanda',
  46  |       lastName: 'Worker',
  47  |       email: 'wanda@example.com',
  48  |       role: 'user',
  49  |       deletedAt: null,
  50  |       createdAt: new Date(0).toISOString(),
  51  |     },
  52  |     {
  53  |       id: 'u-2',
  54  |       firstName: 'Carl',
  55  |       lastName: 'Curator',
  56  |       email: 'carl@example.com',
  57  |       role: 'curator',
  58  |       deletedAt: null,
  59  |       createdAt: new Date(0).toISOString(),
  60  |     },
  61  |     {
  62  |       id: 'admin-1',
  63  |       firstName: 'Ada',
  64  |       lastName: 'Admin',
  65  |       email: 'admin@example.com',
  66  |       role: 'admin',
  67  |       deletedAt: null,
  68  |       createdAt: new Date(0).toISOString(),
  69  |     },
  70  |   ];
  71  | }
  72  | 
  73  | /** Log the given user in for the app: sets the auth cookie (read by middleware.ts)
  74  |  *  and localStorage token (read by AuthContext), and mocks /auth/me. */
  75  | async function loginAs(page: Page, user: typeof ADMIN_USER | typeof REGULAR_USER) {
  76  |   await page.context().addCookies([{ name: 'bc_token', value: MOCK_TOKEN, url: BASE }]);
  77  |   await page.addInitScript((token) => {
  78  |     window.localStorage.setItem('bc_token', token);
  79  |   }, MOCK_TOKEN);
  80  |   await page.route('**/auth/me', (route) =>
  81  |     route.fulfill({
  82  |       status: 200,
  83  |       contentType: 'application/json',
  84  |       body: JSON.stringify({ data: user }),
  85  |     }),
  86  |   );
  87  | }
  88  | 
  89  | /** Mocks GET /v1/admin/users, applying the same search/role/status filters the
  90  |  *  real backend applies, so filter-driven tests exercise the request query params. */
  91  | async function mockUserList(page: Page, users: ReturnType<typeof makeUsers>) {
  92  |   await page.route('**/v1/admin/users?**', (route) => {
  93  |     const url = new URL(route.request().url());
  94  |     const search = url.searchParams.get('search')?.toLowerCase();
  95  |     const role = url.searchParams.get('role');
  96  |     const status = url.searchParams.get('status');
  97  | 
  98  |     let filtered = users;
  99  |     if (search) {
  100 |       filtered = filtered.filter(
  101 |         (u) =>
  102 |           u.firstName.toLowerCase().includes(search) ||
  103 |           u.lastName.toLowerCase().includes(search) ||
  104 |           u.email.toLowerCase().includes(search),
  105 |       );
  106 |     }
  107 |     if (role) filtered = filtered.filter((u) => u.role === role);
  108 |     if (status === 'suspended') filtered = filtered.filter((u) => u.deletedAt != null);
  109 |     if (status === 'active') filtered = filtered.filter((u) => u.deletedAt == null);
  110 | 
  111 |     return route.fulfill({
  112 |       status: 200,
  113 |       contentType: 'application/json',
  114 |       body: JSON.stringify({
  115 |         data: filtered,
  116 |         meta: { total: filtered.length, page: 1, limit: 20, pages: 1 },
  117 |       }),
  118 |     });
  119 |   });
  120 | }
  121 | 
  122 | test.describe('Admin users page — authorization', () => {
  123 |   test('blocks an unauthenticated visitor', async ({ page }) => {
  124 |     await page.goto(`${BASE}/en/dashboard/admin/users`);
  125 |     await page.waitForURL(/login|auth/, { timeout: 10_000 });
  126 |     expect(page.url()).toMatch(/login|auth/);
  127 |   });
  128 | 
  129 |   test('redirects a non-admin user away', async ({ page }) => {
  130 |     await loginAs(page, REGULAR_USER);
  131 |     await mockUserList(page, makeUsers());
  132 |     await page.goto(`${BASE}/en/dashboard/admin/users`);
  133 |     await expect(page).not.toHaveURL(/dashboard\/admin\/users/, { timeout: 10_000 });
  134 |   });
  135 | });
  136 | 
  137 | test.describe('Admin users page — listing and filters', () => {
  138 |   test('lists users with role and status badges for an admin', async ({ page }) => {
  139 |     await loginAs(page, ADMIN_USER);
  140 |     await mockUserList(page, makeUsers());
  141 | 
  142 |     await page.goto(`${BASE}/en/dashboard/admin/users`);
  143 | 
> 144 |     await expect(page.getByText('Wanda Worker')).toBeVisible();
      |                                                  ^ Error: expect(locator).toBeVisible() failed
  145 |     await expect(page.getByText('Carl Curator')).toBeVisible();
  146 |     await expect(page.getByText('Ada Admin')).toBeVisible();
  147 |     await expect(page.getByText('Active', { exact: false }).first()).toBeVisible();
  148 |   });
  149 | 
  150 |   test('filters the user list by search term', async ({ page }) => {
  151 |     await loginAs(page, ADMIN_USER);
  152 |     await mockUserList(page, makeUsers());
  153 | 
  154 |     await page.goto(`${BASE}/en/dashboard/admin/users`);
  155 |     await expect(page.getByText('Wanda Worker')).toBeVisible();
  156 | 
  157 |     await page.getByLabel('Search users').fill('carl');
  158 | 
  159 |     await expect(page.getByText('Carl Curator')).toBeVisible();
  160 |     await expect(page.getByText('Wanda Worker')).toHaveCount(0);
  161 |   });
  162 | 
  163 |   test('filters the user list by role', async ({ page }) => {
  164 |     await loginAs(page, ADMIN_USER);
  165 |     await mockUserList(page, makeUsers());
  166 | 
  167 |     await page.goto(`${BASE}/en/dashboard/admin/users`);
  168 |     await expect(page.getByText('Wanda Worker')).toBeVisible();
  169 | 
  170 |     await page.getByLabel('Filter by role').selectOption('curator');
  171 | 
  172 |     await expect(page.getByText('Carl Curator')).toBeVisible();
  173 |     await expect(page.getByText('Wanda Worker')).toHaveCount(0);
  174 |     await expect(page.getByText('Ada Admin')).toHaveCount(0);
  175 |   });
  176 | 
  177 |   test('filters the user list by status', async ({ page }) => {
  178 |     await loginAs(page, ADMIN_USER);
  179 |     const users = makeUsers();
  180 |     const wanda = users[0];
  181 |     if (wanda) wanda.deletedAt = new Date().toISOString();
  182 |     await mockUserList(page, users);
  183 | 
  184 |     await page.goto(`${BASE}/en/dashboard/admin/users`);
  185 |     await expect(page.getByText('Wanda Worker')).toBeVisible();
  186 | 
  187 |     await page.getByLabel('Filter by status').selectOption('suspended');
  188 | 
  189 |     await expect(page.getByText('Wanda Worker')).toBeVisible();
  190 |     await expect(page.getByText('Carl Curator')).toHaveCount(0);
  191 |   });
  192 | });
  193 | 
  194 | test.describe('Admin users page — moderation actions', () => {
  195 |   test('suspends a user and reflects the status change without a full reload', async ({ page }) => {
  196 |     await loginAs(page, ADMIN_USER);
  197 |     const users = makeUsers();
  198 |     let suspended = false;
  199 | 
  200 |     await page.route('**/v1/admin/users?**', (route) => {
  201 |       const data = users.map((u) => (u.id === 'u-1' && suspended ? { ...u, deletedAt: new Date().toISOString() } : u));
  202 |       return route.fulfill({
  203 |         status: 200,
  204 |         contentType: 'application/json',
  205 |         body: JSON.stringify({ data, meta: { total: data.length, page: 1, limit: 20, pages: 1 } }),
  206 |       });
  207 |     });
  208 |     await page.route('**/v1/admin/users/u-1/suspend', (route) => {
  209 |       suspended = true;
  210 |       return route.fulfill({
  211 |         status: 200,
  212 |         contentType: 'application/json',
  213 |         body: JSON.stringify({ data: { id: 'u-1', suspended: true }, status: 'success', code: 200 }),
  214 |       });
  215 |     });
  216 | 
  217 |     await page.goto(`${BASE}/en/dashboard/admin/users`);
  218 |     await expect(page.getByText('Wanda Worker')).toBeVisible();
  219 | 
  220 |     const row = page.locator('tr', { hasText: 'Wanda Worker' });
  221 |     await row.getByRole('button', { name: 'Suspend' }).click();
  222 | 
  223 |     await expect(row.getByText('Suspended')).toBeVisible();
  224 |     await expect(row.getByRole('button', { name: 'Unsuspend' })).toBeVisible();
  225 |     await expect(page).toHaveURL(/dashboard\/admin\/users/);
  226 |   });
  227 | 
  228 |   test('unsuspends a suspended user', async ({ page }) => {
  229 |     await loginAs(page, ADMIN_USER);
  230 |     const users = makeUsers();
  231 |     const wanda = users[0];
  232 |     if (wanda) wanda.deletedAt = new Date().toISOString();
  233 |     let unsuspended = false;
  234 | 
  235 |     await page.route('**/v1/admin/users?**', (route) => {
  236 |       const data = users.map((u) => (u.id === 'u-1' && unsuspended ? { ...u, deletedAt: null } : u));
  237 |       return route.fulfill({
  238 |         status: 200,
  239 |         contentType: 'application/json',
  240 |         body: JSON.stringify({ data, meta: { total: data.length, page: 1, limit: 20, pages: 1 } }),
  241 |       });
  242 |     });
  243 |     await page.route('**/v1/admin/users/u-1/unsuspend', (route) => {
  244 |       unsuspended = true;
```