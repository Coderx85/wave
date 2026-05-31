import { describe, it, expect, beforeEach, vi } from "vitest";
import { EmailSender } from "../email-sender";

// Use vi.hoisted to share mocks between factory and tests
const { mockTransporter, mockCreateTransport } = vi.hoisted(() => {
  const mockTransporter = {
    verify: vi.fn(),
    sendMail: vi.fn(),
    close: vi.fn(),
  };

  const mockCreateTransport = vi.fn(() => mockTransporter);

  return {
    mockTransporter,
    mockCreateTransport,
  };
});

vi.mock("nodemailer", () => ({
  default: {
    createTransport: mockCreateTransport,
  },
}));

vi.mock("@/lib/logger", () => ({
  Logger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

import nodemailer from "nodemailer";

describe("EmailSender", () => {
  let emailSender: EmailSender;

  const defaultConfig = {
    host: "smtp.example.com",
    port: 587,
    user: "test@example.com",
    password: "password123",
    from: "noreply@wallet.app",
  };

  beforeEach(() => {
    mockTransporter.verify.mockReset();
    mockTransporter.sendMail.mockReset();
    mockTransporter.close.mockReset();
    mockCreateTransport.mockReset();
    mockCreateTransport.mockReturnValue(mockTransporter);
  });

  describe("constructor", () => {
    it("should initialize with default environment variables", () => {
      process.env.EMAIL_HOST = "env-host.com";
      process.env.EMAIL_PORT = "465";
      process.env.EMAIL_USER = "env-user@example.com";
      process.env.EMAIL_PASSWORD = "env-password";
      process.env.EMAIL_FROM = "env-from@example.com";

      emailSender = new EmailSender();

      expect(emailSender["config"].host).toBe("env-host.com");
      expect(emailSender["config"].port).toBe(465);
      expect(emailSender["config"].user).toBe("env-user@example.com");
      expect(emailSender["config"].password).toBe("env-password");
      expect(emailSender["config"].from).toBe("env-from@example.com");
    });

    it("should override with provided config values", () => {
      emailSender = new EmailSender(defaultConfig);

      expect(emailSender["config"].host).toBe("smtp.example.com");
      expect(emailSender["config"].port).toBe(587);
      expect(emailSender["config"].user).toBe("test@example.com");
      expect(emailSender["config"].password).toBe("password123");
      expect(emailSender["config"].from).toBe("noreply@wallet.app");
    });

    it("should use partial config override with fallback to env", () => {
      process.env.EMAIL_HOST = "env-host.com";
      process.env.EMAIL_PORT = "587";

      emailSender = new EmailSender({ host: "custom-host.com" });

      expect(emailSender["config"].host).toBe("custom-host.com");
      expect(emailSender["config"].port).toBe(587);
    });

    it("should default to localhost if no config or env provided", () => {
      delete process.env.EMAIL_HOST;
      delete process.env.EMAIL_PORT;
      delete process.env.EMAIL_USER;
      delete process.env.EMAIL_PASSWORD;
      delete process.env.EMAIL_FROM;

      emailSender = new EmailSender();

      expect(emailSender["config"].host).toBe("localhost");
      expect(emailSender["config"].port).toBe(587);
      expect(emailSender["config"].from).toBe("noreply@wallet.app");
    });

    it("should initialize transporter as null", () => {
      emailSender = new EmailSender(defaultConfig);

      expect(emailSender["transporter"]).toBeNull();
    });
  });

  describe("initialize()", () => {
    beforeEach(() => {
      emailSender = new EmailSender(defaultConfig);
    });

    it("should create transporter with correct config", async () => {
      mockTransporter.verify.mockResolvedValueOnce(true);

      await emailSender.initialize();

      expect(mockCreateTransport).toHaveBeenCalledWith({
        host: "smtp.example.com",
        port: 587,
        secure: false,
        auth: {
          user: "test@example.com",
          pass: "password123",
        },
      });
    });

    it("should create transporter with secure=true for port 465", async () => {
      emailSender = new EmailSender({
        ...defaultConfig,
        port: 465,
      });
      mockTransporter.verify.mockResolvedValueOnce(true);

      await emailSender.initialize();

      expect(mockCreateTransport).toHaveBeenCalledWith({
        host: "smtp.example.com",
        port: 465,
        secure: true,
        auth: {
          user: "test@example.com",
          pass: "password123",
        },
      });
    });

    it("should verify connection after creating transporter", async () => {
      mockTransporter.verify.mockResolvedValueOnce(true);

      await emailSender.initialize();

      expect(mockTransporter.verify).toHaveBeenCalledTimes(1);
    });

    it("should store transporter on successful initialization", async () => {
      mockTransporter.verify.mockResolvedValueOnce(true);

      await emailSender.initialize();

      expect(emailSender["transporter"]).toBe(mockTransporter);
    });

    it("should throw error when verify fails", async () => {
      const error = new Error("SMTP connection failed");
      mockTransporter.verify.mockRejectedValueOnce(error);

      await expect(emailSender.initialize()).rejects.toThrow(
        "SMTP connection failed"
      );
    });

    it("should throw error when createTransport fails", async () => {
      const error = new Error("Invalid transport config");
      mockCreateTransport.mockImplementationOnce(() => {
        throw error;
      });

      await expect(emailSender.initialize()).rejects.toThrow(
        "Invalid transport config"
      );
    });

    it("should throw error when verify connection fails", async () => {
      mockTransporter.verify.mockRejectedValueOnce(new Error("Connection failed"));

      await expect(emailSender.initialize()).rejects.toThrow(
        "Connection failed"
      );
    });
  });

  describe("sendTransactionNotification()", () => {
    beforeEach(async () => {
      emailSender = new EmailSender(defaultConfig);
      mockTransporter.verify.mockResolvedValueOnce(true);
      await emailSender.initialize();
    });

    it("should throw error if not initialized", async () => {
      emailSender = new EmailSender(defaultConfig);

      await expect(
        emailSender.sendTransactionNotification(
          "user@example.com",
          "Alice",
          "Bob",
          "$1000",
          "tx-123"
        )
      ).rejects.toThrow("Email service not initialized. Call initialize() first.");
    });

    it("should send email with correct parameters", async () => {
      mockTransporter.sendMail.mockResolvedValueOnce({ messageId: "msg-123" });

      await emailSender.sendTransactionNotification(
        "user@example.com",
        "Alice",
        "Bob",
        "$1000",
        "tx-123"
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.to).toBe("user@example.com");
      expect(mailOptions.from).toBe("noreply@wallet.app");
      expect(mailOptions.subject).toBe("Transaction Notification - tx-123");
    });

    it("should include transaction details in email HTML", async () => {
      mockTransporter.sendMail.mockResolvedValueOnce({ messageId: "msg-123" });

      await emailSender.sendTransactionNotification(
        "user@example.com",
        "Alice",
        "Bob",
        "$1000",
        "tx-123"
      );

      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.html).toContain("Alice");
      expect(mailOptions.html).toContain("Bob");
      expect(mailOptions.html).toContain("$1000");
      expect(mailOptions.html).toContain("tx-123");
    });

    it("should include transaction details in email text", async () => {
      mockTransporter.sendMail.mockResolvedValueOnce({ messageId: "msg-123" });

      await emailSender.sendTransactionNotification(
        "user@example.com",
        "Alice",
        "Bob",
        "$1000",
        "tx-123"
      );

      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.text).toContain("Transaction from Alice to Bob");
      expect(mailOptions.text).toContain("amount $1000");
      expect(mailOptions.text).toContain("ID: tx-123");
    });

    it("should include correct HTML format with styles", async () => {
      mockTransporter.sendMail.mockResolvedValueOnce({ messageId: "msg-123" });

      await emailSender.sendTransactionNotification(
        "user@example.com",
        "Alice",
        "Bob",
        "$1000",
        "tx-123"
      );

      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.html).toContain("<html>");
      expect(mailOptions.html).toContain("<style>");
      expect(mailOptions.html).toContain("Transaction Notification");
      expect(mailOptions.html).toContain("transaction-details");
    });

    it("should use correct from address from config", async () => {
      emailSender = new EmailSender({
        ...defaultConfig,
        from: "custom-from@example.com",
      });
      mockTransporter.verify.mockResolvedValueOnce(true);
      await emailSender.initialize();
      mockTransporter.sendMail.mockResolvedValueOnce({ messageId: "msg-123" });

      await emailSender.sendTransactionNotification(
        "user@example.com",
        "Alice",
        "Bob",
        "$1000",
        "tx-123"
      );

      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.from).toBe("custom-from@example.com");
    });

    it("should throw error if sendMail fails", async () => {
      const error = new Error("SMTP send failed");
      mockTransporter.sendMail.mockRejectedValueOnce(error);

      await expect(
        emailSender.sendTransactionNotification(
          "user@example.com",
          "Alice",
          "Bob",
          "$1000",
          "tx-123"
        )
      ).rejects.toThrow("SMTP send failed");
    });

    it("should handle special characters in transaction details", async () => {
      mockTransporter.sendMail.mockResolvedValueOnce({ messageId: "msg-123" });

      await emailSender.sendTransactionNotification(
        "user@example.com",
        "Alice & Co.",
        "Bob's Account",
        "$1,000.50",
        "tx-2024-01-01-123"
      );

      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.html).toContain("Alice & Co.");
      expect(mailOptions.html).toContain("Bob's Account");
      expect(mailOptions.html).toContain("$1,000.50");
      expect(mailOptions.html).toContain("tx-2024-01-01-123");
    });

    it("should create correct subject with transaction ID", async () => {
      mockTransporter.sendMail.mockResolvedValueOnce({ messageId: "msg-123" });

      await emailSender.sendTransactionNotification(
        "user@example.com",
        "Alice",
        "Bob",
        "$1000",
        "tx-abc-def-123"
      );

      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.subject).toBe("Transaction Notification - tx-abc-def-123");
    });

    it("should send email successfully with all required fields", async () => {
      mockTransporter.sendMail.mockResolvedValueOnce({ messageId: "msg-123" });

      const result = await emailSender.sendTransactionNotification(
        "recipient@example.com",
        "John Doe",
        "Jane Smith",
        "$5000",
        "TXN-12345"
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });
  });

  describe("close()", () => {
    beforeEach(async () => {
      emailSender = new EmailSender(defaultConfig);
      mockTransporter.verify.mockResolvedValueOnce(true);
      await emailSender.initialize();
    });

    it("should close transporter connection", async () => {
      mockTransporter.close.mockResolvedValueOnce(true);

      await emailSender.close();

      expect(mockTransporter.close).toHaveBeenCalledTimes(1);
    });

    it("should handle close errors gracefully", async () => {
      const error = new Error("Close failed");
      mockTransporter.close.mockRejectedValueOnce(error);

      await expect(emailSender.close()).rejects.toThrow("Close failed");
    });

    it("should not throw if transporter is null", async () => {
      emailSender = new EmailSender(defaultConfig);

      await expect(emailSender.close()).resolves.not.toThrow();
      expect(mockTransporter.close).not.toHaveBeenCalled();
    });

    it("should call close only on initialized transporter", async () => {
      emailSender = new EmailSender(defaultConfig);
      mockTransporter.verify.mockResolvedValueOnce(true);
      await emailSender.initialize();
      mockTransporter.close.mockResolvedValueOnce(true);

      await emailSender.close();

      expect(mockTransporter.close).toHaveBeenCalledTimes(1);
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete initialization and send email flow", async () => {
      emailSender = new EmailSender(defaultConfig);
      mockTransporter.verify.mockResolvedValueOnce(true);
      mockTransporter.sendMail.mockResolvedValueOnce({ messageId: "msg-123" });
      mockTransporter.close.mockResolvedValueOnce(true);

      await emailSender.initialize();
      await emailSender.sendTransactionNotification(
        "user@example.com",
        "Alice",
        "Bob",
        "$1000",
        "tx-123"
      );
      await emailSender.close();

      expect(mockTransporter.verify).toHaveBeenCalledTimes(1);
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
      expect(mockTransporter.close).toHaveBeenCalledTimes(1);
    });

    it("should send multiple emails after single initialization", async () => {
      emailSender = new EmailSender(defaultConfig);
      mockTransporter.verify.mockResolvedValueOnce(true);
      mockTransporter.sendMail.mockResolvedValue({ messageId: "msg-123" });

      await emailSender.initialize();

      await emailSender.sendTransactionNotification(
        "user1@example.com",
        "Alice",
        "Bob",
        "$1000",
        "tx-1"
      );
      await emailSender.sendTransactionNotification(
        "user2@example.com",
        "Charlie",
        "David",
        "$2000",
        "tx-2"
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2);
      expect(mockCreateTransport).toHaveBeenCalledTimes(1);
    });

    it("should handle multiple initializations", async () => {
      emailSender = new EmailSender(defaultConfig);
      mockTransporter.verify.mockResolvedValue(true);

      await emailSender.initialize();
      const firstTransporter = emailSender["transporter"];

      await emailSender.initialize();
      const secondTransporter = emailSender["transporter"];

      expect(firstTransporter).toBe(mockTransporter);
      expect(secondTransporter).toBe(mockTransporter);
      expect(mockCreateTransport).toHaveBeenCalledTimes(2);
    });

    it("should handle send after connection failure recovery", async () => {
      emailSender = new EmailSender(defaultConfig);
      mockTransporter.verify.mockRejectedValueOnce(new Error("Connection failed"));

      try {
        await emailSender.initialize();
      } catch {
        // expected
      }

      mockTransporter.verify.mockResolvedValueOnce(true);
      await emailSender.initialize();

      mockTransporter.sendMail.mockResolvedValueOnce({ messageId: "msg-123" });
      await emailSender.sendTransactionNotification(
        "user@example.com",
        "Alice",
        "Bob",
        "$1000",
        "tx-123"
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
    });
  });

  describe("edge cases", () => {
    beforeEach(async () => {
      emailSender = new EmailSender(defaultConfig);
      mockTransporter.verify.mockResolvedValueOnce(true);
      await emailSender.initialize();
    });

    it("should handle empty string sender name", async () => {
      mockTransporter.sendMail.mockResolvedValueOnce({ messageId: "msg-123" });

      await emailSender.sendTransactionNotification(
        "user@example.com",
        "",
        "Bob",
        "$1000",
        "tx-123"
      );

      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.html).toContain('<span class="value"></span>');
    });

    it("should handle empty string receiver name", async () => {
      mockTransporter.sendMail.mockResolvedValueOnce({ messageId: "msg-123" });

      await emailSender.sendTransactionNotification(
        "user@example.com",
        "Alice",
        "",
        "$1000",
        "tx-123"
      );

      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.text).toContain("Transaction from Alice to");
    });

    it("should handle very long email address", async () => {
      mockTransporter.sendMail.mockResolvedValueOnce({ messageId: "msg-123" });
      const longEmail =
        "verylongemailaddress.with.multiple.dots.and.numbers123456789@subdomain.example.com";

      await emailSender.sendTransactionNotification(
        longEmail,
        "Alice",
        "Bob",
        "$1000",
        "tx-123"
      );

      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.to).toBe(longEmail);
    });

    it("should handle very long transaction ID", async () => {
      mockTransporter.sendMail.mockResolvedValueOnce({ messageId: "msg-123" });
      const longTxId =
        "tx-very-long-transaction-id-with-multiple-segments-2024-01-01-12345-abcdef";

      await emailSender.sendTransactionNotification(
        "user@example.com",
        "Alice",
        "Bob",
        "$1000",
        longTxId
      );

      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.subject).toContain(longTxId);
      expect(mailOptions.html).toContain(longTxId);
    });

    it("should handle amount with special currency formatting", async () => {
      mockTransporter.sendMail.mockResolvedValueOnce({ messageId: "msg-123" });

      await emailSender.sendTransactionNotification(
        "user@example.com",
        "Alice",
        "Bob",
        "€1,234.56",
        "tx-123"
      );

      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.html).toContain("€1,234.56");
    });
  });
});
