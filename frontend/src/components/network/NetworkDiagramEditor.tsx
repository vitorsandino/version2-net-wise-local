import { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  PenTool, 
  Plus, 
  Save, 
  Download, 
  Upload,
  Trash2,
  Loader2,
  FileJson,
  Image as ImageIcon,
  FolderOpen
} from "lucide-react";

// Lazy load Excalidraw to reduce initial bundle size
const Excalidraw = lazy(() => import("@excalidraw/excalidraw").then(mod => ({ default: mod.Excalidraw })));

interface NetworkDiagram {
  id: string;
  name: string;
  data: any;
  createdAt: string;
  updatedAt: string;
}

const NetworkDiagramEditor = () => {
  const [diagrams, setDiagrams] = useState<NetworkDiagram[]>([]);
  const [currentDiagram, setCurrentDiagram] = useState<NetworkDiagram | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newDiagramName, setNewDiagramName] = useState("");
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Load diagrams from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("network-diagrams");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setDiagrams(parsed);
      } catch (e) {
        console.error("Error loading diagrams:", e);
      }
    }
    setIsReady(true);
  }, []);

  const saveDiagramsToStorage = (updatedDiagrams: NetworkDiagram[]) => {
    localStorage.setItem("network-diagrams", JSON.stringify(updatedDiagrams));
  };

  const createNewDiagram = () => {
    if (!newDiagramName.trim()) {
      toast.error("Digite um nome para o diagrama");
      return;
    }

    const newDiagram: NetworkDiagram = {
      id: crypto.randomUUID(),
      name: newDiagramName.trim(),
      data: { elements: [], appState: { viewBackgroundColor: "#1e1e1e" } },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newDiagram, ...diagrams];
    setDiagrams(updated);
    saveDiagramsToStorage(updated);
    setCurrentDiagram(newDiagram);
    setShowNewDialog(false);
    setNewDiagramName("");
    toast.success("Diagrama criado!");
  };

  const saveDiagram = useCallback(async () => {
    if (!currentDiagram || !excalidrawAPI) return;

    setSaving(true);
    try {
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();

      const updated: NetworkDiagram = {
        ...currentDiagram,
        data: { elements, appState: { viewBackgroundColor: appState.viewBackgroundColor } },
        updatedAt: new Date().toISOString(),
      };

      const updatedDiagrams = diagrams.map(d => 
        d.id === updated.id ? updated : d
      );

      setDiagrams(updatedDiagrams);
      setCurrentDiagram(updated);
      saveDiagramsToStorage(updatedDiagrams);
      toast.success("Diagrama salvo!");
    } catch (error) {
      toast.error("Erro ao salvar diagrama");
    } finally {
      setSaving(false);
    }
  }, [currentDiagram, excalidrawAPI, diagrams]);

  const deleteDiagram = (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este diagrama?")) return;

    const updated = diagrams.filter(d => d.id !== id);
    setDiagrams(updated);
    saveDiagramsToStorage(updated);
    
    if (currentDiagram?.id === id) {
      setCurrentDiagram(null);
    }
    toast.success("Diagrama excluído!");
  };

  const exportToPNG = async () => {
    if (!excalidrawAPI) return;

    try {
      const { exportToBlob } = await import("@excalidraw/excalidraw");
      const blob = await exportToBlob({
        elements: excalidrawAPI.getSceneElements(),
        appState: excalidrawAPI.getAppState(),
        files: excalidrawAPI.getFiles(),
        mimeType: "image/png",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${currentDiagram?.name || "diagram"}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PNG exportado!");
    } catch (error) {
      toast.error("Erro ao exportar PNG");
    }
  };

  const exportToJSON = () => {
    if (!currentDiagram || !excalidrawAPI) return;

    const elements = excalidrawAPI.getSceneElements();
    const appState = excalidrawAPI.getAppState();
    
    const data = JSON.stringify({ elements, appState }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentDiagram.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("JSON exportado!");
  };

  const importFromJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (data.elements && excalidrawAPI) {
        excalidrawAPI.updateScene({
          elements: data.elements,
          appState: data.appState,
        });
        toast.success("Diagrama importado!");
      }
    } catch (error) {
      toast.error("Erro ao importar JSON");
    }
    
    event.target.value = "";
  };

  const selectDiagram = (diagram: NetworkDiagram) => {
    setCurrentDiagram(diagram);
    // Reset excalidrawAPI when switching diagrams to force reinitialize
    setExcalidrawAPI(null);
  };

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <PenTool className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Desenho de Rede</h1>
            <p className="text-sm text-muted-foreground">
              {currentDiagram ? currentDiagram.name : "Selecione ou crie um diagrama"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentDiagram && (
            <>
              <Button variant="outline" size="sm" onClick={saveDiagram} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span className="ml-1 hidden sm:inline">Salvar</span>
              </Button>
              <Button variant="outline" size="sm" onClick={exportToPNG}>
                <ImageIcon className="w-4 h-4" />
                <span className="ml-1 hidden sm:inline">PNG</span>
              </Button>
              <Button variant="outline" size="sm" onClick={exportToJSON}>
                <FileJson className="w-4 h-4" />
                <span className="ml-1 hidden sm:inline">JSON</span>
              </Button>
              <label>
                <input type="file" accept=".json" onChange={importFromJSON} className="hidden" />
                <Button variant="outline" size="sm" asChild>
                  <span><Upload className="w-4 h-4" /></span>
                </Button>
              </label>
            </>
          )}
          <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
            <DialogTrigger asChild>
              <Button variant="hero" size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Novo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Diagrama de Rede</DialogTitle>
                <DialogDescription>Crie um novo diagrama para documentar sua infraestrutura</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome do Diagrama</Label>
                  <Input 
                    value={newDiagramName}
                    onChange={(e) => setNewDiagramName(e.target.value)}
                    placeholder="Ex: Datacenter Principal"
                    onKeyDown={(e) => e.key === 'Enter' && createNewDiagram()}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancelar</Button>
                  <Button onClick={createNewDiagram}>Criar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Diagram List */}
        <div className="w-64 border-r border-border/50 p-4 space-y-3 overflow-y-auto">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            Meus Diagramas
          </h3>
          {diagrams.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum diagrama criado
            </p>
          ) : (
            diagrams.map(diagram => (
              <Card 
                key={diagram.id} 
                className={`cursor-pointer transition-all hover:shadow-md group ${
                  currentDiagram?.id === diagram.id ? 'border-primary bg-primary/5' : 'glass-card border-border/50'
                }`}
                onClick={() => selectDiagram(diagram)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{diagram.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(diagram.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0 text-destructive opacity-0 group-hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); deleteDiagram(diagram.id); }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Editor Area */}
        <div className="flex-1 bg-background relative">
          {currentDiagram ? (
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            }>
              <div className="absolute inset-0">
                <Excalidraw
                  key={currentDiagram.id}
                  excalidrawAPI={(api: any) => setExcalidrawAPI(api)}
                  initialData={{
                    elements: currentDiagram.data?.elements || [],
                    appState: {
                      ...currentDiagram.data?.appState,
                      viewBackgroundColor: currentDiagram.data?.appState?.viewBackgroundColor || "#1e1e1e",
                    },
                  }}
                  theme="dark"
                  langCode="pt-BR"
                />
              </div>
            </Suspense>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <PenTool className="w-16 h-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Desenho de Rede</h2>
              <p className="text-muted-foreground mb-6 max-w-md">
                Crie diagramas de rede profissionais para documentar sua infraestrutura.
                Desenhe linhas, formas, adicione textos e exporte para PNG ou JSON.
              </p>
              <Button variant="hero" onClick={() => setShowNewDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Diagrama
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NetworkDiagramEditor;