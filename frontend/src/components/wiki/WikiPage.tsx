import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  BookOpen, 
  Server, 
  Shield, 
  Network, 
  Terminal,
  Users,
  Lock,
  Play,
  Plus,
  Upload,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Info
} from "lucide-react";

interface WikiPageProps {
  onBack: () => void;
}

const WikiPage = ({ onBack }: WikiPageProps) => {
  const [activeSection, setActiveSection] = useState("intro");

  const sections = [
    { id: "intro", label: "Introdução", icon: BookOpen },
    { id: "divider-dns", label: "DNS Monitor", divider: true },
    { id: "dns-add", label: "Adicionar Servidor DNS", icon: Plus },
    { id: "dns-install", label: "Instalação do Agente", icon: Play },
    { id: "dns-firewall", label: "Gerenciar Firewall", icon: Lock },
    { id: "divider-zabbix", label: "Zabbix Monitor", divider: true },
    { id: "zabbix-add", label: "Adicionar Servidor Zabbix", icon: Plus },
    { id: "zabbix-install", label: "Instalação do Server", icon: Play },
    { id: "zabbix-proxy", label: "Configurar Proxy", icon: Server },
    { id: "zabbix-hosts", label: "Cadastrar Hosts", icon: Network },
    { id: "zabbix-bulk", label: "Importação em Massa", icon: Upload },
    { id: "zabbix-firewall", label: "Gerenciar Firewall", icon: Lock },
    { id: "divider-admin", label: "Administração", divider: true },
    { id: "users", label: "Usuários e Clientes", icon: Users },
    { id: "security", label: "Segurança", icon: Shield },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case "intro":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">Bem-vindo à Documentação</h1>
              <p className="text-muted-foreground">
                Esta wiki explica como utilizar a plataforma Version2 para gerenciar seus servidores DNS e Zabbix de forma centralizada e eficiente.
              </p>
            </div>

            <Separator />

            <div>
              <h2 className="text-xl font-semibold mb-4">O que você pode fazer</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Server className="w-8 h-8 text-blue-500 mt-1" />
                      <div>
                        <h3 className="font-semibold">DNS Monitor</h3>
                        <p className="text-sm text-muted-foreground">Instalar e gerenciar servidores DNS com BIND9, configurar firewall nftables e monitorar consultas em tempo real.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Network className="w-8 h-8 text-green-500 mt-1" />
                      <div>
                        <h3 className="font-semibold">Zabbix Monitor</h3>
                        <p className="text-sm text-muted-foreground">Instalar Zabbix Server 7.0, gerenciar proxies, cadastrar hosts (individual ou em massa) e configurar monitoramento SNMP/Agent.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Shield className="w-8 h-8 text-orange-500 mt-1" />
                      <div>
                        <h3 className="font-semibold">Firewall Centralizado</h3>
                        <p className="text-sm text-muted-foreground">Gerenciar regras de firewall (nftables) diretamente pela interface web, sem precisar de acesso SSH.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Users className="w-8 h-8 text-purple-500 mt-1" />
                      <div>
                        <h3 className="font-semibold">Multi-cliente</h3>
                        <p className="text-sm text-muted-foreground">Organize equipamentos por cliente para ambientes multi-tenant com visibilidade separada.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-500">Requisitos Importantes</h3>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                    <li>• Servidores <strong>Debian 12 (Bookworm)</strong> com acesso root</li>
                    <li>• Conectividade de rede entre o painel e os servidores</li>
                    <li>• IP <code className="bg-muted px-1 rounded">38.254.8.0/22</code> liberado no firewall (IP de origem do painel)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case "dns-add":
        return (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Adicionar Servidor DNS</h1>
            
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                Acessar DNS Monitor
              </h2>
              <p className="text-muted-foreground pl-8">
                Na barra lateral, clique em <strong>DNS Monitor</strong>. Você verá a lista de servidores DNS já cadastrados.
              </p>

              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                Novo Servidor
              </h2>
              <p className="text-muted-foreground pl-8">
                Clique no botão <strong>"Novo Servidor"</strong> no canto superior direito.
              </p>

              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
                Preencher Dados
              </h2>
              <div className="pl-8 space-y-2">
                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span><strong>Nome:</strong> Nome identificador do servidor (ex: DNS-Principal)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span><strong>Cliente:</strong> Nome do cliente para organização</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span><strong>IPv4:</strong> Endereço IP principal do servidor</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span><strong>SSH User:</strong> Usuário SSH (geralmente root)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span><strong>Senha SSH:</strong> Senha para acesso SSH</span>
                  </div>
                </div>
              </div>

              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">4</span>
                Configurar Redes DNS
              </h2>
              <p className="text-muted-foreground pl-8">
                Adicione as redes que poderão fazer consultas DNS (ex: 192.168.0.0/24).
              </p>

              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">5</span>
                Criar Servidor
              </h2>
              <p className="text-muted-foreground pl-8">
                Clique em <strong>"Criar Servidor"</strong>. O servidor será criado e você poderá iniciar a instalação.
              </p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                <p className="text-sm">
                  O IP <code className="bg-muted px-1 rounded">38.254.8.0/22</code> é adicionado automaticamente às regras de firewall para garantir comunicação com o painel.
                </p>
              </div>
            </div>
          </div>
        );

      case "dns-install":
        return (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Instalação do Agente DNS</h1>
            
            <p className="text-muted-foreground">
              Após criar o servidor, você precisa executar um comando no servidor para instalar o agente e o BIND9.
            </p>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Passo a Passo</h2>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm shrink-0">1</span>
                  <p>Clique no cartão do servidor DNS recém-criado para expandir os detalhes</p>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm shrink-0">2</span>
                  <p>Copie o comando <code className="bg-muted px-1 rounded">curl</code> exibido (botão "Copiar")</p>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm shrink-0">3</span>
                  <p>Acesse o servidor via SSH como <strong>root</strong></p>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm shrink-0">4</span>
                  <p>Cole e execute o comando</p>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm shrink-0">5</span>
                  <p>Aguarde a instalação (acompanhe em tempo real no painel)</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">O que será instalado</h2>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>BIND9 (servidor DNS)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>nftables (firewall)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Agente de comunicação com o painel</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Scripts de coleta de estatísticas DNS</span>
                </li>
              </ul>
            </div>
          </div>
        );

      case "dns-firewall":
        return (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Gerenciar Firewall DNS</h1>
            
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Como Acessar</h2>
              <ol className="space-y-2 list-decimal list-inside text-muted-foreground">
                <li>Clique no servidor DNS desejado para abrir os detalhes</li>
                <li>Acesse a aba <strong>"Gerência"</strong></li>
                <li>Na seção Firewall, gerencie as regras</li>
              </ol>

              <h2 className="text-lg font-semibold">Tipos de Regras</h2>
              <div className="grid gap-3">
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <Lock className="w-4 h-4 text-blue-500" />
                      IPs SSH
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      IPs permitidos para acesso SSH (porta 22). Adicione seu IP para não perder acesso.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <Network className="w-4 h-4 text-green-500" />
                      Redes DNS IPv4
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Redes que podem fazer consultas DNS (porta 53). Ex: 192.168.0.0/24
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <Network className="w-4 h-4 text-purple-500" />
                      Redes DNS IPv6
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Redes IPv6 para consultas DNS.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <h2 className="text-lg font-semibold">Aplicar Alterações</h2>
              <p className="text-muted-foreground">
                Após adicionar ou remover IPs/redes, clique em <strong>"Aplicar Firewall"</strong> para que as regras sejam enviadas ao servidor.
              </p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                <p className="text-sm">
                  O IP <code className="bg-muted px-1 rounded">38.254.8.0/22</code> é sempre incluído automaticamente para garantir que o painel mantenha acesso.
                </p>
              </div>
            </div>
          </div>
        );

      case "zabbix-add":
        return (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Adicionar Servidor Zabbix</h1>
            
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Passo a Passo</h2>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm shrink-0">1</span>
                  <p>Na aba <strong>Zabbix Monitor</strong>, clique em <strong>"Novo Servidor"</strong></p>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm shrink-0">2</span>
                  <div>
                    <p>Preencha os campos obrigatórios:</p>
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <li>• <strong>Nome:</strong> Nome do servidor Zabbix</li>
                      <li>• <strong>IPv4:</strong> IP do servidor</li>
                      <li>• <strong>SSH User/Senha:</strong> Credenciais de acesso</li>
                      <li>• <strong>Senha DB:</strong> Senha para o banco de dados Zabbix</li>
                      <li>• <strong>Senha Root DB:</strong> Senha root do MariaDB</li>
                    </ul>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm shrink-0">3</span>
                  <div>
                    <p>Opções adicionais:</p>
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <li>• <strong>Grafana:</strong> Instala Grafana para dashboards avançados</li>
                      <li>• <strong>Firewall:</strong> Configura nftables automaticamente</li>
                    </ul>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm shrink-0">4</span>
                  <p>Clique em <strong>"Criar e Instalar"</strong></p>
                </div>
              </div>
            </div>
          </div>
        );

      case "zabbix-install":
        return (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Instalação do Zabbix Server</h1>
            
            <p className="text-muted-foreground">
              Após criar o servidor, execute o comando de instalação no servidor.
            </p>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Processo</h2>
              <ol className="space-y-2 list-decimal list-inside text-muted-foreground">
                <li>Clique em <strong>"Gerenciar"</strong> no servidor criado</li>
                <li>Copie o comando curl exibido</li>
                <li>Execute no servidor como root</li>
                <li>A instalação leva aproximadamente <strong>10-15 minutos</strong></li>
                <li>Ao finalizar, acesse <code className="bg-muted px-1 rounded">http://IP_DO_SERVIDOR/zabbix</code></li>
              </ol>

              <h2 className="text-lg font-semibold">Componentes Instalados</h2>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Zabbix Server 7.0 LTS</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Zabbix Frontend (Apache + PHP)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>MariaDB</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Zabbix Agent 2</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>nftables (firewall)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Agente de comunicação</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Grafana (opcional)</span>
                </div>
              </div>
            </div>
          </div>
        );

      case "zabbix-proxy":
        return (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Configurar Proxy Zabbix</h1>
            
            <div>
              <h2 className="text-lg font-semibold mb-3">Quando usar Proxy?</h2>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-1 text-primary" />
                  <span>Monitorar hosts em redes remotas sem acesso direto ao Server</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-1 text-primary" />
                  <span>Distribuir carga de monitoramento entre vários pontos</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-1 text-primary" />
                  <span>Atravessar firewalls (proxy ativo inicia conexão)</span>
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">Tipos de Proxy</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-medium text-green-500">Proxy Ativo</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      O proxy conecta ao Server. Ideal quando o proxy está atrás de NAT/firewall.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-medium text-blue-500">Proxy Passivo</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      O Server conecta ao proxy. O proxy precisa ter IP acessível.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">Como Adicionar</h2>
              <ol className="space-y-2 list-decimal list-inside text-muted-foreground">
                <li>Abra os detalhes do Zabbix Server</li>
                <li>Clique na aba <strong>"Proxies"</strong></li>
                <li>Clique em <strong>"Novo Proxy"</strong></li>
                <li>Preencha os dados (Nome, IP, SSH, tipo)</li>
                <li>Execute o comando curl no servidor do proxy</li>
                <li>Após instalado, configure no Zabbix Server</li>
              </ol>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                <p className="text-sm">
                  <strong>Importante:</strong> Após instalar o proxy, você precisa adicioná-lo manualmente no frontend do Zabbix Server em Administration → Proxies.
                </p>
              </div>
            </div>
          </div>
        );

      case "zabbix-hosts":
        return (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Cadastrar Hosts no Zabbix</h1>
            
            <p className="text-muted-foreground">
              O painel permite cadastrar hosts diretamente no Zabbix via API, sem precisar acessar o frontend.
            </p>

            <div>
              <h2 className="text-lg font-semibold mb-3">Cadastro Individual</h2>
              <ol className="space-y-2 list-decimal list-inside text-muted-foreground">
                <li>Abra os detalhes do Zabbix Server</li>
                <li>Clique na aba <strong>"Hosts"</strong></li>
                <li>Clique em <strong>"Gerenciar Hosts"</strong> → aba <strong>"Novo Host"</strong></li>
                <li>Preencha os dados:
                  <ul className="ml-6 mt-1 space-y-1">
                    <li>• <strong>Hostname:</strong> Nome técnico (sem espaços)</li>
                    <li>• <strong>IP:</strong> Endereço do equipamento</li>
                    <li>• <strong>Tipo:</strong> Agent ou SNMP</li>
                    <li>• <strong>Grupos:</strong> Selecione pelo menos um</li>
                    <li>• <strong>Templates:</strong> Vincule templates de monitoramento</li>
                    <li>• <strong>Proxy:</strong> Selecione se necessário</li>
                  </ul>
                </li>
                <li>Clique em <strong>"Criar Host"</strong></li>
              </ol>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">Monitoramento via SNMP</h2>
              <p className="text-muted-foreground">
                Para equipamentos de rede (switches, roteadores, APs), use SNMP:
              </p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>• Selecione <strong>Tipo: SNMP</strong></li>
                <li>• Escolha a versão (v2c é a mais comum)</li>
                <li>• Informe a community (geralmente "public")</li>
                <li>• Porta padrão: 161</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">Monitoramento via Proxy</h2>
              <p className="text-muted-foreground">
                Se o host está em uma rede remota, selecione o proxy apropriado no campo "Monitorar via Proxy".
              </p>
            </div>
          </div>
        );

      case "zabbix-bulk":
        return (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Importação em Massa de Hosts</h1>
            
            <p className="text-muted-foreground">
              Cadastre múltiplos hosts de uma vez usando a interface de tabela ou importando um arquivo CSV.
            </p>

            <div>
              <h2 className="text-lg font-semibold mb-3">Usando a Tabela</h2>
              <ol className="space-y-2 list-decimal list-inside text-muted-foreground">
                <li>Em <strong>"Gerenciar Hosts"</strong>, clique na aba <strong>"Cadastro em Massa"</strong></li>
                <li>Preencha as linhas da tabela com os dados de cada host</li>
                <li>Clique em <strong>"Adicionar Linha"</strong> para mais hosts</li>
                <li>Clique em <strong>"Importar Hosts"</strong> para cadastrar todos</li>
              </ol>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">Importando CSV</h2>
              <p className="text-muted-foreground mb-2">Crie um arquivo CSV com o seguinte formato:</p>
              <pre className="bg-muted p-3 rounded-lg text-sm overflow-x-auto">
{`hostname,ip,tipo,porta,community,grupo,template
switch-01,192.168.1.1,snmp,161,public,Switches,Template SNMP
srv-web-01,192.168.1.10,agent,10050,,Servers,Template Linux
router-01,192.168.1.254,snmp,161,private,Routers,Template SNMP`}
              </pre>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                <li>• <strong>hostname:</strong> Nome técnico do host (obrigatório)</li>
                <li>• <strong>ip:</strong> Endereço IP (obrigatório)</li>
                <li>• <strong>tipo:</strong> "agent" ou "snmp"</li>
                <li>• <strong>porta:</strong> Porta (10050 para agent, 161 para SNMP)</li>
                <li>• <strong>community:</strong> Community SNMP (se tipo=snmp)</li>
                <li>• <strong>grupo:</strong> Nome do grupo (deve existir no Zabbix)</li>
                <li>• <strong>template:</strong> Nome parcial do template</li>
              </ul>
            </div>
          </div>
        );

      case "zabbix-firewall":
        return (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Gerenciar Firewall Zabbix</h1>
            
            <p className="text-muted-foreground">
              O firewall do Zabbix Server é gerenciado de forma similar ao DNS Monitor.
            </p>

            <div>
              <h2 className="text-lg font-semibold mb-3">Como Acessar</h2>
              <ol className="space-y-2 list-decimal list-inside text-muted-foreground">
                <li>Clique no Zabbix Server desejado</li>
                <li>Acesse a aba <strong>"Gerência"</strong></li>
                <li>Na seção Firewall, adicione ou remova IPs/redes</li>
                <li>Clique em <strong>"Aplicar Firewall"</strong></li>
              </ol>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">Portas Liberadas</h2>
              <div className="grid gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <code className="bg-muted px-2 py-1 rounded">22</code>
                  <span className="text-muted-foreground">SSH (para IPs configurados)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <code className="bg-muted px-2 py-1 rounded">80</code>
                  <span className="text-muted-foreground">HTTP (frontend Zabbix)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <code className="bg-muted px-2 py-1 rounded">443</code>
                  <span className="text-muted-foreground">HTTPS</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <code className="bg-muted px-2 py-1 rounded">10050</code>
                  <span className="text-muted-foreground">Zabbix Agent</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <code className="bg-muted px-2 py-1 rounded">10051</code>
                  <span className="text-muted-foreground">Zabbix Trapper</span>
                </div>
              </div>
            </div>
          </div>
        );

      case "users":
        return (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Usuários e Clientes</h1>
            
            <div>
              <h2 className="text-lg font-semibold mb-3">Gerenciar Clientes</h2>
              <p className="text-muted-foreground">
                Clientes são usados para organizar servidores em ambientes multi-tenant.
              </p>
              <ol className="mt-3 space-y-2 list-decimal list-inside text-muted-foreground">
                <li>No menu lateral, clique em <strong>"Admin"</strong></li>
                <li>Acesse a aba <strong>"Clientes"</strong></li>
                <li>Clique em <strong>"Novo Cliente"</strong></li>
                <li>Preencha nome, email e telefone</li>
              </ol>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">Gerenciar Usuários</h2>
              <p className="text-muted-foreground">
                Usuários podem ter acesso ao painel. Apenas administradores podem criar usuários.
              </p>
              <ol className="mt-3 space-y-2 list-decimal list-inside text-muted-foreground">
                <li>No menu <strong>"Admin"</strong>, acesse a aba <strong>"Usuários"</strong></li>
                <li>Clique em <strong>"Novo Usuário"</strong></li>
                <li>Preencha email, senha e selecione a role</li>
              </ol>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">Roles</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-medium text-orange-500">Admin</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Acesso total: criar/editar servidores, usuários, clientes. Ver todos os recursos.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-medium text-blue-500">User</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Acesso limitado: visualiza apenas servidores vinculados ao seu cliente.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        );

      case "security":
        return (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Segurança</h1>
            
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-500">Boas Práticas</h3>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                    <li>• Sempre libere apenas os IPs necessários no firewall</li>
                    <li>• Use senhas fortes para SSH e bancos de dados</li>
                    <li>• Mantenha o IP <code className="bg-muted px-1 rounded">38.254.8.0/22</code> liberado</li>
                    <li>• Revise periodicamente as regras de firewall</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">Comunicação Painel ↔ Servidor</h2>
              <p className="text-muted-foreground">
                A comunicação entre o painel e os servidores é feita através de um agente instalado nos servidores.
                O agente faz polling para buscar comandos pendentes e reporta resultados.
              </p>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                <li>• O servidor inicia a conexão (não precisa expor portas extras)</li>
                <li>• Tokens únicos por servidor para autenticação</li>
                <li>• Comandos executados localmente pelo agente</li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm px-6 py-4 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">Wiki - Documentação</h1>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar */}
        <div className="w-64 border-r border-border/50 bg-muted/20 shrink-0">
          <ScrollArea className="h-full p-4">
            <nav className="space-y-1">
              {sections.map((section) => {
                if (section.divider) {
                  return (
                    <div key={section.id} className="pt-4 pb-2 px-3 text-xs font-semibold text-muted-foreground uppercase">
                      {section.label}
                    </div>
                  );
                }
                const Icon = section.icon || BookOpen;
                return (
                  <button 
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm ${
                      activeSection === section.id 
                        ? "bg-primary/20 text-primary font-medium" 
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {section.label}
                  </button>
                );
              })}
            </nav>
          </ScrollArea>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-8 max-w-4xl">
            {renderContent()}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default WikiPage;
