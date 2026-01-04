import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Shield,
  Key,
  Eye,
  EyeOff,
  Copy,
  Save,
  Loader2,
  Terminal,
  Activity,
  Server,
  Lock,
  Globe,
  RefreshCw,
  Plus,
  Trash2
} from "lucide-react";

interface DNSServer {
  id: string;
  name: string;
  ipv4: string;
  ipv6: string | null;
  ssh_user: string;
  ssh_port: number;
  ssh_password_encrypted: string | null;
  allowed_ssh_ips: string[];
  allowed_dns_ipv4: string[];
  allowed_dns_ipv6: string[];
  loopback_ipv4_1: string | null;
  loopback_ipv4_2: string | null;
  loopback_ipv6_1: string | null;
  loopback_ipv6_2: string | null;
  agent_token: string | null;
  installation_log: string | null;
  command_output: string | null;
  command_status: string | null;
}

interface DNSServerDetailsProps {
  server: DNSServer;
  onBack: () => void;
  onRefresh: () => void;
}

const DNSServerDetails = ({ server, onBack, onRefresh }: DNSServerDetailsProps) => {
  const [activeTab, setActiveTab] = useState("firewall");
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  
  // Firewall state
  const [allowedSshIps, setAllowedSshIps] = useState<string[]>(server.allowed_ssh_ips || []);
  const [allowedDnsIpv4, setAllowedDnsIpv4] = useState<string[]>(server.allowed_dns_ipv4 || []);
  const [allowedDnsIpv6, setAllowedDnsIpv6] = useState<string[]>(server.allowed_dns_ipv6 || []);
  const [newSshIp, setNewSshIp] = useState("");
  const [newDnsIpv4, setNewDnsIpv4] = useState("");
  const [newDnsIpv6, setNewDnsIpv6] = useState("");

  // Credentials state
  const [sshUser, setSshUser] = useState(server.ssh_user);
  const [sshPassword, setSshPassword] = useState("");

  const togglePassword = (key: string) => {
    setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const addIp = (type: "ssh" | "dnsv4" | "dnsv6") => {
    if (type === "ssh" && newSshIp.trim()) {
      if (!allowedSshIps.includes(newSshIp.trim())) {
        setAllowedSshIps([...allowedSshIps, newSshIp.trim()]);
      }
      setNewSshIp("");
    } else if (type === "dnsv4" && newDnsIpv4.trim()) {
      if (!allowedDnsIpv4.includes(newDnsIpv4.trim())) {
        setAllowedDnsIpv4([...allowedDnsIpv4, newDnsIpv4.trim()]);
      }
      setNewDnsIpv4("");
    } else if (type === "dnsv6" && newDnsIpv6.trim()) {
      if (!allowedDnsIpv6.includes(newDnsIpv6.trim())) {
        setAllowedDnsIpv6([...allowedDnsIpv6, newDnsIpv6.trim()]);
      }
      setNewDnsIpv6("");
    }
  };

  const removeIp = (type: "ssh" | "dnsv4" | "dnsv6", ip: string) => {
    if (type === "ssh") {
      setAllowedSshIps(allowedSshIps.filter(i => i !== ip));
    } else if (type === "dnsv4") {
      setAllowedDnsIpv4(allowedDnsIpv4.filter(i => i !== ip));
    } else if (type === "dnsv6") {
      setAllowedDnsIpv6(allowedDnsIpv6.filter(i => i !== ip));
    }
  };

  const applyFirewall = async () => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke("update-dns-firewall", {
        body: {
          serverId: server.id,
          allowedSshIps,
          allowedDnsIpv4,
          allowedDnsIpv6,
          sshPort: server.ssh_port,
        },
      });

      if (response.error) {
        toast.error("Erro ao aplicar firewall: " + response.error.message);
        return;
      }

      toast.success("Firewall atualizado! O agente irá aplicar as regras.");
      onRefresh();
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateCredentials = async () => {
    setLoading(true);
    try {
      const updateData: any = { ssh_user: sshUser };
      if (sshPassword) {
        updateData.ssh_password_encrypted = sshPassword;
      }

      const { error } = await supabase
        .from("dns_servers")
        .update(updateData)
        .eq("id", server.id);

      if (error) {
        toast.error("Erro ao atualizar credenciais");
        return;
      }

      toast.success("Credenciais atualizadas!");
      setSshPassword("");
      onRefresh();
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openSSH = () => {
    const password = server.ssh_password_encrypted || '';
    const sshUri = `ssh://${server.ssh_user}@${server.ipv4}:${server.ssh_port}`;
    
    const link = document.createElement('a');
    link.href = sshUri;
    link.style.display = 'none';
    document.body.appendChild(link);
    
    try {
      link.click();
      toast.success("Abrindo cliente SSH...");
    } catch (e) {
      const puttyCommand = password 
        ? `putty.exe -ssh ${server.ssh_user}@${server.ipv4} -P ${server.ssh_port} -pw "${password}"`
        : `putty.exe -ssh ${server.ssh_user}@${server.ipv4} -P ${server.ssh_port}`;
      navigator.clipboard.writeText(puttyCommand);
      toast.info("Comando PuTTY copiado!");
    }
    
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" />
              {server.name}
            </h1>
            <p className="text-sm text-muted-foreground">{server.ipv4}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={openSSH}>
            <Terminal className="w-4 h-4 mr-2" />
            SSH
          </Button>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="firewall" className="gap-2">
            <Shield className="w-4 h-4" />
            Firewall
          </TabsTrigger>
          <TabsTrigger value="credentials" className="gap-2">
            <Key className="w-4 h-4" />
            Credenciais
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Activity className="w-4 h-4" />
            Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="firewall" className="space-y-6 mt-4">
          {/* SSH IPs */}
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                IPs Liberados para SSH (Porta {server.ssh_port})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: 10.0.0.0/8 ou 192.168.1.1"
                  value={newSshIp}
                  onChange={(e) => setNewSshIp(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addIp("ssh")}
                />
                <Button variant="outline" onClick={() => addIp("ssh")}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-primary/20 text-primary">
                  38.254.8.0/22 (Painel - Fixo)
                </Badge>
                {allowedSshIps.map((ip) => (
                  <Badge key={ip} variant="secondary" className="gap-1">
                    {ip}
                    <button onClick={() => removeIp("ssh", ip)} className="ml-1 hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* DNS IPv4 */}
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                Redes DNS IPv4 Permitidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: 10.0.0.0/8"
                  value={newDnsIpv4}
                  onChange={(e) => setNewDnsIpv4(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addIp("dnsv4")}
                />
                <Button variant="outline" onClick={() => addIp("dnsv4")}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {["127.0.0.1", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "38.254.8.0/22"].map(ip => (
                  <Badge key={ip} variant="secondary" className="bg-muted text-muted-foreground">
                    {ip} (Padrão)
                  </Badge>
                ))}
                {allowedDnsIpv4.map((ip) => (
                  <Badge key={ip} variant="secondary" className="gap-1">
                    {ip}
                    <button onClick={() => removeIp("dnsv4", ip)} className="ml-1 hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* DNS IPv6 */}
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                Redes DNS IPv6 Permitidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: 2001:db8::/32"
                  value={newDnsIpv6}
                  onChange={(e) => setNewDnsIpv6(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addIp("dnsv6")}
                />
                <Button variant="outline" onClick={() => addIp("dnsv6")}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {["::1", "fd00::/8", "fe80::/10"].map(ip => (
                  <Badge key={ip} variant="secondary" className="bg-muted text-muted-foreground">
                    {ip} (Padrão)
                  </Badge>
                ))}
                {allowedDnsIpv6.map((ip) => (
                  <Badge key={ip} variant="secondary" className="gap-1">
                    {ip}
                    <button onClick={() => removeIp("dnsv6", ip)} className="ml-1 hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button variant="hero" onClick={applyFirewall} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Aplicar Firewall
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="credentials" className="space-y-6 mt-4">
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" />
                Credenciais SSH
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Usuário SSH</Label>
                  <Input value={sshUser} onChange={(e) => setSshUser(e.target.value)} />
                </div>
                <div>
                  <Label>Porta SSH</Label>
                  <Input value={server.ssh_port} disabled />
                </div>
              </div>
              
              <div>
                <Label>Senha Atual</Label>
                <div className="flex gap-2">
                  <Input
                    type={showPasswords.ssh ? "text" : "password"}
                    value={server.ssh_password_encrypted || ""}
                    disabled
                    className="font-mono"
                  />
                  <Button variant="outline" size="icon" onClick={() => togglePassword("ssh")}>
                    {showPasswords.ssh ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(server.ssh_password_encrypted || "")}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>Nova Senha (deixe vazio para manter)</Label>
                <Input
                  type="password"
                  value={sshPassword}
                  onChange={(e) => setSshPassword(e.target.value)}
                  placeholder="Nova senha..."
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={updateCredentials} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Salvar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Agent Token */}
          {server.agent_token && (
            <Card className="glass-card border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Token do Agente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    type={showPasswords.token ? "text" : "password"}
                    value={server.agent_token}
                    disabled
                    className="font-mono text-xs"
                  />
                  <Button variant="outline" size="icon" onClick={() => togglePassword("token")}>
                    {showPasswords.token ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(server.agent_token || "")}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Logs de Instalação / Comandos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] w-full rounded-md border bg-muted/50 p-4">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {server.command_status && `Status: ${server.command_status}\n\n`}
                  {server.command_output && `=== Última Execução ===\n${server.command_output}\n\n`}
                  {server.installation_log && `=== Histórico ===\n${server.installation_log}`}
                  {!server.command_output && !server.installation_log && "Nenhum log disponível"}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DNSServerDetails;