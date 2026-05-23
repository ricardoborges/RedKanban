<script lang="ts">
  import { onMount } from 'svelte';
  import { i18n } from '../services/i18n.svelte';
  import { Paintbrush, Check, RotateCcw, User, ExternalLink } from '@lucide/svelte';

  let { onconfigured, oncancel } = $props<{
    onconfigured: () => void;
    oncancel?: () => void;
  }>();

  let color = $state('#c7ecff');
  let isEditing = $state(false);

  onMount(() => {
    const savedColor = localStorage.getItem('kanban_my_card_color');
    if (savedColor) {
      color = savedColor;
      isEditing = true;
    }
  });

  // Determina se a cor hex é válida
  let isValidHex = $derived(/^#[0-9A-F]{6}$/i.test(color));

  // Determina a cor do texto para contraste com base no brilho (Luma YIQ)
  let contrastColor = $derived.by(() => {
    if (!isValidHex) return 'text-zinc-900';
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? 'text-zinc-900' : 'text-white';
  });

  function handleSave() {
    if (!isValidHex) return;
    localStorage.setItem('kanban_my_card_color', color);
    onconfigured();
  }

  function handleReset() {
    color = '#c7ecff';
  }
</script>

<div class="bg-white dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl max-w-lg w-full mx-auto transition-colors duration-200">
  <!-- Header -->
  <div class="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-6">
    <div class="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400">
      <Paintbrush class="w-6 h-6" />
    </div>
    <div>
      <h2 class="text-xl font-semibold text-zinc-800 dark:text-zinc-100 font-sans">{i18n.t('styleTitle')}</h2>
      <p class="text-xs text-zinc-500 dark:text-zinc-400">{i18n.t('styleSubtitle')}</p>
    </div>
  </div>

  <div class="space-y-6">
    <!-- Color Inputs Group -->
    <div class="space-y-3">
      <label for="card-color" class="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{i18n.t('myTasksColor')}</label>
      
      <div class="flex items-center gap-3">
        <!-- Color Picker Box -->
        <div class="relative w-12 h-12 rounded-xl overflow-hidden border border-zinc-300 dark:border-zinc-700 shrink-0 shadow-sm transition-all duration-100 hover:scale-100">
          <input
            id="card-color"
            type="color"
            bind:value={color}
            class="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
          />
        </div>

        <!-- Hex input -->
        <div class="flex-1">
          <input
            type="text"
            bind:value={color}
            placeholder="#c7ecff"
            maxlength="7"
            class="w-full bg-white dark:bg-zinc-950/50 border {isValidHex ? 'border-zinc-200 dark:border-zinc-800 focus:border-indigo-500' : 'border-red-500 focus:border-red-500'} rounded-xl px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none transition-all shadow-inner font-mono uppercase"
          />
        </div>

        <!-- Reset Button -->
        <button
          type="button"
          onclick={handleReset}
          class="p-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl transition-all cursor-pointer border border-zinc-200 dark:border-zinc-800/80 shadow-sm"
          title="Restore default"
        >
          <RotateCcw class="w-4 h-4" />
        </button>
      </div>

      {#if !isValidHex}
        <p class="text-xs text-red-500">
          {i18n.currentLanguage === 'pt-br' ? 'Por favor, insira um código hexadecimal válido (ex: #C7ECFF).' : i18n.currentLanguage === 'es' ? 'Por favor, introduzca un código hexadecimal válido (ej: #C7ECFF).' : 'Please enter a valid hexadecimal code (e.g. #C7ECFF).'}
        </p>
      {/if}
    </div>

    <!-- Live Preview Card Section -->
    <div class="space-y-3">
      <span class="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{i18n.t('previewTitle')}</span>
      
      <div class="p-6 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200/80 dark:border-zinc-800/40 rounded-2xl transition-all">
        <!-- The Preview Card -->
        <div
          class="rounded-xl p-4 shadow-md transition-all duration-200 border flex flex-col justify-between min-h-[120px] select-none"
          style={isValidHex ? `background-color: ${color}; border-color: ${color}cc; color: ${contrastColor === 'text-white' ? '#ffffff' : '#18181b'}` : ''}
        >
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-semibold opacity-60">#123</span>
              <span class="opacity-60">
                <ExternalLink class="w-3.5 h-3.5" />
              </span>
            </div>

            <h3 class="text-sm font-semibold line-clamp-2 leading-snug">
              {i18n.currentLanguage === 'pt-br' ? 'Esta tarefa está atribuída a você!' : i18n.currentLanguage === 'es' ? '¡Esta tarea está asignada a usted!' : 'This task is assigned to you!'}
            </h3>

            <p class="text-xs mt-1.5 line-clamp-2 font-light opacity-80">
              {i18n.currentLanguage === 'pt-br' ? 'O card mudará de cor automaticamente para destacar na sua tela de forma visual.' : i18n.currentLanguage === 'es' ? 'La tarjeta cambiará de color automáticamente para destacar en su pantalla de forma visual.' : 'The card will change color automatically to highlight on your screen visually.'}
            </p>
          </div>

          <div class="flex items-center justify-between mt-4 pt-3 border-t border-black/10 dark:border-white/10">
            <div class="flex items-center gap-2">
              <div class="w-5 h-5 rounded-full bg-black/5 dark:bg-white/10 text-[9px] font-bold flex items-center justify-center border border-black/10 dark:border-white/10">
                {i18n.currentLanguage === 'pt-br' ? 'VC' : i18n.currentLanguage === 'es' ? 'UD' : 'ME'}
              </div>
              <span class="text-[10px] font-medium truncate max-w-[120px]">
                {i18n.currentLanguage === 'pt-br' ? 'Seu Nome de Usuário' : i18n.currentLanguage === 'es' ? 'Su nombre de usuario' : 'Your Username'}
              </span>
            </div>

            <span class="text-[9px] opacity-60">
              {i18n.formatDate(new Date())}
            </span>
          </div>
        </div>
      </div>
    </div>

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
        disabled={!isValidHex}
        class="flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl px-5 py-2.5 text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/10"
      >
        <Check class="w-4 h-4" />
        <span>{i18n.t('saveStyle')}</span>
      </button>
    </div>
  </div>
</div>
