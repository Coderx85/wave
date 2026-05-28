import type { TUserId, TSessionId, TAccountId, TTokenId, TAccountsId, TTransactionId } from "@/types";

class IDService {
  public UserId(): TUserId {
    return `user_${crypto.randomUUID()}` as TUserId;
  };

  public SessionId(): TSessionId {
    return `session_${crypto.randomUUID()}` as TSessionId;
  };

  public AccountId(): TAccountId {
    return `account_${crypto.randomUUID()}` as TAccountId;
  };

  public TokenId(): TTokenId {
    return `token_${crypto.randomUUID()}` as TTokenId;
  };

  public TransactionId(): TTransactionId {
    return `transaction_${crypto.randomUUID()}` as TTransactionId;
  };

  public AccountsId(): TAccountsId {
    return `accounts_${crypto.randomUUID()}` as TAccountsId;
  };
};

export const ID = new IDService();