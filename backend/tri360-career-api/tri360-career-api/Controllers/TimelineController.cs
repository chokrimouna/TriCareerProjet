namespace Quizback.Controllers



{
    [ApiController]
    [Route("api/[controller]")]
    public class TimeLineController : ControllerBase
    {

        private readonly ITimelineService _TimelineServiceService;

        public TimeLineController(ITimelineService TimelineService)
        {
            _TimelineServiceService = TimelineService;
        }


        [HttpGet]
        public async Task<IActionResult> GetJobPostings()
        {
            return Ok(await _TimelineServiceService.GetTimelines());
        }


  // GET api/recruitementProcess/2
        [HttpGet("{id}")]
        public async Task<IActionResult> GetTimelineByID(int id)
        {
            return Ok(await _TimelineServiceService.GetTimelineByID(id));
        }

        // POST api/recruitementProcess
        [HttpPost]
        public async Task<IActionResult> AddTimeline(Timeline timeline)
        {
            return Ok(new { msg = await _TimelineServiceService.AddTimeline(timeline) });
        }

        // PUT api/recruitementProcess
        [HttpPut]
        public async Task<IActionResult> UpdatetTimeline(Timeline timeline)
        {
            return Ok(await _TimelineServiceService.UpdatetTimeline(timeline));
        }

        // DELETE api/recruitementProcess/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTimeline(int id)
        {
            return Ok(await _TimelineServiceService.DeleteTimeline(id));
        }



    }
}




