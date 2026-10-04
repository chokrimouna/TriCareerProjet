using QuizBack.Dto;
using Quizback.Services;

namespace Quizback.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ApplicationController : ControllerBase
    {
        private readonly IApplicationService _applicationService;

        public ApplicationController(IApplicationService applicationService)
        {
            _applicationService = applicationService;
        }
        [HttpGet("getAllApps")]
        public async Task<IActionResult> GetAllApplication([FromQuery] int? departmentId = null, [FromQuery] int? page = null, [FromQuery] int? pageSize = null)
        {
            try
            {
                if (page.HasValue && pageSize.HasValue)
                {
                    var apps = await _applicationService.GetAllApplications(departmentId, page.Value, pageSize.Value);
                    var total = await _applicationService.GetTotalApplicationsCount(departmentId);
                    return Ok(new { apps, total, page = page.Value, pageSize = pageSize.Value });
                }
                else
                {
                    var apps = await _applicationService.GetAllApplications(departmentId, 1, 1000);
                    return Ok(apps);
                }
            }
            catch (System.Exception ex)
            {
                Console.WriteLine($"[ERROR] GetAllApplication: {ex.Message}");
                return NotFound();
            }
        }




        [HttpPost("DownloadCV")]
        public async Task<IActionResult> Upload(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");

            var path = Path.Combine("C:\\triweb\\lesderniersprojets\\Tricareer\\Backend\\Files", file.FileName);

            using (var stream = new FileStream(path, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            return Ok(new { message = "File uploaded successfully." });
        }
        [HttpGet("download/{fileName}")]
        public IActionResult Download(string fileName)
        {
        //C:\triweb\lesderniersprojets\Tricareer\Backend\Files
        var path = Path.Combine(Directory.GetCurrentDirectory(), "Resources/Cv", fileName);

            if (!System.IO.File.Exists(path))
                return NotFound();

            var mimeType = "application/pdf";
            var fileStream = new FileStream(path, FileMode.Open, FileAccess.Read);
            return File(fileStream, mimeType, fileName);
        }

        [HttpGet("getByState/{state}")]
        public async Task<IActionResult> GetApplications(int state)
        {
            try
            {
                var applications = await _applicationService.GetApplications(state);
                if (applications != null)
                {
                    return Ok(applications);
                }
                else
                {
                    return NotFound();
                }
            }
            catch (ApplicationException)
            {
                return StatusCode(StatusCodes.Status500InternalServerError);
            }
        }

        [HttpGet("GetApplicationsSansRecrutement/")]
        public async Task<IActionResult> GetApplicationsSansRecrutement()
        {
            var applications = await _applicationService.GetApplicationsSansRecrutement();
            if (applications != null)
            {
                return Ok(applications);
            }
            else
            {
                return NotFound();
            }
        }

        [HttpGet("GetApplicationsSansRecrutement/{applicationId:int}")]
        public async Task<IActionResult> GetApplicationSansRecrutementById(int applicationId)
        {
            var application = await _applicationService.GetApplicationSansRecrutementById(applicationId);
            if (application != null)
            {
                return Ok(application);
            }
            else
            {
                return NotFound();
            }
        }

        [HttpGet("states")]
        public async Task<IActionResult> GetStates()
        {
            return Ok(await _applicationService.GetStates());
        }

        [HttpGet("fix-states")]
        public async Task<IActionResult> FixStates([FromServices] Quizback.Models.TriCareerContext _context)
        {
            var state3 = await _context.States.FindAsync(3);
            if (state3 != null)
            {
                state3.NameState = "En cours";
            }
            
            var state4 = await _context.States.FindAsync(4);
            if (state4 == null)
            {
                await _context.States.AddAsync(new Quizback.Models.State { IdState = 4, NameState = "Refusé" });
            }

            // Also ensure identity insert is handled if IdState is identity? Actually, if it's identity, we don't set IdState, but let's see.
            // Wait, we can just use normal SQL if it's easier.
            // But let's try using EF.
            try {
                await _context.SaveChangesAsync();
                return Ok("States fixed successfully");
            } catch (Exception ex) {
                // Try raw SQL if identity insert is an issue
                await Microsoft.EntityFrameworkCore.RelationalDatabaseFacadeExtensions.ExecuteSqlRawAsync(_context.Database, "SET IDENTITY_INSERT State ON; INSERT INTO State (IdState, NameState) VALUES (4, 'Refusé'); SET IDENTITY_INSERT State OFF; UPDATE State SET NameState = 'En cours' WHERE IdState = 3;");
                return Ok("States fixed with raw SQL");
            }
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetApplicationByID(int id)
        {
            var application = await _applicationService.GetApplicationByID(id);
            if (application != null)
            {
                return Ok(application);
            }
            else
            {
                return NotFound();
            }
        }

        [HttpPost]
        public async Task<IActionResult> AddApplication(Application application)
        {
            try
            {
                await _applicationService.AddApplication(application);
                return Ok();
            }
            catch (ApplicationException)
            {
                return StatusCode(StatusCodes.Status500InternalServerError);
            }
        }
        [HttpPost("ApplicationAndAiResult")]
        public async Task<IActionResult> AddApplicationwithAiResult(AppWithAiResultDto application)
        {
            try
            {
                await _applicationService.AddApplicationWithAiResult(application);
                return Ok();
            }
            catch (ApplicationException)
            {
                return StatusCode(StatusCodes.Status500InternalServerError);
            }
        }
        [HttpPut("Action")]
        public async Task<IActionResult> ActionsAcceptRefuse([FromBody] Actions actions)
        {
            try
            {
                var result = await _applicationService.ActionsAcceptRefuse(actions);
                if (result != null)
                {
                    return Ok();
                }
                else
                {
                    return NotFound();
                }
            }
            catch (ApplicationException)
            {
                return StatusCode(StatusCodes.Status500InternalServerError);
            }
        }

        [HttpPut]
        public async Task<IActionResult> UpdateApplication(Application application)
        {
            try
            {
                var result = await _applicationService.UpdatetApplication(application);
                if (result != null)
                {
                    return Ok(result);
                }
                else
                {
                    return NotFound();
                }
            }
            catch (ApplicationException)
            {
                return StatusCode(StatusCodes.Status500InternalServerError);
            }
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteApplication(int id)
        {
            try
            {
                await _applicationService.DeleteApplication(id);
                return Ok();
            }
            catch (ApplicationException)
            {
                return StatusCode(StatusCodes.Status500InternalServerError);
            }
        }



        [HttpGet("GetApplicationsProcess/{state}")]
        public async Task<IActionResult> GetApplicationsProcess(int state)
        {
            try
            {
                var applications = await _applicationService.GetApplicationsProcess(state);
                if (applications != null)
                {
                    return Ok(applications);
                }
                else
                {
                    return NotFound();
                }
            }
            catch (ApplicationException)
            {
                return StatusCode(StatusCodes.Status500InternalServerError);
            }
        }

        [HttpPost("apply")]
        public async Task<IActionResult> ApplyCandidate([FromForm] CandidateApplyDto applyDto)
        {
            try
            {
                await _applicationService.ApplyCandidate(applyDto);
                return Ok(new { message = "Candidature envoyée avec succès" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Erreur lors de l'envoi de la candidature", error = ex.Message });
            }
        }
        [HttpPut("UpdateRecommendation/{applicationId}")]
        public async Task<IActionResult> UpdateRecommendation(int applicationId, [FromQuery] bool isRecommended)
        {
            try
            {
                await _applicationService.UpdateRecommendation(applicationId, isRecommended);
                return Ok();
            }
            catch (Exception)
            {
                return StatusCode(500);
            }
        }

        [HttpPut("UpdateState/{applicationId}")]
        public async Task<IActionResult> UpdateState(int applicationId, [FromQuery] int newState)
        {
            try
            {
                var app = await _applicationService.UpdateApplicationState(applicationId, newState);
                if (app == null) return NotFound();
                return Ok(app);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.InnerException?.Message ?? ex.Message);
            }
        }
        [HttpPut("Reassign/{applicationId}")]
        public async Task<IActionResult> ReassignTeamLeader(int applicationId, [FromQuery] int teamLeaderId)
        {
            try
            {
                await _applicationService.ReassignTeamLeader(applicationId, teamLeaderId);
                return Ok();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
