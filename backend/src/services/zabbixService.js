import { NodeSSH } from 'node-ssh';
import pool from '../config/database.js';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

function decryptPassword(encryptedPassword) {
  const parts = encryptedPassword.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex'), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function connectSSH(server) {
  const ssh = new NodeSSH();
  const password = decryptPassword(server.ssh_password_encrypted);
  
  await ssh.connect({
    host: server.ipv4,
    port: server.ssh_port || 22,
    username: server.ssh_user,
    password: password,
    tryKeyboard: true,
  });

  return ssh;
}

function generateZabbixInstallScript(server, apiUrl) {
  return `#!/bin/bash
set -e

echo "============================================"
echo "  Zabbix Server Installation"
echo "  Servidor: ${server.name}"
echo "  IP: ${server.ipv4}"
echo "============================================"

export DEBIAN_FRONTEND=noninteractive

# Verificar Debian 12
if ! grep -q "bookworm" /etc/os-release 2>/dev/null; then
    echo "ERRO: Requer Debian 12 (Bookworm)"
    exit 1
fi
echo "[OK] Debian 12 confirmado"

# Atualizar sistema
echo ""
echo "=== Atualizando sistema ==="
apt-get update -qq
apt-get upgrade -y -qq
echo "[OK] Sistema atualizado"

# Instalar dependências
echo ""
echo "=== Instalando dependências ==="
apt-get install -y -qq wget curl gnupg2 software-properties-common apt-transport-https ca-certificates
echo "[OK] Dependências instaladas"

# Adicionar repositório Zabbix
echo ""
echo "=== Configurando repositório Zabbix ==="
wget -q https://repo.zabbix.com/zabbix/6.4/debian/pool/main/z/zabbix-release/zabbix-release_6.4-1+debian12_all.deb
dpkg -i zabbix-release_6.4-1+debian12_all.deb
apt-get update -qq
echo "[OK] Repositório Zabbix configurado"

# Instalar MariaDB
echo ""
echo "=== Instalando MariaDB ==="
apt-get install -y -qq mariadb-server mariadb-client
systemctl enable mariadb
systemctl start mariadb
echo "[OK] MariaDB instalado"

# Configurar MariaDB
echo ""
echo "=== Configurando MariaDB ==="
mysql -e "CREATE DATABASE IF NOT EXISTS zabbix CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;"
mysql -e "CREATE USER IF NOT EXISTS '${server.zabbix_db_user}'@'localhost' IDENTIFIED BY '${server.zabbix_db_password}';"
mysql -e "GRANT ALL PRIVILEGES ON zabbix.* TO '${server.zabbix_db_user}'@'localhost';"
mysql -e "SET GLOBAL log_bin_trust_function_creators = 1;"
mysql -e "FLUSH PRIVILEGES;"

# Configurar senha root do MySQL
mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '${server.zabbix_db_root_password}';"
echo "[OK] MariaDB configurado"

# Instalar Zabbix Server
echo ""
echo "=== Instalando Zabbix Server ==="
apt-get install -y -qq zabbix-server-mysql zabbix-frontend-php zabbix-nginx-conf zabbix-sql-scripts zabbix-agent
echo "[OK] Zabbix Server instalado"

# Importar schema do banco
echo ""
echo "=== Importando schema do banco ==="
zcat /usr/share/zabbix-sql-scripts/mysql/server.sql.gz | mysql --default-character-set=utf8mb4 -u${server.zabbix_db_user} -p${server.zabbix_db_password} zabbix
mysql -e "SET GLOBAL log_bin_trust_function_creators = 0;"
echo "[OK] Schema importado"

# Configurar Zabbix Server
echo ""
echo "=== Configurando Zabbix Server ==="
sed -i "s/# DBPassword=/DBPassword=${server.zabbix_db_password}/" /etc/zabbix/zabbix_server.conf
sed -i "s/DBUser=zabbix/DBUser=${server.zabbix_db_user}/" /etc/zabbix/zabbix_server.conf
echo "[OK] Zabbix Server configurado"

# Configurar Nginx
echo ""
echo "=== Configurando Nginx ==="
sed -i "s/# listen 8080;/listen 80;/" /etc/zabbix/nginx.conf
sed -i "s/# server_name example.com;/server_name ${server.ipv4};/" /etc/zabbix/nginx.conf
echo "[OK] Nginx configurado"

# Configurar PHP
echo ""
echo "=== Configurando PHP ==="
sed -i "s/;date.timezone =/date.timezone = America\\/Sao_Paulo/" /etc/php/8.2/fpm/php.ini
echo "[OK] PHP configurado"

${server.install_grafana ? `
# Instalar Grafana
echo ""
echo "=== Instalando Grafana ==="
wget -q -O - https://packages.grafana.com/gpg.key | apt-key add -
echo "deb https://packages.grafana.com/oss/deb stable main" | tee /etc/apt/sources.list.d/grafana.list
apt-get update -qq
apt-get install -y -qq grafana
systemctl enable grafana-server
systemctl start grafana-server
echo "[OK] Grafana instalado"
` : ''}

# Habilitar e iniciar serviços
echo ""
echo "=== Iniciando serviços ==="
systemctl enable zabbix-server zabbix-agent nginx php8.2-fpm
systemctl restart zabbix-server zabbix-agent nginx php8.2-fpm
echo "[OK] Serviços iniciados"

# Configurar firewall básico
echo ""
echo "=== Configurando firewall ==="
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
        tcp dport { 22, ${server.ssh_port || 22}, 80, 443, 10050, 10051 } accept
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
echo "[OK] Firewall configurado"

# Instalar agente de monitoramento
echo ""
echo "=== Instalando agente de monitoramento ==="
cat > /usr/local/bin/v2-agent << 'AGENTEOF'
#!/bin/bash
API_URL="${apiUrl}"
AGENT_TOKEN="${server.agent_token}"
SERVER_ID="${server.id}"

while true; do
  RESPONSE=$(curl -s -X POST "$API_URL/api/agent/check" \\
    -H "Content-Type: application/json" \\
    -d "{\\"serverId\\": \\"$SERVER_ID\\", \\"token\\": \\"$AGENT_TOKEN\\", \\"type\\": \\"zabbix\\"}")
  
  COMMAND=$(echo "$RESPONSE" | jq -r '.command // empty')
  
  if [ -n "$COMMAND" ]; then
    OUTPUT=$(eval "$COMMAND" 2>&1)
    EXIT_CODE=$?
    
    curl -s -X POST "$API_URL/api/agent/result" \\
      -H "Content-Type: application/json" \\
      -d "{\\"serverId\\": \\"$SERVER_ID\\", \\"token\\": \\"$AGENT_TOKEN\\", \\"output\\": \\"$OUTPUT\\", \\"exitCode\\": $EXIT_CODE, \\"type\\": \\"zabbix\\"}"
  fi
  
  sleep 30
done
AGENTEOF

chmod +x /usr/local/bin/v2-agent

cat > /etc/systemd/system/v2-agent.service << 'SERVICEEOF'
[Unit]
Description=Version2 Monitoring Agent
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/v2-agent
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICEEOF

systemctl daemon-reload
systemctl enable v2-agent
systemctl start v2-agent
echo "[OK] Agente instalado"

echo ""
echo "============================================"
echo "  Instalação concluída com sucesso!"
echo "  Acesse: http://${server.ipv4}"
echo "  Usuário padrão: Admin"
echo "  Senha padrão: zabbix"
echo "============================================"
`;
}

