namespace Quizback.Dto
{
    public class MeetRequestDto
    {
        public string Summary { get; set; } = string.Empty;
        public DateTime Start { get; set; }
        public int DurationMinutes { get; set; } = 60;
        public List<string> Attendees { get; set; } = new List<string>();
        public string? PlannerEmail { get; set; }
    }
}
