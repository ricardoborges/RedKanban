<script lang="ts">
  import { onMount } from 'svelte';
  import {
    fetchProjectFiles,
    addProjectFile,
    deleteProjectFile,
    uploadFile,
    getStoredConfig,
    type ProjectFile
  } from '../services/api';
  import { i18n } from '../services/i18n.svelte';
  import {
    File as FileIcon,
    FolderOpen,
    UploadCloud,
    Download,
    Trash2,
    Loader2,
    Plus,
    Search,
    AlertCircle,
    X,
    FileCheck
  } from '@lucide/svelte';

  let files = $state<ProjectFile[]>([]);
  let loading = $state(true);
  let errorMsg = $state('');
  let successMsg = $state('');
  let searchQuery = $state('');

  // Upload state
  let showUploadModal = $state(false);
  let uploadDescription = $state('');
  let selectedFile = $state<File | null>(null);
  let uploading = $state(false);

  // Filtered files
  let filteredFiles = $derived(
    files.filter(f =>
      (f.filename || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  onMount(async () => {
    await loadFiles();
  });

  async function loadFiles() {
    loading = true;
    errorMsg = '';
    try {
      files = await fetchProjectFiles();
    } catch (err: any) {
      errorMsg = err.message || 'Erro ao carregar arquivos do projeto.';
    } finally {
      loading = false;
    }
  }

  function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      selectedFile = input.files[0];
    } else {
      selectedFile = null;
    }
  }

  async function handleUpload(e: Event) {
    e.preventDefault();
    if (!selectedFile) return;

    uploading = true;
    errorMsg = '';
    successMsg = '';
    try {
      // 1. Upload raw content to Redmine uploads.json
      const result = await uploadFile(selectedFile);

      // 2. Associate the token with the project
      await addProjectFile(result.token, result.filename, uploadDescription);

      // 3. Reset form and reload
      selectedFile = null;
      uploadDescription = '';
      showUploadModal = false;
      successMsg = i18n.currentLanguage === 'pt-br' ? 'Arquivo enviado com sucesso!' : i18n.currentLanguage === 'es' ? '¡Archivo subido con éxito!' : 'File uploaded successfully!';
      
      // Auto-hide success toast
      setTimeout(() => {
        successMsg = '';
      }, 4000);

      await loadFiles();
    } catch (err: any) {
      errorMsg = err.message || 'Erro ao enviar o arquivo.';
    } finally {
      uploading = false;
    }
  }

  async function handleDelete(fileId: number, filename: string) {
    const confirmMsg = i18n.currentLanguage === 'pt-br'
      ? `Deseja realmente excluir o arquivo "${filename}"?`
      : i18n.currentLanguage === 'es'
      ? `¿Realmente deseja eliminar el archivo "${filename}"?`
      : `Are you sure you want to delete "${filename}"?`;

    if (!confirm(confirmMsg)) return;

    errorMsg = '';
    successMsg = '';
    try {
      await deleteProjectFile(fileId);
      successMsg = i18n.currentLanguage === 'pt-br' ? 'Arquivo excluído com sucesso!' : i18n.currentLanguage === 'es' ? '¡Archivo eliminado con éxito!' : 'File deleted successfully!';
      
      setTimeout(() => {
        successMsg = '';
      }, 4000);

      await loadFiles();
    } catch (err: any) {
      errorMsg = err.message || 'Erro ao excluir o arquivo.';
    }
  }

  function getDownloadUrl(file: ProjectFile) {
    const config = getStoredConfig();
    return `${file.content_url}?key=${config.apiKey}`;
  }

  function formatBytes(bytes: number, decimals = 1) {
    if (!bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return '';
    try {
      return i18n.formatDateTime(new Date(dateStr));
    } catch (err) {
      return dateStr;
    }
  }
</script>

<div class="space-y-4">
  <!-- Actions bar -->
  <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 p-4 rounded-2xl shadow-sm">
    <div class="relative flex-1 max-w-md">
      <Search class="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder={i18n.currentLanguage === 'pt-br' ? 'Buscar arquivos...' : i18n.currentLanguage === 'es' ? 'Buscar archivos...' : 'Search files...'}
        class="w-full pl-10 pr-4 py-2 bg-zinc-50 hover:bg-zinc-100/70 focus:bg-white dark:bg-zinc-950/40 dark:hover:bg-zinc-950/80 dark:focus:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-zinc-700 dark:text-zinc-300"
      />
    </div>

    <button
      onclick={() => (showUploadModal = true)}
      class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/10"
    >
      <Plus class="w-4 h-4" />
      <span>{i18n.currentLanguage === 'pt-br' ? 'Novo Arquivo' : i18n.currentLanguage === 'es' ? 'Nuevo Archivo' : 'New File'}</span>
    </button>
  </div>

  <!-- Messages -->
  {#if errorMsg}
    <div class="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-xl p-3.5 flex items-start gap-2.5 shadow-sm">
      <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
      <span>{errorMsg}</span>
    </div>
  {/if}

  {#if successMsg}
    <div class="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl p-3.5 flex items-start gap-2.5 shadow-sm animate-pulse">
      <FileCheck class="w-4 h-4 shrink-0 mt-0.5" />
      <span>{successMsg}</span>
    </div>
  {/if}

  <!-- Files List container -->
  <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm flex flex-col">
    {#if loading}
      <div class="flex flex-col items-center justify-center py-24 text-zinc-550 dark:text-zinc-400 gap-3">
        <Loader2 class="w-8 h-8 animate-spin text-indigo-500" />
        <span class="text-xs font-semibold">{i18n.currentLanguage === 'pt-br' ? 'Carregando arquivos...' : i18n.currentLanguage === 'es' ? 'Cargando archivos...' : 'Loading files...'}</span>
      </div>
    {:else if filteredFiles.length === 0}
      <div class="text-center py-20 px-6 flex flex-col items-center justify-center gap-4">
        <div class="p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-full text-indigo-600 dark:text-indigo-400">
          <FolderOpen class="w-8 h-8" />
        </div>
        <div class="space-y-1">
          <h3 class="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            {searchQuery
              ? (i18n.currentLanguage === 'pt-br' ? 'Nenhum resultado' : i18n.currentLanguage === 'es' ? 'Sin resultados' : 'No results found')
              : (i18n.currentLanguage === 'pt-br' ? 'Nenhum arquivo' : i18n.currentLanguage === 'es' ? 'Sin archivos' : 'No files')}
          </h3>
          <p class="text-xs text-zinc-550 dark:text-zinc-450 max-w-sm mx-auto leading-relaxed">
            {searchQuery
              ? (i18n.currentLanguage === 'pt-br' ? 'Tente ajustar sua busca para encontrar o arquivo correspondente.' : i18n.currentLanguage === 'es' ? 'Intente ajustar su búsqueda para encontrar el archivo.' : 'Try adjusting your search terms to find the matching file.')
              : (i18n.currentLanguage === 'pt-br' ? 'Este projeto do Redmine ainda não possui arquivos associados.' : i18n.currentLanguage === 'es' ? 'Este proyecto de Redmine aún no tiene archivos asociados.' : 'This Redmine project does not have any files uploaded yet.')}
          </p>
        </div>
        {#if !searchQuery}
          <button
            onclick={() => (showUploadModal = true)}
            class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer shadow shadow-indigo-600/10"
          >
            {i18n.currentLanguage === 'pt-br' ? 'Enviar Primeiro Arquivo' : i18n.currentLanguage === 'es' ? 'Subir primer archivo' : 'Upload First File'}
          </button>
        {/if}
      </div>
    {:else}
      <!-- Responsive table container -->
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 text-2xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-450">
              <th class="py-3.5 px-4">{i18n.currentLanguage === 'pt-br' ? 'Arquivo' : i18n.currentLanguage === 'es' ? 'Archivo' : 'File'}</th>
              <th class="py-3.5 px-4">{i18n.currentLanguage === 'pt-br' ? 'Descrição' : i18n.currentLanguage === 'es' ? 'Descripción' : 'Description'}</th>
              <th class="py-3.5 px-4">{i18n.currentLanguage === 'pt-br' ? 'Data' : i18n.currentLanguage === 'es' ? 'Fecha' : 'Date'}</th>
              <th class="py-3.5 px-4 text-right">{i18n.currentLanguage === 'pt-br' ? 'Tamanho' : i18n.currentLanguage === 'es' ? 'Tamaño' : 'Size'}</th>
              <th class="py-3.5 px-4 text-center">{i18n.currentLanguage === 'pt-br' ? 'Downloads' : i18n.currentLanguage === 'es' ? 'Descargas' : 'Downloads'}</th>
              <th class="py-3.5 px-4">{i18n.currentLanguage === 'pt-br' ? 'Autor' : i18n.currentLanguage === 'es' ? 'Autor' : 'Author'}</th>
              <th class="py-3.5 px-4 text-center">{i18n.currentLanguage === 'pt-br' ? 'Ações' : i18n.currentLanguage === 'es' ? 'Acciones' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-200/60 dark:divide-zinc-800/80">
            {#each filteredFiles as file}
              <tr class="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/10 transition-colors">
                <td class="py-3.5 px-4 min-w-[200px]">
                  <div class="flex items-center gap-2.5">
                    <div class="p-1.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400">
                      <FileIcon class="w-4 h-4" />
                    </div>
                    <a
                      href={getDownloadUrl(file)}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline truncate max-w-[250px]"
                      title={file.filename}
                    >
                      {file.filename}
                    </a>
                  </div>
                </td>
                <td class="py-3.5 px-4 text-xs text-zinc-500 dark:text-zinc-400 max-w-[300px] truncate" title={file.description}>
                  {file.description || '-'}
                </td>
                <td class="py-3.5 px-4 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                  {formatDate(file.created_on)}
                </td>
                <td class="py-3.5 px-4 text-xs font-medium text-zinc-600 dark:text-zinc-350 text-right whitespace-nowrap">
                  {formatBytes(file.filesize)}
                </td>
                <td class="py-3.5 px-4 text-xs text-zinc-500 dark:text-zinc-400 text-center font-bold">
                  {file.downloads}
                </td>
                <td class="py-3.5 px-4 text-xs text-zinc-600 dark:text-zinc-350 whitespace-nowrap font-medium">
                  {file.author?.name || '-'}
                </td>
                <td class="py-3.5 px-4 text-center">
                  <div class="flex items-center justify-center gap-1.5">
                    <a
                      href={getDownloadUrl(file)}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="p-1.5 text-zinc-450 hover:text-indigo-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                      title={i18n.currentLanguage === 'pt-br' ? 'Baixar arquivo' : i18n.currentLanguage === 'es' ? 'Descargar archivo' : 'Download file'}
                    >
                      <Download class="w-3.5 h-3.5" />
                    </a>
                    <button
                      onclick={() => handleDelete(file.id, file.filename)}
                      class="p-1.5 text-zinc-450 hover:text-red-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                      title={i18n.currentLanguage === 'pt-br' ? 'Excluir arquivo' : i18n.currentLanguage === 'es' ? 'Eliminar archivo' : 'Delete file'}
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>

<!-- Upload Modal (Styled exactly like standard RedKanban modals) -->
{#if showUploadModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all"
    onclick={() => !uploading && (showUploadModal = false)}
  >
    <div
      class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden transform transition-all"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-zinc-200 dark:border-zinc-850 flex items-center justify-between">
        <h3 class="text-sm font-bold text-zinc-850 dark:text-zinc-100 uppercase tracking-wider">
          {i18n.currentLanguage === 'pt-br' ? 'Enviar Arquivo para o Projeto' : i18n.currentLanguage === 'es' ? 'Subir archivo al proyecto' : 'Upload File to Project'}
        </h3>
        <button
          onclick={() => (showUploadModal = false)}
          disabled={uploading}
          class="p-1.5 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-350 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Modal Content Form -->
      <form onsubmit={handleUpload} class="p-6 space-y-4">
        <!-- File Input -->
        <div class="space-y-1.5">
          <label for="file-input" class="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            {i18n.currentLanguage === 'pt-br' ? 'Arquivo' : i18n.currentLanguage === 'es' ? 'Archivo' : 'File'}
          </label>
          
          <div class="relative border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 transition-all cursor-pointer">
            <input
              id="file-input"
              type="file"
              required
              disabled={uploading}
              onchange={handleFileChange}
              class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <UploadCloud class="w-8 h-8 text-indigo-500 dark:text-indigo-400" />
            <span class="text-xs font-semibold text-zinc-700 dark:text-zinc-350">
              {selectedFile ? selectedFile.name : (i18n.currentLanguage === 'pt-br' ? 'Escolher arquivo...' : i18n.currentLanguage === 'es' ? 'Seleccionar archivo...' : 'Choose file...')}
            </span>
            {#if selectedFile}
              <span class="text-[10px] text-zinc-400 dark:text-zinc-500">
                {formatBytes(selectedFile.size)}
              </span>
            {:else}
              <span class="text-[10px] text-zinc-400 dark:text-zinc-500">
                {i18n.currentLanguage === 'pt-br' ? 'Selecione qualquer arquivo para enviar.' : i18n.currentLanguage === 'es' ? 'Seleccione un archivo para subir.' : 'Select a file to upload.'}
              </span>
            {/if}
          </div>
        </div>

        <!-- Description Input -->
        <div class="space-y-1.5">
          <label for="file-desc" class="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            {i18n.currentLanguage === 'pt-br' ? 'Descrição (Opcional)' : i18n.currentLanguage === 'es' ? 'Descripción (Opcional)' : 'Description (Optional)'}
          </label>
          <input
            id="file-desc"
            type="text"
            bind:value={uploadDescription}
            disabled={uploading}
            placeholder={i18n.currentLanguage === 'pt-br' ? 'Ex: Relatório Mensal de Progresso' : i18n.currentLanguage === 'es' ? 'Ej: Reporte Mensual de Progreso' : 'E.g., Monthly Progress Report'}
            class="w-full px-3 py-2 bg-zinc-50 hover:bg-zinc-100/70 focus:bg-white dark:bg-zinc-950/40 dark:hover:bg-zinc-950/80 dark:focus:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-zinc-700 dark:text-zinc-300"
          />
        </div>

        <!-- Modal Footer -->
        <div class="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-850">
          <button
            type="button"
            disabled={uploading}
            onclick={() => (showUploadModal = false)}
            class="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs rounded-xl transition-all cursor-pointer"
          >
            {i18n.currentLanguage === 'pt-br' ? 'Cancelar' : i18n.currentLanguage === 'es' ? 'Cancelar' : 'Cancel'}
          </button>
          
          <button
            type="submit"
            disabled={!selectedFile || uploading}
            class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-250 dark:disabled:bg-zinc-800 text-white font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/10"
          >
            {#if uploading}
              <Loader2 class="w-3.5 h-3.5 animate-spin" />
              <span>{i18n.currentLanguage === 'pt-br' ? 'Enviando...' : i18n.currentLanguage === 'es' ? 'Subiendo...' : 'Uploading...'}</span>
            {:else}
              <UploadCloud class="w-3.5 h-3.5" />
              <span>{i18n.currentLanguage === 'pt-br' ? 'Enviar Arquivo' : i18n.currentLanguage === 'es' ? 'Subir Archivo' : 'Upload File'}</span>
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
