export interface ITransactionEvent {
  eventType: "transaction.created";
  transactionId: string;
  userId: string;
  senderAccountId: string;
  receiverAccountId: string;
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
