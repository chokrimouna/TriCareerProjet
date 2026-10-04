

namespace Quizback.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PiplinesController : ControllerBase
    {
        private readonly IPiplineService _PiplineService;

        public PiplinesController(IPiplineService PiplineService)
        {
            _PiplineService = PiplineService;
        }

        // GET api/Piplines
        [HttpGet]
        public async Task<IActionResult> GetPiplines()
        {
            try
            {
                List<Pipline>? Piplines = await _PiplineService.GetPiplines();
                return Ok(Piplines);
            }
            catch 
            {
                return Problem();
            }
        }

        // GET api/Piplines/2
        [HttpGet("{id}")]
        public async Task<IActionResult> GetPiplineByID(int id)
        {
            try
            {
                Pipline? Pipline = await _PiplineService.GetPiplineByID(id);
                return Ok(Pipline);
            }
            catch 
            {
                return Problem();
            }
        }

        // POST api/Piplines
        [HttpPost]
        public async Task<IActionResult> AddPipline(Pipline Pipline)
        {
            try
            {
                bool  res  =await _PiplineService.AddPipline(Pipline);
                return Ok(res);
            
            }
            catch 
            {
                return Problem();
            }
        }

        // PUT api/Piplines/2
        [HttpPut]
        public async Task<IActionResult> EditPipline( Pipline Pipline)
        {
            try
            {
                if (Pipline  == null)
                {
                    return BadRequest(); // Renvoie un code 400 si l'ID de la Pipline ne correspond pas à celui spécifié dans l'URL
                }
                bool res = await _PiplineService.UpdatePipline(Pipline);
                return Ok(res );
            }
            catch 
            {
                return Problem();
            }
        }

        // DELETE api/Piplines/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePipline(int id)
        {
            try
            {
                bool res =  await _PiplineService.DeletePipline(id);
                return Ok(res);
            }
            catch 
            {
                return Problem();
            }
        }
    }
}