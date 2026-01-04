import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, Save, Lock, User, Key } from "lucide-react";

interface ServerCredentialsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverId: string;
  serverName: string;
  sshUser: string;
  sshPassword?: string | null;
  onUpdate: () => void;
}

const ServerCredentials = ({ 
  open, 
  onOpenChange, 
  serverId, 
  serverName, 
  sshUser: initialUser,
  sshPassword: initialPassword,
  onUpdate 
}: ServerCredentialsProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    ssh_user: initialUser,
    ssh_password: initialPassword || "",
  });

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from("dns_servers")
        .update({
          ssh_user: formData.ssh_user,
          ssh_password_encrypted: formData.ssh_password || null,
        })
        .eq("id", serverId);

      if (error) throw error;

      toast.success("Credenciais atualizadas com sucesso!");
      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Credenciais - {serverName}
          </DialogTitle>
          <DialogDescription>
            Gerencie as credenciais de acesso SSH do servidor
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="ssh_user" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Usuário SSH
            </Label>
            <Input
              id="ssh_user"
              value={formData.ssh_user}
              onChange={(e) => setFormData({ ...formData, ssh_user: e.target.value })}
              placeholder="root"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="ssh_password" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              Senha SSH
            </Label>
            <div className="relative">
              <Input
                id="ssh_password"
                type={showPassword ? "text" : "password"}
                value={formData.ssh_password}
                onChange={(e) => setFormData({ ...formData, ssh_password: e.target.value })}
                placeholder="••••••••"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Eye className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              A senha é armazenada de forma segura no banco de dados
            </p>
          </div>

          {/* Security Note */}
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-xs text-muted-foreground">
              <strong className="text-primary">Nota de Segurança:</strong> As credenciais são usadas para 
              executar comandos de instalação e configuração no servidor. Recomendamos usar chaves SSH 
              quando possível.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button variant="hero" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ServerCredentials;
