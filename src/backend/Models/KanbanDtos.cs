using System;
using System.Collections.Generic;

namespace RedKanban.Backend.Models
{
    public class ProjectDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Identifier { get; set; } = string.Empty;
    }

    public class StatusDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public bool IsClosed { get; set; }
    }

    public class UserDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
    }

    public class IssueDto
    {
        public int Id { get; set; }
        public string Subject { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int StatusId { get; set; }
        public string StatusName { get; set; } = string.Empty;
        public int? AssignedToId { get; set; }
        public string AssignedToName { get; set; } = string.Empty;
        public DateTime? CreatedOn { get; set; }
        public DateTime? UpdatedOn { get; set; }
        public int? SprintId { get; set; }
        public string SprintName { get; set; } = string.Empty;
        public double? StoryPoints { get; set; }
    }

    public class JournalDetailDto
    {
        public string Property { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? OldValue { get; set; }
        public string? NewValue { get; set; }
    }

    public class JournalDto
    {
        public int Id { get; set; }
        public string User { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
        public DateTime? CreatedOn { get; set; }
        public List<JournalDetailDto> Details { get; set; } = new();
    }

    public class IssueDetailsDto
    {
        public IssueDto Issue { get; set; } = new();
        public List<JournalDto> Journals { get; set; } = new();
    }

    public class AttachmentDto
    {
        public string Token { get; set; } = string.Empty;
        public string Filename { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
    }

    public class CreateIssueRequest
    {
        public string Subject { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int StatusId { get; set; }
        public int? AssignedToId { get; set; }
        public List<AttachmentDto>? Attachments { get; set; }
    }

    public class UpdateStatusRequest
    {
        public int StatusId { get; set; }
    }

    public class AddCommentRequest
    {
        public string Notes { get; set; } = string.Empty;
        public List<AttachmentDto>? Attachments { get; set; }
    }

    public class SprintDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Goal { get; set; } = string.Empty;
        public string Status { get; set; } = "future"; // future, active, closed
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public double TotalStoryPoints { get; set; }
    }

    public class CreateSprintRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Goal { get; set; } = string.Empty;
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
    }

    public class UpdateSprintRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Goal { get; set; } = string.Empty;
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string Status { get; set; } = "future";
    }

    public class MoveIssueRequest
    {
        public int? SprintId { get; set; }
    }

    public class CompleteSprintRequest
    {
        public int? MoveIncompleteToSprintId { get; set; }
    }

    public class LoginRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string? RedmineUrl { get; set; }
    }
}
