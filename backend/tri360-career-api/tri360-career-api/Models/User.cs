using System;
using System.Collections.Generic;

namespace Quizback.Models;

public partial class User
{
    public int UserId { get; set; }

    public string? Name { get; set; }

    public string? Prename { get; set; }

    public string? Email { get; set; }

    public string? Password { get; set; }

    public string? Telephone { get; set; }

    public string? Adresse { get; set; }

    public int? RoleId { get; set; }

    public string? RefreshToken { get; set; }

    public DateTime? TokenRdateCreation { get; set; }

    public DateTime? TokenRdateExpiration { get; set; }

    public string? Token { get; set; }

    public bool? Etat { get; set; }

    public int? DepartmentId { get; set; }

    public virtual Department? Department { get; set; }

    public virtual ICollection<Application> Applications { get; set; } = new List<Application>();

    public virtual ICollection<Examan> Examen { get; set; } = new List<Examan>();

    public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();

    public virtual ICollection<RecruitementProcess> RecruitementProcesses { get; set; } = new List<RecruitementProcess>();

    public virtual Role? Role { get; set; }

    public virtual ICollection<Section> Sections { get; set; } = new List<Section>();

    public virtual ICollection<Suivi> Suivis { get; set; } = new List<Suivi>();
}
