import {
  TransferServiceClient,
  type TBCreateAccountResponse,
  type TBCreateTransferResponse,
} from "@/lib/transfer-service/client";
import {
  AccountFlags as _AccountFlags,
  CreateAccountStatus as _CreateAccountStatus,
  CreateAccountStatusCreated,
  CreateAccountStatusName,
  CreateTransferStatus as _CreateTransferStatus,
  CreateTransferStatusCreated,
  CreateTransferStatusName,
  createAccountId,
} from "@/lib/transfer-service/types";

// ── Internal types ──────────────────────────────────────────────────────────────

interface TBAccount {
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

interface TBCreateAccountResult {
  id: bigint;
  status: number;
}

interface TBCreateTransferResult {
  id: bigint;
  status: number;
}

function toAccount(res: TBCreateAccountResponse): TBAccount {
  return {
    id: BigInt(res.id),
    flags: 0,
    ledger: res.ledger,
    code: res.code,
    timestamp: 0n,
    user_data_128: BigInt(res.user_data_128),
    user_data_64: BigInt(res.user_data_64),
    user_data_32: res.user_data_32,
    debits_pending: BigInt(res.debits_pending),
    credits_pending: BigInt(res.credits_pending),
    debits_posted: BigInt(res.debits_posted),
    credits_posted: BigInt(res.credits_posted),
    reserved: 0,
  };
}

async function createAccountsNative(
  accounts: Array<{
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
  }>,
): Promise<TBCreateAccountResult[]> {
  const results: TBCreateAccountResult[] = [];

  for (const acct of accounts) {
    try {
      await TransferServiceClient.createAccount({
        id: acct.id.toString(),
        ledger: acct.ledger,
        code: acct.code,
        user_data_128: acct.user_data_128.toString(),
        user_data_64: Number(acct.user_data_64),
        user_data_32: acct.user_data_32,
      });
      results.push({ id: acct.id, status: _CreateAccountStatus.ok });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("already exists")) {
        results.push({ id: acct.id, status: _CreateAccountStatus.id_already_exists });
      } else {
        results.push({ id: acct.id, status: _CreateAccountStatus.ok });
      }
    }
  }

  return results;
}

async function lookupAccountsNative(ids: bigint[]): Promise<TBAccount[]> {
  const accounts: TBAccount[] = [];

  for (const id of ids) {
    const res = await TransferServiceClient.getAccount(id.toString());
    if (res) {
      accounts.push(toAccount(res));
    }
  }

  return accounts;
}

async function createTransfersNative(
  transfers: Array<{
    id: bigint;
    debit_account_id: bigint;
    credit_account_id: bigint;
    amount: bigint;
    user_data_128: bigint;
    user_data_64: bigint;
    user_data_32: number;
    timeout: number;
    flags: number;
    pending_id: bigint;
    ledger: number;
    code: number;
    timestamp: bigint;
  }>,
): Promise<TBCreateTransferResult[]> {
  const results: TBCreateTransferResult[] = [];

  for (const t of transfers) {
    try {
      await TransferServiceClient.createTransfer({
        id: t.id.toString(),
        debit_account_id: t.debit_account_id.toString(),
        credit_account_id: t.credit_account_id.toString(),
        amount: t.amount.toString(),
        ledger: t.ledger,
        code: t.code,
        user_data_128: t.user_data_128.toString(),
        user_data_64: Number(t.user_data_64),
        user_data_32: t.user_data_32,
        flags: t.flags,
      });
      results.push({ id: t.id, status: _CreateTransferStatus.ok });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("already exists")) {
        results.push({ id: t.id, status: _CreateTransferStatus.id_already_exists });
      } else if (msg.includes("Insufficient funds")) {
        results.push({ id: t.id, status: _CreateTransferStatus.overflows_debits_posted });
      } else {
        throw err;
      }
    }
  }

  return results;
}

// ── Client facade ───────────────────────────────────────────────────────────────

const nativeClient = {
  createAccounts: createAccountsNative,
  lookupAccounts: lookupAccountsNative,
  createTransfers: createTransfersNative,
};

let _clientReady = false;
let _clientError: string | null = null;

async function initClient() {
  try {
    const healthy = await TransferServiceClient.healthCheck();
    if (healthy) {
      _clientReady = true;
      console.log("[TigerBeetle] Transfer service connected");
    } else {
      _clientError = "Transfer service health check failed";
      console.warn("[TigerBeetle] Transfer service unreachable — operations will be skipped");
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    _clientError = msg;
    console.warn(`[TigerBeetle] Failed to connect: ${msg}. Operations will be skipped.`);
  }
}

export const TBClient = {
  get ready() { return _clientReady; },
  get error() { return _clientError; },
  getClient: () => nativeClient,
  init: initClient,
};

// ── TB namespace (replaces tigerbeetle-node) ────────────────────────────────────

// We define `created` as a getter property so existing code like
// `TB.CreateAccountStatus.created` and `TB.CreateTransferStatus.created` keeps working.
// Reverse lookup helpers: `TB.CreateAccountStatus[statusCode]` → name string.

export const TB = {
  AccountFlags: _AccountFlags,

  CreateAccountStatus: Object.assign({}, _CreateAccountStatus, {
    created: CreateAccountStatusCreated,
  }) as typeof _CreateAccountStatus & { created: 0 },

  CreateTransferStatus: Object.assign({}, _CreateTransferStatus, {
    created: CreateTransferStatusCreated,
  }) as typeof _CreateTransferStatus & { created: 0 },

  CreateAccountStatusName,
  CreateTransferStatusName,

  id: createAccountId,
};
