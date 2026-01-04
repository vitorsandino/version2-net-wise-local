import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  FileText, 
  Download, 
  Loader2, 
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Brain,
  Eye,
  Server,
  Activity,
  TrendingDown,
  TrendingUp,
  Clock,
  Wifi,
  Cpu,
  HardDrive,
  Network
} from "lucide-react";

interface ZabbixReportGeneratorProps {
  serverId: string;
  serverName: string;
  serverIp: string;
  zabbixUser?: string;
  zabbixPassword?: string;
  clientName?: string;
}

interface ReportData {
  identification: {
    clientName: string;
    environmentName: string;
    reportPeriod: string;
    generatedAt: string;
    monitoringSystem: string;
    serverIp: string;
  };
  overview: {
    totalHosts: number;
    activeHosts: number;
    disabledHosts: number;
    environmentStatus: string;
    generalAvailability: string;
  };
  availability: {
    avgSla: string;
    totalDowntimeMinutes: number;
    totalIncidents: number;
    hostsBelow99: number;
    hostsBelow95: number;
    worstHosts: Array<{ host: string; sla: string; ip: string }>;
  };
  alerts: {
    totalAlerts: number;
    criticalAlerts: number;
    recurringAlerts: number;
    bySeverity: Record<string, number>;
    topProblems: Array<{ name: string; count: number }>;
    recentProblems: Array<{ name: string; severity: string; host: string; time: string }>;
  };
  performance: {
    avgCpu: string;
    avgMemory: string;
    avgDisk: string;
    maxCpu: string;
    maxMemory: string;
    maxDisk: string;
    hostPerformance: Array<any>;
  };
  network: {
    interfacesMonitored: number;
    avgInTraffic: string;
    avgOutTraffic: string;
    maxInTraffic: string;
    maxOutTraffic: string;
    interfaces: Array<any>;
  };
  ping: {
    avgLatency: string;
    avgPacketLoss: string;
    responseRate: string;
  };
  comparison: {
    previousProblems: number;
    currentProblems: number;
    problemChange: string;
    trend: string;
  };
  aiAnalysis: string;
  finalStatus: {
    environmentStatus: string;
    attentionPoints: string[];
    stabilityIndicator: string;
  };
  hosts: Array<{
    host: string;
    ip: string;
    groups: string;
    sla: string;
    cpu: string;
    memory: string;
    disk: string;
    status: string;
  }>;
  generatedAt: string;
  period: string;
  periodLabel: string;
  summary: {
    totalHosts: number;
    activeHosts: number;
    disabledHosts: number;
    totalProblems: number;
    criticalProblems: number;
    avgSla: string;
  };
  problems: Array<{ name: string; severity: string; host: string; time: string }>;
  topProblems: Array<{ name: string; count: number }>;
  worstSla: Array<{ host: string; sla: string; ip: string }>;
}

