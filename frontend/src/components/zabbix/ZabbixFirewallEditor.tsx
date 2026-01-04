import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Plus, Trash2, Loader2, Save, RefreshCw } from "lucide-react";

interface ZabbixFirewallEditorProps {
  serverId: string;
  serverName: string;
  serverIp: string;
}

interface FirewallRule {
  id: string;
  ports: string;
  ips: string[];
  description: string;
  enabled: boolean;
}

const ZabbixFirewallEditor = ({ serverId, serverName, serverIp }: ZabbixFirewallEditorProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allowAllWeb, setAllowAllWeb] = useState(false);
  const [allowedWebIps, setAllowedWebIps] = useState<string[]>([]);
  const [newIp, setNewIp] = useState("");
  const [customRules, setCustomRules] = useState("");

  useEffect(() => {
    // Load current firewall config from server if available
  }, [serverId]);

  const addIp = () => {
    if (!newIp.trim()) return;
    
    // Basic IP validation
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$|^([0-9a-fA-F:]+)(\/\d{1,3})?$/;
    if (!ipRegex.test(newIp.trim())) {
      toast.error("IP inválido. Use formato: 192.168.1.1 ou 10.0.0.0/8");
      return;
    }
    
    if (allowedWebIps.includes(newIp.trim())) {
      toast.error("IP já adicionado");
      return;
    }
    
    setAllowedWebIps([...allowedWebIps, newIp.trim()]);
    setNewIp("");
  };

  const removeIp = (ip: string) => {
    setAllowedWebIps(allowedWebIps.filter(i => i !== ip));
  };

  const applyFirewall = async () => {
    setSaving(true);
    
    try {
      const response = await supabase.functions.invoke("update-zabbix-firewall", {
        body: {
          serverId: serverId,
          allowAllWeb: allowAllWeb,
          allowedWebIps: allowedWebIps,
          customRules: customRules,
        },
      });

      if (response.error) {
        toast.error("Erro ao aplicar regras: " + response.error.message);
        return;
      }

      toast.success("Regras de firewall aplicadas!");
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Firewall - {serverName}
          </h3>
          <p className="text-sm text-muted-foreground">Gerenciar regras nftables</p>
        </div>
        <Button variant="hero" size="sm" onClick={applyFirewall} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
          Aplicar
        </Button>
      </div>

      {/* Web Access (80, 443, 3000) */}
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Acesso Web (portas 80, 443, 3000)</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-normal text-muted-foreground">Liberar todos</span>
              <Switch checked={allowAllWeb} onCheckedChange={setAllowAllWeb} />
            </div>
          </CardTitle>
        </CardHeader>
        {!allowAllWeb && (
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="IP ou CIDR (ex: 10.0.0.0/8)" 
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addIp())}
              />
              <Button variant="outline" onClick={addIp}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {allowedWebIps.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum IP liberado. Acesso web bloqueado.</p>
              ) : (
                allowedWebIps.map(ip => (
                  <Badge key={ip} variant="secondary" className="flex items-center gap-1 pr-1">
                    {ip}
                    <Button variant="ghost" size="sm" className="h-4 w-4 p-0" onClick={() => removeIp(ip)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Custom Rules */}
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Regras Personalizadas (nftables)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea 
            placeholder={`# Exemplo de regra adicional:
# tcp dport 8080 ip saddr 192.168.1.0/24 accept`}
            value={customRules}
            onChange={(e) => setCustomRules(e.target.value)}
            rows={6}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Regras adicionais serão inseridas na chain input. Use sintaxe nftables.
          </p>
        </CardContent>
      </Card>

      {/* Current Rules Preview */}
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Regras Padrão Incluídas</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs font-mono bg-muted p-3 rounded-md overflow-x-auto">
{`# Regras sempre ativas:
ct state established,related accept
iif lo accept
ip protocol icmp accept
ip6 nexthdr icmpv6 accept
tcp dport { 22 } accept          # SSH
tcp dport { 10050, 10051 } accept # Zabbix Agent/Server`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};

export default ZabbixFirewallEditor;
