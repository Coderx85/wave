# Development Guide - Notification Service with Kafka

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- pnpm installed
- Node.js 18+

### Setup

1. **Install dependencies**
   ```bash
   cd server
   pnpm install
   ```

2. **Start the stack** (choose a mode)
   
   **Production Mode** (minimal logging, optimized for performance)
   ```bash
   # Use standard development environment
   docker-compose -f docker-compose.dev.yaml --profile devops up
   ```

   **Observability Mode** (detailed logging, metrics, monitoring)
   ```bash
   # First, copy observability env config
   cp src/.env.development.observability src/.env.development
   
   # Start the stack
   docker-compose -f docker-compose.dev.yaml --profile devops up
   ```

3. **View Services**

   | Service | URL | Purpose |
   |---------|-----|---------|
   | Wallet API | http://localhost:3001 | Transaction endpoints |
   | MailHog Web | http://localhost:8025 | View sent emails (fake console) |
   | MailHog SMTP | localhost:1025 | SMTP server for development |
   | Redpanda Kafka | localhost:9092 | Message broker |
   | PostgreSQL | localhost:5432 | Database |

## Environment Modes

### 1. Production Mode (`src/.env.development.production`)

Use this to test production-like behavior:

```bash
cp src/.env.development.production src/.env.development
docker-compose -f docker-compose.dev.yaml --profile devops up
```

**Features:**
- JSON logging (structured logs)
- Log level: `info` (less verbose)
- No pretty printing
- Metrics disabled (production-like)
- Better for CI/CD testing

**Console Output Example:**
```json
{"level":"info","msg":"Transaction created","txnId":"transaction_123","timestamp":"2024-05-31T18:54:42Z"}
{"level":"info","msg":"Event published to Kafka","topic":"wallet.transactions","timestamp":"2024-05-31T18:54:43Z"}
{"level":"info","msg":"Notification sent","userId":"user_456","email":"jane@example.com","timestamp":"2024-05-31T18:54:44Z"}
```

### 2. Observability Mode (`src/.env.development.observability`)

Use this for development and debugging with full observability:

```bash
cp src/.env.development.observability src/.env.development
docker-compose -f docker-compose.dev.yaml --profile devops up
```

**Features:**
- Pretty-printed logs with colors
- Log level: `debug` (verbose)
- Stack traces included
- Prometheus metrics enabled
- Request/response logging
- Kafka message logging
- Health check endpoints

**Console Output Example:**
```
[WalletService] ℹ️  Transaction created: transaction_123
  Sender: John Doe (acc_sender_789)
  Receiver: Jane Smith (acc_receiver_101)
  Amount: 5000

[KafkaService] ℹ️  Published transaction event for transaction transaction_123
  Topic: wallet.transactions
  Message: {"eventType":"transaction.created",...}

[NotificationConsumer] ℹ️  Received message for transaction transaction_123
[NotificationService] ℹ️  Notification sent for transaction transaction_123 to jane@example.com
[EmailSender] ℹ️  Email sent to jane@example.com for transaction transaction_123
```

## Testing the Flow

### 1. Create a Transaction

```bash
# Create accounts first (if needed)
curl -X POST http://localhost:3001/api/accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "Sender Account",
    "accountNumber": "1000001"
  }'

# Create transaction
curl -X POST http://localhost:3001/api/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "senderAccountId": "acc_xxx",
    "receiverAccountId": "acc_yyy",
    "amount": 5000,
    "senderName": "John Doe",
    "receiverName": "Jane Smith"
  }'
```

### 2. View Emails in MailHog

Open http://localhost:8025 in your browser to see all sent emails.

**Features:**
- Real-time email list
- View email source and HTML
- Search emails by recipient
- Download emails as MIME format
- Delete emails for testing

### 3. Check Database

```bash
# Connect to PostgreSQL
psql -h localhost -U postgres -d wave_db

# Check transactions
SELECT * FROM transactions ORDER BY created_at DESC LIMIT 5;

# Check outbox entries
SELECT * FROM transaction_outbox ORDER BY created_at DESC LIMIT 5;

# Check notifications
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5;
```

### 4. Monitor Kafka

```bash
# List topics
docker exec redpanda rpk topic list

# Consume messages from wallet.transactions
docker exec redpanda rpk topic consume wallet.transactions -n 10
```

## Running Tests

### Unit Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test src/modules/notification/__tests__/notification-service.spec.ts

# Run with coverage
pnpm test --coverage

# Watch mode
pnpm test --watch
```

### Integration Tests

```bash
# Start the stack first
docker-compose -f docker-compose.dev.yaml --profile devops up -d

# Run integration tests
pnpm test integration

