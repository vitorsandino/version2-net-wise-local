#!/bin/bash

set -e

echo "============================================"
echo "  Version2 NetWise - Instalação Local"
echo "  Sistema de Gerenciamento de Infraestrutura"
echo "============================================"
echo ""

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then 
  echo "❌ Este script precisa ser executado como root (use sudo)"
  exit 1
fi

# Verificar Debian 12
if ! grep -q "bookworm" /etc/os-release 2>/dev/null; then
    echo "⚠️  AVISO: Este script foi testado apenas no Debian 12 (Bookworm)"
    read -p "Deseja continuar mesmo assim? (s/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        exit 1
    fi
fi

echo "✅ Sistema operacional verificado"
echo ""

# Atualizar sistema
echo "📦 Atualizando sistema..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
echo "✅ Sistema atualizado"
echo ""

# Instalar Docker
if ! command -v docker &> /dev/null; then
    echo "🐳 Instalando Docker..."
    apt-get install -y -qq ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    systemctl enable docker
    systemctl start docker
    
    echo "✅ Docker instalado"
else
    echo "✅ Docker já instalado"
fi
echo ""

# Instalar Git
if ! command -v git &> /dev/null; then
    echo "📥 Instalando Git..."
    apt-get install -y -qq git
    echo "✅ Git instalado"
else
    echo "✅ Git já instalado"
fi
echo ""

# Clonar ou atualizar repositório
INSTALL_DIR="/opt/version2-netwise"

if [ -d "$INSTALL_DIR" ]; then
    echo "📂 Diretório de instalação já existe"
    read -p "Deseja atualizar o código? (s/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        echo "🔄 Atualizando código..."
        cd "$INSTALL_DIR"
        git pull
        echo "✅ Código atualizado"
    fi
else
    echo "📥 Clonando repositório..."
    git clone https://github.com/vitorsandino/version2-net-wise-local.git "$INSTALL_DIR"
    echo "✅ Repositório clonado"
fi
echo ""

cd "$INSTALL_DIR"

# Configurar arquivo .env
if [ ! -f ".env" ]; then
    echo "⚙️  Configurando variáveis de ambiente..."
    cp .env.example .env
    
    # Gerar senhas e chaves aleatórias
    DB_PASSWORD=$(openssl rand -hex 32)
    JWT_SECRET=$(openssl rand -hex 64)
    ENCRYPTION_KEY=$(openssl rand -hex 64)
    
    # Detectar IP do servidor
    SERVER_IP=$(hostname -I | awk '{print $1}')
    
    # Atualizar .env
    sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" .env
    sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
    sed -i "s/ENCRYPTION_KEY=.*/ENCRYPTION_KEY=$ENCRYPTION_KEY/" .env
    sed -i "s|API_URL=.*|API_URL=http://$SERVER_IP:3000|" .env
    sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=http://$SERVER_IP|" .env
    sed -i "s|VITE_API_URL=.*|VITE_API_URL=http://$SERVER_IP:3000/api|" .env
    
    echo "✅ Arquivo .env configurado"
    echo ""
    echo "📝 Credenciais geradas:"
    echo "   Banco de Dados: version2_netwise"
    echo "   Usuário DB: version2"
    echo "   Senha DB: $DB_PASSWORD"
    echo ""
    echo "⚠️  IMPORTANTE: Salve estas credenciais em local seguro!"
    echo ""
else
    echo "✅ Arquivo .env já existe"
fi
echo ""

# Configurar firewall
echo "🔒 Configurando firewall..."
apt-get install -y -qq nftables

cat > /etc/nftables.conf << 'NFTEOF'
#!/usr/sbin/nft -f
flush ruleset

table inet filter {
    chain input {
        type filter hook input priority 0; policy drop;
        ct state established,related accept
        iif lo accept
        ip protocol icmp accept
        ip6 nexthdr icmpv6 accept
        tcp dport { 22, 80, 443, 3000 } accept
        counter log prefix "[nftables-drop] " drop
    }
    chain forward {
        type filter hook forward priority 0; policy drop;
    }
    chain output {
        type filter hook output priority 0; policy accept;
    }
}
NFTEOF

systemctl enable nftables
systemctl restart nftables
echo "✅ Firewall configurado"
echo ""

# Iniciar aplicação
echo "🚀 Iniciando aplicação..."
docker compose down 2>/dev/null || true
docker compose up -d --build

echo ""
echo "⏳ Aguardando serviços iniciarem..."
sleep 10

# Verificar status
if docker compose ps | grep -q "Up"; then
    echo "✅ Aplicação iniciada com sucesso!"
    echo ""
    echo "============================================"
    echo "  🎉 Instalação Concluída!"
    echo "============================================"
    echo ""
    echo "📍 Acesse a aplicação em:"
    echo "   http://$(hostname -I | awk '{print $1}')"
    echo ""
    echo "📚 Comandos úteis:"
    echo "   Ver logs:      docker compose logs -f"
    echo "   Parar:         docker compose down"
    echo "   Reiniciar:     docker compose restart"
    echo "   Status:        docker compose ps"
    echo ""
    echo "👤 Primeiro acesso:"
    echo "   1. Acesse a URL acima"
    echo "   2. Clique em 'Registrar'"
    echo "   3. Crie sua conta de administrador"
    echo ""
else
    echo "❌ Erro ao iniciar aplicação"
    echo "Verifique os logs com: docker compose logs"
    exit 1
fi
