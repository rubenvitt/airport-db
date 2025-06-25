#!/bin/bash

# Generate TLS certificates for Redis
# This script creates a self-signed CA and certificates for Redis TLS

set -euo pipefail

# Configuration
CERT_DIR="./redis/tls"
DAYS_VALID=3650  # 10 years
KEY_SIZE=4096
COUNTRY="US"
STATE="California"
CITY="San Francisco"
ORG="Airport Database"
UNIT="Security"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Redis TLS Certificate Generation Script${NC}"
echo "======================================="

# Create certificate directory
mkdir -p "$CERT_DIR"
cd "$CERT_DIR"

# Function to generate random password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

echo -e "\n${YELLOW}Step 1: Creating Certificate Authority (CA)${NC}"
# Generate CA private key
openssl genrsa -aes256 -out ca-key.pem -passout pass:$(generate_password) $KEY_SIZE

# Generate CA certificate
openssl req -new -x509 -days $DAYS_VALID -key ca-key.pem \
    -passin pass:$(cat ca-key.pass 2>/dev/null || generate_password > ca-key.pass && cat ca-key.pass) \
    -out ca.crt \
    -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORG/OU=$UNIT/CN=Redis-CA"

echo -e "\n${YELLOW}Step 2: Creating Redis Server Certificate${NC}"
# Generate server private key
openssl genrsa -out redis.key $KEY_SIZE

# Generate server certificate request
openssl req -new -key redis.key -out redis.csr \
    -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORG/OU=$UNIT/CN=redis-server"

# Create extensions file for server certificate
cat > redis.ext <<EOF
subjectAltName = DNS:localhost,DNS:redis,DNS:redis-secure,IP:127.0.0.1,IP:::1
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
EOF

# Sign server certificate
openssl x509 -req -days $DAYS_VALID -in redis.csr \
    -CA ca.crt -CAkey ca-key.pem \
    -passin pass:$(cat ca-key.pass) \
    -CAcreateserial -out redis.crt \
    -extfile redis.ext

echo -e "\n${YELLOW}Step 3: Creating Redis Client Certificate${NC}"
# Generate client private key
openssl genrsa -out client.key $KEY_SIZE

# Generate client certificate request
openssl req -new -key client.key -out client.csr \
    -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORG/OU=$UNIT/CN=redis-client"

# Create extensions file for client certificate
cat > client.ext <<EOF
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = clientAuth
EOF

# Sign client certificate
openssl x509 -req -days $DAYS_VALID -in client.csr \
    -CA ca.crt -CAkey ca-key.pem \
    -passin pass:$(cat ca-key.pass) \
    -CAcreateserial -out client.crt \
    -extfile client.ext

echo -e "\n${YELLOW}Step 4: Generating Diffie-Hellman parameters${NC}"
# Generate DH parameters (this takes a while)
openssl dhparam -out redis.dh 2048

echo -e "\n${YELLOW}Step 5: Setting proper permissions${NC}"
# Set appropriate permissions
chmod 400 *.key
chmod 444 *.crt *.dh

# Create a bundle for client connections
cat client.crt client.key > client-bundle.pem
chmod 400 client-bundle.pem

# Clean up
rm -f *.csr *.ext

echo -e "\n${GREEN}Certificate generation complete!${NC}"
echo -e "Files created in ${CERT_DIR}:"
echo "  - ca.crt          : Certificate Authority certificate"
echo "  - redis.crt       : Redis server certificate"
echo "  - redis.key       : Redis server private key"
echo "  - client.crt      : Client certificate"
echo "  - client.key      : Client private key"
echo "  - client-bundle.pem: Combined client cert+key for easy use"
echo "  - redis.dh        : Diffie-Hellman parameters"
echo -e "\n${YELLOW}Remember to:${NC}"
echo "  1. Keep ca-key.pem and ca-key.pass secure (needed to sign new certificates)"
echo "  2. Update redis.conf with the TLS configuration"
echo "  3. Configure clients to use client certificates"
echo "  4. Set up certificate rotation before expiry"