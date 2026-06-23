# Test Documentation

## Overview

This directory contains comprehensive test suites for the Kafka notification service. Tests are organized by module and include unit tests, integration tests, and test utilities.

## Test Files

### Notification Module Tests

#### `notification-service.spec.ts`
- **Location**: `src/modules/notification/__tests__/notification-service.spec.ts`
- **Coverage**: Full orchestration logic
- **Tests**:
  - Service lifecycle (start/stop)
  - Transaction event handling
  - Notification creation and status updates
  - Email sending integration
  - Error recovery and graceful degradation
  - Database interaction
  - Kafka consumption

#### `notification-consumer.spec.ts`
- **Location**: `src/modules/notification/consumer/__tests__/notification-consumer.spec.ts`
- **Coverage**: Kafka consumer functionality
- **Tests**:
  - Connection management
  - Message parsing and validation
  - Topic subscription
  - Error handling
  - Network resilience

#### `email-sender.spec.ts`
- **Location**: `src/modules/notification/email-sender/__tests__/email-sender.spec.ts`
- **Coverage**: Email sending via SMTP
- **Tests**:
  - SMTP connection and initialization
  - Email sending with templates
  - HTML content validation
  - Error handling
  - Connection closure

### Wallet Service Tests

#### `kafka-service.spec.ts`
- **Location**: `src/modules/wallet/service/kafka-service/__tests__/kafka-service.spec.ts`
- **Coverage**: Kafka event publishing
- **Tests**:
  - Kafka broker connection
  - Event publishing to Kafka topic
  - Message serialization
  - Connection retry logic
  - Error handling

### Test Utilities

#### `test-helpers.ts`
- **Location**: `src/modules/__tests__/test-helpers.ts`
- **Contains**:
  - Mock Kafka producer/consumer
  - Mock Nodemailer transport
  - Mock Drizzle ORM database
  - Mock logger
  - Test event fixtures
  - Test data generators
  - Async utilities (waitFor, delay)

## Running Tests

### All Tests

```bash
# Run all tests once
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run with coverage report
pnpm test --coverage
```

### Specific Test Suites

```bash
# Notification service tests
pnpm test src/modules/notification/__tests__/notification-service.spec.ts

# Kafka consumer tests
pnpm test src/modules/notification/consumer/__tests__/notification-consumer.spec.ts

# Email sender tests
pnpm test src/modules/notification/email-sender/__tests__/email-sender.spec.ts

# Kafka service tests
pnpm test src/modules/wallet/service/kafka-service/__tests__/kafka-service.spec.ts
```

### Watch Mode for Development

```bash
# Watch specific test file
pnpm test --watch src/modules/notification/__tests__/notification-service.spec.ts

# Watch all tests related to notification module
pnpm test --watch notification
```

### Coverage Reports

```bash
# Generate coverage for all tests
pnpm test --coverage

# Generate coverage for specific file
pnpm test --coverage src/modules/notification/__tests__/notification-service.spec.ts

# View coverage in browser
open coverage/index.html
```

## Test Structure

### Unit Tests

Each module has focused unit tests that:
1. Mock external dependencies (Kafka, Email, Database)
2. Test single responsibility
3. Verify error handling
4. Use realistic test data fixtures

**Example Pattern**:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationService } from '../notification-service';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockConsumer: any;
  let mockEmailSender: any;
  let mockRepository: any;

  beforeEach(() => {
    // Setup mocks
    mockConsumer = { /* ... */ };
    mockEmailSender = { /* ... */ };
    mockRepository = { /* ... */ };
    
    service = new NotificationService(
      mockConsumer,
      mockEmailSender,
      mockRepository
    );
  });

  it('should handle transaction events', async () => {
    // Test implementation
  });
});
```

### Integration Tests

Full workflow tests that verify:
1. Kafka message consumption
2. Database writes
3. Email delivery
4. End-to-end transaction flow

These tests use real services running in docker-compose.

```bash
# Start docker stack
docker-compose -f docker-compose.dev.yaml --profile devops up -d

# Run integration tests
pnpm test integration

# Stop docker stack
docker-compose -f docker-compose.dev.yaml --profile devops down
```

## Mocking Strategy

### Kafka Mocking

```typescript
import { createMockKafka, createMockKafkaProducer } from '../../../__tests__/test-helpers';