# Stop the stack
docker-compose -f docker-compose.dev.yaml --profile devops down
```

### Test Files

| Test File | Coverage |
|-----------|----------|
| `kafka-service.spec.ts` | KafkaService publishing logic |
| `email-sender.spec.ts` | Email sending and templates |
| `notification-service.spec.ts` | Full orchestration flow |
| `notification-consumer.spec.ts` | Kafka consumption and parsing |

## Debugging

### Enable Detailed Logging

```bash
# Watch logs in real-time
docker-compose -f docker-compose.dev.yaml --profile devops logs -f wallet-service notification-service

# Follow specific service
docker-compose -f docker-compose.dev.yaml --profile devops logs -f notification-service --tail=100
```

### Database Inspection

```bash
# List all tables
psql -h localhost -U postgres -d wave_db -c "\dt"

# Check transaction_outbox status
psql -h localhost -U postgres -d wave_db -c "
  SELECT 
    id, 
    transaction_id, 
    event_type, 
    published, 
    published_at 
  FROM transaction_outbox 
  ORDER BY created_at DESC 
  LIMIT 10;
"

# Check notification status
psql -h localhost -U postgres -d wave_db -c "
  SELECT 
    id, 
    transaction_id, 
    status, 
    email, 
    sent_at 
  FROM notifications 
  ORDER BY created_at DESC 
  LIMIT 10;
"
```

### Kafka Inspection

```bash
# Check consumer group lag
docker exec redpanda rpk group describe notification-service-group

# List all consumer groups
docker exec redpanda rpk group list

# View topic details
docker exec redpanda rpk topic describe wallet.transactions
```

## Troubleshooting

### Emails Not Sending

**Check MailHog health:**
```bash
curl http://localhost:8025
```

**Check email configuration:**
```bash
# Verify EMAIL_HOST and EMAIL_PORT in .env.development
cat src/.env.development | grep EMAIL
```

### Kafka Connection Errors

**Check Redpanda health:**
```bash
docker exec redpanda rpk cluster info
```

**Check broker connectivity:**
```bash
docker exec redpanda rpk topic create wallet.transactions
```

### Database Connection Issues

**Check PostgreSQL:**
```bash
docker exec -it wave_postgres psql -U postgres -d wave_db -c "SELECT 1;"
```

**Check migrations:**
```bash
pnpm db push
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   Development Environment                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐         ┌──────────────────┐          │
│  │  Wallet Service │         │  Notification    │          │
│  │  Port: 3001     │         │  Service         │          │
│  └────────┬────────┘         │  Port: None      │          │
│           │                  └──────────────────┘          │
│           │ [1] Create                    ▲                │
│           │ Transaction          [3]      │                │
│           ▼                     Consume    │                │
│  ┌─────────────────────┐        from    ┌──────────┐      │
│  │  PostgreSQL         │        Kafka   │ Database │      │
│  │  Transactions       │        Topic   │ Notify   │      │
│  │  Outbox             │        │       │          │      │
│  │  Accounts           │        │       └──────────┘      │
│  │  Ledger             │        │                         │
│  └─────────────────────┘        │                         │
│           │                     │                         │
│           │ [2] Publish      ┌──┴──────────┐             │
│           └────────────────►│  Redpanda    │             │
│                             │  Kafka       │             │
│                             │  Topic:      │             │
│                             │  wallet.     │             │
│                             │  transactions │             │
│                             └──────────────┘             │
│                                                          │
│  ┌──────────────────────┐         ┌──────────────────┐ │
│  │  MailHog             │         │  Prometheus      │ │
│  │  SMTP: 1025          │         │  (Observability) │ │
│  │  Web: 8025           │         │  (Optional)      │ │
│  │  Fake Email Sink     │         │  Port: 9090      │ │
│  │  & Console           │         └──────────────────┘ │
│  └──────────────────────┘                              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Performance Tuning

### For Production Mode Testing

```yaml
# In docker-compose.dev.yaml
environment:
  LOG_LEVEL: info
  LOG_PRETTY: false
  METRICS_ENABLED: false
```

### For Observability Mode Testing

```yaml
# In docker-compose.dev.yaml
environment:
  LOG_LEVEL: debug
  LOG_PRETTY: true
  METRICS_ENABLED: true
  PROMETHEUS_ENABLED: true
```

## Useful Commands

```bash
# Start fresh (remove volumes)
docker-compose -f docker-compose.dev.yaml --profile devops down -v

# Build without cache
docker-compose -f docker-compose.dev.yaml --profile devops build --no-cache

# View all services
docker-compose -f docker-compose.dev.yaml --profile devops ps

# Execute command in service
docker-compose -f docker-compose.dev.yaml --profile devops exec wallet-service pnpm test

# View resource usage
docker stats
```

## Next Steps

1. **Run the stack:** `docker-compose -f docker-compose.dev.yaml --profile devops up`
2. **Create a transaction:** Use the curl command above
3. **Check MailHog:** Visit http://localhost:8025
4. **View logs:** Use `docker-compose logs -f`
5. **Run tests:** Use `pnpm test`

For questions or issues, check the logs using `docker-compose logs -f notification-service`.
