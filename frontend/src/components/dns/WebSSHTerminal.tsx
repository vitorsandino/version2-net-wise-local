import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Terminal, Copy, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface WebSSHTerminalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverName: string;
  ipv4: string;
  sshPort: number;
  sshUser: string;
  sshPassword?: string;
}

const WebSSHTerminal = ({ 
  open, 
  onOpenChange, 
  serverName, 
  ipv4, 
  sshPort, 
  sshUser,
  sshPassword 
}: WebSSHTerminalProps) => {
  const [showPassword, setShowPassword] = useState(false);

  const sshUrl = `ssh://${sshUser}@${ipv4}:${sshPort}`;
  const sshCommand = `ssh ${sshUser}@${ipv4} -p ${sshPort}`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const openSSHApp = () => {
    window.location.href = sshUrl;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            SSH - {serverName}
          </DialogTitle>
          <DialogDescription>
            Conectar via aplicativo de terminal padrão
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Connection Info */}
          <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Host</p>
                <div className="flex items-center gap-1">
                  <p className="font-mono font-medium">{ipv4}</p>
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => copyToClipboard(ipv4, "IP")}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Porta</p>
                <p className="font-mono font-medium">{sshPort}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Usuário</p>
                <div className="flex items-center gap-1">
                  <p className="font-mono font-medium">{sshUser}</p>
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => copyToClipboard(sshUser, "Usuário")}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Senha</p>
                <div className="flex items-center gap-1">
                  {sshPassword ? (
                    <>
                      <p className="font-mono font-medium">
                        {showPassword ? sshPassword : "••••••••"}
                      </p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-5 w-5 p-0" 
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-5 w-5 p-0" 
                        onClick={() => copyToClipboard(sshPassword, "Senha")}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </>
                  ) : (
                    <p className="font-mono font-medium text-muted-foreground">Chave SSH</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Command */}
          <div>
            <Label className="text-sm text-muted-foreground">Comando SSH</Label>
            <div className="flex gap-2 mt-1">
              <Input 
                value={sshCommand}
                readOnly
                className="font-mono text-sm bg-black/30"
              />
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => copyToClipboard(sshCommand, "Comando")}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Main Action */}
          <Button 
            onClick={openSSHApp}
            className="w-full"
            variant="hero"
          >
            <Terminal className="w-4 h-4 mr-2" />
            Abrir Terminal SSH
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Isso abrirá seu aplicativo de terminal padrão (PuTTY, Terminal, etc.)
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WebSSHTerminal;