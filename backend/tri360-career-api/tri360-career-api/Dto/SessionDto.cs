namespace QuizBack.Dto
{
    public class SessionDto
    {
        public int ExamanId {get ; set ;}
        public int ApplicationId {get ; set ;}
        public string? ApplicationEmail { get; set; }
        public DateTime? Deadline { get; set; }
    }
}