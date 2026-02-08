# Deployment Guide

Step-by-step guide for deploying the Dialectical Engine to production.

## Architecture Overview

```
[Users] → [Cloudflare DNS] → [Hetzner CX33 VPS (Nuremberg)]
                                  ├── Nginx (TLS + reverse proxy)
                                  ├── Next.js frontend (port 3000)
                                  ├── Node.js backend (port 4000)
                                  ├── Neo4j (port 7687)
                                  └── Tailscale tunnel → [Mac Mini M4 (Home)]
                                                            └── Ollama (port 11434)
```

## Prerequisites

- Hetzner Cloud account
- Domain: dezbatere.ro (configured at registrar)
- Mac Mini M4 16GB (home network, running Ollama)
- Tailscale account
- GitHub repository with CI/CD configured
- MultiversX devnet wallet with EGLD for relayer gas

## 1. Provision Hetzner CX33

```bash
# Via Hetzner Cloud Console or CLI:
# - Location: Nuremberg (nbg1) or Falkenstein (fsn1)
# - Image: Ubuntu 24.04 LTS
# - Type: CX33 (4 vCPU, 8GB RAM, 80GB NVMe)
# - SSH key: add your public key
# - Enable automatic backups (+€1.10/mo)

# After provisioning:
ssh root@<server-ip>

# Secure SSH
sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd

# Configure firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Install Docker
curl -fsSL https://get.docker.com | sh
apt install docker-compose-plugin

# Verify
docker --version
docker compose version
```

## 2. Configure DNS

At your domain registrar (dezbatere.ro):

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | `<hetzner-ip>` | 300 |
| A | www | `<hetzner-ip>` | 300 |
| AAAA | @ | `<hetzner-ipv6>` | 300 |
| AAAA | www | `<hetzner-ipv6>` | 300 |
| CAA | @ | `0 issue "letsencrypt.org"` | 3600 |

## 3. Set Up Tailscale Tunnel

On the **Hetzner VPS**:
```bash
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up --ssh
# Note the Tailscale IP (100.x.x.x)
```

On the **Mac Mini M4**:
```bash
# Install Tailscale from https://tailscale.com/download/mac
tailscale up
# Note the Tailscale IP (100.x.x.x)

# Configure Ollama for Tailscale access
export OLLAMA_HOST=0.0.0.0:11434
export OLLAMA_MAX_LOADED_MODELS=1

# Pull required models
ollama pull qwen2.5:latest
ollama pull mistral-nemo:latest
ollama pull gemma2:latest
ollama pull deepseek-r1:8b-distill-q4
ollama pull nomic-embed-text
```

Verify connectivity from VPS:
```bash
curl http://100.x.x.x:11434/api/tags  # Should list pulled models
```

## 4. Environment Variables

Create `.env.production` on the VPS with all required variables:

```bash
cd /opt/dialectical-engine
cp .env.example .env.production
```

### Required Variables Checklist

| Variable | Description | Example |
|----------|-------------|---------|
| `DOMAIN` | Production domain | `dezbatere.ro` |
| `NEO4J_URI` | Neo4j connection (use Docker service name) | `bolt://neo4j:7687` |
| `NEO4J_USER` | Neo4j username | `neo4j` |
| `NEO4J_PASSWORD` | Neo4j password (strong random) | `openssl rand -hex 24` |
| `NEO4J_MAX_POOL_SIZE` | Connection pool (30 for prod 2GB heap) | `30` |
| `NEXTAUTH_SECRET` | Auth.js secret | `openssl rand -base64 32` |
| `FRONTEND_URL` | Frontend URL for CORS | `https://dezbatere.ro` |
| `OLLAMA_BASE_URL` | Ollama via Tailscale | `http://100.x.x.x:11434` |
| `OLLAMA_MAX_LOADED_MODELS` | Sequential model loading | `1` |
| `MULTIVERSX_API_URL` | MultiversX network | `https://devnet-api.multiversx.com` |
| `CONTRACT_ADDRESS` | Smart contract address | `erd1qqqq...` |
| `RELAYER_PEM_PATH` | Path to relayer PEM (Docker secret) | `/run/secrets/relayer_pem` |
| `XMONEY_API_KEY` | xMoney payment API key | `xm_...` |
| `XMONEY_WEBHOOK_SECRET` | xMoney webhook HMAC secret | `whsec_...` |
| `ANTHROPIC_API_KEY` | Anthropic API key (optional, for cloud models) | `sk-ant-...` |
| `OPENAI_API_KEY` | OpenAI API key (optional, for cloud models) | `sk-...` |
| `AGENT_API_KEY` | AI agent API key | `agent_...` |

