import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Shield, Save, Plus, Trash2 } from "lucide-react";

interface FirewallEditorProps {
  serverId: string;
  serverName: string;
  sshPort: number;
  allowedSshIps: string[];
  allowedDnsIpv4: string[];
  allowedDnsIpv6: string[];
}

const FirewallEditor = ({ 
  serverId, 
  serverName, 
  sshPort,
  allowedSshIps, 
  allowedDnsIpv4, 
  allowedDnsIpv6 
}: FirewallEditorProps) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // SSH
  const [sshIps, setSshIps] = useState<string[]>(allowedSshIps);
  const [newSshIp, setNewSshIp] = useState("");
  
  // DNS IPv4
  const [allowAllDns4, setAllowAllDns4] = useState(false);
  const [dnsIps4, setDnsIps4] = useState<string[]>(allowedDnsIpv4);
  const [newDnsIp4, setNewDnsIp4] = useState("");
  
  // DNS IPv6
  const [dnsIps6, setDnsIps6] = useState<string[]>(allowedDnsIpv6);
  const [newDnsIp6, setNewDnsIp6] = useState("");

  const handleOpen = () => {
    setSshIps(allowedSshIps);
    setDnsIps4(allowedDnsIpv4);
    setDnsIps6(allowedDnsIpv6);
    setOpen(true);
  };

  const addIp = (ip: string, list: string[], setList: (ips: string[]) => void, setInput: (v: string) => void) => {
    if (!ip.trim()) return;
    
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$|^([0-9a-fA-F:]+)(\/\d{1,3})?$/;
    if (!ipRegex.test(ip.trim())) {
      toast.error("IP inválido. Use formato: 192.168.1.1 ou 10.0.0.0/8");
      return;
    }
    
    if (list.includes(ip.trim())) {
      toast.error("IP já adicionado");
      return;
    }
    
    setList([...list, ip.trim()]);
    setInput("");
  };

  const removeIp = (ip: string, list: string[], setList: (ips: string[]) => void) => {
    setList(list.filter(i => i !== ip));
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      const response = await supabase.functions.invoke("update-dns-firewall", {
        body: {
          serverId,
          sshPort,
          allowedSshIps: sshIps,
          allowedDnsIpv4: allowAllDns4 ? ["0.0.0.0/0"] : dnsIps4,
          allowedDnsIpv6: dnsIps6,
        },
      });

      if (response.error) {
        toast.error(`Erro: ${response.error.message}`);
      } else {
        toast.success("Firewall atualizado! O agente irá aplicar as mudanças.");
        setOpen(false);
      }
    } catch (error: any) {
      toast.error("Erro ao atualizar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-6 text-xs" onClick={handleOpen}>
          <Shield className="w-3 h-3 mr-1" />
          Firewall
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Firewall - {serverName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* SSH Access */}
          <Card className="glass-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="text-orange-400">SSH</span>
                <span className="text-xs text-muted-foreground">(Porta {sshPort})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input 
                  placeholder="IP ou CIDR (ex: 10.0.0.0/8)" 
                  value={newSshIp}
                  onChange={(e) => setNewSshIp(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addIp(newSshIp, sshIps, setSshIps, setNewSshIp))}
                />
                <Button variant="outline" onClick={() => addIp(newSshIp, sshIps, setSshIps, setNewSshIp)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {sshIps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum IP liberado para SSH.</p>
                ) : (
                  sshIps.map(ip => (
                    <Badge key={ip} variant="secondary" className="flex items-center gap-1 pr-1">
                      {ip}
                      <Button variant="ghost" size="sm" className="h-4 w-4 p-0" onClick={() => removeIp(ip, sshIps, setSshIps)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* DNS IPv4 */}
          <Card className="glass-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-green-400">DNS IPv4</span>
                  <span className="text-xs text-muted-foreground">(Porta 53)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-normal text-muted-foreground">Liberar todos</span>
                  <Switch checked={allowAllDns4} onCheckedChange={setAllowAllDns4} />
                </div>
              </CardTitle>
            </CardHeader>
            {!allowAllDns4 && (
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input 
                    placeholder="IP ou CIDR (ex: 192.168.0.0/16)" 
                    value={newDnsIp4}
                    onChange={(e) => setNewDnsIp4(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addIp(newDnsIp4, dnsIps4, setDnsIps4, setNewDnsIp4))}
                  />
                  <Button variant="outline" onClick={() => addIp(newDnsIp4, dnsIps4, setDnsIps4, setNewDnsIp4)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {dnsIps4.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum IP liberado. DNS bloqueado.</p>
                  ) : (
                    dnsIps4.map(ip => (
                      <Badge key={ip} variant="secondary" className="flex items-center gap-1 pr-1">
                        {ip}
                        <Button variant="ghost" size="sm" className="h-4 w-4 p-0" onClick={() => removeIp(ip, dnsIps4, setDnsIps4)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Redes privadas já incluídas: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
                </p>
              </CardContent>
            )}
          </Card>

          {/* DNS IPv6 */}
          <Card className="glass-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="text-blue-400">DNS IPv6</span>
                <span className="text-xs text-muted-foreground">(Porta 53)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input 
                  placeholder="IPv6 ou CIDR (ex: 2001:db8::/32)" 
                  value={newDnsIp6}
                  onChange={(e) => setNewDnsIp6(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addIp(newDnsIp6, dnsIps6, setDnsIps6, setNewDnsIp6))}
                />
                <Button variant="outline" onClick={() => addIp(newDnsIp6, dnsIps6, setDnsIps6, setNewDnsIp6)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {dnsIps6.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum IPv6 liberado.</p>
                ) : (
                  dnsIps6.map(ip => (
                    <Badge key={ip} variant="secondary" className="flex items-center gap-1 pr-1">
                      {ip}
                      <Button variant="ghost" size="sm" className="h-4 w-4 p-0" onClick={() => removeIp(ip, dnsIps6, setDnsIps6)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Warning */}
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm">
            <p className="text-yellow-400 font-medium">Atenção:</p>
            <p className="text-yellow-300/80 text-xs mt-1">
              O agente irá atualizar o nftables e BIND9 automaticamente.
              Verifique se não está bloqueando seu próprio IP de SSH!
            </p>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Aplicar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FirewallEditor;