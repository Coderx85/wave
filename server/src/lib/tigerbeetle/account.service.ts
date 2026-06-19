import { createHash } from "crypto";
import type { TBankAccountNumber, TUserId } from "@/types";
import type { IAccountDTO, IAccountRepository } from "@/modules/wallet/repository/contracts";
import { TB, TBClient } from "./client";
import { tryCatch } from "@/lib/try-catch-wrapper";
import { CURRENCY_CODE, WALLET_LEDGER_CODE, VAULT_ACCOUNT_ID, VAULT_ACCOUNT_CODE } from "./constant";
import { AccountRepository } from "@/modules/wallet/repository/account.repository";

function hashUserId(userId: string): bigint {
  const digest = createHash("sha256").update(userId).digest();
  return digest.readBigUInt64BE(0);
}

const userIdReverseMap = new Map<bigint, string>();

export class TigerBeetleAccountService implements IAccountRepository {
  private readonly accountRepository: IAccountRepository = new AccountRepository();

  private async ensureVaultAccount(): Promise<void> {
    if (!TBClient.ready) return;
    const client = TBClient.getClient();
    if (!client) return;

    try {
      const existing = await client.lookupAccounts([VAULT_ACCOUNT_ID]);
      if (existing.length > 0 && existing[0]) return;

      const results = await client.createAccounts([
        {
          id: VAULT_ACCOUNT_ID,
          flags: TB.AccountFlags.debits_must_not_exceed_credits | TB.AccountFlags.history,
          ledger: WALLET_LEDGER_CODE,
          code: VAULT_ACCOUNT_CODE,
          timestamp: 0n,
          user_data_128: 0n,
          user_data_64: 0n,
          user_data_32: 0,
          debits_pending: 0n,
          credits_pending: 0n,
          debits_posted: 0n,
          credits_posted: 0n,
          reserved: 0,
        },
      ]);

      if (results[0]?.status === TB.CreateAccountStatus.created) {
        console.log("[TigerBeetle] Vault account created");
      }
    } catch (err: unknown) {
      console.warn(`[TigerBeetle] ensureVaultAccount failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async createTransfer(
    debitAccountId: bigint,
    creditAccountId: bigint,
    amount: bigint,
  ): Promise<void> {
    if (!TBClient.ready) {
      console.warn("[TigerBeetle] Client not ready, skipping transfer");
      return;
    }

    const client = TBClient.getClient();
    if (!client) {
      console.warn("[TigerBeetle] No client, skipping transfer");
      return;
    }

    try {
      const transferId = TB.id();

      const results = await client.createTransfers([
        {
          id: transferId,
          debit_account_id: debitAccountId,
          credit_account_id: creditAccountId,
          amount,
          user_data_128: 0n,
          user_data_64: 0n,
          user_data_32: 0,
          timeout: 0,
          flags: 0,
          pending_id: 0n,
          ledger: WALLET_LEDGER_CODE,
          code: CURRENCY_CODE.INR,
          timestamp: 0n,
        },
      ]);

      if (results.length !== 1 || !results[0]) {
        console.warn("[TigerBeetle] Transfer failed — no result");
        return;
      }

      const result = results[0];
      if (result.status !== TB.CreateTransferStatus.created) {
        console.warn(`[TigerBeetle] Transfer failed: ${TB.CreateTransferStatus[result.status]}`);
        return;
      }

      console.log(`[TigerBeetle] Transfer ${debitAccountId} → ${creditAccountId}: ${amount}`);
    } catch (err: unknown) {
      console.warn(`[TigerBeetle] createTransfer failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private async createInTigerBeetle(account: IAccountDTO): Promise<void> {
    try {
      if (!TBClient.ready) return;

      const client = TBClient.getClient();
      if (!client) return;

      const accountId = BigInt(account.accountNumber.toString());

      const results = await client.createAccounts([
        {
          id: accountId,
          flags: TB.AccountFlags.debits_must_not_exceed_credits,
          ledger: WALLET_LEDGER_CODE,
          code: CURRENCY_CODE.INR,
          timestamp: 0n,
          user_data_128: hashUserId(account.userId),
          user_data_64: 0n,
          user_data_32: 0,
          debits_pending: 0n,
          credits_pending: 0n,
          debits_posted: 0n,
          credits_posted: 0n,
          reserved: 0,
        },
      ]);

      if (results.length !== 1 || !results[0]) {
        console.warn("[TigerBeetle] Failed to create account");
        return;
      }

      const result = results[0];

      if (result.status !== TB.CreateAccountStatus.created) {
        console.warn(`[TigerBeetle] Account create status: ${TB.CreateAccountStatus[result.status]}`);
        return;
      }

      userIdReverseMap.set(hashUserId(account.userId), account.userId);
      console.log(`[TigerBeetle] Account created: ${account.accountNumber}`);
    } catch (err: unknown) {
      console.warn(`[TigerBeetle] createAccounts failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async create(account: Omit<IAccountDTO, "createdAt" | "updatedAt">): Promise<IAccountDTO> {
    const data = await tryCatch({
      ctx: async () => {
        const newAccount = await this.accountRepository.create({
          ...account,
        });
        return newAccount;
      },
      errorMessage: "FAILED_TO_CREATE_ACCOUNT",
    });

    if (!data) {
      throw new Error("Failed to create account");
    }

    // Fire and forget — ensure vault + create TB account
    this.ensureVaultAccount()
      .then(() => this.createInTigerBeetle(data))
      .catch(() => {});

    return data;
  }

  async findByAccountNumber(accountNumber: TBankAccountNumber): Promise<IAccountDTO | null> {
    return tryCatch({
      ctx: async () => {
        const account = await this.accountRepository.findByAccountNumber(accountNumber);
        return account;
      },
      errorMessage: "FAILED_TO_GET_ACCOUNT",
    });
  }

  async findByUserId(_userId: TUserId): Promise<IAccountDTO[]> {
    return tryCatch({
      ctx: async () => {
        const accounts = await this.accountRepository.findByUserId(_userId);
        return accounts;
      },
      errorMessage: "FAILED_TO_GET_USER_ACCOUNTS",
    });
  }

  async adjustBalance(
    accountNumber: TBankAccountNumber,
    amount: number,
  ): Promise<number> {
    const account = await this.findByAccountNumber(accountNumber);
    if (!account) throw new Error("Account not found");

    const newBalance = account.balance + amount;
    if (newBalance < 0) throw new Error("Insufficient funds");

    // Create a TigerBeetle transfer for the balance change
    const amountInCents = BigInt(Math.round(Math.abs(amount) * 100));
    const accountId = BigInt(accountNumber.toString());

    if (amount > 0) {
      // Credit: vault → user account
      await this.createTransfer(VAULT_ACCOUNT_ID, accountId, amountInCents);
    } else if (amount < 0) {
      // Debit: user account → vault
      await this.createTransfer(accountId, VAULT_ACCOUNT_ID, amountInCents);
    }

    // Sync Postgres balance
    await this.accountRepository.adjustBalance(accountNumber, amount);

    return newBalance;
  }

  async checkBalance(accountNumber: TBankAccountNumber): Promise<IAccountDTO> {
    return tryCatch({
      ctx: async () => {
        const account = await this.findByAccountNumber(accountNumber);
        if (!account) throw new Error("Account not found");
        return account;
      },
      errorMessage: "FAILED_TO_CHECK_BALANCE",
    });
  }
}
