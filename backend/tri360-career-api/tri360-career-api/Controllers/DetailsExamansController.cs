using Microsoft.AspNetCore.Mvc;
using Quizback.Services;
using QuizBack.Dto;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Quizback.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DetailsExamansController : ControllerBase
    {
        private readonly IDetailsExamanService _detailsExamanservice;

        public DetailsExamansController(IDetailsExamanService detailsExamanservice)
        {
            _detailsExamanservice = detailsExamanservice;
        }

        // GET api/DetailsExamans
        [HttpGet]
        public async Task<IActionResult> GetAllDetailsExaman()
        {
            var detailsExamens = await _detailsExamanservice.GetAllDetailsExaman();
            return Ok(detailsExamens);
        }

        // GET api/DetailsExamans/2
        [HttpGet("{id}")]
        public async Task<IActionResult> GetDetailsExamanById(int id)
        {
            var detailsExaman = await _detailsExamanservice.GetDetailsExamanById(id);
            return Ok(detailsExaman);
        }

        // GET api/DetailsExamans/ByIdExamen/1
        [HttpGet("ByIdExamen/{id}")]
        public async Task<IActionResult> GetAllDetailsExamanByIdExamen(int id)
        {
            var detailsExamens = await _detailsExamanservice.GetAllDetailsExamanByIdExamen(id);
            return Ok(detailsExamens);
        }

        // POST api/DetailsExamans
        [HttpPost]
        public async Task<IActionResult> AddDetailsExaman(DetailsExaman detailsExaman)
        {
            await _detailsExamanservice.AddDetailsExaman(detailsExaman);
            return Ok(new { message = "DetailsExaman ajouté avec succès." });
        }

        // POST api/DetailsExamans/addDeleteDetailsExamen
        [HttpPost("addDeleteDetailsExamen")]
        public async Task<IActionResult> AddDeleteDetailsExaman(List<DetailsExaman> detailsExamans)
        {
            await _detailsExamanservice.AddDeleteDetailsExaman(detailsExamans);
            return Ok(new { message = "DetailsExamans ajoutés et/ou supprimés avec succès." });
        }

        // PUT api/DetailsExamans
        [HttpPut]
        public async Task<IActionResult> UpdateDetailsExaman(DetailsExaman detailsExaman)
        {
            await _detailsExamanservice.UpdateDetailsExaman(detailsExaman);
            return Ok(new { message = "DetailsExaman mis à jour avec succès." });
        }
        [HttpPut("SectionDetailExaman")]
        public async Task<IActionResult> UpdateSecDetailsExaman(PutdelaitSectionExamanDto detailsExaman)
        {
            await _detailsExamanservice.UpdateQuestionsDetailsExaman(detailsExaman);
            return Ok(new { message = "DetailsExaman mis à jour avec succès." });
        }
        // DELETE api/DetailsExamans/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDetailsExaman(int id)
        {
            await _detailsExamanservice.DeleteDetailsExaman(id);
            return Ok(new { message = "DetailsExaman supprimé avec succès." });
        }
        [HttpDelete("QuestionFromExaman")]
        public async Task<IActionResult> DeleteDetailsExaman([FromBody] DetaildelaitDto detaildata)
        {
            await _detailsExamanservice.DeleteQuestionFromDetailEx(detaildata);
            return Ok(new { message = "DetailsExaman supprimé avec succès." });
        }
        [HttpDelete("SectionFromExaman")]
        public async Task<IActionResult> SectionDetailsExaman([FromBody] DeletedelaitSectionExamanDto detaildata)
        {
            await _detailsExamanservice.DeleteSectionFromDetailEx(detaildata);
            return Ok(new { message = "DetailsExaman supprimé avec succès." });
        }
        [HttpPost("AddExamanWithQuestions")]
        public async Task<IActionResult> AddExamanWithQuestionsController(ExamanWithQuestionsDto detailsExamans)
        {
            var result = await _detailsExamanservice.AddExamanWithQuestions(detailsExamans);
            if (result == null) return BadRequest("Erreur lors de la création du test");
            return Ok(result);
        }
        [HttpPut("UpdateExamanWithQuestions/{id}")]
        public async Task<IActionResult> UpdateExamanWithQuestionsController(int id, ExamanWithQuestionsDto detailsExamans)
        {
            await _detailsExamanservice.UpdateExamanWithQuestions(id, detailsExamans);
            return Ok(new { message = "Examan mis à jour avec ses questions avec succès" });
        }
    }
}
