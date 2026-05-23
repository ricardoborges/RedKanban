<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchIssueDetails, addComment, type IssueDetails, type Journal } from '../services/api';
  import { i18n } from '../services/i18n.svelte';
  import { X, Send, Loader2, MessageSquare, History, User, Calendar, ExternalLink } from '@lucide/svelte';

  // Svelte 5 props
  let { issueId, redmineUrl, onclose, oncommentAdded } = $props<{
    issueId: number;
    redmineUrl: string;
    onclose: () => void;
    oncommentAdded: () => void;
  }>();

  let details = $state<IssueDetails | null>(null);
  let loading = $state(true);
  let commentNotes = $state('');
  let submittingComment = $state(false);
  let errorMsg = $state('');

  let redmineIssueUrl = $derived(details ? `${redmineUrl}/issues/${details.issue.id}` : '');

  onMount(async () => {
    await loadDetails();
  });

  async function loadDetails() {
    loading = true;
    errorMsg = '';
    try {
      details = await fetchIssueDetails(issueId);
    } catch (err: any) {
      errorMsg = err.message || 'Error loading task details.';
    } finally {
      loading = false;
    }
  }

  async function handleSubmitComment() {
    if (!commentNotes.trim()) return;
    submittingComment = true;
    errorMsg = '';
    try {
      await addComment(issueId, commentNotes.trim());
      commentNotes = '';
      // Recarrega os detalhes para mostrar o comentário novo na timeline
      await loadDetails();
      oncommentAdded();
    } catch (err: any) {
      errorMsg = err.message || 'Error adding comment.';
    } finally {
      submittingComment = false;
    }
  }

  // Traduz propriedades do Redmine para uma versão amigável
  function formatPropertyName(property: string, name: string): string {
    const pt: Record<string, string> = {
      status_id: 'Situação',
      assigned_to_id: 'Atribuído para',
      subject: 'Assunto',
      description: 'Descrição',
      priority_id: 'Prioridade',
      project_id: 'Projeto',
    };
    const es: Record<string, string> = {
      status_id: 'Estado',
      assigned_to_id: 'Asignado a',
      subject: 'Asunto',
      description: 'Descripción',
      priority_id: 'Prioridad',
      project_id: 'Proyecto',
    };
    const en: Record<string, string> = {
      status_id: 'Status',
      assigned_to_id: 'Assigned to',
      subject: 'Subject',
      description: 'Description',
      priority_id: 'Priority',
      project_id: 'Project',
    };
    const key = property === 'attr' ? name : property;
    const dict = i18n.currentLanguage === 'pt-br' ? pt : i18n.currentLanguage === 'es' ? es : en;
    return dict[key] || key;
  }
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
  <!-- Modal Content Card -->
  <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden transition-all duration-305">
    
    <!-- Modal Header -->
    <div class="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-6 py-4">
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold text-zinc-400 dark:text-zinc-500">{i18n.t('taskSingular')} #{issueId}</span>
        {#if details}
          <a
            href={redmineIssueUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all flex items-center gap-1 text-xs"
          >
            <span class="hidden sm:inline">{i18n.t('viewOnRedmine')}</span>
            <ExternalLink class="w-3.5 h-3.5" />
          </a>
        {/if}
      </div>
      <button onclick={onclose} class="text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer">
        <X class="w-5 h-5" />
      </button>
    </div>

    <!-- Modal Body -->
    <div class="flex-1 overflow-y-auto p-6 space-y-6">
      {#if loading}
        <div class="flex flex-col items-center justify-center py-20 text-zinc-500 dark:text-zinc-400 gap-3">
          <Loader2 class="w-8 h-8 animate-spin text-indigo-500" />
          <span class="text-sm">{i18n.t('loadingData')}</span>
        </div>
      {:else if errorMsg && !details}
        <div class="text-center py-20 text-red-600 dark:text-red-400">
          <p>{errorMsg}</p>
          <button onclick={loadDetails} class="mt-4 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-800 text-xs cursor-pointer transition-all">
            {i18n.t('reloadProjects')}
          </button>
        </div>
      {:else if details}
        <!-- Issue Core Info -->
        <div class="space-y-4">
          <h2 class="text-2xl font-bold text-zinc-800 dark:text-zinc-100">{details.issue.subject}</h2>
          
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-zinc-50 dark:bg-zinc-950/30 rounded-xl border border-zinc-200 dark:border-zinc-800/50 text-xs transition-colors">
            <div class="flex items-center gap-2.5 text-zinc-600 dark:text-zinc-400">
              <User class="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <div>
                <p class="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">{i18n.t('assignee')}</p>
                <p class="text-zinc-800 dark:text-zinc-200 mt-0.5">{details.issue.assignedToName || i18n.t('unassigned')}</p>
              </div>
            </div>
            <div class="flex items-center gap-2.5 text-zinc-600 dark:text-zinc-400">
              <History class="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <div>
                <p class="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">Status</p>
                <p class="text-zinc-800 dark:text-zinc-200 mt-0.5">{details.issue.statusName}</p>
              </div>
            </div>
            <div class="flex items-center gap-2.5 text-zinc-600 dark:text-zinc-400">
              <Calendar class="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <div>
                <p class="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">{i18n.currentLanguage === 'pt-br' ? 'Última Atualização' : i18n.currentLanguage === 'es' ? 'Última actualización' : 'Last Updated'}</p>
                <p class="text-zinc-800 dark:text-zinc-200 mt-0.5">{i18n.formatDateTime(details.issue.updatedOn)}</p>
              </div>
            </div>
          </div>

          <!-- Description -->
          <div class="space-y-2">
            <h3 class="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{i18n.t('description')}</h3>
            <div class="bg-zinc-50/40 dark:bg-zinc-950/20 border border-zinc-200 dark:border-zinc-800/40 rounded-xl p-4 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {#if details.issue.description}
                {details.issue.description}
              {:else}
                <p class="text-zinc-400 dark:text-zinc-500 italic font-light">{i18n.currentLanguage === 'pt-br' ? 'Sem descrição fornecida.' : i18n.currentLanguage === 'es' ? 'Sin descripción proporcionada.' : 'No description provided.'}</p>
              {/if}
            </div>
          </div>
        </div>

        <hr class="border-zinc-100 dark:border-zinc-800" />

        <!-- History & Journals Timeline -->
        <div class="space-y-4">
          <div class="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
            <MessageSquare class="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <h3 class="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">{i18n.t('comments')}</h3>
          </div>

          {#if details.journals.length === 0}
            <p class="text-xs text-zinc-400 dark:text-zinc-500 italic py-4">{i18n.t('noComments')}</p>
          {:else}
            <div class="relative pl-4 space-y-5 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
              {#each details.journals as journal}
                <!-- Timeline Node -->
                <div class="relative space-y-2 group">
                  <!-- Node Indicator dot -->
                  <div class="absolute -left-[19.5px] top-1 w-2.5 h-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800 border-2 border-white dark:border-zinc-900 group-hover:bg-indigo-500 transition-colors"></div>
                  
                  <div class="flex items-center gap-2 text-xs">
                    <span class="font-semibold text-zinc-700 dark:text-zinc-300">{journal.user}</span>
                    <span class="text-zinc-400 dark:text-zinc-500">•</span>
                    <span class="text-zinc-400 dark:text-zinc-500">{i18n.formatDateTime(journal.createdOn)}</span>
                  </div>

                  <!-- Details of updates (e.g. Status changed) -->
                  {#if journal.details && journal.details.length > 0}
                    <div class="bg-zinc-50 dark:bg-zinc-950/30 rounded-lg p-2 border border-zinc-200 dark:border-zinc-900 text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                      {#each journal.details as detail}
                        <p>
                          <span class="font-medium text-zinc-700 dark:text-zinc-300">{formatPropertyName(detail.property, detail.name)}</span> {i18n.t('changed')} 
                          {#if detail.oldValue}{i18n.t('from')} <span class="text-zinc-400 dark:text-zinc-500">"{detail.oldValue}"</span>{/if}
                          {i18n.t('to')} <span class="text-indigo-600 dark:text-indigo-400">"{detail.newValue}"</span>
                        </p>
                      {/each}
                    </div>
                  {/if}

                  <!-- Comment content (Notes) -->
                  {#if journal.notes}
                    <div class="bg-zinc-50/50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-3.5 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {journal.notes}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Modal Footer / Comment Input -->
    {#if details}
      <div class="border-t border-zinc-100 dark:border-zinc-800 p-4 bg-zinc-50 dark:bg-zinc-900/90">
        <form onsubmit={(e) => { e.preventDefault(); handleSubmitComment(); }} class="flex items-center gap-3">
          <input
            type="text"
            bind:value={commentNotes}
            placeholder={i18n.t('writeCommentPlaceholder')}
            class="flex-1 bg-white dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none transition-all"
            disabled={submittingComment}
          />
          <button
            type="submit"
            disabled={submittingComment || !commentNotes.trim()}
            class="bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 text-white font-medium p-3 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 disabled:text-zinc-400 dark:disabled:text-zinc-600"
          >
            {#if submittingComment}
              <Loader2 class="w-4 h-4 animate-spin" />
            {:else}
              <Send class="w-4 h-4" />
            {/if}
          </button>
        </form>
        {#if errorMsg}
          <p class="text-[11px] text-red-600 dark:text-red-400 mt-2 pl-1">{errorMsg}</p>
        {/if}
      </div>
    {/if}
  </div>
</div>
