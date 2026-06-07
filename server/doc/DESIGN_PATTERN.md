# Wave Server — Design Patterns & Architecture

## Layered Architecture

```
Route (Fastify) → Controller → Service → Repository → Drizzle ORM → PostgreSQL
```

- **Routes** (`src/routes/api/`): Define HTTP methods, paths, and Zod-validated schemas. Autoloaded by Fastify.
- **Controller** (`wallet.controller.ts`, `notification/` handler): Translates HTTP request/reply to service calls. Handles DTO serialization (`BigInt` → `string`, `Date` → `ISO string`).
- **Service** (`wallet-service.ts`, internal services): Business logic, orchestration, idempotency checks.
- **Repository** (`account-repo/`, `transaction-repo/`, etc.): Data access via Drizzle ORM. Extends `DrizzleRepository` base class.
- **Database Schema** (`modules/database/schema/`): Drizzle `pgTable` definitions with branded type constraints.

### Key Observation: Dual Service Layers
There are two service layers for transactions: `WalletService` (public, controller-facing) and `TransactionModule` (internal, with outbox pattern). `WalletService.transfer()` should be deprecated in favor of `TransactionModule.create()`.

## Outbox Pattern (Transactional Outbox)

**Purpose:** Reliably publish events to Kafka without two-phase commit.

**Flow:**
1. Within a single DB transaction: adjust balances + save transaction + insert outbox entry
2. Fire-and-forget publish to Kafka
3. On success: mark outbox entry as `published: true`
4. On failure: outbox remains `published: false` for background retry

**File locations:**
- `wallet/repository/outbox-repo/` — CRUD for outbox entries
- `wallet/service/internal/transaction-service/` — orchestrates the pattern
- `database/schema/transaction-outbox.repository.ts` — Drizzle table

## Kafka RPC Pattern

**Purpose:** Decouple inter-module communication from direct Kafka client imports.

**Structure:**
- `kafka/rpc-routes.ts` — Zod-schematized RPC procedure definitions (connect, disconnect, publishTransactionEvent)
- `kafka/rpc-server.ts` — In-process RPC server that dispatches procedures
- `kafka/rpc-client.ts` — Client implementing `IKafkaService`, calls procedures via the server (no network hop)
- `kafka/rpc-handler.ts` — HTTP bridge for external RPC calls (`POST /rpc/kafka/:procedure`)
- `kafka/bootstrap.ts` — One-time init at startup

**Why:** Allows the notification consumer (separate process) and future services to publish events without coupling to KafkaJS directly.

## Double-Entry Ledger

Every transfer creates two ledger entries:
- 1 `debit` entry (amount positive)
- 1 `credit` entry (same amount)

Both linked to the same `transactionId`. Currently an atomic accounting pair rather than per-account tracking.

**Future:** Connect to TigerBeetle for the ledger layer.

## Authentication (Better Auth)

- **Library:** `better-auth` with Drizzle adapter (PostgreSQL)
- **Strategy:** Email/password, session-based with cookie cache
- **Middleware:** Fastify wildcard route `/api/auth/*` proxies to Better Auth handler
- **Session:** 7-day expiry, 1-hour update age
- **Plugins:** OpenAPI plugin enabled

## Repository Pattern

Each entity has a repository interface and implementation:
```
account-repo/          → IAccountRepository, AccountRepository
transaction-repo/      → ITransactionRepository, TransactionRepository
ledger-repo/           → ILedgerRepository, LedgerRepository
outbox-repo/           → IOutboxRepository, OutboxRepository
notification-repo/     → INotificationRepository, NotificationRepository
```

All non-notification repos extend `DrizzleRepository` (`lib/repository/base-repository.ts`). This provides a consistent base for DB access.

## Branded Types for IDs

All entity IDs are branded strings/bigints for type safety:
- `TUserId`, `TAccountId`, `TTransactionId`, `TLedgerEntryId`, `TBankAccountNumber`
- Defined in `types/id.types.ts`
- Generated via `lib/ID/generate-id.ts` (prefix + UUID pattern)

## SSE for Real-Time Notifications

- **Plugin:** `@fastify/sse` with 30s heartbeat
- **Endpoint:** `GET /users/:userId/notifications/stream` (sse: true route config)
- On connection: sends existing notifications, then periodic pings (1s interval)

## Idempotency

Transactions are guarded by `IdempotencyManager` which generates keys from (sender, receiver, amount). Applied at the service layer to prevent duplicate transfers.

## Error Handling

- `tryCatch` wrapper (`lib/try-catch-wrapper.ts`): wraps service operations, logs and re-throws with consistent error messages
- `sendSuccess` / `sendError` helpers (`lib/response.ts`): standardized JSON envelope (`{ ok, status, message, data?, error? }`)
- Controller-level error handling in notification handler; service-level propagation elsewhere

## Known Issues / Tech Debt

- `WalletService.transfer()` — should be deleted; use `TransactionModule` instead
- `modules/user/` — unused, remove
- `TBankAccountNumber` branding conflates wallet account numbers with external bank account numbers
- No background retry mechanism for unpublished outbox entries
- `NotificationService` uses a direct `db` import for user lookup instead of the User module (which also doesn't work since it's unused)
- Kafka publish is fire-and-forget with only a console.error log on failure — no retry, no dead-letter queue