const mockProducer = createMockKafkaProducer();
// mockProducer.send is now vi.fn()
```

### Email Mocking

```typescript
import { createMockNodemailer } from '../../../__tests__/test-helpers';

const mockNodemailer = createMockNodemailer();
// mockNodemailer.createTransport() returns mock transport
```

### Database Mocking

```typescript
import { createMockDrizzleDB } from '../../../__tests__/test-helpers';

const mockDB = createMockDrizzleDB();
// mockDB.insert(), select(), update() are available
```

## Test Data Fixtures

### Transaction Event

```typescript
import { createTestTransactionEvent } from '../../../__tests__/test-helpers';

const event = createTestTransactionEvent({
  amount: '10000',
  senderName: 'Custom Name'
});
```

### Notification Record

```typescript
import { createTestNotification } from '../../../__tests__/test-helpers';

const notification = createTestNotification({
  status: 'sent',
  sentAt: new Date()
});
```

## Best Practices

### 1. Clear Test Names

```typescript
// ❌ Bad
it('should work', () => { /* ... */ });

// ✅ Good
it('should send email notification when transaction event is received', () => { /* ... */ });
```

### 2. Arrange-Act-Assert Pattern

```typescript
it('should create notification on transaction event', async () => {
  // Arrange
  const testEvent = createTestTransactionEvent();
  const mockRepository = createMockRepository();
  
  // Act
  const notification = await service.handleEvent(testEvent);
  
  // Assert
  expect(mockRepository.create).toHaveBeenCalledWith(
    expect.objectContaining({
      transactionId: testEvent.transactionId
    })
  );
});
```

### 3. Mock Verification

```typescript
// Verify that mocked function was called with expected args
expect(mockEmailSender.sendMail).toHaveBeenCalledWith(
  expect.objectContaining({
    to: 'user@example.com'
  })
);

// Verify call count
expect(mockKafkaProducer.send).toHaveBeenCalledTimes(1);
```

### 4. Error Testing

```typescript
it('should handle email send errors gracefully', async () => {
  const failingEmailSender = {
    sendMail: vi.fn().mockRejectedValue(new Error('SMTP failed'))
  };
  
  const service = new NotificationService(failingEmailSender);
  
  // Should not throw
  await expect(service.handleEvent(testEvent)).resolves.not.toThrow();
});
```

## Common Issues & Solutions

### Issue: Async Timeout
**Solution**: Use `waitFor()` helper from test-helpers
```typescript
import { waitFor } from '../../../__tests__/test-helpers';

await waitFor(() => mockRepository.create.called, 1000);
```

### Issue: Database Connection in Tests
**Solution**: Use mocks instead of real database
```typescript
const mockDB = createMockDrizzleDB();
// Use mockDB instead of real database client
```

### Issue: Kafka Connection Failures
**Solution**: Mock Kafka library completely
```typescript
vi.mock('kafkajs', () => ({
  Kafka: vi.fn(() => createMockKafka())
}));
```

## Continuous Integration

Tests are automatically run on:
- Pull requests
- Commits to main branch
- Pre-commit hooks (if configured)

**CI Configuration**:
```bash
# In your CI pipeline
pnpm install
pnpm typecheck
pnpm test --run
pnpm test --coverage
```

## Coverage Goals

| Module | Target | Current |
|--------|--------|---------|
| notification-service | 90% | - |
| notification-consumer | 85% | - |
| email-sender | 95% | - |
| kafka-service | 90% | - |

Track coverage with:
```bash
pnpm test --coverage --run
```

## Adding New Tests

1. Create test file in `__tests__` directory
2. Use consistent naming: `<module>.spec.ts`
3. Import mocks from `src/modules/__tests__/test-helpers.ts`
4. Follow Arrange-Act-Assert pattern
5. Test both happy path and error cases
6. Update this documentation

## Resources

- **Vitest Documentation**: https://vitest.dev/
- **Mocking Guide**: https://vitest.dev/guide/mocking.html
- **Best Practices**: https://vitest.dev/guide/best-practices.html

## Questions?

Refer to existing test files for patterns and examples.
