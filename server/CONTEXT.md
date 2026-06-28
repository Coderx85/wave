# Wave Server — Domain Glossary

## Core Domain

### User
A person who interacts with the Wave system. Created and managed by Better Auth (auth module). Each user owns zero or more Wallet Accounts. Auth handles credentials, sessions, and identity. The hand-rolled `AuthModule` and `modules/user/` have both been removed — `better-auth` is the sole auth provider.

### Wallet Account
A balance-holding wallet owned by a User. Key fields: `name`, `userId`, `accountNumber` (unique bigint, branded as `TBankAccountNumber`), `balance`. Enforced non-negative balance via DB constraint.

### Transaction
A transfer of value between two Wallet Accounts. Lifecycle: `pending` → `success` | `failed`. Status transitions happen synchronously during the transfer. Each transaction is recorded once with both sender and receiver account numbers. Idempotency is enforced via an `idempotency_records` table to prevent duplicate (sender, receiver, amount) transfers on retry.

### Ledger Entry
A double-entry bookkeeping record. Each Transaction produces exactly two Ledger Entries: one `debit` and one `credit`, both with the same amount and linked to the same `transactionId`. Does not track per-account perspective; it's an atomic accounting pair.

### Notification
A record of an email sent to a User about a Transaction. Status: `pending` → `sent` → `failed` | `dead_letter`. Created asynchronously via the outbox/Kafka pipeline after a transaction is completed. Also published via SSE for real-time frontend delivery. Failed sends are retried up to 3 times with a 60-second backoff; after exhausting retries the notification moves to `dead_letter` status.

### Outbox Entry
A transactional record in `transaction_outbox` table that stores the event payload before Kafka publication. Used to implement the Outbox Pattern: events are persisted atomically with the transaction, then published asynchronously to Kafka. An `OutboxReplayService` (started in `index.ts`) periodically replays unpublished entries every 30 seconds.

## Architectural Concepts

### Event Flow (Async)
```
TransactionModule.create()
  → adjusts balances (DB)
  → creates outbox entry (DB)
  → fires-and-forgets Kafka publish (async)
    → on success: marks outbox as published
    → on failure: OutboxReplayService replays unpublished entries every 30s
  → NotificationService (separate process) consumes Kafka
    → creates Notification record (DB)
    → sends email via nodemailer (retries up to 3x, then dead_letter)
    → publishes SSE event for frontend
```

### Two-Process Architecture
- **API Server** (`index.ts`): Fastify server, serves REST endpoints, handles auth, creates transactions, runs OutboxReplayService
- **Notification Consumer** (`notification-service.ts`): Standalone process, consumes Kafka events, sends emails (with retry/DLQ), streams SSE

### Idempotency
Idempotency is enforced via the `idempotency_records` DB table. During `WalletService.transfer()`, a composite key (sender, receiver, amount) is checked before balance changes. If a completed record exists, the cached transaction is returned. Pending keys reject concurrent duplicates. Failed keys allow retry. Expired records are pruned. Supports both auto-generated keys and client-provided `Idempotency-Key` headers.
