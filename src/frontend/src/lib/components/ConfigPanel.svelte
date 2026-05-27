<script lang="ts">
  import { onMount } from 'svelte';
  import { getStoredConfig, saveConfig, validateConfig, fetchProjects, extractProjectIdentifier, fetchRedmineUrl, loginWithCredentials, type Project } from '../services/api';
  import { i18n } from '../services/i18n.svelte';
  import { Settings, CheckCircle2, AlertCircle, Loader2, User, Key } from '@lucide/svelte';

  // Svelte 5 props
  let { onconfigured } = $props<{ onconfigured: (project: any) => void }>();

  let redmineUrl = $state('');
  let apiKey = $state('');
  let username = $state('');
  let password = $state('');
  let authMethod = $state<'credentials' | 'apikey'>('credentials');
  let selectedProjectId = $state<number | null>(null);
  let projects = $state<Project[]>([]);

  let loading = $state(false);
  let loadingProjects = $state(false);
  let authenticating = $state(false);
  let successMessage = $state('');
  let errorMessage = $state('');
  let projectError = $state('');

  onMount(async () => {
    try {
      const fetchedUrl = await fetchRedmineUrl();
      if (fetchedUrl) {
        redmineUrl = fetchedUrl;
      }
    } catch (err) {
      console.warn('Erro ao obter a URL do Redmine do backend:', err);
    }
    const config = getStoredConfig();
    if (!redmineUrl) {
      redmineUrl = config.redmineUrl;
    }
    apiKey = config.apiKey;

    if (apiKey) {
      authMethod = 'apikey';
      await loadProjects();
    }
  });

  async function handleLogin(e: Event) {
    e.preventDefault();
    if (!username || !password || !redmineUrl) {
      errorMessage = i18n.t('errorAllFieldsRequired');
      return;
    }

    authenticating = true;
    errorMessage = '';
    successMessage = '';

    try {
      const cleanUrl = redmineUrl.replace(/\/$/, "");
      const key = await loginWithCredentials(username.trim(), password, cleanUrl);
      apiKey = key;
      
      const config = getStoredConfig();
      const newConfig = {
        ...config,
        redmineUrl: cleanUrl,
        apiKey: key
      };
      saveConfig(newConfig);
      
      await loadProjects();
    } catch (err: any) {
      errorMessage = err.message || i18n.t('errorInvalidCredentials');
      apiKey = '';
    } finally {
      authenticating = false;
    }
  }

  async function loadProjects() {
    if (!redmineUrl || !apiKey) return;

    loadingProjects = true;
    projectError = '';
    
    try {
      const cleanUrl = redmineUrl.replace(/\/$/, "");
      projects = await fetchProjects(cleanUrl, apiKey.trim());
      
      const config = getStoredConfig();
      if (config.projectUrl && projects.length > 0) {
        const savedIdentifier = extractProjectIdentifier(config.projectUrl);
        const match = projects.find(p => p.identifier === savedIdentifier);
        if (match) {
          selectedProjectId = match.id;
        }
      }
    } catch (err: any) {
      projectError = err.message || 'Failed to load projects from Redmine.';
      projects = [];
    } finally {
      loadingProjects = false;
    }
  }

  async function handleSave(e: Event) {
    e.preventDefault();
    loading = true;
    errorMessage = '';
    successMessage = '';

    if (!redmineUrl || !apiKey || !selectedProjectId) {
      errorMessage = i18n.t('errorAllFieldsRequired');
      loading = false;
      return;
    }

    const cleanUrl = redmineUrl.replace(/\/$/, "");
    const selectedProject = projects.find(p => p.id === selectedProjectId);
    if (!selectedProject) {
      errorMessage = i18n.t('errorInvalidProject');
      loading = false;
      return;
    }

    // Construct full project URL to maintain compatibility with existing extractProjectIdentifier
    const projectUrl = `${cleanUrl}/projects/${selectedProject.identifier}`;

    const newConfig = {
      redmineUrl: cleanUrl,
      apiKey: apiKey.trim(),
      projectUrl: projectUrl
    };

    // Salva temporariamente para a validação ler os headers corretos
    saveConfig(newConfig);

    try {
      const project = await validateConfig();
      successMessage = i18n.t('successConnected', { name: project.name });
      onconfigured(project);
    } catch (err: any) {
      errorMessage = err.message || i18n.t('connectionErrorDesc');
    } finally {
      loading = false;
    }
  }
