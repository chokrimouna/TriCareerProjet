namespace Quizback.Controllers


{
    [ApiController]
    [Route("api/[controller]")]
    public class ReponseDetailController : ControllerBase
    {
        private readonly IResponseDetailService _ReponseDetailService;

        public ReponseDetailController(IResponseDetailService ReponseDetailService)
        {
            _ReponseDetailService = ReponseDetailService;
        }



        // GET 2
        [HttpGet("{id}")]
        public async Task<IActionResult> GetReponseDetailByID(int id)
        {
            return Ok(await _ReponseDetailService.GetReponseDetailByID(id));
        }

        // POST api/Responses
        [HttpPost]
        public async Task<IActionResult> AddReponseDetail(ReponseDetail ReponseDetail)
        {

            return Ok(await _ReponseDetailService.AddReponseDetail(ReponseDetail));
        }

        // PUT api/Responses
        [HttpPut]
        public async Task<IActionResult> UpdateReponseDetail(ReponseDetail ReponseDetail)
        {
            return Ok(await _ReponseDetailService.UpdateReponseDetail(ReponseDetail));
        }

        // DELETE 5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteReponseDetail(int id)
        {
            return Ok(await _ReponseDetailService.DeleteReponseDetail(id));
        }

    }
}



