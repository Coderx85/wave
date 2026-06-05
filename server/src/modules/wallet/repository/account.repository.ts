import { eq } from "drizzle-orm";
import { CompositeRepository, type IPostgresStore, type ICacheStore } from "@/lib/repository";
import { AccountsTable } from "@/modules/database/schema/transaction.repository";
import type { TBankAccountNumber, TUserId } from "@/types";
import type { IAccountDTO, IAccountRepository } from "./contracts";

type StoreOpts = { pg?: IPostgresStore; cache?: ICacheStore };

export class AccountRepository extends CompositeRepository implements IAccountRepository {
  constructor(opts?: StoreOpts) {
    super(opts);
  }

  private accountCacheKey(accountNumber: TBankAccountNumber): string {
    return this.cacheKey("account", accountNumber.toString());
  }

  private userAccountsCacheKey(userId: TUserId): string {
    return this.cacheKey("user-accounts", userId);
  }

  private toDTO(row: any): IAccountDTO {
    return { ...row, balance: Number(row.balance) };
  }

  async create(account: Omit<IAccountDTO, "createdAt" | "updatedAt">): Promise<IAccountDTO> {
    const result = await this.pg.run(async () => {
      const [row] = await this.pg.client
        .insert(AccountsTable)
        .values({
          ...account,
          balance: account.balance.toString(),
          createdAt: new Date(),
          updatedAt: null,
        })
        .returning();
      if (!row) throw new Error("Failed to create account");
      return this.toDTO(row);
    }, "FAILED_TO_CREATE_ACCOUNT");

    await this.cache.del(this.userAccountsCacheKey(result.userId));
    return result;
  }

  async findById(accountNumber: TBankAccountNumber): Promise<IAccountDTO | null> {
    return this.cache.getOrSet(this.accountCacheKey(accountNumber), () =>
      this.pg.run(async () => {
        const row = await this.pg.client.query.AccountsTable.findFirst({
          where: { accountNumber: { eq: accountNumber } },
        });
        return row ? this.toDTO(row) : null;
      }, "FAILED_TO_FIND_ACCOUNT_BY_ID"),
    3600);
  }

  async findByAccountNumber(accountNumber: TBankAccountNumber): Promise<IAccountDTO | null> {
    return this.findById(accountNumber);
  }

  async findByUserId(userId: TUserId): Promise<IAccountDTO[]> {
    return this.pg.run(async () => {
      const rows = await this.pg.client.query.AccountsTable.findMany({
        where: { userId: { eq: userId } },
      });
      return rows.map(this.toDTO);
    }, "FAILED_TO_FIND_ACCOUNTS_BY_USER");
  }

  async calculateNewBalance(accountNumber: TBankAccountNumber, amount: number): Promise<number> {
    return this.pg.run(async () => {
      const [row] = await this.pg.client
        .select()
        .from(AccountsTable)
        .where(eq(AccountsTable.accountNumber, accountNumber))
        .for("update")
        .execute();
      if (!row) throw new Error("Account not found");
      const newBalance = Number(row.balance) + amount;
      if (newBalance <= 0) throw new Error("Insufficient funds");
      return newBalance;
    }, "FAILED_TO_CALCULATE_BALANCE");
  }

  async adjustBalance(accountNumber: TBankAccountNumber, amount: number): Promise<number> {
    const newBalance = await this.pg.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(AccountsTable)
        .where(eq(AccountsTable.accountNumber, accountNumber))
        .for("update")
        .execute();
      if (!row) throw new Error("Account not found");
      const nb = Number(row.balance) + amount;
      if (nb <= 0) throw new Error("Insufficient funds");
      await tx
        .update(AccountsTable)
        .set({ balance: nb.toString(), updatedAt: new Date() })
        .where(eq(AccountsTable.accountNumber, accountNumber))
        .execute();
      return nb;
    }, "FAILED_TO_ADJUST_BALANCE");

    await this.cache.del(this.accountCacheKey(accountNumber));
    return newBalance;
  }

  async checkBalance(accountNumber: TBankAccountNumber): Promise<IAccountDTO> {
    const account = await this.findById(accountNumber);
    if (!account) throw new Error("Account not found");
    return account;
  }

  async updateBalance(accountNumber: TBankAccountNumber, newBalance: number): Promise<void> {
    await this.pg.run(async () => {
      await this.pg.client
        .update(AccountsTable)
        .set({ balance: newBalance.toString(), updatedAt: new Date() })
        .where(eq(AccountsTable.accountNumber, accountNumber))
        .execute();
    }, "FAILED_TO_UPDATE_BALANCE");

    await this.cache.del(this.accountCacheKey(accountNumber));
  }
}
