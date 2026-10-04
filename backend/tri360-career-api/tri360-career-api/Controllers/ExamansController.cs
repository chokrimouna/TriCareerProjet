namespace Quizback.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ExamansController : ControllerBase
    {
        private readonly IExamanService _examanService;

        public ExamansController(IExamanService examanService)
        {
            _examanService = examanService;
        }

        // GET api/examans
        [HttpGet]
        public async Task<IActionResult> GetAllExamen([FromQuery] int? departmentId = null)
        {
            var examens = await _examanService.GetAllExamen(departmentId);
            return Ok(examens);
        }

        // GET api/examans/1
        [HttpGet("{id}")]
        public async Task<IActionResult> GetExamanByID(int id)
        {
            var examen = await _examanService.GetExamanById(id);
            return Ok(examen);
        }

        // POST api/examans
        [HttpPost]
        public async Task<IActionResult> AddExaman(Examan examan)
        {
            var result = await _examanService.AddExaman(examan);
            if (result == null) return BadRequest("Erreur lors de la création du test");
            return Ok(result);
        }

        // PUT api/examans
        [HttpPut]
        public async Task<IActionResult> EditExaman(Examan examan)
        {
            await _examanService.UpdateExaman(examan);
            return Ok(new { msg = "Examan mis à jour avec succès" });
        }

        // DELETE api/examans/3
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteExaman(int id)
        {
            await _examanService.DeleteExaman(id);
            return Ok(new { msg = "Examan supprimé définitivement avec succès" });
        }
    }
}
