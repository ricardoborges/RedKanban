<script lang="ts">
  import { onMount } from 'svelte';
  import ConfigPanel from '$lib/components/ConfigPanel.svelte';
  import StatusConfigPanel from '$lib/components/StatusConfigPanel.svelte';
  import CardStyleConfigPanel from '$lib/components/CardStyleConfigPanel.svelte';
  import KanbanBoard from '$lib/components/KanbanBoard.svelte';
  import { getStoredConfig, validateConfig, fetchCurrentUser, type User as RedmineUser } from '$lib/services/api';
  import { i18n } from '$lib/services/i18n.svelte';
  import { Kanban, ShieldAlert, Sparkles, Sun, Moon } from '@lucide/svelte';

  let configured = $state(false);
  let hasColumnsConfigured = $state(false);
  let hasCardStyleConfigured = $state(false);
  let checkingConfig = $state(true);
  let redmineUrl = $state('');
  let projectName = $state('');
  let showSettings = $state(false);
  let settingsTab = $state<'connection' | 'columns' | 'cardStyle'>('connection');
  let theme = $state('light');
  let currentUser = $state<RedmineUser | null>(null);

  let userInitials = $derived(
    currentUser && currentUser.name
      ? currentUser.name
          .split(' ')
          .slice(0, 2)
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
      : ''
  );

  onMount(async () => {
    theme = localStorage.getItem('theme') || 'light';
    await checkInitialConfig();
  });

  $effect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  });

  function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light';
  }

  async function loadCurrentUser() {
    try {
      currentUser = await fetchCurrentUser();
    } catch (err) {
      console.warn('Erro ao carregar usuário atual:', err);
      currentUser = null;
    }
  }

  async function checkInitialConfig() {
    checkingConfig = true;
    const config = getStoredConfig();
    const columnsOrder = localStorage.getItem('kanban_status_order');
    hasColumnsConfigured = !!columnsOrder;
    hasCardStyleConfigured = !!localStorage.getItem('kanban_my_card_color');

    if (config.redmineUrl && config.apiKey && config.projectUrl) {
      try {
        const project = await validateConfig();
        redmineUrl = config.redmineUrl;
        projectName = project.name;
        configured = true;

        if (!hasColumnsConfigured) {
          // Fase 2 pendente: redireciona para a configuração de colunas
          showSettings = true;
          settingsTab = 'columns';
        } else if (!hasCardStyleConfigured) {
          // Fase 3 pendente: redireciona para a configuração de estilo
          showSettings = true;
          settingsTab = 'cardStyle';
        } else {
          showSettings = false;
        }
        await loadCurrentUser();
      } catch (err) {
        console.warn('Configuração salva é inválida:', err);
        configured = false;
        showSettings = true;
        settingsTab = 'connection';
      }
    } else {
      configured = false;
      showSettings = true;
      settingsTab = 'connection';
    }
    checkingConfig = false;
  }

  function handleConnectionConfigured(project: any) {
    const config = getStoredConfig();
    redmineUrl = config.redmineUrl;
    projectName = project.name;
    configured = true;

    const columnsOrder = localStorage.getItem('kanban_status_order');
    hasColumnsConfigured = !!columnsOrder;
    hasCardStyleConfigured = !!localStorage.getItem('kanban_my_card_color');

    // Transiciona para a Fase 2 (Configuração de Colunas)
    settingsTab = 'columns';
    showSettings = true;
    loadCurrentUser();
  }

  function handleColumnsConfigured() {
    hasColumnsConfigured = true;
    hasCardStyleConfigured = !!localStorage.getItem('kanban_my_card_color');
    if (!hasCardStyleConfigured) {
      settingsTab = 'cardStyle';
    } else {
      showSettings = false;
    }
  }

  function handleCardStyleConfigured() {
    hasCardStyleConfigured = true;
    showSettings = false;
  }

  function openSettings() {
    showSettings = true;
    settingsTab = 'columns'; // Foca na aba de colunas por padrão
  }

  function closeSettings() {
    if (configured && hasColumnsConfigured && hasCardStyleConfigured) {
      showSettings = false;
    }
  }
</script>

<svelte:head>
  <title>RedKanban - Redmine Integration</title>
</svelte:head>

