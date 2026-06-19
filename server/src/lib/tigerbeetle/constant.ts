import { TB } from "./client";

export const TIGER_BEETLE_CLUSTER_ID = 1;

export const CURRENCY_CODE = {
  INR: 356, 
  USD: 840,
};

export const WALLET_LEDGER_CODE = 85;

// System vault account — source of deposited funds in TigerBeetle.
// Credits (deposits) flow from vault → user account.
export const VAULT_ACCOUNT_ID = 999_999_999n;
export const VAULT_ACCOUNT_CODE = CURRENCY_CODE.INR;