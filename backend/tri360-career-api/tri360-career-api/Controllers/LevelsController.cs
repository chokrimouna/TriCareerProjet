namespace Quizback.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LevelsController : ControllerBase
    {
        private readonly ILevelService _LevelService;

        public LevelsController(ILevelService LevelService)
        {
            _LevelService = LevelService;
        }

        // GET api/Levels
        [HttpGet]
        public async Task<IActionResult> GetLevels()
        {

            try
            {
                List<Level>? LLevel = await _LevelService.GetAllLevels();
                return Ok(LLevel);
            }
            catch
            {
                return Problem();
            }
        }

        // GET api/Levels/2
        [HttpGet("{id}")]
        public async Task<IActionResult> GetLevelByID(int id)
        {
            try
            {
                if (id == 0 || id == null)
                {
                    return BadRequest();
                }
                Level? Level = await _LevelService.GetLevelById(id);
                return Ok(Level);
            }
            catch
            {
                return Problem();
            }


        }

        // POST api/Levels
        [HttpPost]
        public async Task<IActionResult> AddLevel(Level Level)
        {
            try
            {
                if (Level == null)
                {
                    return BadRequest();
                }
                bool res = await _LevelService.AddLevel(Level);
                return Ok(res);
            }
            catch
            {
                return Problem();
            }



        }

        // PUT api/Levels
        [HttpPut]
        public async Task<IActionResult> EditLevel(Level Level)
        {

            try
            {
                if (Level == null)
                {
                    return BadRequest();
                }
                bool res = await _LevelService.UpdateLevel(Level);
                return Ok(res);
            }
            catch
            {
                return Problem();
            }
        }

        // DELETE api/Levels/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteLevel(int id)
        {

            try
            {
                if (id == 0 || id == null)
                {
                    return BadRequest();
                }
                bool Level = await _LevelService.DeleteLevel(id);
                return Ok(Level);
            }
            catch
            {
                return Problem();
            }
        }
    }
}
