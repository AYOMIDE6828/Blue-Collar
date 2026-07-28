# @bluecollar/test-utils

Shared test utilities for the BlueCollar monorepo.

Resolves issues **#1054** (shared Stellar SDK mock layer) and **#1056** (shared contract test fixtures).

---

## Installation

This package is a workspace dependency. Add it to any package's `devDependencies`:

```json
{
  "devDependencies": {
    "@bluecollar/test-utils": "workspace:*"
  }
}
```

---

## Stellar SDK Mocks (`#1054`)

Replaces hand-rolled Horizon/Freighter/Soroban RPC mocks across `packages/api`, `packages/app`, and `packages/sdk`.

### `makeMockHorizonFetch(options?)`

Returns a `vi.fn()` that intercepts `fetch` calls to Horizon endpoints:

```ts
import { makeMockHorizonFetch, MOCK_STELLAR_ADDRESS } from '@bluecollar/test-utils'

// Basic — 100 XLM balance, sequence 1234567
vi.stubGlobal('fetch', makeMockHorizonFetch())

// Custom balance
vi.stubGlobal('fetch', makeMockHorizonFetch({ balance: '250.0000000' }))

// Simulate account not found
vi.stubGlobal('fetch', makeMockHorizonFetch({ accountNotFound: true }))

// Simulate broadcast failure
vi.stubGlobal('fetch', makeMockHorizonFetch({ broadcastFails: true }))

// Pending transaction (404)
vi.stubGlobal('fetch', makeMockHorizonFetch({ txPending: true }))
```

### `makeFreighterMock(options?)`

Returns a mock of the `@stellar/freighter-api` module:

```ts
import { makeFreighterMock } from '@bluecollar/test-utils'

vi.mock('@stellar/freighter-api', () => makeFreighterMock({
  isConnected: true,
  address: 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37',
  network: 'TESTNET',
}))
```

### `makeSorobanRpcMock(options?)`

Returns a mock of the Soroban SDK `SorobanRpc.Server` and related classes:

```ts
import { makeSorobanRpcMock } from '@bluecollar/test-utils'

vi.mock('@stellar/stellar-sdk', () => ({
  ...makeSorobanRpcMock({ simulateResult: { success: true } }),
}))
```

### Well-known test addresses

```ts
import { MOCK_STELLAR_ADDRESS, MOCK_WORKER_ADDRESS, MOCK_FEE_RECIPIENT_ADDRESS } from '@bluecollar/test-utils'
```

---

## Contract Test Fixtures (`#1056`)

Replaces duplicated account setup and funding helpers in `packages/sdk` and `packages/contracts` tests.

### `makeTestAccountSet()`

Creates the standard set of test accounts (admin, curator, worker, payer, feeRecipient):

```ts
import { makeTestAccountSet, resetAllCounters } from '@bluecollar/test-utils'

beforeEach(() => resetAllCounters())

const { admin, curator, worker, payer, feeRecipient } = makeTestAccountSet()
// Each has .publicKey, .secretKey, .label, .balance
```

### `makeTestAccount(options?)`

Create a single account:

```ts
const myAccount = makeTestAccount({ label: 'escrow-arbiter', balance: '500.0000000' })
```

### Funding helpers

```ts
import { buildMockFundedResponse, buildMockAccountResponse, mockFundTestnetAccount } from '@bluecollar/test-utils'

// Mock a successful friendbot call
vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(buildMockFundedResponse()))

// Mock the account info response for a funded account
vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(buildMockAccountResponse(myAccount)))

// Spy on HorizonClient.fundTestnetAccount
vi.spyOn(client, 'fundTestnetAccount').mockImplementation(mockFundTestnetAccount())
```

### Escrow helpers

```ts
import { makeEscrowId, futureExpiry, resetEscrowCounter } from '@bluecollar/test-utils'

const escrowId = makeEscrowId()         // 'esc_000'
const expiry   = futureExpiry()         // now + 86400 seconds
const expiry2  = futureExpiry(3600)     // now + 1 hour
```

### Worker fixture factory

```ts
import { makeTestWorkerFixture } from '@bluecollar/test-utils'

const worker = makeTestWorkerFixture({ ownerAddress: accounts.worker.publicKey })
// worker.id, worker.name, worker.category, worker.wasmHash
```

### Resetting counters

All counters are reset in bulk with `resetAllCounters()`:

```ts
beforeEach(() => resetAllCounters())
```

---

## Migration guide

### Before (hand-rolled in each test file):

```ts
// In packages/sdk/src/__tests__/sdk.test.ts
vi.spyOn(global, 'fetch').mockResolvedValueOnce(
  new Response(JSON.stringify({
    balances: [{ balance: '100.0000000', asset_type: 'native' }],
    sequence: '1234567',
  }), { status: 200 })
)
```

### After:

```ts
import { makeMockHorizonFetch } from '@bluecollar/test-utils'
vi.stubGlobal('fetch', makeMockHorizonFetch())
```
