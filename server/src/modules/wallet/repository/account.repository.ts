import { eq } from "drizzle-orm";
import { CompositeRepository, type IPostgresStore, type ICacheStore } from "@/lib/repository";
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

export class TBAccountRepository implements IAccountRepository {
  private tigerBeetle: typeof TBClient = TBClient;
  private static readonly SYSTEM_ACCOUNT_ID = 1n;
  private systemAccountEnsured = false;

  private encodeUserId(userId: TUserId): bigint {
    const uuid = userId.replace("user_", "");
    const hex = uuid.replace(/-/g, "");
    return BigInt("0x" + hex);
  }

  private decodeUserId(userData128: bigint): TUserId {
    const hex = userData128.toString(16).padStart(32, "0");
    const uuid = [
      hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16),
      hex.slice(16, 20), hex.slice(20, 32),
    ].join("-");
    return `user_${uuid}` as TUserId;
  }

  private toDTO(acc: TB.Account): IAccountDTO {
    return {
      accountNumber: acc.id as unknown as TBankAccountNumber,
      balance: Number(acc.credits_posted - acc.debits_posted),
      name: "",
      userId: this.decodeUserId(acc.user_data_128),
      createdAt: new Date(Number(acc.timestamp / 1000000n)),
      updatedAt: null,
    };
  }

  private async ensureSystemAccount(): Promise<void> {
    if (this.systemAccountEnsured) return;
    const existing = await this.tigerBeetle.lookupAccounts([TBAccountRepository.SYSTEM_ACCOUNT_ID]);
    if (!existing.length) {
      await this.tigerBeetle.createAccounts([{
        id: TBAccountRepository.SYSTEM_ACCOUNT_ID,
        flags: TB.AccountFlags.none,
        ledger: WALLET_LEDGER_CODE,
        code: CURRENCY_CODE.INR,
        timestamp: 0n,
        user_data_128: 0n,
        user_data_64: 0n,
        user_data_32: 0,
        debits_pending: 0n,
        credits_pending: 0n,
        debits_posted: 0n,
        credits_posted: 0n,
        reserved: 0,
      }]);
    }
    this.systemAccountEnsured = true;
  }

  create(account: Omit<IAccountDTO, "createdAt" | "updatedAt">): Promise<IAccountDTO> {
    return tryCatch({
      ctx: async () => {
        const accountId = TB.id();
        const [result] = await this.tigerBeetle.createAccounts([
          {
            id: accountId,
            flags: TB.AccountFlags.debits_must_not_exceed_credits,
            ledger: WALLET_LEDGER_CODE,
            code: CURRENCY_CODE.INR,
            timestamp: BigInt(Date.now()) * 1000000n,
            user_data_128: this.encodeUserId(account.userId),
            user_data_64: 0n,
            user_data_32: 0,
            debits_pending: 0n,
            credits_pending: 0n,
            debits_posted: 0n,
            credits_posted: 0n,
            reserved: 0,
          },
        ]);

        if (!result) throw new Error("Failed to create account in TigerBeetle");

        if (result.status !== TB.CreateAccountStatus.created) {
          const statusName = (TB.CreateAccountStatus as any)[result.status] ?? String(result.status);
          throw new Error(`Failed to create account in TigerBeetle: ${statusName}`);
        }

        return {
          accountNumber: accountId as unknown as TBankAccountNumber,
          balance: 0,
          createdAt: new Date(),
          updatedAt: null,
          name: account.name,
          userId: account.userId,
        };
      },
      errorMessage: "Failed to create account in TigerBeetle",
    });
  }

  findByAccountNumber(accountNumber: TBankAccountNumber): Promise<IAccountDTO | null> {
    return tryCatch({
      ctx: async () => {
        const accounts = await this.tigerBeetle.lookupAccounts([accountNumber as unknown as bigint]);
        return accounts.length ? this.toDTO(accounts[0]!) : null;
      },
      errorMessage: "Failed to find account by number in TigerBeetle",
    });
  }

  findByUserId(userId: TUserId): Promise<IAccountDTO[]> {
    return tryCatch({
      ctx: async () => {
        const filter: TB.QueryFilter = {
          user_data_128: this.encodeUserId(userId),
          user_data_64: 0n,
          user_data_32: 0,
          ledger: WALLET_LEDGER_CODE,
          code: 0,
          timestamp_min: 0n,
          timestamp_max: 0n,
          limit: 100,
          flags: 0,
        };
        const accounts = await this.tigerBeetle.queryAccounts(filter);
        return accounts.map((a) => this.toDTO(a));
      },
      errorMessage: "Failed to find accounts by user in TigerBeetle",
    });
  }

  calculateNewBalance(accountNumber: TBankAccountNumber, amount: number): Promise<number> {
    return tryCatch({
      ctx: async () => {
        const accounts = await this.tigerBeetle.lookupAccounts([accountNumber as unknown as bigint]);
        if (!accounts.length || !accounts[0]) throw new Error("Account not found");
        const acc = accounts[0];
        const current = Number(acc.credits_posted - acc.debits_posted);
        const newBalance = current + amount;
        if (newBalance < 0) throw new Error("Insufficient funds");
        return newBalance;
      },
      errorMessage: "Failed to calculate new balance in TigerBeetle",
    });
  }

  adjustBalance(accountNumber: TBankAccountNumber, amount: number): Promise<number> {
    return tryCatch({
      ctx: async () => {
        await this.ensureSystemAccount();

        const accountId = accountNumber as unknown as bigint;
        const absAmount = BigInt(Math.abs(amount));

        if (amount === 0) {
          const accts = await this.tigerBeetle.lookupAccounts([accountId]);
          if (!accts.length || !accts[0]) throw new Error("Account not found");
          return Number(accts[0].credits_posted - accts[0].debits_posted);
        }

        const debitId = amount > 0 ? TBAccountRepository.SYSTEM_ACCOUNT_ID : accountId;
        const creditId = amount > 0 ? accountId : TBAccountRepository.SYSTEM_ACCOUNT_ID;

        const [result] = await this.tigerBeetle.createTransfers([{
          id: TB.id(),
          debit_account_id: debitId,
          credit_account_id: creditId,
          amount: absAmount,
          pending_id: 0n,
          user_data_128: 0n,
          user_data_64: 0n,
          user_data_32: 0,
          timeout: 0,
          ledger: WALLET_LEDGER_CODE,
          code: CURRENCY_CODE.INR,
          flags: TB.TransferFlags.none,
          timestamp: BigInt(Date.now()) * 1000000n,
        }]);

        if (!result) throw new Error("Transfer returned no result");

        if (result.status !== TB.CreateTransferStatus.created) {
          if (result.status === TB.CreateTransferStatus.exceeds_credits ||
              result.status === TB.CreateTransferStatus.exceeds_debits) {
            throw new Error("Insufficient funds");
          }
          const statusName = (TB.CreateTransferStatus as any)[result.status] ?? String(result.status);
          throw new Error(`Transfer failed: ${statusName}`);
        }

        const updated = await this.tigerBeetle.lookupAccounts([accountId]);
        if (!updated.length || !updated[0]) throw new Error("Account not found after adjustment");
        return Number(updated[0].credits_posted - updated[0].debits_posted);
      },
      errorMessage: "Failed to adjust balance in TigerBeetle",
    });
  }

  checkBalance(accountNumber: TBankAccountNumber): Promise<IAccountDTO> {
    return tryCatch({
      ctx: async () => {
        const account = await this.findByAccountNumber(accountNumber);
        if (!account) throw new Error("Account not found");
        return account;
      },
      errorMessage: "Failed to check balance in TigerBeetle",
    });
  }

  updateBalance(accountNumber: TBankAccountNumber, newBalance: number): Promise<void> {
    return tryCatch({
      ctx: async () => {
        const accounts = await this.tigerBeetle.lookupAccounts([accountNumber as unknown as bigint]);
        if (!accounts.length || !accounts[0]) throw new Error("Account not found");
        const current = Number(accounts[0].credits_posted - accounts[0].debits_posted);
        const diff = newBalance - current;
        if (diff !== 0) {
          await this.adjustBalance(accountNumber, diff);
        }
      },
      errorMessage: "Failed to update balance in TigerBeetle",
    });
  }
}
