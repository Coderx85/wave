import { describe, it, expect, beforeAll, vi } from 'vitest';

/**
 * Mock Kafka and Nodemailer modules for testing
 * These mocks provide realistic behavior for unit and integration tests
 */

export const createMockKafkaProducer = () => ({
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  send: vi.fn().mockResolvedValue([
    {
      topicName: 'wallet.transactions',
      partition: 0,
      errorCode: 0,
      offset: '0',
      timestamp: '-1',
    },
  ]),
});

export const createMockKafkaConsumer = () => ({
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  subscribe: vi.fn().mockResolvedValue(undefined),
  run: vi.fn().mockResolvedValue(undefined),
  seek: vi.fn().mockResolvedValue(undefined),
  assignments: vi.fn().mockReturnValue([
    {
      topic: 'wallet.transactions',
      partition: 0,
    },
  ]),
});

export const createMockKafka = () => ({
  producer: vi.fn().mockReturnValue(createMockKafkaProducer()),
  consumer: vi.fn().mockReturnValue(createMockKafkaConsumer()),
  admin: vi.fn().mockReturnValue({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    listTopics: vi.fn().mockResolvedValue(['wallet.transactions']),
    describeGroup: vi.fn().mockResolvedValue({
      members: [],
    }),
  }),
});

export const createMockTransport = () => ({
  sendMail: vi.fn().mockResolvedValue({
    response: '250 OK',
    accepted: ['jane@example.com'],
    rejected: [],
  }),
  verify: vi.fn().mockResolvedValue(true),
  close: vi.fn().mockResolvedValue(undefined),
});

export const createMockNodemailer = () => ({
  createTransport: vi.fn().mockReturnValue(createMockTransport()),
});

/**
 * Test Event Fixtures
 */

export const createTestTransactionEvent = (overrides = {}) => ({
  eventType: 'transaction.created' as const,
  transactionId: 'transaction_test_123',
  userId: 'user_test_456',
  senderAccountId: 'acc_sender_789',
  receiverAccountId: 'acc_receiver_101',
  amount: '5000',
  senderName: 'John Doe',
  receiverName: 'Jane Smith',
  status: 'pending',
  timestamp: new Date().toISOString(),
  ...overrides,
});

export const createTestNotification = (overrides = {}) => ({
  id: 'notification_123',
  transactionId: 'transaction_test_123',
  userId: 'user_test_456',
  email: 'jane@example.com',
  subject: 'Transaction Notification - transaction_test_123',
  message: 'You have received a transaction from John Doe for 5000',
  status: 'pending' as const,
  sentAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Test Database Mocks
 */

export const createMockDrizzleDB = () => ({
  insert: vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([createTestNotification()]),
    }),
  }),
  select: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    }),
  }),
  update: vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  }),
  query: {
    notifications: {
      findFirst: vi.fn().mockResolvedValue(createTestNotification()),
    },
    transactions: {
      findFirst: vi.fn().mockResolvedValue({
        id: 'transaction_123',
        userId: 'user_456',
      }),
    },
  },
});

/**
 * Logger Mock
 */

export const createMockLogger = () => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
});

/**
 * Helper function to wait for async operations in tests
 */

export const waitFor = async (
  condition: () => boolean,
  timeout = 1000
): Promise<void> => {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error(`waitFor timeout after ${timeout}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

/**
 * Mock user data for database queries
 */

export const mockUsers = [
  {
    id: 'user_test_456',
    email: 'jane@example.com',
    name: 'Jane Smith',
    emailVerified: true,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'user_789',
    email: 'john@example.com',
    name: 'John Doe',
    emailVerified: true,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

/**
 * Utility to create async delay (useful for testing timeouts)
 */

export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
