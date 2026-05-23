<script lang="ts">
  import { onMount } from 'svelte';
  import {
    fetchKanbanData,
    fetchUsers,
    fetchCurrentUser,
    createIssue,
    updateIssueStatus,
    moveIssueToSprint,
    type Issue,
    type Status,
    type User as RedmineUser,
    type Sprint
  } from '../services/api';
  import { i18n } from '../services/i18n.svelte';
  import KanbanCard from './KanbanCard.svelte';
  import IssueModal from './IssueModal.svelte';
  import BacklogView from './BacklogView.svelte';
  import SprintModal from './SprintModal.svelte';
  import SprintDashboard from './SprintDashboard.svelte';
  import {
    Plus,
    Loader2,
    RefreshCw,
    AlertCircle,
    Sparkles,
    X,
    Settings,
    Compass,
    Layers,
    Kanban as BoardIcon,
    Edit,
    CheckSquare,
    Calendar,
    TrendingDown
  } from '@lucide/svelte';

  // Svelte 5 props
  let { redmineUrl, projectName = 'Scrum Kanban', onOpenSettings } = $props<{
    redmineUrl: string;
    projectName?: string;
    onOpenSettings: () => void;
  }>();

  let statuses = $state<Status[]>([]);
  let issues = $state<Issue[]>([]);
  let sprints = $state<Sprint[]>([]);
  let users = $state<RedmineUser[]>([]);
  let currentUserId = $state<number | null>(null);
  let customColor = $state('#c7ecff');
  let lastUpdated = $state<Date | null>(null);
  let showDashboard = $state(false);

  // Tab toggle state
  let activeTab = $state<'board' | 'backlog'>('board');

  // Sprint modal states
  let showSprintModal = $state(false);
  let sprintModalMode = $state<'create' | 'edit' | 'start' | 'complete'>('create');
  let sprintModalTarget = $state<Sprint | null>(null);

  let formattedLastUpdated = $derived(
    lastUpdated
      ? i18n.formatDateTime(lastUpdated)
      : ''
  );

  let activeSprint = $derived(sprints.find(s => s.status === 'active'));

  let activeSprintProgress = $derived.by(() => {
    if (!activeSprint) return { completed: 0, total: 0, percent: 0 };
    const sprintIssues = issues.filter(i => i.sprintId === activeSprint.id);
    if (sprintIssues.length === 0) return { completed: 0, total: 0, percent: 0 };
    
    const closedStatusId = statuses.length > 0 ? statuses[statuses.length - 1].id : null;
    const completedIssues = sprintIssues.filter(i => i.statusId === closedStatusId);
    
    const percent = Math.round((completedIssues.length / sprintIssues.length) * 100);
    return {
      completed: completedIssues.length,
      total: sprintIssues.length,
      percent
    };
  });

  let loading = $state(true);
  let loadingUsers = $state(false);
  let errorMsg = $state('');
  let activeIssueId = $state<number | null>(null);

  // Criar nova tarefa
  let showCreateModal = $state(false);
  let createSubject = $state('');
  let createDescription = $state('');
  let createStatusId = $state<number>(0);
  let createAssignedToId = $state<number | null>(null);
  let creatingIssue = $state(false);

  // Estado para drag and drop
  let dragOverColumnId = $state<number | null>(null);

  let intervalId: any;

  onMount(() => {
    loadData();

    // Atualiza os dados a cada 1 minuto (60.000 ms)
    intervalId = setInterval(() => {
      loadData();
    }, 60000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  });

  async function loadData() {
    loading = true;
    errorMsg = '';
    try {
      // Carrega usuário atual para destaque de cards
      try {
        const curUser = await fetchCurrentUser();
        currentUserId = curUser.id;
      } catch (userErr) {
        console.warn('Não foi possível obter o usuário atual para destacar tarefas:', userErr);
      }

      // Carrega a cor customizada do localStorage
      const savedColor = localStorage.getItem('kanban_my_card_color');
      customColor = savedColor || '#c7ecff';

      const data = await fetchKanbanData();
      
      const storedOrder = localStorage.getItem('kanban_status_order');
      if (storedOrder) {
        const orderIds = JSON.parse(storedOrder) as number[];
        const orderSet = new Set(orderIds);
        
        // Filtra os status para incluir apenas os visíveis/configurados
        const filtered = data.statuses.filter(s => orderSet.has(s.id));
        
        // Ordena de acordo com o array de preferência
        filtered.sort((a, b) => orderIds.indexOf(a.id) - orderIds.indexOf(b.id));
        
        statuses = filtered;
      } else {
        statuses = data.statuses;
      }

      issues = data.issues;
      sprints = data.sprints || [];

      // Se houver status, pré-seleciona o primeiro na criação de tarefas
      if (statuses.length > 0) {
        createStatusId = statuses[0].id;
      }

      // Tenta carregar os usuários em paralelo (sem falhar se falhar, opcional)
      loadProjectUsers();
      
      // Armazena a data/hora da última atualização bem-sucedida
      lastUpdated = new Date();
    } catch (err: any) {
      errorMsg = err.message || 'Falha ao conectar e carregar dados do Redmine.';
    } finally {
      loading = false;
    }
  }

  async function loadProjectUsers() {
    loadingUsers = true;
    try {
      users = await fetchUsers();
    } catch (err) {
      console.warn('Erro ao carregar membros do projeto:', err);
    } finally {
      loadingUsers = false;
    }
  }

  // Agrupa as tarefas pelo ID do status, filtrando pela Sprint Ativa no quadro
  function getColumnIssues(statusId: number) {
    const statusIssues = issues.filter(i => i.statusId === statusId);
    if (activeSprint) {
      return statusIssues.filter(i => i.sprintId === activeSprint.id);
    }
    return [];
  }

  // Criação de nova tarefa
  async function handleCreateIssue() {
    if (!createSubject.trim()) return;
    creatingIssue = true;
    errorMsg = '';
    try {
      const newIssue = await createIssue(
        createSubject.trim(),
        createDescription.trim(),
        createStatusId,
        createAssignedToId
      );

      // Se houver uma sprint ativa, movemos a nova tarefa para ela automaticamente!
      if (activeSprint) {
        try {
          await moveIssueToSprint(newIssue.id, activeSprint.id);
          newIssue.sprintId = activeSprint.id;
          newIssue.sprintName = activeSprint.name;
        } catch (sprintErr) {
          console.warn('Erro ao associar nova tarefa à sprint ativa:', sprintErr);
        }
      }

      issues = [...issues, newIssue];
      showCreateModal = false;
      createSubject = '';
      createDescription = '';
      createAssignedToId = null;

      // Recarrega dados para atualizar totais de pontos de história e metadados
      loadData();
    } catch (err: any) {
      errorMsg = err.message || 'Error creating task on Redmine.';
    } finally {
      creatingIssue = false;
    }
  }

  // Helpers de controle de modais de sprint no quadro
  function openEditSprint(sprint: Sprint) {
    sprintModalMode = 'edit';
    sprintModalTarget = sprint;
    showSprintModal = true;
  }

  function openCompleteSprint(sprint: Sprint) {
    sprintModalMode = 'complete';
    sprintModalTarget = sprint;
    showSprintModal = true;
  }

  function formatDateRange(startDateStr: string | null, endDateStr: string | null) {
    if (!startDateStr && !endDateStr) return i18n.currentLanguage === 'pt-br' ? 'Sem datas' : i18n.currentLanguage === 'es' ? 'Sin fechas' : 'No dates';
    const opt: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    const locale = i18n.currentLanguage === 'pt-br' ? 'pt-BR' : i18n.currentLanguage === 'es' ? 'es-ES' : 'en-US';
    
    let start = '';
    if (startDateStr) {
      const d = new Date(startDateStr);
      d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
      start = d.toLocaleDateString(locale, opt);
    }

    let end = '';
    if (endDateStr) {
      const d = new Date(endDateStr);
      d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
      end = d.toLocaleDateString(locale, opt);
    }

    if (start && end) return `${start} - ${end}`;
    return start || end;
  }

  // Drag and Drop handlers
  async function handleDrop(event: DragEvent, targetStatusId: number) {
    event.preventDefault();
    dragOverColumnId = null;

    if (!event.dataTransfer) return;
    const issueIdStr = event.dataTransfer.getData('text/plain');
    if (!issueIdStr) return;

    const issueId = parseInt(issueIdStr, 10);
    const issueIndex = issues.findIndex(i => i.id === issueId);
    if (issueIndex === -1) return;

    const originalStatusId = issues[issueIndex].statusId;
    if (originalStatusId === targetStatusId) return;

    // 1. Atualização OTIMISTA no UI
    const updatedIssues = [...issues];
    updatedIssues[issueIndex] = {
      ...updatedIssues[issueIndex],
      statusId: targetStatusId,
      statusName: statuses.find(s => s.id === targetStatusId)?.name || ''
    };
    issues = updatedIssues;

    // 2. Chamada de API
    try {
      await updateIssueStatus(issueId, targetStatusId);
    } catch (err: any) {
      // 3. REVERSÃO em caso de erro (Workflow do Redmine inválido / Permissões)
      console.error(err);
      
      // Exibe toast/alerta de erro temporário
      const prefix = i18n.currentLanguage === 'pt-br' ? 'Não foi possível mover a tarefa: ' : i18n.currentLanguage === 'es' ? 'No se pudo mover la tarea: ' : 'Could not move task: ';
      errorMsg = `${prefix}${err.message || 'Error'}`;
      
      // Restaura o status original
      const revertedIssues = [...issues];
      const revertedIndex = revertedIssues.findIndex(i => i.id === issueId);
      if (revertedIndex !== -1) {
        revertedIssues[revertedIndex] = {
          ...revertedIssues[revertedIndex],
          statusId: originalStatusId,
          statusName: statuses.find(s => s.id === originalStatusId)?.name || ''
        };
        issues = revertedIssues;
      }

      // Limpa mensagem de erro após 6 segundos
      setTimeout(() => {
        if (errorMsg.includes('mover a tarefa') || errorMsg.includes('mover la tarea') || errorMsg.includes('move task')) {
          errorMsg = '';
        }
      }, 6000);
    }
  }

  function handleDragOver(event: DragEvent, statusId: number) {
    event.preventDefault();
    dragOverColumnId = statusId;
  }

  function handleDragLeave() {
    dragOverColumnId = null;
  }

  function openCreateModal(statusId: number) {
    createStatusId = statusId;
    showCreateModal = true;
  }
</script>

<div class="flex flex-col h-full space-y-4">
  <!-- Top Bar -->
  <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800/80 pb-4">
    <div class="flex items-center gap-2">
      <div class="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400">
        <Sparkles class="w-5 h-5" />
      </div>
      <div>
        <h1 class="text-xl font-bold text-zinc-800 dark:text-zinc-100">{projectName}</h1>
        <p class="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 flex-wrap">
          <span>{i18n.currentLanguage === 'pt-br' ? 'Tarefas integradas via API do Redmine' : i18n.currentLanguage === 'es' ? 'Tareas integradas a través de la API de Redmine' : 'Integrated tasks via Redmine API'}</span>
          {#if formattedLastUpdated}
            <span class="text-zinc-300 dark:text-zinc-700">•</span>
            <span class="font-medium text-indigo-600 dark:text-indigo-400">
              {i18n.t('lastUpdated', { time: formattedLastUpdated })}
            </span>
          {/if}
        </p>
      </div>
    </div>

    <div class="flex items-center gap-2.5">
      <button
        onclick={loadData}
        class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium px-4 py-2 text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow"
        disabled={loading}
      >
        <RefreshCw class="w-3.5 h-3.5 {loading ? 'animate-spin' : ''}" />
        <span>{i18n.currentLanguage === 'pt-br' ? 'Atualizar' : i18n.currentLanguage === 'es' ? 'Actualizar' : 'Refresh'}</span>
      </button>

      <button
        onclick={onOpenSettings}
        class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium px-4 py-2 text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow"
      >
        <Settings class="w-3.5 h-3.5" />
        <span>{i18n.t('openSettings')}</span>
      </button>
    </div>
  </div>

  <!-- Tab Navigation -->
  <div class="flex border-b border-zinc-200 dark:border-zinc-800 pb-px">
    <button
      onclick={() => (activeTab = 'board')}
      class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer {activeTab === 'board' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}"
    >
      <BoardIcon class="w-4 h-4" />
      <span>{i18n.currentLanguage === 'pt-br' ? 'Quadro Ativo' : i18n.currentLanguage === 'es' ? 'Tablero Activo' : 'Active Board'}</span>
    </button>
    <button
      onclick={() => (activeTab = 'backlog')}
      class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer {activeTab === 'backlog' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}"
    >
      <Layers class="w-4 h-4" />
      <span>{i18n.currentLanguage === 'pt-br' ? 'Backlog & Planejamento' : i18n.currentLanguage === 'es' ? 'Backlog y Planificación' : 'Backlog & Planning'}</span>
    </button>
  </div>

  <!-- Global Error Alert -->
  {#if errorMsg}
    <div class="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-xl p-4 flex items-start justify-between gap-3">
      <div class="flex items-start gap-2.5">
        <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
        <span>{errorMsg}</span>
      </div>
      <button onclick={() => (errorMsg = '')} class="text-red-500 dark:text-red-400/70 hover:text-red-700 dark:hover:text-red-400 transition-colors">
        <X class="w-4 h-4" />
      </button>
    </div>
  {/if}

  {#if activeTab === 'board'}
    {#if loading && statuses.length === 0}
      <!-- Loading skeleton -->
      <div class="flex flex-col items-center justify-center py-32 text-zinc-500 dark:text-zinc-400 gap-3">
        <Loader2 class="w-8 h-8 animate-spin text-indigo-500" />
        <span class="text-sm">{i18n.t('loadingData')}</span>
      </div>
    {:else if statuses.length === 0 && !loading}
      <!-- Empty State -->
      <div class="text-center py-24 bg-zinc-100/40 dark:bg-zinc-900/25 border border-zinc-200 dark:border-zinc-800/60 rounded-2xl p-6">
        <p class="text-zinc-500 dark:text-zinc-400 text-sm">{i18n.currentLanguage === 'pt-br' ? 'Nenhum status configurado para as colunas do Kanban.' : i18n.currentLanguage === 'es' ? 'Ningún estado configurado para las columnas de Kanban.' : 'No status configured for the Kanban columns.'}</p>
        <button onclick={onOpenSettings} class="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs transition-all cursor-pointer">
          {i18n.t('adjustSettingsBtn')}
        </button>
      </div>
    {:else}
      <!-- Active Sprint Header Panel -->
      {#if activeSprint}
        <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
          <div class="flex-1 min-w-0 space-y-1">
            <div class="flex items-center gap-2.5 flex-wrap">
              <h2 class="text-base font-bold text-zinc-800 dark:text-zinc-100 truncate">{activeSprint.name}</h2>
              <span class="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/25">
                {i18n.currentLanguage === 'pt-br' ? 'Sprint Ativa' : i18n.currentLanguage === 'es' ? 'Sprint Activa' : 'Active Sprint'}
              </span>
              <span class="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <Calendar class="w-3.5 h-3.5" />
                <span>{formatDateRange(activeSprint.startDate, activeSprint.endDate)}</span>
              </span>
            </div>
            {#if activeSprint.goal}
              <p class="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-2xl">{activeSprint.goal}</p>
            {/if}
          </div>
          
          <!-- Progress and Actions -->
          <div class="flex items-center gap-6 w-full md:w-auto shrink-0 flex-wrap sm:flex-nowrap">
            <div class="flex flex-col gap-1 w-full sm:w-44">
              <div class="flex items-center justify-between text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                <span>{i18n.currentLanguage === 'pt-br' ? 'Progresso' : i18n.currentLanguage === 'es' ? 'Progreso' : 'Progress'}</span>
                <span>{activeSprintProgress.completed}/{activeSprintProgress.total} issues ({activeSprintProgress.percent}%)</span>
              </div>
              <div class="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden border border-zinc-200/40 dark:border-zinc-800/60 shadow-inner">
                <div class="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-300" style="width: {activeSprintProgress.percent}%"></div>
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <button
                onclick={() => (showDashboard = !showDashboard)}
                class="border font-medium px-3.5 py-2 text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm {showDashboard ? 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-200 dark:border-indigo-500/35 text-indigo-600 dark:text-indigo-400 font-bold' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'}"
              >
                <TrendingDown class="w-3.5 h-3.5" />
                <span>{i18n.currentLanguage === 'pt-br' ? 'Métricas' : i18n.currentLanguage === 'es' ? 'Métricas' : 'Metrics'}</span>
              </button>
              <button
                onclick={() => openEditSprint(activeSprint)}
                class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium px-3.5 py-2 text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Edit class="w-3.5 h-3.5" />
                <span>{i18n.currentLanguage === 'pt-br' ? 'Editar' : i18n.currentLanguage === 'es' ? 'Editar' : 'Edit'}</span>
              </button>
              <button
                onclick={() => openCompleteSprint(activeSprint)}
                class="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3.5 py-2 text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/10"
              >
                <CheckSquare class="w-3.5 h-3.5" />
                <span>{i18n.t('completeSprintBtn')}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Sprint Dashboard (Collapsible) -->
        {#if showDashboard}
          <div class="mb-4">
            <SprintDashboard {issues} {statuses} allSprints={sprints} />
          </div>
        {/if}

        <!-- Kanban Columns Grid -->
        <div class="flex-1 overflow-x-auto pb-4">
          <div
            class="flex gap-4 min-w-max items-start transition-all duration-300"
            style="height: {showDashboard ? 'calc(100vh - 610px)' : 'calc(100vh - 290px)'}; min-height: 350px;"
          >
            {#each statuses as status}
              {@const columnIssues = getColumnIssues(status.id)}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                ondragover={(e) => handleDragOver(e, status.id)}
                ondragleave={handleDragLeave}
                ondrop={(e) => handleDrop(e, status.id)}
                class="w-72 bg-zinc-100/40 dark:bg-zinc-950/20 border rounded-2xl flex flex-col max-h-full transition-colors duration-200 {dragOverColumnId === status.id ? 'border-indigo-500/50 bg-indigo-500/5 dark:bg-indigo-500/5' : 'border-zinc-200 dark:border-zinc-800/60'}"
              >
                <!-- Column Header -->
                <div class="flex items-center justify-between p-3.5 border-b border-zinc-200/80 dark:border-zinc-900">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-semibold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider">{status.name}</span>
                    <span class="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                      {columnIssues.length}
                    </span>
                  </div>
                  <button
                    onclick={() => openCreateModal(status.id)}
                    class="text-zinc-400 hover:text-indigo-600 hover:bg-zinc-200/50 dark:text-zinc-500 dark:hover:text-indigo-400 dark:hover:bg-zinc-800/80 p-1 rounded-lg transition-all cursor-pointer"
                    title={i18n.currentLanguage === 'pt-br' ? 'Criar tarefa nesta coluna' : i18n.currentLanguage === 'es' ? 'Crear tarea en esta columna' : 'Create task in this column'}
                  >
                    <Plus class="w-4 h-4" />
                  </button>
                </div>

                <!-- Column Card List -->
                <div class="flex-1 overflow-y-auto p-3 space-y-3 min-h-[150px]">
                  {#each columnIssues as issue}
                    <!-- Card Container with Click -->
                    <button onclick={() => (activeIssueId = issue.id)} class="contents text-left border-none bg-transparent p-0 w-full cursor-pointer focus:outline-none">
                      <KanbanCard {issue} {redmineUrl} isAssignedToMe={issue.assignedToId === currentUserId} {customColor} />
                    </button>
                  {:else}
                    <div class="flex flex-col items-center justify-center py-10 border border-dashed border-zinc-200 dark:border-zinc-800/30 rounded-xl text-[10px] text-zinc-400 dark:text-zinc-600 select-none">
                      {i18n.currentLanguage === 'pt-br' ? 'Arrastar tarefas aqui' : i18n.currentLanguage === 'es' ? 'Arrastrar tareas aquí' : 'Drag tasks here'}
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {:else}
        <!-- Premium Empty State when no Active Sprint -->
        <div class="text-center py-20 bg-zinc-50/40 dark:bg-zinc-900/10 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center gap-4">
          <div class="p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-full text-indigo-600 dark:text-indigo-400">
            <BoardIcon class="w-8 h-8" />
          </div>
          <div class="space-y-1">
            <h3 class="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{i18n.currentLanguage === 'pt-br' ? 'Nenhuma Sprint Ativa' : i18n.currentLanguage === 'es' ? 'Ninguna Sprint Activa' : 'No Active Sprint'}</h3>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
              {i18n.currentLanguage === 'pt-br' ? 'Para visualizar e atualizar tarefas no quadro Kanban, você precisa iniciar uma Sprint. Organize seu backlog e ative uma sprint na aba de Planejamento.' : i18n.currentLanguage === 'es' ? 'Para visualizar y actualizar tareas en el tablero Kanban, debe iniciar una Sprint. Organice su backlog y active una sprint en la pestaña de Planificación.' : 'To view and update tasks on the Kanban board, you need to start a Sprint. Organize your backlog and activate a sprint in the Planning tab.'}
            </p>
          </div>
          <button
            onclick={() => (activeTab = 'backlog')}
            class="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition-all cursor-pointer shadow shadow-indigo-600/10"
          >
            {i18n.currentLanguage === 'pt-br' ? 'Acessar Backlog & Planejamento' : i18n.currentLanguage === 'es' ? 'Acceder al Backlog y Planificación' : 'Access Backlog & Planning'}
          </button>
        </div>
      {/if}
    {/if}
  {:else if activeTab === 'backlog'}
    <div class="flex-1 overflow-y-auto">
      <BacklogView
        bind:issues
        bind:sprints
        {statuses}
        {users}
        {currentUserId}
        onDataChanged={loadData}
        onOpenIssueDetails={(id) => (activeIssueId = id)}
      />
    </div>
  {/if}

  <!-- Active Issue Detail Modal -->
  {#if activeIssueId !== null}
    <IssueModal
      issueId={activeIssueId}
      {redmineUrl}
      onclose={() => (activeIssueId = null)}
      oncommentAdded={loadData}
    />
  {/if}

  <!-- Create Issue Modal -->
  {#if showCreateModal}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
      <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden transition-colors duration-200">
        <div class="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-6 py-4">
          <h2 class="text-lg font-semibold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
            <Plus class="w-4.5 h-4.5 text-indigo-500 dark:text-indigo-400" />
            <span>{i18n.t('newTask')}</span>
          </h2>
          <button onclick={() => (showCreateModal = false)} class="text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer">
            <X class="w-5 h-5" />
          </button>
        </div>

        <form onsubmit={(e) => { e.preventDefault(); handleCreateIssue(); }} class="p-6 space-y-4">
          <div>
            <label for="new-subject" class="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">{i18n.currentLanguage === 'pt-br' ? 'Título / Assunto' : i18n.currentLanguage === 'es' ? 'Título / Asunto' : 'Title / Subject'}</label>
            <input
              id="new-subject"
              type="text"
              bind:value={createSubject}
              placeholder={i18n.currentLanguage === 'pt-br' ? 'Digite o título da tarefa...' : i18n.currentLanguage === 'es' ? 'Escriba el título de la tarea...' : 'Enter task title...'}
              class="w-full bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none transition-all shadow-inner"
              required
              disabled={creatingIssue}
            />
          </div>

          <div>
            <label for="new-desc" class="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">{i18n.t('description')}</label>
            <textarea
              id="new-desc"
              rows="3"
              bind:value={createDescription}
              placeholder={i18n.currentLanguage === 'pt-br' ? 'Digite a descrição detalhada da tarefa...' : i18n.currentLanguage === 'es' ? 'Escriba la descripción detallada de la tarea...' : 'Enter detailed description...'}
              class="w-full bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none transition-all resize-none shadow-inner"
              disabled={creatingIssue}
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="new-status" class="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">{i18n.currentLanguage === 'pt-br' ? 'Coluna / Status' : i18n.currentLanguage === 'es' ? 'Columna / Estado' : 'Column / Status'}</label>
              <select
                id="new-status"
                bind:value={createStatusId}
                class="w-full bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none transition-all shadow-sm"
                disabled={creatingIssue}
              >
                {#each statuses as s}
                  <option value={s.id} class="bg-white text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">{s.name}</option>
                {/each}
              </select>
            </div>

            <div>
              <label for="new-assignee" class="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">{i18n.t('assignee')}</label>
              <select
                id="new-assignee"
                bind:value={createAssignedToId}
                class="w-full bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none transition-all shadow-sm"
                disabled={creatingIssue || loadingUsers}
              >
                <option value={null} class="bg-white text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500 italic">{i18n.t('unassigned')}</option>
                {#each users as u}
                  <option value={u.id} class="bg-white text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">{u.name}</option>
                {/each}
              </select>
            </div>
          </div>

          <div class="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onclick={() => (showCreateModal = false)}
              class="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-medium rounded-xl text-xs transition-all cursor-pointer border border-zinc-200 dark:border-zinc-800/80 shadow-sm"
              disabled={creatingIssue}
            >
              {i18n.t('cancel')}
            </button>
            <button
              type="submit"
              class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-600/10"
              disabled={creatingIssue || !createSubject.trim()}
            >
              {#if creatingIssue}
                <Loader2 class="w-3.5 h-3.5 animate-spin" />
                <span>{i18n.t('saving')}</span>
              {:else}
                <Plus class="w-3.5 h-3.5" />
                <span>{i18n.t('newTask')}</span>
              {/if}
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}

  <!-- Sprint Modal -->
  {#if showSprintModal}
    <SprintModal
      mode={sprintModalMode}
      sprint={sprintModalTarget}
      allSprints={sprints}
      onclose={() => (showSprintModal = false)}
      onsuccess={loadData}
    />
  {/if}
</div>
