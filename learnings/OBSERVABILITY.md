# Observability Setup Guide

This guide walks through setting up observability tools for the Wave wallet notification service.

## Overview

Observability consists of three pillars:
1. **Logging** - Application and system logs
2. **Metrics** - Performance and system metrics (Prometheus)
3. **Tracing** - Request tracing and distributed tracing (Jaeger)

## Prerequisites

- Docker and Docker Compose
- Node.js 18+
- PostgreSQL 14+
- Redpanda (Kafka compatible) for message queuing

## Environment Setup

### 1. Observability Mode

Use the observability environment configuration for debugging:

```bash
# Copy observability configuration
cp src/.env.development.observability src/.env.development.local

# Run services with observability stack
docker-compose -f docker-compose.dev.yaml --profile observability up -d
```

### 2. Logging Configuration

Logs are configured via environment variables:

```bash
LOG_LEVEL=debug              # debug, info, warn, error
LOG_FORMAT=pretty            # pretty or json
LOG_PRETTY=true              # Pretty-print JSON logs
VERBOSE_LOGGING=true         # Enable verbose output
REQUEST_LOGGING=true         # Log HTTP requests
RESPONSE_LOGGING=true        # Log HTTP responses
```

#### Log Levels

- `debug` - Detailed information for debugging
- `info` - General informational messages
- `warn` - Warning messages for potential issues
- `error` - Error messages for failures

#### Log Format

- `pretty` - Human-readable colored output (development)
- `json` - JSON structured logs (production)

### 3. Metrics with Prometheus

#### Configuration

Enable Prometheus in observability mode:

```bash
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090
```

#### Accessing Prometheus

```bash
# Open Prometheus UI
open http://localhost:9090
```

#### Key Metrics to Monitor

1. **Application Metrics**
   - `wallet_transaction_count` - Number of transactions created
   - `wallet_transaction_duration_ms` - Transaction processing time
   - `notification_email_sent_total` - Emails sent count
   - `notification_email_failed_total` - Email send failures
   - `kafka_message_published_total` - Messages published to Kafka

2. **System Metrics**
   - `process_cpu_usage_percent` - CPU usage
   - `process_memory_usage_bytes` - Memory consumption
   - `process_uptime_seconds` - Application uptime

3. **Database Metrics**
   - `db_query_count_total` - Total database queries
   - `db_query_duration_ms` - Query execution time
   - `db_connection_pool_size` - Connection pool size

#### Prometheus Queries

```promql
# Request rate (requests per second)
rate(http_requests_total[1m])

# P95 latency
histogram_quantile(0.95, http_request_duration_seconds)

# Error rate
rate(http_errors_total[1m]) / rate(http_requests_total[1m])

# Kafka message production rate
rate(kafka_messages_produced[5m])

# Email sending success rate
rate(notification_email_sent_total[5m]) / (rate(notification_email_sent_total[5m]) + rate(notification_email_failed_total[5m]))
```

### 4. Distributed Tracing with Jaeger

#### Configuration

Enable Jaeger tracing:

```bash
JAEGER_ENABLED=true
JAEGER_HOST=localhost
JAEGER_PORT=6831
TRACING_ENABLED=true
```

#### Accessing Jaeger UI

```bash
# Open Jaeger UI
open http://localhost:16686
```

#### Trace Example

For a transaction → Kafka → email notification flow:

```
Transaction Service (span)
├── Database write (child span)
├── Kafka publish (child span)
└── Outbox create (child span)

Notification Consumer (span)
├── Kafka consume (child span)
├── Database query (child span)
├── Email send (child span)
└── Status update (child span)
```

#### Jaeger Queries

```bash
# Find traces for service
curl http://localhost:16686/api/traces?service=notification-service

# Find traces with error tag
curl 'http://localhost:16686/api/traces?service=wallet-service&tags=error:true'

# Find slow transactions (>500ms)
curl 'http://localhost:16686/api/traces?service=wallet-service&maxDuration=500000'
```

