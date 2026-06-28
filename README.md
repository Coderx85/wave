# Wave — Payment Platform

A full-stack payment platform with wallet operations, real-time notifications, and TigerBeetle-backed ledger accounting.

## Architecture

```
wave-main/
├── server/              # Fastify + TypeScript API (port 3000)
│   ├── src/
│   │   ├── modules/      # Wallet, notification, kafka, database
│   │   ├── routes/       # /api/wallet, /api/notification, /api/performance
│   │   └── lib/          # Auth, cache, TigerBeetle client, config
│   └── docker-compose.dev.yaml
├── client/              # React SPA (Bun, port 5173)
│   └── src/
│       ├── pages/        # Account, transactions, notifications, performance
│       ├── components/   # UI components
│       └── lib/          # Queries, helpers, queryClient
└── transfer-service/     # Rust transfer service (port 3001, TigerBeetle backend)
    └── src/
```

## Tech Stack

| Layer | Server | Client |
|-------|--------|--------|
| Runtime | Node.js + TypeScript (tsx) | Bun |
| Framework | Fastify | React 19 |
| Database | PostgreSQL (Drizzle ORM) | — |
| Ledger | TigerBeetle (via Rust transfer-service) | — |
| Cache | Redis + in-memory fallback | — |
| Messaging | Kafka (kafkajs) | — |
| Auth | Better Auth | — |
| Streaming | Server-Sent Events (@fastify/sse) | EventSource |
| Testing | Vitest | Vitest |

## Quick Start

```bash
# Start infrastructure (PostgreSQL, Redis, Kafka, MailHog)
cd server && docker compose -f docker-compose.dev.yaml up -d

# Run database migrations
pnpm db migrate

# Start API server (port 3000)
pnpm dev

# Start frontend (port 5173) — in another terminal
cd client && bun dev

# Start transfer service (port 3001) — optional, for TigerBeetle
cd transfer-service && cargo run
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| API Server | 3000 | Fastify API (wallet, notifications, auth) |
| Frontend | 5173 | React SPA (Vite via Bun) |
| Transfer Service | 3001 | Rust → TigerBeetle ledger bridge |
| PostgreSQL | 5432 | Primary database |
| Redis | 6379 | Cache layer |
| Redpanda (Kafka) | 9092 | Event bus |
| MailHog | 8025 | Email test SMTP UI |

## Key Features

- **Wallet**: Create accounts, deposit, transfer with double-entry ledger
- **Idempotency**: Transfer deduplication with automatic key generation + client-supplied keys
- **Notifications**: Real-time SSE streaming + email delivery with retry/DLQ (max 3 retries)
- **Outbox Pattern**: Reliable event publishing via transaction_outbox + background replay
- **Performance Benchmarks**: Sequential and concurrent transfer benchmarking endpoints
- **Caching**: Redis + in-memory fallback with cache-aside pattern
