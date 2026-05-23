<script lang="ts">
  import type { Issue } from '../services/api';
  import { i18n } from '../services/i18n.svelte';
  import { ExternalLink, User } from '@lucide/svelte';

  // Svelte 5 props
  let { issue, redmineUrl, isAssignedToMe = false, customColor = '#c7ecff' } = $props<{
    issue: Issue;
    redmineUrl: string;
    isAssignedToMe?: boolean;
    customColor?: string;
  }>();
  
  // Extrai as iniciais do responsável
  let initials = $derived(
    issue.assignedToName
      ? issue.assignedToName
          .split(' ')
          .slice(0, 2)
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
      : '?'
  );

  let redmineIssueUrl = $derived(`${redmineUrl}/issues/${issue.id}`);

  // Valida a cor hexadecimal
  let isValidHex = $derived(/^#[0-9A-F]{6}$/i.test(customColor));
  
  // Calcula contraste YIQ para determinar se o fundo é claro ou escuro
  let isLightBg = $derived.by(() => {
    if (!isAssignedToMe || !isValidHex) return null;
    const hex = customColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128;
  });

  function handleDragStart(event: DragEvent) {
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', issue.id.toString());
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  draggable="true"
  ondragstart={handleDragStart}
  class="rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing group flex flex-col justify-between min-h-[120px] select-none border
    {!isAssignedToMe
      ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700/80 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40'
      : ''}
    {isAssignedToMe && isLightBg === true ? 'text-zinc-900' : ''}
    {isAssignedToMe && isLightBg === false ? 'text-white' : ''}"
  style={isAssignedToMe && isValidHex
    ? `background-color: ${customColor}; border-color: ${customColor}cc;`
    : ''}
>
  <div>
    <!-- Top info -->
    <div class="flex items-center justify-between mb-2">
      <span class="text-xs font-semibold {isAssignedToMe ? 'opacity-70' : 'text-zinc-400 dark:text-zinc-500'}">#{issue.id}</span>
      <a
        href={redmineIssueUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="transition-colors p-1 rounded {isAssignedToMe ? 'text-inherit opacity-70 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}"
        title={i18n.t('openInRedmine')}
        onclick={(e) => e.stopPropagation()}
      >
        <ExternalLink class="w-3.5 h-3.5" />
      </a>
    </div>

    <!-- Title -->
    <h3 class="text-sm font-semibold line-clamp-2 leading-snug transition-colors {isAssignedToMe ? '' : 'text-zinc-800 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}">
      {issue.subject}
    </h3>

    <!-- Description (Short) -->
    {#if issue.description}
      <p class="text-xs mt-1.5 line-clamp-2 font-light {isAssignedToMe ? 'opacity-85' : 'text-zinc-500 dark:text-zinc-400'}">
        {issue.description}
      </p>
    {/if}
  </div>

  <!-- Bottom info (Assignee) -->
  <div class="flex items-center justify-between mt-4 pt-3 border-t {isAssignedToMe ? 'border-black/10 dark:border-white/10' : 'border-zinc-100 dark:border-zinc-800/60'}">
    <div class="flex items-center gap-2">
      {#if issue.assignedToId}
        <div class="w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center border {isAssignedToMe ? 'bg-black/5 dark:bg-white/10 border-black/10 dark:border-white/10 text-inherit' : 'bg-indigo-50 dark:bg-indigo-600/30 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/20'}">
          {initials}
        </div>
        <span class="text-[10px] truncate max-w-[120px] {isAssignedToMe ? 'opacity-90' : 'text-zinc-600 dark:text-zinc-400'}">
          {issue.assignedToName}
        </span>
      {:else}
        <div class="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 flex items-center justify-center">
          <User class="w-2.5 h-2.5" />
        </div>
        <span class="text-[10px] text-zinc-400 dark:text-zinc-500 italic">
          {i18n.t('unassigned')}
        </span>
      {/if}
    </div>

    <div class="flex items-center gap-1.5">
      {#if issue.storyPoints !== null}
        <span class="bg-zinc-100/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full" title="Story Points">
          {issue.storyPoints} {i18n.t('sp')}
        </span>
      {/if}
      <span class="text-[9px] {isAssignedToMe ? 'opacity-70' : 'text-zinc-400 dark:text-zinc-500'}">
        {i18n.formatDate(issue.updatedOn)}
      </span>
    </div>
  </div>
</div>
