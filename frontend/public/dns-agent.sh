#!/bin/bash
# ============================================
# DNS Server Agent - Instalação e Monitoramento Automático
# Este script deve ser executado como root no servidor DNS
# ============================================

set -e

# Configuração
API_URL="https://qtdorkjllvsbfcwbigpo.supabase.co/functions/v1/agent-command"
AGENT_TOKEN=""
CHECK_INTERVAL=30
LOG_FILE="/var/log/dns-agent.log"
PID_FILE="/var/run/dns-agent.pid"
CONFIG_DIR="/etc/dns-agent"
CONFIG_FILE="$CONFIG_DIR/config"

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo -e "$msg" | tee -a "$LOG_FILE"
}

log_success() { log "${GREEN}✓ $1${NC}"; }
log_error() { log "${RED}✗ $1${NC}"; }
log_info() { log "${YELLOW}→ $1${NC}"; }
log_debug() { log "${BLUE}  $1${NC}"; }

check_root() {
    if [ "$EUID" -ne 0 ]; then
        echo -e "${RED}Este script deve ser executado como root${NC}"
        echo "Execute: sudo $0 $*"
        exit 1
    fi
}

check_debian() {
    if ! grep -q "bookworm\|12" /etc/os-release 2>/dev/null; then
        log_error "Este script requer Debian 12 (Bookworm)"
        cat /etc/os-release
        exit 1
    fi
    log_success "Debian 12 detectado"
}

install_dependencies() {
    log_info "Instalando dependências..."
    apt-get update -qq
    apt-get install -y curl jq netcat-openbsd dnsutils > /dev/null 2>&1
    log_success "Dependências instaladas"
}

get_pending_command() {
    curl -s -X GET "$API_URL" \
        -H "Content-Type: application/json" \
        -H "x-agent-token: $AGENT_TOKEN" \
        --connect-timeout 10 \
        --max-time 30 \
        2>/dev/null
}

report_result() {
    local status="$1"
    local output="$2"
    local step="$3"
    
    # Limita output para 50000 caracteres e escapa JSON
    output=$(echo "$output" | head -c 50000)
    
    curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -H "x-agent-token: $AGENT_TOKEN" \
        --connect-timeout 10 \
        --max-time 30 \
        -d "{\"status\": \"$status\", \"output\": $(echo "$output" | jq -Rs .), \"step\": \"$step\"}" \
        2>/dev/null || true
}

execute_command() {
    local command="$1"
    local output=""
    local status="running"
    local exit_code=0
    
    log_info "Executando comando recebido..."
    report_result "running" "Iniciando execução do comando..." "start"
    
    # Cria arquivo temporário para o script
    local tmp_script=$(mktemp /tmp/dns-cmd-XXXXXX.sh)
    echo "$command" > "$tmp_script"
    chmod +x "$tmp_script"
    
    # Executa e captura output
    if output=$(bash "$tmp_script" 2>&1); then
        status="completed"
        log_success "Comando executado com sucesso"
    else
        exit_code=$?
        status="failed"
        log_error "Comando falhou com código $exit_code"
        output="$output\n\n[ERRO] Comando terminou com código de saída: $exit_code"
    fi
    
    # Remove script temporário
    rm -f "$tmp_script"
    
    # Reporta resultado
    report_result "$status" "$output" "end"
    log_info "Resultado reportado: $status"
}

check_services_status() {
    log_info "Verificando status dos serviços..."
    
    local status_report=""
    
    # BIND9
    if systemctl is-active --quiet bind9 2>/dev/null; then
        status_report+="BIND9: ✓ Ativo\n"
    else
        status_report+="BIND9: ✗ Inativo\n"
    fi
    
    # nftables
    if systemctl is-active --quiet nftables 2>/dev/null; then
        status_report+="nftables: ✓ Ativo\n"
    else
        status_report+="nftables: ✗ Inativo\n"
    fi
    
    # FRR
    if systemctl is-active --quiet frr 2>/dev/null; then
        status_report+="FRR: ✓ Ativo\n"
    else
        status_report+="FRR: ✗ Inativo\n"
    fi
    
    # DNS test
    if dig @127.0.0.1 google.com +short +timeout=2 > /dev/null 2>&1; then
        status_report+="DNS Local: ✓ Respondendo\n"
    else
        status_report+="DNS Local: ✗ Sem resposta\n"
    fi
    
    # Porta 53
    if nc -z 127.0.0.1 53 2>/dev/null; then
        status_report+="Porta 53: ✓ Aberta\n"
    else
        status_report+="Porta 53: ✗ Fechada\n"
    fi
    
    echo -e "$status_report"
}

run_agent() {
    log_info "============================================"
    log_info "  DNS Agent Iniciado"
    log_info "============================================"
    log_info "API: $API_URL"
    log_info "Token: ${AGENT_TOKEN:0:8}..."
    log_info "Intervalo: ${CHECK_INTERVAL}s"
    log_info "============================================"
    
    # Salva PID
    echo $$ > "$PID_FILE"
    
    # Trap para cleanup
    trap 'log_info "Agente finalizado"; rm -f "$PID_FILE"; exit 0' SIGTERM SIGINT
    
    local consecutive_errors=0
    local max_errors=5
    
    while true; do
        log_debug "Verificando comandos pendentes..."
        
        response=$(get_pending_command)
        
        if [ -z "$response" ]; then
            consecutive_errors=$((consecutive_errors + 1))
            log_error "Sem resposta do servidor (tentativa $consecutive_errors/$max_errors)"
            
            if [ $consecutive_errors -ge $max_errors ]; then
                log_error "Muitos erros consecutivos. Aguardando 60s..."
                sleep 60
                consecutive_errors=0
            fi
            
            sleep "$CHECK_INTERVAL"
            continue
        fi
        
        consecutive_errors=0
        
        # Verifica se há erro na resposta
        error=$(echo "$response" | jq -r '.error // empty' 2>/dev/null)
        if [ -n "$error" ]; then
            log_error "Erro do servidor: $error"
            sleep "$CHECK_INTERVAL"
            continue
        fi
        
        hasCommand=$(echo "$response" | jq -r '.hasCommand // false' 2>/dev/null)
        
        if [ "$hasCommand" = "true" ]; then
            command=$(echo "$response" | jq -r '.command // empty' 2>/dev/null)
            if [ -n "$command" ]; then
                log_success "Comando recebido!"
                execute_command "$command"
            fi
        else
            log_debug "Nenhum comando pendente"
        fi
        
        sleep "$CHECK_INTERVAL"
    done
}

