# Deploy Completo - Version2 DNS Monitor
## Debian 12 com Nginx

Este guia cobre a instalação completa do sistema de monitoramento DNS.

---

## 🚀 Instalação Automática (Recomendada)

Execute como root:

```bash
curl -sSL https://seu-dominio.com/install-web.sh | sudo bash
```

O script irá:
- Instalar Node.js 20+
- Instalar e configurar Nginx
- Clonar o repositório
- Fazer o build
- Configurar SSL com Certbot
- Criar scripts de atualização

---

## 📋 Instalação Manual Passo a Passo

### 1. Preparação do Sistema

```bash
# Atualizar sistema
apt update && apt upgrade -y

# Instalar dependências básicas
apt install -y curl git build-essential nginx certbot python3-certbot-nginx ufw
```

### 2. Instalar Node.js 20

```bash
# Via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Verificar instalação
node --version  # Deve mostrar v20.x.x
npm --version
```

### 3. Clonar e Build da Aplicação

```bash
# Criar diretório
mkdir -p /var/www/version2-dns
cd /var/www/version2-dns

# Clonar repositório (substitua pela URL real)
git clone https://github.com/seu-usuario/seu-repo.git .

# Instalar dependências
npm install

# Criar arquivo de ambiente
cat > .env << 'EOF'
VITE_SUPABASE_URL=https://qtdorkjllvsbfcwbigpo.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0ZG9ya2psbHZzYmZjd2JpZ3BvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMjkzNDMsImV4cCI6MjA4MjYwNTM0M30.4GIRHWiBwuHMKSPKAhDy3Q3X5ie48wAiL0FGExhfNPE
VITE_SUPABASE_PROJECT_ID=qtdorkjllvsbfcwbigpo
EOF

# Build da aplicação
npm run build
```

### 4. Configurar Nginx

```bash
# Criar configuração do site
cat > /etc/nginx/sites-available/version2-dns << 'EOF'
server {
    listen 80;
    server_name seu-dominio.com www.seu-dominio.com;

    root /var/www/version2-dns/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 256;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Serve static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Agent script - no cache
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

# Ativar site
ln -sf /etc/nginx/sites-available/version2-dns /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar e recarregar
nginx -t && systemctl reload nginx
```

### 5. Configurar SSL (HTTPS)

```bash
# Obter certificado SSL
certbot --nginx -d seu-dominio.com -d www.seu-dominio.com --non-interactive --agree-tos -m seu-email@email.com

# Configurar renovação automática
systemctl enable certbot.timer
```

### 6. Configurar Firewall (UFW)

```bash
# Habilitar UFW
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

# Verificar status
ufw status
```

### 7. Script de Atualização

```bash
cat > /usr/local/bin/update-version2 << 'EOF'
#!/bin/bash
cd /var/www/version2-dns
git pull
npm install
npm run build
systemctl reload nginx
echo "Atualização concluída em $(date)"
EOF

chmod +x /usr/local/bin/update-version2
```

---

## 🔧 Instalação do Agente DNS

Nos servidores DNS que você deseja monitorar, execute:

```bash
curl -sSL https://seu-dominio.com/dns-agent.sh | bash -s install SEU_TOKEN
```

O token é gerado automaticamente ao adicionar um servidor na interface web.

### O que o agente faz:
- Verifica conexão a cada 30 segundos
- Executa comandos enviados pela interface web
- Monitora BIND9, nftables, FRR
- Testa porta DNS 53
- Reporta status de volta

### Gerenciar o agente:

```bash
# Ver status
systemctl status dns-agent

# Ver logs
journalctl -u dns-agent -f

# Parar
systemctl stop dns-agent

# Desinstalar
curl -sSL https://seu-dominio.com/dns-agent.sh | bash -s uninstall
```

---

## 📊 Funcionalidades do Sistema

### Dashboard
- **Monitoramento em tempo real**: Ping e porta 53
- **Status visual**: Online/Offline/DNS Error
- **Latência**: Tempo de resposta em ms
- **Auto-refresh**: Atualiza a cada 60 segundos

### Gerenciamento de Servidores
- Adicionar novos servidores DNS
- Configurar firewall (IPs permitidos para SSH e DNS)
- Configurar Anycast/OSPF (loopbacks)
- Instalar DNS automaticamente via agente

### Edge Functions (Backend)
- `monitor-dns-server`: Verifica ping e porta 53
- `agent-command`: Comunicação com agentes
- `install-dns-server`: Instalação automática do DNS

---

## 🔍 Troubleshooting

### Nginx não inicia
```bash
nginx -t  # Verificar erros de config
journalctl -u nginx -f  # Ver logs
```

### Build falha
```bash
rm -rf node_modules
npm install
npm run build
```

### Agente não conecta
```bash
# No servidor DNS, verificar:
curl -v https://seu-dominio.com/dns-agent.sh
systemctl status dns-agent
journalctl -u dns-agent --since "1 hour ago"
```

### Monitoramento não funciona
- Verifique se a porta 53 está aberta no servidor DNS
- Verifique se o firewall permite conexões TCP na porta 53
- Logs no painel Cloud do Lovable

---

## 📁 Estrutura de Arquivos

```
/var/www/version2-dns/
├── dist/               # Build de produção
│   ├── index.html
│   ├── assets/
│   ├── dns-agent.sh    # Script do agente
│   └── install-web.sh  # Script de instalação
├── .env                # Variáveis de ambiente
└── package.json
```

---

## ✅ Checklist Pós-Instalação

- [ ] Sistema acessível via HTTPS
- [ ] Login funcionando
- [ ] Adicionar primeiro servidor DNS
- [ ] Instalar agente no servidor DNS
- [ ] Verificar monitoramento (ping e porta 53)
- [ ] Configurar firewall no painel
- [ ] Testar instalação automática do DNS

---

## 📞 Suporte

- WhatsApp: (19) 9 8760-1686
- Email: contato@version2.com.br
