<script lang="ts">
  import { onMount } from 'svelte';
  import {
    createSprint,
    updateSprint,
    completeSprint,
    type Sprint
  } from '../services/api';
  import { i18n } from '../services/i18n.svelte';
  import { X, Calendar, Flag, Play, CheckSquare, Loader2, Save } from '@lucide/svelte';

  // Svelte 5 props
  let {
    mode = 'create',
    sprint = null,
    allSprints = [],
    onclose,
    onsuccess
  } = $props<{
    mode: 'create' | 'edit' | 'start' | 'complete';
    sprint?: Sprint | null;
    allSprints?: Sprint[];
    onclose: () => void;
    onsuccess: () => void;
  }>();

  // Form states
  let name = $state('');
  let goal = $state('');
  let startDate = $state('');
  let endDate = $state('');
  let moveIncompleteToSprintId = $state<number | null>(null);

  let loading = $state(false);
  let errorMsg = $state('');

  // Sprints destination list for completion mode
  let destinationSprints = $derived(
    allSprints.filter((s: Sprint) => s.id !== sprint?.id && s.status !== 'closed')
  );

  onMount(() => {
    if (mode === 'edit' && sprint) {
      name = sprint.name;
      goal = sprint.goal || '';
      startDate = sprint.startDate ? sprint.startDate.split('T')[0] : '';
      endDate = sprint.endDate ? sprint.endDate.split('T')[0] : '';
    } else if (mode === 'start' && sprint) {
      name = sprint.name;
      goal = sprint.goal || '';
      
      // Set start date to today if empty
      const today = new Date().toISOString().split('T')[0];
      startDate = sprint.startDate ? sprint.startDate.split('T')[0] : today;
      
      // Set end date to today + 2 weeks if empty
      if (sprint.endDate) {
        endDate = sprint.endDate.split('T')[0];
      } else {
        const twoWeeksLater = new Date();
        twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
        endDate = twoWeeksLater.toISOString().split('T')[0];
      }
    } else if (mode === 'create') {
      // Default initial states for creating a new sprint
      name = '';
      goal = '';
      startDate = '';
      endDate = '';
    }
  });

  async function handleSubmit(event: Event) {
    event.preventDefault();
    loading = true;
    errorMsg = '';

    try {
      if (mode === 'create') {
        if (!name.trim()) throw new Error(i18n.t('errorNameRequired'));
        await createSprint(
          name.trim(),
          goal.trim(),
          startDate ? startDate : null,
          endDate ? endDate : null
        );
      } else if (mode === 'edit' && sprint) {
        if (!name.trim()) throw new Error(i18n.t('errorNameRequired'));
        await updateSprint(
          sprint.id,
          name.trim(),
          goal.trim(),
          startDate ? startDate : null,
          endDate ? endDate : null,
          sprint.status
        );
      } else if (mode === 'start' && sprint) {
        if (!startDate || !endDate) {
          throw new Error(i18n.t('errorDatesRequired'));
        }
        if (new Date(startDate) > new Date(endDate)) {
          throw new Error(i18n.t('errorStartDateAfterEndDate'));
        }
        await updateSprint(
          sprint.id,
          name.trim(),
          goal.trim(),
          startDate,
          endDate,
          'active'
        );
      } else if (mode === 'complete' && sprint) {
        await completeSprint(sprint.id, moveIncompleteToSprintId);
      }

      onsuccess();
    } catch (err: any) {
      errorMsg = err.message || i18n.t('errorProcessingSprint');
    } finally {
      loading = false;
    }
  }
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
  <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden transition-colors duration-200">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-6 py-4">
      <h2 class="text-lg font-semibold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
        {#if mode === 'create'}
          <Calendar class="w-4.5 h-4.5 text-indigo-500 dark:text-indigo-400" />
          <span>{i18n.t('createSprintTitle')}</span>
        {:else if mode === 'edit'}
          <Calendar class="w-4.5 h-4.5 text-indigo-500 dark:text-indigo-400" />
          <span>{i18n.t('editSprintTitle')}</span>
        {:else if mode === 'start'}
          <Play class="w-4.5 h-4.5 text-green-500 dark:text-green-400 animate-pulse" />
          <span>{i18n.t('startSprintTitle', { name: sprint?.name || '' })}</span>
        {:else if mode === 'complete'}
          <CheckSquare class="w-4.5 h-4.5 text-indigo-500 dark:text-indigo-400" />
          <span>{i18n.t('completeSprintTitle', { name: sprint?.name || '' })}</span>
        {/if}
      </h2>
      <button onclick={onclose} class="text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer">
        <X class="w-5 h-5" />
      </button>
    </div>

    <!-- Form -->
    <form onsubmit={handleSubmit} class="p-6 space-y-4">
      {#if errorMsg}
        <div class="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-xl p-3">
          {errorMsg}
        </div>
      {/if}

      {#if mode === 'create' || mode === 'edit' || mode === 'start'}
        <!-- Name -->
        <div>
          <label for="sprint-name" class="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">{i18n.t('nameLabel')}</label>
          <input
            id="sprint-name"
            type="text"
            bind:value={name}
            placeholder={i18n.t('namePlaceholder')}
            class="w-full bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none transition-all shadow-inner"
            required
            disabled={loading}
          />
        </div>

        <!-- Goal -->
        <div>
          <label for="sprint-goal" class="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">{i18n.t('goalLabel')}</label>
          <textarea
            id="sprint-goal"
            rows="2"
            bind:value={goal}
            placeholder={i18n.t('goalPlaceholder')}
            class="w-full bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none transition-all resize-none shadow-inner"
            disabled={loading}
          ></textarea>
        </div>

        <!-- Dates -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="sprint-start" class="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
              {i18n.t('startDateLabel')} {mode === 'start' ? '*' : ''}
            </label>
            <input
              id="sprint-start"
              type="date"
              bind:value={startDate}
              class="w-full bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none transition-all shadow-sm"
              required={mode === 'start'}
              disabled={loading}
            />
          </div>

          <div>
            <label for="sprint-end" class="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
              {i18n.t('endDateLabel')} {mode === 'start' ? '*' : ''}
            </label>
            <input
              id="sprint-end"
              type="date"
              bind:value={endDate}
              class="w-full bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none transition-all shadow-sm"
              required={mode === 'start'}
              disabled={loading}
            />
          </div>
        </div>
      {:else if mode === 'complete'}
        <!-- Complete Sprint Flow -->
        <div class="space-y-4">
          <p class="text-sm text-zinc-600 dark:text-zinc-400">
            {@html i18n.t('completeSprintDesc', { name: `<strong class="text-zinc-800 dark:text-zinc-200">${sprint?.name || ''}</strong>` })}
          </p>

          <div class="p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl space-y-2 text-xs">
            <h4 class="font-bold text-indigo-700 dark:text-indigo-400">{i18n.t('sprintSummary')}</h4>
            <ul class="space-y-1 text-indigo-600 dark:text-indigo-300">
              <li>• {@html i18n.t('sprintSummaryPoints', { points: `<strong>${sprint?.totalStoryPoints || 0}</strong>` })}</li>
            </ul>
          </div>

          <div>
            <label for="incomplete-dest" class="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">{i18n.t('moveIncompleteTasksTo')}</label>
            <select
              id="incomplete-dest"
              bind:value={moveIncompleteToSprintId}
              class="w-full bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none transition-all shadow-sm"
              disabled={loading}
            >
              <option value={null} class="bg-white text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">{i18n.t('backlogWithoutSprint')}</option>
              {#each destinationSprints as dest}
                <option value={dest.id} class="bg-white text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                  {dest.name} ({dest.status === 'active' ? i18n.t('statusActive') : i18n.t('statusFuture')})
                </option>
              {/each}
            </select>
          </div>
        </div>
      {/if}

      <!-- Actions -->
      <div class="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-3">
        <button
          type="button"
          onclick={onclose}
          class="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-medium rounded-xl text-xs transition-all cursor-pointer border border-zinc-200 dark:border-zinc-800/80 shadow-sm"
          disabled={loading}
        >
          {i18n.t('cancel')}
        </button>

        <button
          type="submit"
          class="px-4 py-2.5 font-medium rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-md
            {mode === 'start'
              ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-600/10'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/10'}"
          disabled={loading}
        >
          {#if loading}
            <Loader2 class="w-3.5 h-3.5 animate-spin" />
            <span>{i18n.t('processing')}</span>
          {:else}
            {#if mode === 'create'}
              <Save class="w-3.5 h-3.5" />
              <span>{i18n.t('createSprintBtn')}</span>
            {:else if mode === 'edit'}
              <Save class="w-3.5 h-3.5" />
              <span>{i18n.t('saveChanges')}</span>
            {:else if mode === 'start'}
              <Play class="w-3.5 h-3.5" />
              <span>{i18n.t('startSprintBtn')}</span>
            {:else if mode === 'complete'}
              <CheckSquare class="w-3.5 h-3.5" />
              <span>{i18n.t('completeSprintBtn')}</span>
            {/if}
          {/if}
        </button>
      </div>
    </form>
  </div>
</div>
