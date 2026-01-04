// Cliente API local para substituir Supabase
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Armazenamento do token
let authToken: string | null = localStorage.getItem('auth_token');

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

export function getAuthToken() {
  return authToken;
}

// Função auxiliar para fazer requisições
async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token inválido ou expirado
    setAuthToken(null);
    window.location.href = '/auth';
    throw new Error('Não autenticado');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(error.error || `Erro ${response.status}`);
  }

  return response.json();
}

// ===== Autenticação =====
export const auth = {
  async register(email: string, password: string, fullName?: string) {
    const data = await fetchAPI('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName }),
    });
    setAuthToken(data.token);
    return data;
  },

  async login(email: string, password: string) {
    const data = await fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(data.token);
    return data;
  },

  async logout() {
    setAuthToken(null);
  },

  async getProfile() {
    return fetchAPI('/auth/profile');
  },

  async updateProfile(updates: { fullName?: string; currentPassword?: string; newPassword?: string }) {
    return fetchAPI('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  isAuthenticated() {
    return !!authToken;
  },
};

// ===== DNS Servers =====
export const dns = {
  async listServers() {
    return fetchAPI('/dns/servers');
  },

  async getServer(serverId: string) {
    return fetchAPI(`/dns/servers/${serverId}`);
  },

  async createServer(data: any) {
    return fetchAPI('/dns/servers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateServer(serverId: string, data: any) {
    return fetchAPI(`/dns/servers/${serverId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteServer(serverId: string) {
    return fetchAPI(`/dns/servers/${serverId}`, {
      method: 'DELETE',
    });
  },

  async installServer(serverId: string) {
    return fetchAPI(`/dns/servers/${serverId}/install`, {
      method: 'POST',
    });
  },

  async executeCommand(serverId: string, command: string) {
    return fetchAPI(`/dns/servers/${serverId}/command`, {
      method: 'POST',
      body: JSON.stringify({ command }),
    });
  },

  async getStats(serverId: string) {
    return fetchAPI(`/dns/servers/${serverId}/stats`);
  },

  async getMonitoringHistory(serverId: string, hours: number = 24) {
    return fetchAPI(`/dns/servers/${serverId}/monitoring?hours=${hours}`);
  },
};

// ===== Zabbix Servers =====
export const zabbix = {
  async listServers() {
    return fetchAPI('/zabbix/servers');
  },

  async getServer(serverId: string) {
    return fetchAPI(`/zabbix/servers/${serverId}`);
  },

  async createServer(data: any) {
    return fetchAPI('/zabbix/servers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteServer(serverId: string) {
    return fetchAPI(`/zabbix/servers/${serverId}`, {
      method: 'DELETE',
    });
  },

  async installServer(serverId: string) {
    return fetchAPI(`/zabbix/servers/${serverId}/install`, {
      method: 'POST',
    });
  },

  async listProxies(serverId: string) {
    return fetchAPI(`/zabbix/servers/${serverId}/proxies`);
  },

  async getMonitoringHistory(serverId: string, hours: number = 24) {
    return fetchAPI(`/zabbix/servers/${serverId}/monitoring?hours=${hours}`);
  },
};

// ===== Clientes =====
export const clients = {
  async list() {
    return fetchAPI('/clients');
  },

  async create(data: { name: string; email?: string; phone?: string; userId?: string }) {
    return fetchAPI('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ===== Usuários (Admin) =====
export const users = {
  async list() {
    return fetchAPI('/users');
  },

  async updateRole(userId: string, role: 'admin' | 'user') {
    return fetchAPI(`/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  },
};

// ===== Tickets =====
export const tickets = {
  async list() {
    return fetchAPI('/tickets');
  },

  async create(data: { subject: string; priority?: string }) {
    return fetchAPI('/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getMessages(ticketId: string) {
    return fetchAPI(`/tickets/${ticketId}/messages`);
  },

  async sendMessage(ticketId: string, content: string) {
    return fetchAPI(`/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },
};

// ===== Health Check =====
export async function healthCheck() {
  return fetchAPI('/health');
}
