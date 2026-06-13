import type { FastifyReply, FastifyRequest } from "fastify";
import { sendError, sendSuccess } from "@/lib/response";
import {
  type IWalletController,
  type TWalletAccountDTO,
  type TWalletLedgerDTO,
  type TWalletTransactionDTO,
} from "./wallet.controller.interface";
import type { TBankAccountNumber } from "@/types";
import type { IWalletService } from "../service";
import { WalletService } from "../service";

const toAccountDTO = ({ createdAt, updatedAt, accountNumber, ...rest }: Awaited<ReturnType<IWalletService["createAccount"]>>): TWalletAccountDTO => ({
  ...rest,
  accountNumber: Number(accountNumber),
  createdAt: createdAt.toISOString(),
  updatedAt: updatedAt ? updatedAt.toISOString() : null,
});

const toTransactionDTO = (transaction: Awaited<ReturnType<IWalletService["transfer"]>>): TWalletTransactionDTO => ({
  ...transaction,
  amount: (Number(transaction.amount) / 100).toFixed(2),
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
    try {
      const account = await this.walletService.createAccount(request.body);
      sendSuccess<TWalletAccountDTO>({
        reply,
        statusCode: 201,
        message: "SUCCESSFULLY_CREATED_ACCOUNT",
        data: toAccountDTO(account),
      });
    } catch (error) {
      sendError({
        reply,
        statusCode: 500,
        message: "FAILED_TO_CREATE_ACCOUNT",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  getAccountByNumberHandler = async (
    request: FastifyRequest<{ Params: { accountNumber: TBankAccountNumber } }>,
    reply: FastifyReply,
  ) => {
    const account = await this.walletService.getAccountByAccountNumber(request.params.accountNumber);

    if (!account) {
      sendError({
        reply,
        statusCode: 404,
        message: "ACCOUNT_NOT_FOUND",
        error: "ACCOUNT_NOT_FOUND",
      });
      return;
    }

    sendSuccess<TWalletAccountDTO>({
      reply,
      statusCode: 200,
      message: "Successfully fetched account",
      data: toAccountDTO(account),
    });
  };

  getAccountByIdHandler = async (
    request: FastifyRequest<{ Params: { accountId: TBankAccountNumber } }>,
    reply: FastifyReply,
  ) => {
    const account = await this.walletService.getAccountById(request.params.accountId);

    if (!account) {
      sendError({
        reply,
        statusCode: 404,
        message: "ACCOUNT_NOT_FOUND",
        error: "ACCOUNT_NOT_FOUND",
      });
      return;
    }

    sendSuccess<TWalletAccountDTO>({
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
    sendSuccess<TWalletAccountDTO[]>({
      reply,
      statusCode: 200,
      message: "Successfully fetched user accounts",
      data: accounts.map(toAccountDTO),
    });
  };

  getBalanceHandler = async (
    request: FastifyRequest<{ Params: { accountId: TBankAccountNumber } }>,
    reply: FastifyReply,
  ) => {
    const balance = await this.walletService.getBalance(request.params.accountId);
    sendSuccess<{ accountNumber: number; balance: number }>({
      reply,
      statusCode: 200,
      message: "SUCCESSFULLY_FETCHED_BALANCE",
      data: {
        accountNumber: Number(request.params.accountId),
        balance,
      },
    });
  };

  depositHandler = async (
    request: FastifyRequest<{ Body: Parameters<IWalletService["deposit"]>[0] }>,
    reply: FastifyReply,
  ) => {
    const account = await this.walletService.deposit(request.body);
    sendSuccess<TWalletAccountDTO>({
      reply,
      statusCode: 200,
      message: "Successfully deposited funds",
      data: toAccountDTO(account),
    });
  };

  transferHandler = async (
    request: FastifyRequest<{ Body: Parameters<IWalletService["transfer"]>[0] }>,
    reply: FastifyReply,
  ) => {
    const transaction = await this.walletService.transfer(request.body);
    sendSuccess<TWalletTransactionDTO>({
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
    sendSuccess<TWalletTransactionDTO[]>({
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

    sendSuccess<TWalletTransactionDTO[]>({
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
    sendSuccess<TWalletLedgerDTO[]>({
      reply,
      statusCode: 200,
      message: "Successfully fetched ledger entries",
      data: toLedgerDTO(entries),
    });
  };
}

export const walletController = new WalletController();
