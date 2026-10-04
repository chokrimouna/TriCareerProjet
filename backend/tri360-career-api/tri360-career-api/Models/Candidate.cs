using System;
using System.Collections.Generic;

namespace Quizback.Models;

public partial class Candidate
{
    public int CandidateId { get; set; }

    public string? FirstName { get; set; }

    public string? LastName { get; set; }

    public string? Email { get; set; }

    public string? Phone { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual ICollection<CandidateCV> CandidateCVs { get; set; } = new List<CandidateCV>();

    public virtual ICollection<Application> Applications { get; set; } = new List<Application>();
}
