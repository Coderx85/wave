import { createHash } from "crypto";
import type { TBankAccountNumber, TUserId } from "@/types";
import type { IAccountDTO, IAccountRepository } from "@/modules/wallet/repository/contracts";
import { TB, TBClient } from "./client";
import { tryCatch } from "@/lib/try-catch-wrapper";
import { CURRENCY_CODE, WALLET_LEDGER_CODE } from "./constant";
import { AccountRepository } from "@/modules/wallet/repository/account.repository";

function hashUserId(userId: string): bigint {
  const digest = createHash("sha256").update(userId).digest();
  return digest.readBigUInt64BE(0);
}

const userIdReverseMap = new Map<bigint, string>();

export class TigerBeetleAccountService implements IAccountRepository {
  private readonly client = TBClient;
  private readonly accountRepository: IAccountRepository = new AccountRepository();

  async create(account: Omit<IAccountDTO, "createdAt" | "updatedAt">): Promise<IAccountDTO> {
    // Save to primary database first
    const data = tryCatch({
      ctx: async () => {
        const newAccount = await this.accountRepository.create({
          ...account,
        });
        return newAccount;
      },
      errorMessage: "FAILED_TO_CREATE_ACCOUNT",
    });
    
    // Error handling for TigerBeetle account creation.
    if(!data) {
      throw new Error("Failed to create account");
    };

    // Then create corresponding account in TigerBeetle
    const tbData = tryCatch({
      ctx: async () => {
        const accountId = TB.id();

        const results = await this.client.createAccounts([
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
          throw new Error("Failed to create account in TigerBeetle");
        }

        const result = results[0];

        if (result.status !== TB.CreateAccountStatus.created) {
          throw new Error(
            `Failed to create account in TigerBeetle: ${TB.CreateAccountStatus[result.status]}`,
          );
        }

        userIdReverseMap.set(hashUserId(account.userId), account.userId);

        return result;
      },
      errorMessage: "FAILED_TO_CREATE_ACCOUNT",
    });

    if(!tbData) {
      throw new Error("Failed to create account in TigerBeetle");
    };

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
    return tryCatch({
      ctx: async () => {
        const accounts = await this.client.lookupAccounts([BigInt(accountNumber)]);
        const tbAccount = accounts[0];

        if (!tbAccount) throw new Error("Account not found");

        const credits = Number(tbAccount.credits_posted);
        const debits = Number(tbAccount.debits_posted);
        const currentBalance = credits - debits;
        const newBalance = currentBalance + amount;

        if (newBalance < 0) {
          throw new Error("Insufficient funds");
        }

        return newBalance;
      },
      errorMessage: "FAILED_TO_ADJUST_BALANCE",
    });
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
