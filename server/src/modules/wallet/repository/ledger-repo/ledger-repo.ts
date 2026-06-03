import type { ILedgerEntryDBDTO, ILedgerRepository, EntryType } from "./ledger-repo.interface";
import { CachedRepository, type DrizzleDb } from "@/lib/repository/base-repository";
import { LedgerTable } from "@/modules/database/schema/ledger.repository";
import { eq } from "drizzle-orm";
import type { TLedgerEntryId, TTransactionId } from "@/types";
import { ID } from "@/lib/ID";
import type { ICacheStore } from "@/lib/cache";

export class LedgerRepository extends CachedRepository implements ILedgerRepository {
  constructor(dbInstance?: DrizzleDb, cacheStore?: ICacheStore) {
    super(dbInstance, cacheStore);
  }

  private getLedgerByTxCacheKey(transactionId: TTransactionId): string {
    return this.getCacheKey("ledger-by-tx", transactionId);
  }

  async create(entry: Omit<ILedgerEntryDBDTO, "id" | "createdAt" | "updatedAt">): Promise<ILedgerEntryDBDTO> {
    const newEntry = await this.run(async () => {
      const [result] = await this.db
        .insert(LedgerTable)
        .values({
          ...entry,
          id: ID.LedgerEntryId(),
          amount: this.bigIntToDb(entry.amount),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      if (!result) {
        throw new Error("Failed to create ledger entry");
      }

      return {
        ...result,
        amount: this.numberFromDb(result.amount),
      };
    }, "FAILED_TO_CREATE_LEDGER_ENTRY");

    await this.cache.del(this.getLedgerByTxCacheKey(newEntry.transactionId));
    return newEntry;
  }

  async findById(entryId: TLedgerEntryId): Promise<ILedgerEntryDBDTO | null> {
    return this.run(async () => {
      const entry = await this.db.query.LedgerTable.findFirst({
        where:  {
          id: {
            eq: entryId
          }
        }
      });

      if (!entry) return null;
      return { ...entry, amount: this.numberFromDb(entry.amount) };
    }, "FAILED_TO_FIND_LEDGER_ENTRY_BY_ID");
  }

  findByTransactionId(transactionId: TTransactionId): Promise<ILedgerEntryDBDTO[]> {
    const cacheKey = this.getLedgerByTxCacheKey(transactionId);
    return this.cache.getOrSet(cacheKey, () => {
      return this.run(async () => {
        const entries = await this.db.query.LedgerTable.findMany({
          where: {
            transactionId: {
              eq: transactionId
            }
          }
         });
        return entries.map((entry) => ({ ...entry, amount: this.numberFromDb(entry.amount) }));
      }, "FAILED_TO_FIND_LEDGER_ENTRIES_BY_TRANSACTION_ID");
    }, 3600);
  }

  async findByEntryType(entryType: EntryType): Promise<ILedgerEntryDBDTO[]> {
    return this.run(async () => {
      const entries = await this.db.query.LedgerTable.findMany({
        where: {
          entryType: {
            eq: entryType
          },
        },
        orderBy: {
          createdAt: "desc"
        }
      });

      return entries.map((entry) => ({ ...entry, amount: this.numberFromDb(entry.amount) }));
    }, "FAILED_TO_FIND_LEDGER_ENTRIES_BY_ENTRY_TYPE");
  }

  async update(entryId: TLedgerEntryId, updates: Partial<Omit<ILedgerEntryDBDTO, "id" | "createdAt">>): Promise<void> {
    const entry = await this.findById(entryId);
    await this.run(async () => {
      const updateData: any = { ...updates, updatedAt: new Date() };
      if (updates.amount !== undefined) {
        updateData.amount = this.bigIntToDb(updates.amount);
      }
      await this.db.update(LedgerTable).set(updateData).where(eq(LedgerTable.id, entryId)).execute();
    }, "FAILED_TO_UPDATE_LEDGER_ENTRY");

    if (entry) {
      await this.cache.del(this.getLedgerByTxCacheKey(entry.transactionId));
    }
  }

  async delete(entryId: TLedgerEntryId): Promise<void> {
    const entry = await this.findById(entryId);
    await this.run(async () => {
      await this.db.delete(LedgerTable).where(eq(LedgerTable.id, entryId)).execute();
    }, "FAILED_TO_DELETE_LEDGER_ENTRY");

    if (entry) {
      await this.cache.del(this.getLedgerByTxCacheKey(entry.transactionId));
    }
  }
}
