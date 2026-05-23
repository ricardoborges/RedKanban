<script lang="ts">
  import { TrendingDown, PieChart, Target, Calendar, ChevronDown, Award } from '@lucide/svelte';
  import type { Issue, Status, Sprint } from '../services/api';
  import { i18n } from '../services/i18n.svelte';

  // Svelte 5 props
  let { issues, statuses, allSprints } = $props<{
    issues: Issue[];
    statuses: Status[];
    allSprints: Sprint[];
  }>();

  // Active sprint
  let activeSprint = $derived(allSprints.find((s: Sprint) => s.status === 'active'));
  
  // Selected Sprint ID for metrics visualization (defaults to active sprint, or first available)
  let selectedSprintId = $state<number | null>(null);

  // Initialize selected sprint ID
  $effect(() => {
    if (selectedSprintId === null && allSprints.length > 0) {
      selectedSprintId = activeSprint ? activeSprint.id : allSprints[0].id;
    }
  });

  // Selected Sprint object
  let selectedSprint = $derived(allSprints.find((s: Sprint) => s.id === selectedSprintId));

  // Issues belonging to the selected sprint
  let sprintIssues = $derived(
    selectedSprint ? issues.filter((i: Issue) => i.sprintId === selectedSprint.id) : []
  );

  // Identify the Closed status (last column)
  let closedStatusId = $derived(
    statuses.length > 0 ? statuses[statuses.length - 1].id : null
  );

  // Check if any issue in this sprint has Story Points assigned
  let hasStoryPoints = $derived(
    sprintIssues.some((i: Issue) => i.storyPoints !== null && i.storyPoints > 0)
  );

  // Helper to determine weight (Story Points or 1 for issues count)
  function getIssueWeight(issue: Issue): number {
    if (hasStoryPoints) {
      return issue.storyPoints || 0;
    }
    return 1; // Fallback to 1 issue count
  }

  // Weight metrics
  let totalWeight = $derived(
    sprintIssues.reduce((sum: number, i: Issue) => sum + getIssueWeight(i), 0)
  );

  let completedIssues = $derived(
    sprintIssues.filter((i: Issue) => i.statusId === closedStatusId)
  );

  let completedWeight = $derived(
    completedIssues.reduce((sum: number, i: Issue) => sum + getIssueWeight(i), 0)
  );

  let remainingWeight = $derived(
    Math.max(0, totalWeight - completedWeight)
  );

  let progressPercent = $derived(
    totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0
  );

  // Y-axis Label / Unit
  let weightUnit = $derived(hasStoryPoints ? i18n.t('sp') : i18n.t('tasksUnit'));
  let weightLabel = $derived(hasStoryPoints ? i18n.t('storyPoints') : i18n.t('tasksLabel'));

  // Burn Down Data Calculation
  let burndownData = $derived.by(() => {
    if (!selectedSprint || sprintIssues.length === 0) return null;

    // Parse sprint dates
    const startStr = selectedSprint.startDate;
    const endStr = selectedSprint.endDate;
    
    let startDate = startStr ? new Date(startStr) : new Date();
    if (!startStr) {
      // Fallback: 7 days ago
      startDate.setDate(startDate.getDate() - 7);
    } else {
      // Adjust timezone offset
      startDate = new Date(startDate.getTime() + startDate.getTimezoneOffset() * 60000);
    }
    
    let endDate = endStr ? new Date(endStr) : new Date();
    if (!endStr) {
      // Fallback: 7 days from now
      endDate.setDate(endDate.getDate() + 7);
    } else {
      endDate = new Date(endDate.getTime() + endDate.getTimezoneOffset() * 60000);
    }

    // Standardize to midnight for pure day comparisons
    startDate.setHours(0,0,0,0);
    endDate.setHours(0,0,0,0);

    if (startDate > endDate) {
      endDate = new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    }

    const oneDayMs = 24 * 60 * 60 * 1000;
    const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / oneDayMs);

    const today = new Date();
    today.setHours(0,0,0,0);

    const days: { date: Date; label: string; remainingIdeal: number; remainingReal: number | null; isFuture: boolean }[] = [];

    for (let d = 0; d <= totalDays; d++) {
      const currentDate = new Date(startDate.getTime() + d * oneDayMs);
      currentDate.setHours(0,0,0,0);
      
      const label = i18n.formatDate(currentDate, { day: 'numeric', month: 'short' });
      
      // Ideal burn down (straight line from totalWeight to 0)
      const remainingIdeal = Math.max(0, totalWeight - (d * (totalWeight / Math.max(1, totalDays))));

      // Real burn down (points remaining on this date)
      const isFuture = currentDate > today;
      let remainingReal: number | null = null;

      if (!isFuture) {
        // Find issues that were completed AFTER this day (meaning they were still remaining)
        // or issues that are not completed yet
        const remainingIssuesOnDay = sprintIssues.filter((i: Issue) => {
          const isClosed = i.statusId === closedStatusId;
          if (!isClosed) return true; // Still open, so remaining
          if (!i.updatedOn) return true;
          
          const completedDate = new Date(i.updatedOn);
          completedDate.setHours(0,0,0,0);
          return completedDate > currentDate; // Completed in the future relative to currentDate
        });
        
        remainingReal = remainingIssuesOnDay.reduce((sum: number, i: Issue) => sum + getIssueWeight(i), 0);
      }

      days.push({
        date: currentDate,
        label,
        remainingIdeal,
        remainingReal,
        isFuture
      });
    }

    return {
      days,
      totalDays
    };
  });

  // Calculate SVG paths for Burn Down
  const svgWidth = 550;
  const svgHeight = 240;
  const paddingLeft = 50;
  const paddingRight = 25;
  const paddingTop = 20;
  const paddingBottom = 40;
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  let chartPaths = $derived.by(() => {
    if (!burndownData || burndownData.days.length < 2) return { ideal: '', real: '', dots: [], gridY: [] };
    const { days } = burndownData;

    const getX = (idx: number) => paddingLeft + (idx / (days.length - 1)) * chartWidth;
    const getY = (val: number) => {
      if (totalWeight === 0) return paddingTop + chartHeight;
      return paddingTop + chartHeight - (val / totalWeight) * chartHeight;
    };

    // Ideal Line
    const ideal = `M ${getX(0)} ${getY(totalWeight)} L ${getX(days.length - 1)} ${getY(0)}`;

    // Real Line
    const realPoints: string[] = [];
    const dots: { x: number; y: number; label: string; val: number; dateStr: string }[] = [];

    days.forEach((day, idx) => {
      if (day.remainingReal !== null) {
        const x = getX(idx);
        const y = getY(day.remainingReal);
        realPoints.push(`${x},${y}`);
        dots.push({
          x,
          y,
          label: day.label,
          val: Math.round(day.remainingReal * 10) / 10,
          dateStr: i18n.formatDate(day.date)
        });
      }
    });

    const real = realPoints.length > 0 ? `M ${realPoints.join(' L ')}` : '';

    // Y Gridlines (0%, 25%, 50%, 75%, 100%)
    const gridY = [0, 0.25, 0.5, 0.75, 1].map(ratio => {
      const val = ratio * totalWeight;
      return {
        y: getY(val),
        val: Math.round(val * 10) / 10
      };
    });

    return {
      ideal,
      real,
      dots,
      gridY
    };
  });

  // Pie (Donut) parameters
  const donutRadius = 50;
  const donutCircumference = 2 * Math.PI * donutRadius; // ~314.16
  let donutOffset = $derived(
    donutCircumference - (progressPercent / 100) * donutCircumference
  );

  // Label Step for X-Axis to prevent overlap
  let xLabelStep = $derived.by(() => {
    if (!burndownData) return 1;
    const count = burndownData.days.length;
    if (count <= 10) return 1;
    if (count <= 20) return 2;
    return 3;
  });
