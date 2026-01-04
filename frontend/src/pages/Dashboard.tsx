import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, User, Network, Users, Shield, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import DNSIntegration from "@/components/dns/DNSIntegration";
import ZabbixIntegration from "@/components/zabbix/ZabbixIntegration";
import UserManagement from "@/components/admin/UserManagement";
import WikiPage from "@/components/wiki/WikiPage";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState("dns");
  const [showWiki, setShowWiki] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await checkAdminRole(session.user.id);
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAdminRole = async (userId: string) => {
    const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    setIsAdmin(!!data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado!");
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (showWiki) {
    return <WikiPage onBack={() => setShowWiki(false)} />;
  }

  return (
    <main className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[300px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-accent/10 rounded-full blur-[100px]" />
      </div>

      <header className="relative z-20 border-b border-border/50 glass-card shrink-0">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">V2</span>
            </div>
            <span className="text-xl font-bold text-foreground hidden sm:block">
              Version<span className="text-gradient">2</span>
            </span>
            {isAdmin && (
              <span className="px-2 py-1 text-xs rounded-full bg-primary/20 text-primary border border-primary/30">Admin</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setShowWiki(true)}>
              <HelpCircle className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Wiki</span>
            </Button>
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              {user?.email}
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto relative z-10">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="border-b border-border/50 bg-background/50 backdrop-blur-sm px-6 pt-4">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="dns" className="gap-2">
                <Network className="w-4 h-4" />
                DNS Monitor
              </TabsTrigger>
              <TabsTrigger value="zabbix" className="gap-2">
                <Shield className="w-4 h-4" />
                Zabbix Monitor
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="users" className="gap-2">
                  <Users className="w-4 h-4" />
                  Usuários & Clientes
                </TabsTrigger>
              )}
            </TabsList>
          </div>
          <TabsContent value="dns" className="flex-1 overflow-auto m-0">
            <DNSIntegration />
          </TabsContent>
          <TabsContent value="zabbix" className="flex-1 overflow-auto m-0">
            <ZabbixIntegration />
          </TabsContent>
          {isAdmin && (
            <TabsContent value="users" className="flex-1 overflow-auto m-0 p-6">
              <UserManagement />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </main>
  );
};

export default Dashboard;
