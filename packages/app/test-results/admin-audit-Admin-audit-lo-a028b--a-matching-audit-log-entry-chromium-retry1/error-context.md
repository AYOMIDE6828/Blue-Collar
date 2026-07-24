# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-audit.spec.ts >> Admin audit log page — cross-validation with dispute resolution >> resolving a dispute produces a matching audit log entry
- Location: e2e/admin-audit.spec.ts:186:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  getByText('Dispute against Flaky Plumbing Co.')
Expected: visible
Received: undefined
Timeout:  5000ms

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Dispute against Flaky Plumbing Co.')
    - waiting for" http://localhost:3001/en/dashboard/admin/disputes" navigation to finish...

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
        - paragraph [ref=e25]: "TypeError: Cannot read properties of undefined (reading 'call')"
        - generic [ref=e26]: This error happened while generating the page. Any console logs will be displayed in the terminal window.
      - generic [ref=e27]:
        - heading "Call Stack" [level=2] [ref=e28]
        - group [ref=e29]:
          - generic "Next.js" [ref=e30] [cursor=pointer]:
            - img [ref=e31]
            - img [ref=e33]
            - text: Next.js
        - generic [ref=e38]:
          - heading "eval" [level=3] [ref=e39]
          - generic [ref=e41]: webpack-internal:/node_modules/.pnpm/use-intl@4.9.1_react@18.3.1/node_modules/use-intl/dist/esm/development/formatters-r4aAmsMP.js
        - generic [ref=e42]:
          - heading "(rsc)/../../node_modules/.pnpm/use-intl@4.9.1_react@18.3.1/node_modules/use-intl/dist/esm/development/formatters-r4aAmsMP.js" [level=3] [ref=e43]
          - generic [ref=e45]: file:///Users/user/Documents/grntfox/Blue-Collar/packages/app/.next/server/vendor-chunks/use-intl@4.9.1_react@18.3.1.js (70:1)
        - group [ref=e46]:
          - generic "Next.js" [ref=e47] [cursor=pointer]:
            - img [ref=e48]
            - img [ref=e50]
            - text: Next.js
        - generic [ref=e55]:
          - heading "eval" [level=3] [ref=e56]
          - generic [ref=e58]: webpack-internal:/node_modules/.pnpm/next-intl@4.9.1_next@14.2.35_@babel+core@7.29.0_@opentelemetry+api@1.9.1_@playwright+te_6fa6d9275d0a00aea124ee1f70eebdf9/node_modules/next-intl/dist/esm/development/server/react-server/getConfig.js
        - generic [ref=e59]:
          - heading "(rsc)/../../node_modules/.pnpm/next-intl@4.9.1_next@14.2.35_@babel+core@7.29.0_@opentelemetry+api@1.9.1_@playwright+te_6fa6d9275d0a00aea124ee1f70eebdf9/node_modules/next-intl/dist/esm/development/server/react-server/getConfig.js" [level=3] [ref=e60]
          - generic [ref=e62]: file:///Users/user/Documents/grntfox/Blue-Collar/packages/app/.next/server/vendor-chunks/next-intl@4.9.1_next@14.2.35_@babel+core@7.29.0_@opentelemetry+api@1.9.1_@playwright+te_6fa6d9275d0a00aea124ee1f70eebdf9.js (70:1)
        - group [ref=e63]:
          - generic "Next.js" [ref=e64] [cursor=pointer]:
            - img [ref=e65]
            - img [ref=e67]
            - text: Next.js
        - generic [ref=e72]:
          - heading "eval" [level=3] [ref=e73]
          - generic [ref=e75]: webpack-internal:/node_modules/.pnpm/next-intl@4.9.1_next@14.2.35_@babel+core@7.29.0_@opentelemetry+api@1.9.1_@playwright+te_6fa6d9275d0a00aea124ee1f70eebdf9/node_modules/next-intl/dist/esm/development/server/react-server/getConfigNow.js
        - generic [ref=e76]:
          - heading "(rsc)/../../node_modules/.pnpm/next-intl@4.9.1_next@14.2.35_@babel+core@7.29.0_@opentelemetry+api@1.9.1_@playwright+te_6fa6d9275d0a00aea124ee1f70eebdf9/node_modules/next-intl/dist/esm/development/server/react-server/getConfigNow.js" [level=3] [ref=e77]
          - generic [ref=e79]: file:///Users/user/Documents/grntfox/Blue-Collar/packages/app/.next/server/vendor-chunks/next-intl@4.9.1_next@14.2.35_@babel+core@7.29.0_@opentelemetry+api@1.9.1_@playwright+te_6fa6d9275d0a00aea124ee1f70eebdf9.js (80:1)
        - group [ref=e80]:
          - generic "Next.js" [ref=e81] [cursor=pointer]:
            - img [ref=e82]
            - img [ref=e84]
            - text: Next.js
```

# Test source

```ts
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
  161 |     await expect(page.getByText('user.suspend')).toBeVisible();
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
> 232 |     await expect(page.getByText('Dispute against Flaky Plumbing Co.')).toBeVisible();
      |                                                                        ^ Error: expect(locator).toBeVisible() failed
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