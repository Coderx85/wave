import type { ILedgerEntryDBDTO, ILedgerRepository, EntryType } from "./ledger-repo.interface";
import { db } from "@/modules/database/client";
import { BaseRepository, type DrizzleDb } from "@/lib/repository/base-repository";
import { LedgerTable } from "@/modules/database/schema/ledger.repository";
import { eq } from "drizzle-orm";
import type { TLedgerEntryId, TTransactionId } from "@/types";
import { ID } from "@/lib/ID";

export class LedgerRepository extends BaseRepository implements ILedgerRepository {
  constructor(dbInstance?: DrizzleDb) {
    super(dbInstance || db);
  }

  async create(entry: Omit<ILedgerEntryDBDTO, "id" | "createdAt" | "updatedAt">): Promise<ILedgerEntryDBDTO> {
    return this.run(async () => {
      const [newEntry] = await this.db
        .insert(LedgerTable)
        .values({
          ...entry,
          id: ID.LedgerEntryId(),
          amount: this.bigIntToDb(entry.amount),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      if (!newEntry) {
        throw new Error("Failed to create ledger entry");
      }

      return {
        ...newEntry,
        amount: this.numberFromDb(newEntry.amount),
      };
    }, "FAILED_TO_CREATE_LEDGER_ENTRY");
  }

  async findById(entryId: TLedgerEntryId): Promise<ILedgerEntryDBDTO | null> {
    return this.run(async () => {
      const entry = await this.db.query.LedgerTable.findFirst({
        where: {
          id: {
            eq: entryId,
          },
        },
      });

      if (!entry) {
        return null;
      }

      return {
        ...entry,
        amount: this.numberFromDb(entry.amount),
      };
    }, "FAILED_TO_FIND_LEDGER_ENTRY_BY_ID");
  }

  async findByTransactionId(transactionId: TTransactionId): Promise<ILedgerEntryDBDTO[]> {
    return this.run(async () => {
      const entries = await this.db.query.LedgerTable.findMany({
        where: {
          transactionId: {
            eq: transactionId,
          },
        },
      });

      return entries.map((entry) => ({
        ...entry,
        amount: this.numberFromDb(entry.amount),
      }));
    }, "FAILED_TO_FIND_LEDGER_ENTRIES_BY_TRANSACTION_ID");
  }

  async findByEntryType(entryType: EntryType): Promise<ILedgerEntryDBDTO[]> {
    return this.run(async () => {
      const entries = await this.db.query.LedgerTable.findMany({
        where: {
          entryType: {
            eq: entryType,
          },
        },
      });

      return entries.map((entry) => ({
        ...entry,
        amount: this.numberFromDb(entry.amount),
      }));
    }, "FAILED_TO_FIND_LEDGER_ENTRIES_BY_ENTRY_TYPE");
  }

  async update(entryId: TLedgerEntryId, updates: Partial<Omit<ILedgerEntryDBDTO, "id" | "createdAt">>): Promise<void> {
    return this.run(async () => {
      const updateData: any = {
        ...updates,
        updatedAt: new Date(),
      };

      if (updates.amount !== undefined) {
        updateData.amount = this.bigIntToDb(updates.amount);
      }

      await this.db
        .update(LedgerTable)
        .set(updateData)
        .where(eq(LedgerTable.id, entryId))
        .execute();
    }, "FAILED_TO_UPDATE_LEDGER_ENTRY");
  }

  async delete(entryId: TLedgerEntryId): Promise<void> {
    return this.run(async () => {
      await this.db
        .delete(LedgerTable)
        .where(eq(LedgerTable.id, entryId))
        .execute();
    }, "FAILED_TO_DELETE_LEDGER_ENTRY");
  }
}