install_service() {
    log_info "============================================"
    log_info "  Instalando DNS Agent"
    log_info "============================================"
    
    check_debian
    install_dependencies
    
    # Criar diretório de configuração
    mkdir -p "$CONFIG_DIR"
    chmod 700 "$CONFIG_DIR"
    
    # Salvar configuração
    cat > "$CONFIG_FILE" << EOF
AGENT_TOKEN=$AGENT_TOKEN
API_URL=$API_URL
CHECK_INTERVAL=$CHECK_INTERVAL
EOF
    chmod 600 "$CONFIG_FILE"
    
    # Copiar script
    cp "$0" /usr/local/bin/dns-agent.sh
    chmod +x /usr/local/bin/dns-agent.sh
    
    # Criar serviço systemd
    cat > /etc/systemd/system/dns-agent.service << EOF
[Unit]
Description=DNS Server Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/dns-agent.sh run
Restart=always
RestartSec=10
StandardOutput=append:/var/log/dns-agent.log
StandardError=append:/var/log/dns-agent.log

[Install]
WantedBy=multi-user.target
EOF
    
    # Iniciar serviço
    systemctl daemon-reload
    systemctl enable dns-agent
    systemctl start dns-agent
    
    log_success "============================================"
    log_success "  Agente instalado com sucesso!"
    log_success "============================================"
    log_info ""
    log_info "Comandos úteis:"
    log_info "  Status:     systemctl status dns-agent"
    log_info "  Logs:       tail -f /var/log/dns-agent.log"
    log_info "  Reiniciar:  systemctl restart dns-agent"
    log_info "  Parar:      systemctl stop dns-agent"
    log_info ""
}

uninstall_service() {
    log_info "Removendo agente..."
    
    systemctl stop dns-agent 2>/dev/null || true
    systemctl disable dns-agent 2>/dev/null || true
    rm -f /etc/systemd/system/dns-agent.service
    rm -f /usr/local/bin/dns-agent.sh
    rm -rf "$CONFIG_DIR"
    rm -f "$PID_FILE"
    systemctl daemon-reload
    
    log_success "Agente removido!"
}

test_connection() {
    log_info "Testando conexão com o servidor..."
    
    response=$(get_pending_command)
    
    if [ -z "$response" ]; then
        log_error "Sem resposta do servidor"
        return 1
    fi
    
    error=$(echo "$response" | jq -r '.error // empty' 2>/dev/null)
    if [ -n "$error" ]; then
        log_error "Erro: $error"
        return 1
    fi
    
    serverName=$(echo "$response" | jq -r '.serverName // "Desconhecido"' 2>/dev/null)
    log_success "Conectado! Servidor: $serverName"
    return 0
}

show_status() {
    echo ""
    echo "============================================"
    echo "  DNS Agent Status"
    echo "============================================"
    
    if systemctl is-active --quiet dns-agent 2>/dev/null; then
        echo -e "${GREEN}● Serviço: Ativo${NC}"
    else
        echo -e "${RED}● Serviço: Inativo${NC}"
    fi
    
    if [ -f "$CONFIG_FILE" ]; then
        source "$CONFIG_FILE"
        echo -e "  Token: ${AGENT_TOKEN:0:8}..."
    fi
    
    echo ""
    check_services_status
    
    echo ""
    echo "Últimas linhas do log:"
    tail -10 "$LOG_FILE" 2>/dev/null || echo "Log não encontrado"
}

show_help() {
    echo "
╔════════════════════════════════════════════════════════════╗
║           DNS Server Agent - Gerenciamento                  ║
╚════════════════════════════════════════════════════════════╝

USO: $0 <comando> [opções]

COMANDOS:
    install <token>     Instala o agente como serviço
    uninstall           Remove o agente completamente
    run                 Executa o agente (usado internamente)
    status              Mostra status do agente e serviços
    test                Testa conexão com o servidor
    help                Mostra esta mensagem

EXEMPLOS:
    $0 install abc123-seu-token-xyz
    $0 status
    $0 test

O agente verifica periodicamente por comandos do painel web
e executa automaticamente instalações e atualizações.
"
}

# Carregar config se existir
load_config() {
    if [ -f "$CONFIG_FILE" ]; then
        source "$CONFIG_FILE"
    fi
}

# Main
check_root
load_config

case "${1:-help}" in
    install)
        if [ -z "$2" ]; then
            log_error "Token não fornecido!"
            echo ""
            echo "Uso: $0 install <seu-token>"
            echo ""
            echo "O token é mostrado na interface web ao adicionar um servidor."
            exit 1
        fi
        AGENT_TOKEN="$2"
        install_service
        ;;
    uninstall)
        uninstall_service
        ;;
    run)
        run_agent
        ;;
    status)
        show_status
        ;;
    test)
        test_connection
        ;;
    help|--help|-h|*)
        show_help
        ;;
esac
