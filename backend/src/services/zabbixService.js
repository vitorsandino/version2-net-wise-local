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

function generateNftablesConfig(sshPort, allowAll, allowedIps = []) {
  const sshRules = `        tcp dport { 22, ${sshPort} } accept`;
  
  let webRules;
  if (allowAll) {
    webRules = `        # HTTP/HTTPS/Grafana - Liberado para TODOS
        tcp dport { 80, 443, 3000 } accept`;
  } else if (allowedIps.length > 0) {
    const ipv4Rules = allowedIps.filter(ip => !ip.includes(':')).map(ip => 
      `        ip saddr ${ip} tcp dport { 80, 443, 3000 } accept`
    ).join("\n");
    const ipv6Rules = allowedIps.filter(ip => ip.includes(':')).map(ip => 
      `        ip6 saddr ${ip} tcp dport { 80, 443, 3000 } accept`
    ).join("\n");
    webRules = `        # HTTP/HTTPS/Grafana - IPs específicos
${ipv4Rules}
${ipv6Rules}`;
  } else {
    webRules = `        # HTTP/HTTPS/Grafana - Apenas localhost
        ip saddr 127.0.0.1 tcp dport { 80, 443, 3000 } accept`;
  }

  return `#!/usr/sbin/nft -f
flush ruleset

table inet filter {
    chain input {
        type filter hook input priority 0; policy drop;
        
        ct state established,related accept
        iif lo accept
        
        ip protocol icmp accept
        ip6 nexthdr icmpv6 accept
        
        # SSH
${sshRules}
        
${webRules}
        
        # Zabbix Agent
        tcp dport 10050 accept
        tcp dport 10051 accept
        
        counter log prefix "[nftables-drop] " drop
    }
    
    chain forward {
        type filter hook forward priority 0; policy drop;
    }
    
    chain output {
        type filter hook output priority 0; policy accept;
    }
}`;
}

