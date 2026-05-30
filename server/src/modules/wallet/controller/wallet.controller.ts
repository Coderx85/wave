import type { FastifyReply, FastifyRequest } from "fastify";
import { sendError, sendSuccess } from "@/lib/response";
import {
  type IWalletController,
  type TWalletAccountDTO,
  type TWalletLedgerDTO,
  type TWalletTransactionDTO,
} from "./wallet.controller.interface";
import type { TBankAccountId } from "@/types";
import type { IWalletService } from "../service";
import { WalletService } from "../service";

const toAccountDTO = (account: Awaited<ReturnType<IWalletService["createAccount"]>>): TWalletAccountDTO => ({
  ...account,
  createdAt: account.createdAt.toISOString(),
  updatedAt: account.updatedAt ? account.updatedAt.toISOString() : null,
});

const toTransactionDTO = (transaction: Awaited<ReturnType<IWalletService["transfer"]>>): TWalletTransactionDTO => ({
  ...transaction,
  amount: transaction.amount.toString(),
  createdAt: transaction.createdAt.toISOString(),
  updatedAt: (() => {
    const maybeTransaction = transaction as typeof transaction & { updatedAt?: Date | string | null };
    if (maybeTransaction.updatedAt instanceof Date) {
      return maybeTransaction.updatedAt.toISOString();
    }
    return maybeTransaction.updatedAt ?? null;
  })(),
});

const toTransactionsDTO = (transactions: Awaited<ReturnType<IWalletService["listTransactions"]>>): TWalletTransactionDTO[] =>
  transactions.map(toTransactionDTO);

const toLedgerDTO = (entries: Awaited<ReturnType<IWalletService["getLedgerEntries"]>>): TWalletLedgerDTO[] =>
  entries.map((entry) => ({
    ...entry,
    amount: entry.amount.toString(),
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt ? entry.updatedAt.toISOString() : null,
  }));

export class WalletController implements IWalletController {
  constructor(private readonly walletService: IWalletService = new WalletService()) {}

  createAccountHandler = async (
    request: FastifyRequest<{ Body: Parameters<IWalletService["createAccount"]>[0] }>,
    reply: FastifyReply,
  ) => {
    const account = await this.walletService.createAccount(request.body);
    return sendSuccess<TWalletAccountDTO>({
      reply,
      statusCode: 201,
      message: "Successfully created account",
      data: toAccountDTO(account),
    });
  };

  getAccountByIdHandler = async (
    request: FastifyRequest<{ Params: { accountId: Parameters<IWalletService["getAccountById"]>[0] } }>,
    reply: FastifyReply,
  ) => {
    const account = await this.walletService.getAccountById(request.params.accountId);

    if (!account) {
      return sendError({
        reply,
        statusCode: 404,
        message: "Account not found",
        error: "ACCOUNT_NOT_FOUND",
      });
    }

    return sendSuccess<TWalletAccountDTO>({
      reply,
      statusCode: 200,
      message: "Successfully fetched account",
      data: toAccountDTO(account),
    });
  };

  getUserAccountsHandler = async (
    request: FastifyRequest<{ Params: { userId: Parameters<IWalletService["getUserAccounts"]>[0] } }>,
    reply: FastifyReply,
  ) => {
    const accounts = await this.walletService.getUserAccounts(request.params.userId);
    return sendSuccess<TWalletAccountDTO[]>({
      reply,
      statusCode: 200,
      message: "Successfully fetched user accounts",
      data: accounts.map(toAccountDTO),
    });
  };

  getBalanceHandler = async (
    request: FastifyRequest<{ Params: { accountId: Parameters<IWalletService["getBalance"]>[0] } }>,
    reply: FastifyReply,
  ) => {
    const balance = await this.walletService.getBalance(request.params.accountId);
    return sendSuccess<{ accountId: TBankAccountId; balance: number }>({
      reply,
      statusCode: 200,
      message: "Successfully fetched balance",
      data: {
        accountId: request.params.accountId,
        balance,
      },
    });
  };

  transferHandler = async (
    request: FastifyRequest<{ Body: Parameters<IWalletService["transfer"]>[0] }>,
    reply: FastifyReply,
  ) => {
    const transaction = await this.walletService.transfer(request.body);
    return sendSuccess<TWalletTransactionDTO>({
      reply,
      statusCode: 201,
      message: "Successfully completed transfer",
      data: toTransactionDTO(transaction),
    });
  };

  listTransactionsHandler = async (
    request: FastifyRequest<{ Params: { userId: Parameters<IWalletService["listTransactions"]>[0] } }>,
    reply: FastifyReply,
  ) => {
    const transactions = await this.walletService.listTransactions(request.params.userId);
    return sendSuccess<TWalletTransactionDTO[]>({
      reply,
      statusCode: 200,
      message: "Successfully fetched transactions",
      data: toTransactionsDTO(transactions),
    });
  };

  queryTransactionsHandler = async (
    request: FastifyRequest<{
      Params: { userId: Parameters<IWalletService["queryTransactions"]>[1] };
      Querystring: Parameters<IWalletService["queryTransactions"]>[0];
    }>,
    reply: FastifyReply,
  ) => {
    const transactions = await this.walletService.queryTransactions(
      request.query,
      request.params.userId,
    );

    return sendSuccess<TWalletTransactionDTO[]>({
      reply,
      statusCode: 200,
      message: "Successfully queried transactions",
      data: toTransactionsDTO(transactions),
    });
  };

  getLedgerEntriesHandler = async (
    request: FastifyRequest<{ Params: { transactionId: Parameters<IWalletService["getLedgerEntries"]>[0] } }>,
    reply: FastifyReply,
  ) => {
    const entries = await this.walletService.getLedgerEntries(request.params.transactionId);
    return sendSuccess<TWalletLedgerDTO[]>({
      reply,
      statusCode: 200,
      message: "Successfully fetched ledger entries",
      data: toLedgerDTO(entries),
    });
  };
}

export const walletController = new WalletController();
