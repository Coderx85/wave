# Repository Pattern — Composite Design

## Motivation

The original repository design used inheritance (BaseRepository → DrizzleRepository → CachedRepository → AccountRepository). This had problems:

- **Rigid hierarchy**: adding TigerBeetle meant another fork in the chain
- **Cache baked into class hierarchy**: `CachedRepository` mixed cache concerns with DB access via inheritance
- **Inconsistent adoption**: `NotificationRepository` bypassed the base entirely
- **Number conversion helpers leaked** into every repository
- **Static DB singleton** made testing across different DB states tricky

The new design uses **composition over inheritance**. A single repository implementation has access to multiple data stores (PG, Redis, future TigerBeetle) and orchestrates them internally. The module defines the interface — the repository implementation decides which store handles which operation.

## Read/Write Strategy

**PG is always the source of truth** for balances, transactions, and notifications.
**Redis is a read cache only** — never the source of truth for write decisions.
**Cache invalidation happens AFTER successful PG writes.**

### Read Path (Cache-Aside)

```
caller → repo.findByUserId(id)
           → cache.get("user-accounts:123") → MISS
           → pg.query(AccountsTable WHERE userId = 123)
           → cache.set("user-accounts:123", result, TTL=3600)
           → return result
```

### Write Path (Write-to-PG, then Invalidate)

```
caller → repo.adjustBalance(acc, amount)
           → pg.transaction:
               SELECT ... FOR UPDATE
               UPDATE balance
               return newBalance
           → cache.del("account:acc_number")
           → return newBalance
```

### Future: TigerBeetle for Ledger

Ledger operations will be added as a third store. The repository implementation will write both PG and TigerBeetle within the same operation:

```
caller → repo.createLedgerEntry(...)
           → pg.run: INSERT ledger_entry
           → tigerbeetle.run: create_account_transfer(...)
           → cache.del(cacheKey)
```

The caller (`ILedgerRepository`) never changes — only the implementation does.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Module Layer                       │
│  ┌─────────────────────────────────────────────┐    │
│  │  IAccountRepository  (interface, by module)  │    │
│  │  - create()                                  │    │
│  │  - findByUserId()                            │    │
│  │  - adjustBalance()                           │    │
│  │  - ...                                       │    │
│  └──────────────┬──────────────────────────────┘    │
│                 │ implements                         │
│  ┌──────────────┴──────────────────────────────┐    │
│  │  AccountRepository                          │    │
│  │  extends CompositeRepository                │    │
│  │                                             │    │
│  │  // Orchestrates stores internally          │    │
│  │  async findByUserId(id) {                    │    │
│  │    return this.cache.getOrSet(key, () =>     │    │
│  │      this.pg.run(() => db.query(...))         │    │
│  │    )                                          │    │
│  │  }                                            │    │
│  │                                               │    │
│  │  async adjustBalance(acc, amt) {              │    │
│  │    const result = await this.pg.transaction(  │    │
│  │      (tx) => { /* lock + update */ }          │    │
│  │    )                                          │    │
│  │    await this.cache.del(key)                  │    │
│  │    return result                              │    │
│  │  }                                            │    │
│  └──────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
                        │ extends
┌─────────────────────────────────────────────────────┐
│            CompositeRepository (base)                 │
│  protected pg: PostgresStore                         │
│  protected cache: RedisStore                         │
│  protected cacheKey(...parts): string                │
│  - Stores are injected via constructor (DI)          │
│  - Default stores created if none provided           │
└─────────────────────────────────────────────────────┘
                        │ composes
┌──────────────────┬──────────────────┬────────────────┐
│  PostgresStore    │  RedisStore      │  TigerBeetle    │
│  (source of truth)│  (read cache)    │  (future)       │
│                   │                  │                 │
│  .run(op, label)  │  .get(key)       │  .createTx(...) │
│  .transaction(fn) │  .set(key, val)  │  .getHistory()  │
│  .client → Drizzle │  .del(key)       │                 │
│                   │  .getOrSet(k,fn) │                 │
└──────────────────┴──────────────────┴────────────────┘
```

## File Structure

```
lib/repository/
├── index.ts                         # re-exports
├── composite.repository.ts          # abstract base class
└── stores/
    ├── index.ts
    ├── pg-store.interface.ts        # IPostgresStore
    ├── pg-store.ts                  # PostgresStore
    └── cache-store.interface.ts     # re-exports ICacheStore

