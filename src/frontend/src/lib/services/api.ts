export interface RedmineConfig {
  redmineUrl: string;
  apiKey: string;
  projectUrl: string;
}

export interface Project {
  id: number;
  name: string;
  identifier: string;
}

export interface Status {
  id: number;
  name: string;
  isClosed: boolean;
}

export interface User {
  id: number;
  name: string;
}

export interface Issue {
  id: number;
  subject: string;
  description: string;
  statusId: number;
  statusName: string;
  assignedToId: number | null;
  assignedToName: string;
  createdOn: string;
  updatedOn: string;
  sprintId: number | null;
  sprintName: string;
  storyPoints: number | null;
}

export interface Sprint {
  id: number;
  name: string;
  goal: string;
  status: 'future' | 'active' | 'closed';
  startDate: string | null;
  endDate: string | null;
  totalStoryPoints: number;
}

export interface JournalDetail {
  property: string;
  name: string;
  oldValue: string | null;
  newValue: string | null;
}

export interface Journal {
  id: number;
  user: string;
  notes: string;
  createdOn: string;
  details: JournalDetail[];
}

export interface IssueDetails {
  issue: Issue;
  journals: Journal[];
}

let BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL;

if (!BACKEND_BASE_URL) {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.endsWith('.github.io')) {
      BACKEND_BASE_URL = 'http://localhost:5000/api/kanban';
    } else {
      BACKEND_BASE_URL = '/api/kanban';
    }
  } else {
    BACKEND_BASE_URL = 'http://localhost:5000/api/kanban';
  }
}

export function getStoredConfig(): RedmineConfig {
  if (typeof window === 'undefined') {
    return { redmineUrl: '', apiKey: '', projectUrl: '' };
  }
  return {
    redmineUrl: localStorage.getItem('redmine_url') || '',
    apiKey: localStorage.getItem('redmine_api_key') || '',
    projectUrl: localStorage.getItem('redmine_project_url') || '',
  };
}

export function saveConfig(config: RedmineConfig) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('redmine_url', config.redmineUrl);
  localStorage.setItem('redmine_api_key', config.apiKey);
  localStorage.setItem('redmine_project_url', config.projectUrl);
}