### 5. Grafana Dashboards

#### Setup Grafana

```bash
# Grafana is included in docker-compose observability profile
open http://localhost:3001

# Default credentials
# Username: admin
# Password: admin
```

#### Add Prometheus Data Source

1. Go to Configuration > Data Sources
2. Click "Add data source"
3. Select Prometheus
4. Set URL to `http://prometheus:9090`
5. Click "Save & Test"

#### Pre-built Dashboards

Available dashboards in `monitoring/grafana/dashboards/`:
- Node.js Application Metrics
- PostgreSQL Database
- Kafka Cluster
- Notification Service

### 6. Docker Compose Observability Profile

Add this to your docker-compose.dev.yaml:

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    profiles:
      - observability

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
      - grafana-data:/var/lib/grafana
    depends_on:
      - prometheus
    profiles:
      - observability

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # UI
      - "6831:6831/udp" # Agent
    environment:
      - COLLECTOR_ZIPKIN_HOST_PORT=:9411
    profiles:
      - observability

volumes:
  prometheus-data:
  grafana-data:
```

### 7. Health Checks

Enable health checks for monitoring:

```bash
HEALTH_CHECK_ENABLED=true

# Health check endpoints:
GET /health                 # Overall service health
GET /health/kafka           # Kafka connectivity
GET /health/database        # Database connectivity
GET /health/email           # Email service connectivity
```

Example health check response:

```json
{
  "status": "healthy",
  "services": {
    "kafka": "connected",
    "database": "connected",
    "email": "ready",
    "notifications": "running"
  },
  "uptime_seconds": 3600
}
```

### 8. Slow Query Logging

Monitor slow database queries:

```bash
SLOW_QUERY_LOGGING=true
SLOW_QUERY_THRESHOLD_MS=100  # Log queries slower than 100ms
```

### 9. Performance Tuning

#### Database Connection Pool

```typescript
// src/modules/database/client.ts
const poolSize = process.env.DB_POOL_SIZE || 10;
```

#### Kafka Consumer Configuration

```typescript
// src/modules/notification/consumer/notification-consumer.ts
const config = {
  sessionTimeout: 30000,
  heartbeatInterval: 3000,
  maxBytesPerPartition: 1048576,  // 1MB
};
```

#### Email Service Concurrency

```typescript
// src/modules/notification/email-sender/email-sender.ts
const MAX_CONCURRENT_EMAILS = 5;
```

## Monitoring Checklist

- [ ] Prometheus scraping metrics
- [ ] Grafana dashboards displaying data
- [ ] Jaeger collecting traces
- [ ] Health checks responding
- [ ] Slow queries being logged
- [ ] Error rates < 1%
- [ ] p95 latency < 500ms
- [ ] Kafka lag < 1000 messages

## Troubleshooting

### Metrics not appearing in Prometheus

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Verify metrics endpoint
curl http://localhost:3000/metrics
```

### Jaeger not receiving traces

```bash
# Check Jaeger agent is running
netstat -tulpn | grep 6831

# Verify trace configuration
grep -i jaeger src/.env.development.observability
```

### Grafana dashboards empty

1. Check Prometheus data source configuration
2. Verify Prometheus is scraping metrics
3. Check for data in Prometheus directly

## Next Steps

1. **Set up alerts** in Prometheus for critical thresholds
2. **Create custom dashboards** for business metrics
3. **Implement distributed tracing** across services
4. **Set up log aggregation** with ELK or similar
5. **Configure SLOs** for service reliability
6. **Set up incident response** workflows

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [OpenTelemetry for Node.js](https://opentelemetry.io/docs/instrumentation/js/)

## Support

For issues or questions about observability setup:

1. Check logs: `docker-compose logs <service>`
2. Review environment variables: `src/.env.development.observability`
3. Consult service documentation
4. Open an issue on GitHub
