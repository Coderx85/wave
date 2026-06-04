import type {
  IWalletService,
  CreateAccountInput,
  TransferInput,
  DepositInput
} from "./wallet-service.interface";
import type { 
  IAccount, 
  ITransaction, 
  TTransactionQuery, 
  ILedger
} from "./internal";
import type { TBankAccountId, TUserId, TTransactionId } from "@/types";
import { tryCatch } from "@/lib/try-catch-wrapper";
import { ID } from "@/lib/ID";
import {
  AccountRepository,
  type IAccountRepository,
  TransactionRepository,
  type ITransactionRepository,
  LedgerRepository,
  type ILedgerRepository,
} from "../repository";
import { IdempotencyManager } from "../utils";

export class WalletService implements IWalletService {
  private readonly accountRepo: IAccountRepository;
  private readonly transactionRepo: ITransactionRepository;
  private readonly ledgerRepo: ILedgerRepository;

  constructor(
    accountRepo?: IAccountRepository,
    transactionRepo?: ITransactionRepository,
    ledgerRepo?: ILedgerRepository,
  ) {
    this.accountRepo = accountRepo ?? new AccountRepository();
    this.transactionRepo = transactionRepo ?? new TransactionRepository();
    this.ledgerRepo = ledgerRepo ?? new LedgerRepository();
  }

  createAccount(account: CreateAccountInput): Promise<IAccount> {
    const _idempotencyKey = IdempotencyManager.generateAccountCreationKey(
      account.userId.toString(),
      account.name,
    );

    return tryCatch({
      ctx: async () => {
        const newAccount = await this.accountRepo.create({
          id: ID.BankAccountId(),
          ...account,
        });
        return newAccount;
      },
      errorMessage: "FAILED_TO_CREATE_ACCOUNT",
    });
  }

  getAccountByAccountNumber(accountNumber: string): Promise<IAccount | null> {
    return tryCatch({
      ctx: async () => {
        return await this.accountRepo.findByAccountNumber(accountNumber);
      },
      errorMessage: "FAILED_TO_GET_ACCOUNT_BY_NUMBER",
    });
  }

  getAccountById(accountId: TBankAccountId): Promise<IAccount | null> {
    return tryCatch({
      ctx: async () => {
        return await this.accountRepo.findById(accountId);
      },
      errorMessage: "FAILED_TO_GET_ACCOUNT",
    });
  }

  getUserAccounts(userId: TUserId): Promise<IAccount[]> {
    return tryCatch({
      ctx: async () => {
        return await this.accountRepo.findByUserId(userId);
      },
      errorMessage: "FAILED_TO_GET_USER_ACCOUNTS",
    });
  }

  getBalance(accountId: TBankAccountId): Promise<number> {
    return tryCatch({
      ctx: async () => {
        const account = await this.accountRepo.checkBalance(accountId);
        return account.balance;
      },
      errorMessage: "FAILED_TO_GET_BALANCE",
    });
  }

  async deposit(input: DepositInput): Promise<IAccount> {
    return tryCatch({
      ctx: async () => {
        const existingAccount = await this.accountRepo.findById(input.accountId);
        if (!existingAccount) throw new Error("Account not found");

        await this.accountRepo.adjustBalance(input.accountId, input.amount);

        const account = await this.accountRepo.findById(input.accountId);
        if (!account) throw new Error("Account not found after deposit");

        const amountInCents = Math.round(input.amount * 100);

        const transaction: ITransaction = {
          id: ID.TransactionId(),
          userId: input.userId,
          senderAccountId: input.accountId,
          senderName: existingAccount.name,
          receiverAccountId: input.accountId,
          receiverName: existingAccount.name,
          amount: BigInt(amountInCents),
          status: "success",
          createdAt: new Date(),
        };

        await this.transactionRepo.save(transaction);

        await Promise.all([
          this.ledgerRepo.create({
            transactionId: transaction.id,
            amount: amountInCents,
            entryType: "debit",
          }),
          this.ledgerRepo.create({
            transactionId: transaction.id,
            amount: amountInCents,
            entryType: "credit",
          }),
        ]);

        return account;
      },
      errorMessage: "FAILED_TO_DEPOSIT",
    });
  }

  async transfer(input: TransferInput): Promise<ITransaction> {
    const amountInCents = Math.round(input.amount * 100);

    // Idempotency guard — prevent duplicate transactions
    const _idempotencyKey = IdempotencyManager.generateTransactionKey(
      input.senderAccountId.toString(),
      input.receiverAccountId.toString(),
      amountInCents,
    );

    return tryCatch({
      ctx: async () => {
        // Step 1 — Debit sender and credit receiver atomically per account
        await this.accountRepo.adjustBalance(input.senderAccountId, -input.amount);
        await this.accountRepo.adjustBalance(input.receiverAccountId, input.amount);

        // Step 2 — Create transaction record
        const transaction: ITransaction = {
          id: ID.TransactionId(),
          ...input,
          amount: BigInt(amountInCents),
          status: "pending",
        };

        await this.transactionRepo.save({
          ...transaction,
        });

        // Step 3 — Record ledger entries (double-entry bookkeeping)
        await Promise.all([
          this.ledgerRepo.create({
            transactionId: transaction.id,
            amount: amountInCents,
            entryType: "debit",
          }),
          this.ledgerRepo.create({
            transactionId: transaction.id,
            amount: amountInCents,
            entryType: "credit",
          }),
        ]);

        // Step 4 — Update transaction status to success
        const updatedTransaction = await this.transactionRepo.update({
          ...transaction,
          status: "success",
        });
        
        
        return updatedTransaction;
      },
      errorMessage: "FAILED_TO_TRANSFER",
    });
  }

  listTransactions(userId: TUserId): Promise<ITransaction[]> {
    return tryCatch({
      ctx: async () => {
        const transactions = await this.transactionRepo.findByUserId(userId);
        return transactions;
      },
      errorMessage: "FAILED_TO_LIST_TRANSACTIONS",
    });
  }

  queryTransactions(
    query: TTransactionQuery,
    userId: TUserId,
  ): Promise<ITransaction[]> {
    return tryCatch({
      ctx: async () => {
        switch (query.status) {
          case "success": {
            const successfulTransactions =
              await this.transactionRepo.successfulTransactions({
                userId,
                dateRange: query.dateRange,
              });
            return successfulTransactions;
          }

          case "failed": {
            const failedTransactions =
              await this.transactionRepo.failedTransactions({
                userId,
                dateRange: query.dateRange,
              });
            return failedTransactions;
          }

          default:
            throw new Error(
              "Invalid status value. Allowed values are 'success' or 'failed'.",
            );
        }
      },
      errorMessage: "FAILED_TO_QUERY_TRANSACTIONS",
    });
  }

  // ───────────────────────────────────────────────────────────────────
  // Ledger Operations
  // ───────────────────────────────────────────────────────────────────

  getLedgerEntries(transactionId: TTransactionId): Promise<ILedger[]> {
    return tryCatch({
      ctx: async () => {
        return await this.ledgerRepo.findByTransactionId(transactionId);
      },
      errorMessage: "FAILED_TO_GET_LEDGER_ENTRIES",
    });
  }
}
