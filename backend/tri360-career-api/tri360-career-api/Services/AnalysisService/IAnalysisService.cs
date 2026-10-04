namespace Quizback.Services
{
    public interface IAnalysisService
    {
        // US12/US19 : forces/faiblesses + compétences manquantes
        Task<AnalysisResult> AnalyzeAsync(int applicationId);
        // US20 : rapport d'évaluation (généré + stocké)
        Task<ReportResult> GenerateReportAsync(int applicationId);

        // Écran "Analyse IA des CV" : analyse d'un CV uploadé contre une offre
        Task<CvUploadAnalysisResult> AnalyzeUploadedCvAsync(string cvFileName, int jobPostingId);

        // Écran "Analyse IA des CV" : archiver un CV analysé -> candidature archivée (renvoie l'id créé)
        Task<int> ArchiveCvAsync(ArchiveCvRequest req);

        // Page "Gestion des tests" : génération d'un quiz (QCM) via l'IA
        Task<QuizResult> GenerateQuizAsync(GenerateQuizRequest req);

        // Assistant d'aide (chatbot) par rôle
        Task<ChatResult> ChatAsync(ChatRequest req);
    }

    public class ChatMessageDto
    {
        public string Role { get; set; } = "user";
        public string Content { get; set; } = "";
    }

    public class ChatRequest
    {
        public string Role { get; set; } = "candidate";
        public List<ChatMessageDto> Messages { get; set; } = new();
        public string? Page { get; set; }
    }

    public class ChatResult
    {
        public string? Reply { get; set; }
        public string? Error { get; set; }
    }

    public class ArchiveCvRequest
    {
        public string StoredName { get; set; } = "";
        public int JobPostingId { get; set; }
        public string? CandidateName { get; set; }
        public string? Email { get; set; }
        public double MatchingScore { get; set; }
    }

    public class GenerateQuizRequest
    {
        public List<string> Skills { get; set; } = new();
        public string? CvFilename { get; set; }
        public int? JobId { get; set; }
        public int NumQuestions { get; set; } = 5;
    }

    public class QuizQuestion
    {
        public string Question { get; set; } = "";
        public string Skill { get; set; } = "";
        public List<string> Options { get; set; } = new();
        public int CorrectIndex { get; set; }
    }

    public class QuizResult
    {
        public List<string> Skills { get; set; } = new();
        public List<QuizQuestion> Questions { get; set; } = new();
        public string? Error { get; set; }
    }

    public class CvUploadAnalysisResult
    {
        public double MatchingScore { get; set; }
        public List<string> Skills { get; set; } = new();
        public List<string> MissingSkills { get; set; } = new();
        public List<string> Strengths { get; set; } = new();
        public List<string> Weaknesses { get; set; } = new();
        public string? Summary { get; set; }
        public string? Error { get; set; }
    }

    public class AnalysisResult
    {
        public int ApplicationId { get; set; }
        public double MatchingScore { get; set; }
        public List<string> Skills { get; set; } = new();
        public List<string> MissingSkills { get; set; } = new();
        public List<string> Strengths { get; set; } = new();
        public List<string> Weaknesses { get; set; } = new();
        public List<string> Recommendations { get; set; } = new();
        public string? Summary { get; set; }
        public string? Error { get; set; }
    }

    public class ReportResult
    {
        public int ApplicationId { get; set; }
        public int ReportId { get; set; }
        public string? Content { get; set; }
        public string? Error { get; set; }
    }
}
