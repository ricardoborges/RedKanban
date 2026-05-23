import { browser } from '$app/environment';

export type Language = 'en' | 'pt-br' | 'es';

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navbar / Common
    projectName: 'Project Name',
    themeToggle: 'Toggle Theme',
    backToBoard: 'Back to Board',
    active: 'Active',
    checkingCredentials: 'Checking credentials...',
    connectionErrorTitle: 'Integration Failed',
    connectionErrorDesc: 'Could not establish connection to the Redmine server with the saved settings.',
    adjustSettingsBtn: 'Adjust Settings',

    // Settings tabs
    connectionAndProject: 'Connection & Project',
    kanbanColumns: 'Kanban Columns',
    cardStyle: 'Card Style',

    // ConfigPanel
    configTitle: 'Connection Settings',
    configSubtitle: 'Local or external integration with the Redmine API',
    redmineUrlLabel: 'Redmine URL',
    apiKeyLabel: 'API Key (REST API Key)',
    apiKeyHelp: 'Go to "My Account" in Redmine to retrieve your API access key.',
    projectSelectLabel: 'Redmine Project',
    projectSelectPlaceholder: 'Select a project...',
    reloadProjects: 'Reload Projects',
    fetchingProjects: 'Loading projects from {url}...',
    searchProjectsHelp: 'Fill in the URL and API Key above and click "Search Projects" to choose a project.',
    searchProjectsBtn: 'Search Projects',
    errorAllFieldsRequired: 'All fields are required, including project selection.',
    errorInvalidProject: 'Invalid project selected.',
    successConnected: 'Successfully connected to project: {name}',
    validatingConnection: 'Validating Connection...',
    saveAndLoad: 'Save & Load Kanban',

    // StatusConfigPanel
    statusTitle: 'Kanban Columns Configuration',
    statusSubtitle: 'Configure which Redmine statuses correspond to your Kanban columns and their order.',
    statusIntroText: 'Map Redmine statuses to columns. Drag to reorder columns. You must have at least one column.',
    columnLabel: 'Column {index}',
    addColumn: 'Add Column',
    removeColumn: 'Remove Column',
    selectStatus: 'Select Status...',
    saveConfiguration: 'Save Configuration',
    cancel: 'Cancel',
    validationErrorEmptyColumns: 'All columns must have a status selected.',
    validationErrorDuplicate: 'Duplicate statuses are not allowed across columns.',

    // CardStyleConfigPanel
    styleTitle: 'Card Style Settings',
    styleSubtitle: 'Customize the visual appearance of tasks in the Kanban board.',
    myTasksColor: 'My Tasks Highlight Color',
    myTasksColorDesc: 'Choose the highlight color for cards assigned to you.',
    showAssigneeAvatar: 'Show Assignee Avatar',
    showAssigneeAvatarDesc: "Show a circle with the assignee's initials in the card corner.",
    previewTitle: 'Card Preview (Example)',
    exampleSubject: 'Implement Redmine connection configuration interface',
    exampleDesc: 'Create the form to insert Redmine URL, API Key and project.',
    exampleAssignee: 'John Doe',
    saveStyle: 'Save Style Settings',

    // KanbanBoard
    backlog: 'Backlog',
    sprints: 'Sprints',
    searchPlaceholder: 'Search tasks by subject, ID, or description...',
    filterAssignedTo: 'Assigned to',
    filterAll: 'All Users',
    filterSprint: 'Sprint',
    filterAllSprints: 'All Sprints',
    filterNoSprint: 'Without Sprint',
    lastUpdated: 'Last updated: {time}',
    tasksCount: '{count} tasks',
    noTasksFound: 'No tasks found',
    noTasksDesc: 'Try adjusting your search filters or create a new task.',
    newTask: 'New Task',
    openSettings: 'Settings',
    loadingData: 'Loading board data...',

    // KanbanCard
    storyPoints: 'Story Points',
    sp: 'SP',
    updatedAt: 'Updated',
    unassigned: 'Unassigned',

    // BacklogView
    backlogTitle: 'Product Backlog',
    backlogSubtitle: 'Manage project requirements and plan sprints',
    activeSprint: 'Active Sprint',
    futureSprints: 'Future Sprints',
    noSprintsTitle: 'No sprints created',
    noSprintsDesc: 'Create a sprint to start planning work.',
    createSprintBtn: 'Create Sprint',
    unplannedTasks: 'Unplanned Tasks',
    unplannedTasksDesc: 'Drag tasks to a sprint block below to plan them',
    sprintGoal: 'Goal:',
    noGoal: 'No goal defined',
    emptySprint: 'Drag tasks here to plan this sprint',
    storyPointsShort: 'pts',

    // IssueModal
    taskSingular: 'Task',
    changed: 'changed',
    from: 'from',
    to: 'to',
    openInRedmine: 'Open in Redmine',
    viewOnRedmine: 'View on Redmine',
    writeCommentPlaceholder: 'Write a comment (note) on Redmine...',
    taskDetails: 'Task Details',
    createdOn: 'Created on',
    updatedOn: 'Updated on',
    assignee: 'Assignee',
    description: 'Description',
    comments: 'Comments & History',
    noComments: 'No comments added yet.',
    addCommentPlaceholder: 'Type a new comment...',
    submitting: 'Submitting...',
    addCommentBtn: 'Add Comment',
    close: 'Close',

    // SprintDashboard
    dashboardTitle: 'Sprint Dashboard',
    burndownTitle: 'Sprint Burndown (Story Points / Time)',
    remainingPoints: 'Remaining Story Points',
    idealRemaining: 'Ideal Remaining',
    days: 'Days',
    sprintNotStarted: 'This sprint has not started yet or has no dates.',
    sprintGoalLabel: 'Sprint Goal',
    dates: 'Dates',
    progress: 'Progress',
    totalPoints: 'Total Story Points',
    completeSprintBtn: 'Complete Sprint',
    editSprintBtn: 'Edit Sprint',
    statusActive: 'Active',
    statusFuture: 'Future',
    statusClosed: 'Closed',
    completeTitle: 'Complete Sprint',
    completeDesc: "You are about to complete the sprint '{name}'. Choose where to move the incomplete tasks:",
    moveToBacklog: 'Move to Backlog (Without Sprint)',
    moveToSprint: 'Move to another Sprint:',
    completeConfirm: 'Complete Sprint Now',

    // SprintModal
    createSprintTitle: 'Create New Sprint',
    editSprintTitle: 'Edit Sprint',
    nameLabel: 'Sprint Name',
    goalLabel: 'Sprint Goal (Description)',
    startDateLabel: 'Start Date',
    endDateLabel: 'End Date',
    statusLabel: 'Sprint Status',
    saving: 'Saving...',
    save: 'Save',
    errorNameRequired: 'Sprint name is required.',
    errorDatesRequired: 'Start and end dates are required to start the Sprint.',
    errorStartDateAfterEndDate: 'Start date cannot be after end date.',
    errorProcessingSprint: 'An error occurred while processing the Sprint.',
    startSprintTitle: 'Start Sprint: {name}',
    completeSprintTitle: 'Complete Sprint: {name}',
    namePlaceholder: 'e.g. Sprint 1',
    goalPlaceholder: 'What is the main goal of this sprint?',
    completeSprintDesc: "You are about to complete the sprint '{name}'. Any resolved (completed) tasks will remain in this sprint.",
    sprintSummary: 'Sprint Summary',
    sprintSummaryPoints: 'Total Story Points: {points}',
    moveIncompleteTasksTo: 'Move incomplete tasks to:',
    backlogWithoutSprint: 'Backlog (Without Sprint)',
    saveChanges: 'Save Changes',
    startSprintBtn: 'Start Sprint',
    processing: 'Processing...',
    metricsTitle: 'Metrics & Performance',
    metricsSubtitle: 'Agile progress and delivery indicators.',
    statusPlanned: 'Planned',
    selectSprintToViewMetrics: 'Create or select a sprint to view its metrics.',
    noTasksInSprint: 'No tasks in this sprint',
    addTasksInPlanningHelp: 'Add tasks to the sprint in the Backlog tab to generate performance charts.',
    totalScope: 'Total Scope',
    completed: 'Completed',
    remaining: 'Remaining',
    sprintStatus: 'Sprint Status',
    burndownChart: 'Burn Down Chart',
    dailyBurndownHelp: 'Daily progress of remaining {weight}.',
    ideal: 'Ideal',
    real: 'Real',
    remainingValue: '{val} {unit} remaining',
    sprintIssuesVsCompleted: 'Sprint Tasks vs Completed',
    sprintIssuesVsCompletedDesc: 'Visual feedback of delivered tasks.',
    completedLabel: 'Completed:',
    remainingLabel: 'Remaining:',
    tasksUnit: 't.',
    tasksLabel: 'Tasks'
  },
  'pt-br': {
    // Navbar / Common
    projectName: 'Nome do Projeto',
    themeToggle: 'Alternar Tema',
    backToBoard: 'Voltar ao Quadro',
    active: 'Ativo',
    checkingCredentials: 'Verificando credenciais...',
    connectionErrorTitle: 'Falha na Integração',
    connectionErrorDesc: 'Não foi possível estabelecer conexão com o servidor Redmine com as configurações salvas.',
    adjustSettingsBtn: 'Ajustar Configurações',

    // Settings tabs
    connectionAndProject: 'Conexão e Projeto',
    kanbanColumns: 'Colunas do Kanban',
    cardStyle: 'Estilo do Card',

    // ConfigPanel
    configTitle: 'Configurações de Conexão',
    configSubtitle: 'Integração local ou externa com a API do Redmine',
    redmineUrlLabel: 'URL do Redmine',
    apiKeyLabel: 'Chave da API (REST API Key)',
    apiKeyHelp: 'Acesse "Minha Conta" no Redmine para gerar sua chave de acesso.',
    projectSelectLabel: 'Projeto do Redmine',
    projectSelectPlaceholder: 'Selecione um projeto...',
    reloadProjects: 'Recarregar Projetos',
    fetchingProjects: 'Carregando projetos de {url}...',
    searchProjectsHelp: 'Preencha a URL e a API Key acima e clique em "Buscar Projetos" para selecionar um projeto.',
    searchProjectsBtn: 'Buscar Projetos',
    errorAllFieldsRequired: 'Todos os campos são obrigatórios, incluindo a seleção do projeto.',
    errorInvalidProject: 'Projeto selecionado inválido.',
    successConnected: 'Conectado com sucesso ao projeto: {name}',
    validatingConnection: 'Validando Conexão...',
    saveAndLoad: 'Salvar & Carregar Kanban',

    // StatusConfigPanel
    statusTitle: 'Configuração de Colunas do Kanban',
    statusSubtitle: 'Configure quais status do Redmine correspondem às suas colunas do Kanban e sua ordem.',
    statusIntroText: 'Mapeie os status do Redmine para colunas. Arraste para reordenar. Você deve ter pelo menos uma coluna.',
    columnLabel: 'Coluna {index}',
    addColumn: 'Adicionar Coluna',
    removeColumn: 'Remover Coluna',
    selectStatus: 'Selecione o Status...',
    saveConfiguration: 'Salvar Configuração',
    cancel: 'Cancelar',
    validationErrorEmptyColumns: 'Todas as colunas devem ter um status selecionado.',
    validationErrorDuplicate: 'Não são permitidos status duplicados entre as colunas.',

    // CardStyleConfigPanel
    styleTitle: 'Configurações do Estilo do Card',
    styleSubtitle: 'Personalize a aparência visual das tarefas no quadro Kanban.',
    myTasksColor: 'Cor de Destaque das Minhas Tarefas',
    myTasksColorDesc: 'Escolha a cor de destaque para os cards atribuídos a você.',
    showAssigneeAvatar: 'Mostrar Avatar do Responsável',
    showAssigneeAvatarDesc: 'Exibir um círculo com as iniciais do responsável no canto do card.',
    previewTitle: 'Visualização do Card (Exemplo)',
    exampleSubject: 'Implementar interface de configuração de conexão do Redmine',
    exampleDesc: 'Criar o formulário para inserir URL do Redmine, API Key e projeto.',
    exampleAssignee: 'Fulano de Tal',
    saveStyle: 'Salvar Configurações de Estilo',

    // KanbanBoard
    backlog: 'Backlog',
    sprints: 'Sprints',
    searchPlaceholder: 'Buscar tarefas por assunto, ID ou descrição...',
    filterAssignedTo: 'Atribuído a',
    filterAll: 'Todos os Usuários',
    filterSprint: 'Sprint',
    filterAllSprints: 'Todas as Sprints',
    filterNoSprint: 'Sem Sprint',
    lastUpdated: 'Última atualização: {time}',
    tasksCount: '{count} tarefas',
    noTasksFound: 'Nenhuma tarefa encontrada',
    noTasksDesc: 'Tente ajustar seus filtros de busca ou crie uma nova tarefa.',
    newTask: 'Nova Tarefa',
    openSettings: 'Configurações',
    loadingData: 'Carregando dados do quadro...',

    // KanbanCard
    storyPoints: 'Pontos de História',
    sp: 'PH',
    updatedAt: 'Atualizado',
    unassigned: 'Sem atribuição',

    // BacklogView
    backlogTitle: 'Backlog do Produto',
    backlogSubtitle: 'Gerencie os requisitos do projeto e planeje as sprints',
    activeSprint: 'Sprint Ativa',
    futureSprints: 'Sprints Futuras',
    noSprintsTitle: 'Nenhuma sprint criada',
    noSprintsDesc: 'Crie uma sprint para começar a planejar o trabalho.',
    createSprintBtn: 'Criar Sprint',
    unplannedTasks: 'Tarefas Não Planejadas',
    unplannedTasksDesc: 'Arraste tarefas para um bloco de sprint abaixo para planejá-las',
    sprintGoal: 'Meta:',
    noGoal: 'Nenhuma meta definida',
    emptySprint: 'Arraste tarefas aqui para planejar esta sprint',
    storyPointsShort: 'pts',

    // IssueModal
    taskSingular: 'Tarefa',
    changed: 'alterado',
    from: 'de',
    to: 'para',
    openInRedmine: 'Abrir no Redmine',
    viewOnRedmine: 'Ver no Redmine',
    writeCommentPlaceholder: 'Escreva um comentário (nota) no Redmine...',
    taskDetails: 'Detalhes da Tarefa',
    createdOn: 'Criado em',
    updatedOn: 'Atualizado em',
    assignee: 'Responsável',
    description: 'Descrição',
    comments: 'Comentários e Histórico',
    noComments: 'Nenhum comentário adicionado ainda.',
    addCommentPlaceholder: 'Digite um novo comentário...',
    submitting: 'Enviando...',
    addCommentBtn: 'Adicionar Comentário',
    close: 'Fechar',

    // SprintDashboard
    dashboardTitle: 'Painel da Sprint',
    burndownTitle: 'Burndown da Sprint (Pontos de História / Tempo)',
    remainingPoints: 'Pontos de História Restantes',
    idealRemaining: 'Restante Ideal',
    days: 'Dias',
    sprintNotStarted: 'Esta sprint ainda não começou ou não possui datas.',
    sprintGoalLabel: 'Meta da Sprint',
    dates: 'Datas',
    progress: 'Progresso',
    totalPoints: 'Total de Pontos de História',
    completeSprintBtn: 'Concluir Sprint',
    editSprintBtn: 'Editar Sprint',
    statusActive: 'Ativa',
    statusFuture: 'Futura',
    statusClosed: 'Fechada',
    completeTitle: 'Concluir Sprint',
    completeDesc: 'Você está prestes a concluir a sprint \'{name}\'. Escolha para onde mover as tarefas incompletas:',
    moveToBacklog: 'Mover para o Backlog (Sem Sprint)',
    moveToSprint: 'Mover para outra Sprint:',
    completeConfirm: 'Concluir Sprint Agora',

    // SprintModal
    createSprintTitle: 'Criar Nova Sprint',
    editSprintTitle: 'Editar Sprint',
    nameLabel: 'Nome da Sprint',
    goalLabel: 'Meta da Sprint (Descrição)',
    startDateLabel: 'Data de Início',
    endDateLabel: 'Data de Término',
    statusLabel: 'Status da Sprint',
    saving: 'Salvando...',
    save: 'Salvar',
    errorNameRequired: 'O nome da sprint é obrigatório.',
    errorDatesRequired: 'As datas de início e término são obrigatórias para iniciar a Sprint.',
    errorStartDateAfterEndDate: 'A data de início não pode ser posterior à data de término.',
    errorProcessingSprint: 'Ocorreu um erro ao processar a Sprint.',
    startSprintTitle: 'Iniciar Sprint: {name}',
    completeSprintTitle: 'Concluir Sprint: {name}',
    namePlaceholder: 'Ex: Sprint 1',
    goalPlaceholder: 'Qual o objetivo principal desta sprint?',
    completeSprintDesc: "Você está prestes a concluir a sprint '{name}'. Quaisquer tarefas resolvidas (concluídas) permanecerão nesta sprint.",
    sprintSummary: 'Resumo da Sprint',
    sprintSummaryPoints: 'Total de Pontos de História: {points}',
    moveIncompleteTasksTo: 'Mover tarefas incompletas para:',
    backlogWithoutSprint: 'Backlog (Sem Sprint)',
    saveChanges: 'Salvar Alterações',
    startSprintBtn: 'Iniciar Sprint',
    processing: 'Processando...',
    metricsTitle: 'Métricas & Desempenho',
    metricsSubtitle: 'Indicadores ágeis de progresso e entregas.',
    statusPlanned: 'Planejada',
    selectSprintToViewMetrics: 'Crie ou selecione uma sprint para ver suas métricas.',
    noTasksInSprint: 'Nenhuma tarefa nesta sprint',
    addTasksInPlanningHelp: 'Adicione tarefas à sprint na aba de Backlog para gerar gráficos de desempenho.',
    totalScope: 'Escopo Total',
    completed: 'Concluído',
    remaining: 'Restante',
    sprintStatus: 'Status Sprint',
    burndownChart: 'Gráfico de Burn Down',
    dailyBurndownHelp: 'Progresso diário de {weight} restante.',
    ideal: 'Ideal',
    real: 'Real',
    remainingValue: '{val} {unit} restantes',
    sprintIssuesVsCompleted: 'Issues da Sprint x Finalizadas',
    sprintIssuesVsCompletedDesc: 'Visualização de tarefas entregues.',
    completedLabel: 'Finalizadas:',
    remainingLabel: 'Restantes:',
    tasksUnit: 't.',
    tasksLabel: 'Tarefas'
  },
  es: {
    // Navbar / Common
    projectName: 'Nombre del Proyecto',
    themeToggle: 'Alternar Tema',
    backToBoard: 'Volver al Tablero',
    active: 'Activo',
    checkingCredentials: 'Verificando credenciales...',
    connectionErrorTitle: 'Error de Integración',
    connectionErrorDesc: 'No se pudo establecer la conexión con el servidor Redmine con la configuración guardada.',
    adjustSettingsBtn: 'Ajustar Configuración',

    // Settings tabs
    connectionAndProject: 'Conexión y Proyecto',
    kanbanColumns: 'Columnas de Kanban',
    cardStyle: 'Estilo de Tarjeta',

    // ConfigPanel
    configTitle: 'Configuración de Conexión',
    configSubtitle: 'Integración local o externa con la API de Redmine',
    redmineUrlLabel: 'URL de Redmine',
    apiKeyLabel: 'Clave de la API (REST API Key)',
    apiKeyHelp: 'Acceda a "Mi Cuenta" en Redmine para generar su clave de acceso.',
    projectSelectLabel: 'Proyecto de Redmine',
    projectSelectPlaceholder: 'Seleccione un proyecto...',
    reloadProjects: 'Recargar Proyectos',
    fetchingProjects: 'Cargando proyectos desde {url}...',
    searchProjectsHelp: 'Complete la URL y la API Key arriba y haga clic en "Buscar Proyectos" para seleccionar un proyecto.',
    searchProjectsBtn: 'Buscar Proyectos',
    errorAllFieldsRequired: 'Todos los campos son obligatorios, incluida la selección del proyecto.',
    errorInvalidProject: 'Proyecto seleccionado inválido.',
    successConnected: 'Conectado con éxito al proyecto: {name}',
    validatingConnection: 'Validando Conexión...',
    saveAndLoad: 'Guardar y Cargar Kanban',

    // StatusConfigPanel
    statusTitle: 'Configuración de Columnas de Kanban',
    statusSubtitle: 'Configure qué estados de Redmine corresponden a sus columnas de Kanban y su orden.',
    statusIntroText: 'Mapee los estados de Redmine a las columnas. Arrastre para reordenar. Debe tener al menos una columna.',
    columnLabel: 'Columna {index}',
    addColumn: 'Agregar Columna',
    removeColumn: 'Eliminar Columna',
    selectStatus: 'Seleccione el Estado...',
    saveConfiguration: 'Guardar Configuración',
    cancel: 'Cancelar',
    validationErrorEmptyColumns: 'Todas las columnas deben tener un estado seleccionado.',
    validationErrorDuplicate: 'No se permiten estados duplicados entre las columnas.',

    // CardStyleConfigPanel
    styleTitle: 'Configuración del Estilo de Tarjeta',
    styleSubtitle: 'Personalice la apariencia visual de las tareas en el tablero Kanban.',
    myTasksColor: 'Color de Destacado de mis Tareas',
    myTasksColorDesc: 'Elija el color de destacado para las tarjetas asignadas a usted.',
    showAssigneeAvatar: 'Mostrar Avatar del Responsable',
    showAssigneeAvatarDesc: 'Mostrar un círculo con las iniciales del responsable en la esquina de la tarjeta.',
    previewTitle: 'Visualización de la Tarjeta (Ejemplo)',
    exampleSubject: 'Implementar interfaz de configuración de conexión de Redmine',
    exampleDesc: 'Crear el formulario para insertar URL de Redmine, API Key y proyecto.',
    exampleAssignee: 'Juan Pérez',
    saveStyle: 'Guardar Configuración de Estilo',

    // KanbanBoard
    backlog: 'Backlog',
    sprints: 'Sprints',
    searchPlaceholder: 'Buscar tareas por asunto, ID o descripción...',
    filterAssignedTo: 'Asignado a',
    filterAll: 'Todos los Usuarios',
    filterSprint: 'Sprint',
    filterAllSprints: 'Todos los Sprints',
    filterNoSprint: 'Sin Sprint',
    lastUpdated: 'Última actualización: {time}',
    tasksCount: '{count} tareas',
    noTasksFound: 'No se encontraron tareas',
    noTasksDesc: 'Intente ajustar sus filtros de búsqueda o cree una nueva tarea.',
    newTask: 'Nueva Tarea',
    openSettings: 'Configuración',
    loadingData: 'Cargando datos del tablero...',

    // KanbanCard
    storyPoints: 'Puntos de Historia',
    sp: 'PH',
    updatedAt: 'Actualizado',
    unassigned: 'Sin asignar',

    // BacklogView
    backlogTitle: 'Backlog del Producto',
    backlogSubtitle: 'Gestione los requisitos del proyecto y planifique las sprints',
    activeSprint: 'Sprint Activa',
    futureSprints: 'Sprints Futuras',
    noSprintsTitle: 'Ninguna sprint creada',
    noSprintsDesc: 'Cree una sprint para comenzar a planificar el trabajo.',
    createSprintBtn: 'Crear Sprint',
    unplannedTasks: 'Tareas No Planificadas',
    unplannedTasksDesc: 'Arrastre tareas a un bloque de sprint abajo para planificarlas',
    sprintGoal: 'Meta:',
    noGoal: 'Ninguna meta definida',
    emptySprint: 'Arrastre tareas aquí para planificar esta sprint',
    storyPointsShort: 'pts',

    // IssueModal
    taskSingular: 'Tarea',
    changed: 'cambiado',
    from: 'de',
    to: 'a',
    openInRedmine: 'Abrir en Redmine',
    viewOnRedmine: 'Ver en Redmine',
    writeCommentPlaceholder: 'Escriba un comentario (nota) en Redmine...',
    taskDetails: 'Detalles de la Tarea',
    createdOn: 'Creado el',
    updatedOn: 'Actualizado el',
    assignee: 'Asignado a',
    description: 'Descripción',
    comments: 'Comentarios e Historial',
    noComments: 'Ningún comentario añadido aún.',
    addCommentPlaceholder: 'Escriba un nuevo comentario...',
    submitting: 'Enviando...',
    addCommentBtn: 'Agregar Comentario',
    close: 'Cerrar',

    // SprintDashboard
    dashboardTitle: 'Panel de la Sprint',
    burndownTitle: 'Burndown de la Sprint (Puntos de Historia / Tiempo)',
    remainingPoints: 'Puntos de Historia Restantes',
    idealRemaining: 'Restante Ideal',
    days: 'Días',
    sprintNotStarted: 'Esta sprint aún no ha comenzado o no tiene fechas.',
    sprintGoalLabel: 'Meta de la Sprint',
    dates: 'Fechas',
    progress: 'Progreso',
    totalPoints: 'Total de Puntos de Historia',
    completeSprintBtn: 'Completar Sprint',
    editSprintBtn: 'Editar Sprint',
    statusActive: 'Activa',
    statusFuture: 'Futura',
    statusClosed: 'Cerrada',
    completeTitle: 'Completar Sprint',
    completeDesc: 'Está a punto de completar la sprint \'{name}\'. Elija a dónde mover las tareas incompletas:',
    moveToBacklog: 'Mover al Backlog (Sin Sprint)',
    moveToSprint: 'Mover a otra Sprint:',
    completeConfirm: 'Completar Sprint Ahora',

    // SprintModal
    createSprintTitle: 'Crear Nueva Sprint',
    editSprintTitle: 'Editar Sprint',
    nameLabel: 'Nombre de la Sprint',
    goalLabel: 'Meta de la Sprint (Descripción)',
    startDateLabel: 'Fecha de Inicio',
    endDateLabel: 'Fecha de Finalización',
    statusLabel: 'Estado de la Sprint',
    saving: 'Guardando...',
    save: 'Guardar',
    errorNameRequired: 'El nombre de la sprint es obligatorio.',
    errorDatesRequired: 'Las fechas de inicio y finalización son obligatorias para iniciar el Sprint.',
    errorStartDateAfterEndDate: 'La fecha de inicio no puede ser posterior a la fecha de finalización.',
    errorProcessingSprint: 'Ocurrió un error al procesar el Sprint.',
    startSprintTitle: 'Iniciar Sprint: {name}',
    completeSprintTitle: 'Completar Sprint: {name}',
    namePlaceholder: 'Ej: Sprint 1',
    goalPlaceholder: '¿Cuál es el objetivo principal de este sprint?',
    completeSprintDesc: "Está a punto de completar el sprint '{name}'. Las tareas resueltas (completadas) permanecerán en este sprint.",
    sprintSummary: 'Resumen del Sprint',
    sprintSummaryPoints: 'Total de Puntos de Historia: {points}',
    moveIncompleteTasksTo: 'Mover tareas incompletas a:',
    backlogWithoutSprint: 'Backlog (Sin Sprint)',
    saveChanges: 'Guardar Cambios',
    startSprintBtn: 'Iniciar Sprint',
    processing: 'Procesando...',
    metricsTitle: 'Métricas y Rendimiento',
    metricsSubtitle: 'Indicadores ágiles de progreso y entregas.',
    statusPlanned: 'Planificada',
    selectSprintToViewMetrics: 'Cree o seleccione un sprint para ver sus métricas.',
    noTasksInSprint: 'Sin tareas en este sprint',
    addTasksInPlanningHelp: 'Agregue tareas al sprint en la pestaña de Backlog para generar gráficos de rendimiento.',
    totalScope: 'Alcance Total',
    completed: 'Completado',
    remaining: 'Restante',
    sprintStatus: 'Estado Sprint',
    burndownChart: 'Gráfico de Burn Down',
    dailyBurndownHelp: 'Progreso diario de {weight} restante.',
    ideal: 'Ideal',
    real: 'Real',
    remainingValue: '{val} {unit} restantes',
    sprintIssuesVsCompleted: 'Tareas del Sprint vs Completadas',
    sprintIssuesVsCompletedDesc: 'Visualización de tareas entregadas.',
    completedLabel: 'Finalizadas:',
    remainingLabel: 'Restantes:',
    tasksUnit: 't.',
    tasksLabel: 'Tareas'
  }
};

