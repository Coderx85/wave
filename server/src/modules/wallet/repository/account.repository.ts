import { eq } from "drizzle-orm";
import { type IPostgresStore, type ICacheStore, CompositeRepository } from "@/lib/repository";
import { AccountsTable } from "@/modules/database/schema/transaction.repository";
import type { TBankAccountNumber, TUserId } from "@/types";
import type { IAccountDTO, IAccountRepository } from "./contracts";
import { TB, TBClient } from "@/lib/tigerbeetle";
import { tryCatch } from "@/lib/try-catch-wrapper";
import { CURRENCY_CODE, WALLET_LEDGER_CODE } from "@/lib/tigerbeetle/constant";

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
};

/**
 * @deprecated Use TigerBeetleAccountService from @/lib/tigerbeetle instead.
 * This repository is kept for backward compatibility only.
 */
export class TBAccountRepository implements IAccountRepository {
  private getClient() { return TBClient.getClient(); }

  create(account: Omit<IAccountDTO, "createdAt" | "updatedAt">): Promise<IAccountDTO> {
    return tryCatch({
      ctx: async () => {
        const accountId = TB.id();
        const tbAccount = await this.getClient()!.createAccounts([
          {
            id: accountId,
            flags: TB.AccountFlags.debits_must_not_exceed_credits,
            ledger: WALLET_LEDGER_CODE,
            code: CURRENCY_CODE.INR,
            timestamp: BigInt(Date.now()),
            user_data_128: BigInt(account.userId),
            user_data_64: 0n,
            user_data_32: 0,
            debits_pending: 0n,
            credits_pending: 0n,
            debits_posted: 0n,
            credits_posted: 0n,
            reserved: 0
          }
        ]);

        if (tbAccount.length || !tbAccount[0]) {
          throw new Error("Failed to create account in TigerBeetle");
        };

        if(tbAccount[0].status !== TB.CreateAccountStatus.created){

          if(tbAccount[0].status === TB.CreateAccountStatus.exists_with_different_user_data_128) {
            throw new Error("")
          };

          if(tbAccount[0].status === TB.CreateAccountStatus.credits_posted_must_be_zero) {
            throw new Error("")
          }

          throw new Error(`Failed to create account in TigerBeetle: ${TB.CreateAccountStatusName[tbAccount[0].status] ?? tbAccount[0].status}`);
        };

        const acc = tbAccount[0];

        return {
          accountNumber: accountId as unknown as TBankAccountNumber,
          balance: 0,
          createdAt: new Date(),
          updatedAt: null,
          name: account.name,
          userId: account.userId
        }
       },
      errorMessage: "Failed to create account in TigerBeetle",
    })
  };

  findByAccountNumber(accountNumber: TBankAccountNumber): Promise<IAccountDTO | null> {
    return tryCatch({
      ctx: async () => {
        const [tbAccount] = await this.getClient()!.lookupAccounts([BigInt(accountNumber)]);
        if (!tbAccount) return null;

        return {
          accountNumber: tbAccount.id as unknown as TBankAccountNumber,
          balance: Number(tbAccount.credits_posted) - Number(tbAccount.debits_posted),
          createdAt: new Date(Number(tbAccount.timestamp)),
          updatedAt: null,
          name: "",
          userId: Number(tbAccount.user_data_128) as unknown as TUserId
        }
      },
      errorMessage: "Failed to find account by account number in TigerBeetle",
    })
  };

  /**
   * @deprecated TigerBeetle does not support querying accounts by user_data_128.
   * Use TigerBeetleAccountService from @/lib/tigerbeetle instead.
   */
  findByUserId(_userId: TUserId): Promise<IAccountDTO[]> {
    // TODO: Implement when TigerBeetle query-by-user-data is available
    return Promise.resolve([]);
  };

  /**
   * @deprecated Use TigerBeetleAccountService from @/lib/tigerbeetle instead.
   */
  calculateNewBalance(accountNumber: TBankAccountNumber, amount: number): Promise<number> {
    throw new Error("Method not implemented.");
  };

  /**
   * @deprecated Use TigerBeetleAccountService from @/lib/tigerbeetle instead.
   */
  adjustBalance(accountNumber: TBankAccountNumber, amount: number): Promise<number> {
    throw new Error("Method not implemented.");
  };

  /**
   * @deprecated Use TigerBeetleAccountService from @/lib/tigerbeetle instead.
   */
  checkBalance(accountNumber: TBankAccountNumber): Promise<IAccountDTO> {
    throw new Error("Method not implemented.");
  };

  /**
   * @deprecated Use TigerBeetleAccountService from @/lib/tigerbeetle instead.
   */
  updateBalance(accountNumber: TBankAccountNumber, newBalance: number): Promise<void> {
    throw new Error("Method not implemented.");
  };

}
