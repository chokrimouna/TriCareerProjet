namespace Quizback.Dto
{
    public class Ai
    {

        public int? ApplicationId { get; set; }

        public string? Result { get; set; }

    }
    public class App
    {

        public int? JobPostingId { get; set; }

        public DateTime? ApplicationDate { get; set; }

        public int? UserId { get; set; }

        public int? IdState { get; set; }

        public string? CvPath { get; set; }

        public string? NameApplication { get; set; }

        public string? Email { get; set; }

        public int? PhoneNumber { get; set; }
    }
    public class AppWithAiResultDto
    {
        public Ai AiData { get; set; } = null!;
        public App AppData { get; set; } = null!;

    }
}