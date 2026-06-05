# Wave Server — Domain Glossary

## Core Domain

### User
A person who interacts with the Wave system. Created and managed by Better Auth (auth module). Each user owns zero or more Wallet Accounts. Auth handles credentials, sessions, and identity; a separate `modules/user/` exists but is currently unused and candidates for removal.

### Wallet Account
A balance-holding wallet owned by a User. Key fields: `name`, `userId`, `accountNumber` (unique bigint, branded as `TBankAccountNumber`), `balance`. Enforced non-negative balance via DB constraint. Has no direct relation to an external banking system despite the `TBankAccountNumber` naming — this should be reconciled.

### Transaction
A transfer of value between two Wallet Accounts. Lifecycle: `pending` → `success` | `failed`. Status transitions happen synchronously during the transfer. Each transaction is recorded once with both sender and receiver account numbers.

### Ledger Entry
A double-entry bookkeeping record. Each Transaction produces exactly two Ledger Entries: one `debit` and one `credit`, both with the same amount and linked to the same `transactionId`. Does not track per-account perspective; it's an atomic accounting pair.

### Notification
A record of an email sent to a User about a Transaction. Status: `pending` → `sent` | `failed`. Created asynchronously via the outbox/Kafka pipeline after a transaction is completed. Also published via SSE for real-time frontend delivery.

### Outbox Entry
A transactional record in `transaction_outbox` table that stores the event payload before Kafka publication. Used to implement the Outbox Pattern: events are persisted atomically with the transaction, then published asynchronously to Kafka. Failed/unpublished entries support replay for resilience.

## Architectural Concepts

### Event Flow (Async)
```
TransactionModule.create()
  → adjusts balances (DB)
  → creates outbox entry (DB)
  → fires-and-forgets Kafka publish (async)
    → on success: marks outbox as published
    → on failure: logs, retry via background job (future)
  → NotificationService (separate process) consumes Kafka
    → creates Notification record (DB)
    → sends email via nodemailer
    → publishes SSE event for frontend
```

### Two-Process Architecture
- **API Server** (`index.ts`): Fastify server, serves REST endpoints, handles auth, creates transactions
- **Notification Consumer** (`notification-service.ts`): Standalone process, consumes Kafka events, sends emails, streams SSE

### Idempotency
Transactions are guarded by an idempotency key (composite of sender, receiver, amount) to prevent duplicate transfers on retry.