</script>

<div class="bg-white dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl max-w-lg w-full mx-auto transition-colors duration-200">
  <div class="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-6">
    <div class="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400">
      <Settings class="w-6 h-6" />
    </div>
    <div>
      <h2 class="text-xl font-semibold text-zinc-800 dark:text-zinc-100 font-sans">{i18n.t('configTitle')}</h2>
      <p class="text-xs text-zinc-500 dark:text-zinc-400">{i18n.t('configSubtitle')}</p>
    </div>
  </div>

  <form onsubmit={handleSave} class="space-y-5">
    <div>
      <label for="redmine-url" class="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">{i18n.t('redmineUrlLabel')}</label>
      <input
        id="redmine-url"
        type="url"
        bind:value={redmineUrl}
        placeholder="http://localhost:3000"
        class="w-full bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400 focus:outline-none transition-all cursor-not-allowed"
        readonly
        disabled
      />
    </div>

    <!-- Auth Method Toggle -->
    <div class="space-y-2">
      <span class="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {i18n.t('loginMethodLabel')}
      </span>
      <div class="flex bg-zinc-100 dark:bg-zinc-950/40 p-1 rounded-xl gap-1 border border-zinc-200/80 dark:border-zinc-800/80">
        <button
          type="button"
          onclick={() => { authMethod = 'credentials'; errorMessage = ''; }}
          class="flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer text-center flex items-center justify-center gap-2 {authMethod === 'credentials' ? 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 shadow-sm border border-zinc-200/50 dark:border-zinc-700/35' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400'}"
        >
          <User class="w-3.5 h-3.5" />
          <span>{i18n.t('methodCredentials')}</span>
        </button>
        <button
          type="button"
          onclick={() => { authMethod = 'apikey'; errorMessage = ''; }}
          class="flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer text-center flex items-center justify-center gap-2 {authMethod === 'apikey' ? 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 shadow-sm border border-zinc-200/50 dark:border-zinc-700/35' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400'}"
        >
          <Key class="w-3.5 h-3.5" />
          <span>{i18n.t('methodApiKey')}</span>
        </button>
      </div>
    </div>

    <!-- Credentials Authentication Form Section -->
    {#if authMethod === 'credentials'}
      <div class="space-y-4 p-4 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60">
        <div>
          <label for="username" class="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
            {i18n.t('usernameLabel')}
          </label>
          <input
            id="username"
            type="text"
            bind:value={username}
            placeholder={i18n.t('usernamePlaceholder')}
            class="w-full bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none transition-all shadow-inner"
            required={authMethod === 'credentials'}
          />
        </div>

        <div>
          <label for="password" class="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
            {i18n.t('passwordLabel')}
          </label>
          <input
            id="password"
            type="password"
            bind:value={password}
            placeholder={i18n.t('passwordPlaceholder')}
            class="w-full bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none transition-all shadow-inner"
            required={authMethod === 'credentials'}
          />
        </div>

        <button
          type="button"
          onclick={handleLogin}
          disabled={authenticating || !username || !password}
          class="w-full py-3 bg-zinc-900 hover:bg-zinc-850 dark:bg-zinc-850 dark:hover:bg-zinc-800 disabled:bg-zinc-100 dark:disabled:bg-zinc-900/60 text-white disabled:text-zinc-400 dark:disabled:text-zinc-600 font-semibold rounded-xl text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
        >
          {#if authenticating}
            <Loader2 class="w-4 h-4 animate-spin" />
            <span>{i18n.t('loggingIn')}</span>
          {:else}
            <CheckCircle2 class="w-4 h-4" />
            <span>{i18n.t('loginBtn')}</span>
          {/if}
        </button>
      </div>

      {#if apiKey}
        <div class="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl p-3.5 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <CheckCircle2 class="w-4 h-4" />
            <span class="font-medium">Redmine autenticado com sucesso!</span>
          </div>
          <span class="text-[10px] font-mono opacity-80">Chave obtida</span>
        </div>
      {/if}
    {/if}

    <!-- API Key Authentication Form Section -->
    {#if authMethod === 'apikey'}
      <div>
        <label for="api-key" class="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
          {i18n.t('apiKeyLabel')}
        </label>
        <input
          id="api-key"
          type="password"
          bind:value={apiKey}
          placeholder="Insira sua Redmine API Key..."
          class="w-full bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none transition-all shadow-inner"
          required={authMethod === 'apikey'}
          onchange={loadProjects}
        />
        <span class="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 block">{i18n.t('apiKeyHelp')}</span>
      </div>
    {/if}

    <!-- Project Selection Section -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <label for="project-select" class="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{i18n.t('projectSelectLabel')}</label>
        {#if redmineUrl && apiKey}
          <button
            type="button"
            onclick={loadProjects}
            disabled={loadingProjects}
            class="text-xs text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
          >
            {#if loadingProjects}
              <Loader2 class="w-3 h-3 animate-spin" />
              <span>{i18n.t('fetchingProjects', { url: '' })}</span>
            {:else}
              <span>{i18n.t('reloadProjects')}</span>
            {/if}
          </button>
        {/if}
      </div>

      {#if projects.length > 0}
        <select
          id="project-select"
          bind:value={selectedProjectId}
          class="w-full bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none transition-all shadow-inner"
          required
        >
          <option value={null} disabled selected>{i18n.t('projectSelectPlaceholder')}</option>
          {#each projects as project}
            <option value={project.id}>{project.name}</option>
          {/each}
        </select>
      {:else if loadingProjects}
        <div class="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-200 dark:border-zinc-800/80 rounded-xl text-xs text-zinc-500 dark:text-zinc-400">
          <Loader2 class="w-4 h-4 animate-spin text-indigo-500" />
          <span>{i18n.t('fetchingProjects', { url: redmineUrl })}</span>
        </div>
      {:else}
        <div class="p-4 bg-zinc-50 dark:bg-zinc-950/20 border border-dashed border-zinc-200 dark:border-zinc-800/80 rounded-xl text-center">
          {#if projectError}
            <p class="text-xs text-red-500 dark:text-red-400 mb-2">{projectError}</p>
          {/if}
          <p class="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
            {i18n.t('searchProjectsHelp')}
          </p>
          <button
            type="button"
            onclick={loadProjects}
            disabled={!redmineUrl || !apiKey || loadingProjects}
            class="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 disabled:bg-zinc-100/50 dark:disabled:bg-zinc-800/50 disabled:text-zinc-400 dark:disabled:text-zinc-600 text-indigo-600 dark:text-indigo-400 font-semibold rounded-lg text-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            {#if loadingProjects}
              <Loader2 class="w-3.5 h-3.5 animate-spin" />
            {/if}
            <span>{i18n.t('searchProjectsBtn')}</span>
          </button>
        </div>
      {/if}
    </div>

    <!-- Error/Success Alerts -->
    {#if errorMessage}
      <div class="bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-xs rounded-xl p-3 flex items-start gap-2.5">
        <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
        <span>{errorMessage}</span>
      </div>
    {/if}

    {#if successMessage}
      <div class="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl p-3 flex items-start gap-2.5">
        <CheckCircle2 class="w-4 h-4 shrink-0 mt-0.5" />
        <span>{successMessage}</span>
      </div>
    {/if}

    <!-- Main Submit Button -->
    <button
      type="submit"
      disabled={loading || !apiKey || !selectedProjectId}
      class="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:text-zinc-400 dark:disabled:text-zinc-500 text-white font-medium rounded-xl py-3 text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/10"
    >
      {#if loading}
        <Loader2 class="w-4 h-4 animate-spin" />
        <span>{i18n.t('validatingConnection')}</span>
      {:else}
        <span>{i18n.t('saveAndLoad')}</span>
      {/if}
    </button>
  </form>
</div>
