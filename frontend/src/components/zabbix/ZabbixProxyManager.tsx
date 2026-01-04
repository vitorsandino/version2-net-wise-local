import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Server, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2, 
  Wifi, 
  WifiOff, 
  Eye, 
  Play,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Copy,
  Terminal
} from "lucide-react";
import WebSSHTerminal from "@/components/dns/WebSSHTerminal";

interface ZabbixProxy {
  id: string;
  server_id: string;
  name: string;
  ipv4: string;
  ipv6: string | null;
  ssh_user: string;
  ssh_port: number;
  ssh_password_encrypted: string | null;
  proxy_type: string;
  proxy_db_user: string;
  proxy_db_password: string;
  proxy_db_root_password: string;
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

interface ZabbixServer {
  id: string;
  name: string;
  ipv4: string;
  zabbix_version?: string;
}

interface ZabbixProxyManagerProps {
  serverId: string;
  serverName: string;
  serverVersion?: string;
  onClose?: () => void;
}

const ZabbixProxyManager = ({ serverId, serverName, serverVersion = "7.0" }: ZabbixProxyManagerProps) => {
  const [proxies, setProxies] = useState<ZabbixProxy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddProxy, setShowAddProxy] = useState(false);
  const [editProxy, setEditProxy] = useState<ZabbixProxy | null>(null);
  const [installing, setInstalling] = useState<string | null>(null);
  const [pingStatus, setPingStatus] = useState<Record<string, "online" | "offline" | "checking">>({});
  const [sshOpen, setSshOpen] = useState<string | null>(null);