class TranslationService {
  currentLanguage = $state<Language>('en');

  constructor() {
    if (browser) {
      const stored = localStorage.getItem('redkanban_lang') as Language;
      if (stored === 'en' || stored === 'pt-br' || stored === 'es') {
        this.currentLanguage = stored;
      } else {
        // Try browser language detection
        const navLang = navigator.language.toLowerCase();
        if (navLang.startsWith('pt')) {
          this.currentLanguage = 'pt-br';
        } else if (navLang.startsWith('es')) {
          this.currentLanguage = 'es';
        } else {
          this.currentLanguage = 'en';
        }
      }
    }
  }

  setLanguage(lang: Language) {
    this.currentLanguage = lang;
    if (browser) {
      localStorage.setItem('redkanban_lang', lang);
    }
  }

  t(key: string, replacements?: Record<string, string>): string {
    const dict = translations[this.currentLanguage] || translations['en'];
    let text = dict[key] || translations['en'][key] || key;
    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        text = text.replace(new RegExp(`{${k}}`, 'g'), v);
      });
    }
    return text;
  }

  formatDate(date: Date | string | null, options?: Intl.DateTimeFormatOptions): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    const locale = this.currentLanguage === 'pt-br' ? 'pt-BR' : this.currentLanguage === 'es' ? 'es-ES' : 'en-US';
    return d.toLocaleDateString(locale, options);
  }

  formatDateTime(date: Date | string | null, options?: Intl.DateTimeFormatOptions): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    const locale = this.currentLanguage === 'pt-br' ? 'pt-BR' : this.currentLanguage === 'es' ? 'es-ES' : 'en-US';
    return d.toLocaleString(locale, options);
  }
}

export const i18n = new TranslationService();
