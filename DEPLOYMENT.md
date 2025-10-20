# Airport Database - Production Deployment Guide

Dieses Dokument beschreibt die Deployment-Schritte für die Airport Database Anwendung mit Docker und Docker Compose auf einem Server.

## Voraussetzungen

- Docker Engine 20.10+ installiert
- Docker Compose v2.0+ installiert
- Git installiert
- Zugriff auf den Server (SSH)
- Domain/Subdomain für die Anwendung (optional, für HTTPS mit Reverse Proxy)

## 1. API-Keys beantragen

Bevor du die Anwendung deployen kannst, benötigst du folgende API-Keys:

### Erforderliche APIs

#### 1.1 API Ninjas (Pflicht)
Für Airport-Daten.

1. Gehe zu [https://api-ninjas.com/](https://api-ninjas.com/)
2. Registriere dich für einen kostenlosen Account
3. Navigiere zu deinem Dashboard
4. Kopiere deinen API Key

**Umgebungsvariable:** `VITE_API_NINJAS_API_KEY`

#### 1.2 OpenSky Network (Pflicht)
Für Flugdaten. Seit März 2025 wird OAuth2 verwendet.

1. Registriere dich bei [https://opensky-network.org/](https://opensky-network.org/)
2. Gehe zu deinen Account-Einstellungen
3. Erstelle einen neuen API Client unter "OAuth2 Applications"
4. Notiere dir `Client ID` und `Client Secret`

**Umgebungsvariablen:**
- `VITE_OPENSKY_CLIENT_ID`
- `VITE_OPENSKY_CLIENT_SECRET`

### Optionale APIs

#### 1.3 AviationStack (Optional)
Für erweiterte Flugdaten.

1. Gehe zu [https://aviationstack.com/](https://aviationstack.com/)
2. Registriere dich für den kostenlosen Plan
3. Kopiere deinen API Key

**Umgebungsvariable:** `VITE_AVIATIONSTACK_KEY`

#### 1.4 Mapbox (Optional)
Für erweiterte Kartendarstellung (falls du nicht die Standard Leaflet Tiles verwenden möchtest).

1. Gehe zu [https://www.mapbox.com/](https://www.mapbox.com/)
2. Registriere dich für einen Account
3. Erstelle einen Access Token
4. Kopiere den Token

**Umgebungsvariable:** `VITE_MAPBOX_TOKEN`

## 2. Secrets generieren

Für die sichere Konfiguration der Anwendung musst du mehrere Secrets generieren.

### 2.1 Redis Password

```bash
# Generiere ein sicheres Redis Password (32 Zeichen)
openssl rand -base64 32
```

**Umgebungsvariable:** `REDIS_PASSWORD`

### 2.2 Secrets Encryption Key

```bash
# Generiere einen 32-Byte Encryption Key für Secrets Management
openssl rand -hex 32
```

**Umgebungsvariable:** `SECRETS_ENCRYPTION_KEY`

### 2.3 Session Secret (falls implementiert)

```bash
# Generiere ein Session Secret
openssl rand -base64 48
```

## 3. Environment-Datei erstellen

Erstelle eine `.env` Datei auf deinem Server mit allen erforderlichen Variablen:

```bash
# Auf dem Server
cd /opt/airport-db  # oder dein bevorzugtes Verzeichnis
nano .env
```

Füge folgenden Inhalt ein und ersetze die Platzhalter:

```bash
# ============================================
# API Configuration
# ============================================

# API URLs (Standard-Werte, normalerweise nicht ändern)
VITE_OPENSKY_API_URL=https://opensky-network.org/api
VITE_OPENSKY_AUTH_URL=https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token
VITE_API_NINJAS_API_URL=https://api.api-ninjas.com/v1
NEXT_PUBLIC_API_URL=http://localhost:3000

# ============================================
# API Keys (ERFORDERLICH)
# ============================================

# API Ninjas - Airport Daten
VITE_API_NINJAS_API_KEY=dein_api_ninjas_key_hier

# OpenSky Network - Flugdaten (OAuth2)
VITE_OPENSKY_CLIENT_ID=dein_opensky_client_id_hier
VITE_OPENSKY_CLIENT_SECRET=dein_opensky_client_secret_hier

# ============================================
# Optional API Keys
# ============================================

# AviationStack (Optional)
# VITE_AVIATIONSTACK_KEY=dein_aviationstack_key_hier

# Mapbox (Optional)
# VITE_MAPBOX_TOKEN=dein_mapbox_token_hier

# ============================================
# Redis Configuration
# ============================================

# Redis Password (generiert mit: openssl rand -base64 32)
REDIS_PASSWORD=dein_generiertes_redis_password_hier

# Redis Username (Standard: airport-app)
REDIS_USERNAME=airport-app

# Redis TLS/SSL (Optional, für verschlüsselte Verbindung)
REDIS_TLS_ENABLED=false
REDIS_TLS_REJECT_UNAUTHORIZED=true

# ============================================
# Secrets Management
# ============================================

# Secrets Source (env, file, vault, aws-secrets-manager, gcp-secret-manager)
SECRETS_SOURCE=env

# Secrets Encryption Key (generiert mit: openssl rand -hex 32)
SECRETS_ENCRYPTION_KEY=dein_generierter_encryption_key_hier

# ============================================
# Rate Limiting Configuration
# ============================================

# Fail Closed Mode (true = Anfragen blockieren bei Rate Limiter Fehler)
RATE_LIMIT_FAIL_CLOSED=true

# Circuit Breaker Einstellungen
REDIS_CIRCUIT_FAILURE_THRESHOLD=5
REDIS_CIRCUIT_RESET_TIMEOUT=60000
REDIS_CIRCUIT_HALF_OPEN_REQUESTS=3

# ============================================
# Cache Configuration
# ============================================

# Airport Cache TTL (30 Tage in Sekunden)
AIRPORT_CACHE_TTL=2592000

# In-Memory Cache Fallback aktivieren
USE_IN_MEMORY_CACHE_FALLBACK=true
```

### 3.1 Berechtigungen setzen

```bash
# Schütze die .env Datei (nur Owner kann lesen/schreiben)
chmod 600 .env
```

## 4. Repository klonen

```bash
# Wechsle in das Deployment-Verzeichnis
cd /opt/airport-db

# Klone das Repository
git clone https://github.com/DEIN_USERNAME/airport-db.git .

# Oder falls bereits geklont, aktualisiere
git pull origin main
```

## 5. Docker Image bauen und starten

### 5.1 Nur die Anwendung starten

```bash
# Build und Start mit Docker Compose
docker compose up -d --build

# Logs verfolgen
docker compose logs -f app

# Status überprüfen
docker compose ps
```

### 5.2 Mit Development Tools (Redis Commander)

```bash
# Start mit dev Profile (beinhaltet Redis Commander UI)
docker compose --profile dev up -d --build

# Redis Commander ist dann verfügbar unter: http://dein-server:8081
```

## 6. Health Checks überprüfen

Nach dem Start solltest du die Health Checks überprüfen:

```bash
# App Health Check
curl http://localhost:3000/api/airports

# Redis Health Check
docker compose exec redis redis-cli ping
# Sollte "PONG" zurückgeben

# Container Status
docker compose ps
# Alle Container sollten "healthy" Status haben
```

## 7. Reverse Proxy konfigurieren (Optional, empfohlen)

Für Production wird empfohlen, einen Reverse Proxy (z.B. Nginx oder Caddy) vor die Anwendung zu setzen.

### 7.1 Nginx Beispiel-Konfiguration

```nginx
server {
    listen 80;
    server_name airport.deine-domain.de;

    # Redirect auf HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name airport.deine-domain.de;

    # SSL Zertifikate (z.B. von Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/airport.deine-domain.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/airport.deine-domain.de/privkey.pem;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Proxy zu Docker Container
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket Support
    location /api/ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

### 7.2 Caddy Beispiel-Konfiguration

```caddyfile
airport.deine-domain.de {
    reverse_proxy localhost:3000

    # Caddy kümmert sich automatisch um HTTPS mit Let's Encrypt
}
```

## 8. GitHub Actions für automatisches Deployment (Optional)

Du kannst GitHub Actions verwenden, um automatisch auf deinen Server zu deployen.

### 8.1 SSH Key Setup

```bash
# Auf dem Server: SSH Key für Deployment erstellen
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys

# Private Key für GitHub Actions kopieren
cat ~/.ssh/github_deploy
```

### 8.2 GitHub Secrets einrichten

Gehe zu deinem Repository auf GitHub:
1. Settings → Secrets and variables → Actions
2. Füge folgende Secrets hinzu:
   - `DEPLOY_HOST`: Deine Server IP oder Domain
   - `DEPLOY_USER`: SSH Username
   - `DEPLOY_KEY`: Privater SSH Key (Inhalt von `~/.ssh/github_deploy`)
   - `ENV_FILE`: Komplette .env Datei als Secret

### 8.3 GitHub Actions Workflow erstellen

Erstelle `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Deploy to Server
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_KEY }}
          script: |
            cd /opt/airport-db
            git pull origin main

            # Update .env file
            echo "${{ secrets.ENV_FILE }}" > .env
            chmod 600 .env

            # Rebuild and restart containers
            docker compose down
            docker compose up -d --build

            # Cleanup old images
            docker image prune -af

            # Show status
            docker compose ps
```

## 9. Wartung und Monitoring

### 9.1 Logs ansehen

```bash
# Alle Logs
docker compose logs -f

# Nur App Logs
docker compose logs -f app

# Nur Redis Logs
docker compose logs -f redis

# Letzte 100 Zeilen
docker compose logs --tail=100
```

### 9.2 Container neustarten

```bash
# Alle Container
docker compose restart

# Nur App
docker compose restart app

# Nur Redis
docker compose restart redis
```

### 9.3 Updates einspielen

```bash
cd /opt/airport-db

# Code aktualisieren
git pull origin main

# Container neu bauen und starten
docker compose down
docker compose up -d --build

# Aufräumen
docker system prune -f
```

### 9.4 Backups

#### Redis Daten sichern

```bash
# Redis Backup erstellen
docker compose exec redis redis-cli BGSAVE

# Redis Daten kopieren (Volume)
docker run --rm \
  -v airport-db_redis-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/redis-backup-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .
```

#### Backup automatisieren (Cronjob)

```bash
# Cronjob erstellen
crontab -e

# Täglich um 2 Uhr morgens Backup
0 2 * * * cd /opt/airport-db && docker run --rm -v airport-db_redis-data:/data -v /opt/airport-db/backups:/backup alpine tar czf /backup/redis-backup-$(date +\%Y\%m\%d-\%H\%M\%S).tar.gz -C /data .
```

### 9.5 Ressourcen überwachen

```bash
# Container Ressourcennutzung
docker stats

# Disk Usage
docker system df
```

## 10. Troubleshooting

### Container startet nicht

```bash
# Detaillierte Logs
docker compose logs app

# Container Status
docker compose ps

# Inspect Container
docker inspect airport-db-app
```

### Redis Connection Fehler

```bash
# Redis erreichbar?
docker compose exec app ping redis

# Redis Logs
docker compose logs redis

# Redis CLI
docker compose exec redis redis-cli ping
```

### Port bereits belegt

```bash
# Überprüfe welcher Prozess Port 3000 nutzt
sudo lsof -i :3000

# Oder mit ss
sudo ss -tlnp | grep 3000

# Ändere Port in docker-compose.yml:
# ports:
#   - '8080:3000'  # Host:Container
```

### Out of Memory

```bash
# Erhöhe Redis Memory Limit in docker-compose.yml:
# command: >
#   redis-server
#   --maxmemory 512mb

# Oder deaktiviere Redis
# USE_IN_MEMORY_CACHE_FALLBACK=true in .env
```

## 11. Sicherheitshinweise

1. **Firewall konfigurieren**: Nur notwendige Ports öffnen (80, 443, optional 22 für SSH)
2. **Fail2ban einrichten**: Schutz vor Brute-Force-Angriffen
3. **Regelmäßige Updates**: System und Docker Images aktuell halten
4. **Secrets rotieren**: API Keys und Passwörter regelmäßig ändern
5. **Monitoring einrichten**: Nutze Tools wie Prometheus, Grafana oder Uptimerobot
6. **Backups testen**: Regelmäßig Wiederherstellung testen

## 12. Performance-Optimierung

### 12.1 Redis Memory Tuning

```yaml
# In docker-compose.yml
command: >
  redis-server
  --maxmemory 512mb
  --maxmemory-policy allkeys-lru
```

### 12.2 App Resources

```yaml
# In docker-compose.yml unter app:
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
    reservations:
      cpus: '1'
      memory: 1G
```

## Support

Bei Problemen:
1. Überprüfe die Logs: `docker compose logs -f`
2. Erstelle ein Issue auf GitHub
3. Konsultiere die Dokumentation in `/docs`

---

**Viel Erfolg mit dem Deployment! 🚀**
