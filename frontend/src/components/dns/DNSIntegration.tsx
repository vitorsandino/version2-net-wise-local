import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Network,
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
  HelpCircle,
  Download,
  RotateCcw,
  Settings
} from "lucide-react";
import SSHGuide from "./SSHGuide";
import FirewallEditor from "./FirewallEditor";

interface DNSServer {
  id: string;
  name: string;
  ipv4: string;
  ipv6: string | null;
  ssh_user: string;
  ssh_port: number;
  ssh_password_encrypted: string | null;
  status: string;
  allowed_ssh_ips: string[];
  allowed_dns_ipv4: string[];
  allowed_dns_ipv6: string[];
  loopback_ipv4_1: string | null;
  loopback_ipv4_2: string | null;
  loopback_ipv6_1: string | null;
  loopback_ipv6_2: string | null;
  installation_log: string | null;
  agent_token: string | null;
  pending_command: string | null;
  command_status: string | null;
  command_output: string | null;
  last_agent_check: string | null;
  client_name: string | null;
  created_at: string;
  updated_at: string;
}

interface MonitorResult {
  serverId: string;
  serverName: string;
  ipv4: string;
  clientName: string | null;
  pingStatus: "online" | "offline" | "unknown";
  pingLatency: number | null;
  dnsStatus: "online" | "offline" | "unknown";
  dnsResponseTime: number | null;
  lastCheck: string;
}

const DEFAULT_DNS_IPV4 = "10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 100.64.0.0/10";
const DEFAULT_DNS_IPV6 = "";
const MONITOR_INTERVAL = 5000; // 5 seconds

