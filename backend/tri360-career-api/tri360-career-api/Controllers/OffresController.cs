namespace Quizback.ControllersL


{
    [ApiController]
    [Route("api/[controller]")]
    public class OffresController : ControllerBase
    {
        private readonly IOffreService _offreService;

        public OffresController(IOffreService offreService)
        {
            _offreService = offreService;
        }

        // GET api/offres
        [HttpGet]
        public async Task<IActionResult> GetAllOffres()
        {
            return Ok(await _offreService.GetAllOffres());
        }

        // GET api/offres/1
        [HttpGet("{id}")]
        public async Task<IActionResult> GetOffreByID(int id)
        {
            return Ok(await _offreService.GetOffreById(id));
        }

        // POST api/offres
        [HttpPost]
        public async Task<IActionResult> AddOffre(Offre offre)
        {
            return Ok(new { msg = await _offreService.AddOffre(offre) });
        }

        // PUT api/offres
        [HttpPut]
        public async Task<IActionResult> EditOffre(Offre offre)
        {
            return Ok(await _offreService.UpdateOffre(offre));
        }

        // DELETE api/offres/3
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteOffre(int id)
        {
            return Ok(await _offreService.DeleteOffre(id));
        }
    }
}

