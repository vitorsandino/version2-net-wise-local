import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Server, 
  Plus, 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  Shield,
  Terminal,
  RefreshCw,
  Wifi,
  WifiOff,
  Activity,
  AlertTriangle,
  Globe,
  Copy,
  Eye,
  EyeOff,
  Radio,
  Zap,
  BarChart3,
  Key,
  User,
  ExternalLink,
  Database,
  Settings,
  Lock
} from "lucide-react";
import WebSSHTerminal from "@/components/dns/WebSSHTerminal";
import ZabbixServerDetails from "./ZabbixServerDetails";

interface ZabbixServer {
  id: string;
  name: string;
  client_name: string | null;
  ipv4: string;
  ipv6: string | null;
  ssh_user: string;
  ssh_port: number;
  ssh_password_encrypted: string | null;
  zabbix_db_user: string;
  zabbix_db_password: string;
  zabbix_db_root_password: string;
  zabbix_root_password: string | null;
  install_grafana: boolean;
  agent_token: string | null;
  status: string;
  installation_log: string | null;
  pending_command: string | null;
  command_status: string | null;
  command_output: string | null;
  last_agent_check: string | null;
  created_at: string;
  updated_at: string;
}

interface ZabbixProxy {
  id: string;
  server_id: string;
  name: string;
  ipv4: string;
  proxy_type: string;
  status: string;
}

interface MonitorResult {
  serverId: string;
  serverName: string;
  ipv4: string;
  clientName: string | null;
  pingStatus: "online" | "offline" | "unknown";
  webStatus: "online" | "offline" | "unknown";
  lastCheck: string;
}

const MONITOR_INTERVAL = 30000; // 30 seconds

