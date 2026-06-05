import type { TBankAccountNumber } from "@/types";

export interface ITransactionEvent {
  eventType: "transaction.created";
  transactionId: string;
  userId: string;
  senderAccountNumber: TBankAccountNumber;
  receiverAccountNumber: TBankAccountNumber;
  amount: string;
  senderName: string;
  receiverName: string;
  status: string;
  timestamp: string;
}

export interface IKafkaService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publishTransactionEvent(event: ITransactionEvent): Promise<void>;
}
