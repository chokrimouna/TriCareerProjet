namespace Quizback.Controllers
{
    // US12/US19 (forces/faiblesses + compétences manquantes) + US20 (rapport d'évaluation)
    [ApiController]
    [Route("api/[controller]")]
    public class AnalysisController : ControllerBase
    {
        private readonly IAnalysisService _analysisService;

        public AnalysisController(IAnalysisService analysisService)
        {
            _analysisService = analysisService;
        }

        // GET api/Analysis/{applicationId} → forces/faiblesses + compétences manquantes
        [HttpGet("{applicationId:int}")]
        [AllowAnonymous]
        public async Task<IActionResult> Analyze(int applicationId)
        {
            try
            {
                return Ok(await _analysisService.AnalyzeAsync(applicationId));
            }
            catch (HttpRequestException ex)
            {
                return StatusCode(503, new { error = "Service d'analyse IA indisponible.", detail = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Erreur lors de l'analyse.", detail = ex.Message });
            }
        }

        // POST api/Analysis/analyze-cv → analyse d'un CV uploadé contre une offre
        // (écran "Analyse IA des CV" : glisser-déposer)
        [HttpPost("analyze-cv")]
        [AllowAnonymous]
        public async Task<IActionResult> AnalyzeCv([FromForm] IFormFile cv, [FromForm] int jobPostingId)
        {
            try
            {
                if (cv == null || cv.Length == 0)
                    return BadRequest(new { error = "Aucun fichier CV fourni." });

                var cvFileName = $"{Guid.NewGuid()}_{cv.FileName}";
                var dir = Path.Combine(Directory.GetCurrentDirectory(), "Resources", "Cv");
                Directory.CreateDirectory(dir);
                var fullPath = Path.Combine(dir, cvFileName);
                using (var stream = new FileStream(fullPath, FileMode.Create))
                    await cv.CopyToAsync(stream);

                var r = await _analysisService.AnalyzeUploadedCvAsync(cvFileName, jobPostingId);
                return Ok(new
                {
                    fileName = cv.FileName,
                    storedName = cvFileName,
                    matchingScore = r.MatchingScore,
                    skills = r.Skills,
                    missingSkills = r.MissingSkills,
                    strengths = r.Strengths,
                    weaknesses = r.Weaknesses,
                    summary = r.Summary,
                    error = r.Error,
                });
            }
            catch (HttpRequestException ex)
            {
                return StatusCode(503, new { error = "Service d'analyse IA indisponible.", detail = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Erreur lors de l'analyse du CV.", detail = ex.Message });
            }
        }

        // POST api/Analysis/archive-cv → archive un CV analysé (crée une candidature archivée)
        [HttpPost("archive-cv")]
        [AllowAnonymous]
        public async Task<IActionResult> ArchiveCv([FromBody] Quizback.Services.ArchiveCvRequest req)
        {
            try
            {
                if (req == null || string.IsNullOrWhiteSpace(req.StoredName))
                    return BadRequest(new { error = "CV manquant." });
                var id = await _analysisService.ArchiveCvAsync(req);
                return Ok(new { applicationId = id, archived = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Erreur lors de l'archivage.", detail = ex.Message });
            }
        }

        // POST api/Analysis/generate-quiz → génère un quiz (QCM) via l'IA
        [HttpPost("generate-quiz")]
        [AllowAnonymous]
        public async Task<IActionResult> GenerateQuiz([FromBody] Quizback.Services.GenerateQuizRequest req)
        {
            try
            {
                return Ok(await _analysisService.GenerateQuizAsync(req ?? new Quizback.Services.GenerateQuizRequest()));
            }
            catch (HttpRequestException ex)
            {
                return StatusCode(503, new { error = "Service d'analyse IA indisponible.", detail = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Erreur lors de la génération du quiz.", detail = ex.Message });
            }
        }

        // POST api/Analysis/chat → assistant d'aide (chatbot) par rôle
        [HttpPost("chat")]
        [AllowAnonymous]
        public async Task<IActionResult> Chat([FromBody] Quizback.Services.ChatRequest req)
        {
            try
            {
                return Ok(await _analysisService.ChatAsync(req ?? new Quizback.Services.ChatRequest()));
            }
            catch (HttpRequestException ex)
            {
                return StatusCode(503, new { error = "Assistant IA indisponible.", detail = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Erreur de l'assistant.", detail = ex.Message });
            }
        }

        // POST api/Analysis/{applicationId}/report → génère + stocke le rapport
        [HttpPost("{applicationId:int}/report")]
        [AllowAnonymous]
        public async Task<IActionResult> Report(int applicationId)
        {
            try
            {
                return Ok(await _analysisService.GenerateReportAsync(applicationId));
            }
            catch (HttpRequestException ex)
            {
                return StatusCode(503, new { error = "Service d'analyse IA indisponible.", detail = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Erreur lors de la génération du rapport.", detail = ex.Message });
            }
        }
    }
}
