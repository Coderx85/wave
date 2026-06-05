import type { IAccountService, IAccount } from "./account-service.interface";
import type { TBankAccountNumber, TUserId } from "@/types";
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
          ...account,
        });
        return newAccount;
      },
      errorMessage: "FAILED_TO_CREATE_ACCOUNT",
    });

    await this.cacheManager.set(data.accountNumber.toString(), data, 5 * 60);

    return data;
  };

  async getAccountByNumber(accountNumber: TBankAccountNumber): Promise<IAccount | null> {
    const data = await tryCatch({
      ctx: async () => {
        const account = await this.accountRepository.findByAccountNumber(accountNumber);
        return account;
      },
      errorMessage: "FAILED_TO_GET_ACCOUNT",
    });

    if (!data) {
      return null;
    };

    await this.cacheManager.set(accountNumber.toString(), data, 5 * 60);

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

  async getBalance(accountNumber: TBankAccountNumber): Promise<number> {
    const data = await tryCatch({
      ctx: async () => {
        const account = await this.accountRepository.checkBalance(accountNumber);
        return account.balance;
      },
      errorMessage: "FAILED_TO_GET_BALANCE",
    });
    return data;
  };

  async updateAccountBalance(accountNumber: TBankAccountNumber, amount: number): Promise<IAccount> {
    const idempotencyKey = IdempotencyManager.generateBalanceUpdateKey(
      accountNumber.toString(),
      amount,
      "update"
    );

    
    const cachedData = await this.cacheManager.getOrSet(accountNumber.toString(), async () => {
        const data = await tryCatch({
        ctx: async () => {
          await this.accountRepository.adjustBalance(accountNumber, amount);
          const updatedAccount = await this.accountRepository.findByAccountNumber(accountNumber);
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
