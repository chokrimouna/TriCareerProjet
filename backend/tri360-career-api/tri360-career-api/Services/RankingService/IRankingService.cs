namespace Quizback.Services
{
    public interface IRankingService
    {
        // US23/US29 : appelle le micro-service de matching, renvoie le classement
        // des candidats par score et marque automatiquement les meilleurs comme recommandés.
        Task<RankingResult> GetRankingAsync(int jobPostingId);
    }

    public class RankedCandidate
    {
        public int ApplicationId { get; set; }
        public int CandidateId { get; set; }
        public string? CandidateName { get; set; }
        public double MatchingScore { get; set; }
        public List<string> SkillsFound { get; set; } = new();
        public bool Recommended { get; set; }
        public int Rank { get; set; }
    }

    public class RankingResult
    {
        public int JobPostingId { get; set; }
        public int TotalCandidates { get; set; }
        public List<RankedCandidate> Candidates { get; set; } = new();
    }
}
