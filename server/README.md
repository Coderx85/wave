# Wave Backend

Fastify + TypeScript API server for the Wave payment platform. Handles wallet operations, transactions, notifications, and real-time SSE streaming.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js + TypeScript |
| Framework | Fastify (with autoload) |
| ORM | Drizzle ORM |
| Database | PostgreSQL |
| Cache | Redis / ioredis (with in-memory fallback) |
| Ledger | TigerBeetle (via Rust transfer-service) |
| Messaging | Kafka (kafkajs) |
| Auth | Better Auth |
| Validation | Zod |
| SSE | @fastify/sse |
| Testing | Vitest |

## Project Structure

```
server/
├── src/
│   ├── index.ts                    # Entry point — starts Fastify on :3000
│   ├── server.ts                   # Fastify setup (CORS, SSE, autoload)
│   ├── modules/
│   │   ├── wallet/                 # Core wallet module
│   │   │   ├── controller/         # HTTP handlers (auth + DTO mapping)
│   │   │   ├── service/            # Business logic
│   │   │   │   └── internal/       # Sub-services (account, transaction, ledger)
│   │   │   ├── repository/         # Data access (PG + cache composite)
│   │   │   └── utils/              # Idempotency manager
│   │   ├── notification/           # Notification pipeline
│   │   │   ├── consumer/           # Kafka consumer
│   │   │   ├── email-sender/       # Nodemailer SMTP
│   │   │   ├── repository/         # Notification + preference repos
│   │   │   └── stream/             # In-process EventEmitter → SSE bridge
│   │   ├── database/               # Drizzle schema + client
│   │   │   ├── schema/             # Table definitions (accounts, transactions, etc.)
│   │   │   ├── relations.ts        # Drizzle relations
│   │   │   └── client.ts           # Drizzle PG client
│   │   ├── kafka/                  # Kafka RPC layer
│   │   │   ├── kafka-service.ts    # Producer
│   │   │   ├── rpc-server.ts       # In-process RPC server
│   │   │   ├── rpc-client.ts       # In-process RPC client
│   │   │   └── rpc-routes.ts       # Zod-validated procedures
│   │   └── auth/                   # Better Auth integration
│   ├── lib/
│   │   ├── config.ts               # Environment variables
│   │   ├── response.ts             # sendSuccess/sendError helpers
│   │   ├── auth.ts                 # Better Auth server instance
│   │   ├── cache/                  # Redis + memory cache stores
│   │   ├── repository/             # CompositeRepository base class
│   │   ├── tigerbeetle/            # TigerBeetle client facade
│   │   └── transfer-service/       # HTTP client to Rust transfer-service
│   ├── routes/
│   │   ├── api/
│   │   │   ├── wallet/             # /api/wallet/* routes
│   │   │   ├── notification/       # /api/notification/* routes
│   │   │   └── performance/        # /api/performance/* benchmark routes
│   │   ├── health/                 # /health endpoint
│   │   └── rpc/                    # /rpc/* Kafka RPC routes
│   ├── schemas/                    # Zod validation schemas
│   └── types/                      # Branded ID types
└── docker-compose.dev.yaml
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Start dev server (with hot reload)
pnpm run dev

# Run tests
pnpm test
```

The server runs on `http://localhost:3000` by default.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Start dev server with tsx watch |
| `pnpm run build` | Compile TypeScript |
| `pnpm run start` | Run production build |
| `pnpm run test` | Run test suite |
| `pnpm run typecheck` | Type-check without emitting |
| `pnpm run db` | Drizzle Kit CLI |

## API Routes

### Wallet (`/api/wallet`)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/accounts` | Create a new wallet account |
| `GET` | `/accounts/:accountId` | Get account by ID |
| `GET` | `/accounts/by-number/:accountNumber` | Get account by number |
| `GET` | `/users/:userId/accounts` | List user's accounts |
| `GET` | `/accounts/:accountId/balance` | Get account balance |
| `POST` | `/accounts/:accountId/deposit` | Deposit funds |
| `POST` | `/transfers` | Transfer funds between accounts |
| `GET` | `/users/:userId/transactions` | List user's transactions |
| `GET` | `/users/:userId/transactions/query` | Query transactions by status/date |
| `GET` | `/transactions/:transactionId/ledger` | Get ledger entries for a transaction |

### Notifications (`/api/notification`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/users/:userId/notifications` | List notifications |
| `GET` | `/users/:userId/notifications/stream` | SSE stream (real-time) |
| `PATCH` | `/notifications/:notificationId/read` | Mark as read |
| `DELETE` | `/notifications/:notificationId` | Dismiss notification |
| `GET` | `/users/:userId/notification-preferences` | Get preferences |
| `PUT` | `/users/:userId/notification-preferences` | Update preference |

### Performance (`/api/performance`)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/benchmark/transfers` | Sequential transfer throughput |
| `POST` | `/benchmark/transfers/concurrent` | Concurrent transfer throughput |
| `POST` | `/benchmark/sse` | SSE connection capacity |
| `GET` | `/benchmark/accounts/:userId` | Get accounts for benchmark config |

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |

## Architecture

### Transfer Flow

```
POST /api/wallet/transfers
  → WalletController.transferHandler (auth check, parse BigInt)
    → WalletService.transfer
      1. TigerBeetleAccountService.adjustBalance (sender: debit)
         → HTTP → Rust transfer-service → TigerBeetle
         → Postgres: SELECT FOR UPDATE + UPDATE
      2. TigerBeetleAccountService.adjustBalance (receiver: credit)
      3. TransactionRepository.save (Postgres)
      4. LedgerRepository.create × 2 (debit + credit entries)
      5. TransactionRepository.update (status: success)
```

### Notification Pipeline

```
Kafka topic "wallet.transactions"
  → NotificationConsumer
    → NotificationService.handleTransactionEvent
      1. Lookup user email
      2. Check preference (isEventEnabled)
      3. Create notification record (status: pending)
      4. Publish to NotificationStream (EventEmitter → SSE)
      5. Send email via Nodemailer
      6. Update status to sent/failed
```

### Cache Layer

`CompositeRepository` wraps Postgres + Redis/memory cache. Each repository implements cache-aside with explicit invalidation:

- `account:{accountNumber}` — 1hr TTL
- `transaction:{id}` — 1hr TTL
- `user-transactions:{userId}` — 1hr TTL, invalidated on write
- `ledger-by-tx:{transactionId}` — 1hr TTL, invalidated on write

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/wave_db` | PostgreSQL connection |
| `CACHE_HOST` | `localhost` | Redis host |
| `CACHE_PORT` | `6379` | Redis port |
| `TRANSFER_SERVICE_URL` | `http://localhost:3001` | Rust transfer-service URL |
| `KAFKA_BROKERS` | `localhost:9092` | Kafka broker list |
| `SMTP_HOST` | — | Email SMTP host |
| `SMTP_PORT` | — | Email SMTP port |
| `SMTP_USER` | — | Email SMTP user |
| `SMTP_PASS` | — | Email SMTP password |

## Database Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts (email, name) |
| `auth_accounts` | Better Auth provider accounts |
| `sessions` | User sessions |
| `accounts` | Wallet accounts (accountNumber, balance) |
| `transactions` | Transfer records (sender, receiver, amount, status) |
| `ledger_entries` | Double-entry bookkeeping (debit/credit) |
| `transaction_outbox` | Kafka event outbox pattern |
| `notifications` | Notification records |
| `notification_preferences` | Per-user event preferences |
