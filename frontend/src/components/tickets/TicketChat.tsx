import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, ArrowLeft, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { User } from "@supabase/supabase-js";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender_email?: string;
}

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  user_id: string;
  created_at: string;
}

interface TicketChatProps {
  ticket: Ticket;
  currentUser: User;
  isAdmin: boolean;
  onBack: () => void;
  onStatusChange: (status: string) => void;
}

const statusLabels: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em Andamento",
  waiting_client: "Aguardando Cliente",
  closed: "Fechado",
};

const statusColors: Record<string, string> = {
  open: "bg-green-500/20 text-green-400 border-green-500/30",
  in_progress: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  waiting_client: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  closed: "bg-muted text-muted-foreground border-border",
};

const TicketChat = ({ ticket, currentUser, isAdmin, onBack, onStatusChange }: TicketChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    fetchMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`ticket-${ticket.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_messages",
          filter: `ticket_id=eq.${ticket.id}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          // Fetch sender email
          const { data: profile } = await supabase
            .from("profiles")
            .select("email")
            .eq("user_id", newMsg.sender_id)
            .maybeSingle();
          
          setMessages((prev) => [
            ...prev,
            { ...newMsg, sender_email: profile?.email || "Usuário" },
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticket.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ticket_messages")
      .select("*")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar mensagens");
      return;
    }

    // Fetch sender emails
    const messagesWithEmails = await Promise.all(
      (data || []).map(async (msg) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("user_id", msg.sender_id)
          .maybeSingle();
        return { ...msg, sender_email: profile?.email || "Usuário" };
      })
    );

    setMessages(messagesWithEmails);
    setLoading(false);
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    const { error } = await supabase.from("ticket_messages").insert({
      ticket_id: ticket.id,
      sender_id: currentUser.id,
      content: newMessage.trim(),
    });

    if (error) {
      toast.error("Erro ao enviar mensagem");
    } else {
      setNewMessage("");
    }
    setSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStatusUpdate = async (status: string) => {
    const { error } = await supabase
      .from("tickets")
      .update({ status })
      .eq("id", ticket.id);

    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      onStatusChange(status);
      toast.success("Status atualizado");
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border/50 glass-card">
        <div className="flex items-center gap-3 mb-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-foreground truncate">{ticket.subject}</h2>
            <p className="text-xs text-muted-foreground">
              Criado em {format(new Date(ticket.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
          <Badge variant="outline" className={statusColors[ticket.status]}>
            {statusLabels[ticket.status]}
          </Badge>
        </div>

        {/* Admin Status Controls */}
        {isAdmin && ticket.status !== "closed" && (
          <div className="flex flex-wrap gap-2">
            {["open", "in_progress", "waiting_client", "closed"].map((status) => (
              <Button
                key={status}
                variant={ticket.status === status ? "default" : "outline"}
                size="sm"
                onClick={() => handleStatusUpdate(status)}
                disabled={ticket.status === status}
              >
                {statusLabels[status]}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <p>Nenhuma mensagem ainda.</p>
            <p className="text-sm">Envie a primeira mensagem!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isCurrentUser = msg.sender_id === currentUser.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    isCurrentUser
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "glass-card rounded-bl-md"
                  }`}
                >
                  <p className={`text-xs mb-1 ${isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {msg.sender_email}
                  </p>
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <p className={`text-xs mt-1 ${isCurrentUser ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {ticket.status !== "closed" && (
        <div className="p-4 border-t border-border/50 glass-card">
          <div className="flex gap-2">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Digite sua mensagem..."
              className="min-h-[60px] max-h-[120px] resize-none bg-background/50"
            />
            <Button
              variant="hero"
              size="icon"
              onClick={handleSend}
              disabled={sending || !newMessage.trim()}
              className="h-[60px] w-[60px]"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}

      {ticket.status === "closed" && (
        <div className="p-4 border-t border-border/50 bg-muted/50 text-center text-muted-foreground">
          Este chamado está fechado.
        </div>
      )}
    </div>
  );
};

export default TicketChat;
