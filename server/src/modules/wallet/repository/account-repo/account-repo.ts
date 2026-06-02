import type { TBankAccountId, TUserId } from "@/types";
import type { IAccountDBDTO, IAccountRepository} from "./account-repo.interface";
import { db } from "@/modules/database/client";
import { BaseRepository, type DrizzleDb } from "@/lib/repository/base-repository";
import { AccountsTable } from "@/modules/database/schema/transaction.repository";
import { eq } from "drizzle-orm";

export class AccountRepository extends BaseRepository implements IAccountRepository {
  constructor(dbInstance?: DrizzleDb) {
    super(dbInstance || db);
  }

  create(account: Omit<IAccountDBDTO, "createdAt" | "updatedAt">): Promise<IAccountDBDTO> {
    return this.run(async () => {
      const [newAccount] = await this.db
        .insert(AccountsTable)
        .values({
          ...account,
          balance: this.numberToDb(account.balance),
          createdAt: new Date(),
          updatedAt: null,
        })
        .returning();

      if (!newAccount) {
        throw new Error("Failed to create account");
      }

      return {
        ...newAccount,
        balance: this.numberFromDb(newAccount.balance),
      };
    }, "FAILED_TO_CREATE_ACCOUNT");
  }

  findById(accountId: TBankAccountId): Promise<IAccountDBDTO | null> {
    return this.run(async () => {
      const account = await this.db.query.AccountsTable.findFirst({
        where: {
          id: {
            eq: accountId,
          },
        }
      });

      if (!account) {
        return null;
      }

      return {
        ...account,
        balance: this.numberFromDb(account.balance),
      };
    }, "FAILED_TO_FIND_ACCOUNT_BY_ID");
  }

  findByUserId(userId: TUserId): Promise<IAccountDBDTO[]> {
    return this.run(async () => {
      const accounts = await this.db.query.AccountsTable.findMany({
        where: {
          userId: {
            eq: userId,
          },
        }
      });
      
      return accounts.map(account => ({
        ...account,
        balance: this.numberFromDb(account.balance),
      }));
    }, "FAILED_TO_FIND_ACCOUNTS_BY_USER_ID");
  }

  calculateNewBalance(accountId: TBankAccountId, amount: number): Promise<number> {
    return this.run(async () => {
      const [account] = await this.db
        .select()
        .from(AccountsTable)
        .for("update")
        .where(eq(AccountsTable.id, accountId))
        .execute();

      if (!account) {
        throw new Error("Account not found");
      }

      const newBalance = this.numberFromDb(account.balance) + amount;

      if (newBalance <= 0.00) {
        throw new Error("Insufficient funds");
      }

      return newBalance;
    }, "FAILED_TO_CALCULATE_NEW_BALANCE");
  }

  adjustBalance(accountId: TBankAccountId, amount: number): Promise<number> {
    return this.run(async () => {
      return await this.db.transaction(async (tx) => {
        const [account] = await tx
          .select()
          .from(AccountsTable)
          .for("update")
          .where(eq(AccountsTable.id, accountId))
          .execute();

        if (!account) {
          throw new Error("Account not found");
        }

        const newBalance = this.numberFromDb(account.balance) + amount;

        if (newBalance <= 0.00) {
          throw new Error("Insufficient funds");
        }

        await tx
          .update(AccountsTable)
          .set({
            balance: this.numberToDb(newBalance),
            updatedAt: new Date(),
          })
          .where(eq(AccountsTable.id, accountId))
          .execute();

        return newBalance;
      });
    }, "FAILED_TO_ADJUST_BALANCE");
  }

  checkBalance(accountId: TBankAccountId): Promise<IAccountDBDTO> {
    return this.run(async () => {
      const account = await this.findById(accountId);

      if (!account) {
        throw new Error("Account not found");
      }

      return account;
    }, "FAILED_TO_CHECK_BALANCE");
  }
  
  updateBalance(accountId: TBankAccountId, newBalance: number): Promise<void> {
    return this.run(async () => {
      await this.db
        .update(AccountsTable)
        .set({
          balance: this.numberToDb(newBalance),
          updatedAt: new Date(),
        })
        .where(eq(AccountsTable.id, accountId))
        .execute();
    }, "FAILED_TO_UPDATE_BALANCE");
  }
}