## 5. Deploy Production Stack

### Docker Compose Commands

```bash
# Start all services
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# View status
docker compose -f docker-compose.prod.yml ps

# View logs (all services)
docker compose -f docker-compose.prod.yml logs -f

# View logs (specific service)
docker compose -f docker-compose.prod.yml logs -f backend

# Rebuild and restart a specific service
docker compose -f docker-compose.prod.yml build backend
docker compose -f docker-compose.prod.yml up -d backend

# Stop all services
docker compose -f docker-compose.prod.yml down

# Full rebuild (no cache)
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d --remove-orphans
```

### Service Details

| Service | Image | Port | Health Check |
|---------|-------|------|-------------|
| `nginx` | nginx:1.27-alpine | 80, 443 | HTTP GET /health |
| `frontend` | Custom (Next.js standalone) | 3000 | HTTP GET / |
| `backend` | Custom (Node.js) | 4000 | HTTP GET /health |
| `neo4j` | neo4j:5.27-community | 7687 | HTTP GET :7474 |

### Neo4j Production Tuning

| Setting | Value | Rationale |
|---------|-------|-----------|
| Initial heap | 1GB | Adequate for startup |
| Max heap | 2GB | Fits in CX33's 8GB with room for app + OS |
| Page cache | 512MB | Covers working set for <10K nodes |
| Max pool size | 30 | Matches `NEO4J_MAX_POOL_SIZE` env |

## 6. SSL Certificate

```bash
# Install certbot
apt install certbot

# Get certificate (stop nginx first)
docker compose -f docker-compose.prod.yml stop nginx
certbot certonly --standalone -d dezbatere.ro -d www.dezbatere.ro
docker compose -f docker-compose.prod.yml start nginx

# Auto-renewal cron job
echo "0 3 * * * certbot renew --pre-hook 'docker compose -f /opt/dialectical-engine/docker-compose.prod.yml stop nginx' --post-hook 'docker compose -f /opt/dialectical-engine/docker-compose.prod.yml start nginx'" | crontab -
```

## 7. MultiversX Devnet Setup

```bash
# On VPS: store relayer keyfile securely
mkdir -p /opt/dialectical-engine/secrets
# Copy relayer PEM file (never commit to git)
chmod 600 /opt/dialectical-engine/secrets/relayer.pem

# Verify relayer has devnet EGLD
# Use faucet: https://devnet-wallet.multiversx.com/faucet

# Deploy smart contract (from development machine)
cd packages/contracts/dialectical-payments
sc-meta all build
mxpy contract deploy \
  --bytecode output/dialectical-payments.wasm \
  --pem /path/to/owner.pem \
  --chain D --proxy https://devnet-gateway.multiversx.com \
  --gas-limit 60000000 \
  --recall-nonce --send

# Note the contract address → add to .env.production
```

## 8. CI/CD Pipeline

### Continuous Integration (`.github/workflows/ci.yml`)

Runs on every push to `main` and every PR:
1. Install dependencies (`pnpm install --frozen-lockfile`)
2. Build all packages (`pnpm turbo build`)
3. Type checking (`pnpm turbo typecheck`)
4. Lint (`pnpm turbo lint`)
5. Unit + integration tests (`pnpm turbo test`)

