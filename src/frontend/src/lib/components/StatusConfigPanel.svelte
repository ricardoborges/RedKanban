<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchStatuses, type Status } from '../services/api';
  import { i18n } from '../services/i18n.svelte';
  import { Columns, ArrowUp, ArrowDown, Check, Loader2, AlertCircle, GripVertical } from '@lucide/svelte';

  // Svelte 5 props
  let { onconfigured, oncancel } = $props<{
    onconfigured: () => void;
    oncancel?: () => void;
  }>();

  interface StatusWithVisibility {
    id: number;
    name: string;
    visible: boolean;
  }

  let statusesList = $state<StatusWithVisibility[]>([]);
  let loading = $state(true);
  let errorMessage = $state('');
  let dragIndex = $state<number | null>(null);
  let isEditing = $state(false); // true se já houver configuração prévia no localStorage

  onMount(async () => {
    await loadStatuses();
  });

  async function loadStatuses() {
    loading = true;
    errorMessage = '';
    try {
      const allStatuses = await fetchStatuses();
      const storedOrder = localStorage.getItem('kanban_status_order');

      if (storedOrder) {
        isEditing = true;
        const visibleIds = JSON.parse(storedOrder) as number[];
        
        // 1. Criar um mapa para busca rápida de visibilidade
        const visibleSet = new Set(visibleIds);

        // 2. Mapear os status existentes na ordem salva
        const orderedList: StatusWithVisibility[] = [];
        
        // Adiciona os salvos na ordem correta
        visibleIds.forEach(id => {
          const matched = allStatuses.find(s => s.id === id);
          if (matched) {
            orderedList.push({ id: matched.id, name: matched.name, visible: true });
          }
        });

        // Adiciona os status que não estão na lista salva (novos status, desmarcados por padrão)
        allStatuses.forEach(s => {
          if (!visibleSet.has(s.id)) {
            orderedList.push({ id: s.id, name: s.name, visible: false });
          }
        });

        statusesList = orderedList;
      } else {
        isEditing = false;
        
        // Padrão de ordenação e seleção: Nova, Em andamento, Resolvida, Fechada
        const defaultOrderKeywords = [
          ['new', 'novo', 'nova'],
          ['in progress', 'em andamento', 'em progresso'],
          ['resolved', 'resolvida', 'resolvido'],
          ['closed', 'fechada', 'fechado']
        ];

        const getMatchIndex = (statusName: string): number => {
          const nameLower = statusName.toLowerCase();
          for (let i = 0; i < defaultOrderKeywords.length; i++) {
            if (defaultOrderKeywords[i].some(keyword => nameLower.includes(keyword))) {
              return i;
            }
          }
          return Infinity;
        };

        const sortedStatuses = [...allStatuses].sort((a, b) => {
          const idxA = getMatchIndex(a.name);
          const idxB = getMatchIndex(b.name);
          if (idxA !== idxB) {
            return idxA - idxB;
          }
          return allStatuses.indexOf(a) - allStatuses.indexOf(b);
        });

        statusesList = sortedStatuses.map(s => {
          const idx = getMatchIndex(s.name);
          return {
            id: s.id,
            name: s.name,
            visible: idx !== Infinity
          };
        });
      }
    } catch (err: any) {
      errorMessage = err.message || i18n.t('connectionErrorDesc');
    } finally {
      loading = false;
    }
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const temp = statusesList[index];
    statusesList[index] = statusesList[index - 1];
    statusesList[index - 1] = temp;
  }

  function moveDown(index: number) {
    if (index === statusesList.length - 1) return;
    const temp = statusesList[index];
    statusesList[index] = statusesList[index + 1];
    statusesList[index + 1] = temp;
  }

  // Drag and Drop handlers para reordenação premium
  function handleDragStart(event: DragEvent, index: number) {
    dragIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  // svelte-ignore dragover_preventdefault_check
  function handleDragOver(event: DragEvent, index: number) {
    event.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    
    // Reordena dinamicamente ao arrastar por cima
    const list = [...statusesList];
    const draggedItem = list[dragIndex];
    list.splice(dragIndex, 1);
    list.splice(index, 0, draggedItem);
    
    dragIndex = index;
    statusesList = list;
  }

  function handleDragEnd() {
    dragIndex = null;
  }

  function handleSave() {
    errorMessage = '';
    const visibleIds = statusesList.filter(s => s.visible).map(s => s.id);

    if (visibleIds.length === 0) {
      errorMessage = i18n.t('validationErrorEmptyColumns');
      return;
    }

    localStorage.setItem('kanban_status_order', JSON.stringify(visibleIds));
    onconfigured();
  }
</script>

<div class="bg-white dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl max-w-lg w-full mx-auto transition-colors duration-200">
  <div class="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-6">
    <div class="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400">
      <Columns class="w-6 h-6" />
    </div>
    <div>
      <h2 class="text-xl font-semibold text-zinc-800 dark:text-zinc-100 font-sans">{i18n.t('statusTitle')}</h2>
      <p class="text-xs text-zinc-500 dark:text-zinc-400">{i18n.t('statusSubtitle')}</p>
    </div>
  </div>

  {#if loading}
    <div class="flex flex-col items-center justify-center py-16 text-zinc-500 dark:text-zinc-400 gap-3">
      <Loader2 class="w-8 h-8 animate-spin text-indigo-500" />
      <span class="text-sm">{i18n.t('loadingData')}</span>
    </div>
  {:else if errorMessage && statusesList.length === 0}
    <div class="text-center py-10 text-red-600 dark:text-red-400">
      <div class="flex justify-center mb-3">
        <AlertCircle class="w-8 h-8" />
      </div>
      <p>{errorMessage}</p>
      <button onclick={loadStatuses} class="mt-4 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-800 text-xs cursor-pointer transition-all">
        {i18n.t('reloadProjects')}
      </button>
    </div>
  {:else}
    <div class="space-y-4">
      <div class="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
        {i18n.t('statusIntroText')}
      </div>

      <!-- List of statuses -->
      <div class="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
        {#each statusesList as status, index (status.id)}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            draggable="true"
            ondragstart={(e) => handleDragStart(e, index)}
            ondragover={(e) => handleDragOver(e, index)}
            ondragend={handleDragEnd}
            class="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800/80 rounded-xl hover:border-zinc-300 dark:hover:border-zinc-700/80 transition-all duration-100 cursor-grab active:cursor-grabbing {dragIndex === index ? 'opacity-40 border-indigo-500 bg-indigo-500/5' : ''}"
          >
            <div class="flex items-center gap-3">
              <!-- Drag Handle Icon -->
              <span class="text-zinc-400 dark:text-zinc-600 select-none">
                <GripVertical class="w-4 h-4 cursor-grab" />
              </span>

              <!-- Checkbox -->
              <label class="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  bind:checked={status.visible}
                  class="rounded border-zinc-300 dark:border-zinc-800 text-indigo-600 focus:ring-indigo-500 h-4.5 w-4.5 bg-white dark:bg-zinc-950"
                />
                <span class="text-sm font-medium {status.visible ? 'text-zinc-800 dark:text-zinc-200' : 'text-zinc-400 dark:text-zinc-600 line-through'}">
                  {status.name}
                </span>
              </label>
            </div>

            <!-- Reordering buttons -->
            <div class="flex items-center gap-1">
              <button
                type="button"
                onclick={() => moveUp(index)}
                disabled={index === 0}
                class="p-1 rounded text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-all"
                title="Move up"
              >
                <ArrowUp class="w-4 h-4" />
              </button>
              <button
                type="button"
                onclick={() => moveDown(index)}
                disabled={index === statusesList.length - 1}
                class="p-1 rounded text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-all"
                title="Move down"
              >
                <ArrowDown class="w-4 h-4" />
              </button>
            </div>
          </div>
        {/each}
      </div>

      {#if errorMessage}
        <div class="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-xl p-3 flex items-start gap-2.5">
          <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      {/if}

      <!-- Footer Buttons -->
      <div class="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-3">
        {#if oncancel && isEditing}
          <button
            type="button"
            onclick={oncancel}
            class="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium rounded-xl text-xs transition-all cursor-pointer border border-zinc-200 dark:border-zinc-800/80 shadow-sm"
          >
            {i18n.t('cancel')}
          </button>
        {/if}
        <button
          type="button"
          onclick={handleSave}
          class="flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl px-5 py-2.5 text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/10"
        >
          <Check class="w-4 h-4" />
          <span>{i18n.t('saveConfiguration')}</span>
        </button>
      </div>
    </div>
  {/if}
</div>
