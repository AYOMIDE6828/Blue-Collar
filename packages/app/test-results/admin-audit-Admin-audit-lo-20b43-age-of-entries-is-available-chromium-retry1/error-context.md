# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-audit.spec.ts >> Admin audit log page — listing and filtering >> paginates when more than one page of entries is available
- Location: e2e/admin-audit.spec.ts:146:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  getByText('user.suspend')
Expected: visible
Received: undefined
Timeout:  5000ms

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('user.suspend')
    - waiting for" http://localhost:3001/en/dashboard/admin/audit" navigation to finish...

```

# Page snapshot

```yaml
- generic [active]:
  - img [ref=e3]
  - alert [ref=e6]
  - dialog "Server Error" [ref=e9]:
    - generic [ref=e10]:
      - generic [ref=e11]:
        - navigation [ref=e13]:
          - button "previous" [disabled] [ref=e14]:
            - img "previous" [ref=e15]
          - button "next" [disabled] [ref=e17]:
            - img "next" [ref=e18]
          - generic [ref=e20]: 1 of 1 error
          - generic [ref=e21]:
            - text: Next.js (14.2.35) is outdated
            - link "(learn more)" [ref=e23] [cursor=pointer]:
              - /url: https://nextjs.org/docs/messages/version-staleness
        - heading "Server Error" [level=1] [ref=e24]
        - paragraph [ref=e25]: "SyntaxError: Unexpected end of JSON input"
        - generic [ref=e26]: This error happened while generating the page. Any console logs will be displayed in the terminal window.
      - generic [ref=e27]:
        - heading "Call Stack" [level=2] [ref=e28]
        - generic [ref=e29]:
          - heading "JSON.parse" [level=3] [ref=e30]
          - generic [ref=e32]: <anonymous>
        - group [ref=e33]:
          - generic "Next.js" [ref=e34] [cursor=pointer]:
            - img [ref=e35]
            - img [ref=e37]
            - text: Next.js
