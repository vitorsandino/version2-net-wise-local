import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { 
  Globe, 
  TrendingUp, 
  Loader2, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Network
} from "lucide-react";

interface TopDomainsCardProps {
  serverId: string;
}

interface DomainStats {
  domain: string;
  count: number;
  query_type: string;
}

const TopDomainsCard = ({ serverId }: TopDomainsCardProps) => {
  const [period, setPeriod] = useState("24h");
  const [loading, setLoading] = useState(true);
  const [totalQueries, setTotalQueries] = useState(0);
  
  // Separated by query type
  const [domainsA, setDomainsA] = useState<DomainStats[]>([]);
  const [domainsAAAA, setDomainsAAAA] = useState<DomainStats[]>([]);
  const [domainsFailed, setDomainsFailed] = useState<DomainStats[]>([]);
  const [domainsOther, setDomainsOther] = useState<DomainStats[]>([]);
  
  // Stats
  const [statsA, setStatsA] = useState({ count: 0, total: 0 });
  const [statsAAAA, setStatsAAAA] = useState({ count: 0, total: 0 });
  const [statsFailed, setStatsFailed] = useState({ count: 0, total: 0 });

  useEffect(() => {
    fetchTopDomains();
  }, [serverId, period]);

  const fetchTopDomains = async () => {
    setLoading(true);
    
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

    // Fetch all query logs for this server in the time range
    const { data, error } = await supabase
      .from("dns_query_logs")
      .select("domain, query_type, query_count")
      .eq("server_id", serverId)
      .gte("logged_at", startDate.toISOString())
      .order("logged_at", { ascending: false });

    if (error) {
      console.error("Error fetching domains:", error);
      setLoading(false);
      return;
    }

    // Aggregate by domain and type
    const mapA: Record<string, number> = {};
    const mapAAAA: Record<string, number> = {};
    const mapFailed: Record<string, number> = {};
    const mapOther: Record<string, number> = {};
    
    let total = 0;
    let totalA = 0;
    let totalAAAA = 0;
    let totalFailed = 0;
    
    (data || []).forEach(row => {
      const domain = row.domain;
      const count = row.query_count;
      const type = row.query_type.toUpperCase();
      
      total += count;
      
      if (type === 'A') {
        mapA[domain] = (mapA[domain] || 0) + count;
        totalA += count;
      } else if (type === 'AAAA') {
        mapAAAA[domain] = (mapAAAA[domain] || 0) + count;
        totalAAAA += count;
      } else if (type === 'NXDOMAIN' || type === 'SERVFAIL' || type === 'REFUSED' || type === 'FAILED') {
        mapFailed[domain] = (mapFailed[domain] || 0) + count;
        totalFailed += count;
      } else {
        mapOther[domain] = (mapOther[domain] || 0) + count;
      }
    });

    // Sort and get top 10 for each
    const sortTop10 = (map: Record<string, number>, queryType: string): DomainStats[] => {
      return Object.entries(map)
        .map(([domain, count]) => ({ domain, count, query_type: queryType }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    };

    setDomainsA(sortTop10(mapA, 'A'));
    setDomainsAAAA(sortTop10(mapAAAA, 'AAAA'));
    setDomainsFailed(sortTop10(mapFailed, 'FAILED'));
    setDomainsOther(sortTop10(mapOther, 'OTHER'));
    
    setStatsA({ count: Object.keys(mapA).length, total: totalA });
    setStatsAAAA({ count: Object.keys(mapAAAA).length, total: totalAAAA });
    setStatsFailed({ count: Object.keys(mapFailed).length, total: totalFailed });
    
    setTotalQueries(total);
    setLoading(false);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const getPercentage = (count: number, total: number) => {
    if (total === 0) return 0;
    return ((count / total) * 100).toFixed(1);
  };

  const renderDomainList = (domains: DomainStats[], total: number, emptyMessage: string) => {
    if (domains.length === 0) {
      return (
        <div className="text-center py-6 text-muted-foreground">
          <Globe className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {domains.map((item, index) => (
          <div 
            key={item.domain}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/20 transition-colors"
          >
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0">
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <span className="font-mono text-sm truncate block">{item.domain}</span>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="h-1 bg-primary/20 rounded-full flex-1 max-w-[100px]">
                  <div 
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${Math.min(100, (item.count / (domains[0]?.count || 1)) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {getPercentage(item.count, total)}%
                </span>
              </div>
            </div>
            <span className="font-bold text-sm shrink-0">{formatNumber(item.count)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Globe className="w-5 h-5 text-primary" />
          Estatísticas de Consultas DNS
        </CardTitle>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1h">1 hora</SelectItem>
            <SelectItem value="6h">6 horas</SelectItem>
            <SelectItem value="24h">24 horas</SelectItem>
            <SelectItem value="7d">7 dias</SelectItem>
            <SelectItem value="30d">30 dias</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : totalQueries === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Network className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma query registrada ainda</p>
            <p className="text-sm mt-1">O agent irá coletar dados automaticamente</p>
          </div>
        ) : (
          <>
            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/20">
                <TrendingUp className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-bold">{formatNumber(totalQueries)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">IPv4 (A)</p>
                  <p className="font-bold text-green-500">{formatNumber(statsA.total)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10">
                <Network className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">IPv6 (AAAA)</p>
                  <p className="font-bold text-blue-500">{formatNumber(statsAAAA.total)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10">
                <XCircle className="w-4 h-4 text-red-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Falhas</p>
                  <p className="font-bold text-red-500">{formatNumber(statsFailed.total)}</p>
                </div>
              </div>
            </div>

            {/* Tabs for different query types */}
            <Tabs defaultValue="ipv4" className="w-full">
              <TabsList className="w-full grid grid-cols-4 mb-4">
                <TabsTrigger value="ipv4" className="text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  IPv4
                </TabsTrigger>
                <TabsTrigger value="ipv6" className="text-xs">
                  <Network className="w-3 h-3 mr-1" />
                  IPv6
                </TabsTrigger>
                <TabsTrigger value="failed" className="text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Falhas
                </TabsTrigger>
                <TabsTrigger value="other" className="text-xs">
                  <Globe className="w-3 h-3 mr-1" />
                  Outros
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="ipv4" className="mt-0">
                <div className="text-sm text-muted-foreground mb-2">
                  Top 10 domínios resolvidos via IPv4 ({statsA.count} domínios únicos)
                </div>
                {renderDomainList(domainsA, statsA.total, "Nenhuma query IPv4 registrada")}
              </TabsContent>
              
              <TabsContent value="ipv6" className="mt-0">
                <div className="text-sm text-muted-foreground mb-2">
                  Top 10 domínios resolvidos via IPv6 ({statsAAAA.count} domínios únicos)
                </div>
                {renderDomainList(domainsAAAA, statsAAAA.total, "Nenhuma query IPv6 registrada")}
              </TabsContent>
              
              <TabsContent value="failed" className="mt-0">
                <div className="text-sm text-muted-foreground mb-2">
                  Top 10 domínios com falha de resolução ({statsFailed.count} domínios únicos)
                </div>
                {renderDomainList(domainsFailed, statsFailed.total, "Nenhuma falha registrada")}
              </TabsContent>
              
              <TabsContent value="other" className="mt-0">
                <div className="text-sm text-muted-foreground mb-2">
                  Outros tipos de query (MX, TXT, CNAME, etc.)
                </div>
                {renderDomainList(domainsOther, totalQueries - statsA.total - statsAAAA.total - statsFailed.total, "Nenhuma query de outros tipos")}
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TopDomainsCard;
