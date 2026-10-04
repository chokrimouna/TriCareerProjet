namespace Quizback.Dto
{
    public class InviteCandidateDto
    {
        public string Name { get; set; } = string.Empty;
        public string Prename { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public int? JobPostingId { get; set; }
    }
}
