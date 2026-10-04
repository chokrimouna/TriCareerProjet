using Microsoft.AspNetCore.Mvc;
using Quizback.Services;
using System.Threading.Tasks;

namespace Quizback.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SectionsController : ControllerBase
    {
        private readonly ISectionService _sectionService;

        public SectionsController(ISectionService sectionService)
        {
            _sectionService = sectionService;
        }

        // GET api/sections
        [HttpGet]
        public async Task<IActionResult> GetAllSections()
        {
            return Ok(await _sectionService.GetAllSections());
        }

        // GET api/sections/1
        [HttpGet("{id}")]
        public async Task<IActionResult> GetSectionByID(int id)
        {
            return Ok(await _sectionService.GetSectionById(id));
        }

        // POST api/sections
        [HttpPost]
        public async Task<IActionResult> AddSection(Section section)
        {
            Section? sectionresult = await _sectionService.AddSection(section);
            if (sectionresult == null)
            {
                return BadRequest();
            }
            return Ok(sectionresult);
        }

        // PUT api/sections
        [HttpPut]
        public async Task<IActionResult> UpdateSection(Section section)
        {
            await _sectionService.UpdateSection(section);
            return Ok(new { msg = "Section updated successfully" });
        }

        // DELETE api/sections/3
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSection(int id)
        {
            await _sectionService.DeleteSection(id);
            return Ok(new { msg = "Section deleted successfully" });
        }

        // GET api/sections/GetSectionByIdExaman/3
        [HttpGet("GetSectionByIdExaman/{Id}")]
        public async Task<IActionResult> GetSectionByIdExaman(int Id)
        {
            return Ok(await _sectionService.GetSectionByIdExaman(Id));
        }

        // GET api/sections/GetSectionDisponibleByIdExaman/3
        [HttpGet("GetSectionDisponibleByIdExaman/{Id}")]
        public async Task<IActionResult> GetSectionDisponibleByIdExaman(int Id)
        {
            return Ok(await _sectionService.GetSectionDisponibleByIdExaman(Id));
        }




    }
}
