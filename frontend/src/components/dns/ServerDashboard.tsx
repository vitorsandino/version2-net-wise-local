import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Server, 
  Activity, 
  Clock, 
  Wifi, 
  WifiOff,
  Zap,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Calendar,
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart3
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
  AreaChart,
  Area
} from "recharts";
import DNSQueryStats from "./DNSQueryStats";

interface DNSServer {
  id: string;
  name: string;
  ipv4: string;
  client_name: string | null;
  status: string;
}

interface MonitoringHistory {
  id: string;
  ping_status: string;
  ping_latency: number | null;
  dns_status: string;
  dns_response_time: number | null;
  checked_at: string;
}

const COLORS = ['#22c55e', '#ef4444', '#eab308'];

const ServerDashboard = () => {
  const { serverId } = useParams<{ serverId: string }>();
  const navigate = useNavigate();
  const [server, setServer] = useState<DNSServer | null>(null);
  const [history, setHistory] = useState<MonitoringHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("24h");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (serverId) {
      fetchData();
    }
  }, [serverId, period]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch server info
    const { data: serverData, error: serverError } = await supabase
      .from("dns_servers")
      .select("id, name, ipv4, client_name, status")
      .eq("id", serverId)
      .single();

    if (serverError) {
      toast.error("Servidor não encontrado");
      navigate("/dashboard");
      return;
    }

    setServer(serverData);

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case "1h": startDate.setHours(now.getHours() - 1); break;
      case "6h": startDate.setHours(now.getHours() - 6); break;
      case "24h": startDate.setDate(now.getDate() - 1); break;
      case "7d": startDate.setDate(now.getDate() - 7); break;
      case "30d": startDate.setDate(now.getDate() - 30); break;
      default: startDate.setDate(now.getDate() - 1);
    }

    // Fetch monitoring history - limit to last 30 entries
    const { data: historyData, error: historyError } = await supabase
      .from("dns_monitoring_history")
      .select("*")
      .eq("server_id", serverId)
      .gte("checked_at", startDate.toISOString())
      .order("checked_at", { ascending: false })
      .limit(30);

    if (!historyError) {
      // Reverse to show chronological order
      setHistory((historyData || []).reverse());
    }

    setLoading(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    // Trigger monitoring
    await supabase.functions.invoke("monitor-dns-server", {
      body: { serverId },
    });
    
    await fetchData();
    setIsRefreshing(false);
    toast.success("Dados atualizados!");
  };

  // Calculate statistics
  const totalChecks = history.length;
  const pingOnline = history.filter(h => h.ping_status === "online").length;
  const dnsOnline = history.filter(h => h.dns_status === "online").length;
  const pingUptime = totalChecks > 0 ? ((pingOnline / totalChecks) * 100).toFixed(2) : "0";
  const dnsUptime = totalChecks > 0 ? ((dnsOnline / totalChecks) * 100).toFixed(2) : "0";
  const avgPingLatency = history.filter(h => h.ping_latency).reduce((sum, h) => sum + (h.ping_latency || 0), 0) / (history.filter(h => h.ping_latency).length || 1);
  const avgDnsLatency = history.filter(h => h.dns_response_time).reduce((sum, h) => sum + (h.dns_response_time || 0), 0) / (history.filter(h => h.dns_response_time).length || 1);

  // Prepare chart data
  const latencyData = history.map(h => ({
    time: new Date(h.checked_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    fullTime: new Date(h.checked_at).toLocaleString('pt-BR'),
    ping: h.ping_latency || 0,
    dns: h.dns_response_time || 0,
  }));

  const statusPieData = [
    { name: 'Online', value: pingOnline, color: '#22c55e' },
    { name: 'Offline', value: totalChecks - pingOnline, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const dnsPieData = [
    { name: 'DNS Ativo', value: dnsOnline, color: '#22c55e' },
    { name: 'DNS Inativo', value: totalChecks - dnsOnline, color: '#ef4444' },
  ].filter(d => d.value > 0);

  // Hourly distribution
  const hourlyData: Record<number, { online: number; offline: number }> = {};
  history.forEach(h => {
    const hour = new Date(h.checked_at).getHours();
    if (!hourlyData[hour]) hourlyData[hour] = { online: 0, offline: 0 };
    if (h.ping_status === "online") hourlyData[hour].online++;
    else hourlyData[hour].offline++;
  });

  const hourlyChartData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i.toString().padStart(2, '0')}h`,
    online: hourlyData[i]?.online || 0,
    offline: hourlyData[i]?.offline || 0,
  }));

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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Server className="w-6 h-6 text-primary" />
              {server?.name}
            </h1>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <span>{server?.ipv4}</span>
              {server?.client_name && (
                <>
                  <span>•</span>
                  <Badge variant="outline">{server.client_name}</Badge>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Última hora</SelectItem>
              <SelectItem value="6h">6 horas</SelectItem>
              <SelectItem value="24h">24 horas</SelectItem>
              <SelectItem value="7d">7 dias</SelectItem>
              <SelectItem value="30d">30 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card border-green-500/30 bg-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Wifi className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-sm text-green-400">Uptime Ping</p>
                <p className="text-2xl font-bold text-green-400">{pingUptime}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-blue-500/30 bg-blue-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-sm text-blue-400">Uptime DNS</p>
                <p className="text-2xl font-bold text-blue-400">{dnsUptime}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Latência Média</p>
                <p className="text-2xl font-bold">{avgPingLatency.toFixed(0)}ms</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Verificações</p>
                <p className="text-2xl font-bold">{totalChecks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Latency Over Time */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
              Latência ao Longo do Tempo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={latencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="time" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  unit="ms"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  labelFormatter={(_, payload) => payload[0]?.payload?.fullTime}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="ping" 
                  name="Ping"
                  stroke="#22c55e" 
                  fill="#22c55e20"
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="dns" 
                  name="DNS"
                  stroke="#3b82f6" 
                  fill="#3b82f620"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Availability Pie Charts */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PieChartIcon className="w-5 h-5 text-primary" />
              Disponibilidade (SLA)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Ping</p>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <p className="text-2xl font-bold text-green-400">{pingUptime}%</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">DNS</p>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={dnsPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {dnsPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <p className="text-2xl font-bold text-blue-400">{dnsUptime}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hourly Distribution */}
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5 text-primary" />
            Distribuição por Hora
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hourlyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="hour" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="online" name="Online" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="offline" name="Offline" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* DNS Query Stats */}
      <DNSQueryStats serverId={serverId!} />

      {/* Recent History Table */}
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-primary" />
            Histórico Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-4 text-muted-foreground">Data/Hora</th>
                  <th className="text-left py-2 px-4 text-muted-foreground">Ping</th>
                  <th className="text-left py-2 px-4 text-muted-foreground">Latência</th>
                  <th className="text-left py-2 px-4 text-muted-foreground">DNS</th>
                  <th className="text-left py-2 px-4 text-muted-foreground">Resposta DNS</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(-20).reverse().map((h) => (
                  <tr key={h.id} className="border-b border-border/20 hover:bg-muted/20">
                    <td className="py-2 px-4">
                      {new Date(h.checked_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-2 px-4">
                      {h.ping_status === "online" ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          <Wifi className="w-3 h-3 mr-1" /> Online
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                          <WifiOff className="w-3 h-3 mr-1" /> Offline
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 px-4 font-mono">
                      {h.ping_latency ? `${h.ping_latency}ms` : "—"}
                    </td>
                    <td className="py-2 px-4">
                      {h.dns_status === "online" ? (
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                          <Zap className="w-3 h-3 mr-1" /> Ativo
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                          <AlertTriangle className="w-3 h-3 mr-1" /> Inativo
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 px-4 font-mono">
                      {h.dns_response_time ? `${h.dns_response_time}ms` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {history.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum dado de monitoramento ainda. Aguarde a primeira verificação.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { default as DNSQueryStats } from "./DNSQueryStats";
export default ServerDashboard;
