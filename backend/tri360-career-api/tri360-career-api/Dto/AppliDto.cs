namespace QuizBack.Dto
{
    public class AppliDto
    {
    public int ApplicationId { get; set; }
    public string? CvPath { get; set; }
    public RecruitementProcess? RecProcess { get; set; }

    public int? JobPostingId { get; set; }
    public Status? LastStatus {get; set;}
    public DateTime? ApplicationDate { get; set; }
    public int? PhoneNumber { get; set; }

    public int? UserId { get; set; }
    public int? AssignedTeamLeaderId { get; set; }

    public int? IdState { get; set; }
    public string? Email { get; set; }

    public string? NameApplication { get; set; }
    public decimal? HrScore { get; set; }
    public decimal? TechScore { get; set; }
    public decimal? TestScore { get; set; }
    public decimal? FinalScore { get; set; }
    public decimal? CvScore { get; set; }
    public int TestsCompleted { get; set; }
    public int TotalTests { get; set; }
    public int InterviewsCompleted { get; set; }
    public int TotalInterviews { get; set; }
    public string? AdminDecision { get; set; }
    public bool IsRecommended { get; set; }
    public string? RawAiResult { get; set; }

    public virtual ICollection<HistoriqueApplication> HistoriqueApplications { get; set; } = new List<HistoriqueApplication>();

    public virtual State? IdStateNavigation { get; set; }

    public virtual JobPosting? JobPosting { get; set; }

    public virtual ICollection<RecruitementProcess> RecruitementProcesses { get; set; } = new List<RecruitementProcess>();

    public virtual ICollection<ReponseValue> ReponseValues { get; set; } = new List<ReponseValue>();

    public virtual User? User { get; set; }

       

    }
}