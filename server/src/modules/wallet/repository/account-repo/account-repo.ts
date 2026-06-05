import type { TBankAccountNumber, TUserId } from "@/types";
import type { IAccountDBDTO, IAccountRepository} from "./account-repo.interface";
import { CachedRepository, type DrizzleDb } from "@/lib/repository/base-repository";
import { AccountsTable } from "@/modules/database/schema/transaction.repository";
import { eq } from "drizzle-orm";
import type { ICacheStore } from "@/lib/cache";

export class AccountRepository extends CachedRepository implements IAccountRepository {
  constructor(dbInstance?: DrizzleDb, cacheStore?: ICacheStore) {
    super(dbInstance, cacheStore);
  }

  private getAccountCacheKey(accountNumber: TBankAccountNumber): string {
    return this.getCacheKey("account", accountNumber.toString());
  }

  private getUserAccountsCacheKey(userId: TUserId): string {
    return this.getCacheKey("user-accounts", userId);
  }

  async create(account: Omit<IAccountDBDTO, "createdAt" | "updatedAt">): Promise<IAccountDBDTO> {
    const newAccount = await this.run(async () => {
      const [result] = await this.db
        .insert(AccountsTable)
        .values({
          ...account,
          balance: this.numberToDb(account.balance),
          createdAt: new Date(),
          updatedAt: null,
        })
        .returning();

      if (!result) {
        throw new Error("Failed to create account");
      }

      return {
        ...result,
        balance: this.numberFromDb(result.balance),
      };
    }, "FAILED_TO_CREATE_ACCOUNT");

    await this.cache.del(this.getUserAccountsCacheKey(newAccount.userId));

    return newAccount;
  }

  findById(accountNumber: TBankAccountNumber): Promise<IAccountDBDTO | null> {
    const cacheKey = this.getAccountCacheKey(accountNumber);
    return this.cache.getOrSet(cacheKey, async () => {
      return this.run(async () => {
        const account = await this.db.query.AccountsTable.findFirst({
          where: {
            accountNumber: {
              eq: accountNumber
            }
          }
        });

        if (!account) return null;

        return { ...account, balance: this.numberFromDb(account.balance) };
      }, "FAILED_TO_FIND_ACCOUNT_BY_ID");
    }, 3600);
  };

  findByAccountNumber(accountNumber: TBankAccountNumber): Promise<IAccountDBDTO | null> {
    const cacheKey = this.getCacheKey("account-number", accountNumber.toString());
    return this.cache.getOrSet(cacheKey, async () => {
      return this.run(async () => {
        const account = await this.db.query.AccountsTable.findFirst({
          where: {
            accountNumber: {
              eq: accountNumber,
            },
          },
        });

        if (!account) return null;
        return { ...account, balance: this.numberFromDb(account.balance) };
      }, "FAILED_TO_FIND_ACCOUNT_BY_NUMBER");
    }, 3600);
  };

  findByUserId(userId: TUserId): Promise<IAccountDBDTO[]> {
    return this.run(async () => {
      const accounts = await this.db.query.AccountsTable.findMany({
        where: {
          userId: {
            eq: userId
          }
        }
      });

      return accounts.map(account => ({
        ...account,
        balance: this.numberFromDb(account.balance)
      }));
    }, "FAILED_TO_FIND_ACCOUNTS_BY_USER_ID")
  };

  calculateNewBalance(accountNumber: TBankAccountNumber, amount: number): Promise<number> {
    return this.run(async () => {
      const [account] = await this.db
        .select()
        .from(AccountsTable)
        .where(
          eq(AccountsTable.accountNumber, accountNumber))
        .for("update")
        .execute();
      if (!account) throw new Error("Account not found");

      const newBalance = this.numberFromDb(account.balance) + amount;
      if (newBalance <= 0.00) throw new Error("Insufficient funds");
      return newBalance;

    }, "FAILED_TO_CALCULATE_NEW_BALANCE");
  }

  async adjustBalance(accountNumber: TBankAccountNumber, amount: number): Promise<number> {
    const newBalance = await this.run(async () => {
      return await this.db.transaction(
        async (tx) => {
          const [account] = await tx
            .select()
            .from(AccountsTable)
            .where(
              eq(AccountsTable.accountNumber, accountNumber))
            .for("update")
            .execute();

          if (!account) throw new Error("Account not found");

          const newBalance = this.numberFromDb(account.balance) + amount;
          if (newBalance <= 0.00) throw new Error("Insufficient funds");

          await tx
            .update(AccountsTable)
            .set({
              balance: this.numberToDb(newBalance),
              updatedAt: new Date()
            })
            .where(eq(AccountsTable.accountNumber, accountNumber))
            .execute();

          return newBalance;
        });
      }, "FAILED_TO_ADJUST_BALANCE");

    await this.cache.del(this.getAccountCacheKey(accountNumber));
    const account = await this.findByAccountNumber(accountNumber);
    if (!account) {
      throw new Error("Account not found"); 
    }
    await this.cache.del(this.getUserAccountsCacheKey(account.userId));

    return newBalance;
  }

  checkBalance(accountNumber: TBankAccountNumber): Promise<IAccountDBDTO> {
    return this.run(async () => {
      const account = await this.findByAccountNumber(accountNumber);
      if (!account) throw new Error("Account not found");
      return account;
    }, "FAILED_TO_CHECK_BALANCE");
  }

  async updateBalance(accountNumber: TBankAccountNumber, newBalance: number): Promise<void> {
    await this.run(async () => {
      await this.db.update(AccountsTable).set({
        balance: this.numberToDb(newBalance),
        updatedAt: new Date()
      })
      .where(eq(AccountsTable.accountNumber, accountNumber))
      .execute();
    }, "FAILED_TO_UPDATE_BALANCE");

    await this.cache.del(this.getAccountCacheKey(accountNumber));
    const account = await this.findByAccountNumber(accountNumber);
    if (!account) {
      throw new Error("Account not found");
    }
    await this.cache.del(this.getUserAccountsCacheKey(account.userId));
  }
}
