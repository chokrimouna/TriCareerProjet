using System.Linq;
using System.Text;
using System.Text.Json;
using Quizback.Models;

namespace Quizback.Services
{
    public class AnalysisService : IAnalysisService
    {
        private readonly HttpClient _http;
        private readonly TriCareerContext _db;
        private readonly IConfiguration _config;

        public AnalysisService(HttpClient http, TriCareerContext db, IConfiguration config)
        {
            _http = http;
            _db = db;
            _config = config;
        }

        private string BaseUrl =>
            (_config["MATCHING_AI_URL"]
             ?? Environment.GetEnvironmentVariable("MATCHING_AI_URL")
             ?? "http://matching-ai:8000").TrimEnd('/');

        private async Task<JsonElement> PostAsync(string path, int applicationId)
        {
            var payload = new StringContent(
                JsonSerializer.Serialize(new { application_id = applicationId }),
                Encoding.UTF8, "application/json");

            var resp = await _http.PostAsync($"{BaseUrl}{path}", payload);
            resp.EnsureSuccessStatusCode();
            var json = await resp.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.Clone();
        }

        public async Task<AnalysisResult> AnalyzeAsync(int applicationId)
        {
            var root = await PostAsync("/analyze", applicationId);
            var result = new AnalysisResult { ApplicationId = applicationId };

            if (root.TryGetProperty("error", out var err) && err.ValueKind == JsonValueKind.String)
            {
                result.Error = err.GetString();
                return result;
            }

            if (root.TryGetProperty("matching_score", out var ms) && ms.ValueKind == JsonValueKind.Number)
                result.MatchingScore = ms.GetDouble();
            result.Skills = GetStrings(root, "skills");
            result.MissingSkills = GetStrings(root, "missing_skills");
            result.Strengths = GetStrings(root, "strengths");
            result.Weaknesses = GetStrings(root, "weaknesses");
            result.Recommendations = GetStrings(root, "recommendations");
            if (root.TryGetProperty("summary", out var s) && s.ValueKind == JsonValueKind.String)
                result.Summary = s.GetString();
            return result;
        }

        public async Task<ReportResult> GenerateReportAsync(int applicationId)
        {
            var root = await PostAsync("/report", applicationId);
            var result = new ReportResult { ApplicationId = applicationId };

            if (root.TryGetProperty("error", out var err) && err.ValueKind == JsonValueKind.String)
            {
                result.Error = err.GetString();
                return result;
            }

            string content = root.TryGetProperty("report", out var rep)
                ? rep.GetRawText()
                : root.GetRawText();

            var entity = new EvaluationReport
            {
                ApplicationId = applicationId,
                Content = content,
                CreatedAt = DateTime.Now,
            };
            _db.EvaluationReports.Add(entity);
            await _db.SaveChangesAsync();

            result.ReportId = entity.Id;
            result.Content = content;
            return result;
        }

        public async Task<CvUploadAnalysisResult> AnalyzeUploadedCvAsync(string cvFileName, int jobPostingId)
        {
            var payload = new StringContent(
                JsonSerializer.Serialize(new { cv_filename = cvFileName, job_id = jobPostingId }),
                Encoding.UTF8, "application/json");

            var resp = await _http.PostAsync($"{BaseUrl}/analyze-cv", payload);
            resp.EnsureSuccessStatusCode();
            var json = await resp.Content.ReadAsStringAsync();

            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var result = new CvUploadAnalysisResult();

            if (root.TryGetProperty("error", out var err) && err.ValueKind == JsonValueKind.String)
            {
                result.Error = err.GetString();
                return result;
            }

            if (root.TryGetProperty("matching_score", out var ms) && ms.ValueKind == JsonValueKind.Number)
                result.MatchingScore = ms.GetDouble();
            result.Skills = GetStrings(root, "skills");
            result.MissingSkills = GetStrings(root, "missing_skills");
            result.Strengths = GetStrings(root, "strengths");
            result.Weaknesses = GetStrings(root, "weaknesses");
            if (root.TryGetProperty("summary", out var s) && s.ValueKind == JsonValueKind.String)
                result.Summary = s.GetString();
            return result;
        }

