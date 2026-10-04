using System;
using System.Collections.Generic;

namespace Quizback.Models;

public partial class CandidateCV
{
    public int CVId { get; set; }

    public int CandidateId { get; set; }

    public string CVPath { get; set; } = null!;

    public DateTime? UploadDate { get; set; }

    public virtual Candidate Candidate { get; set; } = null!;

    public virtual ICollection<Application> Applications { get; set; } = new List<Application>();
}
