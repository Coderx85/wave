import { z } from "zod";
import { successResponseSchema, errorResponseSchema } from "@/lib/response";

export const walletAccountDTO = z.object({
  name: z.string(),
  userId: z.string(),
  accountNumber: z.string(),
  balance: z.number(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
});

export const walletTransactionDTO = z.object({
  id: z.string(),
  userId: z.string(),
  senderAccountNumber: z.string(),
  senderName: z.string(),
  receiverAccountNumber: z.string(),
  receiverName: z.string(),
  amount: z.string(),
  status: z.enum(["pending", "success", "failed"]),
  createdAt: z.string(),
  updatedAt: z.string().nullable().optional(),
});

export const walletLedgerDTO = z.object({
  id: z.string(),
  transactionId: z.string(),
  amount: z.string(),
  entryType: z.enum(["debit", "credit"]),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
});

export const createAccountBodySchema = z.object({
  name: z.string(),
  userId: z.string(),
  accountNumber: z.union([z.string(), z.number()]).transform(String),
});

export const depositBodySchema = z.object({
  userId: z.string(),
  accountNumber: z.string(),
  amount: z.number().positive(),
});

export const depositResponseSchema = {
  body: depositBodySchema,
  response: {
    200: successResponseSchema(walletAccountDTO),
    400: errorResponseSchema,
  },
};

export const transferBodySchema = z.object({
  userId: z.string(),
  senderAccountNumber: z.union([z.string(), z.number()]).transform(String),
  senderName: z.string(),
  receiverAccountNumber: z.union([z.string(), z.number()]).transform(String),
  receiverName: z.string(),
  amount: z.number(),
});

export const accountNumberParamsSchema = z.object({
  accountNumber: z.string(),
});

export const accountIdParamsSchema = z.object({
  accountId: z.string(),
});

export const userIdParamsSchema = z.object({
  userId: z.string(),
});

export const transactionIdParamsSchema = z.object({
  transactionId: z.string(),
});

export const transactionQuerySchema = z.object({
  status: z.enum(["success", "failed"]),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const createAccountResponseSchema = {
  body: createAccountBodySchema,
  response: {
    201: successResponseSchema(walletAccountDTO),
    400: errorResponseSchema,
  },
};

export const getAccountByNumberResponseSchema = {
  params: accountNumberParamsSchema,
  response: {
    200: successResponseSchema(walletAccountDTO),
    400: errorResponseSchema,
    404: errorResponseSchema,
  },
};

export const getAccountResponseSchema = {
  params: accountIdParamsSchema,
  response: {
    200: successResponseSchema(walletAccountDTO),
    400: errorResponseSchema,
    404: errorResponseSchema,
  },
};

export const getUserAccountsResponseSchema = {
  params: userIdParamsSchema,
  response: {
    200: successResponseSchema(z.array(walletAccountDTO)),
    400: errorResponseSchema,
  },
};

export const getBalanceResponseSchema = {
  params: accountIdParamsSchema,
  response: {
    200: successResponseSchema(
      z.object({
        accountId: z.string(),
        balance: z.number(),
      }),
    ),
    400: errorResponseSchema,
  },
};

export const transferResponseSchema = {
  body: transferBodySchema,
  response: {
    201: successResponseSchema(walletTransactionDTO),
    400: errorResponseSchema,
  },
};

export const listTransactionsResponseSchema = {
  params: userIdParamsSchema,
  response: {
    200: successResponseSchema(z.array(walletTransactionDTO)),
    400: errorResponseSchema,
  },
};

export const queryTransactionsResponseSchema = {
  params: userIdParamsSchema,
  querystring: transactionQuerySchema,
  response: {
    200: successResponseSchema(z.array(walletTransactionDTO)),
    400: errorResponseSchema,
  },
};

export const getLedgerEntriesResponseSchema = {
  params: transactionIdParamsSchema,
  response: {
    200: successResponseSchema(z.array(walletLedgerDTO)),
    400: errorResponseSchema,
  },
};
