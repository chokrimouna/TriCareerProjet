using Microsoft.AspNetCore.Mvc;
using Quizback.Models;
using Quizback.Services;
using System.Threading.Tasks;

namespace Quizback.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class QuestionsController : ControllerBase
    {
        private readonly IQuestionService _questionService;

        public QuestionsController(IQuestionService questionService)
        {
            _questionService = questionService;
        }

        // GET api/questions
        [HttpGet]
        public async Task<IActionResult> GetAllQuestions()
        {
            var questions = await _questionService.GetAllQuestions();
            if (questions == null)
            {
                return BadRequest("Questions not found");
            }
            return Ok(questions);
        }

        // GET api/questions/1
        [HttpGet("{id}")]
        public async Task<IActionResult> GetQuestionByID(int id)
        {
            var question = await _questionService.GetQuestionById(id);
            if (question == null)
            {
                return BadRequest("Question not found");
            }
            return Ok(question);
        }

        [HttpGet("byIdSection/{id}")]
        public async Task<IActionResult> GetQuestionByIdSection(int id)
        {
            var questions = await _questionService.GetQuestionByIdSection(id);
            if (questions == null)
            {
                return NotFound();
            }
            return Ok(questions);
        }

        // POST api/questions
        [HttpPost]
        public async Task<IActionResult> AddQuestion(Question question)
        {
            await _questionService.AddQuestion(question);
            return Ok(new { msg = "Question ajoutée avec succès" });
        }

        [HttpPost("QuestionAndAnswersEdit")]
        public async Task<IActionResult> QuestionWithAnswersEdit([FromBody] QuestionsAnswersEdit questionsAnswersedit)
        {
            var Quest = await _questionService.EditQuestionwithAnswers(questionsAnswersedit);
            if(Quest != null){
                return Ok(Quest);
            }
            return NotFound();
        }

        [HttpPost("QuestionAndAnswers")]
        public async Task<IActionResult> AddQuestionWithAnswers([FromBody] QuestionsAnswers questionsAnswers)
        {
            var Quest = await _questionService.AddQuestionWithAnswers(questionsAnswers);
            if(Quest != null){
                return Ok(Quest);
            }
            return BadRequest("Failed to update question with answers. Check server logs.");
        }
        // PUT api/questions
        [HttpPut]
        public async Task<IActionResult> EditQuestion(Question question)
        {
            await _questionService.UpdateQuestion(question);
            return Ok(new { msg = "Question mise à jour avec succès" });
        }

        // DELETE api/questions/3
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteQuestion(int id)
        {
            await _questionService.QuestionDisactivated(id);
            return Ok(new { msg = "Question désactivée avec succès" });
        }
    }
}
