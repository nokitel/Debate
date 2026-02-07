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

## 4. Deploy Production Stack

Clone repo and configure environment on VPS:

```bash
cd /opt
git clone https://github.com/<your-org>/dialectical-engine.git
cd dialectical-engine

# Create production environment
cp .env.example .env.production
# Edit .env.production with production values:
# - NEO4J_PASSWORD (strong random)
# - NEXTAUTH_SECRET (openssl rand -base64 32)
# - OLLAMA_BASE_URL=http://100.x.x.x:11434  (Mac Mini Tailscale IP)
# - MULTIVERSX_API_URL=https://devnet-api.multiversx.com
# - CONTRACT_ADDRESS=<deployed contract>
# - DOMAIN=dezbatere.ro
# - All API keys (Anthropic, OpenAI, xMoney, etc.)
```

Start the stack:
```bash
docker compose -f docker-compose.prod.yml up -d
```

## 5. SSL Certificate

```bash
# Install certbot
apt install certbot

# Get certificate (stop nginx first)
docker compose -f docker-compose.prod.yml stop nginx
certbot certonly --standalone -d dezbatere.ro -d www.dezbatere.ro
docker compose -f docker-compose.prod.yml start nginx

# Auto-renewal
echo "0 3 * * * certbot renew --pre-hook 'docker compose -f /opt/dialectical-engine/docker-compose.prod.yml stop nginx' --post-hook 'docker compose -f /opt/dialectical-engine/docker-compose.prod.yml start nginx'" | crontab -
```

## 6. MultiversX Devnet Setup

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

## 7. Health Checks

```bash
# Full stack health
curl -s https://dezbatere.ro/health          # Frontend
curl -s https://dezbatere.ro/api/health       # Backend
curl -s http://100.x.x.x:11434/api/tags      # Ollama (via Tailscale)

# Neo4j
docker compose -f docker-compose.prod.yml exec neo4j cypher-shell "RETURN 1"

# MultiversX contract
curl -s "https://devnet-api.multiversx.com/accounts/<contract-address>"
```

## 8. Monitoring & Logs

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f neo4j

# Resource usage
docker stats
htop
```

## 9. Deployment Updates

Via GitHub Actions (automatic on release tag):
```bash
git tag v0.1.0
git push origin v0.1.0
# CI builds, tests, SSHes into VPS, pulls images, restarts
```

Manual deployment:
```bash
ssh root@<server-ip>
cd /opt/dialectical-engine
git pull origin main
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

Rollback:
```bash
git checkout v0.0.9
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
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