function generateInstallScript(server, apiUrl) {
  const zabbixVer = server.zabbix_version || "7.0";
  
  const grafanaSection = server.install_grafana ? `
echo "=== [$(date)] Instalando Grafana ==="
apt-get install -y -qq apt-transport-https software-properties-common wget 2>&1
mkdir -p /etc/apt/keyrings/
wget -q -O - https://apt.grafana.com/gpg.key | gpg --dearmor | tee /etc/apt/keyrings/grafana.gpg > /dev/null
echo "deb [signed-by=/etc/apt/keyrings/grafana.gpg] https://apt.grafana.com stable main" | tee /etc/apt/sources.list.d/grafana.list
apt-get update -qq 2>&1
apt-get install -y -qq grafana 2>&1
grafana-cli plugins install alexanderzobnin-zabbix-app 2>&1
systemctl daemon-reload 2>&1
systemctl enable grafana-server 2>&1
systemctl start grafana-server 2>&1
echo "✓ Grafana instalado!"
` : '';

  const nftablesSection = server.enable_firewall ? `
echo "=== [$(date)] Configurando nftables ==="
apt-get install -y -qq nftables 2>&1
cat > /etc/nftables.conf << 'NFTEOF'
${generateNftablesConfig(server.ssh_port, server.firewall_allow_all, server.firewall_allowed_ips)}
NFTEOF
systemctl enable nftables 2>&1
systemctl restart nftables 2>&1
echo "✓ Firewall nftables configurado!"
` : '';

  return `#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive

echo "=== [$(date)] Iniciando instalação do Zabbix ${zabbixVer} ==="
echo "Servidor: ${server.name}"
echo "IP: ${server.ipv4}"

if ! grep -q "bookworm" /etc/os-release; then
    echo "ERRO: Este script requer Debian 12 (Bookworm)"
    exit 1
fi

echo "=== [$(date)] Configurando repositórios ==="
cat > /etc/apt/sources.list << 'SOURCESEOF'
deb http://deb.debian.org/debian bookworm main contrib non-free non-free-firmware
deb http://deb.debian.org/debian bookworm-updates main contrib non-free non-free-firmware
deb http://security.debian.org/debian-security bookworm-security main contrib non-free non-free-firmware
SOURCESEOF

apt-get update -qq 2>&1
apt-get upgrade -y -qq 2>&1

echo "=== [$(date)] Instalando MariaDB ==="
apt-get install -y -qq mariadb-server mariadb-client 2>&1
systemctl enable mariadb 2>&1
systemctl start mariadb 2>&1

mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '${server.zabbix_db_root_password}';" 2>&1 || true

echo "=== [$(date)] Criando banco de dados Zabbix ==="
mysql -u root -p'${server.zabbix_db_root_password}' -e "CREATE DATABASE IF NOT EXISTS zabbix CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;" 2>&1
mysql -u root -p'${server.zabbix_db_root_password}' -e "CREATE USER IF NOT EXISTS '${server.zabbix_db_user}'@'localhost' IDENTIFIED BY '${server.zabbix_db_password}';" 2>&1
mysql -u root -p'${server.zabbix_db_root_password}' -e "GRANT ALL PRIVILEGES ON zabbix.* TO '${server.zabbix_db_user}'@'localhost';" 2>&1
mysql -u root -p'${server.zabbix_db_root_password}' -e "SET GLOBAL log_bin_trust_function_creators = 1;" 2>&1

echo "=== [$(date)] Instalando repositório Zabbix ${zabbixVer} ==="
wget -q https://repo.zabbix.com/zabbix/${zabbixVer}/debian/pool/main/z/zabbix-release/zabbix-release_latest_${zabbixVer}+debian12_all.deb -O /tmp/zabbix-release.deb 2>&1
dpkg -i /tmp/zabbix-release.deb 2>&1
apt-get update -qq 2>&1

echo "=== [$(date)] Instalando Zabbix Server, Frontend e Agent ==="
apt-get install -y -qq zabbix-server-mysql zabbix-frontend-php zabbix-apache-conf zabbix-sql-scripts zabbix-agent2 2>&1
echo "✓ Zabbix instalado!"

echo "=== [$(date)] Importando schema do banco de dados ==="
zcat /usr/share/zabbix-sql-scripts/mysql/server.sql.gz | mysql --default-character-set=utf8mb4 -u${server.zabbix_db_user} -p'${server.zabbix_db_password}' zabbix 2>&1
mysql -u root -p'${server.zabbix_db_root_password}' -e "SET GLOBAL log_bin_trust_function_creators = 0;" 2>&1

echo "=== [$(date)] Configurando Zabbix Server ==="
sed -i "s/# DBPassword=/DBPassword=${server.zabbix_db_password}/" /etc/zabbix/zabbix_server.conf 2>&1
sed -i "s/# DBUser=.*/DBUser=${server.zabbix_db_user}/" /etc/zabbix/zabbix_server.conf 2>&1

echo "=== [$(date)] Configurando Apache para acesso direto ==="
a2dissite 000-default 2>&1 || true
cat > /etc/apache2/sites-available/zabbix-direct.conf << 'VHOSTEOF'
<VirtualHost *:80>
    ServerName ${server.ipv4}
    DocumentRoot /usr/share/zabbix
    <Directory /usr/share/zabbix>
        Options FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    RedirectMatch ^/zabbix$ /
    RedirectMatch ^/zabbix/(.*)$ /\$1
</VirtualHost>
VHOSTEOF
a2enmod rewrite 2>&1 || true
a2ensite zabbix-direct 2>&1

${nftablesSection}
${grafanaSection}

systemctl restart zabbix-server zabbix-agent2 apache2 2>&1
echo "=== [$(date)] INSTALAÇÃO CONCLUÍDA! ==="
`;
}

export async function installZabbixServer(server) {
  let connection;
  let installLog = '';
  
  try {
    installLog += `[${new Date().toISOString()}] Iniciando instalação do servidor Zabbix ${server.name} (Versão ${server.zabbix_version || '7.0'})\n`;
    
    connection = await connectSSH(server);
    installLog += `[${new Date().toISOString()}] Conexão SSH estabelecida\n`;
    
    const apiUrl = process.env.API_URL || 'http://localhost:3000';
    const installScript = generateInstallScript(server, apiUrl);
    
    await connection.putContent(installScript, '/tmp/install-zabbix.sh');
    await connection.execCommand('chmod +x /tmp/install-zabbix.sh');
    
    const result = await connection.execCommand('sudo /tmp/install-zabbix.sh', {
      options: { timeout: 1800000 }
    });
    
    installLog += result.stdout + '\n';
    if (result.stderr) installLog += 'STDERR:\n' + result.stderr + '\n';
    
    if (result.code === 0) {
      await pool.query(
        'UPDATE zabbix_servers SET status = $1, installation_log = $2 WHERE id = $3',
        ['installed', installLog, server.id]
      );
    } else {
      throw new Error(`Instalação falhou com código ${result.code}`);
    }
  } catch (error) {
    installLog += `[${new Date().toISOString()}] ERRO: ${error.message}\n`;
    await pool.query(
      'UPDATE zabbix_servers SET status = $1, installation_log = $2 WHERE id = $3',
      ['error', installLog, server.id]
    );
  } finally {
    if (connection) connection.dispose();
  }
}