const ZabbixIntegration = () => {
  const [servers, setServers] = useState<ZabbixServer[]>([]);
  const [proxies, setProxies] = useState<ZabbixProxy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewServer, setShowNewServer] = useState(false);
  const [showNewProxy, setShowNewProxy] = useState<string | null>(null);
  const [installing, setInstalling] = useState<string | null>(null);
  const [monitorResults, setMonitorResults] = useState<Record<string, MonitorResult>>({});
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastMonitorTime, setLastMonitorTime] = useState<Date | null>(null);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [clientFilter, setClientFilter] = useState("");
  const [sshOpen, setSshOpen] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState<string | null>(null);
  const monitorIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    client_name: "",
    ipv4: "",
    ipv6: "",
    ssh_user: "root",
    ssh_password: "",
    ssh_port: "22",
    zabbix_db_user: "zabbix",
    zabbix_db_password: "",
    zabbix_db_root_password: "",
    install_grafana: false,
    zabbix_version: "7.0",
    enable_firewall: true,
    firewall_allow_all: false,
    firewall_allowed_ips: "",
    zabbix_domain: "",
    enable_https: false,
  });

  const [proxyFormData, setProxyFormData] = useState({
    name: "",
    ipv4: "",
    ipv6: "",
    ssh_user: "root",
    ssh_password: "",
    ssh_port: "22",
    proxy_type: "active",
    proxy_db_user: "zabbix_proxy",
    proxy_db_password: "",
    proxy_db_root_password: "",
  });

  const runMonitor = useCallback(async () => {
    if (isMonitoring) return;
    
    setIsMonitoring(true);
    try {
      const response = await supabase.functions.invoke("monitor-zabbix-server", {
        body: {},
      });
      
      if (response.error) {
        console.error("Monitor error:", response.error);
        return;
      }
      
      if (response.data?.results) {
        const resultsMap: Record<string, MonitorResult> = {};
        response.data.results.forEach((result: MonitorResult) => {
          resultsMap[result.serverId] = result;
        });
        setMonitorResults(resultsMap);
        setLastMonitorTime(new Date());
      }
    } catch (error) {
      console.error("Monitor error:", error);
    } finally {
      setIsMonitoring(false);
    }
  }, [isMonitoring]);

  const startMonitoring = useCallback(() => {
    if (monitorIntervalRef.current) {
      clearInterval(monitorIntervalRef.current);
    }
    
    runMonitor();
    
    monitorIntervalRef.current = setInterval(() => {
      runMonitor();
    }, MONITOR_INTERVAL);
  }, [runMonitor]);

  useEffect(() => {
    fetchServers();
    fetchProxies();
    
    const channel = supabase
      .channel('zabbix-servers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'zabbix_servers' }, () => {
        fetchServers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'zabbix_proxies' }, () => {
        fetchProxies();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (servers.length > 0) {
      startMonitoring();
    }
  }, [servers.length, startMonitoring]);

  const fetchServers = async () => {
    const { data, error } = await supabase
      .from("zabbix_servers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar servidores Zabbix");
      return;
    }

    setServers(data || []);
    setLoading(false);
  };

  const fetchProxies = async () => {
    const { data, error } = await supabase
      .from("zabbix_proxies")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) {
      setProxies(data || []);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      client_name: "",
      ipv4: "",
      ipv6: "",
      ssh_user: "root",
      ssh_password: "",
      ssh_port: "22",
      zabbix_db_user: "zabbix",
      zabbix_db_password: "",
      zabbix_db_root_password: "",
      install_grafana: false,
      zabbix_version: "7.0",
      enable_firewall: true,
      firewall_allow_all: false,
      firewall_allowed_ips: "",
      zabbix_domain: "",
      enable_https: false,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }

    const agentToken = crypto.randomUUID();

    const { data: newServer, error } = await supabase
      .from("zabbix_servers")
      .insert({
        user_id: user.id,
        name: formData.name,
        client_name: formData.client_name || null,
        ipv4: formData.ipv4,
        ipv6: formData.ipv6 || null,
        ssh_user: formData.ssh_user,
        ssh_port: parseInt(formData.ssh_port),
        ssh_password_encrypted: formData.ssh_password || null,
        zabbix_db_user: formData.zabbix_db_user,
        zabbix_db_password: formData.zabbix_db_password,
        zabbix_db_root_password: formData.zabbix_db_root_password,
        install_grafana: formData.install_grafana,
        agent_token: agentToken,
      })
      .select()
      .single();

    if (error) {
      toast.error("Erro ao criar servidor: " + error.message);
      return;
    }

    toast.success("Servidor Zabbix criado! Iniciando instalação...");
    setShowNewServer(false);
    
    // Store form options before reset
    const installOptions = {
      zabbixVersion: formData.zabbix_version,
      enableFirewall: formData.enable_firewall,
      firewallAllowAll: formData.firewall_allow_all,
      firewallAllowedIps: formData.firewall_allowed_ips,
      zabbixDomain: formData.zabbix_domain,
      enableHttps: formData.enable_https,
    };
    
    resetForm();
    await fetchServers();
    
    // Auto-start installation with form options
    if (newServer) {
      startInstallation(newServer, installOptions);
    }
  };

  const handleProxySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showNewProxy) return;

    const agentToken = crypto.randomUUID();

    const { error } = await supabase
      .from("zabbix_proxies")
      .insert({
        server_id: showNewProxy,
        name: proxyFormData.name,
        ipv4: proxyFormData.ipv4,
        ipv6: proxyFormData.ipv6 || null,
        ssh_user: proxyFormData.ssh_user,
        ssh_port: parseInt(proxyFormData.ssh_port),
        ssh_password_encrypted: proxyFormData.ssh_password || null,
        proxy_type: proxyFormData.proxy_type,
        proxy_db_user: proxyFormData.proxy_db_user,
        proxy_db_password: proxyFormData.proxy_db_password,
        proxy_db_root_password: proxyFormData.proxy_db_root_password,
        agent_token: agentToken,
      });

    if (error) {
      toast.error("Erro ao criar proxy: " + error.message);
      return;
    }

    toast.success("Proxy Zabbix criado!");
    setShowNewProxy(null);
    fetchProxies();
  };

  const startInstallation = async (server: ZabbixServer, installOptions?: {
    zabbixVersion?: string;
    enableFirewall?: boolean;
    firewallAllowAll?: boolean;
    firewallAllowedIps?: string;
    zabbixDomain?: string;
    enableHttps?: boolean;
  }) => {
    setInstalling(server.id);
    
    // Use provided options or defaults for existing servers
    const options = installOptions || {
      zabbixVersion: "7.0",
      enableFirewall: true,
      firewallAllowAll: false,
      firewallAllowedIps: "",
      zabbixDomain: "",
      enableHttps: false,
    };
    
    try {
      const response = await supabase.functions.invoke("install-zabbix-server", {
        body: {
          serverId: server.id,
          ipv4: server.ipv4,
          ipv6: server.ipv6,
          sshUser: server.ssh_user,
          sshPassword: server.ssh_password_encrypted,
          sshPort: server.ssh_port,
          zabbixDbUser: server.zabbix_db_user,
          zabbixDbPassword: server.zabbix_db_password,
          zabbixDbRootPassword: server.zabbix_db_root_password,
          installGrafana: server.install_grafana,
          zabbixVersion: options.zabbixVersion,
          enableFirewall: options.enableFirewall,
          firewallAllowAll: options.firewallAllowAll,
          firewallAllowedIps: options.firewallAllowedIps?.split(",").map((ip: string) => ip.trim()).filter(Boolean) || [],
          zabbixDomain: options.zabbixDomain,
          enableHttps: options.enableHttps,
        },
      });

      if (response.error) {
        toast.error(`Erro na instalação: ${response.error.message}`);
      } else {
        toast.success("Instalação iniciada!");
      }
      
      fetchServers();
    } catch (error: any) {
      toast.error("Erro na instalação: " + error.message);
    } finally {
      setInstalling(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const deleteServer = async (serverId: string) => {
    const { error } = await supabase.from("zabbix_servers").delete().eq("id", serverId);
    if (error) {
      toast.error("Erro ao excluir servidor");
      return;
    }
    toast.success("Servidor excluído");
    fetchServers();
  };

  const getStatusConfig = (status: string, monitorResult?: MonitorResult) => {
    if (monitorResult) {
      if (monitorResult.pingStatus === "online" && monitorResult.webStatus === "online") {
        return { 
          badge: <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Ativo</Badge>,
          color: "border-green-500/50",
          bgColor: "bg-green-500/5"
        };
      }
      if (monitorResult.pingStatus === "online" && monitorResult.webStatus === "offline") {
        return { 
          badge: <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30"><AlertTriangle className="w-3 h-3 mr-1" /> Web Offline</Badge>,
          color: "border-orange-500/50",
          bgColor: "bg-orange-500/5"
        };
      }
      if (monitorResult.pingStatus === "offline") {
        return { 
          badge: <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><WifiOff className="w-3 h-3 mr-1" /> Offline</Badge>,
          color: "border-red-500/50",
          bgColor: "bg-red-500/5"
        };
      }
    }
    
    switch (status) {
      case "active":
        return { 
          badge: <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Ativo</Badge>,
          color: "border-green-500/50",
          bgColor: "bg-green-500/5"
        };
      case "error":
      case "offline":
        return { 
          badge: <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" /> Falhou</Badge>,
          color: "border-red-500/50",
          bgColor: "bg-red-500/5"
        };
      case "installing":
        return { 
          badge: <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Instalando</Badge>,
          color: "border-yellow-500/50",
          bgColor: "bg-yellow-500/5"
        };
      default:
        return { 
          badge: <Badge className="bg-muted text-muted-foreground"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>,
          color: "border-border/50",
          bgColor: ""
        };
    }
  };

  const onlineCount = Object.values(monitorResults).filter(r => r.pingStatus === "online").length;
  const webOnlineCount = Object.values(monitorResults).filter(r => r.webStatus === "online").length;
  const offlineCount = Object.values(monitorResults).filter(r => r.pingStatus === "offline").length;

  const filteredServers = servers.filter(s => 
    !clientFilter || 
    s.client_name?.toLowerCase().includes(clientFilter.toLowerCase()) ||
    s.name.toLowerCase().includes(clientFilter.toLowerCase())
  );

  const uniqueClients = [...new Set(servers.map(s => s.client_name).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Zabbix Monitor
          </h1>
          <p className="text-muted-foreground">
            Monitoramento em tempo real - Intervalo: {MONITOR_INTERVAL / 1000}s
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={runMonitor} disabled={isMonitoring}>
            {isMonitoring ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Radio className="w-4 h-4 mr-2" />}
            Verificar
          </Button>
          <Dialog open={showNewServer} onOpenChange={setShowNewServer}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Plus className="w-4 h-4 mr-2" />
                Novo Servidor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Adicionar Servidor Zabbix</DialogTitle>
                <DialogDescription>Configure o servidor Zabbix (Debian 12)</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <Tabs defaultValue="connection" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="connection">Conexão</TabsTrigger>
                    <TabsTrigger value="database">Banco de Dados</TabsTrigger>
                    <TabsTrigger value="firewall">Firewall</TabsTrigger>
                    <TabsTrigger value="options">Opções</TabsTrigger>
                  </TabsList>

                  <TabsContent value="connection" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Nome do Servidor *</Label>
                        <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                      </div>
                      <div>
                        <Label htmlFor="client_name">Nome do Cliente</Label>
                        <Input id="client_name" value={formData.client_name} onChange={(e) => setFormData({ ...formData, client_name: e.target.value })} placeholder="Ex: Empresa ABC" />
                      </div>
                      <div>
                        <Label htmlFor="ipv4">IPv4 *</Label>
                        <Input id="ipv4" value={formData.ipv4} onChange={(e) => setFormData({ ...formData, ipv4: e.target.value })} required />
                      </div>
                      <div>
                        <Label htmlFor="ipv6">IPv6</Label>
                        <Input id="ipv6" value={formData.ipv6} onChange={(e) => setFormData({ ...formData, ipv6: e.target.value })} />
                      </div>
                      <div>
                        <Label htmlFor="ssh_user">Usuário SSH *</Label>
                        <Input id="ssh_user" value={formData.ssh_user} onChange={(e) => setFormData({ ...formData, ssh_user: e.target.value })} required />
                      </div>
                      <div>
                        <Label htmlFor="ssh_port">Porta SSH *</Label>
                        <Input id="ssh_port" type="number" value={formData.ssh_port} onChange={(e) => setFormData({ ...formData, ssh_port: e.target.value })} required />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor="ssh_password">Senha SSH</Label>
                        <Input id="ssh_password" type="password" value={formData.ssh_password} onChange={(e) => setFormData({ ...formData, ssh_password: e.target.value })} placeholder="Será armazenada de forma segura" />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="database" className="space-y-4 mt-4">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="zabbix_db_user">Usuário do Banco *</Label>
                          <Input id="zabbix_db_user" value={formData.zabbix_db_user} onChange={(e) => setFormData({ ...formData, zabbix_db_user: e.target.value })} required />
                        </div>
                        <div>
                          <Label htmlFor="zabbix_db_password">Senha do Banco *</Label>
                          <Input id="zabbix_db_password" type="password" value={formData.zabbix_db_password} onChange={(e) => setFormData({ ...formData, zabbix_db_password: e.target.value })} required />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="zabbix_db_root_password">Senha Root do MariaDB *</Label>
                        <Input id="zabbix_db_root_password" type="password" value={formData.zabbix_db_root_password} onChange={(e) => setFormData({ ...formData, zabbix_db_root_password: e.target.value })} required />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="firewall" className="space-y-4 mt-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/20">
                        <div>
                          <Label className="text-base">Habilitar nftables</Label>
                          <p className="text-sm text-muted-foreground">Configura firewall para portas 80, 443 e 3000</p>
                        </div>
                        <Switch 
                          checked={formData.enable_firewall} 
                          onCheckedChange={(checked) => setFormData({ ...formData, enable_firewall: checked })} 
                        />
                      </div>
                      
                      {formData.enable_firewall && (
                        <>
                          <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/20">
                            <div>
                              <Label className="text-base">Liberar TODOS os IPs</Label>
                              <p className="text-sm text-muted-foreground">Permite acesso de qualquer IP (menos seguro)</p>
                            </div>
                            <Switch 
                              checked={formData.firewall_allow_all} 
                              onCheckedChange={(checked) => setFormData({ ...formData, firewall_allow_all: checked })} 
                            />
                          </div>
                          
                          {!formData.firewall_allow_all && (
                            <div>
                              <Label>IPs Permitidos (portas 80, 443, 3000)</Label>
                              <Textarea 
                                value={formData.firewall_allowed_ips} 
                                onChange={(e) => setFormData({ ...formData, firewall_allowed_ips: e.target.value })} 
                                placeholder="Ex: 10.0.0.0/8, 192.168.1.100, 2001:db8::/32"
                                rows={3}
                              />
                              <p className="text-xs text-muted-foreground mt-1">Separe múltiplos IPs/redes por vírgula</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="options" className="space-y-4 mt-4">
                    <div className="space-y-4">
                      <div>
                        <Label>Versão do Zabbix (Debian 12)</Label>
                        <Select value={formData.zabbix_version} onValueChange={(v) => setFormData({ ...formData, zabbix_version: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="6.0">6.0 LTS</SelectItem>
                            <SelectItem value="7.0">7.0 LTS</SelectItem>
                            <SelectItem value="8.0">8.0 PRE-RELEASE</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/20">
                        <div>
                          <Label className="text-base">Instalar Grafana</Label>
                          <p className="text-sm text-muted-foreground">Inclui plugin de integração Zabbix</p>
                        </div>
                        <Switch 
                          checked={formData.install_grafana} 
                          onCheckedChange={(checked) => setFormData({ ...formData, install_grafana: checked })} 
                        />
                      </div>
                      
                      <div className="space-y-3 pt-4 border-t border-border/50">
                        <Label className="text-base flex items-center gap-2">
                          <Lock className="w-4 h-4" />
                          Configuração HTTPS (Domínio)
                        </Label>
                        <div>
                          <Label htmlFor="zabbix_domain">Domínio</Label>
                          <Input 
                            id="zabbix_domain" 
                            value={formData.zabbix_domain} 
                            onChange={(e) => setFormData({ ...formData, zabbix_domain: e.target.value })} 
                            placeholder="Ex: zabbix.exemplo.com"
                          />
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/20">
                          <div>
                            <Label className="text-base">Habilitar HTTPS (Let's Encrypt)</Label>
                            <p className="text-sm text-muted-foreground">Configura certificado SSL automaticamente</p>
                          </div>
                          <Switch 
                            checked={formData.enable_https} 
                            onCheckedChange={(checked) => setFormData({ ...formData, enable_https: checked })} 
                            disabled={!formData.zabbix_domain}
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowNewServer(false)}>Cancelar</Button>
                  <Button type="submit" variant="hero"><Server className="w-4 h-4 mr-2" />Criar</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      {servers.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="glass-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{servers.length}</p>
                </div>
                <Server className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card border-green-500/30 bg-green-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-400">Online</p>
                  <p className="text-2xl font-bold text-green-400">{onlineCount}</p>
                </div>
                <Wifi className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card border-blue-500/30 bg-blue-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-400">Web Ativo</p>
                  <p className="text-2xl font-bold text-blue-400">{webOnlineCount}</p>
                </div>
                <Globe className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card border-red-500/30 bg-red-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-400">Offline</p>
                  <p className="text-2xl font-bold text-red-400">{offlineCount}</p>
                </div>
                <WifiOff className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card border-purple-500/30 bg-purple-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-400">Proxies</p>
                  <p className="text-2xl font-bold text-purple-400">{proxies.length}</p>
                </div>
                <Database className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Monitor Status */}
      {servers.length > 0 && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`} />
            <span className="text-sm text-muted-foreground">
              {isMonitoring ? 'Verificando...' : `Monitoramento ativo (a cada ${MONITOR_INTERVAL / 1000}s)`}
            </span>
            {lastMonitorTime && (
              <span className="text-xs text-muted-foreground">
                Última: {lastMonitorTime.toLocaleTimeString()}
              </span>
            )}
          </div>
          <Input 
            placeholder="Filtrar por cliente..." 
            value={clientFilter} 
            onChange={(e) => setClientFilter(e.target.value)} 
            className="w-48 h-8 text-sm"
          />
        </div>
      )}

      {/* Server List */}
      {filteredServers.length === 0 ? (
        <Card className="glass-card border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum servidor Zabbix</h3>
            <Button variant="hero" onClick={() => setShowNewServer(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredServers.map((server) => {
            const monitorResult = monitorResults[server.id];
            const statusConfig = getStatusConfig(server.status, monitorResult);
            const serverProxies = proxies.filter(p => p.server_id === server.id);
            
            return (
              <Card key={server.id} className={`glass-card transition-all hover:shadow-lg ${statusConfig.color} ${statusConfig.bgColor}`}>
                <CardContent className="p-0">
                  <div className="grid md:grid-cols-[1fr_1fr_1fr_auto] gap-4 p-4">
                    {/* Server Info */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        <span className="font-semibold text-lg">{server.name}</span>
                        {server.client_name && (
                          <Badge variant="outline" className="text-xs">{server.client_name}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <code className="text-xs bg-muted px-2 py-0.5 rounded">{server.ipv4}</code>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(server.ipv4)}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="pt-2">{statusConfig.badge}</div>
                    </div>

                    {/* Monitoring */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-2 rounded-lg bg-background/50 border border-border/50">
                        <div className="flex items-center gap-2 mb-1">
                          {monitorResult?.pingStatus === "online" ? <Wifi className="w-4 h-4 text-green-400" /> : <WifiOff className="w-4 h-4 text-red-400" />}
                          <span className="text-xs font-medium">PING</span>
                        </div>
                        <p className={`text-sm font-bold ${monitorResult?.pingStatus === "online" ? "text-green-400" : "text-red-400"}`}>
                          {monitorResult?.pingStatus === "online" ? "Online" : "Offline"}
                        </p>
                      </div>
                      <div className="p-2 rounded-lg bg-background/50 border border-border/50">
                        <div className="flex items-center gap-2 mb-1">
                          {monitorResult?.webStatus === "online" ? <Globe className="w-4 h-4 text-green-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
                          <span className="text-xs font-medium">WEB</span>
                        </div>
                        <p className={`text-sm font-bold ${monitorResult?.webStatus === "online" ? "text-green-400" : "text-red-400"}`}>
                          {monitorResult?.webStatus === "online" ? "Ativo" : "Inativo"}
                        </p>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Database className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono">DB: {server.zabbix_db_user}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Settings className="w-4 h-4 text-muted-foreground" />
                        <span>Grafana: {server.install_grafana ? "Sim" : "Não"}</span>
                      </div>
                      {serverProxies.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {serverProxies.length} proxy(ies)
                        </Badge>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        {/* Open Zabbix */}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(`http://${server.ipv4}`, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Zabbix
                        </Button>

                        {/* Server Details (Proxies, Hosts, Firewall) */}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setDetailsOpen(server.id)}
                        >
                          <Settings className="w-4 h-4 mr-1" />
                          Gerenciar
                        </Button>
                        <ZabbixServerDetails
                          server={server}
                          zabbixVersion={formData.zabbix_version}
                          open={detailsOpen === server.id}
                          onOpenChange={(open) => setDetailsOpen(open ? server.id : null)}
                        />

                        {/* SSH Button */}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSshOpen(server.id)}
                        >
                          <Terminal className="w-4 h-4 mr-1" />
                          SSH
                        </Button>
                        
                        {/* WebSSH Terminal Modal */}
                        <WebSSHTerminal
                          open={sshOpen === server.id}
                          onOpenChange={(open) => setSshOpen(open ? server.id : null)}
                          serverName={server.name}
                          ipv4={server.ipv4}
                          sshPort={server.ssh_port}
                          sshUser={server.ssh_user}
                          sshPassword={server.ssh_password_encrypted || ""}
                        />

                        {/* Add Proxy */}
                        <Dialog open={showNewProxy === server.id} onOpenChange={(open) => setShowNewProxy(open ? server.id : null)}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Plus className="w-4 h-4 mr-1" />
                              Proxy
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                            <DialogHeader>
                              <DialogTitle>Adicionar Proxy Zabbix</DialogTitle>
                              <DialogDescription>Para o servidor: {server.name}</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleProxySubmit} className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Nome do Proxy *</Label>
                                  <Input value={proxyFormData.name} onChange={(e) => setProxyFormData({ ...proxyFormData, name: e.target.value })} required />
                                </div>
                                <div>
                                  <Label>Tipo *</Label>
                                  <Select value={proxyFormData.proxy_type} onValueChange={(v) => setProxyFormData({ ...proxyFormData, proxy_type: v })}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="active">Ativo</SelectItem>
                                      <SelectItem value="passive">Passivo</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label>IPv4 *</Label>
                                  <Input value={proxyFormData.ipv4} onChange={(e) => setProxyFormData({ ...proxyFormData, ipv4: e.target.value })} required />
                                </div>
                                <div>
                                  <Label>Porta SSH</Label>
                                  <Input type="number" value={proxyFormData.ssh_port} onChange={(e) => setProxyFormData({ ...proxyFormData, ssh_port: e.target.value })} />
                                </div>
                                <div>
                                  <Label>Usuário BD Proxy</Label>
                                  <Input value={proxyFormData.proxy_db_user} onChange={(e) => setProxyFormData({ ...proxyFormData, proxy_db_user: e.target.value })} />
                                </div>
                                <div>
                                  <Label>Senha BD Proxy *</Label>
                                  <Input type="password" value={proxyFormData.proxy_db_password} onChange={(e) => setProxyFormData({ ...proxyFormData, proxy_db_password: e.target.value })} required />
                                </div>
                                <div className="col-span-2">
                                  <Label>Senha Root MariaDB *</Label>
                                  <Input type="password" value={proxyFormData.proxy_db_root_password} onChange={(e) => setProxyFormData({ ...proxyFormData, proxy_db_root_password: e.target.value })} required />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setShowNewProxy(null)}>Cancelar</Button>
                                <Button type="submit">Criar Proxy</Button>
                              </div>
                            </form>
                          </DialogContent>
                        </Dialog>

                        {/* Install */}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => startInstallation(server)}
                          disabled={installing === server.id}
                        >
                          {installing === server.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        </Button>

                        {/* Logs */}
                        {server.installation_log && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" title="Logs"><Eye className="w-4 h-4" /></Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh]">
                              <DialogHeader>
                                <DialogTitle>Logs - {server.name}</DialogTitle>
                              </DialogHeader>
                              <ScrollArea className="h-[60vh] w-full rounded-md border bg-muted/50 p-4">
                                <pre className="text-xs font-mono whitespace-pre-wrap">{server.installation_log}</pre>
                              </ScrollArea>
                            </DialogContent>
                          </Dialog>
                        )}

                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteServer(server.id)}>
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ZabbixIntegration;
