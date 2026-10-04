 

namespace Quizback.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AnswersController : ControllerBase
    {
        private readonly IAnswerService _answerService;

        public AnswersController(IAnswerService answerService)
        {
            _answerService = answerService;
        }

        // GET api/answers/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetAnswerById(int id)
        {
            var answer = await _answerService.GetAnswerById(id);
            if (answer == null)
            {
                return NotFound();
            }
            return Ok(answer);
        }

        // POST api/answers
        [HttpPost]
        public async Task<IActionResult> AddAnswer(Answer answer)
        {
            await _answerService.AddAnswer(answer);
            return Ok(new { msg = "Answer ajouté avec succès" });
        }

        // PUT api/answers
        [HttpPut]
        public async Task<IActionResult> UpdateAnswer(Answer answer)
        {
            await _answerService.UpdateAnswer(answer);
            return Ok(new { msg = "Answer mis à jour avec succès" });
        }

        // DELETE api/answers/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAnswer(int id)
        {
            await _answerService.DeleteAnswer(id);
            return Ok(new { msg = "Answer supprimé avec succès" });
        }

        // GET api/questions/{questionId}/answers
        [HttpGet("GetAnswersByQuestionId/{questionId}")]
        public async Task<IActionResult> GetAnswersByQuestionId(int questionId)
        {
            var answers = await _answerService.GetAnswersByQuestionId(questionId);
            if (answers == null || answers.Count == 0)
            {
                return NotFound();
            }
            return Ok(answers);
        }
    }
}
