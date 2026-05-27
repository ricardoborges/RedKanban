<script lang="ts">
  import { createIssue, moveIssueToSprint, uploadFile, type Issue, type Status, type User as RedmineUser } from '../services/api';
  import { i18n } from '../services/i18n.svelte';
  import { Plus, X, Loader2 } from '@lucide/svelte';

  // Svelte 5 props
  let {
    statuses = [],
    users = [],
    defaultStatusId = 0,
    sprintId = null,
    onclose,
    onsuccess
  } = $props<{
    statuses: Status[];
    users: RedmineUser[];
    defaultStatusId?: number;
    sprintId?: number | null;
    onclose: () => void;
    onsuccess: (newIssue: Issue) => void;
  }>();

  let subject = $state('');
  let description = $state('');
  let statusId = $state<number>(defaultStatusId || (statuses[0]?.id || 0));
  let assignedToId = $state<number | null>(null);
  let creating = $state(false);
  let errorMsg = $state('');

  // File attachments state
  let attachments = $state<{ token: string; filename: string; contentType: string }[]>([]);
  let uploadingFiles = $state(false);
  let fileError = $state('');

  async function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    uploadingFiles = true;
    fileError = '';
    
    const filesArray = Array.from(input.files);
    
    try {
      const uploadPromises = filesArray.map(async (file) => {
        const uploadResult = await uploadFile(file);
        return uploadResult;
      });
      
      const results = await Promise.all(uploadPromises);
      attachments = [...attachments, ...results];
    } catch (err: any) {
      console.error(err);
      fileError = err.message || i18n.t('uploadFailed');
    } finally {
      uploadingFiles = false;
      input.value = ''; // Reset input
    }
  }

  function removeAttachment(index: number) {
    attachments = attachments.filter((_, i) => i !== index);
  }

  async function handleCreate() {
    if (!subject.trim()) return;
    creating = true;
    errorMsg = '';
    try {
      const newIssue = await createIssue(
        subject.trim(),
        description.trim(),
        statusId,
        assignedToId,
        attachments
      );

      // If a sprintId is provided, associate the task with it immediately
      if (sprintId !== null) {
        try {
          await moveIssueToSprint(newIssue.id, sprintId);
          newIssue.sprintId = sprintId;
        } catch (sprintErr) {
          console.warn('Erro ao associar nova tarefa à sprint:', sprintErr);
        }
      }

      onsuccess(newIssue);
    } catch (err: any) {
      errorMsg = err.message || 'Error creating task on Redmine.';
    } finally {
      creating = false;
    }
  }
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
  <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden transition-colors duration-200">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-6 py-4">
      <h2 class="text-lg font-semibold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
        <Plus class="w-4.5 h-4.5 text-indigo-500 dark:text-indigo-400" />
        <span>{i18n.t('newTask')}</span>
      </h2>
      <button onclick={onclose} class="text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer">
        <X class="w-5 h-5" />
      </button>
    </div>

    <!-- Form -->
    <form onsubmit={(e) => { e.preventDefault(); handleCreate(); }} class="p-6 space-y-4">
      <div>
        <label for="new-subject" class="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">{i18n.currentLanguage === 'pt-br' ? 'Título / Assunto' : i18n.currentLanguage === 'es' ? 'Título / Asunto' : 'Title / Subject'}</label>
        <input
          id="new-subject"
          type="text"
          bind:value={subject}
          placeholder={i18n.currentLanguage === 'pt-br' ? 'Digite o título da tarefa...' : i18n.currentLanguage === 'es' ? 'Escriba el título de la tarefa...' : 'Enter task title...'}
          class="w-full bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none transition-all shadow-inner"
          required
          disabled={creating}
        />
      </div>

      <div>
        <label for="new-desc" class="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">{i18n.t('description')}</label>
        <textarea
          id="new-desc"
          rows="3"
          bind:value={description}
          placeholder={i18n.currentLanguage === 'pt-br' ? 'Digite a descrição detalhada da tarefa...' : i18n.currentLanguage === 'es' ? 'Escriba la descripción detalada de la tarea...' : 'Enter detailed description...'}
          class="w-full bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none transition-all resize-none shadow-inner"
          disabled={creating}
        ></textarea>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="new-status" class="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">{i18n.currentLanguage === 'pt-br' ? 'Coluna / Status' : i18n.currentLanguage === 'es' ? 'Columna / Estado' : 'Column / Status'}</label>
          <select
            id="new-status"
            bind:value={statusId}
            class="w-full bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none transition-all shadow-sm cursor-pointer"
            disabled={creating}
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
            bind:value={assignedToId}
            class="w-full bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none transition-all shadow-sm cursor-pointer"
            disabled={creating}
          >
            <option value={null} class="bg-white text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500 italic">{i18n.t('unassigned')}</option>
            {#each users as u}
              <option value={u.id} class="bg-white text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">{u.name}</option>
            {/each}
          </select>
        </div>
      </div>

      <!-- File Attachments Section -->
      <div class="space-y-2">
        <label class="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {i18n.t('attachmentsLabel')}
        </label>
        
        <!-- File list -->
        {#if attachments.length > 0}
          <div class="space-y-1.5 max-h-32 overflow-y-auto mb-2">
            {#each attachments as att, idx}
              <div class="flex items-center justify-between gap-2 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl text-xs">
                <span class="truncate text-zinc-700 dark:text-zinc-350 max-w-[320px] font-medium">{att.filename}</span>
                <button
                  type="button"
                  onclick={() => removeAttachment(idx)}
                  class="text-zinc-400 hover:text-red-500 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 p-1 rounded-lg transition-colors cursor-pointer"
                  title="Remover anexo"
                >
                  <X class="w-3.5 h-3.5" />
                </button>
              </div>
            {/each}
          </div>
        {/if}

        <!-- Upload file button -->
        <div class="flex items-center gap-2">
          <label
            class="px-4 py-2 bg-zinc-100 hover:bg-zinc-200/60 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold rounded-xl text-xs cursor-pointer border border-zinc-200 dark:border-zinc-800/80 shadow-sm inline-flex items-center gap-1.5 transition-all"
          >
            {#if uploadingFiles}
              <Loader2 class="w-3.5 h-3.5 animate-spin" />
              <span>{i18n.t('uploadingFile')}</span>
            {:else}
              <Plus class="w-3.5 h-3.5" />
              <span>{i18n.t('attachFile')}</span>
            {/if}
            <input
              type="file"
              multiple
              onchange={handleFileChange}
              class="hidden"
              disabled={uploadingFiles || creating}
            />
          </label>

          {#if fileError}
            <span class="text-2xs font-semibold text-red-500 dark:text-red-400">{fileError}</span>
          {/if}
        </div>
      </div>

      {#if errorMsg}
        <p class="text-xs text-red-600 dark:text-red-400 font-medium pl-1">{errorMsg}</p>
      {/if}

      <div class="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-3">
        <button
          type="button"
          onclick={onclose}
          class="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200/50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-medium rounded-xl text-xs transition-all cursor-pointer border border-zinc-200 dark:border-zinc-800/80 shadow-sm"
          disabled={creating}
        >
          {i18n.t('cancel')}
        </button>
        <button
          type="submit"
          class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-600/10"
          disabled={creating || !subject.trim() || uploadingFiles}
        >
          {#if creating}
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
