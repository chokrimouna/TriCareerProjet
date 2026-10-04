using Microsoft.AspNetCore.Mvc;
using Quizback.Models;
using Quizback.Services;
using System.Threading.Tasks;

namespace Quizback.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class JobPostingController : ControllerBase
    {
        private readonly IJobPostingService _jobPostingService;

        public JobPostingController(IJobPostingService jobPostingService)
        {
            _jobPostingService = jobPostingService;
        }

        [HttpGet]
        public async Task<IActionResult> GetJobPostings()
        {
            var jobPostings = await _jobPostingService.GetJobPostings();
            if (jobPostings != null)
                return Ok(jobPostings);
            else
                return NotFound();
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetJobPostingByID(int id)
        {
            var jobPosting = await _jobPostingService.GetJobPostingByID(id);
            if (jobPosting != null)
                return Ok(jobPosting);
            else
                return NotFound();
        }

        [HttpPost]
        public async Task<IActionResult> AddJobPosting(JobPosting jobPosting)
        {
            await _jobPostingService.AddJobPosting(jobPosting);
            return Ok(new { message = "Job posting added successfully." });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateJobPosting(int id, JobPosting jobPosting)
        {
            if (id != jobPosting.JobPostingId)
                return BadRequest();

            var result = await _jobPostingService.UpdateJobPosting(jobPosting);
            if (result != null)
                return Ok(new { message = "Job posting updated successfully." });
            else
                return NotFound();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteJobPosting(int id)
        {
            await _jobPostingService.DeleteJobPosting(id);
            return Ok(new { message = "Job posting deleted successfully." });
        }
    }
}
