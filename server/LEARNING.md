# Wave Server — Learnings & Mistakes

## 1. Modular-Monolith Architecture

**What we learned:** Structuring the server as a modular monolith — separate modules (wallet, notification, auth, kafka) within a single deployment — was the right call. It kept operational simplicity while enforcing domain boundaries.

**What went wrong:**
- The `modules/wallet/service/` layer has a split personality: `WalletService` (public, no outbox) and `TransactionModule` (internal, with outbox). These should have been one service from the start. The confusion came from iterating on the architecture mid-project without cleaning up the old path.
- `modules/user/` was scaffolded early but never integrated with anything. It became orphaned code.
- **Lesson:** Modular-monolith only works if modules have clear boundaries and no circular or duplicated responsibilities. When refactoring, delete the old path immediately instead of leaving both.

## 2. Implementing the Outbox Pattern

**What we learned:** The transactional outbox pattern — persisting events atomically with the domain data, then publishing to Kafka asynchronously — was essential for reliable event delivery without distributed transactions.

**What went wrong:**
- Kafka publishing is fire-and-forget (`.then()` with no retry). If Kafka is down, the outbox entry stays `published: false` but nothing retries it.
- No background worker exists to scan for unpublished entries and retry.
- Dead-letter queue was never implemented.
- The outbox + Kafka publish was only added to `TransactionModule`, not to the original `WalletService`, creating a silent data loss path (transactions via the old path never produced events).
- **Lesson:** The outbox pattern needs a retry mechanism to be truly reliable. Fire-and-forget defeats its purpose.

## 3. Repository Pattern Confusion (TBankAccountNumber + Multi-DB)

**What we learned:** The branded type `TBankAccountNumber` was meant to distinguish wallet account numbers from raw identifiers, but the name implied a connection to an external banking system that doesn't exist.

**What went wrong:**
- The type name `TBankAccountNumber` leaked into every layer — schemas, repositories, services — making it hard to rename later.
- The repository pattern was implemented inconsistently: some repos extend `DrizzleRepository`, others (`NotificationRepository`) don't. Some use `$type<TBrand>()` on Drizzle columns, others use loose strings.
- The ledger internal interface defines `ILedger.amount` as `number`, but the DB schema stores it as `bigint`. Inconsistencies between internal types and DB types created confusion.

### Multi-Database Repository Struggle

The original repository pattern worked for PostgreSQL alone (interface + implementation via Drizzle). When Redis was introduced for caching, the design broke:

- Instead of creating a **single unified interface** per entity that both PG and Redis implement, we created **separate interfaces per database** (e.g., `IAccountPGRepository`, `IAccountRedisRepository`).
- This forced each module's service to know about both databases directly, coupling business logic to storage topology.
- A true "repository" should abstract storage behind one interface — the caller shouldn't know whether data comes from PG, Redis, or both.
- **Lesson:** A repository interface should be storage-agnostic. If you need multiple data stores, create a composite repository that implements the single interface by orchestrating PG + Redis internally. Separate interfaces per database defeat the purpose of the pattern.
