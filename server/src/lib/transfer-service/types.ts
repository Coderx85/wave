// Local constants matching tigerbeetle-node types.
// These replace the native `tigerbeetle-node` dependency.

export const AccountFlags = {
  linked: 1 << 0,
  debits_must_not_exceed_credits: 1 << 1,
  credits_must_not_exceed_debits: 1 << 2,
  history: 1 << 3,
  imports: 1 << 4,
} as const;

export const CreateAccountStatus = {
  ok: 0,
  linked_event_failed: 1,
  linked_event_chain_open: 2,
  imported_event_expected: 3,
  imported_event_unexpected: 4,
  timestamp_must_be_zero: 5,
  reserved_field: 6,
  reserved_flag: 7,
  id_must_not_be_zero: 8,
  id_already_exists: 9,
  flags_must_be_zero: 10,
  debits_pending_must_be_zero: 11,
  debits_posted_must_be_zero: 12,
  credits_pending_must_be_zero: 13,
  credits_posted_must_be_zero: 14,
  ledger_must_not_be_zero: 15,
  code_must_not_be_zero: 16,
  user_data_128_must_be_zero: 17,
  user_data_64_must_be_zero: 18,
  user_data_32_must_be_zero: 19,
  exists_with_different_flags: 20,
  exists_with_different_ledger: 21,
  exists_with_different_code: 22,
  exists_with_different_user_data_128: 23,
  exists_with_different_user_data_64: 24,
  exists_with_different_user_data_32: 25,
  exists_with_different_debits_pending: 26,
  exists_with_different_debits_posted: 27,
  exists_with_different_credits_pending: 28,
  exists_with_different_credits_posted: 29,
  pending_transfer_debits_must_not_exceed_credits: 30,
  pending_transfer_credits_must_not_exceed_debits: 31,
  overflows_debits_pending: 32,
  overflows_credits_pending: 33,
  overflows_debits_posted: 34,
  overflows_credits_posted: 35,
  overflows_debits: 36,
  overflows_credits: 37,
  overflows_timestamp: 38,
} as const;

// Alias — tigerbeetle-node uses `created` for the success status
export const CreateAccountStatusCreated = CreateAccountStatus.ok;

// Reverse lookup: status number → name string
export const CreateAccountStatusName: Record<number, string> = Object.fromEntries(
  Object.entries(CreateAccountStatus).map(([k, v]) => [v, k]),
);

export const CreateTransferStatus = {
  ok: 0,
  linked_event_failed: 1,
  linked_event_chain_open: 2,
  timestamp_must_be_zero: 3,
  reserved_field: 4,
  reserved_flag: 5,
  id_must_not_be_zero: 6,
  id_already_exists: 7,
  flags_must_be_zero: 8,
  debit_account_id_must_not_be_zero: 9,
  credit_account_id_must_not_be_zero: 10,
  debit_account_id_must_not_equal_credit_account_id: 11,
  ledger_debit_account_id_must_not_be_zero: 12,
  ledger_credit_account_id_must_not_be_zero: 13,
  debit_account_ledger_must_not_equal_credit_account_ledger: 14,
  pending_id_must_be_zero: 15,
  pending_transfer_must_timeout: 16,
  pending_transfer_must_be_pending: 17,
  pending_transfer_debit_account_id_must_match: 18,
  pending_transfer_credit_account_id_must_match: 19,
  pending_transfer_amount_must_match: 20,
  pending_transfer_must_be_linked: 21,
  debit_account_not_found: 22,
  credit_account_not_found: 23,
  debit_account_flags_must_not_equal_credit_account_flags: 24,
  transfer_pending_id_must_be_zero: 25,
  transfer_pending_id_must_not_be_zero: 26,
  overflows_debits_pending: 27,
  overflows_credits_pending: 28,
  overflows_debits_posted: 29,
  overflows_credits_posted: 30,
  overflows_debits: 31,
  overflows_credits: 32,
  overflows_timestamp: 33,
  imported_event_expected: 34,
  imported_event_unexpected: 35,
} as const;

// Alias — tigerbeetle-node uses `created` for the success status
export const CreateTransferStatusCreated = CreateTransferStatus.ok;

// Reverse lookup: status number → name string
export const CreateTransferStatusName: Record<number, string> = Object.fromEntries(
  Object.entries(CreateTransferStatus).map(([k, v]) => [v, k]),
);

export function createAccountId(): bigint {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return BigInt(
    "0x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join(""),
  );
}
