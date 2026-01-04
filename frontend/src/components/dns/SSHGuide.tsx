import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Terminal, ExternalLink, Copy, Server, Shield, Info } from "lucide-react";
import { toast } from "sonner";

interface SSHGuideProps {
  serverIp: string;
  sshPort: number;
  sshUser: string;
}

const SSHGuide = ({ serverIp, sshPort, sshUser }: SSHGuideProps) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const sshCommand = `ssh ${sshUser}@${serverIp} -p ${sshPort}`;

  return (
    <div className="space-y-6">
      {/* Explicação */}
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="w-5 h-5 text-blue-400" />
            Sobre o Acesso SSH Web
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Para acessar servidores via SSH diretamente pelo navegador, existem algumas opções:
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Apache Guacamole</strong> - Solução self-hosted mais completa (requer servidor próprio)</li>
            <li><strong>WebSSH.io</strong> - Serviço online gratuito (pode ter limitações)</li>
            <li><strong>Terminal local</strong> - Mais seguro, use o comando SSH abaixo</li>
          </ul>
        </CardContent>
      </Card>

      {/* Comando SSH */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Terminal className="w-5 h-5 text-primary" />
            Comando SSH (Terminal Local)
          </CardTitle>
          <CardDescription>
            Execute este comando no seu terminal para conectar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
            <code className="flex-1 font-mono text-sm">{sshCommand}</code>
            <Button variant="outline" size="sm" onClick={() => copyToClipboard(sshCommand)}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Opções Web */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Server className="w-5 h-5 text-primary" />
            Acesso SSH via Web
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* WebSSH.io */}
          <div className="p-4 rounded-lg border border-border/50 bg-background/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">WebSSH.io</Badge>
                <span className="text-sm text-muted-foreground">Gratuito - Online</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.open(`https://webssh.io/?hostname=${serverIp}&port=${sshPort}&username=${sshUser}`, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Serviço web que permite conexões SSH básicas. A senha será solicitada na interface.
            </p>
          </div>

          {/* SSH Web Client */}
          <div className="p-4 rounded-lg border border-border/50 bg-background/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Shellngn</Badge>
                <span className="text-sm text-muted-foreground">Gratuito - Online</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.open(`https://www.shellngn.com/`, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Cliente SSH web moderno. Crie uma conta gratuita e conecte-se aos seus servidores.
            </p>
          </div>

          {/* Apache Guacamole */}
          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/20 text-primary border-primary/30">Apache Guacamole</Badge>
                <span className="text-sm text-muted-foreground">Self-Hosted - Recomendado</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.open('https://guacamole.apache.org/', '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Docs
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Solução completa para acesso remoto (SSH, RDP, VNC). Requer instalação em servidor próprio.
              Ideal para ambientes corporativos com múltiplos servidores.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Segurança */}
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="w-5 h-5 text-yellow-400" />
            Recomendações de Segurança
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <ul className="list-disc list-inside space-y-1">
            <li>Use chaves SSH em vez de senhas quando possível</li>
            <li>Configure fail2ban para proteção contra brute-force</li>
            <li>Altere a porta SSH padrão (22) para outra porta</li>
            <li>Limite os IPs que podem acessar via firewall (nftables)</li>
            <li>Para Guacamole, use HTTPS com certificado válido</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default SSHGuide;
