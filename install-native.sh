#!/bin/bash

set -e

INSTALL_DIR="/opt/version2-netwise"

echo "============================================"
echo "  Version2 NetWise - Instalação NATIVA"
echo "  (Sem Docker - Debian 12)"
echo "============================================"

if [ "$EUID" -ne 0 ]; then 
  echo "❌ Execute como root (sudo)"
  exit 1
fi

# 1. Instalar dependências do sistema
echo "📦 Instalando dependências do sistema..."
apt-get update -qq
apt-get install -y -qq curl git postgresql postgresql-contrib nginx build-essential

# 2. Instalar Node.js 20
if ! command -v node &> /dev/null; then
    echo "🟢 Instalando Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y -qq nodejs
fi

# 3. Clonar repositório se não existir
if [ ! -d "$INSTALL_DIR" ]; then
    echo "📥 Clonando repositório para $INSTALL_DIR..."
    git clone https://github.com/vitorsandino/version2-net-wise-local.git "$INSTALL_DIR"
else
    echo "📂 Diretório $INSTALL_DIR já existe, atualizando..."
    cd "$INSTALL_DIR"
    git pull
fi

cd "$INSTALL_DIR"

# 4. Configurar PostgreSQL
echo "🐘 Configurando PostgreSQL..."
# Garantir que o serviço está rodando
systemctl start postgresql
sudo -u postgres psql -c "CREATE USER version2 WITH PASSWORD 'version2_pass';" || true
sudo -u postgres psql -c "CREATE DATABASE version2_netwise OWNER version2;" || true
sudo -u postgres psql -d version2_netwise -f "$INSTALL_DIR/backend/database/schema.sql"

# 5. Instalar dependências do Backend
echo "🚀 Configurando Backend..."
cd "$INSTALL_DIR/backend"
npm install
if [ ! -f ".env" ]; then
    cp .env.example .env
    # Gerar chaves
    JWT_SECRET=$(openssl rand -hex 64)
    ENCRYPTION_KEY=$(openssl rand -hex 64)
    sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
    sed -i "s/ENCRYPTION_KEY=.*/ENCRYPTION_KEY=$ENCRYPTION_KEY/" .env
    sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=version2_pass/" .env
    sed -i "s/DB_HOST=.*/DB_HOST=localhost/" .env
fi

# 6. Instalar dependências do Frontend e Build
echo "💻 Configurando Frontend..."
cd "$INSTALL_DIR/frontend"
npm install
if [ ! -f ".env" ]; then
    cp .env.example .env
    # Detectar IP
    SERVER_IP=$(hostname -I | awk '{print $1}')
    sed -i "s|VITE_API_URL=.*|VITE_API_URL=http://$SERVER_IP:3000/api|" .env
fi
npm run build

# 7. Configurar Nginx
echo "🌐 Configurando Nginx..."
cat > /etc/nginx/sites-available/version2-netwise << EOF
server {
    listen 80;
    server_name _;
    root $INSTALL_DIR/frontend/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/version2-netwise /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl restart nginx

# 8. Criar serviço Systemd para o Backend
echo "⚙️ Criando serviço systemd..."
cat > /etc/systemd/system/v2-backend.service << EOF
[Unit]
Description=Version2 NetWise Backend
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR/backend
ExecStart=/usr/bin/node src/server.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable v2-backend
systemctl start v2-backend

echo ""
echo "============================================"
echo "✅ Instalação Nativa Concluída!"
echo "📍 Acesse: http://$(hostname -I | awk '{print $1}')"
echo "============================================"
