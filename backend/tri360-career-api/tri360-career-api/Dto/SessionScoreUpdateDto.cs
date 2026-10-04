namespace QuizBack.Dto
{
    public class SessionScoreUpdateDto
    {
        public int SessionId { get; set; }
        public int Score { get; set; }
        public string? ReviewComment { get; set; }
    }
}