        public async Task<int> ArchiveCvAsync(ArchiveCvRequest req)
        {
            // Crée une candidature archivée (IdState = 4 : Refusé/archivé) à partir
            // d'un CV analysé sur l'écran "Analyse IA des CV".
            var app = new Application
            {
                JobPostingId = req.JobPostingId,
                IdState = 4,
                CvPath = req.StoredName,
                NameApplication = string.IsNullOrWhiteSpace(req.CandidateName) ? "Candidat" : req.CandidateName,
                Email = req.Email,
                ApplicationDate = DateTime.Now,
                FinalScore = (decimal)req.MatchingScore,
                AdminDecision = "Archivé",
                IsRecommended = false,
            };
            _db.Applications.Add(app);
            await _db.SaveChangesAsync();
            return app.ApplicationId;
        }

        public async Task<QuizResult> GenerateQuizAsync(GenerateQuizRequest req)
        {
            var payload = new StringContent(
                JsonSerializer.Serialize(new
                {
                    skills = req.Skills ?? new List<string>(),
                    cv_filename = req.CvFilename,
                    job_id = req.JobId,
                    num_questions = req.NumQuestions,
                }),
                Encoding.UTF8, "application/json");

            var resp = await _http.PostAsync($"{BaseUrl}/generate-quiz", payload);
            resp.EnsureSuccessStatusCode();
            var json = await resp.Content.ReadAsStringAsync();

            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var result = new QuizResult();

            if (root.TryGetProperty("error", out var err) && err.ValueKind == JsonValueKind.String)
            {
                result.Error = err.GetString();
                return result;
            }

            result.Skills = GetStrings(root, "skills");
            if (root.TryGetProperty("questions", out var qs) && qs.ValueKind == JsonValueKind.Array)
            {
                foreach (var q in qs.EnumerateArray())
                {
                    var quizQ = new QuizQuestion
                    {
                        Question = q.TryGetProperty("question", out var qq) && qq.ValueKind == JsonValueKind.String ? qq.GetString() ?? "" : "",
                        Skill = q.TryGetProperty("skill", out var sk) && sk.ValueKind == JsonValueKind.String ? sk.GetString() ?? "" : "",
                        CorrectIndex = q.TryGetProperty("correct_index", out var ci) && ci.ValueKind == JsonValueKind.Number ? ci.GetInt32() : 0,
                    };
                    if (q.TryGetProperty("options", out var opts) && opts.ValueKind == JsonValueKind.Array)
                        foreach (var o in opts.EnumerateArray())
                            if (o.ValueKind == JsonValueKind.String)
                                quizQ.Options.Add(o.GetString() ?? "");
                    result.Questions.Add(quizQ);
                }
            }
            return result;
        }

        public async Task<ChatResult> ChatAsync(ChatRequest req)
        {
            var payload = new StringContent(
                JsonSerializer.Serialize(new
                {
                    role = req.Role,
                    page = req.Page,
                    messages = (req.Messages ?? new List<ChatMessageDto>())
                        .Select(m => new { role = m.Role, content = m.Content }),
                }),
                Encoding.UTF8, "application/json");

            var resp = await _http.PostAsync($"{BaseUrl}/chat", payload);
            resp.EnsureSuccessStatusCode();
            var json = await resp.Content.ReadAsStringAsync();

            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var result = new ChatResult();
            if (root.TryGetProperty("error", out var err) && err.ValueKind == JsonValueKind.String)
                result.Error = err.GetString();
            if (root.TryGetProperty("reply", out var rep) && rep.ValueKind == JsonValueKind.String)
                result.Reply = rep.GetString();
            return result;
        }

        private static List<string> GetStrings(JsonElement root, string prop)
        {
            var list = new List<string>();
            if (root.TryGetProperty(prop, out var arr) && arr.ValueKind == JsonValueKind.Array)
                foreach (var e in arr.EnumerateArray())
                    if (e.ValueKind == JsonValueKind.String)
                    {
                        var v = e.GetString();
                        if (!string.IsNullOrEmpty(v)) list.Add(v);
                    }
            return list;
        }
    }
}
