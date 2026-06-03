import type { ILedgerService, ILedger, TEntryType } from "./ledger-service.interface";
import type { TTransactionId } from "@/types";
import { tryCatch } from "@/lib/try-catch-wrapper";
import { LedgerRepository, type ILedgerRepository } from "../../../repository";
import { CacheFactory, type ICacheStore } from "@/lib/cache";

export class LedgerService implements ILedgerService {
  private ledgerRepository: ILedgerRepository;
  private cacheManager: ICacheStore;

  constructor(
    ledgerRepository: ILedgerRepository = new LedgerRepository(),
    cacheStore?: ICacheStore,
  ) {
    this.ledgerRepository = ledgerRepository;
    this.cacheManager = cacheStore ?? CacheFactory.create();
  }

  async createEntry(transactionId: TTransactionId, amount: number, entryType: TEntryType): Promise<ILedger> {

    const data = await tryCatch({
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

    tryCatch({
      ctx: async () => {
        await this.cacheManager.set(
          data.id,
          data,
          5 * 60 
        );
        return data;
      },
      errorMessage: "FAILED_TO_CACHE_LEDGER_ENTRY",
    });

    return data;
  }

  async getEntries(transactionId: TTransactionId): Promise<ILedger[] | null> {
    const cachedEntries = await tryCatch({
      ctx: async () => {
        const cachedEntries = await this.cacheManager.get<ILedger[]>(transactionId);
        if (cachedEntries) {
          return cachedEntries;
        }
        return null;
      },
      errorMessage: "FAILED_TO_GET_LEDGER_ENTRIES_FROM_CACHE"
    });

    if (cachedEntries) {
      return cachedEntries;
    }

    return await tryCatch({
      ctx: async () => {
        const entries = await this.ledgerRepository.findByTransactionId(transactionId);
        await this.cacheManager.set(transactionId, entries, 5 * 60);
        return entries;
      },
      errorMessage: "FAILED_TO_GET_LEDGER_ENTRIES_FROM_DB"
    });
  }
}
