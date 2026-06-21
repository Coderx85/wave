import type { TBankAccountNumber, TUserId } from "@/types";

const TRANSFER_SERVICE_URL = process.env.TRANSFER_SERVICE_URL ?? "http://localhost:3001";

export interface TBCreateAccountRequest {
  id?: string;
  ledger: number;
  code: number;
  user_data_128?: string;
  user_data_64?: number;
  user_data_32?: number;
}

export interface TBCreateAccountResponse {
  id: string;
  ledger: number;
  code: number;
  debits_pending: string;
  debits_posted: string;
  credits_pending: string;
  credits_posted: string;
  user_data_128: string;
  user_data_64: number;
  user_data_32: number;
}

export interface TBCreateTransferRequest {
  id?: string;
  debit_account_id: string;
  credit_account_id: string;
  amount: string;
  ledger?: number;
  code?: number;
  user_data_128?: string;
  user_data_64?: number;
  user_data_32?: number;
  flags?: number;
}

export interface TBCreateTransferResponse {
  id: string;
  debit_account_id: string;
  credit_account_id: string;
  amount: string;
  ledger: number;
  code: number;
  pending_id: string;
  user_data_128: string;
  user_data_64: number;
  user_data_32: number;
}

export interface TBGetBalanceResponse {
  account_id: string;
  balance: string;
  debits_pending: string;
  debits_posted: string;
  credits_pending: string;
  credits_posted: string;
}

let _connected = false;
let _error: string | null = null;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${TRANSFER_SERVICE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null) as { error?: string } | null;
    throw new Error(`Transfer service error (${res.status}): ${body?.error ?? res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await request<{ status: string }>("/health");
    _connected = res.status === "ok";
    _error = null;
    return _connected;
  } catch (err: unknown) {
    _connected = false;
    _error = err instanceof Error ? err.message : String(err);
    return false;
  }
}

export async function createAccount(req: TBCreateAccountRequest): Promise<TBCreateAccountResponse> {
  return request<TBCreateAccountResponse>("/accounts", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function getAccount(id: string): Promise<TBCreateAccountResponse | null> {
  try {
    return await request<TBCreateAccountResponse>(`/accounts/${id}`);
  } catch {
    return null;
  }
}

export async function getBalance(id: string): Promise<TBGetBalanceResponse | null> {
  try {
    return await request<TBGetBalanceResponse>(`/accounts/${id}/balance`);
  } catch {
    return null;
  }
}

export async function createTransfer(req: TBCreateTransferRequest): Promise<TBCreateTransferResponse> {
  return request<TBCreateTransferResponse>("/transfers", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function getTransfer(id: string): Promise<TBCreateTransferResponse | null> {
  try {
    return await request<TBCreateTransferResponse>(`/transfers/${id}`);
  } catch {
    return null;
  }
}

export const TransferServiceClient = {
  get connected() { return _connected; },
  get error() { return _error; },
  healthCheck,
  createAccount,
  getAccount,
  getBalance,
  createTransfer,
  getTransfer,
};
