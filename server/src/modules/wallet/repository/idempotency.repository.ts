import { eq, and, lte } from "drizzle-orm";
import { CompositeRepository, type IPostgresStore, type ICacheStore } from "@/lib/repository";
import { IdempotencyRecordsTable } from "@/modules/database/schema";
import type { IIdempotencyRecord, IIdempotencyRepository } from "./contracts";

type StoreOpts = { pg?: IPostgresStore; cache?: ICacheStore };

const mapRow = (row: any): IIdempotencyRecord => ({
  key: row.key,
  operation: row.operation as IIdempotencyRecord["operation"],
  status: row.status as IIdempotencyRecord["status"],
  result: row.result ?? undefined,
  error: row.error ?? undefined,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  expiresAt: row.expiresAt,
});

export class IdempotencyRepository extends CompositeRepository implements IIdempotencyRepository {
  constructor(opts?: StoreOpts) { super(opts); }

  async findByKey(key: string): Promise<IIdempotencyRecord | null> {
    return this.pg.run(async () => {
      const [row] = await this.pg.client
        .select()
        .from(IdempotencyRecordsTable)
        .where(eq(IdempotencyRecordsTable.key, key))
        .limit(1);
      if (!row) return null;
      return mapRow(row);
    }, "FAILED_TO_FIND_IDEMPOTENCY_RECORD");
  }

  async create(record: IIdempotencyRecord): Promise<IIdempotencyRecord | null> {
    return this.pg.run(async () => {
      const [row] = await this.pg.client
        .insert(IdempotencyRecordsTable)
        .values({
          key: record.key,
          operation: record.operation,
          status: record.status,
          result: record.result as any,
          error: record.error as any,
          expiresAt: record.expiresAt,
        })
        .onConflictDoNothing()
        .returning();
      return row ? mapRow(row) : null;
    }, "FAILED_TO_CREATE_IDEMPOTENCY_RECORD");
  }

  async updateStatus(key: string, status: IIdempotencyRecord["status"], result?: unknown, error?: string): Promise<void> {
    await this.pg.run(async () => {
      await this.pg.client
        .update(IdempotencyRecordsTable)
        .set({ status, result: result as any, error: error as any })
        .where(eq(IdempotencyRecordsTable.key, key));
    }, "FAILED_TO_UPDATE_IDEMPOTENCY_STATUS");
  }

  async deleteExpired(): Promise<number> {
    return this.pg.run(async () => {
      const result = await this.pg.client
        .delete(IdempotencyRecordsTable)
        .where(lte(IdempotencyRecordsTable.expiresAt, new Date()));
      return result.rowCount ?? 0;
    }, "FAILED_TO_DELETE_EXPIRED_IDEMPOTENCY");
  }
}