```

# Test source

```ts
  61  | 
  62  | /** Log the given user in for the app: sets the auth cookie (read by middleware.ts)
  63  |  *  and localStorage token (read by AuthContext), and mocks /auth/me. */
  64  | async function loginAs(page: Page, user: typeof ADMIN_USER | typeof REGULAR_USER) {
  65  |   await page.context().addCookies([{ name: 'bc_token', value: MOCK_TOKEN, url: BASE }]);
  66  |   await page.addInitScript((token) => {
  67  |     window.localStorage.setItem('bc_token', token);
  68  |   }, MOCK_TOKEN);
  69  |   await page.route('**/auth/me', (route) =>
  70  |     route.fulfill({
  71  |       status: 200,
  72  |       contentType: 'application/json',
  73  |       body: JSON.stringify({ data: user }),
  74  |     }),
  75  |   );
  76  | }
  77  | 
  78  | async function mockAuditLogs(page: Page, logs: AuditEntry[]) {
  79  |   await page.route('**/v1/audit?**', (route) => {
  80  |     const url = new URL(route.request().url());
  81  |     const action = url.searchParams.get('action')?.toLowerCase();
  82  |     const filtered = action ? logs.filter((l) => l.action.toLowerCase().includes(action)) : logs;
  83  |     return route.fulfill({
  84  |       status: 200,
  85  |       contentType: 'application/json',
  86  |       body: JSON.stringify({
  87  |         data: filtered,
  88  |         meta: { total: filtered.length, page: 1, limit: 50, pages: 1 },
  89  |       }),
  90  |     });
  91  |   });
  92  | }
  93  | 
  94  | test.describe('Admin audit log page — authorization', () => {
  95  |   test('blocks an unauthenticated visitor', async ({ page }) => {
  96  |     await page.goto(`${BASE}/en/dashboard/admin/audit`);
  97  |     await page.waitForURL(/login|auth/, { timeout: 10_000 });
  98  |     expect(page.url()).toMatch(/login|auth/);
  99  |   });
  100 | 
  101 |   test('redirects a non-admin user away', async ({ page }) => {
  102 |     await loginAs(page, REGULAR_USER);
  103 |     await mockAuditLogs(page, makeLogs());
  104 |     await page.goto(`${BASE}/en/dashboard/admin/audit`);
  105 |     await expect(page).not.toHaveURL(/dashboard\/admin\/audit/, { timeout: 10_000 });
  106 |   });
  107 | });
  108 | 
  109 | test.describe('Admin audit log page — listing and filtering', () => {
  110 |   test('lists audit entries with actor, action, and resource columns', async ({ page }) => {
  111 |     await loginAs(page, ADMIN_USER);
  112 |     await mockAuditLogs(page, makeLogs());
  113 | 
  114 |     await page.goto(`${BASE}/en/dashboard/admin/audit`);
  115 | 
  116 |     await expect(page.getByText('user.suspend')).toBeVisible();
  117 |     await expect(page.getByText('dispute.resolve')).toBeVisible();
  118 |     await expect(page.getByText('Ada Admin')).toHaveCount(2);
  119 |   });
  120 | 
  121 |   test('shows an empty state when there are no matching entries', async ({ page }) => {
  122 |     await loginAs(page, ADMIN_USER);
  123 |     await mockAuditLogs(page, []);
  124 | 
  125 |     await page.goto(`${BASE}/en/dashboard/admin/audit`);
  126 | 
  127 |     await expect(page.getByText('No audit log entries found')).toBeVisible();
  128 |   });
  129 | 
  130 |   test('filtering by action sends the filter as a query param and narrows the results', async ({ page }) => {
  131 |     await loginAs(page, ADMIN_USER);
  132 |     await mockAuditLogs(page, makeLogs());
  133 | 
  134 |     await page.goto(`${BASE}/en/dashboard/admin/audit`);
  135 |     await expect(page.getByText('user.suspend')).toBeVisible();
  136 |     await expect(page.getByText('dispute.resolve')).toBeVisible();
  137 | 
  138 |     const request = page.waitForRequest((req) => req.url().includes('/v1/audit') && req.url().includes('action=dispute'));
  139 |     await page.getByPlaceholder('Filter by action...').fill('dispute');
  140 |     await request;
  141 | 
  142 |     await expect(page.getByText('dispute.resolve')).toBeVisible();
  143 |     await expect(page.getByText('user.suspend')).toHaveCount(0);
  144 |   });
  145 | 
  146 |   test('paginates when more than one page of entries is available', async ({ page }) => {
  147 |     await loginAs(page, ADMIN_USER);
  148 |     await page.route('**/v1/audit?**', (route) => {
  149 |       const url = new URL(route.request().url());
  150 |       const requestedPage = Number(url.searchParams.get('page') ?? '1');
  151 |       const logs = makeLogs();
  152 |       const pageEntries = requestedPage === 1 ? [logs[0]] : [logs[1]];
  153 |       return route.fulfill({
  154 |         status: 200,
  155 |         contentType: 'application/json',
  156 |         body: JSON.stringify({ data: pageEntries, meta: { total: 2, page: requestedPage, limit: 1, pages: 2 } }),
  157 |       });
  158 |     });
  159 | 
  160 |     await page.goto(`${BASE}/en/dashboard/admin/audit`);
> 161 |     await expect(page.getByText('user.suspend')).toBeVisible();
      |                                                  ^ Error: expect(locator).toBeVisible() failed
  162 |     await expect(page.getByText('Page 1 of 2')).toBeVisible();
  163 | 
  164 |     await page.getByRole('button', { name: 'Next' }).click();
  165 | 
  166 |     await expect(page.getByText('dispute.resolve')).toBeVisible();
  167 |     await expect(page.getByText('Page 2 of 2')).toBeVisible();
  168 |   });
  169 | });
  170 | 
  171 | test.describe('Admin audit log page — cross-validation with dispute resolution', () => {
  172 |   const OPEN_DISPUTE = {
  173 |     id: 'dispute-1',
  174 |     workerId: 'worker-1',
  175 |     filedById: 'user-1',
  176 |     reason: 'No-show for scheduled job',
  177 |     evidence: 'Photos of empty driveway at appointment time',
  178 |     status: 'open',
  179 |     resolution: null,
  180 |     resolvedById: null,
  181 |     createdAt: new Date(0).toISOString(),
  182 |     worker: { id: 'worker-1', name: 'Flaky Plumbing Co.' },
  183 |     filedBy: { id: 'user-1', firstName: 'Rae', lastName: 'Regular' },
  184 |   };
  185 | 
  186 |   test('resolving a dispute produces a matching audit log entry', async ({ page }) => {
  187 |     await loginAs(page, ADMIN_USER);
  188 |     const auditEntries: AuditEntry[] = [];
  189 |     let resolved = false;
  190 | 
  191 |     await page.route('**/v1/disputes**', (route) => {
  192 |       const request = route.request();
  193 |       if (request.method() === 'GET') {
  194 |         const dispute = resolved
  195 |           ? { ...OPEN_DISPUTE, status: 'resolved', resolution: 'Resolved by admin as resolved' }
  196 |           : OPEN_DISPUTE;
  197 |         return route.fulfill({
  198 |           status: 200,
  199 |           contentType: 'application/json',
  200 |           body: JSON.stringify({ data: [dispute], meta: { total: 1, page: 1, limit: 20, pages: 1 } }),
  201 |         });
  202 |       }
  203 |       return route.fallback();
  204 |     });
  205 |     await page.route('**/v1/disputes/*/resolve', (route) => {
  206 |       resolved = true;
  207 |       auditEntries.push({
  208 |         id: 'log-resolve-1',
  209 |         action: 'dispute.resolve',
  210 |         resource: 'dispute',
  211 |         resourceId: OPEN_DISPUTE.id,
  212 |         createdAt: new Date().toISOString(),
  213 |         user: { id: ADMIN_USER.id, firstName: ADMIN_USER.firstName, lastName: ADMIN_USER.lastName },
  214 |       });
  215 |       return route.fulfill({
  216 |         status: 200,
  217 |         contentType: 'application/json',
  218 |         body: JSON.stringify({
  219 |           data: { ...OPEN_DISPUTE, status: 'resolved', resolution: 'Resolved by admin as resolved' },
  220 |         }),
  221 |       });
  222 |     });
  223 |     await page.route('**/v1/audit?**', (route) =>
  224 |       route.fulfill({
  225 |         status: 200,
  226 |         contentType: 'application/json',
  227 |         body: JSON.stringify({ data: auditEntries, meta: { total: auditEntries.length, page: 1, limit: 50, pages: 1 } }),
  228 |       }),
  229 |     );
  230 | 
  231 |     await page.goto(`${BASE}/en/dashboard/admin/disputes`);
  232 |     await expect(page.getByText('Dispute against Flaky Plumbing Co.')).toBeVisible();
  233 |     await page.getByRole('button', { name: 'Resolve' }).click();
  234 |     await expect(page.getByText('resolved', { exact: false })).toBeVisible();
  235 | 
  236 |     await page.goto(`${BASE}/en/dashboard/admin/audit`);
  237 | 
  238 |     await expect(page.getByText('dispute.resolve')).toBeVisible();
  239 |     await expect(page.getByText(OPEN_DISPUTE.id)).toBeVisible();
  240 |   });
  241 | });
  242 | 
```