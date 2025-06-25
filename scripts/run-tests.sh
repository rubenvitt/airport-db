#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🧪 Airport DB - Comprehensive Test Runner${NC}"
echo "========================================"

# Check if Redis is running
echo -e "\n${YELLOW}Checking Redis connection...${NC}"
if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis is running${NC}"
else
    echo -e "${YELLOW}⚠️  Redis not running locally. Starting Redis container...${NC}"
    docker run -d --name airport-db-test-redis -p 6379:6379 redis:7-alpine
    sleep 2
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "\n${YELLOW}Installing dependencies...${NC}"
    pnpm install
fi

# Run linting
echo -e "\n${YELLOW}Running ESLint...${NC}"
pnpm lint src/server/services || { echo -e "${RED}❌ Linting failed${NC}"; exit 1; }
echo -e "${GREEN}✓ Linting passed${NC}"

# Run type checking
echo -e "\n${YELLOW}Running TypeScript check...${NC}"
pnpm tsc --noEmit || { echo -e "${RED}❌ Type checking failed${NC}"; exit 1; }
echo -e "${GREEN}✓ Type checking passed${NC}"

# Run unit tests
echo -e "\n${YELLOW}Running unit tests...${NC}"
pnpm test:unit || { echo -e "${RED}❌ Unit tests failed${NC}"; exit 1; }
echo -e "${GREEN}✓ Unit tests passed${NC}"

# Run integration tests
echo -e "\n${YELLOW}Running integration tests...${NC}"
pnpm test:integration || { echo -e "${RED}❌ Integration tests failed${NC}"; exit 1; }
echo -e "${GREEN}✓ Integration tests passed${NC}"

# Run security tests
echo -e "\n${YELLOW}Running security tests...${NC}"
pnpm test:security || { echo -e "${RED}❌ Security tests failed${NC}"; exit 1; }
echo -e "${GREEN}✓ Security tests passed${NC}"

# Run performance tests (optional, as they take longer)
if [ "$1" == "--with-performance" ]; then
    echo -e "\n${YELLOW}Running performance tests...${NC}"
    pnpm test:performance || { echo -e "${RED}❌ Performance tests failed${NC}"; exit 1; }
    echo -e "${GREEN}✓ Performance tests passed${NC}"
fi

# Generate coverage report
echo -e "\n${YELLOW}Generating coverage report...${NC}"
pnpm test:coverage

# Display coverage summary
echo -e "\n${GREEN}📊 Coverage Summary:${NC}"
cat coverage/lcov-report/index.html | grep -A 4 "strong" | head -20 || echo "Coverage report generated in coverage/lcov-report/"

# Cleanup
if [ "$(docker ps -q -f name=airport-db-test-redis)" ]; then
    echo -e "\n${YELLOW}Cleaning up test Redis container...${NC}"
    docker stop airport-db-test-redis > /dev/null
    docker rm airport-db-test-redis > /dev/null
fi

echo -e "\n${GREEN}✅ All tests completed successfully!${NC}"
echo "========================================"

# Exit with success
exit 0