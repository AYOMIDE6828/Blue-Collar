/**
 * @bluecollar/test-utils
 *
 * Single entry-point for all shared test utilities.
 *
 * Issues resolved:
 *   - #1054: Shared mock service layer for Stellar SDK calls
 *   - #1056: Shared contract test fixtures across sdk and contracts tests
 *
 * ─── Quick start ──────────────────────────────────────────────────────────────
 *
 *   // Stellar SDK mocks (Horizon + Freighter + Soroban RPC)
 *   import {
 *     makeMockHorizonFetch,
 *     makeFreighterMock,
 *     makeSorobanRpcMock,
 *     MOCK_STELLAR_ADDRESS,
 *   } from '@bluecollar/test-utils'
 *
 *   // Contract test fixtures (accounts, workers, escrow helpers)
 *   import {
 *     makeTestAccountSet,
 *     makeTestWorkerFixture,
 *     makeEscrowId,
 *     futureExpiry,
 *     resetAllCounters,
 *   } from '@bluecollar/test-utils'
 */

// ── Stellar SDK mocks ─────────────────────────────────────────────────────────
export {
  // Constants
  MOCK_STELLAR_ADDRESS,
  MOCK_WORKER_ADDRESS,
  MOCK_FEE_RECIPIENT_ADDRESS,

  // Mock factories
  makeMockHorizonFetch,
  makeFreighterMock,
  makeSorobanRpcMock,
} from './stellar-mocks.js'

export type {
  MockHorizonOptions,
  MockFreighterOptions,
  MockSorobanRpcOptions,
} from './stellar-mocks.js'

// ── Contract test fixtures ────────────────────────────────────────────────────
export {
  // Constants
  TESTNET_FRIENDBOT_URL,
  TESTNET_HORIZON_URL,
  MAINNET_HORIZON_URL,
  DEFAULT_TEST_BALANCE,
  ONE_DAY_LEDGERS,

  // Account factories
  makeTestAccount,
  makeTestAccountSet,
  resetTestKeyCounter,

  // Funding helpers
  buildMockFundedResponse,
  buildMockAccountResponse,
  mockFundTestnetAccount,

  // Escrow helpers
  makeEscrowId,
  resetEscrowCounter,
  futureExpiry,

  // Worker fixture factory
  makeTestWorkerFixture,
  resetWorkerCounter,

  // Bulk reset
  resetAllCounters,
} from './contract-fixtures.js'

export type {
  TestAccount,
  TestAccountSet,
  MakeTestAccountOptions,
  TestWorkerFixture,
} from './contract-fixtures.js'
