using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Quizback.Models;
using Quizback.Services;

namespace Quizback.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CommentController : ControllerBase
    {
        private readonly ICommentService _commentService;

        public CommentController(ICommentService commentService)
        {
            _commentService = commentService;
        }

        [HttpGet]
        public async Task<IActionResult> GetComments()
        {
            List<Comment> comments = await _commentService.GetAllComments();
            return Ok(comments);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetCommentByID(int id)
        {
            Comment? comment = await _commentService.GetCommentById(id);
            if (comment == null)
                return NotFound();
            return Ok(comment);
        }

        [HttpPost]
        public async Task<IActionResult> AddComment(Comment comment)
        {
            if (comment  == null)
                return BadRequest();

             bool res  =  await _commentService.AddComment(comment);
            return Ok(res);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateComment(int id, Comment comment)
        {
            if (id  ==0  )
                return BadRequest();
            bool  res=   await _commentService.UpdateComment(comment);
            return Ok(res);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteComment(int id)
        {
          
            if (id == 0)
                return NotFound();

            bool res =  await _commentService.DeleteComment(id);
            return Ok(res);
        }

        [HttpGet("ByRecruitmentProcessId/{id}")]
        public async Task<IActionResult> GetCommentsByRecruitmentProcessId(int id)
        {

            List<Comment> comments = await _commentService.GetCommentsByRecruitmentProcessId(id);
            return Ok(comments);
        }
    }
}