lib/cache/                           # unchanged
├── icache-store.ts
├── cache-factory.ts
├── memory-cache-store.ts
└── redis-cache-store.ts

modules/wallet/repository/
├── index.ts                         # DI wiring + re-exports
├── contracts.ts                     # all repository interfaces (IAccountRepo, etc.)
├── account.repository.ts           # AccountRepository
├── account.repository.spec.ts      # tests inject mock stores
├── transaction.repository.ts
├── transaction.repository.spec.ts
├── ledger.repository.ts
├── ledger.repository.spec.ts
├── outbox.repository.ts
└── outbox.repository.spec.ts

modules/notification/repository/     ← now consistent (same structure)
├── index.ts                         # DI wiring
├── contracts.ts                     # INotification, INotificationRepository
└── notification.repository.ts
```

## Concrete Code

### Store: IPostgresStore

```typescript
// lib/repository/stores/pg-store.interface.ts
export interface IPostgresStore {
  get client(): DrizzleDb
  run<T>(operation: () => Promise<T>, errorLabel?: string): Promise<T>
  transaction<T>(fn: (tx: DrizzleTx) => Promise<T>, errorLabel?: string): Promise<T>
}
```

Does NOT abstract Drizzle's query API. Repos use `this.pg.client.query...` directly. The store only provides error handling (`run`) and transaction scope (`transaction`).

### Store: ICacheStore

```typescript
// lib/cache/icache-store.ts
export interface ICacheStore {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttl?: number): Promise<void>
  del(key: string): Promise<void>
  getOrSet<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T>
}
```

Re-exported through `lib/repository/stores/cache-store.interface.ts` so repos only import from `@/lib/repository`.

### CompositeRepository (base)

```typescript
// lib/repository/composite.repository.ts
export abstract class CompositeRepository {
  protected readonly pg: IPostgresStore
  protected readonly cache: ICacheStore

  constructor(opts: { pg: IPostgresStore; cache: ICacheStore }) {
    this.pg = opts.pg
    this.cache = opts.cache
  }

  protected cacheKey(...parts: string[]): string {
    return parts.join(":")
  }
}
```

Stores are **required** in constructor (no defaults). Production wiring happens in `modules/<module>/repository/index.ts`.

### Module Repository

```typescript
// modules/wallet/repository/account.repository.ts
export class AccountRepository extends CompositeRepository implements IAccountRepository {
  constructor(opts: { pg: IPostgresStore; cache: ICacheStore }) {
    super(opts)
  }

  async findByUserId(userId: TUserId): Promise<IAccountDTO[]> {
    return this.pg.run(async () => {
      return await this.pg.client.query.AccountsTable.findMany({
        where: { userId: { eq: userId } },
      })
    }, "FAILED_TO_FIND_ACCOUNTS")
  }

  async adjustBalance(acc: TBankAccountNumber, amount: number): Promise<number> {
    const result = await this.pg.transaction(async (tx) => {
      // SELECT ... FOR UPDATE + UPDATE balance
    }, "FAILED_TO_ADJUST_BALANCE")
    await this.cache.del(this.cacheKey("account", acc.toString()))
    return result
  }
}
```

### Module wiring (DI)

```typescript
// modules/wallet/repository/index.ts
import { PostgresStore } from "@/lib/repository/stores"
import { CacheFactory } from "@/lib/cache"

const defaultPG = new PostgresStore()
const defaultCache = CacheFactory.create()

export const accountRepo = new AccountRepository({ pg: defaultPG, cache: defaultCache })
// ... other repos

// Also export the classes for injection into services
export { AccountRepository } from "./account.repository"
```

### Test — Mock Stores Injected

```typescript
// modules/wallet/repository/account.repository.spec.ts
function mockPG(): IPostgresStore {
  return {
    client: {} as any,
    run: vi.fn((op: () => any) => op()),
    transaction: vi.fn((op: () => any) => op()),
  }
}

function mockCache(): ICacheStore {
  return {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    getOrSet: vi.fn((_key, fn) => fn()),
  }
}

it("adjusts balance in a transaction and invalidates cache", async () => {
  const repo = new AccountRepository({ pg: mockPG(), cache: mockCache() })
  await repo.adjustBalance("123" as any, 500)
  expect(pg.transaction).toHaveBeenCalled()
  expect(cache.del).toHaveBeenCalledWith("account:123")
})

