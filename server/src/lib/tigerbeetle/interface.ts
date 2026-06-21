export class TigerBeetleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TigerBeetleError";
  }

  insuffientFunds() {
    return new TigerBeetleError("Insufficient funds in the source account.");
  }
}

// ── Types that mirror tigerbeetle-node ──────────────────────────────────────────

export interface TBAccount {
  id: bigint;
  flags: number;
  ledger: number;
  code: number;
  timestamp: bigint;
  user_data_128: bigint;
  user_data_64: bigint;
  user_data_32: number;
  debits_pending: bigint;
  credits_pending: bigint;
  debits_posted: bigint;
  credits_posted: bigint;
  reserved: number;
}

export interface TBTransfer {
  id: bigint;
  debit_account_id: bigint;
  credit_account_id: bigint;
  amount: bigint;
  pending_id: bigint;
  user_data_128: bigint;
  user_data_64: bigint;
  user_data_32: number;
  ledger: number;
  code: number;
  timestamp: bigint;
  reserved: number;
}

export type TBAccountID = bigint;
export type TBTransferID = bigint;

export interface ITigerBeetle {
  createAccount(account: TBAccount): Promise<TBAccount>;
  getAccount(accountNumber: TBAccountID): Promise<TBAccount | null>;
  transferFunds(
    sourceAccountNumber: TBAccountID,
    destinationAccountNumber: TBAccountID,
    amount: bigint,
  ): Promise<void>;
  getTransaction(transactionId: TBTransferID): Promise<TBTransfer | null>;
  createTransfer(transfer: TBTransfer): Promise<TBTransfer>;
}
