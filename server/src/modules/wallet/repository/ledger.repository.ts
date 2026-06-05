import { eq } from "drizzle-orm";
import { CompositeRepository, type IPostgresStore, type ICacheStore } from "@/lib/repository";
import { LedgerTable } from "@/modules/database/schema/ledger.repository";
import { ID } from "@/lib/ID";
import type { TLedgerEntryId, TTransactionId } from "@/types";
import type { ILedgerEntryDTO, EntryType, ILedgerRepository } from "./contracts";

type StoreOpts = { pg?: IPostgresStore; cache?: ICacheStore };

export class LedgerRepository extends CompositeRepository implements ILedgerRepository {
  constructor(opts?: StoreOpts) { super(opts); }

  private byTxCacheKey(transactionId: TTransactionId): string {
    return this.cacheKey("ledger-by-tx", transactionId);
  }

  private toDTO(row: any): ILedgerEntryDTO {
    return { ...row, amount: Number(row.amount) };
  }

  async create(entry: Omit<ILedgerEntryDTO, "id" | "createdAt" | "updatedAt">): Promise<ILedgerEntryDTO> {
    const newEntry = await this.pg.run(async () => {
      const [row] = await this.pg.client
        .insert(LedgerTable)
        .values({
          ...entry,
          id: ID.LedgerEntryId(),
          amount: BigInt(entry.amount),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      if (!row) throw new Error("Failed to create ledger entry");
      return this.toDTO(row);
    }, "FAILED_TO_CREATE_LEDGER_ENTRY");

    await this.cache.del(this.byTxCacheKey(newEntry.transactionId));
    return newEntry;
  }

  async findById(entryId: TLedgerEntryId): Promise<ILedgerEntryDTO | null> {
    return this.pg.run(async () => {
      const row = await this.pg.client.query.LedgerTable.findFirst({
        where: { id: { eq: entryId } },
      });
      return row ? this.toDTO(row) : null;
    }, "FAILED_TO_FIND_LEDGER_ENTRY");
  }

  findByTransactionId(transactionId: TTransactionId): Promise<ILedgerEntryDTO[]> {
    return this.cache.getOrSet(this.byTxCacheKey(transactionId), () =>
      this.pg.run(async () => {
        const rows = await this.pg.client.query.LedgerTable.findMany({
          where: { transactionId: { eq: transactionId } },
        });
        return rows.map(this.toDTO);
      }, "FAILED_TO_FIND_LEDGER_BY_TX"),
    3600);
  }

  async findByEntryType(entryType: EntryType): Promise<ILedgerEntryDTO[]> {
    return this.pg.run(async () => {
      const rows = await this.pg.client.query.LedgerTable.findMany({
        where: { entryType: { eq: entryType } },
        orderBy: { createdAt: "desc" },
      });
      return rows.map(this.toDTO);
    }, "FAILED_TO_FIND_LEDGER_BY_TYPE");
  }

  async update(entryId: TLedgerEntryId, updates: Partial<Omit<ILedgerEntryDTO, "id" | "createdAt">>): Promise<void> {
    const entry = await this.findById(entryId);
    const data: any = { ...updates, updatedAt: new Date() };
    if (updates.amount !== undefined) data.amount = BigInt(updates.amount);

    await this.pg.run(async () => {
      await this.pg.client.update(LedgerTable).set(data).where(eq(LedgerTable.id, entryId)).execute();
    }, "FAILED_TO_UPDATE_LEDGER_ENTRY");

    if (entry) await this.cache.del(this.byTxCacheKey(entry.transactionId));
  }

  async delete(entryId: TLedgerEntryId): Promise<void> {
    const entry = await this.findById(entryId);
    await this.pg.run(async () => {
      await this.pg.client.delete(LedgerTable).where(eq(LedgerTable.id, entryId)).execute();
    }, "FAILED_TO_DELETE_LEDGER_ENTRY");

    if (entry) await this.cache.del(this.byTxCacheKey(entry.transactionId));
  }
}
