import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Plus, Trash2, Shield, User, Building, Loader2, RefreshCw } from "lucide-react";

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: "admin" | "user";
}

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  user_id: string | null;
  created_by: string;
  created_at: string;
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<Record<string, UserRole[]>>({});
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showNewUser, setShowNewUser] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ email: "", password: "", full_name: "", role: "user" });
  const [newClientForm, setNewClientForm] = useState({ name: "", email: "", phone: "", user_id: "" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    try {
      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        toast.error("Erro ao carregar usuários: " + profilesError.message);
      } else {
        setUsers(profilesData || []);
      }

      // Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");
      
      if (rolesError) {
        console.error("Error fetching roles:", rolesError);
      } else if (rolesData) {
        const roleMap: Record<string, UserRole[]> = {};
        rolesData.forEach((role) => {
          if (!roleMap[role.user_id]) roleMap[role.user_id] = [];
          roleMap[role.user_id].push(role as UserRole);
        });
        setRoles(roleMap);
      }

      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (clientsError) {
        console.error("Error fetching clients:", clientsError);
        toast.error("Erro ao carregar clientes: " + clientsError.message);
      } else {
        setClients(clientsData || []);
      }
    } catch (error: any) {
      console.error("Error in fetchData:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const createUser = async () => {
    if (!newUserForm.email || !newUserForm.password) {
      toast.error("Email e senha são obrigatórios");
      return;
    }

    if (newUserForm.password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setSaving(true);
    try {
      // Create user via edge function
      const { data, error } = await supabase.functions.invoke("create-admin-user", {
        body: {
          email: newUserForm.email,
          password: newUserForm.password,
          full_name: newUserForm.full_name,
          role: newUserForm.role
        }
      });

      if (error) {
        toast.error("Erro ao criar usuário: " + error.message);
        return;
      }

      if (data?.error) {
        toast.error("Erro ao criar usuário: " + data.error);
        return;
      }

      toast.success("Usuário criado com sucesso!");
      setShowNewUser(false);
      setNewUserForm({ email: "", password: "", full_name: "", role: "user" });
      await fetchData();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error("Erro ao criar usuário: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const createClient = async () => {
    if (!newClientForm.name) {
      toast.error("Nome do cliente é obrigatório");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("clients")
        .insert({
          name: newClientForm.name,
          email: newClientForm.email || null,
          phone: newClientForm.phone || null,
          user_id: newClientForm.user_id || null,
          created_by: user.id
        });

      if (error) {
        console.error("Client creation error:", error);
        toast.error("Erro ao criar cliente: " + error.message);
        return;
      }

      toast.success("Cliente criado com sucesso!");
      setShowNewClient(false);
      setNewClientForm({ name: "", email: "", phone: "", user_id: "" });
      await fetchData();
    } catch (e: any) {
      console.error("Exception creating client:", e);
      toast.error("Erro inesperado: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteClient = async (clientId: string) => {
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;
    
    const { error } = await supabase.from("clients").delete().eq("id", clientId);
    if (error) {
      toast.error("Erro ao excluir cliente: " + error.message);
      return;
    }
    toast.success("Cliente excluído");
    fetchData();
  };

  const toggleUserRole = async (userId: string, currentRoles: UserRole[]) => {
    const hasAdmin = currentRoles.some(r => r.role === "admin");
    
    try {
      if (hasAdmin) {
        // Remove admin role
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "admin");
        
        if (error) {
          toast.error("Erro ao alterar role: " + error.message);
          return;
        }
      } else {
        // Add admin role
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "admin" });
        
        if (error) {
          toast.error("Erro ao alterar role: " + error.message);
          return;
        }
      }
      
      toast.success("Role alterada!");
      fetchData();
    } catch (error: any) {
      toast.error("Erro ao alterar role: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Gestão de Usuários e Clientes</h2>
          <p className="text-sm text-muted-foreground">Gerencie acessos e vinculações</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Users Section */}
      <Card className="glass-card border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Usuários ({users.length})
          </CardTitle>
          <Dialog open={showNewUser} onOpenChange={setShowNewUser}>
            <DialogTrigger asChild>
              <Button variant="hero" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Usuário</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  <Input 
                    value={newUserForm.full_name} 
                    onChange={(e) => setNewUserForm({ ...newUserForm, full_name: e.target.value })} 
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input 
                    type="email"
                    value={newUserForm.email} 
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })} 
                    placeholder="email@exemplo.com"
                    required
                  />
                </div>
                <div>
                  <Label>Senha * (mín. 6 caracteres)</Label>
                  <Input 
                    type="password"
                    value={newUserForm.password} 
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })} 
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={newUserForm.role} onValueChange={(v) => setNewUserForm({ ...newUserForm, role: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuário</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowNewUser(false)}>Cancelar</Button>
                  <Button onClick={createUser} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Criar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Nenhum usuário encontrado</p>
          ) : (
            <div className="space-y-3">
              {users.map((user) => {
                const userRoles = roles[user.user_id] || [];
                const isAdmin = userRoles.some(r => r.role === "admin");
                return (
                  <div key={user.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{user.full_name || user.email}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAdmin && (
                        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                          <Shield className="w-3 h-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => toggleUserRole(user.user_id, userRoles)}
                      >
                        {isAdmin ? "Remover Admin" : "Tornar Admin"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clients Section */}
      <Card className="glass-card border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5 text-primary" />
            Clientes ({clients.length})
          </CardTitle>
          <Dialog open={showNewClient} onOpenChange={setShowNewClient}>
            <DialogTrigger asChild>
              <Button variant="hero" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Cliente</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome do Cliente *</Label>
                  <Input 
                    value={newClientForm.name} 
                    onChange={(e) => setNewClientForm({ ...newClientForm, name: e.target.value })} 
                    placeholder="Nome da empresa ou cliente"
                    required
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input 
                    type="email"
                    value={newClientForm.email} 
                    onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })} 
                    placeholder="contato@empresa.com"
                  />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input 
                    value={newClientForm.phone} 
                    onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })} 
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div>
                  <Label>Vincular Usuário (opcional)</Label>
                  <Select 
                    value={newClientForm.user_id} 
                    onValueChange={(v) => setNewClientForm({ ...newClientForm, user_id: v === "none" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um usuário..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.user_id} value={u.user_id}>
                          {u.full_name || u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Usuários vinculados verão apenas equipamentos deste cliente
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowNewClient(false)}>Cancelar</Button>
                  <Button onClick={createClient} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Criar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Nenhum cliente cadastrado</p>
          ) : (
            <div className="space-y-3">
              {clients.map((client) => {
                const linkedUser = users.find(u => u.user_id === client.user_id);
                return (
                  <div key={client.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Building className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {client.email || "Sem email"} • {client.phone || "Sem telefone"}
                        </p>
                        {linkedUser && (
                          <p className="text-xs text-primary">
                            Vinculado: {linkedUser.full_name || linkedUser.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-destructive"
                      onClick={() => deleteClient(client.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;