const ZabbixReportGenerator = ({ 
  serverId, 
  serverName, 
  serverIp, 
  zabbixUser = "Admin", 
  zabbixPassword = "zabbix",
  clientName = "Cliente"
}: ZabbixReportGeneratorProps) => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [period, setPeriod] = useState<"day" | "week" | "month">("week");
  const [showDialog, setShowDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    setReportData(null);

    try {
      const response = await supabase.functions.invoke("zabbix-report", {
        body: {
          serverIp,
          zabbixUser,
          zabbixPassword,
          reportType: "full",
          period,
          clientName,
          environmentName: serverName
        },
      });

      if (response.error) {
        toast.error("Erro ao gerar relatório: " + response.error.message);
        return;
      }

      if (response.data?.error) {
        toast.error(response.data.error);
        return;
      }

      setReportData(response.data);
      setShowPreview(true);
      toast.success("Relatório gerado com sucesso!");
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): [number, number, number] => {
    switch (status) {
      case "stable": return [34, 197, 94];
      case "attention": return [245, 158, 11];
      case "critical": return [239, 68, 68];
      default: return [100, 116, 139];
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case "stable": return "✅";
      case "attention": return "⚠️";
      case "critical": return "❌";
      default: return "❓";
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "stable": return "Estável";
      case "attention": return "Atenção";
      case "critical": return "Crítico";
      default: return "Desconhecido";
    }
  };

  const exportToPDF = () => {
    if (!reportData) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 15;

    const addHeader = (title: string, color: [number, number, number]) => {
      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(0, 0, pageWidth, 10, 'F');
      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59);
      doc.text(title, 20, 25);
      return 35;
    };

    const addFooter = () => {
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(20, pageHeight - 15, pageWidth - 20, pageHeight - 15);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
        doc.text("Version2 Zabbix Monitor", 20, pageHeight - 8);
        doc.text(new Date().toLocaleDateString("pt-BR"), pageWidth - 20, pageHeight - 8, { align: 'right' });
      }
    };

    // ============== PAGE 1: COVER ==============
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageWidth, 90, 'F');
    
    doc.setFillColor(59, 130, 246);
    doc.circle(pageWidth / 2, 40, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("Z", pageWidth / 2, 45, { align: 'center' });
    
    doc.setFontSize(28);
    doc.text("RELATÓRIO ZABBIX", pageWidth / 2, 70, { align: 'center' });
    doc.setFontSize(14);
    doc.text(reportData.identification?.clientName || serverName, pageWidth / 2, 82, { align: 'center' });
    
    yPos = 105;
    
    // Info box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(20, yPos, pageWidth - 40, 55, 4, 4, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text("Período de Análise", 30, yPos + 15);
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text(reportData.identification?.reportPeriod || reportData.periodLabel, 30, yPos + 27);
    
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text("Data de Geração", 120, yPos + 15);
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text(new Date(reportData.generatedAt).toLocaleString("pt-BR"), 120, yPos + 27);
    
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text("Servidor Monitorado", 30, yPos + 42);
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(serverIp, 30, yPos + 52);

    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text("Sistema", 120, yPos + 42);
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text("Zabbix", 120, yPos + 52);
    
    yPos = 175;
    
    // Status cards
    const statusColor = getStatusColor(reportData.overview?.environmentStatus || "stable");
    const cardWidth = (pageWidth - 55) / 4;
    
    const cards = [
      { label: "Status", value: getStatusIcon(reportData.overview?.environmentStatus || "") + " " + getStatusLabel(reportData.overview?.environmentStatus || ""), color: statusColor },
      { label: "Hosts Ativos", value: String(reportData.overview?.activeHosts || 0), color: [34, 197, 94] as [number, number, number] },
      { label: "Alertas", value: String(reportData.alerts?.totalAlerts || 0), color: [239, 68, 68] as [number, number, number] },
      { label: "SLA Médio", value: `${reportData.availability?.avgSla || reportData.summary?.avgSla || "N/A"}%`, color: [59, 130, 246] as [number, number, number] },
    ];
    
    cards.forEach((card, i) => {
      const cardX = 20 + i * (cardWidth + 5);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(cardX, yPos, cardWidth, 40, 3, 3, 'FD');
      doc.setFillColor(card.color[0], card.color[1], card.color[2]);
      doc.rect(cardX, yPos, cardWidth, 5, 'F');
      
      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59);
      const valueText = String(card.value);
      doc.text(valueText.length > 10 ? valueText.substring(0, 10) : valueText, cardX + cardWidth / 2, yPos + 22, { align: 'center' });
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(card.label, cardX + cardWidth / 2, yPos + 34, { align: 'center' });
    });

    // ============== PAGE 2: OVERVIEW & AVAILABILITY ==============
    doc.addPage();
    yPos = addHeader("📊 Visão Geral do Ambiente", [59, 130, 246]);
    
    // Environment overview box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(20, yPos, pageWidth - 40, 50, 4, 4, 'F');
    
    const overviewData = [
      { label: "Total de Hosts", value: String(reportData.overview?.totalHosts || 0) },
      { label: "Hosts Ativos", value: String(reportData.overview?.activeHosts || 0) },
      { label: "Hosts Desabilitados", value: String(reportData.overview?.disabledHosts || 0) },
      { label: "Disponibilidade Geral", value: `${reportData.overview?.generalAvailability || "N/A"}%` },
    ];
    
    overviewData.forEach((item, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 30 + col * 85;
      const y = yPos + 15 + row * 20;
      
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(item.label, x, y);
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text(item.value, x, y + 10);
    });
    
    yPos += 60;
    
    // SLA Section
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text("📈 Disponibilidade (SLA)", 20, yPos);
    yPos += 10;
    
    // SLA gauge visualization
    const slaValue = parseFloat(reportData.availability?.avgSla || reportData.summary?.avgSla || "0");
    const gaugeWidth = 150;
    const gaugeHeight = 12;
    
    doc.setFillColor(229, 231, 235);
    doc.roundedRect(20, yPos, gaugeWidth, gaugeHeight, 3, 3, 'F');
    
    const slaColor: [number, number, number] = slaValue >= 99 ? [34, 197, 94] : slaValue >= 95 ? [245, 158, 11] : [239, 68, 68];
    doc.setFillColor(slaColor[0], slaColor[1], slaColor[2]);
    doc.roundedRect(20, yPos, (slaValue / 100) * gaugeWidth, gaugeHeight, 3, 3, 'F');
    
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(`${slaValue.toFixed(2)}%`, gaugeWidth + 30, yPos + 9);
    
    yPos += 25;
    
    // SLA stats
    const slaStats = [
      { label: "Tempo Indisponível", value: `${reportData.availability?.totalDowntimeMinutes || 0} min` },
      { label: "Total Incidentes", value: String(reportData.availability?.totalIncidents || 0) },
      { label: "Hosts < 99%", value: String(reportData.availability?.hostsBelow99 || 0) },
      { label: "Hosts < 95%", value: String(reportData.availability?.hostsBelow95 || 0) },
    ];
    
    slaStats.forEach((stat, i) => {
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(stat.label, 20 + (i * 45), yPos);
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text(stat.value, 20 + (i * 45), yPos + 10);
    });
    
    yPos += 25;
    
    // Worst SLA hosts table
    if (reportData.availability?.worstHosts?.length > 0 || reportData.worstSla?.length > 0) {
      const worstHosts = reportData.availability?.worstHosts || reportData.worstSla || [];
      autoTable(doc, {
        startY: yPos,
        head: [["Host", "IP", "SLA (%)", "Status"]],
        body: worstHosts.slice(0, 10).map((h: any) => [
          h.host.substring(0, 25),
          h.ip,
          h.sla,
          parseFloat(h.sla) >= 99 ? "OK" : parseFloat(h.sla) >= 95 ? "Atenção" : "Crítico"
        ]),
        theme: "striped",
        headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 2 },
        margin: { left: 20, right: 20 },
      });
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // ============== PAGE 3: ALERTS & INCIDENTS ==============
    doc.addPage();
    yPos = addHeader("🚨 Alertas e Incidentes", [239, 68, 68]);
    
    // Alert summary
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(20, yPos, pageWidth - 40, 35, 4, 4, 'F');
    
    const alertStats = [
      { label: "Total de Alertas", value: String(reportData.alerts?.totalAlerts || 0), color: [239, 68, 68] },
      { label: "Críticos", value: String(reportData.alerts?.criticalAlerts || 0), color: [220, 38, 38] },
      { label: "Recorrentes", value: String(reportData.alerts?.recurringAlerts || 0), color: [249, 115, 22] },
    ];
    
    alertStats.forEach((stat, i) => {
      const x = 30 + i * 60;
      doc.setFontSize(18);
      doc.setTextColor(stat.color[0], stat.color[1], stat.color[2]);
      doc.text(stat.value, x, yPos + 18);
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(stat.label, x, yPos + 28);
    });
    
    yPos += 45;
    
    // Severity breakdown
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text("Por Severidade:", 20, yPos);
    yPos += 8;
    
    const severities = [
      { label: "Disaster", count: reportData.alerts?.bySeverity?.["5"] || 0, color: [153, 27, 27] },
      { label: "High", count: reportData.alerts?.bySeverity?.["4"] || 0, color: [239, 68, 68] },
      { label: "Average", count: reportData.alerts?.bySeverity?.["3"] || 0, color: [249, 115, 22] },
      { label: "Warning", count: reportData.alerts?.bySeverity?.["2"] || 0, color: [245, 158, 11] },
      { label: "Info", count: reportData.alerts?.bySeverity?.["1"] || 0, color: [59, 130, 246] },
    ];
    
    severities.forEach((sev, i) => {
      const x = 20 + i * 35;
      doc.setFillColor(sev.color[0], sev.color[1], sev.color[2]);
      doc.roundedRect(x, yPos, 30, 20, 2, 2, 'F');
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text(String(sev.count), x + 15, yPos + 11, { align: 'center' });
      doc.setFontSize(6);
      doc.text(sev.label, x + 15, yPos + 17, { align: 'center' });
    });
    
    yPos += 30;
    
    // Top problems table
    if (reportData.alerts?.topProblems?.length > 0 || reportData.topProblems?.length > 0) {
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text("Problemas Mais Frequentes:", 20, yPos);
      yPos += 5;
      
      const topProblems = reportData.alerts?.topProblems || reportData.topProblems || [];
      autoTable(doc, {
        startY: yPos,
        head: [["#", "Problema", "Ocorrências"]],
        body: topProblems.slice(0, 15).map((p: any, i: number) => [
          String(i + 1),
          p.name.substring(0, 60),
          String(p.count)
        ]),
        theme: "striped",
        headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 2 },
        margin: { left: 20, right: 20 },
        columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 25 } },
      });
    }

    // ============== PAGE 4: PERFORMANCE ==============
    doc.addPage();
    yPos = addHeader("⚡ Performance Geral", [139, 92, 246]);
    
    // Performance summary
    doc.setFillColor(245, 243, 255);
    doc.roundedRect(20, yPos, pageWidth - 40, 45, 4, 4, 'F');
    
    const perfMetrics = [
      { label: "CPU Médio", avg: reportData.performance?.avgCpu || "N/A", max: reportData.performance?.maxCpu || "N/A", unit: "%" },
      { label: "Memória Média", avg: reportData.performance?.avgMemory || "N/A", max: reportData.performance?.maxMemory || "N/A", unit: "%" },
      { label: "Disco Médio", avg: reportData.performance?.avgDisk || "N/A", max: reportData.performance?.maxDisk || "N/A", unit: "%" },
    ];
    
    perfMetrics.forEach((metric, i) => {
      const x = 30 + i * 60;
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(metric.label, x, yPos + 12);
      doc.setFontSize(14);
      doc.setTextColor(139, 92, 246);
      doc.text(`${metric.avg}${metric.unit}`, x, yPos + 24);
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Pico: ${metric.max}${metric.unit}`, x, yPos + 34);
    });
    
    yPos += 55;
    
    // Network section
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text("🌐 Rede / Tráfego", 20, yPos);
    yPos += 10;
    
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(20, yPos, pageWidth - 40, 35, 4, 4, 'F');
    
    const networkStats = [
      { label: "Interfaces", value: String(reportData.network?.interfacesMonitored || 0) },
      { label: "Tráfego In (Mbps)", value: reportData.network?.avgInTraffic || "0" },
      { label: "Tráfego Out (Mbps)", value: reportData.network?.avgOutTraffic || "0" },
      { label: "Pico In (Mbps)", value: reportData.network?.maxInTraffic || "0" },
    ];
    
    networkStats.forEach((stat, i) => {
      const x = 30 + i * 45;
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(stat.label, x, yPos + 12);
      doc.setFontSize(12);
      doc.setTextColor(34, 197, 94);
      doc.text(stat.value, x, yPos + 24);
    });
    
    yPos += 45;
    
    // Ping/Latency section
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text("📡 Disponibilidade de Rede (Ping)", 20, yPos);
    yPos += 10;
    
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(20, yPos, pageWidth - 40, 30, 4, 4, 'F');
    
    const pingStats = [
      { label: "Latência Média", value: `${reportData.ping?.avgLatency || "0"} ms` },
      { label: "Perda de Pacotes", value: `${reportData.ping?.avgPacketLoss || "0"}%` },
      { label: "Taxa de Resposta", value: `${reportData.ping?.responseRate || "N/A"}%` },
    ];
    
    pingStats.forEach((stat, i) => {
      const x = 30 + i * 60;
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(stat.label, x, yPos + 12);
      doc.setFontSize(12);
      doc.setTextColor(59, 130, 246);
      doc.text(stat.value, x, yPos + 24);
    });

    // ============== PAGE 5: COMPARISON & STATUS ==============
    doc.addPage();
    yPos = addHeader("📊 Comparativo e Status Final", [16, 185, 129]);
    
    // Comparison section
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text("Comparativo com Período Anterior", 20, yPos);
    yPos += 10;
    
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(20, yPos, pageWidth - 40, 40, 4, 4, 'F');
    
    const trend = reportData.comparison?.trend || "stable";
    const trendIcon = trend === "better" ? "↑" : trend === "worse" ? "↓" : "=";
    const trendColor: [number, number, number] = trend === "better" ? [34, 197, 94] : trend === "worse" ? [239, 68, 68] : [100, 116, 139];
    const trendLabel = trend === "better" ? "Melhorou" : trend === "worse" ? "Piorou" : "Estável";
    
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Período Anterior", 30, yPos + 12);
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text(`${reportData.comparison?.previousProblems || 0} alertas`, 30, yPos + 24);
    
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Período Atual", 90, yPos + 12);
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text(`${reportData.comparison?.currentProblems || 0} alertas`, 90, yPos + 24);
    
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Variação", 150, yPos + 12);
    doc.setFontSize(16);
    doc.setTextColor(trendColor[0], trendColor[1], trendColor[2]);
    doc.text(`${trendIcon} ${trendLabel}`, 150, yPos + 26);
    
    yPos += 55;
    
    // Final Status
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text("🎯 Status Final", 20, yPos);
    yPos += 10;
    
    const finalStatusColor = getStatusColor(reportData.finalStatus?.environmentStatus || "stable");
    doc.setFillColor(finalStatusColor[0], finalStatusColor[1], finalStatusColor[2]);
    doc.roundedRect(20, yPos, pageWidth - 40, 50, 4, 4, 'F');
    
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text(`${getStatusIcon(reportData.finalStatus?.environmentStatus || "")} ${getStatusLabel(reportData.finalStatus?.environmentStatus || "")}`, pageWidth / 2, yPos + 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Estabilidade: ${reportData.finalStatus?.stabilityIndicator || "N/A"}`, pageWidth / 2, yPos + 38, { align: 'center' });
    
    yPos += 60;
    
    // Attention points
    if (reportData.finalStatus?.attentionPoints?.length > 0) {
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text("Pontos de Atenção:", 20, yPos);
      yPos += 8;
      
      reportData.finalStatus.attentionPoints.slice(0, 5).forEach((point, i) => {
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`• ${point}`, 25, yPos + (i * 8));
      });
    }

    // ============== PAGE 6: AI ANALYSIS ==============
    if (reportData.aiAnalysis) {
      doc.addPage();
      yPos = addHeader("🤖 Análise de Inteligência Artificial", [139, 92, 246]);
      
      doc.setFillColor(245, 243, 255);
      doc.roundedRect(20, yPos, pageWidth - 40, pageHeight - yPos - 25, 5, 5, 'F');
      
      yPos += 10;
      
      const cleanText = reportData.aiAnalysis
        .replace(/\*\*/g, "")
        .replace(/###/g, "•")
        .replace(/##/g, "")
        .replace(/#/g, "")
        .replace(/`/g, "");
      
      doc.setFontSize(9);
      doc.setTextColor(55, 48, 107);
      
      const splitText = doc.splitTextToSize(cleanText, pageWidth - 50);
      
      for (const line of splitText) {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          doc.setFillColor(139, 92, 246);
          doc.rect(0, 0, pageWidth, 10, 'F');
          doc.setFillColor(245, 243, 255);
          doc.roundedRect(20, 20, pageWidth - 40, pageHeight - 45, 5, 5, 'F');
          yPos = 30;
        }
        
        if (line.trim().startsWith("•") || /^\d+\./.test(line.trim())) {
          doc.setFontSize(10);
          doc.setTextColor(139, 92, 246);
        } else {
          doc.setFontSize(9);
          doc.setTextColor(55, 48, 107);
        }
        
        doc.text(line, 25, yPos);
        yPos += 5;
      }
    }

    // ============== PAGE 7: HOSTS INVENTORY ==============
    doc.addPage();
    yPos = addHeader("📋 Inventário de Hosts", [34, 197, 94]);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Total: ${reportData.hosts?.length || 0} hosts monitorados`, 20, yPos);
    yPos += 8;
    
    if (reportData.hosts?.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [["Host", "IP", "Grupos", "SLA (%)", "CPU", "Mem", "Disco"]],
        body: reportData.hosts.slice(0, 50).map((h: any) => [
          h.host?.substring(0, 20) || "",
          h.ip || "",
          h.groups?.substring(0, 15) || "",
          h.sla || "N/A",
          h.cpu !== "N/A" ? `${h.cpu}%` : "-",
          h.memory !== "N/A" ? `${h.memory}%` : "-",
          h.disk !== "N/A" ? `${h.disk}%` : "-"
        ]),
        theme: "striped",
        headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold', fontSize: 7 },
        styles: { fontSize: 6, cellPadding: 1.5 },
        margin: { left: 20, right: 20 },
        didParseCell: (data) => {
          if (data.column.index === 3 && data.section === 'body') {
            const sla = parseFloat(data.cell.text[0]);
            if (sla < 95) {
              data.cell.styles.textColor = [239, 68, 68];
              data.cell.styles.fontStyle = 'bold';
            } else if (sla < 99) {
              data.cell.styles.textColor = [245, 158, 11];
            }
          }
        }
      });
    }

    // Add footer to all pages
    addFooter();

    // Save PDF
    const fileName = `relatorio-zabbix-${serverName.replace(/\s+/g, "-")}-${reportData.period}-${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(fileName);
    toast.success("PDF exportado com sucesso!");
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "5": return "bg-red-900";
      case "4": return "bg-red-600";
      case "3": return "bg-orange-500";
      case "2": return "bg-yellow-500";
      default: return "bg-blue-500";
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case "5": return "Disaster";
      case "4": return "High";
      case "3": return "Average";
      case "2": return "Warning";
      case "1": return "Info";
      default: return "N/C";
    }
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileText className="w-4 h-4" />
          Relatório PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5 text-primary" />
            Gerar Relatório Completo - {serverName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-4 py-4 border-b">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Período:</Label>
            <Select value={period} onValueChange={(v: "day" | "week" | "month") => setPeriod(v)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Último dia (24h)</SelectItem>
                <SelectItem value="week">Última semana (7d)</SelectItem>
                <SelectItem value="month">Último mês (30d)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={generateReport} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
            {loading ? "Gerando..." : "Gerar Relatório"}
          </Button>

          {reportData && (
            <>
              <Button onClick={() => setShowPreview(!showPreview)} variant="outline" className="gap-2">
                <Eye className="w-4 h-4" />
                {showPreview ? "Ocultar" : "Preview"}
              </Button>
              <Button onClick={exportToPDF} variant="default" className="gap-2 bg-green-600 hover:bg-green-700">
                <Download className="w-4 h-4" />
                Baixar PDF
              </Button>
            </>
          )}
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative">
              <Loader2 className="w-16 h-16 animate-spin text-primary" />
              <Brain className="w-6 h-6 text-purple-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-foreground font-medium mt-4">Coletando dados do Zabbix...</p>
            <p className="text-sm text-muted-foreground">Gerando análise com Inteligência Artificial</p>
          </div>
        )}

        {reportData && showPreview && (
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 pb-6">
              {/* Status Card */}
              <Card className={`border-l-4 ${
                reportData.overview?.environmentStatus === "stable" ? "border-l-green-500 bg-green-50 dark:bg-green-950/20" :
                reportData.overview?.environmentStatus === "attention" ? "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20" :
                "border-l-red-500 bg-red-50 dark:bg-red-950/20"
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {reportData.overview?.environmentStatus === "stable" ? 
                        <CheckCircle className="w-8 h-8 text-green-500" /> :
                        reportData.overview?.environmentStatus === "attention" ?
                        <AlertTriangle className="w-8 h-8 text-yellow-500" /> :
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                      }
                      <div>
                        <p className="text-lg font-bold">
                          {reportData.overview?.environmentStatus === "stable" ? "Ambiente Estável" :
                           reportData.overview?.environmentStatus === "attention" ? "Atenção Necessária" :
                           "Situação Crítica"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Estabilidade: {reportData.finalStatus?.stabilityIndicator || "N/A"}
                        </p>
                      </div>
                    </div>
                    <Badge variant={reportData.overview?.environmentStatus === "stable" ? "default" : "destructive"}>
                      SLA: {reportData.availability?.avgSla || reportData.summary?.avgSla}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Server className="w-6 h-6 text-green-500" />
                      <div>
                        <p className="text-xl font-bold">{reportData.overview?.activeHosts || 0}</p>
                        <p className="text-xs text-muted-foreground">Hosts Ativos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-6 h-6 text-red-500" />
                      <div>
                        <p className="text-xl font-bold">{reportData.alerts?.totalAlerts || 0}</p>
                        <p className="text-xs text-muted-foreground">Alertas</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-purple-500">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-6 h-6 text-purple-500" />
                      <div>
                        <p className="text-xl font-bold">{reportData.performance?.avgCpu || "N/A"}%</p>
                        <p className="text-xs text-muted-foreground">CPU Médio</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Network className="w-6 h-6 text-blue-500" />
                      <div>
                        <p className="text-xl font-bold">{reportData.ping?.avgLatency || "0"}ms</p>
                        <p className="text-xs text-muted-foreground">Latência</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Comparison */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {reportData.comparison?.trend === "better" ? 
                      <TrendingUp className="w-4 h-4 text-green-500" /> :
                      reportData.comparison?.trend === "worse" ?
                      <TrendingDown className="w-4 h-4 text-red-500" /> :
                      <Activity className="w-4 h-4 text-gray-500" />
                    }
                    Comparativo com Período Anterior
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Período Anterior</p>
                      <p className="text-lg font-bold">{reportData.comparison?.previousProblems || 0} alertas</p>
                    </div>
                    <div className="text-center">
                      <Badge variant={reportData.comparison?.trend === "better" ? "default" : reportData.comparison?.trend === "worse" ? "destructive" : "secondary"}>
                        {reportData.comparison?.trend === "better" ? "↑ Melhorou" : 
                         reportData.comparison?.trend === "worse" ? "↓ Piorou" : "= Estável"}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Período Atual</p>
                      <p className="text-lg font-bold">{reportData.comparison?.currentProblems || 0} alertas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Analysis */}
              {reportData.aiAnalysis && (
                <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Brain className="w-4 h-4 text-purple-500" />
                      Resumo Automático (IA)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-strong:text-foreground"
                      dangerouslySetInnerHTML={{ 
                        __html: reportData.aiAnalysis
                          .replace(/\*\*(.*?)\*\*/g, '<strong class="text-purple-700 dark:text-purple-300">$1</strong>')
                          .replace(/\n/g, '<br/>')
                      }} 
                    />
                  </CardContent>
                </Card>
              )}

              <div className="grid md:grid-cols-2 gap-3">
                {/* Top Problems */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      Top 5 Problemas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(reportData.alerts?.topProblems || reportData.topProblems || []).slice(0, 5).map((problem, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs truncate">{problem.name}</p>
                          </div>
                          <Badge variant="destructive" className="text-xs">{problem.count}x</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Worst SLA */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-orange-500" />
                      Hosts com Menor SLA
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(reportData.availability?.worstHosts || reportData.worstSla || []).slice(0, 5).map((host: any, i: number) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{host.host}</p>
                              <p className="text-[10px] text-muted-foreground">{host.ip}</p>
                            </div>
                          </div>
                          <Badge variant={parseFloat(host.sla) < 95 ? "destructive" : parseFloat(host.sla) < 99 ? "secondary" : "default"}>
                            {host.sla}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </ScrollArea>
        )}

        {!loading && !reportData && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Selecione o período e clique em "Gerar Relatório"</p>
            <p className="text-sm text-muted-foreground">O relatório incluirá todas as seções solicitadas com análise de IA</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ZabbixReportGenerator;
