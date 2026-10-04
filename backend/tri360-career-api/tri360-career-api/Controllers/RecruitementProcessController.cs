using Microsoft.AspNetCore.Mvc;
using Quizback.Models;
using QuizBack.Dto;
using System.Threading.Tasks;


namespace Quizback.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RecruitementProcessController : ControllerBase
    {
        private readonly IRecruitementProcessService _recruitementProcessService;
        private readonly IEmailService _emailService;
        private readonly IApplicationService _applicationService;   

        public RecruitementProcessController(IRecruitementProcessService recruitementProcessService , IEmailService emailService , IApplicationService applicationService)
        {
            _recruitementProcessService = recruitementProcessService;
            _emailService = emailService;
            _applicationService = applicationService;

        }

        [HttpGet]
        public async Task<IActionResult> GetRecruitementProcesss([FromQuery] int? departmentId = null, [FromQuery] int? userId = null)
        {
            var recruitementProcesses = await _recruitementProcessService.GetRecruitementProcesss(departmentId, userId);
            return Ok(recruitementProcesses);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetRecruitementProcessByID(int id)
        {
            var recruitementProcess = await _recruitementProcessService.GetRecruitementProcessByID(id);
            return Ok(recruitementProcess);
        }

        [HttpGet("getApplicationProcessByIdUser/{idUser}/Status/{idStatus}")]
        public async Task<IActionResult> GetRecruitementProcessByUserId(int idUser, int idStatus)
        {
            var recruitementProcess = await _recruitementProcessService.GetRecruitementProcessByUserId(idUser, idStatus);
            return Ok(recruitementProcess);
        }



        [HttpGet("getApplicationProcessByApplicationId/{idApp}")]
        public async Task<IActionResult> GetRecruitementProcessByUserId(int idApp)
        {
            var recruitementProcess = await _recruitementProcessService.GetRecruitementProcessByApplicationID(idApp);
            return Ok(recruitementProcess);
        }
        [HttpGet("LastRecPocess/{idApp}")]
        public async Task<IActionResult> GetLastRecruitementProcessByAppId(int idApp)
        {
            var recruitementProcess = await _recruitementProcessService.GetLastRecruitementProcessStatusByIDApp(idApp);
            return Ok(recruitementProcess);
        }

        [HttpPost]
        public async Task<IActionResult> AddRecruitementProcess(recruitementProcessWithIdExamen recruitementProcessWithIdExamen)
        {
            string res = await _recruitementProcessService.AddRecruitementProcess(recruitementProcessWithIdExamen);
            if (string.IsNullOrEmpty(res))
            {
                return BadRequest("Erreur lors de la création du processus de recrutement");
            }

            return Ok(new { message = res });
        }

        [HttpPut]
        public async Task<IActionResult> UpdateRecruitementProcess(RecruitementProcess recruitementProcess)
        {
            await _recruitementProcessService.UpdateRecruitementProcess(recruitementProcess);
            
            if (recruitementProcess.ApplicationId.HasValue)
            {
                await _recruitementProcessService.RefreshApplicationScore(recruitementProcess.ApplicationId.Value);
            }
            
            return Ok();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRecruitementProcess(int id)
        {
            await _recruitementProcessService.DeleteRecruitementProcess(id);
            return Ok();
        }
        [HttpPut("UpdateStatus")]
        public async Task<IActionResult> UpdateRecruitementProcessStatus(UpdateStatusDto UpdateStatusDto)
        {
            var updatedProcess = await _recruitementProcessService.UpdateRecruitementProcessstatut(UpdateStatusDto);
            if (updatedProcess == null)
            {
                return NotFound();
            }
            return Ok(updatedProcess);
        }
        [HttpPost("generateMeetLink")]
        public async Task<IActionResult> GenerateMeetLink(MeetRequestDto request)
        {
            var link = await _recruitementProcessService.GenerateMeetLink(request);
            return Ok(new { link });
        }

        [HttpPut("newDate")]
        public async Task<IActionResult> UpdateRecruitementProcessNewDate(RecProcessDTO RecProcess)
        {
            try
            {
                await _recruitementProcessService.EditDateRecProcess(RecProcess);
                return Ok();
            }
            catch (Exception e)
            {
                return BadRequest("error "+ e);
            }
        }
    }
}