</script>

<div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-6 transition-all duration-200">
  <!-- Dashboard Header -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
    <div class="flex items-center gap-2.5">
      <div class="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400">
        <TrendingDown class="w-5 h-5" />
      </div>
      <div>
        <h3 class="text-base font-bold text-zinc-800 dark:text-zinc-100">{i18n.t('metricsTitle')}</h3>
        <p class="text-xs text-zinc-500 dark:text-zinc-400">{i18n.t('metricsSubtitle')}</p>
      </div>
    </div>

    <!-- Sprint Selector -->
    <div class="flex items-center gap-2">
      <label for="sprint-metric-select" class="text-xs font-semibold text-zinc-500 dark:text-zinc-400 whitespace-nowrap">Sprint:</label>
      <div class="relative">
        <select
          id="sprint-metric-select"
          bind:value={selectedSprintId}
          class="appearance-none bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950/50 dark:hover:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold rounded-xl pl-3 pr-8 py-2 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer transition-all"
        >
          {#each allSprints as s}
            <option value={s.id}>
              {s.name} ({s.status === 'active' ? i18n.t('statusActive') : s.status === 'closed' ? i18n.t('statusClosed') : i18n.t('statusPlanned')})
            </option>
          {/each}
        </select>
        <ChevronDown class="w-4 h-4 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </div>
  </div>

  {#if !selectedSprint}
    <div class="text-center py-8 text-zinc-500 dark:text-zinc-400 text-xs italic">
      {i18n.t('selectSprintToViewMetrics')}
    </div>
  {:else if sprintIssues.length === 0}
    <div class="text-center py-10 bg-zinc-50/50 dark:bg-zinc-950/20 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
      <Calendar class="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
      <p class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{i18n.t('noTasksInSprint')}</p>
      <p class="text-2xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
        {i18n.t('addTasksInPlanningHelp')}
      </p>
    </div>
  {:else}
    <!-- Mini KPI Cards Grid -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div class="bg-zinc-50/55 dark:bg-zinc-950/20 border border-zinc-100 dark:border-zinc-800/60 rounded-xl p-3 space-y-0.5">
        <span class="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{i18n.t('totalScope')}</span>
        <div class="flex items-baseline gap-1">
          <span class="text-lg font-extrabold text-zinc-800 dark:text-zinc-100">{totalWeight}</span>
          <span class="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{weightLabel}</span>
        </div>
      </div>
      <div class="bg-zinc-50/55 dark:bg-zinc-950/20 border border-zinc-100 dark:border-zinc-800/60 rounded-xl p-3 space-y-0.5">
        <span class="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{i18n.t('completed')}</span>
        <div class="flex items-baseline gap-1">
          <span class="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">{completedWeight}</span>
          <span class="text-xs text-indigo-500/80 dark:text-indigo-400/80 font-medium">{weightUnit} ({progressPercent}%)</span>
        </div>
      </div>
      <div class="bg-zinc-50/55 dark:bg-zinc-950/20 border border-zinc-100 dark:border-zinc-800/60 rounded-xl p-3 space-y-0.5">
        <span class="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{i18n.t('remaining')}</span>
        <div class="flex items-baseline gap-1">
          <span class="text-lg font-extrabold text-zinc-800 dark:text-zinc-200">{remainingWeight}</span>
          <span class="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{weightUnit}</span>
        </div>
      </div>
      <div class="bg-zinc-50/55 dark:bg-zinc-950/20 border border-zinc-100 dark:border-zinc-800/60 rounded-xl p-3 space-y-0.5">
        <span class="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{i18n.t('sprintStatus')}</span>
        <div class="flex items-center gap-1.5 mt-1">
          {#if selectedSprint.status === 'active'}
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">{i18n.t('statusActive')}</span>
          {:else}
            <span class="w-2.5 h-2.5 rounded-full bg-zinc-400 dark:bg-zinc-600"></span>
            <span class="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">
              {selectedSprint.status === 'closed' ? i18n.t('statusClosed') : i18n.t('statusPlanned')}
            </span>
          {/if}
        </div>
      </div>
    </div>

    <!-- Charts Container -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      <!-- Burn Down Chart (8 Columns) -->
      <div class="lg:col-span-8 border border-zinc-100 dark:border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between space-y-3 bg-zinc-50/20 dark:bg-zinc-950/10">
        <div class="flex items-center justify-between">
          <div class="space-y-0.5">
            <h4 class="text-xs font-bold text-zinc-800 dark:text-zinc-200">{i18n.t('burndownChart')}</h4>
            <p class="text-[10px] text-zinc-400 dark:text-zinc-500">{i18n.t('dailyBurndownHelp', { weight: weightLabel.toLowerCase() })}</p>
          </div>
          <!-- Legend -->
          <div class="flex items-center gap-3 text-[10px] font-semibold">
            <div class="flex items-center gap-1">
              <span class="w-2.5 h-0.5 bg-orange-500 dark:bg-orange-500/80 rounded block border-t border-dashed"></span>
              <span class="text-zinc-500 dark:text-zinc-400">{i18n.t('ideal')}</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="w-2.5 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded block"></span>
              <span class="text-zinc-700 dark:text-zinc-300">{i18n.t('real')}</span>
            </div>
          </div>
        </div>

        <!-- SVG Burn Down -->
        {#if burndownData}
          <div class="relative w-full overflow-hidden select-none">
            <svg viewBox="0 0 {svgWidth} {svgHeight}" class="w-full h-auto overflow-visible">
              <!-- Y Axis Gridlines and Labels -->
              {#each chartPaths.gridY as line}
                <line
                  x1={paddingLeft}
                  y1={line.y}
                  x2={svgWidth - paddingRight}
                  y2={line.y}
                  class="stroke-zinc-200 dark:stroke-zinc-800/60"
                  stroke-width="1"
                  stroke-dasharray="4"
                />
                <text
                  x={paddingLeft - 8}
                  y={line.y + 4}
                  text-anchor="end"
                  class="fill-zinc-400 dark:fill-zinc-600 font-bold text-[9px]"
                >
                  {line.val} {weightUnit}
                </text>
              {/each}

              <!-- Chart X/Y Axes Lines -->
              <line
                x1={paddingLeft}
                y1={paddingTop}
                x2={paddingLeft}
                y2={svgHeight - paddingBottom}
                class="stroke-zinc-300 dark:stroke-zinc-800"
                stroke-width="1.5"
              />
              <line
                x1={paddingLeft}
                y1={svgHeight - paddingBottom}
                x2={svgWidth - paddingRight}
                y2={svgHeight - paddingBottom}
                class="stroke-zinc-300 dark:stroke-zinc-800"
                stroke-width="1.5"
              />

              <!-- Ideal Line -->
              <path
                d={chartPaths.ideal}
                fill="none"
                class="stroke-orange-500 dark:stroke-orange-500/60"
                stroke-width="1.5"
                stroke-dasharray="6,4"
              />

              <!-- Real Line -->
              {#if chartPaths.real}
                <path
                  d={chartPaths.real}
                  fill="none"
                  class="stroke-indigo-600 dark:stroke-indigo-400"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              {/if}

              <!-- Real Line Dots -->
              {#each chartPaths.dots as dot}
                <!-- Invisible hover area -->
                <circle
                  cx={dot.x}
                  cy={dot.y}
                  r="8"
                  fill="transparent"
                  class="cursor-pointer"
                >
                  <title>{dot.dateStr}: {i18n.t('remainingValue', { val: String(dot.val), unit: weightUnit })}</title>
                </circle>
                <!-- Visible circle -->
                <circle
                  cx={dot.x}
                  cy={dot.y}
                  r="4.5"
                  class="fill-indigo-600 dark:fill-indigo-400 stroke-white dark:stroke-zinc-900 stroke-2 hover:scale-150 transition-all duration-150 pointer-events-none"
                />
              {/each}

              <!-- X Axis Labels -->
              {#each burndownData.days as day, idx}
                {#if idx % xLabelStep === 0 || idx === burndownData.days.length - 1}
                  {@const xVal = paddingLeft + (idx / (burndownData.days.length - 1)) * chartWidth}
                  <text
                    x={xVal}
                    y={svgHeight - paddingBottom + 16}
                    text-anchor="middle"
                    class="fill-zinc-400 dark:fill-zinc-500 text-[9px] font-semibold"
                  >
                    {day.label}
                  </text>
                  <!-- Tick mark -->
                  <line
                    x1={xVal}
                    y1={svgHeight - paddingBottom}
                    x2={xVal}
                    y2={svgHeight - paddingBottom + 4}
                    class="stroke-zinc-300 dark:stroke-zinc-800"
                    stroke-width="1"
                  />
                {/if}
              {/each}
            </svg>
          </div>
        {/if}
      </div>

      <!-- Pie/Donut Chart (4 Columns) -->
      <div class="lg:col-span-4 border border-zinc-100 dark:border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between items-center space-y-4 bg-zinc-50/20 dark:bg-zinc-950/10">
        <div class="w-full text-left space-y-0.5">
          <h4 class="text-xs font-bold text-zinc-800 dark:text-zinc-200">{i18n.t('sprintIssuesVsCompleted')}</h4>
          <p class="text-[10px] text-zinc-400 dark:text-zinc-500">{i18n.t('sprintIssuesVsCompletedDesc')}</p>
        </div>

        <!-- Donut Chart -->
        <div class="relative w-36 h-36 flex items-center justify-center">
          <svg viewBox="0 0 140 140" class="w-full h-full transform -rotate-90">
            <!-- Background Ring (Zinc/Gray for remaining) -->
            <circle
              cx="70"
              cy="70"
              r={donutRadius}
              fill="transparent"
              class="stroke-zinc-200 dark:stroke-zinc-800/60"
              stroke-width="12"
            />
            <!-- Progress Ring (Indigo for completed) -->
            {#if progressPercent > 0}
              <circle
                cx="70"
                cy="70"
                r={donutRadius}
                fill="transparent"
                class="stroke-indigo-600 dark:stroke-indigo-500 transition-all duration-500"
                stroke-width="12"
                stroke-dasharray={donutCircumference}
                stroke-dashoffset={donutOffset}
                stroke-linecap="round"
              />
            {/if}
          </svg>

          <!-- Inside Donut Content -->
          <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span class="text-lg font-extrabold text-zinc-800 dark:text-zinc-100">{progressPercent}%</span>
            <span class="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{i18n.t('completed')}</span>
          </div>
        </div>

        <!-- Legend and numbers -->
        <div class="w-full space-y-2">
          <div class="flex items-center justify-between text-2xs border-b border-zinc-100 dark:border-zinc-800/60 pb-1.5">
            <div class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 bg-indigo-600 dark:bg-indigo-500 rounded-full"></span>
              <span class="text-zinc-600 dark:text-zinc-400 font-medium">{i18n.t('completedLabel')}</span>
            </div>
            <span class="font-bold text-zinc-800 dark:text-zinc-200">
              {completedIssues.length} / {sprintIssues.length} {i18n.t('tasksLabel').toLowerCase()}
              {#if hasStoryPoints}
                <span class="text-zinc-400 dark:text-zinc-500 font-normal">({completedWeight} SP)</span>
              {/if}
            </span>
          </div>
          
          <div class="flex items-center justify-between text-2xs">
            <div class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded-full border border-zinc-300 dark:border-zinc-700"></span>
              <span class="text-zinc-600 dark:text-zinc-400 font-medium">{i18n.t('remainingLabel')}</span>
            </div>
            <span class="font-bold text-zinc-800 dark:text-zinc-200">
              {sprintIssues.length - completedIssues.length} / {sprintIssues.length} {i18n.t('tasksLabel').toLowerCase()}
              {#if hasStoryPoints}
                <span class="text-zinc-400 dark:text-zinc-500 font-normal">({remainingWeight} SP)</span>
              {/if}
            </span>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