### Continuous Deployment (`.github/workflows/deploy.yml`)

Triggered by pushing a version tag (`v*`):
1. Build and test (same as CI)
2. SSH into VPS
3. Checkout tag
4. `docker compose build --no-cache`
5. `docker compose up -d --remove-orphans`
6. Health check verification

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | Hetzner VPS IP address |
| `VPS_USER` | SSH user (typically `root`) |
| `VPS_SSH_KEY` | Private SSH key for VPS access |

### Creating a Release

```bash
# Tag and push
git tag v0.1.0
git push origin v0.1.0
# Deploy workflow triggers automatically
```

## 9. Health Checks

```bash
# Full stack health
curl -s https://dezbatere.ro/health          # Backend via nginx
curl -s https://dezbatere.ro/api/trpc        # tRPC API
curl -s http://100.x.x.x:11434/api/tags      # Ollama (via Tailscale)

# Neo4j
docker compose -f docker-compose.prod.yml exec neo4j cypher-shell "RETURN 1"

# MultiversX contract
curl -s "https://devnet-api.multiversx.com/accounts/<contract-address>"

# Security headers
curl -I https://dezbatere.ro/health | grep -i "strict-transport\|content-security\|x-content-type"

# API docs
curl -s https://dezbatere.ro/api/docs/openapi.json | head -5
```

## 10. Monitoring & Logs

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f neo4j

# Resource usage
docker stats
htop

# Disk usage
df -h
docker system df
```

## 11. Backup Strategy

### Neo4j Data

```bash
# Create backup (stop writes first)
docker compose -f docker-compose.prod.yml exec neo4j neo4j-admin database dump neo4j --to-path=/backups
docker cp $(docker compose -f docker-compose.prod.yml ps -q neo4j):/backups/neo4j.dump ./backups/

# Automated daily backup (cron)
echo "0 2 * * * docker compose -f /opt/dialectical-engine/docker-compose.prod.yml exec -T neo4j neo4j-admin database dump neo4j --to-path=/backups && docker cp \$(docker compose -f /opt/dialectical-engine/docker-compose.prod.yml ps -q neo4j):/backups/neo4j.dump /opt/backups/neo4j-\$(date +%Y%m%d).dump" | crontab -
```

### Hetzner Automatic Backups

Enabled at provisioning (+€1.10/mo). Covers full VPS snapshots.

### Backup Retention

- Daily Neo4j dumps: keep 7 days
- Hetzner snapshots: automatic (managed by Hetzner)
- Environment files: manual backup to secure location

## 12. Rollback Procedure

```bash
# 1. Check current running version
docker compose -f docker-compose.prod.yml exec backend node -e "console.log(require('./package.json').version)"

# 2. List available tags
git tag -l "v*" --sort=-v:refname | head -5

# 3. Roll back to previous version
git checkout v0.0.9
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d --remove-orphans

# 4. Verify health
curl -sf https://dezbatere.ro/health

# 5. If Neo4j data needs rollback, restore from backup
docker compose -f docker-compose.prod.yml stop neo4j
docker cp ./backups/neo4j-20260207.dump $(docker compose -f docker-compose.prod.yml ps -q neo4j):/backups/
docker compose -f docker-compose.prod.yml exec neo4j neo4j-admin database load neo4j --from-path=/backups --overwrite-destination
docker compose -f docker-compose.prod.yml start neo4j
```

## Cost Summary

| Item | Monthly Cost |
|------|-------------|
| Hetzner CX33 (4 vCPU, 8GB, 80GB NVMe) | €5.49 |
| Hetzner automatic backups | €1.10 |
| Mac Mini M4 amortization (36 months) | ~€13 |
| Electricity (Mac Mini 24/7) | ~€2.50 |
| Domain (dezbatere.ro) | ~€1 |
| MultiversX relayer gas + on-chain storage | ~€3–5 |
| **Total** | **~€26–28/month** |
