import { TB } from "./client";

export class TigerBeetleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TigerBeetleError";
  };

  // You can add additional properties or methods if needed
  insuffientFunds() {
    return new TigerBeetleError("Insufficient funds in the source account.");
  };
}

export interface ITigerBeetle {
  createAccount(account: TB.Account): Promise<TB.Account>;
  getAccount(accountNumber: TB.AccountID): Promise<TB.Account | null>;
  transferFunds(
    sourceAccountNumber: TB.AccountID,
    destinationAccountNumber: TB.AccountID,
    amount: bigint,
  ): Promise<void>;
  getTransaction(transactionId: TB.TransferID): Promise<TB.Transfer | null>;
  createTransfer(transfer: TB.Transfer): Promise<TB.Transfer>;
};