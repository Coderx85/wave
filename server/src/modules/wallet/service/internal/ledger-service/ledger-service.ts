import type { ILedgerService, ILedger, TEntryType } from "./ledger-service.interface";
import type { TTransactionId } from "@/types";
import { tryCatch } from "@/lib/try-catch-wrapper";
import { LedgerRepository, type ILedgerRepository } from "../../repository";

export class LedgerService implements ILedgerService {
  private ledgerRepository: ILedgerRepository = new LedgerRepository();

  createEntry(transactionId: TTransactionId, amount: number, entryType: TEntryType): Promise<ILedger> {
    return tryCatch({
      ctx: async () => {
        const entry = await this.ledgerRepository.create({
          transactionId,
          amount,
          entryType,
        });

        return entry;
      },
      errorMessage: "FAILED_TO_CREATE_LEDGER_ENTRY",
    });
  }

  getEntries(transactionId: TTransactionId): Promise<ILedger[]> {
    return tryCatch({
      ctx: async () => {
        const entries = await this.ledgerRepository.findByTransactionId(transactionId);
        return entries;
      },
      errorMessage: "FAILED_TO_GET_LEDGER_ENTRIES",
    });
  }
}