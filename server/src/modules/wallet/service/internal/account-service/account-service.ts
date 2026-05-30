import type { IAccountService, IAccount } from "./account-service.interface";
import type { TBankAccountId, TUserId } from "@/types";
import { tryCatch } from "@/lib/try-catch-wrapper";
import { ID } from "@/lib/ID";
import { AccountRepository, type IAccountRepository } from "../../repository";
import { IdempotencyManager } from "../../utils";

export class AccountService implements IAccountService {
  private accountRepository: IAccountRepository = new AccountRepository();

  create(account: Omit<IAccount, "id" | "createdAt" | "updatedAt">): Promise<IAccount> {
    // Generate idempotency key to prevent duplicate account creation
    const idempotencyKey = IdempotencyManager.generateAccountCreationKey(
      account.userId.toString(),
      account.name
    );

    return tryCatch({
      ctx: async () => {
        const newAccount = await this.accountRepository.create({
          id: ID.BankAccountId(),
          ...account,
        });
        return newAccount;
      },
      errorMessage: "FAILED_TO_CREATE_ACCOUNT",
    });
  }

  getAccountById(accountId: TBankAccountId): Promise<IAccount | null> {
    return tryCatch({
      ctx: async () => {
        const account = await this.accountRepository.findById(accountId);
        return account;
      },
      errorMessage: "FAILED_TO_GET_ACCOUNT",
    });
  }

  getUserAccounts(userId: TUserId): Promise<IAccount[]> {
    return tryCatch({
      ctx: async () => {
        const accounts = await this.accountRepository.findByUserId(userId);
        return accounts;
      },
      errorMessage: "FAILED_TO_GET_USER_ACCOUNTS",
    });
  }

  getBalance(accountId: TBankAccountId): Promise<number> {
    return tryCatch({
      ctx: async () => {
        const account = await this.accountRepository.checkBalance(accountId);
        return account.balance;
      },
      errorMessage: "FAILED_TO_GET_BALANCE",
    });
  }

  updateAccountBalance(accountId: TBankAccountId, amount: number): Promise<IAccount> {
    // Generate idempotency key for balance update
    const idempotencyKey = IdempotencyManager.generateBalanceUpdateKey(
      accountId.toString(),
      amount,
      "update"
    );

    return tryCatch({
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
  }
}
