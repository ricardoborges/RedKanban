<script lang="ts">
  import { onMount } from 'svelte';
  import {
    moveIssueToSprint,
    type Issue,
    type Sprint,
    type Status,
    type User as RedmineUser
  } from '../services/api';
  import { i18n } from '../services/i18n.svelte';
  import SprintModal from './SprintModal.svelte';
  import CreateIssueModal from './CreateIssueModal.svelte';
  import {
    Calendar,
    ChevronDown,
    ChevronRight,
    Play,
    CheckSquare,
    Edit,
    Plus,
    User,
    Compass,
    Settings,
    FileText,
    GripVertical,
    Clock
  } from '@lucide/svelte';

  // Svelte 5 props
  let {
    issues = $bindable([]),
    sprints = $bindable([]),
    statuses = [],
    users = [],
    currentUserId = null,
    onDataChanged,
    onOpenIssueDetails
  } = $props<{
    issues: Issue[];
    sprints: Sprint[];
    statuses: Status[];
    users: RedmineUser[];
    currentUserId: number | null;
    onDataChanged: () => void;
    onOpenIssueDetails: (id: number) => void;
  }>();

  // Collapsed sprints states
  let collapsedSprints = $state<Record<number, boolean>>({});
  let backlogCollapsed = $state(false);

  // Drag over states
  let dragOverSprintId = $state<number | null | 'backlog'>(null);

  // Modal control states
  let showSprintModal = $state(false);
  let showCreateBacklogModal = $state(false);
  let sprintModalMode = $state<'create' | 'edit' | 'start' | 'complete'>('create');
  let sprintModalTarget = $state<Sprint | null>(null);

  // Group sprints by status
  let activeSprints = $derived(sprints.filter((s: Sprint) => s.status === 'active'));
  let futureSprints = $derived(sprints.filter((s: Sprint) => s.status === 'future'));
  let closedSprints = $derived(sprints.filter((s: Sprint) => s.status === 'closed'));
  
  // Filter state for Backlog
  let selectedStatusFilter = $state<string>('open'); // 'open', 'all', or statusId string
  
  // Filtered Backlog issues
  let filteredBacklogIssues = $derived(
    issues.filter((i: Issue) => i.sprintId === null).filter((i: Issue) => {
      if (selectedStatusFilter === 'open') {
        const statusObj = statuses.find((s: Status) => s.id === i.statusId);
        return statusObj ? !statusObj.isClosed : true;
      } else if (selectedStatusFilter === 'all') {
        return true;
      } else {
        return i.statusId === parseInt(selectedStatusFilter, 10);
      }
    })
  );

  function isCollapsed(sprintId: number): boolean {
    return !!collapsedSprints[sprintId];
  }

  function toggleSprint(sprintId: number) {
    collapsedSprints[sprintId] = !collapsedSprints[sprintId];
  }

  function getSprintIssues(sprintId: number) {
    return issues.filter((i: Issue) => i.sprintId === sprintId);
  }

  // Drag and Drop
  function handleDragStart(event: DragEvent, issueId: number) {
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', issueId.toString());
    }
  }

  function handleDragOver(event: DragEvent, targetId: number | null | 'backlog') {
    event.preventDefault();
    dragOverSprintId = targetId;
  }

  function handleDragLeave() {
    dragOverSprintId = null;
  }

  async function handleDrop(event: DragEvent, targetSprintId: number | null) {
    event.preventDefault();
    dragOverSprintId = null;

    if (!event.dataTransfer) return;
    const issueIdStr = event.dataTransfer.getData('text/plain');
    if (!issueIdStr) return;

    const issueId = parseInt(issueIdStr, 10);
    const issueIndex = issues.findIndex((i: Issue) => i.id === issueId);
    if (issueIndex === -1) return;

    const originalSprintId = issues[issueIndex].sprintId;
    if (originalSprintId === targetSprintId) return;

    // 1. Optimistic Update
    const oldIssues = [...issues];
    issues = issues.map((i: Issue) => {
      if (i.id === issueId) {
        const targetSprint = sprints.find((s: Sprint) => s.id === targetSprintId);
        return {
          ...i,
          sprintId: targetSprintId,
          sprintName: targetSprint ? targetSprint.name : ''
        };
      }
      return i;
    });

    // Update sprint totals locally
    const issueObj = oldIssues[issueIndex];
    const sp = issueObj.storyPoints || 0;
    
    sprints = sprints.map((s: Sprint) => {
      let pts = s.totalStoryPoints;
      if (s.id === originalSprintId) pts -= sp;
      if (s.id === targetSprintId) pts += sp;
      return { ...s, totalStoryPoints: pts };
    });

    // 2. Call API
    try {
      await moveIssueToSprint(issueId, targetSprintId);
      onDataChanged(); // refresh data
    } catch (err: any) {
      console.error(err);
      issues = oldIssues;
      onDataChanged();
      const prefix = i18n.currentLanguage === 'pt-br' ? 'Não foi possível mover a tarefa: ' : i18n.currentLanguage === 'es' ? 'No se pudo mover la tarea: ' : 'Could not move task: ';
      alert(`${prefix}${err.message}`);
    }
  }

  // Modal helpers
  function openCreateSprint() {
    sprintModalMode = 'create';
    sprintModalTarget = null;
    showSprintModal = true;
  }

  function openEditSprint(sprint: Sprint) {
    sprintModalMode = 'edit';
    sprintModalTarget = sprint;
    showSprintModal = true;
  }

  function openStartSprint(sprint: Sprint) {
    sprintModalMode = 'start';
    sprintModalTarget = sprint;
    showSprintModal = true;
  }

  function openCompleteSprint(sprint: Sprint) {
    sprintModalMode = 'complete';
    sprintModalTarget = sprint;
    showSprintModal = true;
  }

  // svelte-ignore state_referenced_locally
  function handleModalSuccess() {
    showSprintModal = false;
    onDataChanged();
  }

  function formatDateRange(startDateStr: string | null, endDateStr: string | null) {
    if (!startDateStr && !endDateStr) return i18n.currentLanguage === 'pt-br' ? 'Sem datas definidas' : i18n.currentLanguage === 'es' ? 'Sin fechas definidas' : 'No dates defined';
    const opt: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    const locale = i18n.currentLanguage === 'pt-br' ? 'pt-BR' : i18n.currentLanguage === 'es' ? 'es-ES' : 'en-US';
    
    let start = '';
    if (startDateStr) {
      const d = new Date(startDateStr);
      // Adjust timezone offset
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
</script>
<div class="flex flex-col space-y-6">
  <!-- Header planning -->
  <div class="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
    <div>
      <h2 class="text-lg font-bold text-zinc-800 dark:text-zinc-100">{i18n.currentLanguage === 'pt-br' ? 'Backlog & Planejamento' : i18n.currentLanguage === 'es' ? 'Backlog y Planificación' : 'Backlog & Planning'}</h2>
      <p class="text-xs text-zinc-500 dark:text-zinc-400">
        {i18n.currentLanguage === 'pt-br' ? 'Gerencie e planeje sprints arrastando tarefas entre o backlog e os painéis de sprints.' : i18n.currentLanguage === 'es' ? 'Gestione y planifique sprints arrastrando tareas entre el backlog y los paneles de sprints.' : 'Manage and plan sprints by dragging tasks between the backlog and the sprint panels.'}
      </p>
    </div>
    <button
      onclick={openCreateSprint}
      class="bg-indigo-600 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-semibold px-4 py-2 text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/10"
    >
      <Plus class="w-4 h-4" />
      <span>{i18n.t('createSprintBtn')}</span>
    </button>
  </div>

  <!-- Layout de duas colunas: Backlog à esquerda, Sprints à direita -->
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
    <!-- Coluna da Esquerda: Backlog (Sticky no desktop) -->
    <div class="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-6">
      <!-- Backlog Panel -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        ondragover={(e) => handleDragOver(e, 'backlog')}
        ondragleave={handleDragLeave}
        ondrop={(e) => handleDrop(e, null)}
        class="border border-zinc-200 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-950/5 rounded-2xl overflow-hidden transition-all duration-200
          {dragOverSprintId === 'backlog' ? 'bg-indigo-500/5 border-indigo-500' : ''}"
      >
        <div class="flex items-center justify-between gap-2 p-3 bg-zinc-50/55 dark:bg-zinc-900/35 border-b border-zinc-200 dark:border-zinc-800 select-none">
          <div class="flex items-center gap-2">
            <button
              onclick={() => (backlogCollapsed = !backlogCollapsed)}
              class="p-1 rounded hover:bg-zinc-200/50 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
            >
              {#if backlogCollapsed}
                <ChevronRight class="w-4 h-4" />
              {:else}
                <ChevronDown class="w-4 h-4" />
              {/if}
            </button>
            <div class="flex items-center gap-1.5">
              <span class="font-bold text-sm text-zinc-800 dark:text-zinc-200">Backlog</span>
              <span class="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                {filteredBacklogIssues.length}
              </span>
            </div>
            {#if !backlogCollapsed}
              <button
                onclick={() => (showCreateBacklogModal = true)}
                class="text-zinc-400 hover:text-indigo-600 hover:bg-zinc-200/50 dark:text-zinc-500 dark:hover:text-indigo-400 dark:hover:bg-zinc-800/80 p-1 rounded-lg transition-all cursor-pointer"
                title={i18n.currentLanguage === 'pt-br' ? 'Criar tarefa no Backlog' : i18n.currentLanguage === 'es' ? 'Crear tarea en el Backlog' : 'Create task in Backlog'}
              >
                <Plus class="w-4 h-4" />
              </button>
            {/if}
          </div>

          {#if !backlogCollapsed}
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">{i18n.currentLanguage === 'pt-br' ? 'Filtro:' : i18n.currentLanguage === 'es' ? 'Filtro:' : 'Filter:'}</span>
              <select
                bind:value={selectedStatusFilter}
                class="bg-white dark:bg-zinc-800 text-[10px] border border-zinc-200 dark:border-zinc-700/80 rounded px-1.5 py-0.5 text-zinc-600 dark:text-zinc-400 focus:outline-none cursor-pointer max-w-28"
              >
                <option value="open">{i18n.currentLanguage === 'pt-br' ? 'Abertas' : i18n.currentLanguage === 'es' ? 'Abiertas' : 'Open'}</option>
                <option value="all">{i18n.currentLanguage === 'pt-br' ? 'Todas' : i18n.currentLanguage === 'es' ? 'Todas' : 'All'}</option>
                {#each statuses as status}
                  <option value={status.id.toString()}>{status.name}</option>
                {/each}
              </select>
            </div>
          {/if}
        </div>

        {#if !backlogCollapsed}
          <div class="p-2 space-y-1.5 min-h-[100px] lg:max-h-[calc(100vh-240px)] lg:overflow-y-auto">
            {#each filteredBacklogIssues as issue (issue.id)}
              <!-- Row Item -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                draggable="true"
                ondragstart={(e) => handleDragStart(e, issue.id)}
                onclick={() => onOpenIssueDetails(issue.id)}
                class="flex items-center justify-between gap-3 p-3 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700/80 hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 rounded-xl cursor-grab transition-all select-none shadow-sm"
              >
                <div class="flex items-center gap-2.5 min-w-0 flex-1">
                  <GripVertical class="w-4 h-4 text-zinc-300 dark:text-zinc-600 shrink-0 cursor-grab" />
                  <span class="text-xs font-semibold text-zinc-400 dark:text-zinc-500 shrink-0">#{issue.id}</span>
                  <span class="text-sm font-semibold text-zinc-700 dark:text-zinc-200 truncate">{issue.subject}</span>
                </div>

                <div class="flex items-center gap-3 shrink-0">
                  <!-- Status Badge -->
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                    {issue.statusName}
                  </span>

                  <!-- Story Points Pill -->
                  <div class="w-12 flex justify-end">
                    {#if issue.storyPoints !== null}
                      <span class="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-2xs font-bold px-2 py-0.5 rounded-full min-w-7 text-center">
                        {issue.storyPoints}
                      </span>
                    {:else}
                      <span class="text-zinc-300 dark:text-zinc-700 text-2xs select-none font-bold mr-2">-</span>
                    {/if}
                  </div>
                </div>
              </div>
            {:else}
              <div class="flex flex-col items-center justify-center py-10 border border-dashed border-zinc-200 dark:border-zinc-800/40 rounded-xl text-xs text-zinc-400 dark:text-zinc-500 select-none">
                {i18n.currentLanguage === 'pt-br' ? 'Nenhuma tarefa no Backlog.' : i18n.currentLanguage === 'es' ? 'Ninguna tarea en el Backlog.' : 'No tasks in the Backlog.'}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
    
    <!-- Coluna da Direita: Sprints -->
    <div class="lg:col-span-7 xl:col-span-8 space-y-4">
      <!-- Active Sprints -->
      {#each activeSprints as sprint (sprint.id)}
        {@const sprintIssues = getSprintIssues(sprint.id)}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          ondragover={(e) => handleDragOver(e, sprint.id)}
          ondragleave={handleDragLeave}
          ondrop={(e) => handleDrop(e, sprint.id)}
          class="border border-green-500/30 dark:border-green-500/20 bg-green-500/[0.01] rounded-2xl overflow-hidden transition-all duration-200
            {dragOverSprintId === sprint.id ? 'bg-indigo-500/5 border-indigo-500' : ''}"
        >
          <!-- Sprint Header -->
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-green-500/[0.03] dark:bg-green-500/[0.02] border-b border-green-500/20 dark:border-green-500/10 select-none">
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <button
                onclick={() => toggleSprint(sprint.id)}
                class="p-1 rounded hover:bg-zinc-200/50 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
              >
                {#if isCollapsed(sprint.id)}
                  <ChevronRight class="w-4.5 h-4.5" />
                {:else}
                  <ChevronDown class="w-4.5 h-4.5" />
                {/if}
              </button>
              <div class="truncate">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-sm text-zinc-800 dark:text-zinc-200 truncate">{sprint.name}</span>
                  <span class="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20">
                    {i18n.currentLanguage === 'pt-br' ? 'Ativa' : i18n.currentLanguage === 'es' ? 'Activa' : 'Active'}
                  </span>
                </div>
                {#if sprint.goal}
                  <p class="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5 font-light">
                    <span class="font-medium text-zinc-600 dark:text-zinc-300">{i18n.currentLanguage === 'pt-br' ? 'Meta:' : i18n.currentLanguage === 'es' ? 'Meta:' : 'Goal:'}</span> {sprint.goal}
                  </p>
                {/if}
              </div>
            </div>

            <div class="flex items-center gap-3 shrink-0">
              <div class="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <Calendar class="w-3.5 h-3.5 text-zinc-400" />
                <span>{formatDateRange(sprint.startDate, sprint.endDate)}</span>
              </div>

              <div class="flex items-center gap-1">
                <span class="text-xs text-zinc-400 dark:text-zinc-500 font-light">{i18n.currentLanguage === 'pt-br' ? 'Estimativa:' : i18n.currentLanguage === 'es' ? 'Estimación:' : 'Estimate:'}</span>
                <span class="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-500/20">
                  {sprint.totalStoryPoints} {i18n.t('sp')}
                </span>
                <span class="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-bold px-2 py-0.5 rounded-full">
                  {sprintIssues.length}
                </span>
              </div>

              <div class="flex items-center gap-1.5 border-l border-zinc-200 dark:border-zinc-800 pl-3">
                <button
                  onclick={() => openEditSprint(sprint)}
                  class="p-1.5 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
                  title={i18n.currentLanguage === 'pt-br' ? 'Editar Sprint' : i18n.currentLanguage === 'es' ? 'Editar Sprint' : 'Edit Sprint'}
                >
                  <Edit class="w-3.5 h-3.5" />
                </button>
                <button
                  onclick={() => openCompleteSprint(sprint)}
                  class="bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-500 text-white font-medium px-3 py-1.5 text-2xs rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-sm shadow-indigo-600/10"
                >
                  <CheckSquare class="w-3.5 h-3.5" />
                  <span>{i18n.currentLanguage === 'pt-br' ? 'Concluir' : i18n.currentLanguage === 'es' ? 'Completar' : 'Complete'}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Issue List inside Sprint -->
          {#if !isCollapsed(sprint.id)}
            <div class="p-2 space-y-1.5 min-h-[60px]">
              {#each sprintIssues as issue (issue.id)}
                <!-- Row Item -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div
                  draggable="true"
                  ondragstart={(e) => handleDragStart(e, issue.id)}
                  onclick={() => onOpenIssueDetails(issue.id)}
                  class="flex items-center justify-between gap-3 p-3 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700/80 hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 rounded-xl cursor-grab transition-all select-none shadow-sm"
                >
                  <div class="flex items-center gap-2.5 min-w-0 flex-1">
                    <GripVertical class="w-4 h-4 text-zinc-300 dark:text-zinc-600 shrink-0 cursor-grab" />
                    <span class="text-xs font-semibold text-zinc-400 dark:text-zinc-500 shrink-0">#{issue.id}</span>
                    <span class="text-sm font-semibold text-zinc-700 dark:text-zinc-200 truncate">{issue.subject}</span>
                  </div>

                  <div class="flex items-center gap-3 shrink-0">
                    <!-- Status Badge -->
                    <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                      {issue.statusName}
                    </span>

                    <!-- Assignee Avatar -->
                    <div class="flex items-center gap-1.5 w-28 max-w-[112px] min-w-0">
                      {#if issue.assignedToId}
                        <div class="w-4.5 h-4.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[8px] font-bold flex items-center justify-center border border-indigo-200 dark:border-indigo-500/20 shrink-0 shadow-sm">
                          {issue.assignedToName.split(' ').slice(0,2).map((n: string) => n[0]).join('').toUpperCase()}
                        </div>
                        <span class="text-[10px] text-zinc-600 dark:text-zinc-400 truncate">{issue.assignedToName}</span>
                      {:else}
                        <div class="w-4.5 h-4.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center shrink-0">
                          <User class="w-2.5 h-2.5" />
                        </div>
                        <span class="text-[10px] text-zinc-400 dark:text-zinc-500 italic">{i18n.t('unassigned')}</span>
                      {/if}
                    </div>

                    <!-- Story Points Pill -->
                    <div class="w-12 flex justify-end">
                      {#if issue.storyPoints !== null}
                        <span class="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-2xs font-bold px-2 py-0.5 rounded-full min-w-7 text-center">
                          {issue.storyPoints}
                        </span>
                      {:else}
                        <span class="text-zinc-300 dark:text-zinc-700 text-2xs select-none font-bold mr-2">-</span>
                      {/if}
                    </div>

                    <!-- Quick Action: Move to Backlog -->
                    <button
                      onclick={(e) => { e.stopPropagation(); moveIssueToSprint(issue.id, null).then(onDataChanged); }}
                      class="text-2xs font-semibold text-zinc-400 hover:text-red-500 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      title={i18n.currentLanguage === 'pt-br' ? 'Remover da Sprint' : i18n.currentLanguage === 'es' ? 'Eliminar del Sprint' : 'Remove from Sprint'}
                    >
                      {i18n.currentLanguage === 'pt-br' ? 'Excluir' : i18n.currentLanguage === 'es' ? 'Quitar' : 'Remove'}
                    </button>
                  </div>
                </div>
              {:else}
                <div class="flex flex-col items-center justify-center py-6 border border-dashed border-zinc-200 dark:border-zinc-800/40 rounded-xl text-xs text-zinc-400 dark:text-zinc-500 select-none">
                  {i18n.currentLanguage === 'pt-br' ? 'Arraste tarefas aqui para planejar' : i18n.currentLanguage === 'es' ? 'Arrastre tareas aquí para planificar' : 'Drag tasks here to plan'}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}

      <!-- Future Sprints -->
      {#each futureSprints as sprint (sprint.id)}
        {@const sprintIssues = getSprintIssues(sprint.id)}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          ondragover={(e) => handleDragOver(e, sprint.id)}
          ondragleave={handleDragLeave}
          ondrop={(e) => handleDrop(e, sprint.id)}
          class="border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/20 dark:bg-zinc-950/5 rounded-2xl overflow-hidden transition-all duration-200
            {dragOverSprintId === sprint.id ? 'bg-indigo-500/5 border-indigo-500' : ''}"
        >
          <!-- Sprint Header -->
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-zinc-50/55 dark:bg-zinc-900/30 border-b border-zinc-200 dark:border-zinc-800/80 select-none">
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <button
                onclick={() => toggleSprint(sprint.id)}
                class="p-1 rounded hover:bg-zinc-200/50 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
              >
                {#if isCollapsed(sprint.id)}
                  <ChevronRight class="w-4.5 h-4.5" />
                {:else}
                  <ChevronDown class="w-4.5 h-4.5" />
                {/if}
              </button>
              <div class="truncate">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-sm text-zinc-800 dark:text-zinc-200 truncate">{sprint.name}</span>
                  <span class="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/80">
                    {i18n.currentLanguage === 'pt-br' ? 'Planejada' : i18n.currentLanguage === 'es' ? 'Planificada' : 'Planned'}
                  </span>
                </div>
                {#if sprint.goal}
                  <p class="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5 font-light">
                    <span class="font-medium text-zinc-600 dark:text-zinc-300">{i18n.currentLanguage === 'pt-br' ? 'Meta:' : i18n.currentLanguage === 'es' ? 'Meta:' : 'Goal:'}</span> {sprint.goal}
                  </p>
                {/if}
              </div>
            </div>

            <div class="flex items-center gap-3 shrink-0">
              <div class="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-light">
                <Calendar class="w-3.5 h-3.5 text-zinc-400" />
                <span>{formatDateRange(sprint.startDate, sprint.endDate)}</span>
              </div>

              <div class="flex items-center gap-1">
                <span class="text-xs text-zinc-400 dark:text-zinc-500 font-light">{i18n.currentLanguage === 'pt-br' ? 'Estimativa:' : i18n.currentLanguage === 'es' ? 'Estimación:' : 'Estimate:'}</span>
                <span class="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold px-2 py-0.5 rounded-full">
                  {sprint.totalStoryPoints} {i18n.t('sp')}
                </span>
                <span class="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-bold px-2 py-0.5 rounded-full">
                  {sprintIssues.length}
                </span>
              </div>

              <div class="flex items-center gap-1.5 border-l border-zinc-200 dark:border-zinc-800/80 pl-3">
                <button
                  onclick={() => openEditSprint(sprint)}
                  class="p-1.5 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
                  title={i18n.currentLanguage === 'pt-br' ? 'Editar Sprint' : i18n.currentLanguage === 'es' ? 'Editar Sprint' : 'Edit Sprint'}
                >
                  <Edit class="w-3.5 h-3.5" />
                </button>
                <button
                  onclick={() => openStartSprint(sprint)}
                  class="bg-green-600 hover:bg-green-500 text-white font-medium px-3 py-1.5 text-2xs rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-sm shadow-green-600/10"
                >
                  <Play class="w-3.5 h-3.5" />
                  <span>{i18n.currentLanguage === 'pt-br' ? 'Iniciar' : i18n.currentLanguage === 'es' ? 'Iniciar' : 'Start'}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Issue List inside Sprint -->
          {#if !isCollapsed(sprint.id)}
            <div class="p-2 space-y-1.5 min-h-[60px]">
              {#each sprintIssues as issue (issue.id)}
                <!-- Row Item -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div
                  draggable="true"
                  ondragstart={(e) => handleDragStart(e, issue.id)}
                  onclick={() => onOpenIssueDetails(issue.id)}
                  class="flex items-center justify-between gap-3 p-3 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700/80 hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 rounded-xl cursor-grab transition-all select-none shadow-sm"
                >
                  <div class="flex items-center gap-2.5 min-w-0 flex-1">
                    <GripVertical class="w-4 h-4 text-zinc-300 dark:text-zinc-600 shrink-0 cursor-grab" />
                    <span class="text-xs font-semibold text-zinc-400 dark:text-zinc-500 shrink-0">#{issue.id}</span>
                    <span class="text-sm font-semibold text-zinc-700 dark:text-zinc-200 truncate">{issue.subject}</span>
                  </div>

                  <div class="flex items-center gap-3 shrink-0">
                    <!-- Status Badge -->
                    <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                      {issue.statusName}
                    </span>

                    <!-- Assignee Avatar -->
                    <div class="flex items-center gap-1.5 w-28 max-w-[112px] min-w-0">
                      {#if issue.assignedToId}
                        <div class="w-4.5 h-4.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[8px] font-bold flex items-center justify-center border border-indigo-200 dark:border-indigo-500/20 shrink-0 shadow-sm">
                          {issue.assignedToName.split(' ').slice(0,2).map((n: string) => n[0]).join('').toUpperCase()}
                        </div>
                        <span class="text-[10px] text-zinc-600 dark:text-zinc-400 truncate">{issue.assignedToName}</span>
                      {:else}
                        <div class="w-4.5 h-4.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center shrink-0">
                          <User class="w-2.5 h-2.5" />
                        </div>
                        <span class="text-[10px] text-zinc-400 dark:text-zinc-500 italic">{i18n.t('unassigned')}</span>
                      {/if}
                    </div>

                    <!-- Story Points Pill -->
                    <div class="w-12 flex justify-end">
                      {#if issue.storyPoints !== null}
                        <span class="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-2xs font-bold px-2 py-0.5 rounded-full min-w-7 text-center">
                          {issue.storyPoints}
                        </span>
                      {:else}
                        <span class="text-zinc-300 dark:text-zinc-700 text-2xs select-none font-bold mr-2">-</span>
                      {/if}
                    </div>

                    <!-- Quick Action: Move to Backlog -->
                    <button
                      onclick={(e) => { e.stopPropagation(); moveIssueToSprint(issue.id, null).then(onDataChanged); }}
                      class="text-2xs font-semibold text-zinc-400 hover:text-red-500 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      title={i18n.currentLanguage === 'pt-br' ? 'Remover da Sprint' : i18n.currentLanguage === 'es' ? 'Eliminar del Sprint' : 'Remove from Sprint'}
                    >
                      {i18n.currentLanguage === 'pt-br' ? 'Excluir' : i18n.currentLanguage === 'es' ? 'Quitar' : 'Remove'}
                    </button>
                  </div>
                </div>
              {:else}
                <div class="flex flex-col items-center justify-center py-6 border border-dashed border-zinc-200 dark:border-zinc-800/40 rounded-xl text-xs text-zinc-400 dark:text-zinc-500 select-none">
                  {i18n.currentLanguage === 'pt-br' ? 'Arraste tarefas aqui para planejar' : i18n.currentLanguage === 'es' ? 'Arrastre tareas aquí para planificar' : 'Drag tasks here to plan'}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}

      <!-- Closed Sprints (at the bottom, collapsed by default) -->
      {#if closedSprints.length > 0}
        <div class="border border-zinc-200 dark:border-zinc-800/60 rounded-2xl overflow-hidden bg-zinc-100/10 dark:bg-zinc-950/5">
          <div class="flex items-center justify-between p-3.5 bg-zinc-100/45 dark:bg-zinc-900/15 select-none border-b border-zinc-200 dark:border-zinc-800/65">
            <div class="flex items-center gap-2">
              <span class="font-bold text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{i18n.currentLanguage === 'pt-br' ? 'Sprints Concluídas' : i18n.currentLanguage === 'es' ? 'Sprints Completadas' : 'Completed Sprints'}</span>
              <span class="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-bold px-2 rounded-full">
                {closedSprints.length}
              </span>
            </div>
          </div>
          <div class="p-3 space-y-2 max-h-56 overflow-y-auto">
            {#each closedSprints as sprint (sprint.id)}
              {@const sprintIssues = getSprintIssues(sprint.id)}
              <div class="flex items-center justify-between bg-white dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/80 rounded-xl p-3 text-xs">
                <div class="truncate pr-4 flex-1">
                  <span class="font-semibold text-zinc-800 dark:text-zinc-200 block truncate">{sprint.name}</span>
                  {#if sprint.goal}
                    <span class="text-zinc-400 dark:text-zinc-500 text-2xs truncate block mt-0.5">{sprint.goal}</span>
                  {/if}
                </div>
                <div class="flex items-center gap-2.5 shrink-0 text-zinc-400 dark:text-zinc-500 font-light">
                  <span>{formatDateRange(sprint.startDate, sprint.endDate)}</span>
                  <span class="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold px-2 py-0.5 rounded">
                    {sprint.totalStoryPoints} {i18n.t('sp')}
                  </span>
                  <span class="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold px-2 py-0.5 rounded">
                    {sprintIssues.length} {i18n.currentLanguage === 'pt-br' ? 'tarefas' : i18n.currentLanguage === 'es' ? 'tareas' : 'tasks'}
                  </span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- Sprint Modal -->
  {#if showSprintModal}
    <SprintModal
      mode={sprintModalMode}
      sprint={sprintModalTarget}
      allSprints={sprints}
      onclose={() => (showSprintModal = false)}
      onsuccess={handleModalSuccess}
    />
  {/if}

  <!-- Create Issue Modal (for Backlog) -->
  {#if showCreateBacklogModal}
    <CreateIssueModal
      {statuses}
      {users}
      defaultStatusId={statuses[0]?.id}
      sprintId={null}
      onclose={() => (showCreateBacklogModal = false)}
      onsuccess={(newIssue) => {
        issues = [...issues, newIssue];
        showCreateBacklogModal = false;
        onDataChanged();
      }}
    />
  {/if}
</div>
