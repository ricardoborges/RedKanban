using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Collections.Specialized;
using System.Linq;
using Redmine.Net.Api;
using Redmine.Net.Api.Types;
using RedKanban.Backend.Services;
using RedKanban.Backend.Models;

namespace RedKanban.Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class KanbanController : ControllerBase
    {
        private readonly IRedmineClientProvider _clientProvider;

        public KanbanController(IRedmineClientProvider clientProvider)
        {
            _clientProvider = clientProvider;
        }

        [HttpGet("project")]
        public ActionResult<ProjectDto> GetProject()
        {
            try
            {
                var manager = _clientProvider.GetManager();
                var projectIdentifier = _clientProvider.ProjectIdentifier;

                if (string.IsNullOrWhiteSpace(projectIdentifier))
                {
                    return BadRequest("O identificador do projeto (X-Redmine-Project-Identifier) é obrigatório.");
                }

                var project = manager.GetObject<Project>(projectIdentifier, new NameValueCollection());
                if (project == null)
                {
                    return NotFound("Projeto não encontrado no Redmine.");
                }

                return Ok(new ProjectDto
                {
                    Id = project.Id,
                    Name = project.Name,
                    Identifier = project.Identifier
                });
            }
            catch (Exception ex)
            {
                return BadRequest($"Erro ao carregar projeto: {ex.Message}");
            }
        }

        [HttpGet("projects")]
        public ActionResult<List<ProjectDto>> GetProjects()
        {
            try
            {
                var manager = _clientProvider.GetManager();
                var parameters = new NameValueCollection
                {
                    { "limit", "100" }
                };
                var projects = manager.GetObjects<Project>(parameters);
                var projectsDto = projects != null
                    ? projects.Select(p => new ProjectDto
                      {
                          Id = p.Id,
                          Name = p.Name,
                          Identifier = p.Identifier
                      }).ToList()
                    : new List<ProjectDto>();

                return Ok(projectsDto);
            }
            catch (Exception ex)
            {
                return BadRequest($"Erro ao carregar projetos: {ex.Message}");
            }
        }

        [HttpGet("issues")]
        public ActionResult<object> GetIssuesAndStatuses()
        {
            try
            {
                var manager = _clientProvider.GetManager();
                var projectIdentifier = _clientProvider.ProjectIdentifier;

                if (string.IsNullOrWhiteSpace(projectIdentifier))
                {
                    return BadRequest("O identificador do projeto (X-Redmine-Project-Identifier) é obrigatório.");
                }

                // 1. Obter status ativos globais do Redmine
                var redmineStatuses = manager.GetObjects<IssueStatus>(new NameValueCollection());
                var statusesDto = redmineStatuses != null 
                    ? redmineStatuses.Select(s => new StatusDto
                      {
                          Id = s.Id,
                          Name = s.Name,
                          IsClosed = s.IsClosed
                      }).ToList()
                    : new List<StatusDto>();

                // 2. Obter Sprints (Versions) do projeto
                var versionParams = new NameValueCollection
                {
                    { "project_id", projectIdentifier }
                };
                var redmineVersions = manager.GetObjects<Redmine.Net.Api.Types.Version>(versionParams);
                var sprintsDto = new List<SprintDto>();

                if (redmineVersions != null)
                {
                    foreach (var v in redmineVersions)
                    {
                        var (goal, startDate, sprintStatus) = ParseSprintMetadata(v.Description, v.Status.ToString().ToLowerInvariant());
                        
                        sprintsDto.Add(new SprintDto
                        {
                            Id = v.Id,
                            Name = v.Name,
                            Goal = goal,
                            Status = sprintStatus,
                            StartDate = startDate,
                            EndDate = v.DueDate,
                            TotalStoryPoints = 0
                        });
                    }
                }

                // 3. Obter issues do projeto
                var parameters = new NameValueCollection
                {
                    { "project_id", projectIdentifier },
                    { "status_id", "*" }, // "*" para trazer abertas e fechadas
                    { "limit", "100" }
                };

                var redmineIssues = manager.GetObjects<Issue>(parameters);
                var issuesDto = new List<IssueDto>();

                if (redmineIssues != null)
                {
                    foreach (var i in redmineIssues)
                    {
                        var storyPoints = GetStoryPoints(i);
                        var sprintId = i.FixedVersion?.Id;

                        issuesDto.Add(new IssueDto
                        {
                            Id = i.Id,
                            Subject = i.Subject,
                            Description = i.Description ?? string.Empty,
                            StatusId = i.Status.Id,
                            StatusName = i.Status.Name,
                            AssignedToId = i.AssignedTo?.Id,
                            AssignedToName = i.AssignedTo?.Name ?? "Sem atribuição",
                            CreatedOn = i.CreatedOn,
                            UpdatedOn = i.UpdatedOn,
                            SprintId = sprintId,
                            SprintName = i.FixedVersion?.Name ?? string.Empty,
                            StoryPoints = storyPoints
                        });

                        if (sprintId.HasValue && storyPoints.HasValue)
                        {
                            var sprint = sprintsDto.FirstOrDefault(s => s.Id == sprintId.Value);
                            if (sprint != null)
                            {
                                sprint.TotalStoryPoints += storyPoints.Value;
                            }
                        }
                    }
                }

                return Ok(new
                {
                    Statuses = statusesDto,
                    Issues = issuesDto,
                    Sprints = sprintsDto
                });
            }
            catch (Exception ex)
            {
                return BadRequest($"Erro ao carregar dados do Kanban: {ex.Message}");
            }
        }

        [HttpPost("issues")]
        public ActionResult<IssueDto> CreateIssue([FromBody] CreateIssueRequest request)
        {
            try
            {
                var manager = _clientProvider.GetManager();
                var projectIdentifier = _clientProvider.ProjectIdentifier;

                if (string.IsNullOrWhiteSpace(projectIdentifier))
                {
                    return BadRequest("O identificador do projeto (X-Redmine-Project-Identifier) é obrigatório.");
                }

                // Obtemos o ID numérico do projeto primeiro com trackers inclusos
                var projectParams = new NameValueCollection { { "include", "trackers" } };
                var project = manager.GetObject<Project>(projectIdentifier, projectParams);
                if (project == null)
                {
                    return NotFound("Projeto não encontrado no Redmine.");
                }

                var newIssue = new Issue
                {
                    Subject = request.Subject,
                    Description = request.Description,
                    Project = IdentifiableName.Create<IdentifiableName>(project.Id),
                    Status = IdentifiableName.Create<IssueStatus>(request.StatusId)
                };

                if (project.Trackers != null && project.Trackers.Count > 0)
                {
                    newIssue.Tracker = IdentifiableName.Create<IdentifiableName>(project.Trackers.First().Id);
                }
                else
                {
                    newIssue.Tracker = IdentifiableName.Create<IdentifiableName>(1); // Fallback para ID 1 (Bug)
                }

                if (request.AssignedToId.HasValue)
                {
                    newIssue.AssignedTo = IdentifiableName.Create<IdentifiableName>(request.AssignedToId.Value);
                }

                var createdIssue = manager.CreateObject<Issue>(newIssue);

                return Ok(new IssueDto
                {
                    Id = createdIssue.Id,
                    Subject = createdIssue.Subject,
                    Description = createdIssue.Description ?? string.Empty,
                    StatusId = createdIssue.Status.Id,
                    StatusName = createdIssue.Status.Name,
                    AssignedToId = createdIssue.AssignedTo?.Id,
                    AssignedToName = createdIssue.AssignedTo?.Name ?? "Sem atribuição",
                    CreatedOn = createdIssue.CreatedOn,
                    UpdatedOn = createdIssue.UpdatedOn
                });
            }
            catch (Exception ex)
            {
                return BadRequest($"Erro ao criar issue: {ex.Message}");
            }
        }

        [HttpPut("issues/{id}/status")]
        public IActionResult UpdateIssueStatus(int id, [FromBody] UpdateStatusRequest request)
        {
            try
            {
                UpdateIssueStatusDirect(id, request.StatusId);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest($"Erro ao atualizar status da issue: {ex.Message}");
            }
        }

        [HttpGet("issues/{id}/details")]
        public ActionResult<IssueDetailsDto> GetIssueDetails(int id)
        {
            try
            {
                var manager = _clientProvider.GetManager();
                
                // Inclui os journals para ver o histórico e comentários
                var parameters = new NameValueCollection
                {
                    { "include", "journals" }
                };

                var i = manager.GetObject<Issue>(id.ToString(), parameters);
                if (i == null)
                {
                    return NotFound("Issue não encontrada.");
                }

                var issueDto = new IssueDto
                {
                    Id = i.Id,
                    Subject = i.Subject,
                    Description = i.Description ?? string.Empty,
                    StatusId = i.Status.Id,
                    StatusName = i.Status.Name,
                    AssignedToId = i.AssignedTo?.Id,
                    AssignedToName = i.AssignedTo?.Name ?? "Sem atribuição",
                    CreatedOn = i.CreatedOn,
                    UpdatedOn = i.UpdatedOn
                };

                // Map status IDs and User IDs to names for journal translation
                var statusMap = new Dictionary<string, string>();
                try
                {
                    var redmineStatuses = manager.GetObjects<IssueStatus>(new NameValueCollection());
                    if (redmineStatuses != null)
                    {
                        foreach (var status in redmineStatuses)
                        {
                            if (status != null && !statusMap.ContainsKey(status.Id.ToString()))
                            {
                                statusMap[status.Id.ToString()] = status.Name;
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Erro ao carregar status para mapa: {ex.Message}");
                }

                var userMap = new Dictionary<string, string>();
                var projectIdentifier = _clientProvider.ProjectIdentifier;
                if (!string.IsNullOrWhiteSpace(projectIdentifier))
                {
                    try
                    {
                        var memberships = manager.GetObjects<ProjectMembership>(new NameValueCollection { { "project_id", projectIdentifier } });
                        if (memberships != null)
                        {
                            foreach (var m in memberships)
                            {
                                if (m.User != null && !userMap.ContainsKey(m.User.Id.ToString()))
                                {
                                    userMap[m.User.Id.ToString()] = m.User.Name;
                                }
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Erro ao carregar membros do projeto para mapa: {ex.Message}");
                    }
                }

                if (i.Author != null && !userMap.ContainsKey(i.Author.Id.ToString()))
                {
                    userMap[i.Author.Id.ToString()] = i.Author.Name;
                }
                if (i.AssignedTo != null && !userMap.ContainsKey(i.AssignedTo.Id.ToString()))
                {
                    userMap[i.AssignedTo.Id.ToString()] = i.AssignedTo.Name;
                }

                if (i.Journals != null)
                {
                    foreach (var j in i.Journals)
                    {
                        if (j.User != null && !userMap.ContainsKey(j.User.Id.ToString()))
                        {
                            userMap[j.User.Id.ToString()] = j.User.Name;
                        }
                    }
                }

                var journalsDto = new List<JournalDto>();
                if (i.Journals != null)
                {
                    foreach (var j in i.Journals)
                    {
                        var detailDtos = new List<JournalDetailDto>();
                        if (j.Details != null)
                        {
                            detailDtos = j.Details.Select(d =>
                            {
                                var oldValue = d.OldValue;
                                var newValue = d.NewValue;

                                if (d.Property == "attr")
                                {
                                    if (d.Name == "status_id")
                                    {
                                        if (!string.IsNullOrEmpty(d.OldValue) && statusMap.TryGetValue(d.OldValue, out var oldStatusName))
                                        {
                                            oldValue = oldStatusName;
                                        }
                                        if (!string.IsNullOrEmpty(d.NewValue) && statusMap.TryGetValue(d.NewValue, out var newStatusName))
                                        {
                                            newValue = newStatusName;
                                        }
                                    }
                                    else if (d.Name == "assigned_to_id")
                                    {
                                        if (!string.IsNullOrEmpty(d.OldValue) && userMap.TryGetValue(d.OldValue, out var oldUserName))
                                        {
                                            oldValue = oldUserName;
                                        }
                                        if (!string.IsNullOrEmpty(d.NewValue) && userMap.TryGetValue(d.NewValue, out var newUserName))
                                        {
                                            newValue = newUserName;
                                        }
                                    }
                                }

                                return new JournalDetailDto
                                {
                                    Property = d.Property,
                                    Name = d.Name,
                                    OldValue = oldValue,
                                    NewValue = newValue
                                };
                            }).ToList();
                        }

                        journalsDto.Add(new JournalDto
                        {
                            Id = j.Id,
                            User = j.User?.Name ?? "Sistema",
                            Notes = j.Notes ?? string.Empty,
                            CreatedOn = j.CreatedOn,
                            Details = detailDtos
                        });
                    }
                }

                // Ordena os comentários do mais novo para o mais antigo ou vice-versa. 
                // Linhas do tempo geralmente são mais novas em baixo, mas podemos listar ordenado por data de criação.
                journalsDto = journalsDto.OrderBy(j => j.CreatedOn).ToList();

                return Ok(new IssueDetailsDto
                {
                    Issue = issueDto,
                    Journals = journalsDto
                });
            }
            catch (Exception ex)
            {
                return BadRequest($"Erro ao carregar detalhes da issue: {ex.Message}");
            }
        }

        [HttpPost("issues/{id}/journals")]
        public IActionResult AddJournal(int id, [FromBody] AddCommentRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.Notes))
                {
                    return BadRequest("O comentário não pode ser vazio.");
                }

                AddIssueCommentDirect(id, request.Notes);
                return Ok();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest($"Erro ao adicionar comentário: {ex.Message}");
            }
        }

        [HttpGet("statuses")]
        public ActionResult<List<StatusDto>> GetStatuses()
        {
            try
            {
                var manager = _clientProvider.GetManager();
                var redmineStatuses = manager.GetObjects<IssueStatus>(new NameValueCollection());
                var statusesDto = redmineStatuses != null 
                    ? redmineStatuses.Select(s => new StatusDto
                      {
                          Id = s.Id,
                          Name = s.Name,
                          IsClosed = s.IsClosed
                      }).ToList()
                    : new List<StatusDto>();
                return Ok(statusesDto);
            }
            catch (Exception ex)
            {
                return BadRequest($"Erro ao carregar status: {ex.Message}");
            }
        }

        [HttpGet("current-user")]
        public ActionResult<UserDto> GetCurrentUser()
        {
            try
            {
                var manager = _clientProvider.GetManager();
                var user = manager.GetObject<User>("current", new NameValueCollection());
                if (user == null)
                {
                    return NotFound("Usuário não encontrado.");
                }

                var name = $"{user.FirstName} {user.LastName}".Trim();
                if (string.IsNullOrWhiteSpace(name))
                {
                    name = user.Login ?? "Usuário Redmine";
                }

                return Ok(new UserDto
                {
                    Id = user.Id,
                    Name = name
                });
            }
            catch (Exception ex)
            {
                return BadRequest($"Erro ao obter usuário atual: {ex.Message}");
            }
        }

        [HttpGet("redmine-url")]
        public ActionResult<object> GetRedmineUrl()
        {
            var url = Environment.GetEnvironmentVariable("REDMINE_URL") ?? string.Empty;
            return Ok(new { redmineUrl = url });
        }

        [HttpGet("users")]
        public ActionResult<List<UserDto>> GetProjectUsers()
        {
            try
            {
                var manager = _clientProvider.GetManager();
                var projectIdentifier = _clientProvider.ProjectIdentifier;

                if (string.IsNullOrWhiteSpace(projectIdentifier))
                {
                    return BadRequest("O identificador do projeto (X-Redmine-Project-Identifier) é obrigatório.");
                }

                var parameters = new NameValueCollection
                {
                    { "project_id", projectIdentifier }
                };

                var memberships = manager.GetObjects<ProjectMembership>(parameters);
                
                var usersDto = memberships != null
                    ? memberships
                        .Where(m => m.User != null)
                        .Select(m => new UserDto
                        {
                            Id = m.User.Id,
                            Name = m.User.Name
                        })
                        .ToList()
                    : new List<UserDto>();

                return Ok(usersDto);
            }
            catch (Exception ex)
            {
                return BadRequest($"Erro ao listar membros: {ex.Message}");
            }
        }

        // Helpers para metadados de Sprints (salvos na descrição das Versões do Redmine)
        private static (string goal, DateTime? startDate, string status) ParseSprintMetadata(string? description, string redmineStatus)
        {
            if (string.IsNullOrWhiteSpace(description))
            {
                return (string.Empty, null, redmineStatus == "closed" ? "closed" : "future");
            }

            string goal = description;
            DateTime? startDate = null;
            string status = redmineStatus == "closed" ? "closed" : "future";

            var match = System.Text.RegularExpressions.Regex.Match(description, @"\[SprintMetadata:\s*(\{.*?\})\]");
            if (match.Success)
            {
                try
                {
                    var json = match.Groups[1].Value;
                    using var doc = System.Text.Json.JsonDocument.Parse(json);
                    if (doc.RootElement.TryGetProperty("StartDate", out var startDateProp) && startDateProp.GetString() is string sdStr && DateTime.TryParse(sdStr, out var sd))
                    {
                        startDate = sd;
                    }
                    if (doc.RootElement.TryGetProperty("Status", out var statusProp) && statusProp.GetString() is string sStr)
                    {
                        status = sStr;
                    }
                }
                catch {}

                goal = description.Substring(0, match.Index).TrimEnd('\r', '\n', ' ', '-');
            }

            if (redmineStatus == "closed")
            {
                status = "closed";
            }

            return (goal, startDate, status);
        }

        private static string FormatSprintMetadata(string goal, DateTime? startDate, string status)
        {
            var metaJson = $"{{\"StartDate\":{(startDate.HasValue ? $"\"{startDate.Value.ToString("yyyy-MM-dd")}\"" : "null")},\"Status\":\"{status}\"}}";
            return $"{goal}\n\n---\n[SprintMetadata: {metaJson}]";
        }

        // Helper para extrair Story Points ou Estimated Hours da Issue
        private static double? GetStoryPoints(Issue issue)
        {
            if (issue.CustomFields != null)
            {
                var cf = issue.CustomFields.FirstOrDefault(c => 
                    c.Name.Equals("Story Points", StringComparison.OrdinalIgnoreCase) || 
                    c.Name.Equals("StoryPoints", StringComparison.OrdinalIgnoreCase) || 
                    c.Name.Equals("Pontos de História", StringComparison.OrdinalIgnoreCase) || 
                    c.Name.Equals("Pontos de Historia", StringComparison.OrdinalIgnoreCase));
                
                if (cf != null && !string.IsNullOrWhiteSpace(cf.Value))
                {
                    if (double.TryParse(cf.Value, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var sp))
                    {
                        return sp;
                    }
                }
            }
            return issue.EstimatedHours.HasValue ? (double)issue.EstimatedHours.Value : null;
        }

        // Helper para atualizar ou limpar fixed_version_id com compatibilidade para Redmine 3.3.2
        private void UpdateIssueFixedVersion(int issueId, int? sprintId)
        {
            var url = _clientProvider.RedmineUrl;
            var apiKey = _clientProvider.ApiKey;

            if (string.IsNullOrWhiteSpace(url) || string.IsNullOrWhiteSpace(apiKey))
            {
                throw new InvalidOperationException("A URL ou a API Key do Redmine não foi fornecida.");
            }

            // Montar e enviar a requisição HTTP PUT de compatibilidade
            using var client = new System.Net.Http.HttpClient();
            client.DefaultRequestHeaders.Add("X-Redmine-API-Key", apiKey);

            var endpoint = $"{url.TrimEnd('/')}/issues/{issueId}.json";
            
            // Se sprintId for nulo, passamos "" (string vazia) para limpar o campo no Redmine 3.3.2
            var fixedVersionValue = sprintId.HasValue ? sprintId.Value.ToString() : "\"\"";
            
            var jsonPayload = $"{{\"issue\": {{\"fixed_version_id\": {fixedVersionValue}}}}}";

            var content = new System.Net.Http.StringContent(jsonPayload, System.Text.Encoding.UTF8, "application/json");

            var response = client.PutAsync(endpoint, content).GetAwaiter().GetResult();
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = response.Content.ReadAsStringAsync().GetAwaiter().GetResult();
                throw new Exception($"Falha ao atualizar tarefa no Redmine: {response.StatusCode} - {errorContent}");
            }
        }

        private void UpdateRedmineVersionDirect(int versionId, string name, string description, string status, DateTime? dueDate)
        {
            var url = _clientProvider.RedmineUrl;
            var apiKey = _clientProvider.ApiKey;

            if (string.IsNullOrWhiteSpace(url) || string.IsNullOrWhiteSpace(apiKey))
            {
                throw new InvalidOperationException("A URL ou a API Key do Redmine não foi fornecida.");
            }

            using var client = new System.Net.Http.HttpClient();
            client.DefaultRequestHeaders.Add("X-Redmine-API-Key", apiKey);

            var endpoint = $"{url.TrimEnd('/')}/versions/{versionId}.json";

            var versionStatus = status switch
            {
                "closed" => "closed",
                "locked" => "locked",
                _ => "open"
            };

            var dueDateValue = dueDate.HasValue ? $"\"{dueDate.Value.ToString("yyyy-MM-dd")}\"" : "\"\"";

            var escapedName = System.Text.Json.JsonSerializer.Serialize(name);
            var escapedDescription = System.Text.Json.JsonSerializer.Serialize(description);

            var jsonPayload = $@"{{
                ""version"": {{
                    ""name"": {escapedName},
                    ""description"": {escapedDescription},
                    ""status"": ""{versionStatus}"",
                    ""due_date"": {dueDateValue}
                }}
            }}";

            var content = new System.Net.Http.StringContent(jsonPayload, System.Text.Encoding.UTF8, "application/json");

            var response = client.PutAsync(endpoint, content).GetAwaiter().GetResult();
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                throw new KeyNotFoundException("Sprint não encontrada no Redmine.");
            }
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = response.Content.ReadAsStringAsync().GetAwaiter().GetResult();
                throw new Exception($"Falha ao atualizar a sprint no Redmine: {response.StatusCode} - {errorContent}");
            }
        }

        private void UpdateIssueStatusDirect(int issueId, int statusId)
        {
            var url = _clientProvider.RedmineUrl;
            var apiKey = _clientProvider.ApiKey;

            if (string.IsNullOrWhiteSpace(url) || string.IsNullOrWhiteSpace(apiKey))
            {
                throw new InvalidOperationException("A URL ou a API Key do Redmine não foi fornecida.");
            }

            using var client = new System.Net.Http.HttpClient();
            client.DefaultRequestHeaders.Add("X-Redmine-API-Key", apiKey);

            var endpoint = $"{url.TrimEnd('/')}/issues/{issueId}.json";
            var jsonPayload = $"{{\"issue\": {{\"status_id\": {statusId}}}}}";

            var content = new System.Net.Http.StringContent(jsonPayload, System.Text.Encoding.UTF8, "application/json");

            var response = client.PutAsync(endpoint, content).GetAwaiter().GetResult();
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                throw new KeyNotFoundException("Tarefa não encontrada no Redmine.");
            }
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = response.Content.ReadAsStringAsync().GetAwaiter().GetResult();
                throw new Exception($"Falha ao atualizar status da tarefa no Redmine: {response.StatusCode} - {errorContent}");
            }
        }

        private void AddIssueCommentDirect(int issueId, string notes)
        {
            var url = _clientProvider.RedmineUrl;
            var apiKey = _clientProvider.ApiKey;

            if (string.IsNullOrWhiteSpace(url) || string.IsNullOrWhiteSpace(apiKey))
            {
                throw new InvalidOperationException("A URL ou a API Key do Redmine não foi fornecida.");
            }

            using var client = new System.Net.Http.HttpClient();
            client.DefaultRequestHeaders.Add("X-Redmine-API-Key", apiKey);

            var endpoint = $"{url.TrimEnd('/')}/issues/{issueId}.json";
            var escapedNotes = System.Text.Json.JsonSerializer.Serialize(notes);
            var jsonPayload = $"{{\"issue\": {{\"notes\": {escapedNotes}}}}}";

            var content = new System.Net.Http.StringContent(jsonPayload, System.Text.Encoding.UTF8, "application/json");

            var response = client.PutAsync(endpoint, content).GetAwaiter().GetResult();
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                throw new KeyNotFoundException("Tarefa não encontrada no Redmine.");
            }
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = response.Content.ReadAsStringAsync().GetAwaiter().GetResult();
                throw new Exception($"Falha ao adicionar comentário no Redmine: {response.StatusCode} - {errorContent}");
            }
        }


        [HttpPost("sprints")]
        public ActionResult<SprintDto> CreateSprint([FromBody] CreateSprintRequest request)
        {
            try
            {
                var manager = _clientProvider.GetManager();
                var projectIdentifier = _clientProvider.ProjectIdentifier;

                if (string.IsNullOrWhiteSpace(projectIdentifier))
                {
                    return BadRequest("O identificador do projeto (X-Redmine-Project-Identifier) é obrigatório.");
                }

                var project = manager.GetObject<Project>(projectIdentifier, new NameValueCollection());
                if (project == null)
                {
                    return NotFound("Projeto não encontrado no Redmine.");
                }

                var newVersion = new Redmine.Net.Api.Types.Version
                {
                    Name = request.Name,
                    Description = FormatSprintMetadata(request.Goal, request.StartDate, "future"),
                    Status = VersionStatus.Open
                };

                if (request.EndDate.HasValue)
                {
                    newVersion.DueDate = request.EndDate.Value;
                }

                var createdVersion = manager.CreateObject<Redmine.Net.Api.Types.Version>(newVersion, projectIdentifier);
                var (goal, startDate, sprintStatus) = ParseSprintMetadata(createdVersion.Description, createdVersion.Status.ToString().ToLowerInvariant());

                return Ok(new SprintDto
                {
                    Id = createdVersion.Id,
                    Name = createdVersion.Name,
                    Goal = goal,
                    Status = sprintStatus,
                    StartDate = startDate,
                    EndDate = createdVersion.DueDate,
                    TotalStoryPoints = 0
                });
            }
            catch (Exception ex)
            {
                return BadRequest($"Erro ao criar sprint: {ex.Message}");
            }
        }

        [HttpPut("sprints/{id}")]
        public IActionResult UpdateSprint(int id, [FromBody] UpdateSprintRequest request)
        {
            try
            {
                var description = FormatSprintMetadata(request.Goal, request.StartDate, request.Status);
                UpdateRedmineVersionDirect(id, request.Name, description, request.Status, request.EndDate);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest($"Erro ao atualizar sprint: {ex.Message}");
            }
        }

        [HttpPut("issues/{id}/sprint")]
        public IActionResult MoveIssueToSprint(int id, [FromBody] MoveIssueRequest request)
        {
            try
            {
                var manager = _clientProvider.GetManager();
                var issue = manager.GetObject<Issue>(id.ToString(), new NameValueCollection());
                if (issue == null)
                {
                    return NotFound("Tarefa não encontrada.");
                }

                // Usamos o helper de compatibilidade HTTP para definir ou limpar a sprint
                UpdateIssueFixedVersion(id, request.SprintId);

                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest($"Erro ao mover tarefa para sprint: {ex.Message}");
            }
        }

        [HttpPost("sprints/{id}/complete")]
        public IActionResult CompleteSprint(int id, [FromBody] CompleteSprintRequest request)
        {
            try
            {
                var manager = _clientProvider.GetManager();
                var projectIdentifier = _clientProvider.ProjectIdentifier;

                var existingVersion = manager.GetObject<Redmine.Net.Api.Types.Version>(id.ToString(), new NameValueCollection());
                if (existingVersion == null)
                {
                    return NotFound("Sprint não encontrada.");
                }

                var (goal, startDate, _) = ParseSprintMetadata(existingVersion.Description, existingVersion.Status.ToString().ToLowerInvariant());
                var closedDescription = FormatSprintMetadata(goal, startDate, "closed");
                
                UpdateRedmineVersionDirect(id, existingVersion.Name, closedDescription, "closed", existingVersion.DueDate);

                var parameters = new NameValueCollection
                {
                    { "project_id", projectIdentifier },
                    { "fixed_version_id", id.ToString() },
                    { "status_id", "*" },
                    { "limit", "100" }
                };

                var issues = manager.GetObjects<Issue>(parameters);
                if (issues != null)
                {
                    var redmineStatuses = manager.GetObjects<IssueStatus>(new NameValueCollection());
                    var closedStatusIds = redmineStatuses != null
                        ? redmineStatuses.Where(s => s.IsClosed).Select(s => s.Id).ToHashSet()
                        : new HashSet<int> { 5, 6 }; // Default fallbacks (Closed, Rejected)

                    foreach (var issue in issues)
                    {
                        if (!closedStatusIds.Contains(issue.Status.Id))
                        {
                            // Usamos o helper de compatibilidade HTTP para definir ou limpar a sprint das tarefas incompletas
                            UpdateIssueFixedVersion(issue.Id, request.MoveIncompleteToSprintId);
                        }
                    }
                }

                return Ok();
            }
            catch (Exception ex)
            {
                return BadRequest($"Erro ao concluir sprint: {ex.Message}");
            }
        }
    }
}