<main class="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 flex flex-col antialiased transition-colors duration-200">
  <!-- Navbar -->
  <header class="bg-white/60 dark:bg-zinc-900/40 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800/80 px-6 py-4 flex items-center justify-between static sm:sticky top-0 z-40 transition-colors duration-200">
    <div class="flex items-center gap-3">
      <div class="p-2 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl text-white shadow-lg shadow-indigo-600/20">
        <Kanban class="w-5 h-5" />
      </div>
      <div>
        <span class="text-base font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
          RedKanban
        </span>
        {#if configured && !checkingConfig}
          <span class="hidden sm:inline-flex items-center gap-1.5 ml-3 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 transition-colors duration-200">
            <span class="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-pulse"></span>
            {projectName}
          </span>
        {/if}
      </div>
    </div>

    <div class="flex items-center gap-3">
      {#if currentUser}
        <div class="flex items-center gap-2 px-3 py-1.5 bg-zinc-100/85 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-xl transition-all">
          <div class="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold flex items-center justify-center border border-indigo-200 dark:border-indigo-500/20 shadow-sm shrink-0">
            {userInitials}
          </div>
          <span class="text-xs font-semibold text-zinc-700 dark:text-zinc-300 hidden sm:inline max-w-[150px] truncate">
            {currentUser.name}
          </span>
        </div>
      {/if}

      <!-- Language Selector -->
      <select
        value={i18n.currentLanguage}
        onchange={(e) => i18n.setLanguage(e.currentTarget.value as any)}
        class="p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900/50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow text-xs font-semibold focus:outline-none"
        aria-label="Language Selector"
      >
        <option value="en">EN</option>
        <option value="pt-br">PT</option>
        <option value="es">ES</option>
      </select>

      <!-- Theme Switcher Toggle -->
      <button
        onclick={toggleTheme}
        class="p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900/50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow"
        title={i18n.t('themeToggle')}
        aria-label={i18n.t('themeToggle')}
      >
        {#if theme === 'light'}
          <Moon class="w-4 h-4" />
        {:else}
          <Sun class="w-4 h-4" />
        {/if}
      </button>

      {#if configured && hasColumnsConfigured && hasCardStyleConfigured && showSettings}
        <button
          onclick={closeSettings}
          class="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold rounded-xl transition-all cursor-pointer border border-zinc-200 dark:border-zinc-800/80 shadow-sm"
        >
          {i18n.t('backToBoard')}
        </button>
      {/if}
    </div>
  </header>

  <!-- Content -->
  <div class="flex-1 p-6 flex flex-col justify-center">
    {#if checkingConfig}
      <div class="flex flex-col items-center justify-center space-y-3">
        <div class="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin"></div>
        <span class="text-sm text-zinc-500 dark:text-zinc-400">{i18n.t('checkingCredentials')}</span>
      </div>
    {:else if showSettings}
      <div class="py-8 max-w-lg w-full mx-auto space-y-6">
        <!-- Tabs for settings (visible only when project is validated/configured) -->
        {#if configured}
          <div class="flex bg-zinc-200/60 dark:bg-zinc-900/80 p-1 rounded-2xl gap-1 border border-zinc-200 dark:border-zinc-800/65">
            <button
              onclick={() => (settingsTab = 'connection')}
              class="flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer text-center {settingsTab === 'connection' ? 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400'}"
            >
              {i18n.t('connectionAndProject')}
            </button>
            <button
              onclick={() => (settingsTab = 'columns')}
              class="flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer text-center {settingsTab === 'columns' ? 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400'}"
            >
              {i18n.t('kanbanColumns')}
            </button>
            <button
              onclick={() => (settingsTab = 'cardStyle')}
              class="flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer text-center {settingsTab === 'cardStyle' ? 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400'}"
            >
              {i18n.t('cardStyle')}
            </button>
          </div>
        {/if}

        {#if settingsTab === 'connection'}
          <ConfigPanel onconfigured={handleConnectionConfigured} />
        {:else if settingsTab === 'columns'}
          <StatusConfigPanel
            onconfigured={handleColumnsConfigured}
            oncancel={configured && hasColumnsConfigured && hasCardStyleConfigured ? closeSettings : undefined}
          />
        {:else if settingsTab === 'cardStyle'}
          <CardStyleConfigPanel
            onconfigured={handleCardStyleConfigured}
            oncancel={configured && hasColumnsConfigured && hasCardStyleConfigured ? closeSettings : undefined}
          />
        {/if}
      </div>
    {:else if configured && hasColumnsConfigured && hasCardStyleConfigured}
      <div class="flex-1">
        <KanbanBoard {redmineUrl} {projectName} onOpenSettings={openSettings} />
      </div>
    {:else}
      <!-- Fallback when config error and no settings shown -->
      <div class="max-w-md mx-auto text-center space-y-4">
        <ShieldAlert class="w-12 h-12 text-red-500 dark:text-red-400 mx-auto" />
        <h2 class="text-lg font-semibold text-zinc-800 dark:text-zinc-200">{i18n.t('connectionErrorTitle')}</h2>
        <p class="text-sm text-zinc-500 dark:text-zinc-400">{i18n.t('connectionErrorDesc')}</p>
        <button
          onclick={openSettings}
          class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs transition-all cursor-pointer"
        >
          {i18n.t('adjustSettingsBtn')}
        </button>
      </div>
    {/if}
  </div>
</main>
