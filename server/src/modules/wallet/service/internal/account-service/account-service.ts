import type { IAccountService, IAccount } from "./account-service.interface";
import type { TBankAccountId, TUserId } from "@/types";
import { tryCatch } from "@/lib/try-catch-wrapper";
import { ID } from "@/lib/ID";
import { AccountRepository, type IAccountRepository } from "../../../repository";
import { IdempotencyManager } from "../../../utils";
import { CacheFactory, type ICacheStore } from "@/lib/cache";

export class AccountService implements IAccountService {
  private accountRepository: IAccountRepository;
  private cacheManager: ICacheStore;

  constructor(
    accountRepository: IAccountRepository = new AccountRepository(),
    cacheStore?: ICacheStore,
  ) {
    this.accountRepository = accountRepository;
    this.cacheManager = cacheStore ?? CacheFactory.create();
  }

  async create(account: Omit<IAccount, "id" | "createdAt" | "updatedAt">): Promise<IAccount> {
    const idempotencyKey = IdempotencyManager.generateAccountCreationKey(
      account.userId.toString(),
      account.name
    );

    const data = await tryCatch({
      ctx: async () => {
        const newAccount = await this.accountRepository.create({
          id: ID.BankAccountId(),
          ...account,
        });
        return newAccount;
      },
      errorMessage: "FAILED_TO_CREATE_ACCOUNT",
    });

    await this.cacheManager.set(data.id, data, 5 * 60);

    return data;
  };
  
  async getAccountById(accountId: TBankAccountId): Promise<IAccount | null> {
    const data = await tryCatch({
      ctx: async () => {
        const account = await this.accountRepository.findById(accountId);
        return account;
      },
      errorMessage: "FAILED_TO_GET_ACCOUNT",
    });

    if (!data) {
      return null;
    };

    await this.cacheManager.set(accountId, data, 5 * 60);

    return data;
  };

  async getUserAccounts(userId: TUserId): Promise<IAccount[]> {
    const data = await tryCatch({
      ctx: async () => {
        const accounts = await this.accountRepository.findByUserId(userId);
        return accounts;
      },
      errorMessage: "FAILED_TO_GET_USER_ACCOUNTS",
    });
    return data;
  };

  async getBalance(accountId: TBankAccountId): Promise<number> {
    const data = await tryCatch({
      ctx: async () => {
        const account = await this.accountRepository.checkBalance(accountId);
        return account.balance;
      },
      errorMessage: "FAILED_TO_GET_BALANCE",
    });
    return data;
  };

  async updateAccountBalance(accountId: TBankAccountId, amount: number): Promise<IAccount> {
    const idempotencyKey = IdempotencyManager.generateBalanceUpdateKey(
      accountId.toString(),
      amount,
      "update"
    );

    
    const cachedData = await this.cacheManager.getOrSet(accountId, async () => {
        const data = await tryCatch({
        ctx: async () => {
          await this.accountRepository.adjustBalance(accountId, amount);
          const updatedAccount = await this.accountRepository.findById(accountId);
          if (!updatedAccount) {
            throw new Error("Failed to retrieve updated account");
          }
          
          return updatedAccount;
        },
        errorMessage: "FAILED_TO_UPDATE_ACCOUNT_BALANCE",
      });

        return data;
      }, 5 * 60);

      if (!cachedData) {
        throw new Error("Failed to update account balance");
      };

    return cachedData;
  };
}