export function extractProjectIdentifier(projectUrl: string): string {
  if (!projectUrl) return '';
  // Match "/projects/identifier" from the URL
  const match = projectUrl.match(/\/projects\/([^/?#]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // Fallback to the raw string if no URL structure is detected
  return projectUrl.trim();
}

function getHeaders(): HeadersInit {
  const config = getStoredConfig();
  const identifier = extractProjectIdentifier(config.projectUrl);
  return {
    'Content-Type': 'application/json',
    'X-Redmine-URL': config.redmineUrl,
    'X-Redmine-API-Key': config.apiKey,
    'X-Redmine-Project-Identifier': identifier,
  };
}

function mapStatusName(name: string): string {
  if (!name) return '';
  if (name === 'Nova' || name === 'New') {
    return 'Nova/Backlog';
  }
  return name;
}

export async function validateConfig(): Promise<Project> {
  const headers = getHeaders();
  const response = await fetch(`${BACKEND_BASE_URL}/project`, { headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Erro ao conectar ao Redmine.');
  }
  return response.json();
}

export async function fetchProjects(redmineUrl: string, apiKey: string): Promise<Project[]> {
  const response = await fetch(`${BACKEND_BASE_URL}/projects`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Redmine-URL': redmineUrl,
      'X-Redmine-API-Key': apiKey,
    }
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Erro ao carregar projetos do Redmine.');
  }
  return response.json();
}

export async function fetchKanbanData(): Promise<{ statuses: Status[]; issues: Issue[]; sprints: Sprint[] }> {
  const headers = getHeaders();
  const response = await fetch(`${BACKEND_BASE_URL}/issues`, { headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Erro ao carregar dados do Kanban.');
  }
  const data = await response.json();
  if (data.statuses) {
    data.statuses = data.statuses.map((s: Status) => ({
      ...s,
      name: mapStatusName(s.name)
    }));
  }
  if (data.issues) {
    data.issues = data.issues.map((i: Issue) => ({
      ...i,
      statusName: mapStatusName(i.statusName)
    }));
  }
  if (data.sprints) {
    data.sprints = data.sprints.map((s: Sprint) => ({
      ...s
    }));
  }
  return data;
}

export async function fetchCurrentUser(): Promise<User> {
  const headers = getHeaders();
  const response = await fetch(`${BACKEND_BASE_URL}/current-user`, { headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Erro ao obter usuário atual.');
  }
  return response.json();
}

export async function fetchUsers(): Promise<User[]> {
  const headers = getHeaders();
  const response = await fetch(`${BACKEND_BASE_URL}/users`, { headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Erro ao carregar membros do projeto.');
  }
  return response.json();
}

export async function createIssue(subject: string, description: string, statusId: number, assignedToId: number | null, attachments?: any[]): Promise<Issue> {
  const headers = getHeaders();
  const response = await fetch(`${BACKEND_BASE_URL}/issues`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ subject, description, statusId, assignedToId, attachments }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Erro ao criar tarefa.');
  }
  const issue = await response.json();
  if (issue) {
    issue.statusName = mapStatusName(issue.statusName);
  }
  return issue;
}

export async function updateIssueStatus(issueId: number, statusId: number): Promise<void> {
  const headers = getHeaders();
  const response = await fetch(`${BACKEND_BASE_URL}/issues/${issueId}/status`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ statusId }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Erro ao atualizar status da tarefa.');
  }
}

export async function fetchIssueDetails(issueId: number): Promise<IssueDetails> {
  const headers = getHeaders();
  const response = await fetch(`${BACKEND_BASE_URL}/issues/${issueId}/details`, { headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Erro ao carregar detalhes da tarefa.');
  }
  const details = await response.json() as IssueDetails;
  if (details.issue) {
    details.issue.statusName = mapStatusName(details.issue.statusName);
  }
  if (details.journals) {
    details.journals.forEach(j => {
      if (j.details) {
        j.details.forEach(d => {
          if (d.name === 'status_id') {
            if (d.oldValue) d.oldValue = mapStatusName(d.oldValue);
            if (d.newValue) d.newValue = mapStatusName(d.newValue);
          }
        });
      }
    });
  }
  return details;
}

export async function addComment(issueId: number, notes: string, attachments?: any[]): Promise<void> {
  const headers = getHeaders();
  const response = await fetch(`${BACKEND_BASE_URL}/issues/${issueId}/journals`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ notes, attachments }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Erro ao adicionar comentário.');
  }
}

export async function fetchStatuses(): Promise<Status[]> {
  const headers = getHeaders();
  const response = await fetch(`${BACKEND_BASE_URL}/statuses`, { headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Erro ao carregar os status do Redmine.');
  }
  const statuses = await response.json() as Status[];
  return statuses.map(s => ({
    ...s,
    name: mapStatusName(s.name)
  }));
}

export async function createSprint(name: string, goal: string, startDate: string | null, endDate: string | null): Promise<Sprint> {
  const headers = getHeaders();
  const response = await fetch(`${BACKEND_BASE_URL}/sprints`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name, goal, startDate, endDate }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Erro ao criar Sprint.');
  }
  return response.json();
}

export async function updateSprint(id: number, name: string, goal: string, startDate: string | null, endDate: string | null, status: 'future' | 'active' | 'closed'): Promise<void> {
  const headers = getHeaders();
  const response = await fetch(`${BACKEND_BASE_URL}/sprints/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ name, goal, startDate, endDate, status }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Erro ao atualizar Sprint.');
  }
}

export async function moveIssueToSprint(issueId: number, sprintId: number | null): Promise<void> {
  const headers = getHeaders();
  const response = await fetch(`${BACKEND_BASE_URL}/issues/${issueId}/sprint`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ sprintId }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Erro ao mover tarefa para a Sprint.');
  }
}

export async function completeSprint(id: number, moveIncompleteToSprintId: number | null): Promise<void> {
  const headers = getHeaders();
  const response = await fetch(`${BACKEND_BASE_URL}/sprints/${id}/complete`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ moveIncompleteToSprintId }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Erro ao concluir Sprint.');
  }
}

export async function fetchRedmineUrl(): Promise<string> {
  const response = await fetch(`${BACKEND_BASE_URL}/redmine-url`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Erro ao obter a URL do Redmine do servidor.');
  }
  const data = await response.json();
  return data.redmineUrl || '';
}

export async function detectRedmineSession(redmineUrl: string): Promise<string | null> {
  try {
    console.log('[detectRedmineSession] Chamando /detect-session no backend...');
    const response = await fetch(`${BACKEND_BASE_URL}/detect-session`, { credentials: 'include' });
    if (response.ok) {
      const data = await response.json();
      console.log('[detectRedmineSession] Resposta recebida:', data);
      if (data && data.loggedIn && data.apiKey) {
        console.log('[detectRedmineSession] Autenticação bem-sucedida! Chave obtida.');
        return data.apiKey;
      } else {
        console.warn('[detectRedmineSession] Sessão não detectada:', data.message);
      }
    } else {
      console.error('[detectRedmineSession] Erro HTTP ao conectar com o backend:', response.status);
    }
  } catch (err) {
    console.error('[detectRedmineSession] Erro na requisição de detecção:', err);
  }
  return null;
}

export async function loginWithCredentials(username: string, password: string, redmineUrl: string): Promise<string> {
  const response = await fetch(`${BACKEND_BASE_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password, redmineUrl })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Falha ao autenticar.');
  }
  const data = await response.json();
  if (!data.apiKey) {
    throw new Error('API Key não retornada pelo servidor.');
  }
  return data.apiKey;
}

export async function uploadFile(file: File): Promise<{ token: string; filename: string; contentType: string }> {
  const config = getStoredConfig();
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${BACKEND_BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      'X-Redmine-URL': config.redmineUrl,
      'X-Redmine-API-Key': config.apiKey,
    },
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Erro ao enviar o arquivo.');
  }

  return response.json();
}

export interface ProjectFile {
  id: number;
  filename: string;
  filesize: number;
  created_on: string;
  description: string;
  downloads: number;
  digest: string;
  content_url: string;
  author: {
    id: number;
    name: string;
  };
}

export async function fetchProjectFiles(): Promise<ProjectFile[]> {
  const headers = getHeaders();
  const response = await fetch(`${BACKEND_BASE_URL}/files`, { headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Erro ao obter arquivos do projeto.');
  }
  const data = await response.json();
  return data.files || [];
}

export async function addProjectFile(token: string, filename: string, description: string): Promise<void> {
  const headers = getHeaders();
  const response = await fetch(`${BACKEND_BASE_URL}/files`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ token, filename, description }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Erro ao associar arquivo ao projeto.');
  }
}

export async function deleteProjectFile(id: number): Promise<void> {
  const headers = getHeaders();
  const response = await fetch(`${BACKEND_BASE_URL}/files/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Erro ao excluir o arquivo do projeto.');
  }
}

