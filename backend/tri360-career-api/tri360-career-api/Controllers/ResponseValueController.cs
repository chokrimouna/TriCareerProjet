using QuizBack.Dto;

namespace Quizback.Controllers


{
    [ApiController]
    [Route("api/[controller]")]
    public class ResponseValueController : ControllerBase
    {
        private readonly IResponseValueService _ResponseValueService;

        public ResponseValueController(IResponseValueService ResponseValueService)
        {
            _ResponseValueService = ResponseValueService;
        }


        // GET api/Responses
        [HttpGet]
        public async Task<IActionResult> GetReponseValues()
        {
            return Ok(await _ResponseValueService.GetReponseValues());
        }


        //// GET 2
        //[HttpGet("{id}")]
        //public async Task<IActionResult> GetReponseValueByID(int id)
        //{
        //    return Ok(await _ResponseValueService.GetReponseValueByID(id));
        //}

        // POST api/Responses
        [HttpPost]
        public async Task<IActionResult> AddResponseValue(ResponseValueDto reponseValue)
        {

            return Ok(await _ResponseValueService.AddResponseValue(reponseValue));
        }

        // PUT api/Responses
        [HttpPut]
        public async Task<IActionResult> UpdateReponseValue(ReponseValue ReponseValue)
        {
            return Ok(await _ResponseValueService.UpdateReponseValue(ReponseValue));
        }

        // DELETE 5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteResponseValue(int id)
        {
            return Ok(await _ResponseValueService.DeleteResponseValue(id));
        }

        //[HttpGet("{idq}/{ida}")]
        //public async Task<IActionResult> GetReponseValueByIdQuestionApplicationId(int? idq, int? ida)
        //{
        //    return Ok(await _ResponseValueService.GetReponseValueByIdQuestionApplicationId(idq, ida));
        //}

    }
}



