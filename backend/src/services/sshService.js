import { NodeSSH } from 'node-ssh';
import pool from '../config/database.js';
import { decryptPassword } from '../controllers/dnsController.js';

const ssh = new NodeSSH();

// Conectar via SSH
async function connectSSH(server) {
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

// Executar comando SSH
export async function executeSSHCommand(server, command) {
  let connection;
  try {
    connection = await connectSSH(server);
    const result = await connection.execCommand(command);
    
    if (result.code !== 0) {
      throw new Error(`Comando falhou: ${result.stderr}`);
    }
    
    return result.stdout;
  } finally {
    if (connection) {
      connection.dispose();
    }
  }
}

// Gerar configuração BIND9
function generateBindConfig(allowedDnsIpv4, allowedDnsIpv6) {
  const DEFAULT_DNS_IPV4 = [
    "127.0.0.1",
    "10.0.0.0/8",
    "172.16.0.0/12",
    "192.168.0.0/16",
    "100.64.0.0/10"
  ];
  
  const DEFAULT_DNS_IPV6 = [
    "::1",
    "fd00::/8",
    "fe80::/10",
    "fc00::/8"
  ];

  const allIpv4 = [...new Set([...DEFAULT_DNS_IPV4, ...allowedDnsIpv4])];
  const allIpv6 = [...new Set([...DEFAULT_DNS_IPV6, ...allowedDnsIpv6])];
  
  const aclEntries = [...allIpv4, ...allIpv6].map(ip => `        ${ip};`).join("\n");

  return `acl autorizados {
${aclEntries}
};

options {
    directory "/var/cache/bind";
    dnssec-validation auto;
    auth-nxdomain no;
    listen-on { any; };
    listen-on-v6 { any; };
    minimal-responses yes;
    max-ncache-ttl 300;
    allow-recursion { autorizados; };
    allow-query-cache { autorizados; };
    allow-query { any; };
    allow-transfer { none; };
    version "V2 DNS";
    min-cache-ttl 90;
};

statistics-channels {
    inet 127.0.0.1 port 58053 allow { 127.0.0.1; };
};`;
}

// Gerar named.conf com logging
function generateNamedConf() {
  return `logging {
    channel security_file {
        file "/var/log/named/security.log" versions 3 size 30m;
        severity dynamic;
        print-time yes;
    };
    channel file_log {
        file "/var/log/named/bind.log" versions 3 size 1m;
        severity info;
        print-time yes;
        print-severity yes;
        print-category yes;
    };
    channel query_log {
        file "/var/log/named/queries.log" versions 3 size 50m;
        severity info;
        print-time yes;
    };
    category security { security_file; };
    category default { file_log; };
    category queries { query_log; };
    category lame-servers { null; };
};

include "/etc/bind/named.conf.options";
include "/etc/bind/named.conf.local";
include "/etc/bind/named.conf.default-zones";`;
}

// Gerar configuração nftables
function generateNftablesConfig(sshPort, allowedSshIps, allowedDnsIpv4, allowedDnsIpv6) {
  const DEFAULT_DNS_IPV4 = [
    "127.0.0.1",
    "10.0.0.0/8",
    "172.16.0.0/12",
    "192.168.0.0/16",
    "100.64.0.0/10"
  ];
  
  const DEFAULT_DNS_IPV6 = [
    "::1",
    "fd00::/8",
    "fe80::/10",
    "fc00::/8"
  ];

  // SSH rules
  const sshIpRules = allowedSshIps.length > 0 
    ? allowedSshIps.map(ip => {
        const isIpv6 = ip.includes(':');
        return isIpv6 
          ? `        ip6 saddr ${ip} tcp dport { 22, ${sshPort} } accept`
          : `        ip saddr ${ip} tcp dport { 22, ${sshPort} } accept`;
      }).join("\n")
    : `        tcp dport { 22, ${sshPort} } accept  # AVISO: SSH aberto`;

  // DNS IPv4 rules
  const dnsIpv4Rules = [...new Set([...DEFAULT_DNS_IPV4, ...allowedDnsIpv4])]
    .map(ip => `        ip saddr ${ip} udp dport 53 accept
        ip saddr ${ip} tcp dport 53 accept`)
    .join("\n");

  // DNS IPv6 rules  
  const dnsIpv6Rules = [...new Set([...DEFAULT_DNS_IPV6, ...allowedDnsIpv6])]
    .map(ip => `        ip6 saddr ${ip} udp dport 53 accept
        ip6 saddr ${ip} tcp dport 53 accept`)
    .join("\n");

  return `#!/usr/sbin/nft -f
flush ruleset

table inet filter {
    chain input {
        type filter hook input priority 0; policy drop;
        
        ct state established,related accept
        iif lo accept
        
        ip protocol icmp accept
        ip6 nexthdr icmpv6 accept
        
${sshIpRules}
        
${dnsIpv4Rules}
        
${dnsIpv6Rules}
        
        tcp dport 10050 accept
        
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

// Gerar script de instalação DNS
function generateInstallScript(server, apiUrl) {
  const bindOptions = generateBindConfig(
    server.allowed_dns_ipv4 || [],
    server.allowed_dns_ipv6 || []
  );
  const namedConf = generateNamedConf();
  const nftablesConfig = generateNftablesConfig(
    server.ssh_port || 22,
    server.allowed_ssh_ips || [],
    server.allowed_dns_ipv4 || [],
    server.allowed_dns_ipv6 || []
  );
  
  const hasAnycast = server.loopback_ipv4_1 || server.loopback_ipv4_2 || 
                     server.loopback_ipv6_1 || server.loopback_ipv6_2;

  let script = `#!/bin/bash
set -e

echo "============================================"
echo "  DNS Server Installation"
echo "  Servidor: ${server.name}"
echo "  IP: ${server.ipv4}"
echo "============================================"

export DEBIAN_FRONTEND=noninteractive

# Verifica Debian 12
if ! grep -q "bookworm" /etc/os-release 2>/dev/null; then
    echo "ERRO: Requer Debian 12 (Bookworm)"
    exit 1
fi
echo "[OK] Debian 12 confirmado"

# Detecta interface de uplink
UPLINK_IFACE=$(ip route | grep default | head -1 | awk '{print $5}')
if [ -z "$UPLINK_IFACE" ]; then
    UPLINK_IFACE="eth0"
fi
echo "[INFO] Interface de uplink: $UPLINK_IFACE"

# Atualiza sistema
echo ""
echo "=== Atualizando sistema ==="
apt-get update -qq
apt-get upgrade -y -qq
echo "[OK] Sistema atualizado"

# Instala pacotes base${hasAnycast ? ' e FRR para Anycast' : ''}
echo ""
echo "=== Instalando pacotes ==="
${hasAnycast 
  ? 'apt-get install -y -qq rsyslog fail2ban nftables bind9 dnsutils curl jq frr frr-pythontools'
  : 'apt-get install -y -qq rsyslog fail2ban nftables bind9 dnsutils curl jq'
}
systemctl enable rsyslog
systemctl start rsyslog
echo "[OK] Pacotes instalados"

# Configura resolv.conf
echo "nameserver 127.0.0.1" > /etc/resolv.conf
echo "nameserver ::1" >> /etc/resolv.conf

# Cria diretório de logs do BIND
mkdir -p /var/log/named/
chown bind:bind /var/log/named/
touch /var/log/named/queries.log
touch /var/log/named/security.log
touch /var/log/named/bind.log
chown bind:bind /var/log/named/*

# Configura BIND - named.conf
echo ""
echo "=== Configurando BIND ==="
cat > /etc/bind/named.conf << 'NAMEDEOF'
${namedConf}
NAMEDEOF

# Configura BIND - named.conf.options
cat > /etc/bind/named.conf.options << 'OPTIONSEOF'
${bindOptions}
OPTIONSEOF

# Verifica configuração
named-checkconf /etc/bind/named.conf.options || { echo "ERRO: Config BIND inválida"; exit 1; }
echo "[OK] BIND configurado"

# Configura nftables
echo ""
echo "=== Configurando nftables ==="
cat > /etc/nftables.conf << 'NFTEOF'
${nftablesConfig}
NFTEOF
echo "[OK] nftables configurado"

# Configura fail2ban
echo ""
echo "=== Configurando fail2ban ==="
cat > /etc/fail2ban/jail.local << 'JAILEOF'
[DEFAULT]
bantime = 10m
findtime = 10m
maxretry = 5
banaction = nftables-allports

[sshd]
enabled = true
port = ssh,${server.ssh_port || 22}
JAILEOF
echo "[OK] fail2ban configurado"

# Habilita serviços
echo ""
echo "=== Habilitando serviços ==="
systemctl enable nftables
systemctl enable fail2ban
systemctl enable named

# Reinicia serviços
echo ""
echo "=== Reiniciando serviços ==="
systemctl restart nftables || echo "AVISO: nftables falhou"
systemctl restart named || { echo "ERRO: BIND falhou"; exit 1; }
sleep 2
systemctl restart fail2ban || echo "AVISO: fail2ban falhou"
echo "[OK] Serviços reiniciados"
`;

  // Adicionar configuração Anycast se necessário
  if (hasAnycast) {
    script += `
# Configurando Anycast com FRR/OSPF
echo ""
echo "=== Configurando FRR para Anycast ==="

systemctl stop frr 2>/dev/null || true

cat > /etc/frr/daemons << 'DAEMONSEOF'
zebra=yes
bgpd=no
ospfd=yes
ospf6d=yes
ripd=no
ripngd=no
isisd=no
pimd=no
ldpd=no
nhrpd=no
eigrpd=no
babeld=no
sharpd=no
pbrd=no
bfdd=no
fabricd=no
vrrpd=no
DAEMONSEOF

chown frr:frr /etc/frr/daemons
chmod 640 /etc/frr/daemons

echo "[OK] Daemons OSPF habilitados"

# Configurar loopbacks
modprobe dummy numdummies=2 2>/dev/null || modprobe dummy 2>/dev/null || true

cat > /etc/network/interfaces.d/loopback-anycast << 'LOOPEOF'
auto dummy0
iface dummy0 inet static
    address ${server.loopback_ipv4_1 || '192.0.2.1'}/32
    
${server.loopback_ipv6_1 ? `iface dummy0 inet6 static
    address ${server.loopback_ipv6_1}/128` : ''}

${server.loopback_ipv4_2 ? `auto dummy1
iface dummy1 inet static
    address ${server.loopback_ipv4_2}/32` : ''}

${server.loopback_ipv6_2 ? `iface dummy1 inet6 static
    address ${server.loopback_ipv6_2}/128` : ''}
LOOPEOF

ifup dummy0 2>/dev/null || ip link set dummy0 up
${server.loopback_ipv4_2 ? 'ifup dummy1 2>/dev/null || ip link set dummy1 up' : ''}

# Configurar FRR
cat > /etc/frr/frr.conf << 'FRREOF'
frr version 8.4.4
frr defaults traditional
hostname ${server.name}
log syslog informational
no ipv6 forwarding
service integrated-vtysh-config

router ospf
 ospf router-id ${server.ipv4}
 network ${server.ipv4}/32 area 0.0.0.0
 ${server.loopback_ipv4_1 ? `network ${server.loopback_ipv4_1}/32 area 0.0.0.0` : ''}
 ${server.loopback_ipv4_2 ? `network ${server.loopback_ipv4_2}/32 area 0.0.0.0` : ''}

${server.loopback_ipv6_1 || server.loopback_ipv6_2 ? `router ospf6
 ospf6 router-id ${server.ipv4}
 ${server.loopback_ipv6_1 ? `interface dummy0
  ipv6 ospf6 area 0.0.0.0` : ''}
 ${server.loopback_ipv6_2 ? `interface dummy1
  ipv6 ospf6 area 0.0.0.0` : ''}` : ''}

line vty
FRREOF

chown frr:frr /etc/frr/frr.conf
chmod 640 /etc/frr/frr.conf

systemctl restart frr
echo "[OK] FRR configurado e iniciado"
`;
  }

  // Adicionar agente de monitoramento
  script += `
# Instalar agente de monitoramento
echo ""
echo "=== Instalando agente de monitoramento ==="

cat > /usr/local/bin/v2-agent << 'AGENTEOF'
#!/bin/bash
API_URL="${apiUrl}"
AGENT_TOKEN="${server.agent_token}"
SERVER_ID="${server.id}"

while true; do
  # Verificar comandos pendentes
  RESPONSE=$(curl -s -X POST "$API_URL/api/agent/check" \\
    -H "Content-Type: application/json" \\
    -d "{\\"serverId\\": \\"$SERVER_ID\\", \\"token\\": \\"$AGENT_TOKEN\\"}")
  
  COMMAND=$(echo "$RESPONSE" | jq -r '.command // empty')
  
  if [ -n "$COMMAND" ]; then
    OUTPUT=$(eval "$COMMAND" 2>&1)
    EXIT_CODE=$?
    
    curl -s -X POST "$API_URL/api/agent/result" \\
      -H "Content-Type: application/json" \\
      -d "{\\"serverId\\": \\"$SERVER_ID\\", \\"token\\": \\"$AGENT_TOKEN\\", \\"output\\": \\"$OUTPUT\\", \\"exitCode\\": $EXIT_CODE}"
  fi
  
  sleep 30
done
AGENTEOF

chmod +x /usr/local/bin/v2-agent

# Criar serviço systemd
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

echo "[OK] Agente instalado e iniciado"

echo ""
echo "============================================"
echo "  Instalação concluída com sucesso!"
echo "============================================"
`;

  return script;
}

// Instalar servidor DNS
export async function installDNSServer(server) {
  let connection;
  let installLog = '';
  
  try {
    installLog += `[${new Date().toISOString()}] Iniciando instalação do servidor ${server.name}\n`;
    
    // Conectar via SSH
    connection = await connectSSH(server);
    installLog += `[${new Date().toISOString()}] Conexão SSH estabelecida\n`;
    
    // Gerar script de instalação
    const apiUrl = process.env.API_URL || 'http://localhost:3000';
    const installScript = generateInstallScript(server, apiUrl);
    
    // Enviar script para o servidor
    await connection.putContent(installScript, '/tmp/install-dns.sh');
    installLog += `[${new Date().toISOString()}] Script de instalação enviado\n`;
    
    // Tornar executável
    await connection.execCommand('chmod +x /tmp/install-dns.sh');
    
    // Executar instalação
    installLog += `[${new Date().toISOString()}] Executando instalação...\n`;
    const result = await connection.execCommand('sudo /tmp/install-dns.sh');
    
    installLog += result.stdout + '\n';
    if (result.stderr) {
      installLog += 'STDERR:\n' + result.stderr + '\n';
    }
    
    if (result.code === 0) {
      installLog += `[${new Date().toISOString()}] Instalação concluída com sucesso!\n`;
      
      // Atualizar status no banco
      await pool.query(
        'UPDATE dns_servers SET status = $1, installation_log = $2 WHERE id = $3',
        ['installed', installLog, server.id]
      );
    } else {
      throw new Error(`Instalação falhou com código ${result.code}`);
    }
    
  } catch (error) {
    installLog += `[${new Date().toISOString()}] ERRO: ${error.message}\n`;
    console.error('Erro na instalação DNS:', error);
    
    // Atualizar status de erro
    await pool.query(
      'UPDATE dns_servers SET status = $1, installation_log = $2 WHERE id = $3',
      ['error', installLog, server.id]
    );
  } finally {
    if (connection) {
      connection.dispose();
    }
  }
}
