import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Server, 
  Plus, 
  Loader2, 
  Monitor,
  RefreshCw,
  Trash2,
  Search,
  CheckCircle,
  XCircle,
  Edit,
  Upload,
  FileSpreadsheet,
  Table as TableIcon
} from "lucide-react";

interface ZabbixHostManagerProps {
  serverId: string;
  serverName: string;
  serverIp: string;
  zabbixUser?: string;
  zabbixPassword?: string;
}

interface ZabbixGroup {
  groupid: string;
  name: string;
}

interface ZabbixTemplate {
  templateid: string;
  name: string;
  description?: string;
}

interface ZabbixProxy {
  proxyid: string;
  name: string;
}

interface ZabbixHost {
  hostid: string;
  host: string;
  name: string;
  status: string;
  groups: { name: string; groupid?: string }[];
  templates: { name: string }[];
  interfaces?: { type: string; ip: string; port: string; details?: { community?: string } }[];
}

interface BulkHostRow {
  hostname: string;
  ip: string;
  type: "agent" | "snmp";
  port: string;
  community: string;
  group: string;
  template: string;
}

const ZabbixHostManager = ({ serverId, serverName, serverIp, zabbixUser = "Admin", zabbixPassword = "zabbix" }: ZabbixHostManagerProps) => {
  const [loading, setLoading] = useState(false);
  const [hosts, setHosts] = useState<ZabbixHost[]>([]);
  const [groups, setGroups] = useState<ZabbixGroup[]>([]);
  const [templates, setTemplates] = useState<ZabbixTemplate[]>([]);
  const [proxies, setProxies] = useState<ZabbixProxy[]>([]);
  const [showAddHost, setShowAddHost] = useState(false);
  const [showEditHost, setShowEditHost] = useState<ZabbixHost | null>(null);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");
  const [apiToken, setApiToken] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [activeTab, setActiveTab] = useState("single");
  
  // Form state - separate state for each field to avoid re-render issues
  const [hostname, setHostname] = useState("");
  const [visibleName, setVisibleName] = useState("");
  const [ip, setIp] = useState("");
  const [port, setPort] = useState("10050");
  const [interfaceType, setInterfaceType] = useState<"agent" | "snmp">("agent");
  const [snmpCommunity, setSnmpCommunity] = useState("public");
  const [snmpVersion, setSnmpVersion] = useState<"1" | "2" | "3">("2");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [selectedProxy, setSelectedProxy] = useState("");
  const [description, setDescription] = useState("");
  
  // Bulk import state
  const [bulkRows, setBulkRows] = useState<BulkHostRow[]>([
    { hostname: "", ip: "", type: "agent", port: "10050", community: "public", group: "", template: "" }
  ]);
  const [bulkCsvContent, setBulkCsvContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    authenticateZabbix();
  }, [serverIp]);

  const authenticateZabbix = async () => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke("zabbix-api", {
        body: {
          action: "authenticate",
          serverIp: serverIp,
          username: zabbixUser,
          password: zabbixPassword,
        },
      });

      if (response.error || !response.data?.token) {
        toast.error("Erro ao autenticar no Zabbix");
        return;
      }

      setApiToken(response.data.token);
      await Promise.all([
        fetchHosts(response.data.token),
        fetchGroups(response.data.token),
        fetchTemplates(response.data.token),
        fetchProxies(response.data.token),
      ]);
    } catch (error: any) {
      toast.error("Erro de conexão com Zabbix: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHosts = async (token: string) => {
    try {
      const response = await supabase.functions.invoke("zabbix-api", {
        body: { action: "getHosts", serverIp, token },
      });
      if (response.data?.hosts) setHosts(response.data.hosts);
    } catch (error) {
      console.error("Error fetching hosts:", error);
    }
  };

  const fetchGroups = async (token: string) => {
    try {
      const response = await supabase.functions.invoke("zabbix-api", {
        body: { action: "getGroups", serverIp, token },
      });
      if (response.data?.groups) setGroups(response.data.groups);
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  const fetchTemplates = async (token: string) => {
    try {
      const response = await supabase.functions.invoke("zabbix-api", {
        body: { action: "getTemplates", serverIp, token },
      });
      if (response.data?.templates) setTemplates(response.data.templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  const fetchProxies = async (token: string) => {
    try {
      const response = await supabase.functions.invoke("zabbix-api", {
        body: { action: "getProxies", serverIp, token },
      });
      if (response.data?.proxies) setProxies(response.data.proxies);
    } catch (error) {
      console.error("Error fetching proxies:", error);
    }
  };

  const resetForm = useCallback(() => {
    setHostname("");
    setVisibleName("");
    setIp("");
    setPort("10050");
    setInterfaceType("agent");
    setSnmpCommunity("public");
    setSnmpVersion("2");
    setSelectedGroups([]);
    setSelectedTemplates([]);
    setSelectedProxy("");
    setDescription("");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiToken) {
      toast.error("Não autenticado no Zabbix");
      return;
    }

    if (selectedGroups.length === 0) {
      toast.error("Selecione pelo menos um grupo");
      return;
    }

    setLoading(true);
    try {
      const interfaceData = interfaceType === "agent" 
        ? { type: 1, main: 1, useip: 1, ip, dns: "", port: port || "10050" }
        : { 
            type: 2, main: 1, useip: 1, ip, dns: "", port: port || "161",
            details: { version: parseInt(snmpVersion), bulk: 1, community: snmpCommunity }
          };

      const hostData: any = {
        host: hostname,
        name: visibleName || hostname,
        interfaces: [interfaceData],
        groups: selectedGroups.map(g => ({ groupid: g })),
        templates: selectedTemplates.map(t => ({ templateid: t })),
        description,
      };

      if (selectedProxy) {
        hostData.proxy_hostid = selectedProxy;
      }

      const response = await supabase.functions.invoke("zabbix-api", {
        body: { action: "createHost", serverIp, token: apiToken, hostData },
      });

      if (response.error) {
        toast.error("Erro ao criar host: " + response.error.message);
        return;
      }

      toast.success("Host criado com sucesso!");
      setShowAddHost(false);
      resetForm();
      fetchHosts(apiToken);
    } catch (error: any) {
      toast.error("Erro ao criar host: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditHost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiToken || !showEditHost) return;

    setLoading(true);
    try {
      const interfaceData = interfaceType === "agent" 
        ? { type: 1, main: 1, useip: 1, ip, dns: "", port: port || "10050" }
        : { 
            type: 2, main: 1, useip: 1, ip, dns: "", port: port || "161",
            details: { version: parseInt(snmpVersion), bulk: 1, community: snmpCommunity }
          };

      const hostData: any = {
        hostid: showEditHost.hostid,
        host: hostname,
        name: visibleName || hostname,
        groups: selectedGroups.map(g => ({ groupid: g })),
        templates: selectedTemplates.map(t => ({ templateid: t })),
        description,
      };

      if (selectedProxy) {
        hostData.proxy_hostid = selectedProxy;
      }

      const response = await supabase.functions.invoke("zabbix-api", {
        body: { action: "updateHost", serverIp, token: apiToken, hostData, interfaceData },
      });

      if (response.error) {
        toast.error("Erro ao atualizar host: " + response.error.message);
        return;
      }

      toast.success("Host atualizado!");
      setShowEditHost(null);
      resetForm();
      fetchHosts(apiToken);
    } catch (error: any) {
      toast.error("Erro ao atualizar host: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteHost = async (hostId: string, hostName: string) => {
    if (!confirm(`Tem certeza que deseja excluir "${hostName}"?`)) return;
    if (!apiToken) return;

    try {
      const response = await supabase.functions.invoke("zabbix-api", {
        body: { action: "deleteHost", serverIp, token: apiToken, hostId },
      });
      if (response.error) {
        toast.error("Erro ao excluir host");
        return;
      }
      toast.success("Host excluído!");
      fetchHosts(apiToken);
    } catch (error) {
      toast.error("Erro ao excluir host");
    }
  };

  const createGroup = async () => {
    if (!apiToken || !newGroupName.trim()) return;

    setLoading(true);
    try {
      const response = await supabase.functions.invoke("zabbix-api", {
        body: { action: "createGroup", serverIp, token: apiToken, groupName: newGroupName.trim() },
      });
      if (response.error) {
        toast.error("Erro ao criar grupo");
        return;
      }
      toast.success("Grupo criado!");
      setShowNewGroup(false);
      setNewGroupName("");
      fetchGroups(apiToken);
    } catch (error) {
      toast.error("Erro ao criar grupo");
    } finally {
      setLoading(false);
    }
  };

  const openEditHost = (host: ZabbixHost) => {
    const firstInterface = host.interfaces?.[0];
    const isSnmp = firstInterface?.type === "2";
    
    setHostname(host.host);
    setVisibleName(host.name);
    setIp(firstInterface?.ip || "");
    setPort(firstInterface?.port || (isSnmp ? "161" : "10050"));
    setInterfaceType(isSnmp ? "snmp" : "agent");
    setSnmpCommunity(firstInterface?.details?.community || "public");
    setSnmpVersion("2");
    setSelectedGroups(host.groups?.map(g => g.groupid || groups.find(gr => gr.name === g.name)?.groupid || "").filter(Boolean) || []);
    setSelectedTemplates([]);
    setSelectedProxy("");
    setDescription("");
    setShowEditHost(host);
  };

  const toggleGroup = (groupId: string) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) ? prev.filter(g => g !== groupId) : [...prev, groupId]
    );
  };

  const toggleTemplate = (templateId: string) => {
    setSelectedTemplates(prev => 
      prev.includes(templateId) ? prev.filter(t => t !== templateId) : [...prev, templateId]
    );
  };

  // Bulk import functions
  const addBulkRow = () => {
    setBulkRows(prev => [...prev, { hostname: "", ip: "", type: "agent", port: "10050", community: "public", group: "", template: "" }]);
  };

  const updateBulkRow = (index: number, field: keyof BulkHostRow, value: string) => {
    setBulkRows(prev => {
      const newRows = [...prev];
      newRows[index] = { ...newRows[index], [field]: value };
      if (field === "type") {
        newRows[index].port = value === "snmp" ? "161" : "10050";
      }
      return newRows;
    });
  };

  const removeBulkRow = (index: number) => {
    setBulkRows(prev => prev.filter((_, i) => i !== index));
  };

  const parseCsv = (content: string) => {
    const lines = content.trim().split('\n');
    const headers = lines[0]?.toLowerCase().split(',').map(h => h.trim());
    if (!headers || lines.length < 2) return [];

    const data: BulkHostRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      data.push({
        hostname: values[0] || '',
        ip: values[1] || '',
        type: (values[2]?.toLowerCase() === 'snmp' ? 'snmp' : 'agent') as "agent" | "snmp",
        port: values[3] || (values[2]?.toLowerCase() === 'snmp' ? '161' : '10050'),
        community: values[4] || 'public',
        group: values[5] || '',
        template: values[6] || ''
      });
    }
    return data;
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setBulkCsvContent(content);
        const parsed = parseCsv(content);
        if (parsed.length > 0) {
          setBulkRows(parsed);
          toast.success(`${parsed.length} linhas carregadas do CSV`);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleBulkImport = async () => {
    if (!apiToken || bulkRows.length === 0) return;

    const validRows = bulkRows.filter(r => r.hostname && r.ip);
    if (validRows.length === 0) {
      toast.error("Nenhum host válido para importar");
      return;
    }

    setLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const row of validRows) {
      try {
        const interfaceData = row.type === "agent" 
          ? { type: 1, main: 1, useip: 1, ip: row.ip, dns: "", port: row.port || "10050" }
          : { type: 2, main: 1, useip: 1, ip: row.ip, dns: "", port: row.port || "161",
              details: { version: 2, bulk: 1, community: row.community || "public" } };

        const group = groups.find(g => g.name.toLowerCase() === row.group?.toLowerCase());
        const template = templates.find(t => t.name.toLowerCase().includes(row.template?.toLowerCase() || ''));

        const hostData: any = {
          host: row.hostname,
          name: row.hostname,
          interfaces: [interfaceData],
          groups: group ? [{ groupid: group.groupid }] : [{ groupid: groups[0]?.groupid }],
          templates: template ? [{ templateid: template.templateid }] : [],
        };

        const response = await supabase.functions.invoke("zabbix-api", {
          body: { action: "createHost", serverIp, token: apiToken, hostData },
        });

        if (response.error) errorCount++;
        else successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    toast.success(`Importação: ${successCount} sucesso, ${errorCount} erros`);
    setBulkRows([{ hostname: "", ip: "", type: "agent", port: "10050", community: "public", group: "", template: "" }]);
    fetchHosts(apiToken);
    setLoading(false);
  };

  const filteredHosts = hosts.filter(h => 
    h.host.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(templateSearch.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Monitor className="w-5 h-5 text-primary" />
            Hosts - {serverName}
          </h3>
          <p className="text-sm text-muted-foreground">{hosts.length} host(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={authenticateZabbix} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
          
          <Dialog open={showAddHost} onOpenChange={(open) => { setShowAddHost(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button variant="default" size="sm" disabled={!apiToken}>
                <Plus className="w-4 h-4 mr-1" />
                Gerenciar Hosts
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Gerenciar Hosts do Zabbix</DialogTitle>
              </DialogHeader>
              
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="single" className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Novo Host
                  </TabsTrigger>
                  <TabsTrigger value="bulk" className="flex items-center gap-2">
                    <TableIcon className="w-4 h-4" />
                    Cadastro em Massa
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="single" className="mt-4">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="hostname">Hostname *</Label>
                        <Input 
                          id="hostname"
                          value={hostname}
                          onChange={(e) => setHostname(e.target.value)}
                          placeholder="srv-web-01"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="visibleName">Nome visível</Label>
                        <Input 
                          id="visibleName"
                          value={visibleName}
                          onChange={(e) => setVisibleName(e.target.value)}
                          placeholder="Servidor Web"
                        />
                      </div>
                      <div>
                        <Label htmlFor="ip">Endereço IP *</Label>
                        <Input 
                          id="ip"
                          value={ip}
                          onChange={(e) => setIp(e.target.value)}
                          placeholder="192.168.1.1"
                          required
                        />
                      </div>
                      <div>
                        <Label>Tipo de Interface</Label>
                        <Select 
                          value={interfaceType} 
                          onValueChange={(v: "agent" | "snmp") => {
                            setInterfaceType(v);
                            setPort(v === "agent" ? "10050" : "161");
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="agent">Zabbix Agent</SelectItem>
                            <SelectItem value="snmp">SNMP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {interfaceType === "snmp" && (
                      <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50 border">
                        <div>
                          <Label>Versão SNMP</Label>
                          <Select value={snmpVersion} onValueChange={(v: "1" | "2" | "3") => setSnmpVersion(v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">v1</SelectItem>
                              <SelectItem value="2">v2c</SelectItem>
                              <SelectItem value="3">v3</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="community">Community</Label>
                          <Input 
                            id="community"
                            value={snmpCommunity}
                            onChange={(e) => setSnmpCommunity(e.target.value)}
                            placeholder="public"
                          />
                        </div>
                        <div>
                          <Label htmlFor="snmpPort">Porta</Label>
                          <Input 
                            id="snmpPort"
                            value={port}
                            onChange={(e) => setPort(e.target.value)}
                            placeholder="161"
                          />
                        </div>
                      </div>
                    )}

                    {interfaceType === "agent" && (
                      <div className="w-1/3">
                        <Label htmlFor="agentPort">Porta Agent</Label>
                        <Input 
                          id="agentPort"
                          value={port}
                          onChange={(e) => setPort(e.target.value)}
                          placeholder="10050"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label>Grupos *</Label>
                          <Dialog open={showNewGroup} onOpenChange={setShowNewGroup}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" type="button">
                                <Plus className="w-3 h-3 mr-1" />
                                Novo
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Criar Novo Grupo</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Input 
                                  value={newGroupName}
                                  onChange={(e) => setNewGroupName(e.target.value)}
                                  placeholder="Nome do grupo"
                                />
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline" onClick={() => setShowNewGroup(false)} type="button">Cancelar</Button>
                                  <Button onClick={createGroup} disabled={loading || !newGroupName.trim()} type="button">
                                    {loading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                                    Criar
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                        <ScrollArea className="h-32 border rounded-md p-3">
                          {groups.map(group => (
                            <div key={group.groupid} className="flex items-center gap-2 py-1">
                              <Checkbox 
                                id={`group-${group.groupid}`}
                                checked={selectedGroups.includes(group.groupid)}
                                onCheckedChange={() => toggleGroup(group.groupid)}
                              />
                              <label htmlFor={`group-${group.groupid}`} className="text-sm cursor-pointer">{group.name}</label>
                            </div>
                          ))}
                        </ScrollArea>
                      </div>

                      <div>
                        <Label>Templates</Label>
                        <Input 
                          placeholder="Buscar..." 
                          className="mb-2 mt-2"
                          value={templateSearch}
                          onChange={(e) => setTemplateSearch(e.target.value)}
                        />
                        <ScrollArea className="h-32 border rounded-md p-3">
                          {filteredTemplates.map(template => (
                            <div key={template.templateid} className="flex items-center gap-2 py-1">
                              <Checkbox 
                                id={`template-${template.templateid}`}
                                checked={selectedTemplates.includes(template.templateid)}
                                onCheckedChange={() => toggleTemplate(template.templateid)}
                              />
                              <label htmlFor={`template-${template.templateid}`} className="text-sm cursor-pointer">{template.name}</label>
                            </div>
                          ))}
                        </ScrollArea>
                      </div>
                    </div>

                    <div>
                      <Label>Monitorar via Proxy</Label>
                      <Select value={selectedProxy || "direct"} onValueChange={(v) => setSelectedProxy(v === "direct" ? "" : v)}>
                        <SelectTrigger><SelectValue placeholder="Direto (sem proxy)" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="direct">Direto (sem proxy)</SelectItem>
                          {proxies.map(p => <SelectItem key={p.proxyid} value={p.proxyid}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="desc">Descrição</Label>
                      <Textarea 
                        id="desc"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Descrição do host..."
                        rows={2}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button type="button" variant="outline" onClick={() => setShowAddHost(false)}>Cancelar</Button>
                      <Button type="submit" disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                        Criar Host
                      </Button>
                    </div>
                  </form>
                </TabsContent>

                <TabsContent value="bulk" className="mt-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <input type="file" accept=".csv" onChange={handleCsvUpload} ref={fileInputRef} className="hidden" />
                      <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Importar CSV
                      </Button>
                      <Button variant="outline" onClick={addBulkRow}>
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Linha
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Formato CSV: hostname,ip,tipo,porta,community,grupo,template
                      </span>
                    </div>

                    <ScrollArea className="h-[400px] border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[150px]">Hostname *</TableHead>
                            <TableHead className="w-[120px]">IP *</TableHead>
                            <TableHead className="w-[100px]">Tipo</TableHead>
                            <TableHead className="w-[80px]">Porta</TableHead>
                            <TableHead className="w-[100px]">Community</TableHead>
                            <TableHead className="w-[120px]">Grupo</TableHead>
                            <TableHead className="w-[120px]">Template</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bulkRows.map((row, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <Input 
                                  value={row.hostname}
                                  onChange={(e) => updateBulkRow(index, "hostname", e.target.value)}
                                  placeholder="srv-01"
                                  className="h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Input 
                                  value={row.ip}
                                  onChange={(e) => updateBulkRow(index, "ip", e.target.value)}
                                  placeholder="192.168.1.1"
                                  className="h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Select value={row.type} onValueChange={(v) => updateBulkRow(index, "type", v)}>
                                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="agent">Agent</SelectItem>
                                    <SelectItem value="snmp">SNMP</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Input 
                                  value={row.port}
                                  onChange={(e) => updateBulkRow(index, "port", e.target.value)}
                                  className="h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Input 
                                  value={row.community}
                                  onChange={(e) => updateBulkRow(index, "community", e.target.value)}
                                  placeholder="public"
                                  className="h-8"
                                  disabled={row.type === "agent"}
                                />
                              </TableCell>
                              <TableCell>
                                <Select value={row.group} onValueChange={(v) => updateBulkRow(index, "group", v)}>
                                  <SelectTrigger className="h-8"><SelectValue placeholder="Grupo" /></SelectTrigger>
                                  <SelectContent>
                                    {groups.map(g => <SelectItem key={g.groupid} value={g.name}>{g.name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Input 
                                  value={row.template}
                                  onChange={(e) => updateBulkRow(index, "template", e.target.value)}
                                  placeholder="Template"
                                  className="h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm" onClick={() => removeBulkRow(index)} disabled={bulkRows.length === 1}>
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>

                    <div className="flex justify-between items-center pt-4 border-t">
                      <span className="text-sm text-muted-foreground">
                        {bulkRows.filter(r => r.hostname && r.ip).length} host(s) válido(s)
                      </span>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowAddHost(false)}>Cancelar</Button>
                        <Button onClick={handleBulkImport} disabled={loading || bulkRows.filter(r => r.hostname && r.ip).length === 0}>
                          {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                          Importar Hosts
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Host Dialog */}
      <Dialog open={!!showEditHost} onOpenChange={(open) => { if (!open) { setShowEditHost(null); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Editar: {showEditHost?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditHost} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-hostname">Hostname</Label>
                <Input id="edit-hostname" value={hostname} onChange={(e) => setHostname(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="edit-name">Nome visível</Label>
                <Input id="edit-name" value={visibleName} onChange={(e) => setVisibleName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="edit-ip">IP</Label>
                <Input id="edit-ip" value={ip} onChange={(e) => setIp(e.target.value)} required />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={interfaceType} onValueChange={(v: "agent" | "snmp") => { setInterfaceType(v); setPort(v === "agent" ? "10050" : "161"); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="snmp">SNMP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {interfaceType === "snmp" && (
              <div className="grid grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg">
                <div>
                  <Label>Versão</Label>
                  <Select value={snmpVersion} onValueChange={(v: "1" | "2" | "3") => setSnmpVersion(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">v1</SelectItem>
                      <SelectItem value="2">v2c</SelectItem>
                      <SelectItem value="3">v3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-community">Community</Label>
                  <Input id="edit-community" value={snmpCommunity} onChange={(e) => setSnmpCommunity(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="edit-port">Porta</Label>
                  <Input id="edit-port" value={port} onChange={(e) => setPort(e.target.value)} />
                </div>
              </div>
            )}
            <div>
              <Label>Grupos</Label>
              <ScrollArea className="h-24 border rounded-md p-2 mt-1">
                {groups.map(g => (
                  <div key={g.groupid} className="flex items-center gap-2 py-1">
                    <Checkbox checked={selectedGroups.includes(g.groupid)} onCheckedChange={() => toggleGroup(g.groupid)} />
                    <span className="text-sm">{g.name}</span>
                  </div>
                ))}
              </ScrollArea>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowEditHost(null)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar hosts..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      </div>

      {/* Hosts List */}
      {loading && hosts.length === 0 ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredHosts.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Monitor className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhum host encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredHosts.map((host) => (
            <Card key={host.hostid} className="border-border/50 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {host.status === "0" ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                      <span className="font-semibold">{host.name || host.host}</span>
                      {host.interfaces?.[0]?.type === "2" && <Badge variant="secondary" className="text-xs">SNMP</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {host.interfaces?.[0]?.ip || "N/A"}
                      {host.groups?.length > 0 && <span className="ml-2">• {host.groups.map(g => g.name).join(", ")}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEditHost(host)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteHost(host.hostid, host.name)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
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

export default ZabbixHostManager;
