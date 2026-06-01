export interface IEmailSender {
  initialize(): Promise<void>;
  sendTransactionNotification(
    toEmail: string,
    senderName: string,
    receiverName: string,
    amount: string,
    transactionId: string
  ): Promise<void>;
  close(): Promise<void>;
}
