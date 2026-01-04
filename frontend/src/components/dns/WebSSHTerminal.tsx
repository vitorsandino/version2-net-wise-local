import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from 'xterm-addon-fit';
import '@xterm/xterm/css/xterm.css';
import { io, Socket } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { XCircle, RefreshCw, Terminal as TerminalIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface WebSSHTerminalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverName: string;
  host: string;
  port: number;
  username: string;
  passwordEncrypted: string;
}

const WebSSHTerminal: React.FC<WebSSHTerminalProps> = ({
  open,
  onOpenChange,
  serverName,
  host,
  port,
  username,
  passwordEncrypted
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!open || !terminalRef.current) return;

    // Inicializar XTerm
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1a1b26',
        foreground: '#a9b1d6',
      }
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    
    // Pequeno delay para garantir que o container está renderizado
    setTimeout(() => fitAddon.fit(), 100);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Conectar Socket.io
    const API_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';
    const socket = io(API_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      term.writeln('\x1b[33m[Sistema] Conectando ao servidor SSH...\x1b[0m');
      socket.emit('ssh-connect', {
        host,
        port,
        username,
        passwordEncrypted
      });
    });

    socket.on('ssh-status', (data) => {
      if (data.status === 'connected') {
        setStatus('connected');
        term.writeln('\x1b[32m[Sistema] Conexão SSH estabelecida!\x1b[0m\r\n');
      } else if (data.status === 'error') {
        setStatus('error');
        setErrorMessage(data.message);
        term.writeln(`\r\n\x1b[31m[Erro] ${data.message}\x1b[0m`);
      }
    });

    socket.on('ssh-data', (data: string) => {
      term.write(data);
    });

    socket.on('disconnect', () => {
      setStatus('disconnected');
      term.writeln('\r\n\x1b[31m[Sistema] Conexão encerrada.\x1b[0m');
    });

    term.onData((data) => {
      if (socket.connected) {
        socket.emit('ssh-input', data);
      }
    });

    const handleResize = () => {
      fitAddon.fit();
      socket.emit('ssh-resize', {
        cols: term.cols,
        rows: term.rows
      });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      socket.disconnect();
      term.dispose();
    };
  }, [open, host, port, username, passwordEncrypted]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] p-0 overflow-hidden bg-[#1a1b26] border-slate-800">
        <DialogHeader className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="flex items-center gap-2 text-slate-200 text-sm font-medium">
            <TerminalIcon className="w-4 h-4 text-primary" />
            SSH: {serverName} ({username}@{host})
          </DialogTitle>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              status === 'connected' ? 'bg-green-500 animate-pulse' : 
              status === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
            }`} />
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-800"
              onClick={() => fitAddonRef.current?.fit()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div ref={terminalRef} className="flex-1 p-2 overflow-hidden h-full" />
      </DialogContent>
    </Dialog>
  );
};

export default WebSSHTerminal;