it("does NOT invalidate cache when transaction fails", async () => {
  const pg = mockPG({ transaction: vi.fn(() => Promise.reject(new Error("DB error"))) })
  const repo = new AccountRepository({ pg, cache: mockCache() })
  await expect(repo.adjustBalance("123" as any, 500)).rejects.toThrow()
  expect(cache.del).not.toHaveBeenCalled()
})
```

### RedisStore

Wraps `ICacheStore` with a focused interface for caching.

```typescript
// lib/repository/stores/redis-store.ts
export class RedisStore {
  constructor(store: ICacheStore)

  async get<T>(key: string): Promise<T | null>
  async set<T>(key: string, value: T, ttl?: number): Promise<void>
  async del(key: string): Promise<void>
  async getOrSet<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T>
}
```

### CompositeRepository (base)

Lightweight base that provides access to stores via composition. No static singletons — stores are injected.

```typescript
// lib/repository/composite-repository.ts
export abstract class CompositeRepository {
  protected readonly pg: PostgresStore
  protected readonly cache: RedisStore

  constructor(opts?: {
    pg?: PostgresStore
    cache?: ICacheStore
  })

  /** Build consistent cache key from parts */
  protected cacheKey(...parts: string[]): string
}
```

## Migration Guide

### Step 1: Create the new stores and base class

`lib/repository/composite-repository.ts` — replaces `DrizzleRepository` and `CachedRepository`
`lib/repository/stores/pg-store.ts` — wraps Drizzle with error handling
`lib/repository/stores/redis-store.ts` — wraps ICacheStore

### Step 2: Migrate each repository one-by-one

Before:
```typescript
export class AccountRepository extends CachedRepository implements IAccountRepository {
  constructor(dbInstance?: DrizzleDb, cacheStore?: ICacheStore) {
    super(dbInstance, cacheStore)
  }

  async findByUserId(userId: TUserId): Promise<IAccountDBDTO[]> {
    return this.run(async () => {
      return await this.db.query.AccountsTable.findMany({...})
    }, "FAILED_TO_FIND_ACCOUNTS")
  }
}
```

After:
```typescript
export class AccountRepository extends CompositeRepository implements IAccountRepository {
  async findByUserId(userId: TUserId): Promise<IAccountDBDTO[]> {
    return this.pg.run(async () => {
      return await this.pg.client.query.AccountsTable.findMany({...})
    }, "FAILED_TO_FIND_ACCOUNTS")
  }
}
```

Changes:
- `this.run(...)` → `this.pg.run(...)`
- `this.db.query...` → `this.pg.client.query...`
- `this.cache.getOrSet(...)` → `this.cache.getOrSet(...)` (same)
- `this.getCacheKey(...)` → `this.cacheKey(...)` (renamed)
- Constructor with stores replaces explicit db/cache params
- Number conversion helpers moved to DTO layer or inline (`Number()`)

### Step 3: Remove old base classes

Delete `DrizzleRepository`, `CachedRepository`, `BaseRepository` from `base-repository.ts` once all repos are migrated.

### Step 4: Add TigerBeetle store (future)

```typescript
// lib/repository/stores/tigerbeetle-store.ts
export class TigerBeetleStore {
  // No changes to module interfaces needed
}
// Add to CompositeRepository:
//   protected readonly ledger?: TigerBeetleStore
```

## Testability

Each store is injectable, so tests can provide mock stores:

```typescript
// In test
const mockPG = new PostgresStore(mockDrizzleDb)
const mockCache = new MemoryCacheStore()
const repo = new AccountRepository({ pg: mockPG, cache: mockCache })
```

No more static singletons (`DrizzleRepository.dbInstance`). Each test gets a clean store.

## Anti-Patterns to Avoid

- ❌ Don't abstract Drizzle's query API behind a generic `Store.query()` — it's a leaky abstraction
- ❌ Don't let the module interface leak store details (`pg`, `cache` parameter names in DTOs)
- ❌ Don't create per-database interfaces (`IAccountPGRepository`, `IAccountRedisRepository`)
- ❌ Don't use cache for write decisions (balance reads must go to PG within transactions)
- ✅ Do let each repository own its caching logic (what to cache, TTL, when to invalidate)