const DNSIntegration = () => {
  const navigate = useNavigate();
  const [servers, setServers] = useState<DNSServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewServer, setShowNewServer] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [monitorResults, setMonitorResults] = useState<Record<string, MonitorResult>>({});
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastMonitorTime, setLastMonitorTime] = useState<Date | null>(null);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [editingCredentials, setEditingCredentials] = useState<string | null>(null);
  const [credentialsForm, setCredentialsForm] = useState({ ssh_user: "", ssh_password: "" });
  const [clientFilter, setClientFilter] = useState("");
  const [reinstalling, setReinstalling] = useState<string | null>(null);
  const [liveLogsOpen, setLiveLogsOpen] = useState<string | null>(null);
  const [liveLogs, setLiveLogs] = useState<string>("");
  const monitorIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const logsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    client_name: "",
    ipv4: "",
    ipv6: "",
    ssh_user: "root",
    ssh_password: "",
    ssh_port: "22",
    allowed_ssh_ips: "",
    allowed_dns_ipv4: DEFAULT_DNS_IPV4,
    allowed_dns_ipv6: DEFAULT_DNS_IPV6,
    loopback_ipv4_1: "",
    loopback_ipv4_2: "",
    loopback_ipv6_1: "",
    loopback_ipv6_2: "",
  });

  const runMonitor = useCallback(async () => {
    if (isMonitoring) return;
    
    setIsMonitoring(true);
    try {
      const response = await supabase.functions.invoke("monitor-dns-server", {
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
    
    const channel = supabase
      .channel('dns-servers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dns_servers' }, () => {
        fetchServers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current);
      }
      if (logsIntervalRef.current) {
        clearInterval(logsIntervalRef.current);
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
      .from("dns_servers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar servidores DNS");
      return;
    }

    setServers(data || []);
    setLoading(false);
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
      allowed_ssh_ips: "",
      allowed_dns_ipv4: DEFAULT_DNS_IPV4,
      allowed_dns_ipv6: DEFAULT_DNS_IPV6,
      loopback_ipv4_1: "",
      loopback_ipv4_2: "",
      loopback_ipv6_1: "",
      loopback_ipv6_2: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }

    const parseIPs = (str: string) => 
      str.split(",").map(ip => ip.trim()).filter(ip => ip);

    const agentToken = crypto.randomUUID();

    const { error } = await supabase
      .from("dns_servers")
      .insert({
        user_id: user.id,
        name: formData.name,
        client_name: formData.client_name || null,
        ipv4: formData.ipv4,
        ipv6: formData.ipv6 || null,
        ssh_user: formData.ssh_user,
        ssh_port: parseInt(formData.ssh_port),
        ssh_password_encrypted: formData.ssh_password || null,
        allowed_ssh_ips: parseIPs(formData.allowed_ssh_ips),
        allowed_dns_ipv4: parseIPs(formData.allowed_dns_ipv4),
        allowed_dns_ipv6: parseIPs(formData.allowed_dns_ipv6),
        loopback_ipv4_1: formData.loopback_ipv4_1 || null,
        loopback_ipv4_2: formData.loopback_ipv4_2 || null,
        loopback_ipv6_1: formData.loopback_ipv6_1 || null,
        loopback_ipv6_2: formData.loopback_ipv6_2 || null,
        agent_token: agentToken,
      });

    if (error) {
      toast.error("Erro ao criar servidor: " + error.message);
      return;
    }

    toast.success("Servidor DNS criado com sucesso!");
    setShowNewServer(false);
    resetForm();
    fetchServers();
  };

  const startInstallation = async (server: DNSServer, password: string) => {
    setInstalling(server.id);
    
    try {
      const response = await supabase.functions.invoke("install-dns-server", {
        body: {
          serverId: server.id,
          ipv4: server.ipv4,
          ipv6: server.ipv6,
          sshUser: server.ssh_user,
          sshPassword: password,
          sshPort: server.ssh_port,
          allowedSshIps: server.allowed_ssh_ips,
          allowedDnsIpv4: server.allowed_dns_ipv4,
          allowedDnsIpv6: server.allowed_dns_ipv6,
          loopbackIpv4_1: server.loopback_ipv4_1,
          loopbackIpv4_2: server.loopback_ipv4_2,
          loopbackIpv6_1: server.loopback_ipv6_1,
          loopbackIpv6_2: server.loopback_ipv6_2,
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

  const updateCredentials = async (serverId: string) => {
    const { error } = await supabase
      .from("dns_servers")
      .update({
        ssh_user: credentialsForm.ssh_user,
        ssh_password_encrypted: credentialsForm.ssh_password || null,
      })
      .eq("id", serverId);

    if (error) {
      toast.error("Erro ao atualizar credenciais");
      return;
    }

    toast.success("Credenciais atualizadas!");
    setEditingCredentials(null);
    fetchServers();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const reinstallAgent = async (server: DNSServer) => {
    setReinstalling(server.id);
    try {
      // Set a command to reinstall the agent
      const { error } = await supabase
        .from("dns_servers")
        .update({
          pending_command: `curl -sSL "https://qtdorkjllvsbfcwbigpo.supabase.co/functions/v1/agent-install?token=${server.agent_token}" | bash`,
          command_status: "pending",
        })
        .eq("id", server.id);

      if (error) {
        toast.error("Erro ao enviar comando de reinstalação");
        return;
      }

      toast.success("Comando de reinstalação enviado! O agente será atualizado automaticamente.");
      fetchServers();
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setReinstalling(null);
    }
  };

  const startLiveLogs = (server: DNSServer) => {
    setLiveLogsOpen(server.id);
    setLiveLogs("Iniciando monitoramento de logs em tempo real...\n");
    
    // Initial fetch
    const fetchLogs = async () => {
      const { data } = await supabase
        .from("dns_servers")
        .select("command_output, command_status, installation_log")
        .eq("id", server.id)
        .single();
      
      if (data) {
        let logContent = "";
        const timestamp = new Date().toLocaleTimeString();
        if (data.command_status) {
          logContent = `[${timestamp}] Status: ${data.command_status}\n\n`;
        }
        if (data.command_output) {
          logContent += `=== Execução Atual ===\n${data.command_output}\n`;
        }
        if (data.installation_log) {
          logContent += `\n=== Histórico ===\n${data.installation_log}`;
        }
        setLiveLogs(logContent || "Aguardando logs...");
      }
    };
    
    fetchLogs();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel(`logs-${server.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'dns_servers',
        filter: `id=eq.${server.id}`
      }, (payload) => {
        const data = payload.new as any;
        if (data) {
          let logContent = "";
          const timestamp = new Date().toLocaleTimeString();
          if (data.command_status) {
            logContent = `[${timestamp}] Status: ${data.command_status}\n\n`;
          }
          if (data.command_output) {
            logContent += `=== Execução Atual ===\n${data.command_output}\n`;
          }
          if (data.installation_log) {
            logContent += `\n=== Histórico ===\n${data.installation_log}`;
          }
          setLiveLogs(logContent || "Aguardando logs...");
        }
      })
      .subscribe();
    
    // Store channel reference for cleanup
    logsIntervalRef.current = channel as any;
  };

  const stopLiveLogs = () => {
    setLiveLogsOpen(null);
    setLiveLogs("");
    if (logsIntervalRef.current) {
      // Remove channel subscription
      if (typeof logsIntervalRef.current === 'object' && 'unsubscribe' in logsIntervalRef.current) {
        supabase.removeChannel(logsIntervalRef.current as any);
      } else {
        clearInterval(logsIntervalRef.current);
      }
      logsIntervalRef.current = null;
    }
  };

  const deleteServer = async (serverId: string) => {
    const { error } = await supabase.from("dns_servers").delete().eq("id", serverId);
    if (error) {
      toast.error("Erro ao excluir servidor");
      return;
    }
    toast.success("Servidor excluído");
    fetchServers();
  };

  const getStatusConfig = (status: string, monitorResult?: MonitorResult) => {
    if (monitorResult) {
      if (monitorResult.pingStatus === "online" && monitorResult.dnsStatus === "online") {
        return { 
          badge: <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Ativo</Badge>,
          color: "border-green-500/50",
          bgColor: "bg-green-500/5"
        };
      }
      if (monitorResult.pingStatus === "online" && monitorResult.dnsStatus === "offline") {
        return { 
          badge: <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30"><AlertTriangle className="w-3 h-3 mr-1" /> DNS Offline</Badge>,
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
      case "success":
      case "active":
        return { 
          badge: <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Ativo</Badge>,
          color: "border-green-500/50",
          bgColor: "bg-green-500/5"
        };
      case "failed":
      case "error":
      case "offline":
        return { 
          badge: <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" /> Falhou</Badge>,
          color: "border-red-500/50",
          bgColor: "bg-red-500/5"
        };
      case "dns_error":
        return { 
          badge: <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30"><AlertTriangle className="w-3 h-3 mr-1" /> DNS Erro</Badge>,
          color: "border-orange-500/50",
          bgColor: "bg-orange-500/5"
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
  const dnsOnlineCount = Object.values(monitorResults).filter(r => r.dnsStatus === "online").length;
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
            <Network className="w-6 h-6 text-primary" />
            DNS Monitor
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
                <DialogTitle>Adicionar Servidor DNS</DialogTitle>
                <DialogDescription>Preencha os dados do servidor</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <Tabs defaultValue="connection" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="connection">Conexão</TabsTrigger>
                    <TabsTrigger value="firewall">Firewall</TabsTrigger>
                    <TabsTrigger value="anycast">Anycast</TabsTrigger>
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

                  <TabsContent value="firewall" className="space-y-4 mt-4">
                    <div className="space-y-4">
                      <div>
                        <Label>IPs Liberados SSH</Label>
                        <Textarea value={formData.allowed_ssh_ips} onChange={(e) => setFormData({ ...formData, allowed_ssh_ips: e.target.value })} rows={2} />
                      </div>
                      <div>
                        <Label>IPs IPv4 DNS</Label>
                        <Textarea value={formData.allowed_dns_ipv4} onChange={(e) => setFormData({ ...formData, allowed_dns_ipv4: e.target.value })} rows={2} />
                      </div>
                      <div>
                        <Label>IPs IPv6 DNS</Label>
                        <Textarea value={formData.allowed_dns_ipv6} onChange={(e) => setFormData({ ...formData, allowed_dns_ipv6: e.target.value })} rows={2} />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="anycast" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Loopback IPv4 #1</Label>
                        <Input value={formData.loopback_ipv4_1} onChange={(e) => setFormData({ ...formData, loopback_ipv4_1: e.target.value })} />
                      </div>
                      <div>
                        <Label>Loopback IPv4 #2</Label>
                        <Input value={formData.loopback_ipv4_2} onChange={(e) => setFormData({ ...formData, loopback_ipv4_2: e.target.value })} />
                      </div>
                      <div>
                        <Label>Loopback IPv6 #1</Label>
                        <Input value={formData.loopback_ipv6_1} onChange={(e) => setFormData({ ...formData, loopback_ipv6_1: e.target.value })} />
                      </div>
                      <div>
                        <Label>Loopback IPv6 #2</Label>
                        <Input value={formData.loopback_ipv6_2} onChange={(e) => setFormData({ ...formData, loopback_ipv6_2: e.target.value })} />
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
                  <p className="text-sm text-blue-400">DNS Ativo</p>
                  <p className="text-2xl font-bold text-blue-400">{dnsOnlineCount}</p>
                </div>
                <Zap className="w-8 h-8 text-blue-400" />
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
          <Card className="glass-card border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-400">Clientes</p>
                  <p className="text-2xl font-bold text-yellow-400">{uniqueClients.length}</p>
                </div>
                <User className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Monitor Status + Filter */}
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
          <div className="flex items-center gap-2">
            <Input 
              placeholder="Filtrar por cliente..." 
              value={clientFilter} 
              onChange={(e) => setClientFilter(e.target.value)} 
              className="w-48 h-8 text-sm"
            />
          </div>
        </div>
      )}

      {/* Server List */}
      {filteredServers.length === 0 ? (
        <Card className="glass-card border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Server className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum servidor DNS</h3>
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
            return (
              <Card key={server.id} className={`glass-card transition-all hover:shadow-lg ${statusConfig.color} ${statusConfig.bgColor}`}>
                <CardContent className="p-0">
                  <div className="grid md:grid-cols-[1fr_1fr_1fr_auto] gap-4 p-4">
                    {/* Server Info */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Server className="w-5 h-5 text-primary" />
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
                        {monitorResult?.pingLatency && <p className="text-xs text-muted-foreground">{monitorResult.pingLatency}ms</p>}
                      </div>
                      <div className="p-2 rounded-lg bg-background/50 border border-border/50">
                        <div className="flex items-center gap-2 mb-1">
                          {monitorResult?.dnsStatus === "online" ? <Zap className="w-4 h-4 text-green-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
                          <span className="text-xs font-medium">DNS:53</span>
                        </div>
                        <p className={`text-sm font-bold ${monitorResult?.dnsStatus === "online" ? "text-green-400" : "text-red-400"}`}>
                          {monitorResult?.dnsStatus === "online" ? "Ativo" : "Inativo"}
                        </p>
                        {monitorResult?.dnsResponseTime && <p className="text-xs text-muted-foreground">{monitorResult.dnsResponseTime}ms</p>}
                      </div>
                    </div>

                    {/* Credentials */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono">{server.ssh_user}@{server.ipv4}:{server.ssh_port}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Key className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono">
                          {showPassword[server.id] 
                            ? (server.ssh_password_encrypted || "Não definida") 
                            : "••••••••"}
                        </span>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowPassword({ ...showPassword, [server.id]: !showPassword[server.id] })}>
                          {showPassword[server.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </Button>
                      </div>
                      <Dialog open={editingCredentials === server.id} onOpenChange={(open) => {
                        if (open) {
                          setCredentialsForm({ ssh_user: server.ssh_user, ssh_password: "" });
                        }
                        setEditingCredentials(open ? server.id : null);
                      }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 text-xs">
                            <Key className="w-3 h-3 mr-1" />
                            Editar Credenciais
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Editar Credenciais</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Usuário SSH</Label>
                              <Input value={credentialsForm.ssh_user} onChange={(e) => setCredentialsForm({ ...credentialsForm, ssh_user: e.target.value })} />
                            </div>
                            <div>
                              <Label>Nova Senha SSH</Label>
                              <Input type="password" value={credentialsForm.ssh_password} onChange={(e) => setCredentialsForm({ ...credentialsForm, ssh_password: e.target.value })} placeholder="Deixe vazio para manter" />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" onClick={() => setEditingCredentials(null)}>Cancelar</Button>
                              <Button onClick={() => updateCredentials(server.id)}>Salvar</Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        {/* Dashboard */}
                        <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/server/${server.id}`)}>
                          <BarChart3 className="w-4 h-4 mr-1" />
                          Dashboard
                        </Button>
                        
                        {/* PuTTY Quick Connect - Opens PuTTY directly via URI scheme */}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const password = server.ssh_password_encrypted || '';
                            // Try to open PuTTY via putty:// URI scheme (requires PuTTY URL handler)
                            // Fallback: copy command to clipboard
                            const puttyCommand = password 
                              ? `putty.exe -ssh ${server.ssh_user}@${server.ipv4} -P ${server.ssh_port} -pw "${password}"`
                              : `putty.exe -ssh ${server.ssh_user}@${server.ipv4} -P ${server.ssh_port}`;
                            
                            // Try to open via URI scheme (works if user has handler registered)
                            const sshUri = `ssh://${server.ssh_user}@${server.ipv4}:${server.ssh_port}`;
                            
                            // Create invisible link and try to open
                            const link = document.createElement('a');
                            link.href = sshUri;
                            link.style.display = 'none';
                            document.body.appendChild(link);
                            
                            try {
                              link.click();
                              toast.success("Abrindo cliente SSH...");
                            } catch (e) {
                              // Fallback: copy command
                              navigator.clipboard.writeText(puttyCommand);
                              toast.info("Comando copiado! Cole no Executar (Win+R): " + puttyCommand.substring(0, 50) + "...");
                            }
                            
                            document.body.removeChild(link);
                            
                            // Also copy to clipboard as backup
                            navigator.clipboard.writeText(puttyCommand);
                          }}
                          title="Abrir PuTTY/SSH"
                        >
                          <Terminal className="w-4 h-4 mr-1" />
                          PuTTY
                        </Button>

                        {/* Install */}
                        <InstallButton server={server} installing={installing} onInstall={startInstallation} />

                        {/* Live Logs */}
                        <Dialog open={liveLogsOpen === server.id} onOpenChange={(open) => {
                          if (open) startLiveLogs(server);
                          else stopLiveLogs();
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" title="Logs em Tempo Real">
                              <Activity className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh]">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <Activity className="w-5 h-5 text-primary animate-pulse" />
                                Logs em Tempo Real - {server.name}
                              </DialogTitle>
                              <DialogDescription>
                                Monitoramento automático a cada 2 segundos
                              </DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="h-[60vh] w-full rounded-md border bg-background/50 p-4">
                              <pre className="text-xs font-mono whitespace-pre-wrap text-foreground">{liveLogs}</pre>
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>

                        {/* Static Logs */}
                        {server.installation_log && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" title="Histórico de Logs"><Eye className="w-4 h-4" /></Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh]">
                              <DialogHeader>
                                <DialogTitle>Histórico - {server.name}</DialogTitle>
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

                      {/* Agent Controls */}
                      {server.agent_token && (
                        <div className="flex items-center gap-2">
                          {/* Firewall Editor */}
                          <FirewallEditor
                            serverId={server.id}
                            serverName={server.name}
                            sshPort={server.ssh_port}
                            allowedSshIps={server.allowed_ssh_ips}
                            allowedDnsIpv4={server.allowed_dns_ipv4}
                            allowedDnsIpv6={server.allowed_dns_ipv6}
                          />
                        </div>
                      )}
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

const InstallButton = ({ server, installing, onInstall }: { server: DNSServer; installing: string | null; onInstall: (server: DNSServer, password: string) => void }) => {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");

  const handleInstall = () => {
    if (!password) {
      toast.error("Digite a senha SSH");
      return;
    }
    onInstall(server, password);
    setOpen(false);
    setPassword("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="hero" size="sm" disabled={installing === server.id}>
          {installing === server.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>SSH - {server.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Senha SSH</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleInstall()} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="hero" onClick={handleInstall}><Play className="w-4 h-4 mr-2" />Instalar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DNSIntegration;