export async function installZabbixServer(server) {
  let connection;
  let installLog = '';
  
  try {
    installLog += `[${new Date().toISOString()}] Iniciando instalação do servidor Zabbix ${server.name}\n`;
    
    connection = await connectSSH(server);
    installLog += `[${new Date().toISOString()}] Conexão SSH estabelecida\n`;
    
    const apiUrl = process.env.API_URL || 'http://localhost:3000';
    const installScript = generateZabbixInstallScript(server, apiUrl);
    
    await connection.putContent(installScript, '/tmp/install-zabbix.sh');
    installLog += `[${new Date().toISOString()}] Script de instalação enviado\n`;
    
    await connection.execCommand('chmod +x /tmp/install-zabbix.sh');
    
    installLog += `[${new Date().toISOString()}] Executando instalação (isso pode levar vários minutos)...\n`;
    const result = await connection.execCommand('sudo /tmp/install-zabbix.sh', {
      options: { timeout: 1800000 } // 30 minutos
    });
    
    installLog += result.stdout + '\n';
    if (result.stderr) {
      installLog += 'STDERR:\n' + result.stderr + '\n';
    }
    
    if (result.code === 0) {
      installLog += `[${new Date().toISOString()}] Instalação concluída com sucesso!\n`;
      
      await pool.query(
        'UPDATE zabbix_servers SET status = $1, installation_log = $2 WHERE id = $3',
        ['installed', installLog, server.id]
      );
    } else {
      throw new Error(`Instalação falhou com código ${result.code}`);
    }
    
  } catch (error) {
    installLog += `[${new Date().toISOString()}] ERRO: ${error.message}\n`;
    console.error('Erro na instalação Zabbix:', error);
    
    await pool.query(
      'UPDATE zabbix_servers SET status = $1, installation_log = $2 WHERE id = $3',
      ['error', installLog, server.id]
    );
  } finally {
    if (connection) {
      connection.dispose();
    }
  }
}
