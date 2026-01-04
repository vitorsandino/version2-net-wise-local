# Guia de Migração: Supabase → Self-Hosted

Este documento explica as principais mudanças entre a versão original (com Supabase) e esta versão self-hosted.

## Principais Mudanças

### 1. Autenticação

**Antes (Supabase):**
```typescript
import { supabase } from '@/integrations/supabase/client';

const { data, error } = await supabase.auth.signUp({
  email, password
});
```

**Agora (API Local):**
```typescript
import { auth } from '@/lib/api';

const data = await auth.register(email, password, fullName);
// Token JWT é armazenado automaticamente
```

### 2. Consultas ao Banco de Dados

**Antes (Supabase):**
```typescript
const { data, error } = await supabase
  .from('dns_servers')
  .select('*')
  .eq('user_id', userId);
```

**Agora (API Local):**
```typescript
import { dns } from '@/lib/api';

const servers = await dns.listServers();
// Filtragem por usuário é feita automaticamente no backend
```

### 3. Edge Functions → Rotas Express

**Antes:** Edge Functions no Supabase (Deno)  
**Agora:** Rotas Express no backend Node.js

Todas as Edge Functions foram migradas para rotas da API:

| Edge Function (Antes) | Rota API (Agora) |
|---|---|
| `install-dns-server` | `POST /api/dns/servers/:id/install` |
| `install-zabbix-server` | `POST /api/zabbix/servers/:id/install` |
| `agent-command` | `POST /api/agent/check` |
| `agent-install` | Integrado no script de instalação |
| `monitor-dns-server` | `GET /api/dns/servers/:id/monitoring` |
| `ssh-proxy` | `POST /api/dns/servers/:id/command` |

### 4. Variáveis de Ambiente

**Antes:**
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

**Agora:**
```env
VITE_API_URL=http://seu-servidor:3000/api
```

### 5. Estrutura do Projeto

**Antes:**
```
version2-net-wise/
├── src/
├── supabase/
│   └── functions/
└── package.json
```

**Agora:**
```
version2-net-wise-local/
├── backend/
│   ├── src/
│   └── database/
├── frontend/
│   └── src/
└── docker-compose.yml
```

## Funcionalidades Mantidas

✅ Todas as automações DNS (BIND9, nftables, FRR)  
✅ Todas as automações Zabbix  
✅ Sistema de monitoramento com agentes  
✅ Terminal SSH via web  
✅ Sistema de tickets  
✅ Wiki interna  
✅ Editor de diagramas de rede  
✅ Gerenciamento de usuários e roles  
✅ Gerenciamento de clientes  

## Funcionalidades Novas

🆕 **Instalação One-Click**: Script automatizado para Debian 12  
🆕 **Docker Compose**: Deploy simplificado com containers  
🆕 **Controle Total**: Sem dependências de serviços externos  
🆕 **Backup Simples**: Apenas fazer backup do volume PostgreSQL  

## Migrando Dados Existentes

Se você já tem dados no Supabase e deseja migrá-los:

1. **Exportar dados do Supabase:**
   ```bash
   # No dashboard do Supabase, vá em Database > Backups
   # Ou use pg_dump:
   pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup.sql
   ```

2. **Importar para o PostgreSQL local:**
   ```bash
   # Copie o backup para o container
   docker cp backup.sql v2netwise-postgres:/tmp/
   
   # Execute o import
   docker exec -it v2netwise-postgres psql -U version2 -d version2_netwise -f /tmp/backup.sql
   ```

3. **Ajustar referências:**
   - Senhas SSH e credenciais precisarão ser re-criptografadas com a nova `ENCRYPTION_KEY`.
   - Tokens de agentes precisarão ser regenerados.

## Solução de Problemas

### Erro: "Token não fornecido"
- Verifique se a variável `VITE_API_URL` está correta no frontend.
- Limpe o localStorage do navegador e faça login novamente.

### Erro: "Conexão recusada ao backend"
- Verifique se o backend está rodando: `docker compose ps`
- Verifique os logs: `docker compose logs backend`
- Confirme que a porta 3000 está acessível no firewall.

### Erro: "Banco de dados não conectado"
- Verifique se o PostgreSQL está rodando: `docker compose ps postgres`
- Verifique os logs: `docker compose logs postgres`
- Confirme as credenciais no arquivo `.env`.

## Suporte

Para dúvidas ou problemas, abra uma issue no GitHub:  
https://github.com/vitorsandino/version2-net-wise-local/issues
