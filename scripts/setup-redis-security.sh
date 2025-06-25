#!/bin/bash

# Setup script for Redis security configuration
# Generates secure passwords and initializes Redis with ACLs

set -euo pipefail

# Configuration
REDIS_DIR="./redis"
SECRETS_DIR="./.secrets"
ENV_FILE=".env.local"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}Redis Security Setup Script${NC}"
echo "==========================="

# Function to generate secure passwords
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Create directories
echo -e "\n${YELLOW}Creating directories...${NC}"
mkdir -p "$REDIS_DIR/secrets"
mkdir -p "$SECRETS_DIR"
chmod 700 "$SECRETS_DIR"

# Generate passwords
echo -e "\n${YELLOW}Generating secure passwords...${NC}"
REDIS_DEFAULT_PASS=$(generate_password)
REDIS_APP_PASS=$(generate_password)
REDIS_MONITORING_PASS=$(generate_password)
REDIS_ADMIN_PASS=$(generate_password)
REDIS_BACKUP_PASS=$(generate_password)
SECRETS_ENCRYPTION_KEY=$(openssl rand -hex 32)

# Save passwords to secrets directory
echo -e "\n${YELLOW}Saving passwords to secrets directory...${NC}"
echo "$REDIS_APP_PASS" > "$SECRETS_DIR/redis_app_password.txt"
echo "$REDIS_MONITORING_PASS" > "$SECRETS_DIR/redis_monitoring_password.txt"
echo "$REDIS_ADMIN_PASS" > "$SECRETS_DIR/redis_admin_password.txt"
echo "$REDIS_BACKUP_PASS" > "$SECRETS_DIR/redis_backup_password.txt"
chmod 600 "$SECRETS_DIR"/*.txt

# Update Redis configuration files
echo -e "\n${YELLOW}Updating Redis configuration files...${NC}"

# Update redis.conf
if [ -f "$REDIS_DIR/redis.conf" ]; then
    sed -i.bak "s/CHANGEME_STRONG_PASSWORD_HERE/$REDIS_DEFAULT_PASS/" "$REDIS_DIR/redis.conf"
    echo -e "${GREEN}✓${NC} Updated redis.conf"
fi

# Update users.acl
if [ -f "$REDIS_DIR/users.acl" ]; then
    cp "$REDIS_DIR/users.acl" "$REDIS_DIR/users.acl.bak"
    sed -i "s/CHANGEME_APP_PASSWORD_HERE/$REDIS_APP_PASS/" "$REDIS_DIR/users.acl"
    sed -i "s/CHANGEME_MONITORING_PASSWORD_HERE/$REDIS_MONITORING_PASS/" "$REDIS_DIR/users.acl"
    sed -i "s/CHANGEME_ADMIN_PASSWORD_HERE/$REDIS_ADMIN_PASS/" "$REDIS_DIR/users.acl"
    sed -i "s/CHANGEME_BACKUP_PASSWORD_HERE/$REDIS_BACKUP_PASS/" "$REDIS_DIR/users.acl"
    echo -e "${GREEN}✓${NC} Updated users.acl"
fi

# Create or update .env.local file
echo -e "\n${YELLOW}Creating/updating .env.local file...${NC}"
cat >> "$ENV_FILE" <<EOF

# Redis Security Configuration (Generated on $(date))
REDIS_USERNAME=airport-app
REDIS_PASSWORD=$REDIS_APP_PASS
SECRETS_ENCRYPTION_KEY=$SECRETS_ENCRYPTION_KEY
SECRETS_SOURCE=file
SECRETS_PATH=$SECRETS_DIR

# Redis monitoring password (for Redis Exporter)
REDIS_MONITORING_PASSWORD=$REDIS_MONITORING_PASS
EOF

echo -e "${GREEN}✓${NC} Created/updated .env.local"

# Create docker secrets file for monitoring
echo "$REDIS_MONITORING_PASS" > "$REDIS_DIR/secrets/monitoring_password.txt"
chmod 600 "$REDIS_DIR/secrets/monitoring_password.txt"

# Generate TLS certificates if requested
echo -e "\n${BLUE}Do you want to generate TLS certificates for Redis? (y/n)${NC}"
read -r GENERATE_TLS

if [[ "$GENERATE_TLS" == "y" || "$GENERATE_TLS" == "Y" ]]; then
    echo -e "\n${YELLOW}Generating TLS certificates...${NC}"
    if [ -x "./scripts/generate-redis-tls.sh" ]; then
        ./scripts/generate-redis-tls.sh
        
        # Update .env.local with TLS configuration
        cat >> "$ENV_FILE" <<EOF

# Redis TLS Configuration
REDIS_TLS_ENABLED=true
REDIS_TLS_CA=$REDIS_DIR/tls/ca.crt
REDIS_TLS_CERT=$REDIS_DIR/tls/client.crt
REDIS_TLS_KEY=$REDIS_DIR/tls/client.key
REDIS_TLS_SERVERNAME=redis-server
EOF
        echo -e "${GREEN}✓${NC} TLS certificates generated and configured"
    else
        echo -e "${RED}✗${NC} TLS generation script not found"
    fi
fi

# Display summary
echo -e "\n${GREEN}Security Setup Complete!${NC}"
echo "======================="
echo -e "\n${YELLOW}Important Information:${NC}"
echo "1. Passwords have been generated and saved to:"
echo "   - $SECRETS_DIR/redis_*_password.txt"
echo "   - $ENV_FILE (for application use)"
echo ""
echo "2. Redis configuration files updated:"
echo "   - $REDIS_DIR/redis.conf"
echo "   - $REDIS_DIR/users.acl"
echo ""
echo "3. To start Redis with security enabled:"
echo "   docker-compose -f docker-compose.secure.yml up -d"
echo ""
echo -e "${RED}SECURITY NOTES:${NC}"
echo "- Keep the $SECRETS_DIR directory secure"
echo "- Backup the generated passwords securely"
echo "- Never commit .env.local or secrets to version control"
echo "- Rotate passwords periodically"
echo "- Monitor Redis logs for unauthorized access attempts"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Review the generated configuration"
echo "2. Start Redis with: docker-compose -f docker-compose.secure.yml up -d"
echo "3. Test connection with: redis-cli -u redis://airport-app:$REDIS_APP_PASS@localhost:9021"
echo "4. Run security tests to verify configuration"