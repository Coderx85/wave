import type { FastifyReply, FastifyRequest } from "fastify";
import type { StandardResponse } from "@/lib/response";
import type { IAccount, ILedger, ITransaction, TTransactionQuery } from "../service/internal";
import type { CreateAccountInput, TransferInput, DepositInput } from "../service";
import type { TBankAccountNumber, TTransactionId, TUserId } from "@/types";
import type { fromNodeHeaders } from "better-auth/node";

export interface TWalletAccountDTO extends IAccount {}

export interface TWalletTransactionDTO extends Omit<ITransaction, "amount" | "createdAt" | "updatedAt"> {
  amount: string;
  createdAt: string;
  updatedAt?: string | null;
}

export interface TWalletLedgerDTO extends Omit<ILedger, "amount" | "createdAt" | "updatedAt"> {
  amount: string;
  createdAt: string;
  updatedAt: string | null;
}

export type TCreateAccountResponse = StandardResponse<TWalletAccountDTO>;
export type TGetAccountResponse = StandardResponse<TWalletAccountDTO>;
export type TGetUserAccountsResponse = StandardResponse<TWalletAccountDTO[]>;
export type TGetBalanceResponse = StandardResponse<{ accountNumber: TBankAccountNumber; balance: number }>;
export type TDepositResponse = StandardResponse<TWalletAccountDTO>;
export type TTransferResponse = StandardResponse<TWalletTransactionDTO>;
export type TListTransactionsResponse = StandardResponse<TWalletTransactionDTO[]>;
export type TQueryTransactionsResponse = StandardResponse<TWalletTransactionDTO[]>;
export type TGetLedgerEntriesResponse = StandardResponse<TWalletLedgerDTO[]>;

export interface IWalletController {
  createAccountHandler(
    request: FastifyRequest<{ Body: CreateAccountInput }>,
    reply: FastifyReply,
  ): Promise<TCreateAccountResponse | void>;
  getAccountByNumberHandler(
    request: FastifyRequest<{ Params: { accountNumber: TBankAccountNumber }, Headers: ReturnType<typeof fromNodeHeaders> }>,
    reply: FastifyReply,
  ): Promise<TGetAccountResponse | void>;
  getAccountByIdHandler(
    request: FastifyRequest<{ Params: { accountId: TBankAccountNumber }, Headers: ReturnType<typeof fromNodeHeaders> }>,
    reply: FastifyReply,
  ): Promise<TGetAccountResponse | void>;
  getUserAccountsHandler(
    request: FastifyRequest<{ Headers: ReturnType<typeof fromNodeHeaders> }>,
    reply: FastifyReply,
  ): Promise<TGetUserAccountsResponse | void>;
  getBalanceHandler(
    request: FastifyRequest<{ Params: { accountId: TBankAccountNumber } }>,
    reply: FastifyReply,
  ): Promise<TGetBalanceResponse | void>;
  depositHandler(
    request: FastifyRequest<{ Body: DepositInput, Headers: ReturnType<typeof fromNodeHeaders> }>,
    reply: FastifyReply,
  ): Promise<TDepositResponse | void>;
  transferHandler(
    request: FastifyRequest<{ Body: TransferInput, Headers: ReturnType<typeof fromNodeHeaders> }>,
    reply: FastifyReply,
  ): Promise<TTransferResponse | void>;
  listTransactionsHandler(
    request: FastifyRequest<{ Headers: ReturnType<typeof fromNodeHeaders> }>,
    reply: FastifyReply,
  ): Promise<TListTransactionsResponse | void>;
  queryTransactionsHandler(
    request: FastifyRequest<{
      Params: { userId: TUserId };
      Querystring: TTransactionQuery;
    }>,
    reply: FastifyReply,
  ): Promise<TQueryTransactionsResponse | void>;
  getLedgerEntriesHandler(
    request: FastifyRequest<{ Params: { transactionId: TTransactionId } }>,
    reply: FastifyReply,
  ): Promise<TGetLedgerEntriesResponse | void>;
}
