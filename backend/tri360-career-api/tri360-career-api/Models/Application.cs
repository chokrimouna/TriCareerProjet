using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace Quizback.Models;

public partial class Application
{
    public int ApplicationId { get; set; }

    public int? JobPostingId { get; set; }

    public DateTime? ApplicationDate { get; set; }

    public int? UserId { get; set; }

    public int? IdState { get; set; }

    public string? CvPath { get; set; }

    public string? NameApplication { get; set; }

    public string? Email { get; set; }

    public int? PhoneNumber { get; set; }

    public int? CandidateId { get; set; }

    public int? CVId { get; set; }
    public int? AssignedTeamLeaderId { get; set; }

    public int? HrScore { get; set; }
    public int? TechScore { get; set; }
    public int? TestScore { get; set; }
    public decimal? FinalScore { get; set; }
    public string? AdminDecision { get; set; } = "Pending";
    public bool IsRecommended { get; set; } = false;

    public virtual Candidate? Candidate { get; set; }

    public virtual CandidateCV? CandidateCV { get; set; }

    public virtual ICollection<AiResult> AiResults { get; set; } = new List<AiResult>();

    public virtual ICollection<HistoriqueApplication> HistoriqueApplications { get; set; } = new List<HistoriqueApplication>();

    public virtual State? IdStateNavigation { get; set; }

    public virtual JobPosting? JobPosting { get; set; }

    public virtual ICollection<RecruitementProcess> RecruitementProcesses { get; set; } = new List<RecruitementProcess>();

    public virtual ICollection<Session> Sessions { get; set; } = new List<Session>();

    public virtual User? User { get; set; }
}
