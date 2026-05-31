import nodemailer from "nodemailer";
import type { IEmailSender } from "./email-sender.interface";
import { Logger } from "@/lib/logger";

const logger = Logger("EmailSender");

export class EmailSender implements IEmailSender {
  private transporter: nodemailer.Transporter | null = null;
  private config: {
    host: string;
    port: number;
    user: string;
    password: string;
    from: string;
  };

  constructor(config?: {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    from?: string;
  }) {
    this.config = {
      host: config?.host || process.env.EMAIL_HOST || "localhost",
      port: config?.port || Number(process.env.EMAIL_PORT || 587),
      user: config?.user || process.env.EMAIL_USER || "",
      password: config?.password || process.env.EMAIL_PASSWORD || "",
      from: config?.from || process.env.EMAIL_FROM || "noreply@wallet.app",
    };
  }

  async initialize(): Promise<void> {
    try {
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.port === 465,
        auth: {
          user: this.config.user,
          pass: this.config.password,
        },
      });

      // Verify connection
      await this.transporter.verify();
      logger.info("Email service initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize email service", error);
      throw error;
    }
  }

  async sendTransactionNotification(
    toEmail: string,
    senderName: string,
    receiverName: string,
    amount: string,
    transactionId: string
  ): Promise<void> {
    if (!this.transporter) {
      throw new Error("Email service not initialized. Call initialize() first.");
    }

    const subject = `Transaction Notification - ${transactionId}`;
    const htmlContent = this.getTransactionEmailTemplate(
      senderName,
      receiverName,
      amount,
      transactionId
    );

    try {
      await this.transporter.sendMail({
        from: this.config.from,
        to: toEmail,
        subject,
        html: htmlContent,
        text: `Transaction from ${senderName} to ${receiverName} for amount ${amount}. ID: ${transactionId}`,
      });

      logger.info(`Email sent to ${toEmail} for transaction ${transactionId}`);
    } catch (error) {
      logger.error(`Failed to send email to ${toEmail}`, error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.transporter) {
      await this.transporter.close();
      logger.info("Email service connection closed");
    }
  }

  private getTransactionEmailTemplate(
    senderName: string,
    receiverName: string,
    amount: string,
    transactionId: string
  ): string {
    return `
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f5f5f5;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: white;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header {
              border-bottom: 2px solid #007bff;
              padding-bottom: 20px;
              margin-bottom: 20px;
            }
            .header h1 {
              color: #007bff;
              margin: 0;
            }
            .transaction-details {
              background-color: #f9f9f9;
              padding: 15px;
              border-radius: 4px;
              margin: 20px 0;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #eee;
            }
            .detail-row:last-child {
              border-bottom: none;
            }
            .label {
              font-weight: bold;
              color: #333;
            }
            .value {
              color: #666;
            }
            .footer {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              font-size: 12px;
              color: #999;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Transaction Notification</h1>
            </div>
            
            <p>Dear User,</p>
            <p>A transaction has been successfully processed. Here are the details:</p>
            
            <div class="transaction-details">
              <div class="detail-row">
                <span class="label">From:</span>
                <span class="value">${senderName}</span>
              </div>
              <div class="detail-row">
                <span class="label">To:</span>
                <span class="value">${receiverName}</span>
              </div>
              <div class="detail-row">
                <span class="label">Amount:</span>
                <span class="value">${amount}</span>
              </div>
              <div class="detail-row">
                <span class="label">Transaction ID:</span>
                <span class="value">${transactionId}</span>
              </div>
            </div>
            
            <p>If you have any questions about this transaction, please contact our support team.</p>
            
            <div class="footer">
              <p>This is an automated notification. Please do not reply to this email.</p>
              <p>&copy; 2024 Wallet Service. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
