import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Server, Monitor, Shield, Network, Key, Copy, Eye, EyeOff, Database, Lock, FileText } from "lucide-react";
import { toast } from "sonner";
import ZabbixProxyManager from "./ZabbixProxyManager";
import ZabbixHostManager from "./ZabbixHostManager";
import ZabbixFirewallEditor from "./ZabbixFirewallEditor";
import ZabbixReportGenerator from "./ZabbixReportGenerator";

interface ZabbixServerDetailsProps {
  server: {
    id: string;
    name: string;
    ipv4: string;
    ssh_user: string;
    ssh_port: number;
    ssh_password_encrypted: string | null;
    zabbix_db_user: string;
    zabbix_db_password: string;
    zabbix_db_root_password: string;
  };
  zabbixVersion?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ZabbixServerDetails = ({ server, zabbixVersion = "7.0", open, onOpenChange }: ZabbixServerDetailsProps) => {
  const [activeTab, setActiveTab] = useState("credentials");
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  
  // Zabbix API credentials for host management
  const [zabbixApiUser, setZabbixApiUser] = useState("Admin");
  const [zabbixApiPassword, setZabbixApiPassword] = useState("zabbix");

  const togglePassword = (key: string) => {
    setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const CredentialRow = ({ 
    label, 
    value, 
    isPassword = false,
    icon: Icon = Key 
  }: { 
    label: string; 
    value: string | null; 
    isPassword?: boolean;
    icon?: any;
  }) => {
    const key = `${label}-${value}`;
    const isVisible = showPasswords[key];
    
    return (
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-mono text-sm">
              {isPassword && !isVisible ? "••••••••••" : (value || "-")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isPassword && value && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0"
              onClick={() => togglePassword(key)}
            >
              {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </Button>
          )}
          {value && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0"
              onClick={() => copyToClipboard(value, label)}
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" />
            {server.name}
            <span className="text-sm font-normal text-muted-foreground">v{zabbixVersion}</span>
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="credentials" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              Credenciais
            </TabsTrigger>
            <TabsTrigger value="proxies" className="flex items-center gap-2">
              <Network className="w-4 h-4" />
              Proxies
            </TabsTrigger>
            <TabsTrigger value="hosts" className="flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              Hosts
            </TabsTrigger>
            <TabsTrigger value="firewall" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Firewall
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Relatórios
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="credentials" className="m-0 h-full">
              <div className="space-y-4">
                {/* SSH Credentials */}
                <Card className="glass-card border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lock className="w-4 h-4 text-orange-400" />
                      Acesso SSH
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <CredentialRow label="Usuário SSH" value={server.ssh_user} icon={Key} />
                    <CredentialRow label="Porta SSH" value={server.ssh_port.toString()} icon={Network} />
                    <CredentialRow label="Senha SSH" value={server.ssh_password_encrypted} isPassword icon={Lock} />
                  </CardContent>
                </Card>

                {/* Database Credentials */}
                <Card className="glass-card border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Database className="w-4 h-4 text-blue-400" />
                      Banco de Dados (MariaDB)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <CredentialRow label="Usuário do Banco" value={server.zabbix_db_user} icon={Key} />
                    <CredentialRow label="Senha do Banco" value={server.zabbix_db_password} isPassword icon={Lock} />
                    <CredentialRow label="Senha Root MariaDB" value={server.zabbix_db_root_password} isPassword icon={Lock} />
                  </CardContent>
                </Card>

                {/* Zabbix Web API Credentials */}
                <Card className="glass-card border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-green-400" />
                      Zabbix Web (API)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Credenciais para acessar a interface web do Zabbix e gerenciar hosts via API.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Usuário Zabbix Web</Label>
                        <Input 
                          value={zabbixApiUser}
                          onChange={(e) => setZabbixApiUser(e.target.value)}
                          placeholder="Admin"
                        />
                      </div>
                      <div>
                        <Label>Senha Zabbix Web</Label>
                        <Input 
                          type="password"
                          value={zabbixApiPassword}
                          onChange={(e) => setZabbixApiPassword(e.target.value)}
                          placeholder="zabbix"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Por padrão: Admin / zabbix. Altere após a instalação!
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="proxies" className="m-0 h-full">
              <ZabbixProxyManager 
                serverId={server.id}
                serverName={server.name}
                serverVersion={zabbixVersion}
              />
            </TabsContent>

            <TabsContent value="hosts" className="m-0 h-full">
              <ZabbixHostManager
                serverId={server.id}
                serverName={server.name}
                serverIp={server.ipv4}
                zabbixUser={zabbixApiUser}
                zabbixPassword={zabbixApiPassword}
              />
            </TabsContent>

            <TabsContent value="firewall" className="m-0 h-full">
              <ZabbixFirewallEditor
                serverId={server.id}
                serverName={server.name}
                serverIp={server.ipv4}
              />
            </TabsContent>

            <TabsContent value="reports" className="m-0 h-full">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-500" />
                    Relatórios do Zabbix
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Gere relatórios PDF detalhados com lista de hosts, SLA, problemas e análise de incidentes por Inteligência Artificial.
                  </p>
                  
                  <div className="flex items-center gap-4">
                    <ZabbixReportGenerator
                      serverId={server.id}
                      serverName={server.name}
                      serverIp={server.ipv4}
                      zabbixUser={zabbixApiUser}
                      zabbixPassword={zabbixApiPassword}
                    />
                  </div>
                  
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2">O relatório inclui:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Lista completa de hosts com IP e grupos</li>
                      <li>• Cálculo de SLA baseado em ICMP</li>
                      <li>• Problemas mais frequentes</li>
                      <li>• Hosts com menor disponibilidade</li>
                      <li>• Análise de IA com recomendações</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ZabbixServerDetails;