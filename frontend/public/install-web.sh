#!/bin/bash
# =============================================================================
# Version2 DNS Monitor - Instalador Automático
# Para Debian 12
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[AVISO]${NC} $1"; }
log_error() { echo -e "${RED}[ERRO]${NC} $1"; }

# Verificar root
if [ "$EUID" -ne 0 ]; then
    log_error "Execute como root: sudo bash $0"
    exit 1
fi

# Verificar Debian
if ! grep -q "Debian" /etc/os-release 2>/dev/null; then
    log_warn "Este script foi testado apenas no Debian 12"
fi

echo ""
echo "========================================"
echo "  Version2 DNS Monitor - Instalador"
echo "========================================"
echo ""

# Repositório fixo via SSH
REPO_URL="git@github.com:vitorsandino/version2-net-wise.git"

# Solicitar informações
read -p "Domínio do site (ex: dns.version2.com.br): " DOMAIN
read -p "Email para SSL (ex: admin@version2.com.br): " EMAIL

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    log_error "Domínio e email são obrigatórios!"
    exit 1
fi

INSTALL_DIR="/var/www/version2-dns"

log_info "Atualizando sistema..."
apt update && apt upgrade -y

log_info "Instalando dependências..."
apt install -y curl git build-essential nginx certbot python3-certbot-nginx ufw

log_info "Instalando Node.js 20..."
if ! command -v node &> /dev/null || [[ $(node -v | cut -d. -f1 | tr -d 'v') -lt 20 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi
log_success "Node.js $(node -v) instalado"

log_info "Clonando repositório via SSH..."
rm -rf "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR"

# Verificar se existe chave SSH
if [ ! -f "$HOME/.ssh/id_rsa" ] && [ ! -f "$HOME/.ssh/id_ed25519" ]; then
    log_warn "Chave SSH não encontrada. Gerando nova chave..."
    ssh-keygen -t ed25519 -f "$HOME/.ssh/id_ed25519" -N "" -q
    log_info "Chave pública gerada. Adicione ao GitHub/GitLab:"
    echo ""
    cat "$HOME/.ssh/id_ed25519.pub"
    echo ""
    read -p "Pressione ENTER após adicionar a chave ao repositório..."
fi

# Adicionar GitHub ao known_hosts
ssh-keyscan -H github.com >> "$HOME/.ssh/known_hosts" 2>/dev/null || true
ssh-keyscan -H gitlab.com >> "$HOME/.ssh/known_hosts" 2>/dev/null || true

git clone "$REPO_URL" "$INSTALL_DIR"
cd "$INSTALL_DIR"

log_info "Criando arquivo .env..."
cat > .env << EOF
VITE_SUPABASE_URL=https://qtdorkjllvsbfcwbigpo.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0ZG9ya2psbHZzYmZjd2JpZ3BvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMjkzNDMsImV4cCI6MjA4MjYwNTM0M30.4GIRHWiBwuHMKSPKAhDy3Q3X5ie48wAiL0FGExhfNPE
VITE_SUPABASE_PROJECT_ID=qtdorkjllvsbfcwbigpo
EOF

log_info "Instalando dependências Node..."
npm install --legacy-peer-deps

log_info "Fazendo build..."
npm run build

log_info "Configurando Nginx..."
cat > /etc/nginx/sites-available/version2-dns << EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    root ${INSTALL_DIR}/dist;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 256;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /dns-agent.sh {
        add_header Content-Type text/plain;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    location /install-web.sh {
        add_header Content-Type text/plain;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
EOF

ln -sf /etc/nginx/sites-available/version2-dns /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

log_info "Configurando SSL..."
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" || {
    log_warn "SSL falhou - configure manualmente depois"
}
systemctl enable certbot.timer

log_info "Configurando firewall..."
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

log_info "Criando script de atualização..."
cat > /usr/local/bin/update-version2 << 'UPDATEEOF'
#!/bin/bash
cd /var/www/version2-dns
git pull
npm install
npm run build
systemctl reload nginx
echo "Atualização concluída em $(date)"
UPDATEEOF
chmod +x /usr/local/bin/update-version2

echo ""
echo "========================================"
log_success "INSTALAÇÃO CONCLUÍDA!"
echo "========================================"
echo ""
echo "Acesse: https://${DOMAIN}"
echo ""
echo "Para atualizar: update-version2"
echo ""
echo "Para instalar o agente DNS em um servidor:"
echo "curl -sSL https://${DOMAIN}/dns-agent.sh | bash -s install SEU_TOKEN"
echo ""
