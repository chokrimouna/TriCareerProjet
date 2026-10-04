using System;
using System.Collections.Generic;

namespace Quizback.Models;

public partial class JobPosting
{
    public int JobPostingId { get; set; }

    public string? PositionTitle { get; set; }

    public string? Description { get; set; }

    public string? Requirements { get; set; }

    public string? Missions { get; set; }

    public string? Skills { get; set; }

    public string? Experience { get; set; }

    public string? Location { get; set; }

    public DateTime? DatePosted { get; set; }

    public DateTime? ApplicationDeadline { get; set; }

    public bool? IsActive { get; set; }

    public int? DepartmentId { get; set; }

    public virtual ICollection<Application> Applications { get; set; } = new List<Application>();
}
