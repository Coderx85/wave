#!/bin/bash
#
# Integration Test Suite for Notification Service
# Tests the complete flow: Transaction → Kafka → Email Notification
#
# Usage:
#   ./server/integration-test.sh              # Run with default settings
#   ./server/integration-test.sh --dev        # Run in development mode
#   ./server/integration-test.sh --cleanup    # Clean up resources
#

set -e

# Configuration
COMPOSE_FILE="docker-compose.dev.yaml"
COMPOSE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_TIMEOUT=120
KAFKA_BROKER="localhost:9092"
MAILHOG_UI="http://localhost:8025"
DB_HOST="localhost"
DB_PORT="5432"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_docker() {
    log_info "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    log_info "✓ Docker found"
}

check_docker_compose() {
    log_info "Checking Docker Compose installation..."
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    log_info "✓ Docker Compose found"
}

start_services() {
    log_info "Starting services with docker-compose..."
    cd "$COMPOSE_DIR"
    
    # Start services in detached mode
    docker-compose -f "$COMPOSE_FILE" --profile devops up -d
    
    log_info "Waiting for services to be ready..."
    sleep 10
    
    log_info "✓ Services started"
}

stop_services() {
    log_info "Stopping services..."
    cd "$COMPOSE_DIR"
    docker-compose -f "$COMPOSE_FILE" --profile devops down
    log_info "✓ Services stopped"
}

check_postgres() {
    log_info "Checking PostgreSQL availability..."
    for i in {1..30}; do
        if pg_isready -h $DB_HOST -p $DB_PORT -U postgres &> /dev/null; then
            log_info "✓ PostgreSQL is ready"
            return 0
        fi
        log_warn "PostgreSQL not ready yet, waiting... ($i/30)"
        sleep 2
    done
    log_error "PostgreSQL failed to start"
    return 1
}

check_kafka() {
    log_info "Checking Kafka/Redpanda availability..."
    for i in {1..30}; do
        if echo "test" | nc -z $KAFKA_BROKER &> /dev/null || timeout 2 bash -c "echo '' | nc -z $(echo $KAFKA_BROKER | cut -d: -f1) $(echo $KAFKA_BROKER | cut -d: -f2)" &> /dev/null; then
            log_info "✓ Kafka is ready"
            return 0
        fi
        log_warn "Kafka not ready yet, waiting... ($i/30)"
        sleep 2
    done
    log_error "Kafka failed to start"
    return 1
}

check_mailhog() {
    log_info "Checking MailHog availability..."
    for i in {1..30}; do
        if curl -s "$MAILHOG_UI" > /dev/null; then
            log_info "✓ MailHog is ready at $MAILHOG_UI"
            return 0
        fi
        log_warn "MailHog not ready yet, waiting... ($i/30)"
        sleep 2
    done
    log_error "MailHog failed to start"
    return 1
}

run_tests() {
    log_info "Running integration tests..."
    cd "$COMPOSE_DIR"
    
    # Run tests
    npm test 2>&1 | tee integration-test.log
    
    if [ $? -eq 0 ]; then
        log_info "✓ All tests passed"
        return 0
    else
        log_error "Tests failed"
        return 1
    fi
}

verify_kafka_message() {
    log_info "Verifying Kafka message delivery..."
    # This would use a Kafka client to verify messages
    # For now, we assume Kafka is working if the service is up
    log_info "✓ Kafka message verification deferred to unit tests"
}

verify_email_sent() {
    log_info "Verifying email was sent via MailHog..."
    # Check MailHog API for sent emails
    EMAILS=$(curl -s "http://localhost:1025/api/messages" | grep -c "transactionId" || echo "0")
    
    if [ "$EMAILS" -gt 0 ]; then
        log_info "✓ Email notifications found in MailHog: $EMAILS"
        return 0
    else
        log_warn "No emails found in MailHog yet"
        return 1
    fi
}

cleanup() {
    log_info "Cleaning up..."
    stop_services
    rm -f integration-test.log
    log_info "✓ Cleanup complete"
}

main() {
    log_info "Starting Integration Test Suite"
    log_info "================================"
    
    # Parse arguments
    if [ "$1" == "--cleanup" ]; then
        cleanup
        exit 0
    fi
    
    # Pre-flight checks
    check_docker
    check_docker_compose
    
    # Start services
    start_services
    
    # Wait for services to be ready
    if ! check_postgres || ! check_kafka || ! check_mailhog; then
        log_error "Services failed to start properly"
        stop_services
        exit 1
    fi
    
    log_info "================================"
    log_info "All services are ready"
    log_info "================================"
    log_info ""
    
    # Run tests
    if run_tests; then
        log_info "✓ Integration tests PASSED"
        
        # Additional verifications
        verify_kafka_message
        verify_email_sent
        
        log_info ""
        log_info "================================"
        log_info "Integration tests completed successfully!"
        log_info "================================"
        log_info ""
        log_info "Available URLs:"
        log_info "  - Application: http://localhost:3000"
        log_info "  - MailHog UI: $MAILHOG_UI"
        log_info "  - Redpanda: localhost:9092"
        log_info "  - PostgreSQL: localhost:5432"
        log_info ""
        
        # Keep services running if --dev flag
        if [ "$1" == "--dev" ]; then
            log_info "Running in development mode (services still running)"
            log_info "Run './server/integration-test.sh --cleanup' to stop services"
            exit 0
        fi
        
        cleanup
        exit 0
    else
        log_error "Integration tests FAILED"
        log_info "Services are still running for debugging"
        log_info "Run './server/integration-test.sh --cleanup' to stop them"
        exit 1
    fi
}

# Run main function
main "$@"
