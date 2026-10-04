namespace Quizback.Controllers
{
    // US23 (classement par score) + US29 (recommandation automatique des meilleurs candidats)
    [ApiController]
    [Route("api/[controller]")]
    public class RankingController : ControllerBase
    {
        private readonly IRankingService _rankingService;

        public RankingController(IRankingService rankingService)
        {
            _rankingService = rankingService;
        }

        // GET api/Ranking/{jobPostingId}
        // Déclenche le matching IA, renvoie les candidats triés par score
        // et marque les meilleurs comme recommandés.
        [HttpGet("{jobPostingId:int}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetRanking(int jobPostingId)
        {
            try
            {
                var result = await _rankingService.GetRankingAsync(jobPostingId);
                return Ok(result);
            }
            catch (HttpRequestException ex)
            {
                return StatusCode(503, new { error = "Service de matching IA indisponible.", detail = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Erreur lors du calcul du classement.", detail = ex.Message });
            }
        }
    }
}
