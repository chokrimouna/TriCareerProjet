using Microsoft.AspNetCore.Mvc;
using Quizback.Services;
using System.Threading.Tasks;

namespace Quizback.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HistoriquesController : ControllerBase
    {
        private readonly IHistService _histService;

        public HistoriquesController(IHistService histService)
        {
            _histService = histService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllHists()
        {
            return Ok(await _histService.GetAllHists());
        }

        // GET api/levels/1
        [HttpGet("{id}")]
        public async Task<IActionResult> GethistByID(int id)
        {
            return Ok(await _histService.GetHistById(id));
        }
        [HttpGet("lasthistbyidapp/{id}")]
        public async Task<IActionResult> GetLasthistByIdApp(int id)
        {
            return Ok(await _histService.GetlastHistByIdApp(id));
        }
        // POST api/levels
        [HttpPost]
        public async Task<IActionResult> Addhist(HistoriqueApplication hist)
        {
            await _histService.AddHist(hist);
            return Ok(new { msg = "Historique added successfully" });
        }

        // PUT api/levels
        [HttpPut]
        public async Task<IActionResult> Edithist(HistoriqueApplication hist)
        {
            await _histService.UpdateHist(hist);
            return Ok(new { msg = "hist updated successfully" });
        }

        // DELETE api/levels/3
        [HttpDelete("{id}")]
        public async Task<IActionResult> Deletehist(int id)
        {
            await _histService.DeleteHist(id);
            return Ok(new { msg = "hist deleted successfully" });
        }
    }
}
