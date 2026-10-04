namespace Quizback.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StatusController : ControllerBase
    {
        private readonly IStatusService _StatusService;

        public StatusController(IStatusService StatusService)
        {
            _StatusService = StatusService;
        }

        // GET api/Statuss
        [HttpGet]
        public async Task<IActionResult> GetStatuss()
        {

            try
            {
                List<Status>? LStatus = await _StatusService.GetAllStatuss();
                return Ok(LStatus);
            }
            catch
            {
                return Problem();
            }
        }

        // GET api/Statuss/2
        [HttpGet("{id}")]
        public async Task<IActionResult> GetStatusByID(int id)
        {
            try
            {
                if (id == 0 || id == null)
                {
                    return BadRequest();
                }
                Status? Status = await _StatusService.GetStatusById(id);
                return Ok(Status);
            }
            catch
            {
                return Problem();
            }


        }

        // POST api/Statuss
        [HttpPost]
        public async Task<IActionResult> AddStatus(Status Status)
        {
            try
            {
                if (Status == null)
                {
                    return BadRequest();
                }
                bool res = await _StatusService.AddStatus(Status);
                return Ok(res);
            }
            catch
            {
                return Problem();
            }



        }

        // PUT api/Statuss
        [HttpPut]
        public async Task<IActionResult> EditStatus(Status Status)
        {

            try
            {
                if (Status == null)
                {
                    return BadRequest();
                }
                bool res = await _StatusService.UpdateStatus(Status);
                return Ok(res);
            }
            catch
            {
                return Problem();
            }
        }

        // DELETE api/Statuss/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteStatus(int id)
        {

            try
            {
                if (id == 0 || id == null)
                {
                    return BadRequest();
                }
                bool Status = await _StatusService.DeleteStatus(id);
                return Ok(Status);
            }
            catch
            {
                return Problem();
            }
        }
    }
}
