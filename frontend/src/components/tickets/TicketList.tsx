import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

interface TicketListProps {
  tickets: Ticket[];
  selectedTicketId: string | null;
  onSelectTicket: (ticketId: string) => void;
  onNewTicket: () => void;
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

const priorityLabels: Record<string, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

const TicketList = ({ tickets, selectedTicketId, onSelectTicket, onNewTicket }: TicketListProps) => {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <Button variant="hero" className="w-full" onClick={onNewTicket}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Chamado
        </Button>
      </div>

      {/* Ticket List */}
      <div className="flex-1 overflow-y-auto">
        {tickets.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum chamado encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => onSelectTicket(ticket.id)}
                className={`w-full p-4 text-left hover:bg-primary/5 transition-colors ${
                  selectedTicketId === ticket.id ? "bg-primary/10 border-l-2 border-primary" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-medium text-foreground truncate flex-1">
                    {ticket.subject}
                  </h3>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={statusColors[ticket.status]}>
                    {statusLabels[ticket.status]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(ticket.updated_at), { 
                      addSuffix: true, 
                      locale: ptBR 
                    })}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketList;
