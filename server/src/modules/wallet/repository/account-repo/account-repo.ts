import type { TBankAccountId, TUserId } from "@/types";
import type { IAccountDBDTO, IAccountRepository} from "./account-repo.interface";
import { db } from "@/modules/database/client";
import { tryCatch } from "@/lib/try-catch-wrapper";
import { AccountsTable } from "@/modules/database/schema/transaction.repository";
import { eq } from "drizzle-orm";

export class AccountRepository implements IAccountRepository {
  create(account: Omit<IAccountDBDTO, | "createdAt" | "updatedAt">): Promise<IAccountDBDTO> {
    return tryCatch({
      ctx: async () => {
        const [newAccount] = await db
          .insert(AccountsTable)
          .values({
            ...account,
            balance: account.balance.toString(),
            createdAt: new Date(),
            updatedAt: null,
          })
          .returning()

        if(!newAccount) {
          throw new Error("Failed to create account");
        }

        return {
          ...newAccount,
          balance: Number(newAccount.balance),
        };
      },
      errorMessage: "FAILED_TO_CREATE_ACCOUNT",
    });
  };

  findById(accountId: TBankAccountId): Promise<IAccountDBDTO | null> {
    return tryCatch({
      ctx: async () => {
        const account = await db.query.AccountsTable.findFirst({
          where: {
            id: {
              eq: accountId,
            },
          }
        })

        if (!account) {
          return null;
        }

        return {
          ...account,
          balance: Number(account.balance),
        };
      },
      errorMessage: "FAILED_TO_FIND_ACCOUNT_BY_ID",
    });
  };

  findByUserId(userId: TUserId): Promise<IAccountDBDTO[]> {
    return tryCatch({
      ctx: async () => {
        const accounts = await db.query.AccountsTable.findMany({
          where: {
            userId: {
              eq: userId,
            },
          }
        });
        
        return accounts.map(account => ({
          ...account,
          balance: Number(account.balance),
        }));
      },
      errorMessage: "FAILED_TO_FIND_ACCOUNTS_BY_USER_ID",
    });
  }

  calculateNewBalance(accountId: TBankAccountId, amount: number): Promise<number> {
    return tryCatch({
      ctx: async () => {
        const account = await this.findById(accountId);

        if (!account) {
          throw new Error("Account not found");
        }

        // lock the account row for update to prevent race conditions
        await db
          .select()
          .from(AccountsTable)
          .for("update", {
            skipLocked: true,
          })
          .where(eq(AccountsTable.id, accountId))
          .execute();
          
        const newBalance = account.balance + amount;

        if (newBalance <= 0.00) {
          throw new Error("Insufficient funds");
        }

        return newBalance;
      }
    });
  }

  checkBalance(accountId: TBankAccountId): Promise<IAccountDBDTO> {
    return tryCatch({
      ctx: async () => {
        const account = await this.findById(accountId);

        if (!account) {
          throw new Error("Account not found");
        }

        return account;
      },
      errorMessage: "FAILED_TO_CHECK_BALANCE",
    });
  }
  
  updateBalance(accountId: TBankAccountId, newBalance: number): Promise<void> {
    return tryCatch({
      ctx: async () => {
        await db
          .update(AccountsTable)
          .set({
            balance: newBalance.toString(),
            updatedAt: new Date(),
          })
          .where(eq(AccountsTable.id, accountId))
          .execute();
      },
      errorMessage: "FAILED_TO_UPDATE_BALANCE",
    });
  }
}