  const [formData, setFormData] = useState({
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

  useEffect(() => {
    fetchProxies();
    
    const channel = supabase
      .channel('zabbix-proxies-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'zabbix_proxies' }, () => {
        fetchProxies();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [serverId]);

  useEffect(() => {
    if (proxies.length > 0) {
      checkProxiesStatus();
    }
  }, [proxies.length]);

  const fetchProxies = async () => {
    const { data, error } = await supabase
      .from("zabbix_proxies")
      .select("*")
      .eq("server_id", serverId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar proxies");
      return;
    }

    setProxies(data || []);
    setLoading(false);
  };

  const checkProxiesStatus = async () => {
    for (const proxy of proxies) {
      setPingStatus(prev => ({ ...prev, [proxy.id]: "checking" }));
      
      try {
        const response = await fetch(`https://${proxy.ipv4}:10051`, {
          method: 'HEAD',
          mode: 'no-cors',
          signal: AbortSignal.timeout(5000)
        }).catch(() => null);
        
        // For now, we'll check if agent is responding via last_agent_check
        const lastCheck = proxy.last_agent_check ? new Date(proxy.last_agent_check) : null;
        const now = new Date();
        const isOnline = lastCheck && (now.getTime() - lastCheck.getTime()) < 120000; // 2 minutes
        
        setPingStatus(prev => ({ ...prev, [proxy.id]: isOnline ? "online" : "offline" }));
      } catch {
        setPingStatus(prev => ({ ...prev, [proxy.id]: "offline" }));
      }
    }
  };

  const resetForm = () => {
    setFormData({
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
    setEditProxy(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const agentToken = crypto.randomUUID();

    if (editProxy) {
      const { error } = await supabase
        .from("zabbix_proxies")
        .update({
          name: formData.name,
          ipv4: formData.ipv4,
          ipv6: formData.ipv6 || null,
          ssh_user: formData.ssh_user,
          ssh_port: parseInt(formData.ssh_port),
          ssh_password_encrypted: formData.ssh_password || editProxy.ssh_password_encrypted,
          proxy_type: formData.proxy_type,
          proxy_db_user: formData.proxy_db_user,
          proxy_db_password: formData.proxy_db_password || editProxy.proxy_db_password,
          proxy_db_root_password: formData.proxy_db_root_password || editProxy.proxy_db_root_password,
        })
        .eq("id", editProxy.id);

      if (error) {
        toast.error("Erro ao atualizar proxy: " + error.message);
        return;
      }
      toast.success("Proxy atualizado!");
    } else {
      const { error } = await supabase
        .from("zabbix_proxies")
        .insert({
          server_id: serverId,
          name: formData.name,
          ipv4: formData.ipv4,
          ipv6: formData.ipv6 || null,
          ssh_user: formData.ssh_user,
          ssh_port: parseInt(formData.ssh_port),
          ssh_password_encrypted: formData.ssh_password || null,
          proxy_type: formData.proxy_type,
          proxy_db_user: formData.proxy_db_user,
          proxy_db_password: formData.proxy_db_password,
          proxy_db_root_password: formData.proxy_db_root_password,
          agent_token: agentToken,
        });

      if (error) {
        toast.error("Erro ao criar proxy: " + error.message);
        return;
      }
      toast.success("Proxy criado!");
    }

    setShowAddProxy(false);
    resetForm();
    fetchProxies();
  };

  const startEditProxy = (proxy: ZabbixProxy) => {
    setEditProxy(proxy);
    setFormData({
      name: proxy.name,
      ipv4: proxy.ipv4,
      ipv6: proxy.ipv6 || "",
      ssh_user: proxy.ssh_user,
      ssh_password: "",
      ssh_port: proxy.ssh_port.toString(),
      proxy_type: proxy.proxy_type,
      proxy_db_user: proxy.proxy_db_user,
      proxy_db_password: "",
      proxy_db_root_password: "",
    });
    setShowAddProxy(true);
  };

  const deleteProxy = async (proxyId: string) => {
    if (!confirm("Tem certeza que deseja excluir este proxy?")) return;
    
    const { error } = await supabase
      .from("zabbix_proxies")
      .delete()
      .eq("id", proxyId);

    if (error) {
      toast.error("Erro ao excluir proxy: " + error.message);
      return;
    }

    toast.success("Proxy excluído!");
    fetchProxies();
  };

  const startInstallation = async (proxy: ZabbixProxy) => {
    setInstalling(proxy.id);
    
    try {
      const response = await supabase.functions.invoke("install-zabbix-proxy", {
        body: {
          proxyId: proxy.id,
          serverId: serverId,
          ipv4: proxy.ipv4,
          ipv6: proxy.ipv6,
          sshUser: proxy.ssh_user,
          sshPassword: proxy.ssh_password_encrypted,
          sshPort: proxy.ssh_port,
          proxyType: proxy.proxy_type,
          proxyDbUser: proxy.proxy_db_user,
          proxyDbPassword: proxy.proxy_db_password,
          proxyDbRootPassword: proxy.proxy_db_root_password,
          zabbixVersion: serverVersion,
        },
      });

      if (response.error) {
        toast.error(`Erro na instalação: ${response.error.message}`);
      } else {
        toast.success("Instalação iniciada!");
      }
      
      fetchProxies();
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

  const getStatusBadge = (proxy: ZabbixProxy) => {
    const status = pingStatus[proxy.id] || "offline";
    
    if (status === "checking") {
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Verificando</Badge>;
    }
    if (status === "online") {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Online</Badge>;
    }
    if (proxy.status === "installing") {
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Instalando</Badge>;
    }
    if (proxy.status === "pending") {
      return <Badge className="bg-muted text-muted-foreground"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
    }
    return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" /> Offline</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" />
            Proxies - {serverName}
            <Badge variant="outline" className="ml-2">v{serverVersion}</Badge>
          </h3>
          <p className="text-sm text-muted-foreground">{proxies.length} proxy(ies) configurado(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={checkProxiesStatus}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Verificar Status
          </Button>
          <Dialog open={showAddProxy} onOpenChange={(open) => { setShowAddProxy(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button variant="hero" size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Novo Proxy
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editProxy ? "Editar Proxy" : "Adicionar Proxy"}</DialogTitle>
                <DialogDescription>Versão: {serverVersion} (mesma do server)</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nome *</Label>
                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div>
                    <Label>Tipo *</Label>
                    <Select value={formData.proxy_type} onValueChange={(v) => setFormData({ ...formData, proxy_type: v })}>
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
                    <Input value={formData.ipv4} onChange={(e) => setFormData({ ...formData, ipv4: e.target.value })} required />
                  </div>
                  <div>
                    <Label>IPv6</Label>
                    <Input value={formData.ipv6} onChange={(e) => setFormData({ ...formData, ipv6: e.target.value })} />
                  </div>
                  <div>
                    <Label>Usuário SSH *</Label>
                    <Input value={formData.ssh_user} onChange={(e) => setFormData({ ...formData, ssh_user: e.target.value })} required />
                  </div>
                  <div>
                    <Label>Porta SSH</Label>
                    <Input type="number" value={formData.ssh_port} onChange={(e) => setFormData({ ...formData, ssh_port: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <Label>Senha SSH {editProxy ? "(deixe vazio para manter)" : "*"}</Label>
                    <Input type="password" value={formData.ssh_password} onChange={(e) => setFormData({ ...formData, ssh_password: e.target.value })} required={!editProxy} />
                  </div>
                  <div>
                    <Label>Usuário BD Proxy</Label>
                    <Input value={formData.proxy_db_user} onChange={(e) => setFormData({ ...formData, proxy_db_user: e.target.value })} />
                  </div>
                  <div>
                    <Label>Senha BD Proxy {editProxy ? "" : "*"}</Label>
                    <Input type="password" value={formData.proxy_db_password} onChange={(e) => setFormData({ ...formData, proxy_db_password: e.target.value })} required={!editProxy} />
                  </div>
                  <div className="col-span-2">
                    <Label>Senha Root MariaDB {editProxy ? "" : "*"}</Label>
                    <Input type="password" value={formData.proxy_db_root_password} onChange={(e) => setFormData({ ...formData, proxy_db_root_password: e.target.value })} required={!editProxy} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setShowAddProxy(false); resetForm(); }}>Cancelar</Button>
                  <Button type="submit">{editProxy ? "Salvar" : "Criar"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {proxies.length === 0 ? (
        <Card className="glass-card border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Server className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhum proxy configurado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {proxies.map((proxy) => (
            <Card key={proxy.id} className="glass-card border-border/50 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${pingStatus[proxy.id] === "online" ? "bg-green-500" : pingStatus[proxy.id] === "checking" ? "bg-yellow-500 animate-pulse" : "bg-red-500"}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{proxy.name}</span>
                        <Badge variant="outline" className="text-xs">{proxy.proxy_type}</Badge>
                        {getStatusBadge(proxy)}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs bg-muted px-2 py-0.5 rounded">{proxy.ipv4}</code>
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => copyToClipboard(proxy.ipv4)}>
                          <Copy className="w-3 h-3" />
                        </Button>
                        {proxy.last_agent_check && (
                          <span className="text-xs text-muted-foreground">
                            Último check: {new Date(proxy.last_agent_check).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* SSH */}
                    <Button variant="outline" size="sm" onClick={() => setSshOpen(proxy.id)}>
                      <Terminal className="w-4 h-4" />
                    </Button>
                    <WebSSHTerminal
                      open={sshOpen === proxy.id}
                      onOpenChange={(open) => setSshOpen(open ? proxy.id : null)}
                      serverName={proxy.name}
                      ipv4={proxy.ipv4}
                      sshPort={proxy.ssh_port}
                      sshUser={proxy.ssh_user}
                      sshPassword={proxy.ssh_password_encrypted || ""}
                    />

                    {/* Install */}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => startInstallation(proxy)}
                      disabled={installing === proxy.id}
                    >
                      {installing === proxy.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    </Button>

                    {/* Logs */}
                    {proxy.installation_log && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm"><Eye className="w-4 h-4" /></Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh]">
                          <DialogHeader>
                            <DialogTitle>Logs - {proxy.name}</DialogTitle>
                          </DialogHeader>
                          <ScrollArea className="h-[60vh] w-full rounded-md border bg-muted/50 p-4">
                            <pre className="text-xs font-mono whitespace-pre-wrap">{proxy.installation_log}</pre>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    )}

                    {/* Edit */}
                    <Button variant="outline" size="sm" onClick={() => startEditProxy(proxy)}>
                      <Edit className="w-4 h-4" />
                    </Button>

                    {/* Delete */}
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteProxy(proxy.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ZabbixProxyManager;
