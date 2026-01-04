import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface NewTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: User;
  onTicketCreated: (ticketId: string) => void;
}

const NewTicketDialog = ({ open, onOpenChange, currentUser, onTicketCreated }: NewTicketDialogProps) => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("normal");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }

    setLoading(true);

    // Create ticket
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .insert({
        user_id: currentUser.id,
        subject: subject.trim(),
        priority,
      })
      .select()
      .single();

    if (ticketError) {
      toast.error("Erro ao criar chamado");
      setLoading(false);
      return;
    }

    // Create first message
    const { error: messageError } = await supabase
      .from("ticket_messages")
      .insert({
        ticket_id: ticket.id,
        sender_id: currentUser.id,
        content: message.trim(),
      });

    if (messageError) {
      toast.error("Erro ao enviar mensagem inicial");
      setLoading(false);
      return;
    }

    toast.success("Chamado criado com sucesso!");
    setSubject("");
    setMessage("");
    setPriority("normal");
    setLoading(false);
    onOpenChange(false);
    onTicketCreated(ticket.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] glass-card border-border/50">
        <DialogHeader>
          <DialogTitle className="text-xl text-foreground">Novo Chamado</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Assunto</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Descreva brevemente o problema"
              className="bg-background/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Prioridade</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Descrição do Problema</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Descreva detalhadamente o problema ou solicitação..."
              className="min-h-[120px] bg-background/50"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="hero" disabled={loading}>
              {loading ? "Criando..." : "Criar Chamado"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewTicketDialog;
