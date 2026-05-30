import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import * as schema from "@/schemas/wallet.schema";
import { walletController } from "./handler";
import { walletApiRoutes } from "./definition";

export default async function walletRoute(fastify: FastifyInstance) {
  const api = fastify.withTypeProvider<ZodTypeProvider>();

  api.post(walletApiRoutes.createAccount, {
    schema: schema.createAccountResponseSchema,
    handler: walletController.createAccountHandler,
  });

  api.get(walletApiRoutes.getAccountById, {
    schema: schema.getAccountResponseSchema,
    handler: walletController.getAccountByIdHandler,
  });

  api.get(walletApiRoutes.getUserAccounts, {
    schema: schema.getUserAccountsResponseSchema,
    handler: walletController.getUserAccountsHandler,
  });

  api.get(walletApiRoutes.getBalance, {
    schema: schema.getBalanceResponseSchema,
    handler: walletController.getBalanceHandler,
  });

  api.post(walletApiRoutes.transfer, {
    schema: schema.transferResponseSchema,
    handler: walletController.transferHandler,
  });

  api.get(walletApiRoutes.listTransactions, {
    schema: schema.listTransactionsResponseSchema,
    handler: walletController.listTransactionsHandler,
  });

  api.get(walletApiRoutes.queryTransactions, {
    schema: schema.queryTransactionsResponseSchema,
    handler: walletController.queryTransactionsHandler,
  });

  api.get(walletApiRoutes.getLedgerEntries, {
    schema: schema.getLedgerEntriesResponseSchema,
    handler: walletController.getLedgerEntriesHandler,
  });
}
