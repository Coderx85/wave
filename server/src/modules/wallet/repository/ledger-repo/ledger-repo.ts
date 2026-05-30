import type { ILedgerEntryDBDTO, ILedgerRepository, EntryType } from "./ledger-repo.interface";
import { db } from "@/modules/database/client";
import { tryCatch } from "@/lib/try-catch-wrapper";
import { LedgerTable } from "@/modules/database/schema/ledger.repository";
import { eq } from "drizzle-orm";
import type { TLedgerEntryId, TTransactionId } from "@/types";
import { ID } from "@/lib/ID";

export class LedgerRepository implements ILedgerRepository {
  async create(entry: Omit<ILedgerEntryDBDTO, "id" | "createdAt" | "updatedAt">): Promise<ILedgerEntryDBDTO> {
    return tryCatch({
      ctx: async () => {
        const [newEntry] = await db
          .insert(LedgerTable)
          .values({
            ...entry,
            id: ID.LedgerEntryId(),
            amount: BigInt(entry.amount),
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        if (!newEntry) {
          throw new Error("Failed to create ledger entry");
        }

        return {
          ...newEntry,
          amount: Number(newEntry.amount),
        };
      },
      errorMessage: "FAILED_TO_CREATE_LEDGER_ENTRY",
    });
  }

  async findById(entryId: TLedgerEntryId): Promise<ILedgerEntryDBDTO | null> {
    return tryCatch({
      ctx: async () => {
        const entry = await db.query.LedgerTable.findFirst({
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
          amount: Number(entry.amount),
        };
      },
      errorMessage: "FAILED_TO_FIND_LEDGER_ENTRY_BY_ID",
    });
  }

  async findByTransactionId(transactionId: TTransactionId): Promise<ILedgerEntryDBDTO[]> {
    return tryCatch({
      ctx: async () => {
        const entries = await db.query.LedgerTable.findMany({
          where: {
            transactionId: {
              eq: transactionId,
            },
          },
        });

        return entries.map((entry) => ({
          ...entry,
          amount: Number(entry.amount),
        }));
      },
      errorMessage: "FAILED_TO_FIND_LEDGER_ENTRIES_BY_TRANSACTION_ID",
    });
  }

  async findByEntryType(entryType: EntryType): Promise<ILedgerEntryDBDTO[]> {
    return tryCatch({
      ctx: async () => {
        const entries = await db.query.LedgerTable.findMany({
          where: {
            entryType: {
              eq: entryType,
            },
          },
        });

        return entries.map((entry) => ({
          ...entry,
          amount: Number(entry.amount),
        }));
      },
      errorMessage: "FAILED_TO_FIND_LEDGER_ENTRIES_BY_ENTRY_TYPE",
    });
  }

  async update(entryId: TLedgerEntryId, updates: Partial<Omit<ILedgerEntryDBDTO, "id" | "createdAt">>): Promise<void> {
    return tryCatch({
      ctx: async () => {
        const updateData: any = {
          ...updates,
          updatedAt: new Date(),
        };

        if (updates.amount !== undefined) {
          updateData.amount = BigInt(updates.amount);
        }

        await db
          .update(LedgerTable)
          .set(updateData)
          .where(eq(LedgerTable.id, entryId))
          .execute();
      },
      errorMessage: "FAILED_TO_UPDATE_LEDGER_ENTRY",
    });
  }

  async delete(entryId: TLedgerEntryId): Promise<void> {
    return tryCatch({
      ctx: async () => {
        await db
          .delete(LedgerTable)
          .where(eq(LedgerTable.id, entryId))
          .execute();
      },
      errorMessage: "FAILED_TO_DELETE_LEDGER_ENTRY",
    });
  }
}
