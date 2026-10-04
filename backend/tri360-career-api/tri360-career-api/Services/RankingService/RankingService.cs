using System.Text.Json;
using Quizback.Models;

namespace Quizback.Services
{
    public class RankingService : IRankingService
    {
        private readonly HttpClient _http;
        private readonly TriCareerContext _db;
        private readonly IConfiguration _config;

        // Nombre de candidats marqués automatiquement comme "recommandés" (US29)
        private const int TopRecommendCount = 3;
        // Score minimum (%) en dessous duquel un candidat ne peut jamais être "recommandé",
        // même s'il fait partie des N premiers (cas d'une offre avec peu de candidats).
        private const double MinRecommendScore = 50;

        public RankingService(HttpClient http, TriCareerContext db, IConfiguration config)
        {
            _http = http;
            _db = db;
            _config = config;
        }

        public async Task<RankingResult> GetRankingAsync(int jobPostingId)
        {
            var baseUrl = _config["MATCHING_AI_URL"]
                ?? Environment.GetEnvironmentVariable("MATCHING_AI_URL")
                ?? "http://matching-ai:8000";
            var url = $"{baseUrl.TrimEnd('/')}/match/{jobPostingId}";

            var response = await _http.GetAsync(url);
            response.EnsureSuccessStatusCode();
            var json = await response.Content.ReadAsStringAsync();

            var result = new RankingResult { JobPostingId = jobPostingId };

            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (!root.TryGetProperty("results", out var resultsEl) || resultsEl.ValueKind != JsonValueKind.Array)
                return result;

            var candidates = new List<RankedCandidate>();
            foreach (var item in resultsEl.EnumerateArray())
            {
                var c = new RankedCandidate
                {
                    ApplicationId = item.TryGetProperty("application_id", out var aid) && aid.ValueKind == JsonValueKind.Number ? aid.GetInt32() : 0,
                    CandidateId = item.TryGetProperty("candidate_id", out var cid) && cid.ValueKind == JsonValueKind.Number ? cid.GetInt32() : 0,
                    MatchingScore = item.TryGetProperty("matching_score", out var ms) && ms.ValueKind == JsonValueKind.Number ? ms.GetDouble() : 0,
                };
                if (item.TryGetProperty("skills_found", out var sk) && sk.ValueKind == JsonValueKind.Array)
                    c.SkillsFound = sk.EnumerateArray().Select(s => s.GetString() ?? "").Where(s => s.Length > 0).ToList();
                candidates.Add(c);
            }

            // Tri décroissant par score (US23 - classement automatique)
            candidates = candidates.OrderByDescending(c => c.MatchingScore).ToList();

            // Enrichir avec le nom + appliquer la recommandation automatique des meilleurs (US29)
            var appIds = candidates.Select(c => c.ApplicationId).ToList();
            var apps = await _db.Applications.Where(a => appIds.Contains(a.ApplicationId)).ToListAsync();

            for (int i = 0; i < candidates.Count; i++)
            {
                var c = candidates[i];
                c.Rank = i + 1;
                c.Recommended = i < TopRecommendCount && c.MatchingScore >= MinRecommendScore;

                var app = apps.FirstOrDefault(a => a.ApplicationId == c.ApplicationId);
                if (app != null)
                {
                    c.CandidateName = app.NameApplication;
                    app.IsRecommended = c.Recommended;
                }
            }
            await _db.SaveChangesAsync();

            result.TotalCandidates = candidates.Count;
            result.Candidates = candidates;
            return result;
        }
    }
}
