# Version2 NetWise - Self-Hosted

![NetWise Banner](https://user-images.githubusercontent.com/12345/placeholder.png) <!-- Adicionar um banner legal aqui -->

**Sistema completo de gerenciamento de infraestrutura DNS e Zabbix - 100% self-hosted.**

Esta é uma versão totalmente refatorada do projeto [version2-net-wise](https://github.com/vitorsandino/version2-net-wise), projetada para rodar em seu próprio servidor Debian 12, sem dependências de serviços externos como Supabase ou Vercel. Controle total sobre seus dados e sua infraestrutura.

---

## ✨ Funcionalidades

- **Arquitetura 100% Local**: Rode tudo no seu próprio servidor com Docker.
- **Backend Robusto**: Node.js + Express para uma API rápida e confiável.
- **Banco de Dados PostgreSQL**: Armazene todos os seus dados localmente.
- **Autenticação Segura**: Sistema de autenticação local com JWT e roles (admin/user).
- **Automação de DNS**: Instalação e configuração automatizada de servidores BIND9, incluindo ACLs, logging e suporte a Anycast com FRR/OSPF.
- **Automação Zabbix**: Instalação automatizada de servidores Zabbix 6.4 com MariaDB e Nginx.
- **Monitoramento Contínuo**: Agentes de monitoramento que verificam o status dos servidores e executam comandos remotamente.
- **Dashboard Intuitivo**: Interface em React com `shadcn/ui` e `TailwindCSS` para uma experiência de usuário moderna.
- **Terminal SSH via Web**: Acesso direto aos seus servidores pelo navegador.
- **Sistema de Tickets**: Gerenciamento de suporte integrado.
- **Wiki Interna**: Base de conhecimento para sua equipe.
- **Editor de Diagramas de Rede**: Crie e salve topologias de rede com Excalidraw.
- **Instalação Simplificada**: Script de instalação `one-click` para Debian 12.

## 🛠️ Stack Tecnológico

| Camada | Tecnologia | Descrição |
|---|---|---|
| **Frontend** | React, TypeScript, Vite, TailwindCSS, shadcn/ui | Interface de usuário moderna e reativa. |
| **Backend** | Node.js, Express.js, PostgreSQL | API RESTful para gerenciar toda a lógica de negócio. |
| **Banco de Dados** | PostgreSQL 15 | Armazenamento de dados relacional e robusto. |
| **Automação** | Node.js + SSH | Scripts para provisionamento remoto de servidores. |
| **Containerização** | Docker, Docker Compose | Ambiente de produção isolado e replicável. |
| **Servidor Web** | Nginx | Servidor de alta performance para o frontend React. |

## 🚀 Instalação (One-Click)

Este método é o recomendado para uma instalação rápida e automatizada em um servidor **Debian 12 limpo**.

### Pré-requisitos

- Um servidor com **Debian 12** (Bookworm).
- Acesso **root** ou um usuário com privilégios `sudo`.
- Portas `80`, `443` e `3000` livres.

### Comando de Instalação

Execute o comando abaixo como **root** no seu servidor:

```bash
curl -sL https://raw.githubusercontent.com/vitorsandino/version2-net-wise-local/main/install.sh | bash
```

O script fará o seguinte:
1.  Atualizará o sistema.
2.  Instalará Docker, Docker Compose e Git.
3.  Clonará este repositório para `/opt/version2-netwise`.
4.  Gerará um arquivo `.env` com senhas e chaves de segurança aleatórias.
5.  Configurará o firewall (`nftables`) para permitir o tráfego necessário.
6.  Fará o build e iniciará os containers Docker.

Ao final, a URL de acesso e as credenciais geradas serão exibidas no terminal. **Guarde as credenciais em local seguro!**

## ⚙️ Configuração

O arquivo `.env` na raiz do projeto controla todas as configurações. Ele é gerado automaticamente pelo script de instalação, mas você pode editá-lo conforme necessário.

```dotenv
# ===== Configuração do Banco de Dados =====
DB_NAME=version2_netwise
DB_USER=version2
DB_PASSWORD=SENHA_GERADA_AUTOMATICAMENTE

# ===== Configuração de Segurança =====
# Chaves geradas automaticamente
JWT_SECRET=CHAVE_GERADA_AUTOMATICAMENTE
ENCRYPTION_KEY=CHAVE_GERADA_AUTOMATICAMENTE

# ===== URLs da Aplicação =====
# URLs geradas com base no IP do servidor
API_URL=http://SEU_SERVIDOR_IP:3000
FRONTEND_URL=http://SEU_SERVIDOR_IP
VITE_API_URL=http://SEU_SERVIDOR_IP:3000/api
```

**IMPORTANTE**: Se você alterar o IP do servidor, lembre-se de atualizar as variáveis `API_URL`, `FRONTEND_URL` e `VITE_API_URL` e reiniciar a aplicação com `docker compose up -d --build`.

## 👤 Primeiro Acesso

1.  Acesse a URL informada no final da instalação (ex: `http://SEU_IP`).
2.  Na tela de login, clique em **"Não tem uma conta? Registre-se"**.
3.  O **primeiro usuário a se registrar** será automaticamente promovido a **administrador** do sistema.
4.  Todos os usuários subsequentes serão criados com a role `user` por padrão.

## 🚢 Gerenciamento da Aplicação

A aplicação roda em containers Docker gerenciados pelo Docker Compose. Navegue até o diretório de instalação (`cd /opt/version2-netwise`) para executar os comandos.

- **Ver o status dos serviços:**
  ```bash
  docker compose ps
  ```

- **Ver os logs em tempo real:**
  ```bash
  docker compose logs -f
  ```

- **Parar a aplicação:**
  ```bash
  docker compose down
  ```

- **Iniciar a aplicação:**
  ```bash
  docker compose up -d
  ```

- **Reiniciar a aplicação:**
  ```bash
  docker compose restart
  ```

- **Forçar o rebuild das imagens:**
  ```bash
  docker compose up -d --build
  ```

## 📂 Estrutura do Projeto

```
/version2-net-wise-local
├── backend/                # Código-fonte da API em Node.js/Express
│   ├── src/
│   ├── database/
│   └── package.json
├── frontend/               # Código-fonte do painel em React/Vite
│   ├── src/
│   └── package.json
├── docker/                 # Dockerfiles e configurações de containers
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── nginx.conf
├── docker-compose.yml      # Orquestração dos serviços (Postgres, Backend, Frontend)
├── install.sh              # Script de instalação automatizada
└── README.md               # Esta documentação
```

## 🔧 Desenvolvimento e Customização

Se desejar modificar o projeto, siga os passos abaixo:

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/vitorsandino/version2-net-wise-local.git
    cd version2-net-wise-local
    ```

2.  **Configure o `.env`:**
    Copie o `.env.example` para `.env` e preencha as variáveis.

3.  **Backend:**
    - Navegue até a pasta `backend`.
    - Rode `npm install` para instalar as dependências.
    - Rode `npm run dev` para iniciar o servidor em modo de desenvolvimento.

4.  **Frontend:**
    - Navegue até a pasta `frontend`.
    - Rode `npm install` para instalar as dependências.
    - Crie um arquivo `.env` e defina `VITE_API_URL=http://localhost:3000/api`.
    - Rode `npm run dev` para iniciar o servidor de desenvolvimento do Vite.

## 📄 Licença

Este projeto é distribuído sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.
